import io
import os
import queue
import time
from pathlib import Path
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.config import Config, CameraConfig
from backend.store import Store
from backend.cameras import MotionDetector, CameraWorker, clean_recordings, valid_rtsp
from backend.app import create_app
from backend.cloud import Cloud, CloudError

def configuration(**kw):
    return Config(cameras=[CameraConfig(id="cam1", name="Вхід", rtsp_env="VARTA_CAM1_RTSP")], **kw)

def test_events_persist_and_camera_filter(tmp_path):
    store=Store(tmp_path)
    one=store.add("cam1", "motion", "Зміна")
    store.add("cam2", "offline", "Обрив")
    store.update(one, reviewed=1)
    store.close()
    reopened=Store(tmp_path)
    assert len(reopened.events("cam1"))==1
    assert reopened.get(one)["reviewed"]==1
    assert reopened.events(since=time.time()+1)==[]
    reopened.close()

def test_quota_survives_restart(tmp_path):
    store=Store(tmp_path)
    assert store.reserve_call(1, now=10000)
    assert not store.reserve_call(1, now=10001)
    store.close()
    store=Store(tmp_path)
    assert not store.reserve_call(1, now=10002)
    assert store.reserve_call(1, now=13601)
    store.close()

def test_motion_debounce_roi_and_cooldown():
    cfg=CameraConfig(id="cam1", name="Вхід", rtsp_env="VARTA_CAM1_RTSP", roi=(0,0,0.5,1), cooldown_seconds=60)
    d=MotionDetector(cfg)
    base=np.full((180,320,3),100,np.uint8)
    outside=base.copy();outside[:,200:]=240
    assert d.inspect(base,0) is None
    assert d.inspect(outside,1) is None
    changed=base.copy();changed[:,:140]=240
    assert d.inspect(changed,2) is None
    assert d.inspect(base,3)=="motion"
    assert d.inspect(changed,4) is None
    assert d.inspect(base,5) is None
    assert d.inspect(changed,64)=="motion"

def test_dark_is_debounced_and_not_called_person():
    d=MotionDetector(configuration().cameras[0])
    frame=np.zeros((180,320,3),np.uint8)
    assert all(d.inspect(frame,i) is None for i in range(9))
    assert d.inspect(frame,9)=="dark"
    assert d.inspect(frame,10) is None

def test_jpeg_parser_handles_fragmented_frames():
    encoded=cv2.imencode('.jpg',np.full((30,40,3),127,np.uint8))[1].tobytes()
    q=queue.Queue(maxsize=2)
    CameraWorker.frames_from_pipe(io.BytesIO(encoded*3),q)
    assert q.qsize()==2
    assert q.get()==encoded

def test_config_validation():
    with pytest.raises(ValueError):
        CameraConfig(id="cam1",name="test",rtsp_env="VARTA_CAM1_RTSP",roi=(1,0,0,1))
    assert valid_rtsp("rtsp://operator:encoded@192.168.1.10:554/Streaming/Channels/101")
    assert not valid_rtsp("file:///etc/passwd")
    assert not valid_rtsp("rtsp://host:bad/path")

def test_camera_errors_never_expose_raw_credentials():
    from backend.diagnostics import explain_error
    raw = 'rtsp://private:supersecret@192.0.2.1/live: 401 Unauthorized'
    code, message = explain_error(raw)
    assert code == 'AUTH'
    assert 'supersecret' not in message and '192.0.2.1' not in message
    assert explain_error('Option rw_timeout not found')[0] == 'FFMPEG_OPTION'
    assert explain_error('unknown private diagnostic supersecret')[0] == 'NO_FRAME'
    assert 'supersecret' not in explain_error('unknown private diagnostic supersecret')[1]

def test_real_ingest_command_uses_rtsp_socket_timeout(tmp_path):
    from backend.service import Service
    service=Service(configuration(demo=False),tmp_path)
    try:
        command=service.cameras['cam1'].command('rtsp://localhost/test',False)
        assert '-timeout' in command and '-rw_timeout' not in command
        assert command[command.index('-timeout')+1]=='10000000'
    finally:
        service.stop()

def test_api_demo_review_chat_and_snapshot(tmp_path, monkeypatch):
    monkeypatch.delenv("VARTA_OPERATOR_TOKEN",raising=False)
    app=create_app(configuration(),tmp_path,workers=False)
    with TestClient(app) as client:
        assert client.get('/api/status').json()['demo'] is True
        event=client.post('/api/events/demo').json()
        assert event['demo']==1 and event['cloud_status']=='disabled'
        assert client.post(f"/api/events/{event['id']}/review").status_code==200
        assert client.get('/api/events').json()[0]['reviewed']==1
        assert client.get(f"/api/events/{event['id']}/snapshot").status_code==404
        response=client.post('/api/chat',json={'message':'Що сталося?'}).json()
        assert response['source']=='local' and 'Тестова подія' in response['answer']
        assert client.post('/api/monitoring',json={'paused':True}).json()['paused']
        assert client.get('/api/recordings/cam1/secret.env').status_code==404
        assert client.post('/api/chat',json={'message':''}).status_code==422

