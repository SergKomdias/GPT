import React, {useEffect, useState} from 'react';
import Icon from './icons';
const labels = { demo:'Очікування підключення', unconfigured:'Адресу камери не налаштовано', connecting:'Підключення до камери…', offline:'Немає відеозв’язку', invalid_config:'Перевірте адресу RTSP' };
export default function CameraPanel({camera, expanded, onExpand}) {
  const [tick, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (camera.status !== 'online') return;
    const timer = setInterval(() => {setTick(t => t+1); setFailed(false);}, 1000);
    return () => clearInterval(timer);
  }, [camera.status]);
  const live = camera.status === 'online';
  return <section className={`camera ${expanded ? 'expanded-camera' : ''}`} aria-label={`Камера ${camera.name}`}>
    <div className="camera-title"><span className="camera-number">{camera.id.replace('cam','').padStart(2,'0')}</span><strong>{camera.name}</strong>
      {live && <span className="live-dot" title="Відеозв’язок є"/>}
      <button className="icon-button" title={expanded ? 'Згорнути камеру' : 'Розгорнути камеру'} aria-label={expanded ? 'Згорнути камеру' : `Розгорнути ${camera.name}`} onClick={onExpand}><Icon name={expanded?'close':'expand'}/></button></div>
    {live && <img className={`camera-image ${failed?'hidden':''}`} src={`/api/cameras/${camera.id}/frame?t=${tick}`} alt={`Поточний кадр: ${camera.name}`} onError={()=>setFailed(true)}/>}
    {(!live || failed) && <div className="camera-empty"><Icon name="camera" size={expanded?72:60}/><p>{failed?'Очікування свіжого кадру':labels[camera.status] || 'Немає кадру'}</p></div>}
    {live && <span className="preview-label">Огляд · 1 кадр/с · {camera.recording?'Запис оригіналу':'Без запису'}</span>}
  </section>;
}
