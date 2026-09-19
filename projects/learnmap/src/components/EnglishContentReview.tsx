import { useState } from 'react';
import { api } from '../services/api';
export function EnglishContentReview({ items, onSaved }: { items: any[]; onSaved: () => void }) {
  const [id, setId] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const item = items.find((i) => i.id === id);
  const review = async (status: string) => {
    setBusy(true);
    setError('');
    try {
      await api('/admin/english-review', 'PUT', { id, review_status: status });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="panel">
      <summary>Перевірка матеріалів English Diagnostic</summary>
      <label>
        Матеріал
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Оберіть завдання</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.id} · {i.review_status}
            </option>
          ))}
        </select>
      </label>
      {item && (
        <>
          <p>{item.content.prompt}</p>
          {item.content.passage && <p>{item.content.passage}</p>}
          {item.content.script && <p>{item.content.script}</p>}
          <pre className="assessment-json">{JSON.stringify(item.content, null, 2)}</pre>
          <p>Перевірте рівень, формулювання та ключ перед затвердженням.</p>
          {['draft', 'reviewed', 'approved'].map((status) => (
            <button
              key={status}
              className="button secondary"
              disabled={busy}
              onClick={() => void review(status)}
            >
              {status}
            </button>
          ))}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