def test_auth_and_csrf(tmp_path,monkeypatch):
    monkeypatch.setenv('VARTA_OPERATOR_TOKEN','test-only-password-123456')
    with TestClient(create_app(configuration(),tmp_path,workers=False)) as client:
        assert client.get('/api/status').status_code==401
        assert client.post('/api/login',json={'token':'wrong'}).status_code==401
        assert client.post('/api/login',json={'token':'test-only-password-123456'}).status_code==200
        assert client.get('/api/status').status_code==200
        assert client.post('/api/events/demo',headers={'Origin':'https://attacker.example'}).status_code==403
        assert client.post('/api/logout').status_code==200
        assert client.get('/api/status').status_code==401

def test_real_mode_never_simulates_events_or_leaks_credentials(tmp_path,monkeypatch):
    monkeypatch.delenv('VARTA_OPERATOR_TOKEN',raising=False)
    monkeypatch.setenv('VARTA_CAM1_RTSP','rtsp://private:secret@192.0.2.1/live')
    with TestClient(create_app(configuration(demo=False),tmp_path,workers=False)) as client:
        assert client.post('/api/events/demo').status_code==409
        assert 'secret' not in client.get('/api/status').text
        assert client.get('/api/cameras/cam1/frame').status_code==503

def test_retention_preserves_recent_open_files_and_unrelated_files(tmp_path):
    directory=tmp_path/'recordings'/'cam1';directory.mkdir(parents=True)
    old=directory/'20200101_010101.mkv';old.write_bytes(b'old')
    os.utime(old,(time.time()-864000,time.time()-864000))
    current=directory/'20260916_010101.mkv';current.write_bytes(b'current')
    other=tmp_path/'unrelated.txt';other.write_text('keep')
    total,ok=clean_recordings(tmp_path,7,10**9,0)
    assert not old.exists() and current.exists() and other.exists()
    assert total==7 and ok

def test_cloud_payload_and_error_redaction(monkeypatch):
    import httpx
    monkeypatch.setenv('OPENAI_API_KEY','test-key-never-send')
    cloud=Cloud(configuration(demo=False,cloud_enabled=True))
    captured={}
    class FakeClient:
        def __init__(self,**kwargs):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,url,**kwargs):
            captured.update(kwargs['json'])
            return httpx.Response(200,json={'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':'На кадрі ліс.'}]}]},request=httpx.Request('POST',url))
    monkeypatch.setattr('backend.cloud.httpx.Client',FakeClient)
    assert cloud.request('Опиши',b'jpeg')=='На кадрі ліс.'
    assert captured['store'] is False
    assert captured['input'][0]['content'][1]['image_url'].startswith('data:image/jpeg;base64,')
    assert 'test-key' not in str(captured)
    def fail(*args,**kwargs):raise httpx.ConnectError('secret payload')
    monkeypatch.setattr(FakeClient,'post',fail)
    with pytest.raises(CloudError) as exc:cloud.request('Опиши')
    assert 'secret' not in str(exc.value)

def test_local_ingest_records_and_emits_preview(tmp_path,monkeypatch):
    """Exercise the real FFmpeg process/pipe/decoder/recorder without physical cameras."""
    import imageio_ffmpeg
    from backend.service import Service
    monkeypatch.setenv('VARTA_CAM1_RTSP','rtsp://localhost/test')
    service=Service(configuration(demo=False,min_free_gb=0),tmp_path)
    worker=service.cameras['cam1']
    def synthetic(url,record):
        folder=tmp_path/'recordings'/'cam1';folder.mkdir(parents=True,exist_ok=True)
        return [imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-re','-f','lavfi','-i','testsrc=size=320x180:rate=10','-t','10',
                '-map','0:v:0','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-g','10','-f','segment','-segment_time','1','-reset_timestamps','1','-strftime','1',str(folder/'%Y%m%d_%H%M%S.mkv'),
                '-map','0:v:0','-vf','fps=2','-c:v','mjpeg','-f','image2pipe','pipe:1']
    monkeypatch.setattr(worker,'command',synthetic)
    service.start()
    try:
        deadline=time.time()+12
        while time.time()<deadline and not worker.frame:time.sleep(.1)
        assert worker.frame and worker.status=='online'
        assert cv2.imdecode(np.frombuffer(worker.frame,np.uint8),cv2.IMREAD_COLOR) is not None
        assert worker.recording
    finally:service.stop()
    assert any(p.stat().st_size>100 for p in (tmp_path/'recordings'/'cam1').glob('*.mkv'))
