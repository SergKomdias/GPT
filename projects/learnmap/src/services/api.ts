export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({
    error: 'Server unavailable. Please try again. / Сервер недоступний. Спробуй ще раз.',
  }));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export async function transcribe(id: string, blob: Blob) {
  const r = await fetch(`/api/speaking/${id}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'audio/webm', 'X-Request-ID': crypto.randomUUID() },
    body: blob,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data as { text: string; example: boolean };
}
let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
export function stopVoice() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  audio?.pause();
  audio = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
}
export async function speak(text: string, sessionId?: string) {
  stopVoice();
  const r = await fetch('/api/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sessionId }),
  });
  if (!r.ok) throw new Error('Voice unavailable / Озвучення недоступне');
  if (r.headers.get('content-type')?.includes('json')) {
    if (!('speechSynthesis' in window)) throw new Error('Speech synthesis is not supported');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.88;
    speechSynthesis.speak(u);
  } else {
    objectUrl = URL.createObjectURL(await r.blob());
    audio = new Audio(objectUrl);
    await audio.play();
  }
}
