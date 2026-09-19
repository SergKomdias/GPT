import { PrivacyControls } from '../components/Pilot';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { api } from '../services/api';
import { Heading, Notice } from '../components/UI';
import { FamilyMessages } from '../components/FamilyMessages';
export function Settings({ family = false }: { family?: boolean }) {
  const { t, user, lang, setLang, logout, config } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="narrow">
      <Heading
        title={
          family
            ? t('Learning is better with support.', 'З підтримкою вчитися легше.')
            : t('Make yourself at home.', 'Налаштуй під себе.')
        }
      />
      <section className="panel form-panel">
        {!family ? (
          <>
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
            <label>
              {t('Interface language', 'Мова інтерфейсу')}
              <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'uk')}>
                <option value="en">English</option>
                <option value="uk">Українська</option>
              </select>
            </label>
            {user?.role === 'student' ? (
              <Link to="/onboarding" className="button secondary">
                {t(
                  'Edit profile, subjects and timezone',
                  'Редагувати профіль, предмети й часовий пояс',
                )}
              </Link>
            ) : null}
            <p className="muted">
              AI: {config.ai}.{' '}
              {t(
                'Progress is stored on the server. XP measures engagement, not knowledge.',
                'Прогрес зберігається на сервері. XP вимірює залученість, а не знання.',
              )}
            </p>
            <button className="text-link" onClick={() => void logout()}>
              {t('Sign out', 'Вийти')}
            </button>
          </>
        ) : null}
        {user?.role === 'student' ? (
          <>
            <h2>{t('Invite a parent', 'Запроси батьків')}</h2>
            <p>
              {t(
                'Share this code with your parent. It works once and expires in 24 hours. They can use it from their own parent account.',
                'Поділися кодом із батьками. Він одноразовий і діє 24 години. Вони можуть використати його у власному батьківському акаунті.',
              )}
            </p>
            <button
              className="button"
              onClick={async () => {
                try {
                  setCode((await api('/invite', 'POST')).code);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {t('Generate invitation', 'Створити запрошення')}
            </button>
            {code ? (
              <div className="invite-code">
                <code>{code}</code>
                <button
                  className="button secondary"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(code)
                      .catch(() =>
                        setError(
                          t(
                            'Select and copy the code manually.',
                            'Виділіть і скопіюйте код вручну.',
                          ),
                        ),
                      )
                  }
                >
                  {t('Copy', 'Копіювати')}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        <Notice error>{error}</Notice>
      </section>
      {family && user?.role === 'student' ? <FamilyMessages /> : null}
      {!family && <PrivacyControls />}
    </div>
  );
}
