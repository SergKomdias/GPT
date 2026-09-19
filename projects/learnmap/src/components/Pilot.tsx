import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useApp } from '../hooks/useApp';
import { Notice } from './UI';
export function PrivacyControls({ student }: { student?: string }) {
  const { user, t, logout } = useApp();
  const [p, setP] = useState<any>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false);
  const query = student ? '?student=' + encodeURIComponent(student) : '';
  useEffect(() => {
    void api('/privacy' + query)
      .then(setP)
      .catch((e) => setError(e.message));
  }, [query]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const consent = (granted: boolean, allow: boolean) =>
    action(async () => {
      const previous = p;
      setP({ ...p, granted, allow_speaking: granted && allow });
      try {
        setP(
          await api('/consent', 'PUT', {
            student,
            granted,
            allow_speaking: allow,
            version: p.consent_version,
          }),
        );
        setMessage(t('Preference saved.', 'Налаштування збережено.'));
      } catch (e) {
        setP(previous);
        throw e;
      }
    });
  return (
    <section className="panel form-panel" aria-label="Privacy and pilot consent">
      <h2>{t('Privacy & pilot consent', 'Приватність і згода на пілот')}</h2>
      <p>
        {t(
          'LearnMap stores learning answers, progress and conversation transcripts. Live AI sends lesson context or conversation text/audio to OpenAI. Raw microphone audio is processed in memory and is not saved by LearnMap.',
          'LearnMap зберігає відповіді, прогрес і тексти розмов. Live AI передає контекст заняття або текст/аудіо розмови до OpenAI. LearnMap обробляє аудіо мікрофона в пам’яті й не записує його на диск.',
        )}
      </p>
      <p>
        {t(
          'Speaking transcripts, feedback and replies expire within',
          'Тексти Speaking, feedback і відповіді видаляються протягом',
        )}{' '}
        {p?.retention_days || 30}{' '}
        {t(
          'days; hourly cleanup. Internal event/feedback retention: 90 days. No advertising analytics.',
          'днів; очищення щогодини. Внутрішні події/відгуки: 90 днів. Без рекламної аналітики.',
        )}
      </p>
      <p>
        <a
          href="https://platform.openai.com/docs/guides/your-data"
          target="_blank"
          rel="noreferrer"
        >
          {t('OpenAI data handling', 'Обробка даних OpenAI')}
        </a>{' '}
        ·{' '}
        {t(
          'Provider retention is separate from LearnMap deletion.',
          'Зберігання у провайдера відокремлене від видалення у LearnMap.',
        )}
      </p>
      {p && (
        <p>
          {t('Consent', 'Згода')}:{' '}
          <strong>{p.granted ? t('Granted', 'Надано') : t('Not granted', 'Не надано')}</strong> ·{' '}
          {p.consent_version}
          {p.granted_at ? ' · ' + new Date(p.granted_at).toLocaleString() : ''}
        </p>
      )}
      {user?.role === 'parent' && student && p ? (
        <>
          <p>
            {t(
              'By confirming, I state that I am this child’s parent/guardian and agree to the described alpha learning and AI data processing. I can withdraw permission at any time.',
              'Підтверджуючи, я заявляю, що є одним із батьків/опікуном дитини, і погоджуюся на описане alpha-навчання та обробку даних AI. Можу відкликати дозвіл будь-коли.',
            )}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void consent(!p.granted, false)}
          >
            {p.granted
              ? t('Withdraw consent', 'Відкликати згоду')
              : t('I confirm parental consent', 'Підтверджую батьківську згоду')}
          </button>
          <label className="pilot-speaking-toggle">
            <input
              type="checkbox"
              checked={p.allow_speaking}
              disabled={busy || !p.granted}
              onChange={(e) => void consent(true, e.target.checked)}
            />
            {t('Allow Speaking', 'Дозволити Speaking')}
          </label>
        </>
      ) : user?.role === 'student' && p?.pilot && !p.granted ? (
        <p>
          {t(
            'Complete onboarding, then invite a parent from Parent connection before starting lessons.',
            'Заверши налаштування й запроси батьків у розділі «Зв’язок із батьками» перед початком занять.',
          )}
        </p>
      ) : null}
      <div className="inline-form">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            void action(async () => {
              const data = await api('/privacy/export' + query);
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
              );
              const a = document.createElement('a');
              a.href = url;
              a.download = 'learnmap-export.json';
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage(t('Export downloaded.', 'Експорт завантажено.'));
            })
          }
        >
          {t('Export data', 'Експортувати дані')}
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            if (
              confirm(
                t(
                  'Delete all conversation transcripts and close active conversations?',
                  'Видалити всі тексти розмов і закрити активні розмови?',
                ),
              )
            )
              void action(async () => {
                await api('/privacy/transcripts', 'DELETE', { student });
                setMessage(t('Transcripts deleted.', 'Тексти розмов видалено.'));
              });
          }}
        >
          {t('Delete transcripts', 'Видалити тексти розмов')}
        </button>
      </div>
      {user?.role !== 'admin' && (
        <details>
          <summary>{t('Delete account permanently', 'Видалити акаунт назавжди')}</summary>
          <p>
            {t(
              'This removes the selected account and learning data. Enter your own password to confirm.',
              'Це видалить вибраний акаунт і навчальні дані. Для підтвердження введіть власний пароль.',
            )}
          </p>
          <input
            aria-label="Current password for deletion"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="button secondary"
            disabled={busy || !password}
            onClick={() => {
              if (confirm(t('Permanently delete this account?', 'Назавжди видалити цей акаунт?')))
                void action(async () => {
                  await api('/privacy/account', 'DELETE', { student, password });
                  if (!student) await logout().catch(() => location.assign('/'));
                  else location.reload();
                });
            }}
          >
            {t('Delete account', 'Видалити акаунт')}
          </button>
        </details>
      )}
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
    </section>
  );
}
export function PilotFeedback({
  screen,
  context,
}: {
  screen: 'lesson' | 'parent_report';
  context: string;
}) {
  const { t } = useApp();
  const [eligible, setEligible] = useState(screen === 'parent_report'),
    [done, setDone] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (screen === 'lesson')
      void api('/feedback/eligible')
        .then((r) => setEligible(r.eligible))
        .catch(() => {});
  }, [screen]);
  if (!eligible || done) return null;
  return (
    <aside className="panel">
      <p>
        {screen === 'lesson'
          ? t('How was this lesson?', 'Як тобі заняття?')
          : t('Was this report useful?', 'Чи був цей звіт корисним?')}
      </p>
      {(screen === 'lesson' ? ['up', 'neutral', 'down'] : ['up', 'down']).map((r) => (
        <button
          className="button secondary"
          key={r}
          aria-label={r}
          onClick={() =>
            void api('/feedback', 'POST', { screen, context_id: context, rating: r })
              .then(() => setDone(true))
              .catch((e) => setError(e.message))
          }
        >
          {r === 'up' ? '👍' : r === 'neutral' ? '😐' : '👎'}
        </button>
      ))}
      <button className="text-link" onClick={() => setDone(true)}>
        {t('Not now', 'Не зараз')}
      </button>
      <Notice error>{error}</Notice>
    </aside>
  );
}
export function PilotMetrics() {
  const { t } = useApp();
  const [data, setData] = useState<any>(null),
    [error, setError] = useState('');
  useEffect(() => {
    void api('/admin/pilot')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  if (!data) return <Notice error>{error}</Notice>;
  const percent = (v: number | null) => (v === null ? '—' : Math.round(v * 100) + '%');
  const cards = [
    ['Active students today', data.active_students_today],
    ['Lessons started / completed', `${data.lessons_started} / ${data.lessons_completed}`],
    ['Completion rate', percent(data.completion_rate)],
    [
      'Average completed lesson time',
      data.average_learning_seconds === null
        ? '—'
        : Math.round(data.average_learning_seconds / 60) + ' min',
    ],
    ['Hints per lesson', data.hints_per_lesson?.toFixed(1) ?? '—'],
    ['Speaking started / completed', `${data.speaking_sessions} / ${data.speaking_completed}`],
    ['Parent dashboard views', data.parent_dashboard_views],
    ['AR sessions', data.ar_sessions ?? 0],
    ['AR missions completed', data.ar_missions_completed ?? 0],
    [
      'AR voluntary continue',
      (data.ar_voluntary_continue ?? 0) + ' / ' + (data.ar_completed_sets ?? 0) + ' (' + percent(data.ar_continue_rate ?? null) + ')',
    ],
    ['Day-1 return', `${data.day1.returned} / ${data.day1.eligible} (${percent(data.day1.rate)})`],
    ['Day-7 return', `${data.day7.returned} / ${data.day7.eligible} (${percent(data.day7.rate)})`],
  ];
  return (
    <section className="panel" aria-label="Pilot metrics">
      <h2>{t('Pilot metrics', 'Метрики пілоту')}</h2>
      <p>
        {data.today} · {data.timezone} · {data.window}
      </p>
      <div className="pilot-metrics">
        {cards.map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p>
        {t(
          'Return indicators include only cohorts whose full target day has elapsed.',
          'Повернення враховують лише когорти, для яких цільовий день повністю завершився.',
        )}
      </p>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Students</th>
            <th>Events</th>
            <th>Learning minutes</th>
          </tr>
        </thead>
        <tbody>
          {data.subjects.map((s: any) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.students}</td>
              <td>{s.events}</td>
              <td>{Math.round(s.seconds / 60)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {t('Feedback', 'Відгуки')}:{' '}
        {data.feedback.map((f: any) => `${f.screen} ${f.rating}: ${f.count}`).join(' · ') || '—'}
      </p>
    </section>
  );
}
