import { PilotFeedback } from '../components/Pilot';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lightbulb, Check } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../hooks/useApp';
import { Heading, Loading, Notice, Arrow } from '../components/UI';
import { Question } from '../features/learning/Question';
export function Lesson() {
  const { skill } = useParams();
  const { t, lang, user } = useApp();
  const learningLang = user?.profile?.learning_language || lang;
  const [state, setState] = useState<any>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  useEffect(() => {
    void api('/lesson', 'POST', { skill, lang: learningLang })
      .then(setState)
      .catch((e) => setError(e.message));
  }, [skill, learningLang]);
  const next = async () => {
    if (pending) {
      setState(pending);
      setPending(null);
      setFeedback(null);
      setHint('');
      setAnswer(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api(`/lesson/${state.id}/next`, 'POST', {
        answer,
        index: state.index,
        lang: learningLang,
      });
      if (result.providerWarning) setError(result.providerWarning);
      if (result.feedback) {
        setFeedback(result.feedback);
        setPending(result);
      } else {
        setState(result);
        setHint('');
        setAnswer(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title={state?.skill?.title[learningLang] || t('Your next step.', 'Твій наступний крок.')}
        description={t('Understand it. Try it. Make it yours.', 'Зрозумій. Спробуй. Засвой.')}
      />
      <Notice error>{error}</Notice>
      <Notice>{state?.providerWarning}</Notice>
      {!state && !error ? <Loading /> : null}
      {state?.completed ? (
        <div className="panel result narrow">
          <PilotFeedback screen="lesson" context={state.id} />
          <div className="result-symbol">
            <Check />
          </div>
          <h2>{t('A step forward.', 'Крок уперед.')}</h2>
          <p>{state.skill.title[learningLang]}</p>
          <div className="score-change">
            {Math.round(state.result.before)}% <Arrow />{' '}
            <strong>{Math.round(state.result.after)}%</strong>
          </div>
          <p>
            {state.result.correct}/{state.result.total}{' '}
            {t(
              'correct answers. Your map and daily plan are updated.',
              'правильних відповідей. Карту й план оновлено.',
            )}
          </p>
          <Link to="/map" className="button">
            {t('See my progress', 'Переглянути прогрес')}
            <Arrow />
          </Link>
          <Link to="/today" className="text-link">
            {t('Back to Today', 'До плану на сьогодні')}
          </Link>
        </div>
      ) : state ? (
        <div className="lesson-layout">
          <aside className="lesson-stepper">
            {[
              'Review',
              'Explain',
              'Guided practice',
              'Independent practice',
              'Mini test',
              'Result',
            ].map((s, i) => {
              const current = state.stage === s;
              const labels = [
                'Повторення',
                'Пояснення',
                'Разом із викладачем',
                'Самостійна практика',
                'Мінітест',
                'Результат',
              ];
              return (
                <div key={s} className={current ? 'active' : ''}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <strong>{t(s, labels[i])}</strong>
                </div>
              );
            })}
            <p>
              {t(
                'Hints are here to help. Independent answers build stronger evidence.',
                'Підказки допомагають. Самостійні відповіді дають надійнішу оцінку знань.',
              )}
            </p>
          </aside>
          <section className="panel practice-panel">
            <div className="practice-meta">
              <span>{t('Learning session', 'Навчальне заняття')}</span>
              <span>{state.index + 1} / 9</span>
            </div>
            <progress max={9} value={state.index} />
            {state.explanation ? (
              <div className="explanation">
                <h2>{t('Let’s connect the ideas.', 'Поєднаймо ідеї.')}</h2>
                <p>{state.explanation}</p>
              </div>
            ) : (
              <Question
                question={state.question}
                value={answer}
                onChange={setAnswer}
                disabled={busy || !!feedback}
              />
            )}
            <Notice>{hint}</Notice>
            {feedback ? (
              <Notice>
                {feedback.correct
                  ? t('Correct. Well reasoned.', 'Правильно. Добре міркуєш.')
                  : t('A useful mistake. Here’s why:', 'Помилка допомагає вчитися. Пояснення:')}
                <br />
                {feedback.reasoning[learningLang]}
              </Notice>
            ) : null}
            <div className="practice-footer">
              {!state.explanation ? (
                <button
                  className="button secondary"
                  disabled={busy || state.hints >= 5 || !!feedback}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await api(`/lesson/${state.id}/hint`, 'POST', {
                        index: state.index,
                        lang: learningLang,
                      });
                      setHint(r.hint);
                      if (r.providerWarning) setError(r.providerWarning);
                      setState({ ...state, hints: r.level });
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Lightbulb size={18} />
                  {t('Hint', 'Підказка')} {state.hints}/5
                </button>
              ) : (
                <span />
              )}
              <button
                className="button"
                disabled={busy || (!state.explanation && answer === null && !pending)}
                onClick={() => void next()}
              >
                {pending || state.explanation
                  ? t('Continue', 'Далі')
                  : t('Check answer', 'Перевірити')}
                <Arrow />
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
