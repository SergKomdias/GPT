import { useState } from 'react';
import { api } from '../services/api';
import { Coverage } from '../components/Coverage';
import { Link, useParams } from 'react-router-dom';
import { useSnapshot } from '../hooks/useSnapshot';
import { useApp } from '../hooks/useApp';
import { Heading, Loading, Notice, SubjectIcon, MasteryBar, Arrow } from '../components/UI';
export function Subjects() {
  const { subject } = useParams();
  const { t, lang, refresh: refreshUser } = useApp();
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, error, refresh } = useSnapshot();
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
      <Notice error>{saveError}</Notice>
      <section className="panel subject-manager">
        <h2>{t('Your subject selection', 'Вибір предметів')}</h2>
        {data.subjectSelections.map((s) => (
          <div key={s.id}>
            <strong>{s.title[lang]}</strong>
            <span>
              {s.active
                ? t('Active', 'Активний')
                : s.selection_status === 'paused'
                  ? t('Paused · history preserved', 'Призупинено · історію збережено')
                  : t('Not selected', 'Не вивчається')}
            </span>
            <button
              className="button secondary"
              disabled={busy || (s.active && data.subjects.length === 1)}
              onClick={async () => {
                setBusy(true);
                setSaveError('');
                try {
                  const ids = data.subjects.map((s) => s.id);
                  await api('/subjects', 'PUT', {
                    subjects: s.active ? ids.filter((id) => id !== s.id) : [...ids, s.id],
                  });
                  await refresh();
                  await refreshUser();
                } catch (e) {
                  setSaveError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {s.active
                ? t('Pause', 'Призупинити')
                : s.selection_status === 'paused'
                  ? t('Resume', 'Відновити')
                  : t('Add subject', 'Додати предмет')}
            </button>
          </div>
        ))}
        <small>
          {t(
            'Keep at least one subject active. Start a diagnostic for a new subject; after a break, check your starting point again.',
            'Залиш щонайменше один активний предмет. Для нового предмета пройди діагностику; після перерви перевір знання повторно.',
          )}
        </small>
      </section>
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
              <Coverage subject={s} />
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
                    <small>{k.strand_id || k.topic_id}</small>
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
