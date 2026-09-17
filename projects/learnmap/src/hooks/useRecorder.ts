import { useRef, useState, useEffect } from 'react';
export function useRecorder(onRecording: (blob: Blob) => Promise<void>) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const cleanup = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === 'recording') recorder.current.stop();
      }
      cleanup();
    };
  }, []);
  const start = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          'Microphone requires a supported browser and HTTPS or localhost. / Потрібен сумісний браузер і HTTPS або localhost.',
        );
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const r = new MediaRecorder(media, mime ? { mimeType: mime } : {});
      recorder.current = r;
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onerror = () => {
        r.onstop = null;
        setError(
          'Recording failed. Try again or type your answer. / Помилка запису. Спробуй ще раз або введи текст.',
        );
        cleanup();
        setRecording(false);
      };
      r.onstop = () => {
        cleanup();
        setRecording(false);
        if (alive.current) void onRecording(new Blob(chunks, { type: r.mimeType }));
      };
      r.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === 'recording') r.stop();
      }, 60000);
    } catch (e) {
      cleanup();
      setRecording(false);
      setError(
        (e as Error).name === 'NotAllowedError'
          ? 'Microphone access denied. Allow it in browser settings or type your answer below. / Доступ до мікрофона заборонено. Дозволь його в налаштуваннях браузера або введи текст нижче.'
          : (e as Error).message,
      );
    }
  };
  const stop = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };
  return { recording, error, start, stop };
}
