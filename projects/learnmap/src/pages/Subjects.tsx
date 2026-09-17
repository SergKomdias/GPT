import { Link, useParams } from 'react-router-dom';
import { useSnapshot } from '../hooks/useSnapshot';
import { useApp } from '../hooks/useApp';
import { Heading, Loading, Notice, SubjectIcon, MasteryBar, Arrow } from '../components/UI';
export function Subjects() {
  const { subject } = useParams();
  const { t, lang } = useApp();
  const { data, error } = useSnapshot();
  if (!data) return error ? <Notice error>{error}</Notice> : <Loading />;
  const subjects = subject ? data.subjects.filter((s) => s.id === subject) : data.subjects;
  return (
    <>
      <Heading
        title={
          subject
            ? subjects[0]?.title[lang]
            : t('A world worth understanding.', 'Світ, який варто зрозуміти.')
        }
        description={t(
          'Find your starting point. Build your own path.',
          'Знайди початок. Побудуй власний шлях.',
        )}
      />
      {subjects.map((s) => (
        <section className="subject-section" key={s.id}>
          <div className="subject-section-heading">
            <SubjectIcon subject={s.id} />
            <div>
              <h2>
                {s.title[lang]}
                {s.id === 'english' ? ' · B1' : ''}
              </h2>
              <span className="muted">
                {s.assessed}/{s.total} {t('skills assessed', 'навичок оцінено')}
              </span>
            </div>
            <div className="subject-progress">
              <MasteryBar value={s.mastery} />
            </div>
            <Link className="button secondary" to={'/diagnostic/' + s.id}>
              {t('Start diagnostic', 'Пройти діагностику')}
              <Arrow />
            </Link>
          </div>
          {s.id === 'english' ? (
            <div className="english-actions">
              <Link to="/speaking" className="button">
                {t('Speaking studio', 'Розмовна практика')}
                <Arrow />
              </Link>
              <Link to="/listening" className="button secondary">
                {t('Listening practice', 'Аудіювання')}
                <Arrow />
              </Link>
            </div>
          ) : null}
          <div className="skill-table">
            {data.skills
              .filter((k) => k.subject_id === s.id)
              .map((k) => (
                <Link
                  to={
                    k.id === 'speaking'
                      ? '/speaking'
                      : k.id === 'listening'
                        ? '/listening'
                        : '/lesson/' + k.id
                  }
                  key={k.id}
                >
                  <div>
                    <strong>{k.title[lang]}</strong>
                    <small>{k.topic_id}</small>
                  </div>
                  <MasteryBar value={k.confidence_score === 0 ? null : k.mastery_score} />
                  <Arrow />
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
