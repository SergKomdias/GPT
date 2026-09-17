import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { useSnapshot } from '../hooks/useSnapshot';
import { api } from '../services/api';
import { Heading, Notice, Loading, Empty, MasteryBar, Arrow } from '../components/UI';
import { Analytics } from '../features/progress/Analytics';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { minutes } from '../utils/format';
function ChildDashboard({ id }: { id: string }) {
  const { data, error, refresh } = useSnapshot(id);
  const { t, lang } = useApp();
  const path = useLocation().pathname;
  const [subject, setSubject] = useState('math');
  const [selected, setSelected] = useState('');
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 15000);
    return () => clearInterval(timer);
  }, [refresh]);
  if (!data) return error ? <Notice error>{error}</Notice> : <Loading />;
  if (path.endsWith('analytics')) return <Analytics data={data} />;
  const r = data.report;
  if (path.endsWith('report'))
    return (
      <article className="panel weekly-report">
        <div className="report-top">
          <span>LearnMap</span>
          <button className="button secondary" onClick={() => window.print()}>
            {t('Print report', 'Друкувати звіт')}
          </button>
        </div>
        <h1>{t('A week of growing confidence.', 'Тиждень упевненого зростання.')}</h1>
        <p>
          {r.student} · {t('Last 7 days', 'Останні 7 днів')}
        </p>
        <div className="stat-strip">
          <div>
            <small>{t('Learning time', 'Час навчання')}</small>
            <strong>{minutes(r.seconds)}</strong>
          </div>
          <div>
            <small>{t('Completed', 'Завершено')}</small>
            <strong>
              {r.completed} / {r.goal}
            </strong>
          </div>
        </div>
        {r.subjects.map((s) => (
          <div key={s.id} className="report-subject">
            <strong>{s.title[lang]}</strong>
            <span>{s.mastery === null ? '—' : s.mastery + '%'}</span>
            <b>
              {s.delta >= 0 ? '+' : ''}
              {s.delta.toFixed(1)} {t('points', 'пунктів')}
            </b>
            <small>{minutes(s.seconds)}</small>
          </div>
        ))}
        <h2>{t('Strong foundations', 'Міцні основи')}</h2>
        <p>
          {r.strengths.map((s) => s.title[lang]).join(', ') ||
            t(
              'More practice will reveal strengths.',
              'Практика допоможе визначити сильні сторони.',
            )}
        </p>
        <h2>{t('A little more attention', 'Трохи більше уваги')}</h2>
        <p>
          {r.gaps.map((s) => s.title[lang]).join(', ') ||
            t('No assessed gaps yet.', 'Оцінених прогалин ще немає.')}
        </p>
        <h2>{t('Next week, one step at a time', 'Наступного тижня, крок за кроком')}</h2>
        <ul>
          {r.next.map((p) => (
            <li key={p.subject}>
              {p.skill.title[lang]} · {t('2 short sessions', '2 короткі заняття')}
            </li>
          ))}
        </ul>
        <p className="muted">
          {t(
            'Speaking: B1 sample practice. This report is based on saved learning evidence; it is not a CEFR certification.',
            'Говоріння: практика B1. Звіт ґрунтується на збережених результатах і не є сертифікацією CEFR.',
          )}
        </p>
      </article>
    );
  const today = data.events.filter(
    (e) => e.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10),
  );
  const detail = data.skills.find((s) => s.id === selected);
  return (
    <>
      <div className="parent-highlight">
        <div>
          <h2>
            {today.length
              ? t('A little learning happened today.', 'Сьогодні вже було навчання.')
              : t('A fresh opportunity to learn.', 'Новий шанс дізнатися щось цікаве.')}
          </h2>
          <p>
            {today.length
              ? t(
                  `${minutes(today.reduce((a, e) => a + e.seconds, 0))} of learning today. Small steps count.`,
                  `${minutes(today.reduce((a, e) => a + e.seconds, 0))} навчання сьогодні. Кожен крок важливий.`,
                )
              : t(
                  'No activity today yet. The next learning plan is ready.',
                  'Сьогодні ще немає активності. Наступний план готовий.',
                )}
          </p>
        </div>
        <Link className="button secondary" to="/parent/report">
          {t('Weekly report', 'Звіт за тиждень')}
          <Arrow />
        </Link>
      </div>
      <Analytics data={data} />
      <div className="insight-columns">
        <section>
          <h2>{t('Strengths to celebrate', 'Сильні сторони')}</h2>
          {r.strengths.slice(0, 5).map((s) => (
            <p key={s.id}>
              {s.title[lang]} <b>{Math.round(s.mastery_score)}%</b>
            </p>
          ))}
        </section>
        <section>
          <h2>{t('Where support helps', 'Де потрібна підтримка')}</h2>
          {r.gaps.slice(0, 5).map((s) => (
            <p key={s.id}>
              {s.title[lang]} <b>{Math.round(s.mastery_score)}%</b>
            </p>
          ))}
        </section>
        <section>
          <h2>{t('A thoughtful next step', 'Наступний крок')}</h2>
          <p>
            {t(
              'Try two short, calm sessions for each priority skill. Ask your child to explain an idea in their own words.',
              'Спробуйте два короткі спокійні заняття для кожної пріоритетної навички. Попросіть дитину пояснити ідею своїми словами.',
            )}
          </p>
          {r.next.map((p) => (
            <p key={p.subject}>{p.skill.title[lang]}</p>
          ))}
        </section>
      </div>
      <section className="panel">
        <h2>{t('Their knowledge, connected', 'Карта знань дитини')}</h2>
        <div className="tabs">
          {data.subjects.map((s) => (
            <button
              key={s.id}
              className={subject === s.id ? 'active' : ''}
              onClick={() => {
                setSubject(s.id);
                setSelected('');
              }}
            >
              {s.title[lang]}
            </button>
          ))}
        </div>
        <KnowledgeGraph
          skills={data.skills.filter((s) => s.subject_id === subject)}
          selected={selected}
          onSelect={(s) => setSelected(s.id)}
        />
        {detail ? (
          <div className="parent-skill-detail">
            <h3>{detail.title[lang]}</h3>
            <MasteryBar value={detail.confidence_score ? detail.mastery_score : null} />
            <p>
              {detail.attempts_count} {t('attempts', 'спроб')} · {detail.hints_used}{' '}
              {t('hints', 'підказок')} · {minutes(detail.time_spent_seconds)}
            </p>
          </div>
        ) : null}
      </section>
    </>
  );
}
export function Parent() {
  const { t } = useApp();
  const [children, setChildren] = useState<any[]>([]);
  const [child, setChild] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const load = async () => {
    try {
      const c = await api('/children');
      setChildren(c);
      setChild((p) => p || c[0]?.id || '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <Heading
        title={t('See the bigger picture.', 'Бачте повну картину.')}
        description={t(
          'A little understanding. The right kind of support.',
          'Більше розуміння. Доречна підтримка.',
        )}
      >
        <select aria-label="Select child" value={child} onChange={(e) => setChild(e.target.value)}>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {t('Grade', 'Клас')} {c.grade}
            </option>
          ))}
        </select>
      </Heading>
      <Notice error>{error}</Notice>
      <details className="link-child">
        <summary>
          {t('Link a child with an invitation', 'Прив’язати дитину за запрошенням')}
        </summary>
        <p>
          {t(
            'Ask your child to generate a one-time code in Parent connection.',
            'Попросіть дитину створити одноразовий код у розділі «Зв’язок із батьками».',
          )}
        </p>
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api('/link', 'POST', { code: code.trim() });
              setCode('');
              setError('');
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <input
            aria-label="Invitation code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            minLength={24}
            maxLength={24}
          />
          <button className="button">{t('Link child', 'Прив’язати дитину')}</button>
        </form>
      </details>
      {loading ? (
        <Loading />
      ) : child ? (
        <ChildDashboard key={child} id={child} />
      ) : (
        <Empty title={t('Your family’s map starts here.', 'Карта родини починається тут.')}>
          <p>
            {t(
              'Connect a child using their invitation code.',
              'Підключіть дитину за її кодом запрошення.',
            )}
          </p>
        </Empty>
      )}
    </>
  );
}
