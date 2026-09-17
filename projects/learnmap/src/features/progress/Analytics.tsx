import { Coverage } from '../../components/Coverage';
import type { Snapshot } from '../../types';
import { useApp } from '../../hooks/useApp';
import { MasteryBar, SubjectIcon, Empty } from '../../components/UI';
import { minutes } from '../../utils/format';
export function Analytics({ data }: { data: Snapshot }) {
  const { t, lang } = useApp();
  const events = data.events;
  const activity = data.activity.map((d) => ({
    ...d,
    label: new Date(d.day + 'T12:00:00Z').toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-GB', {
      weekday: 'short',
      timeZone: 'UTC',
    }),
  }));
  const max = Math.max(60, ...activity.map((d) => d.seconds));
  return (
    <>
      <div className="stat-strip">
        <div>
          <small>{t('Learning this week', 'Навчання цього тижня')}</small>
          <strong>{minutes(data.report.seconds)}</strong>
        </div>
        <div>
          <small>{t('Completed sessions', 'Завершені заняття')}</small>
          <strong>{data.report.completed}</strong>
        </div>
        <div>
          <small>{t('Current streak', 'Серія навчання')}</small>
          <strong>
            {data.streak} <span>{t('days', 'днів')}</span>
          </strong>
        </div>
        <div>
          <small>{t('Engagement · not mastery', 'Залученість · не знання')}</small>
          <strong>
            {data.profile.xp} <span>XP</span>
          </strong>
        </div>
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <h2>{t('A week of small steps', 'Тиждень маленьких кроків')}</h2>
          <div className="activity-chart">
            {activity.map((d, i) => (
              <div key={i}>
                <small>{minutes(d.seconds)}</small>
                <div className="bar-track">
                  <i style={{ height: `${(d.seconds / max) * 100}%` }} />
                </div>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>{t('Mastery estimates', 'Оцінки знань')}</h2>
          {data.report.subjects.map((s) => (
            <div className="analytics-subject" key={s.id}>
              <SubjectIcon subject={s.id} />
              <div>
                <strong>{s.title[lang]}</strong>
                <MasteryBar value={s.mastery} />
                <Coverage subject={s} />
                <small>
                  {s.delta !== null && s.delta >= 0 ? '+' : ''}
                  {s.delta === null ? '—' : s.delta.toFixed(1)}{' '}
                  {t('points on comparable skills', 'пунктів на порівнюваних навичках')} (
                  {s.comparable_skills}) · {minutes(s.seconds)}
                </small>
              </div>
            </div>
          ))}
        </section>
      </div>
      <section className="activity-section">
        <h2>{t('Your learning history', 'Історія навчання')}</h2>
        {events.length ? (
          <div className="history-table">
            {events.slice(0, 30).map((e) => (
              <div key={e.id}>
                <span>
                  {new Date(e.created_at).toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-GB', {
                    timeZone: data.profile.timezone,
                  })}
                </span>
                <strong>{e.title[lang]}</strong>
                <span>{e.kind}</span>
                <span>
                  {Math.round(e.before_score)}% → <b>{Math.round(e.after_score)}%</b>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty title={t('Your first step belongs here.', 'Тут з’явиться твій перший крок.')}>
            <p>
              {t(
                'Complete a diagnostic or lesson to start your history.',
                'Пройди діагностику чи заняття, щоб почати історію.',
              )}
            </p>
          </Empty>
        )}
      </section>
    </>
  );
}
