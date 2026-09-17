import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSnapshot } from '../hooks/useSnapshot';
import { useApp } from '../hooks/useApp';
import { Heading, Loading, Notice, MasteryBar, Arrow } from '../components/UI';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { masteryStatus } from '../utils/format';
export function KnowledgeMap() {
  const { t, lang } = useApp();
  const [params] = useSearchParams();
  const { data, error } = useSnapshot();
  const [subject, setSubject] = useState('math');
  const [selected, setSelected] = useState(params.get('skill') || 'quadratic');
  const [strand, setStrand] = useState('grammar');
  if (!data) return error ? <Notice error>{error}</Notice> : <Loading />;
  const activeSubject = data.subjects.some((s) => s.id === subject)
    ? subject
    : data.subjects[0]?.id;
  const skills = data.skills.filter(
    (s) =>
      s.subject_id === activeSubject && (activeSubject !== 'english' || s.strand_id === strand),
  );
  const skill = skills.find((s) => s.id === selected) || skills[0];
  return (
    <>
      <Heading
        title={t('Your knowledge, connected.', 'Твої знання пов’язані.')}
        description={t(
          'Every new understanding starts with a strong foundation.',
          'Кожне нове розуміння починається з міцної основи.',
        )}
      />
      <div className="tabs subject-tabs">
        {data.subjects.map((s) => (
          <button
            key={s.id}
            className={activeSubject === s.id ? 'active' : ''}
            onClick={() => setSubject(s.id)}
          >
            {s.title[lang]} <span>{s.mastery === null ? '—' : s.mastery + '%'}</span>
          </button>
        ))}
      </div>
      <div className="map-layout">
        {activeSubject === 'english' ? (
          <div className="tabs strand-tabs">
            {data.skills
              .filter((s) => s.subject_id === 'english' && !s.strand_id)
              .map((s) => (
                <button
                  key={s.id}
                  className={strand === s.id ? 'active' : ''}
                  onClick={() => {
                    setStrand(s.id);
                    setSelected(s.id);
                  }}
                >
                  {s.title[lang]}
                </button>
              ))}
          </div>
        ) : null}
        <section className="panel map-panel">
          <div className="graph-legend">
            {[
              ['gap', t('Gap', 'Прогалина')],
              ['learning', t('Learning', 'Вивчаю')],
              ['developing', t('Developing', 'Розвиваю')],
              ['mastered', t('Mastered', 'Засвоєно')],
              ['strong', t('Strong', 'Впевнено')],
            ].map(([k, v]) => (
              <span key={k}>
                <i className={k} />
                {v}
              </span>
            ))}
          </div>
          <KnowledgeGraph
            skills={skills}
            selected={skill?.id}
            onSelect={(s) => setSelected(s.id)}
          />
          <small className="graph-help">
            {t(
              'Follow the arrows. Select a skill to explore it. Scroll the map horizontally for the full pathway.',
              'Рухайся за стрілками. Обери навичку. Прокрути карту горизонтально, щоб побачити весь шлях.',
            )}
          </small>
        </section>
        {skill ? (
          <aside className="panel skill-detail">
            <span className={'status ' + masteryStatus(skill)}>
              {skill.confidence_score === 0
                ? t('Not assessed', 'Не оцінено')
                : masteryStatus(skill)}
            </span>
            <h2>{skill.title[lang]}</h2>
            <MasteryBar value={skill.confidence_score === 0 ? null : skill.mastery_score} />
            <p>{skill.explanation[lang]}</p>
            <dl>
              <div>
                <dt>{t('Independent evidence / days', 'Незалежні перевірки / дні')}</dt>
                <dd>
                  {skill.independent_count} / {skill.evidence_days}
                </dd>
              </div>
              <div>
                <dt>{t('Spaced reviews', 'Відкладені перевірки')}</dt>
                <dd>{skill.retention_count}</dd>
              </div>
              <div>
                <dt>{t('Confidence', 'Впевненість оцінки')}</dt>
                <dd>{Math.round(skill.confidence_score * 100)}%</dd>
              </div>
              <div>
                <dt>{t('Attempts', 'Спроби')}</dt>
                <dd>{skill.attempts_count}</dd>
              </div>
              <div>
                <dt>{t('Hints used', 'Підказки')}</dt>
                <dd>{skill.hints_used}</dd>
              </div>
              <div>
                <dt>{t('Next review', 'Повторення')}</dt>
                <dd>
                  {skill.next_review_at
                    ? new Date(skill.next_review_at).toLocaleDateString(
                        lang === 'uk' ? 'uk-UA' : 'en-GB',
                        { timeZone: data.profile.timezone },
                      )
                    : t('After practice', 'Після заняття')}
                </dd>
              </div>
            </dl>
            <h3>{t('Builds on', 'Спирається на')}</h3>
            {skill.prerequisites.length ? (
              skill.prerequisites.map((id) => (
                <button className="dependency-link" key={id} onClick={() => setSelected(id)}>
                  {data.skills.find((s) => s.id === id)?.title[lang]}
                  <Arrow />
                </button>
              ))
            ) : (
              <p>{t('A foundation skill', 'Базова навичка')}</p>
            )}
            <Link
              className="button full"
              to={
                skill.id === 'speaking'
                  ? '/speaking'
                  : skill.id === 'listening'
                    ? '/listening'
                    : '/lesson/' + skill.id
              }
            >
              {t('Practise this skill', 'Тренувати навичку')}
              <Arrow />
            </Link>
          </aside>
        ) : null}
      </div>
    </>
  );
}
