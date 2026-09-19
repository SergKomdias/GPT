import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { api } from '../services/api';
import { Heading, Notice, Loading, Arrow } from '../components/UI';
import { Question } from '../features/learning/Question';
import { EnglishDiagnostic } from './EnglishDiagnostic';
export function Diagnostic() {
  const { subject } = useParams();
  return subject === 'english' ? <EnglishDiagnostic /> : <SubjectDiagnostic />;
}
function SubjectDiagnostic() {
  const { subject } = useParams();
  const { t, lang } = useApp();
  const [state, setState] = useState<any>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  useEffect(() => {
    void api('/diagnostic', 'POST', { subject })
      .then(setState)
      .catch((e) => setError(e.message));
  }, [subject]);
  return (
    <div className="narrow">
      <Heading
        title={t('Find your starting point.', 'Знайди свою точку старту.')}
        description={t(
          'No grades. Just a clearer picture of what you know.',
          'Без оцінок. Лише чіткіша картина твоїх знань.',
        )}
      />
      <Notice error>{error}</Notice>
      {!state && !error ? <Loading /> : null}
      {state?.completed ? (
        <section className="panel result">
          <div className="result-symbol">✓</div>
          <p>
            {state.metrics?.reason === 'question-limit'
              ? t(
                  'Question limit reached. Uncertainty remains; continue in future sessions.',
                  'Досягнуто межі запитань. Невизначеність залишається; продовжимо на наступних заняттях.',
                )
              : state.metrics?.reason === 'coverage-confidence'
                ? t(
                    'Coverage and diagnostic confidence reached.',
                    'Достатнє покриття й впевненість діагностики.',
                  )
                : t(
                    'The available questions at the required difficulty are finished. Unchecked skills need further assessment.',
                    'Доступні запитання потрібної складності завершилися. Неперевірені навички потребують подальшої діагностики.',
                  )}
          </p>
          <h2>{t('Your map is taking shape.', 'Твоя карта набуває форми.')}</h2>
          <p>
            {t(
              'Your answers are saved. Unchecked skills remain unassessed. Your learning plan now follows this evidence.',
              'Відповіді збережено. Неперевірені навички залишаються неоціненими. План оновлено за результатами.',
            )}
          </p>
          <Link to="/map" className="button">
            {t('Explore my LearnMap', 'Відкрити мою LearnMap')}
            <Arrow />
          </Link>
          <Link to="/today" className="text-link">
            {t('Go to Today', 'Перейти до плану')}
          </Link>
        </section>
      ) : state ? (
        <section className="panel practice-panel">
          <div className="practice-meta">
            <span>
              {state.metrics.recheck
                ? t('Short recheck', 'Коротка повторна перевірка')
                : t('Adaptive diagnostic', 'Адаптивна діагностика')}
            </span>
            <span>
              {state.count + 1} / {state.metrics.maxQuestions} {t('maximum', 'максимум')}
            </span>
          </div>
          <p className="coverage">
            {t('Coverage', 'Покриття')} {Math.round(state.metrics.coverage * 100)}% ·{' '}
            {t('Diagnostic confidence', 'Впевненість діагностики')}{' '}
            {Math.round(state.metrics.confidence * 100)}%
          </p>
          <progress value={state.count} max={state.metrics.maxQuestions} />
          {state.question.max_difficulty === 5 && (
            <p className="coverage">
              Рівень складності {state.question.difficulty}/5 · {state.question.cognitive_level}
            </p>
          )}
          {feedback ? (
            <Notice>
              {feedback.correct
                ? t('You’ve got it. Let’s build on that.', 'Правильно. Рухаємося далі.')
                : t('Let’s check the foundations.', 'Перевіримо основи.')}
              <br />
              {feedback.reasoning[lang]}
            </Notice>
          ) : null}
          <Question
            key={state.question.id}
            question={state.question}
            value={answer}
            onChange={setAnswer}
            disabled={busy}
            allowUnknown
          />
          <div className="practice-footer">
            <span>
              {t(
                'The next question adapts to your answer.',
                'Наступне запитання залежить від відповіді.',
              )}
            </span>
            <button
              className="button"
              disabled={answer === null || busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const result = await api('/diagnostic/' + state.id + '/answer', 'POST', {
                    answer,
                    questionId: state.question.id,
                  });
                  setFeedback(result);
                  setState({ ...result, id: state.id });
                  setAnswer(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('Continue', 'Далі')}
              <Arrow />
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
