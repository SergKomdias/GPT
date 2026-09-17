import { useState, useEffect } from 'react';
import { Mic, Square, Volume2, Send, MessageCircle } from 'lucide-react';
import { api, transcribe, speak, stopVoice } from '../services/api';
import { useRecorder } from '../hooks/useRecorder';
import { useApp } from '../hooks/useApp';
import { Heading, Notice } from '../components/UI';
const modes = ['Conversation', 'Role Play', 'Topic Practice'];
const topics: Record<string, string[]> = {
  Conversation: ['Your day'],
  'Role Play': ['Café', 'Airport', 'University', 'Hotel', 'Job interview', 'Meeting a new person'],
  'Topic Practice': ['My hobby', 'Technology', 'Robotics', 'Travel', 'School', 'Future profession'],
};
export function Speaking() {
  const { t, config } = useApp();
  const [mode, setMode] = useState('Conversation');
  const [topic, setTopic] = useState('Your day');
  const [session, setSession] = useState<any>(null);
  const [turns, setTurns] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [example, setExample] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);
  const [started, setStarted] = useState(false);
  useEffect(() => () => stopVoice(), []);
  const recorder = useRecorder(async (blob) => {
    setBusy(true);
    setError('');
    try {
      const result = await transcribe(session.id, blob);
      setDraft(result.text);
      setExample(result.example);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });
  const voice = async (text: string) => {
    try {
      await speak(text);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const begin = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api('/speaking', 'POST', { mode, topic });
      setSession(r);
      setTurns([{ reply: r.reply }]);
      setStarted(true);
      if (autoVoice) void voice(r.reply);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      const r = await api(`/speaking/${session.id}/turn`, 'POST', {
        text: draft,
        requestId: crypto.randomUUID(),
      });
      setTurns((p) => [...p, r]);
      setDraft('');
      setExample(false);
      if (autoVoice) void voice(r.reply);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title={t('Find your voice.', 'Знайди свій голос.')}
        description={t(
          'A real conversation starts with a little courage.',
          'Розмова починається з маленької сміливості.',
        )}
      />
      <div className="speaking-layout">
        <aside className={'speaking-settings ' + (started ? 'in-session' : '')}>
          <h3>{t('How would you like to practise?', 'Як хочеш практикуватися?')}</h3>
          <div className="mode-list">
            {modes.map((m, i) => (
              <button
                key={m}
                disabled={started}
                className={mode === m ? 'active' : ''}
                onClick={() => {
                  setMode(m);
                  setTopic(topics[m][0]);
                }}
              >
                <MessageCircle size={18} />
                {t(m, ['Розмова', 'Рольова гра', 'Практика за темою'][i])}
              </button>
            ))}
          </div>
          <label>
            {t('Your scenario', 'Твій сценарій')}
            <select value={topic} disabled={started} onChange={(e) => setTopic(e.target.value)}>
              {topics[mode].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={autoVoice}
              onChange={(e) => {
                setAutoVoice(e.target.checked);
                if (!e.target.checked) stopVoice();
              }}
            />
            {t('Read replies aloud', 'Озвучувати відповіді')}
          </label>
          <p className="muted">
            B1 ·{' '}
            {t(
              'Take your time. Mistakes are part of learning.',
              'Не поспішай. Помилки — частина навчання.',
            )}
          </p>
          {started ? (
            <button
              className="button secondary"
              disabled={busy || recorder.recording}
              onClick={async () => {
                setBusy(true);
                try {
                  await api('/speaking/' + session.id + '/end', 'POST', {});
                  stopVoice();
                  setStarted(false);
                  setSession(null);
                  setTurns([]);
                  setDraft('');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('Finish conversation', 'Завершити розмову')}
            </button>
          ) : null}
          <div className="privacy-note">
            {t(
              'Audio is processed temporarily and is not stored. Voice responses are synthesized. Pronunciation is not scored from text.',
              'Аудіо обробляється тимчасово й не зберігається. Голосові відповіді синтезовані. Вимова не оцінюється за текстом.',
            )}
          </div>
        </aside>
        <section className="panel conversation">
          <div className="conversation-header">
            <div className="tutor-avatar">
              <MessageCircle />
            </div>
            <div>
              <strong>LearnMap Tutor</strong>
              <small>
                {mode} · {topic}
              </small>
            </div>
            <span className="status developing">B1</span>
          </div>
          {config.ai === 'mock' ? (
            <Notice>
              {t(
                'Demo AI: audio returns an example transcript. Edit it to match your words. Feedback is a limited grammar heuristic, not a full speaking assessment.',
                'Демо AI: аудіо повертає приклад транскрипту. Виправ його відповідно до сказаного. Аналіз обмежений граматичними правилами.',
              )}
            </Notice>
          ) : null}
          <div className="conversation-turns">
            {!started ? (
              <div className="speaking-welcome">
                <div className="voice-orb">
                  <Mic size={42} />
                </div>
                <h2>{t('A space to speak freely.', 'Простір для вільної розмови.')}</h2>
                <p>{t('Choose a mode, then say hello.', 'Обери режим і почни розмову.')}</p>
                <button className="button" disabled={busy} onClick={() => void begin()}>
                  {t('Start conversation', 'Почати розмову')}
                </button>
              </div>
            ) : (
              turns.map((turn, i) => (
                <div key={i}>
                  {turn.transcript ? <div className="student-bubble">{turn.transcript}</div> : null}
                  {turn.feedback ? (
                    <div className="feedback-note">
                      <strong>{turn.feedback.correction}</strong>
                      <p>{turn.feedback.explanation}</p>
                      <small>
                        {t(
                          'Practice evidence saved · pronunciation unassessed',
                          'Практику збережено · вимову не оцінено',
                        )}
                      </small>
                      <details>
                        <summary>{t('Feedback details', 'Деталі аналізу')}</summary>
                        {['relevance', 'grammar', 'vocabulary', 'fluency', 'pronunciation'].map(
                          (k) => (
                            <p key={k}>
                              {k}: {turn.feedback[k]}
                            </p>
                          ),
                        )}
                      </details>
                    </div>
                  ) : null}
                  <div className="tutor-bubble">
                    <p>{turn.reply}</p>
                    <button
                      className="icon-button"
                      aria-label="Play reply"
                      onClick={() => void voice(turn.reply)}
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <Notice error>{error || recorder.error}</Notice>
          {started ? (
            <div className="conversation-composer">
              {example ? (
                <Notice>
                  {t(
                    'Example transcript — review or replace before sending.',
                    'Приклад транскрипту — перевір або заміни перед надсиланням.',
                  )}
                </Notice>
              ) : null}
              <label className="sr-only" htmlFor="speaking-draft">
                {t('Your reply', 'Твоя відповідь')}
              </label>
              <textarea
                id="speaking-draft"
                placeholder={t(
                  'Record your voice or type your answer…',
                  'Запиши голос або введи відповідь…',
                )}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                disabled={busy}
              />
              <div className="composer-actions">
                <button
                  className={'mic-button ' + (recorder.recording ? 'recording' : '')}
                  disabled={busy}
                  onClick={() => {
                    stopVoice();
                    if (recorder.recording) recorder.stop();
                    else void recorder.start();
                  }}
                >
                  {recorder.recording ? <Square size={19} /> : <Mic size={19} />}
                  <span>
                    {recorder.recording
                      ? t('Stop recording', 'Зупинити запис')
                      : t('Record', 'Записати')}
                  </span>
                </button>
                <small>
                  {busy
                    ? t('Processing…', 'Обробка…')
                    : recorder.recording
                      ? t('Listening… up to 60 seconds', 'Слухаю… до 60 секунд')
                      : t('Your pace. Your voice.', 'Твій темп. Твій голос.')}
                </small>
                <button
                  className="button"
                  disabled={busy || recorder.recording || draft.trim().length < 3}
                  onClick={() => void send()}
                >
                  <Send size={18} />
                  {t('Send', 'Надіслати')}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
