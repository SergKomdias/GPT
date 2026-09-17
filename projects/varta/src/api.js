export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) window.dispatchEvent(new Event('varta:login'));
    throw new Error(typeof data.detail === 'string' ? data.detail : `Помилка запиту (${response.status})`);
  }
  return response.json();
}
export const post = (path, body = {}) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const timeLabel = ts => new Date(ts * 1000).toLocaleTimeString('uk-UA', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
export const dateLabel = ts => new Date(ts * 1000).toLocaleString('uk-UA');
