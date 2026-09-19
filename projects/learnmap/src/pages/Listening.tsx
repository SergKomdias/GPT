import { useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { api, speak, stopVoice } from '../services/api';
import { Heading, Notice, Loading } from '../components/UI';
import { Question } from '../features/learning/Question';
export function Listening() {
  const { t } = useApp();
  const [session, setSession] = useState<any>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api('/listening')
      .then(setSession)
      .catch((e) => setError(e.message));
    return () => stopVoice();
  }, []);
  return (
    <div className="narrow">
      <Heading
        title={t('Listen for the meaning.', 'Слухай і розумій.')}
        description={t(
          'B1 listening · A day at the science museum',
          'Аудіювання B1 · День у науковому музеї',
        )}
      />
      <Notice error>{error}</Notice>
      {!session && !error ? (
        <Loading />
      ) : session ? (
        <section className="panel practice-panel">
          <div className="listening-player">
            <Volume2 size={44} />
            <div>
              <h2>{t('A Saturday of discovery', 'Субота відкриттів')}</h2>
              <p>{t('Listen, then answer the question.', 'Прослухай та дай відповідь.')}</p>
            </div>
            <button
              className="button"
              onClick={() => void speak(session.passage).catch((e) => setError(e.message))}
            >
              <Volume2 size={18} />
              {t('Play', 'Слухати')}
            </button>
            <button className="icon-button" aria-label="Stop audio" onClick={stopVoice}>
              <Square size={18} />
            </button>
          </div>
          <button
            className="text-link"
            disabled={show || !!result}
            onClick={async () => {
              try {
                await api(`/listening/${session.id}/hint`, 'POST');
                setShow(true);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {t('Show transcript (counts as a hint)', 'Показати текст (рахується як підказка)')}
          </button>
          {show ? <blockquote>{session.passage}</blockquote> : null}
          <Question
            question={{ prompt: session.question, options: session.options }}
            value={answer}
            onChange={setAnswer}
            disabled={!!result || busy}
          />
          {result ? (
            <>
              <Notice>
                {result.correct
                  ? t(
                      'Correct! Listening practice saved.',
                      'Правильно! Практику аудіювання збережено.',
                    )
                  : t(
                      'They built a solar-powered car. Your practice is saved.',
                      'Вони збудували автомобіль на сонячній енергії. Практику збережено.',
                    )}{' '}
                {t(
                  'CEFR assessment is available in English Diagnostic.',
                  'Оцінювання CEFR доступне в English Diagnostic.',
                )}
              </Notice>
              <Link to="/map" className="button">
                {t('View LearnMap', 'Відкрити LearnMap')}
              </Link>
            </>
          ) : (
            <button
              className="button"
              disabled={answer === null || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setResult(await api(`/listening/${session.id}/answer`, 'POST', { answer }));
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('Check answer', 'Перевірити відповідь')}
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}
