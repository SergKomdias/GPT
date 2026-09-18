import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { api } from '../services/api';
import { Heading, Notice, Arrow } from '../components/UI';
export function Onboarding() {
  const { user, t, lang, setLang, refresh } = useApp();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [subjects, setSubjects] = useState<string[]>(user?.profile?.subjects || []);
  return (
    <div className="narrow">
      <Heading
        title={t('Let’s make this your map.', 'Створімо твою карту.')}
        description={t(
          'A few details help us find your starting point.',
          'Кілька деталей допоможуть визначити старт.',
        )}
      />
      <form
        className="panel form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const d = Object.fromEntries(new FormData(e.currentTarget));
          try {
            await api('/profile', 'PUT', {
              ...d,
              subjects,
              grade: Number(d.grade),
              age: Number(d.age),
              daily_minutes: Number(d.daily_minutes),
            });
            setLang(d.interface_language as 'en' | 'uk');
            await refresh();
            nav('/subjects');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="subject-choice">
          <legend>{t('What do you want to learn?', 'Що ти хочеш вивчати?')}</legend>
          {['math', 'physics', 'english'].map((id, i) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={subjects.includes(id)}
                onChange={() =>
                  setSubjects((old) =>
                    old.includes(id) ? old.filter((s) => s !== id) : [...old, id],
                  )
                }
              />
              {t(
                ['Mathematics', 'Physics', 'English'][i],
                ['Математика', 'Фізика', 'Англійська'][i],
              )}
            </label>
          ))}
          <small>
            {t('Choose one or more subjects.', 'Можна вибрати один або кілька предметів.')}
          </small>
        </fieldset>
        <p>
          {t(
            'We’ll start with a short diagnostic to build your LearnMap.',
            'Почнемо з короткої діагностики, щоб побудувати твою LearnMap.',
          )}
        </p>
        <label>
          {t('Name or nickname', 'Ім’я або псевдонім')}
          <input name="name" defaultValue={user?.name} required maxLength={60} />
        </label>
        <div className="form-grid">
          <label>
            {t('Age', 'Вік')}
            <input
              type="number"
              name="age"
              min={5}
              max={100}
              defaultValue={user?.profile?.age || 15}
              required
            />
          </label>
          <label>
            {t('Grade', 'Клас')}
            <select name="grade" defaultValue={user?.profile?.grade || 10}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {t('Country', 'Країна')}
          <input
            name="country"
            defaultValue={user?.profile?.country || 'Ukraine'}
            required
            maxLength={80}
          />
        </label>
        <div className="form-grid">
          <label>
            {t('Learning language', 'Мова навчання')}
            <select
              name="learning_language"
              defaultValue={user?.profile?.onboarded ? user.profile.learning_language : lang}
            >
              <option value="en">English</option>
              <option value="uk">Українська</option>
            </select>
          </label>
          <label>
            {t('Interface language', 'Мова інтерфейсу')}
            <select name="interface_language" defaultValue={lang}>
              <option value="en">English</option>
              <option value="uk">Українська</option>
            </select>
          </label>
        </div>
        <Notice error>{error}</Notice>
        <label>
          {t('Timezone', 'Часовий пояс')}
          <input
            name="timezone"
            defaultValue={
              user?.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
            }
            required
          />
        </label>
        <label>
          {t('Daily learning goal (minutes)', 'Щоденна ціль (хвилин)')}
          <input
            type="number"
            name="daily_minutes"
            min={10}
            max={90}
            defaultValue={user?.profile?.daily_minutes || 25}
            required
          />
        </label>
        <button className="button" disabled={busy || !subjects.length}>
          {t('Choose a subject', 'Обрати предмет')}
          <Arrow />
        </button>
      </form>
    </div>
  );
}
