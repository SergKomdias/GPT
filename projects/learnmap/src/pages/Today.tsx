import { Coverage } from '../components/Coverage';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { useSnapshot } from '../hooks/useSnapshot';
import { Heading, SubjectIcon, Arrow, MasteryBar, Loading, Notice } from '../components/UI';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
export function Today() {
  const { t, lang, user } = useApp();
  const { data, error } = useSnapshot();
  const nav = useNavigate();
  if (!data) return error ? <Notice error>{error}</Notice> : <Loading />;
  const begin = (id: string) =>
    id === 'speaking' ? '/speaking' : id === 'listening' ? '/listening' : '/lesson/' + id;
  const first = data.plan[0];
  return (
    <>
      <Heading
        title={t('A little progress. Every day.', 'Трохи прогресу. Щодня.')}
        description={t(
          'Your next step is already mapped out.',
          'Твій наступний крок уже на карті.',
        )}
      >
        <div className="weekly-goal">
          <div>
            <span>{t('Your weekly goal', 'Твоя ціль на тиждень')}</span>
            <b>
              {data.report.completed}/5 <small>{t('sessions', 'занять')}</small>
            </b>
          </div>
          <div className="goal-dots">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} className={i < data.report.completed ? 'done' : ''} />
            ))}
          </div>
        </div>
      </Heading>
      {user?.privacy?.pilot && !user.privacy.granted && (
        <Notice>
          <Link to="/settings">
            {t(
              'Parent consent is required before learning. Open Settings to invite a parent.',
              'Перед навчанням потрібна згода батьків. Відкрий налаштування й запроси батьків.',
            )}
          </Link>
        </Notice>
      )}
      <div className="today-grid">
        <div>
          <section className="plan-hero">
            <div className="hero-copy">
              <strong>{t('Your path for today', 'Твій план на сьогодні')}</strong>
              <p className="hero-meta">
                {data.plan.length} {t('sessions', 'заняття')} ·{' '}
                {data.plan.reduce((a, p) => a + p.minutes, 0)} {t('minutes', 'хвилини')}
              </p>
              <h2>
                {t('Small steps.', 'Маленькі кроки.')}
                <br />
                {t('Stronger foundations.', 'Міцні знання.')}
              </h2>
              <p>
                {t(
                  'A learning plan that grows with you.',
                  'Навчальний план, що зростає разом із тобою.',
                )}
              </p>
              <Link
                className="button"
                to={
                  first && first.skill.confidence_score === 0
                    ? '/diagnostic/' + first.subject
                    : first
                      ? begin(first.skill.id)
                      : '/subjects'
                }
              >
                {t('Start learning', 'Почати навчання')}
                <Arrow />
              </Link>
            </div>
            <svg className="hero-network" viewBox="0 0 270 230" aria-hidden="true">
              <g fill="none" stroke="#8db276" strokeWidth="1.3">
                <path d="M26 124L107 52L204 70L235 123L204 70L231 17M107 52L150 164L204 70M26 124L87 190L150 164L232 202" />
              </g>
              {[
                [26, 124, 16],
                [107, 52, 26],
                [204, 70, 14],
                [235, 123, 17],
                [231, 17, 13],
                [150, 164, 29],
                [87, 190, 12],
                [232, 202, 12],
              ].map(([x, y, r], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={i === 1 || i === 5 ? '#275f43' : i === 7 ? '#6d985d' : '#a9cf7d'}
                  stroke="#f5ffe9"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </section>
          <section className="today-lessons">
            <h2>{t('Today’s learning', 'Навчання сьогодні')}</h2>
            <div className="learning-list">
              {data.plan.map((p, i) => (
                <Link
                  to={
                    p.skill.confidence_score === 0 ? '/diagnostic/' + p.subject : begin(p.skill.id)
                  }
                  key={p.skill.id}
                  className="learning-row"
                >
                  <span className="row-number">0{i + 1}</span>
                  <SubjectIcon subject={p.subject} />
                  <div>
                    <strong>{data.subjects.find((s) => s.id === p.subject)?.title[lang]}</strong>
                    <p>
                      {p.skill.title[lang]}
                      {p.skill.confidence_score === 0
                        ? ' · ' + t('Start diagnostic', 'Пройди діагностику')
                        : ''}
                    </p>
                  </div>
                  <span className="duration">
                    {p.minutes} {t('min', 'хв')}
                  </span>
                  <span className="round-arrow">
                    <Arrow />
                  </span>
                </Link>
              ))}
            </div>
          </section>
          <section className="ar-lab-teaser">
            <div>
              <span className="ar-kicker">NEW · AR LAB</span>
              <h2>{t('Land the drone', 'Посади дрон')}</h2>
              <p>
                {t(
                  'Five short kinematics missions through your phone camera. Predict first, then watch the result.',
                  'П’ять коротких місій з кінематики через камеру телефона. Спочатку прогноз — потім результат.',
                )}
              </p>
            </div>
            <Link className="button" to="/ar-lab">
              {t('Open AR Lab', 'Відкрити AR Lab')}
              <Arrow />
            </Link>
          </section>
        </div>
        <section className="panel snapshot-panel">
          <div className="section-heading">
            <h2>{t('Knowledge snapshot', 'Твоя карта знань')}</h2>
            <Link to="/map">
              {t('Explore your LearnMap', 'Відкрити LearnMap')}
              <Arrow />
            </Link>
          </div>
          <KnowledgeGraph
            compact
            skills={data.skills}
            onSelect={(s) => nav('/map?skill=' + s.id)}
          />
        </section>
      </div>
      <section className="subjects-overview">
        <div className="section-heading">
          <h2>{t('Your subjects', 'Твої предмети')}</h2>
          <Link to="/subjects">
            {t('View all subjects', 'Усі предмети')}
            <Arrow />
          </Link>
        </div>
        <div className="subject-summary">
          {data.subjects.map((s) => (
            <Link key={s.id} to={'/subjects/' + s.id}>
              <SubjectIcon subject={s.id} />
              <div>
                <strong>
                  {s.title[lang]}
                  {s.id === 'english' ? <small> B1</small> : null}
                </strong>
                <MasteryBar value={s.mastery} />
                <Coverage subject={s} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="engagement">
        <span>
          {t(
            `Hello, ${user?.name}. Keep your curiosity growing.`,
            `Привіт, ${user?.name}. Продовжуй досліджувати.`,
          )}
        </span>
        <span>
          {data.profile.xp} XP · {t('Level', 'Рівень')} {Math.floor(data.profile.xp / 100) + 1} ·{' '}
          {data.streak} {t('day streak', 'днів поспіль')}
        </span>
      </div>
    </>
  );
}
