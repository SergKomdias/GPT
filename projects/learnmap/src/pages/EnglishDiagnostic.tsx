import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useRecorder } from '../hooks/useRecorder';
import { Heading, Loading, Notice } from '../components/UI';
import { Question } from '../features/learning/Question';
import { EnglishAssessmentMap } from '../components/EnglishAssessmentMap';
import { ProductionFeedback } from '../components/ProductionFeedback';
export function EnglishDiagnostic() {
  const [session, setSession] = useState<any>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [choice, setChoice] = useState<number | null>(null),
    [text, setText] = useState(''),
    [transcript, setTranscript] = useState(''),
    [audioUrl, setAudioUrl] = useState(''),
    [listened, setListened] = useState(false);
  const sessionRef = useRef<any>(null),
    urlRef = useRef('');
  const [results, setResults] = useState<any[]>([]);
  const accept = (data: any) => {
    sessionRef.current = data;
    setSession(data);
    setChoice(null);
    setText('');
    setTranscript('');
    setListened(false);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';
    setAudioUrl('');
  };
  useEffect(() => {
    let active = true;
    void api('/english-diagnostic', 'POST', {})
      .then((data) => {
        if (active) accept(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);
  useEffect(() => {
    if (!session?.completed) return;
    let active = true;
    void api<{ answers: any[] }>(`/english-diagnostic/${session.id}/results`)
      .then((data) => {
        if (active) setResults(data.answers);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [session?.completed, session?.id]);
  const execute = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const recorder = useRecorder(async (blob) =>
    execute(async () => {
      const s = sessionRef.current;
      const r = await fetch(`/api/english-diagnostic/${s.id}/record`, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'audio/webm', 'X-Task-ID': s.task.id },
        body: blob,
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      accept(result);
    }),
  );
  const task = session?.task;
  const answer = () =>
    execute(async () =>
      accept(
        await api(`/english-diagnostic/${session.id}/answer`, 'POST', {
          taskId: task.id,
          answer: task.kind === 'choice' || task.kind === 'listening' ? choice : text,
        }),
      ),
    );
  const listen = () =>
    execute(async () => {
      const r = await fetch(`/api/english-diagnostic/${session.id}/listen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      });
      if (!r.ok) throw Error((await r.json()).error);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(await r.blob());
      setAudioUrl(urlRef.current);
    });
  return (
    <div className="narrow">
      <Heading
        title="English Diagnostic"
        description="Спочатку визначимо приблизний CEFR, потім перевіримо прогалини та окремі мовні вміння."
      />
      <Notice error>
        {error ||
          (recorder.error
            ? 'Не вдалося записати голосову відповідь. Перевірте дозвіл мікрофона й повторіть або пропустіть завдання без оцінки.'
            : '')}
      </Notice>
      {!session && !error && <Loading />}
      {session?.completed &&
        results.map((row) => (
          <section className="panel practice-panel" key={row.task_id}>
            <h2>
              {row.observation.kind === 'writing'
                ? 'Письмова відповідь'
                : 'Голосова відповідь — транскрипт'}
            </h2>
            <blockquote>{row.original_answer}</blockquote>
            <ProductionFeedback assessment={row.assessment} />
          </section>
        ))}
      {session?.completed ? (
        <>
          <EnglishAssessmentMap map={session.map} />
          <p>
            Для placement використано {session.placement_count} запитань. Пропущені продуктивні й
            аудіозавдання не дають оцінки відповідної навички.
          </p>
          <Link className="button" to="/map?subject=english">
            Відкрити карту English
          </Link>
        </>
      ) : task ? (
        <section className="panel practice-panel">
          <div className="practice-meta">
            <span>
              {session.phase === 'placement'
                ? 'CEFR placement'
                : session.phase === 'gaps'
                  ? 'Перевірка прогалин'
                  : 'Продуктивні та аудіонавички'}
            </span>
            <span>
              {task.cefr} · {session.count + 1}
            </span>
          </div>
          {session.phase !== 'placement' && (
            <p>
              Попередній placement: {session.placement_level} · {session.placement_count} запитань
            </p>
          )}
          {task.passage && (
            <article className="reading-passage" aria-label="Текст для читання">
              {task.passage.split('\n').map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
            </article>
          )}
          {task.kind === 'listening' && (
            <div className="audio-assessment">
              <p>Прослухайте аудіо, потім дайте відповідь. Голос створено AI.</p>
              <button className="button secondary" disabled={busy} onClick={() => void listen()}>
                Завантажити аудіо
              </button>
              {audioUrl && <audio controls src={audioUrl} onEnded={() => setListened(true)} />}
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  void execute(async () =>
                    setTranscript(
                      (
                        await api(`/english-diagnostic/${session.id}/transcript`, 'POST', {
                          taskId: task.id,
                        })
                      ).transcript,
                    ),
                  )
                }
              >
                Показати транскрипт — підказка, вага відповіді 25%
              </button>
              {transcript && <p>{transcript}</p>}
            </div>
          )}
          {['choice', 'listening'].includes(task.kind) ? (
            <Question
              key={task.id}
              question={{ ...task, prompt: { uk: task.prompt, en: task.prompt } }}
              value={choice}
              onChange={setChoice}
              disabled={busy || (task.kind === 'listening' && !listened)}
              allowUnknown
            />
          ) : (
            <>
              <h2>
                {task.kind === 'speaking'
                  ? 'Speaking Assessment'
                  : task.kind === 'writing'
                    ? 'Writing Assessment'
                    : 'Власна відповідь'}
              </h2>
              <p>{task.prompt}</p>
              {task.words && (
                <p>
                  Орієнтир: {task.words[0]}–{task.words[1]} слів · написано{' '}
                  {text.trim() ? text.trim().split(/\s+/).length : 0}
                </p>
              )}
              {task.kind === 'speaking' ? (
                <>
                  <p>
                    Дайте голосову відповідь. Буде три стандартизовані завдання. Вихідний запис
                    мікрофона не зберігається; транскрипт і мовне оцінювання зберігаються до 30
                    днів. Вимова не оцінюється за текстом.
                  </p>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => (recorder.recording ? recorder.stop() : void recorder.start())}
                  >
                    {recorder.recording ? 'Зупинити й надіслати' : 'Записати відповідь'}
                  </button>
                </>
              ) : (
                <label>
                  Відповідь англійською
                  <textarea
                    rows={task.kind === 'writing' ? 9 : 3}
                    maxLength={16000}
                    value={text}
                    disabled={busy}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
              )}
            </>
          )}
          {task.kind !== 'speaking' && (
            <button
              className="button"
              disabled={
                busy ||
                (task.options ? choice === null : !text.trim()) ||
                (task.kind === 'listening' && !listened)
              }
              onClick={() => void answer()}
            >
              {busy ? 'Обробляємо…' : 'Надіслати відповідь'}
            </button>
          )}
          {['writing', 'listening', 'speaking'].includes(task.kind) && (
            <button
              className="text-link"
              disabled={busy || recorder.recording}
              onClick={() =>
                void execute(async () =>
                  accept(
                    await api(`/english-diagnostic/${session.id}/skip`, 'POST', {
                      taskId: task.id,
                    }),
                  ),
                )
              }
            >
              Пропустити — залишити навичку неоціненою
            </button>
          )}
          <ProductionFeedback assessment={session.assessment} />
        </section>
      ) : null}
    </div>
  );
}
