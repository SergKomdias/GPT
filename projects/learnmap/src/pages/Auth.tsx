import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Logo, Notice, Arrow, Loading } from '../components/UI';
import { useApp } from '../hooks/useApp';
import { api } from '../services/api';
export function Auth() {
  const { user, loading, refresh, t, lang, setLang, config } = useApp();
  const nav = useNavigate();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (user)
    return (
      <Navigate
        to={
          user.role === 'student'
            ? user.profile?.onboarded
              ? '/today'
              : '/onboarding'
            : user.role === 'parent'
              ? '/parent'
              : '/admin'
        }
        replace
      />
    );
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      await api('/auth/' + (register ? 'register' : 'login'), 'POST', d);
      await refresh();
      nav('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const demo = async (role: string) => {
    setBusy(true);
    try {
      await api('/auth/demo', 'POST', { role });
      await refresh();
      nav('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Logo />
        <div>
          <h1>
            {t('Every mind has', 'Кожен має')}
            <br />
            {t('its own map.', 'свою карту.')}
          </h1>
          <p>{t('Your personal map of knowledge.', 'Твоя персональна карта знань.')}</p>
          <div className="story-graph">
            <span>{t('Arithmetic', 'Арифметика')}</span>
            <i />
            <span>{t('Algebra', 'Алгебра')}</span>
            <i />
            <span className="active">{t('Your next step', 'Твій наступний крок')}</span>
          </div>
          <p className="auth-description">
            {t(
              'Understand what you know. Find what comes next. Make progress, one thoughtful step at a time.',
              'Зрозумій, що вже знаєш. Знайди наступний крок. Рухайся вперед у власному темпі.',
            )}
          </p>
        </div>
        <small>{t('Mathematics · Physics · English', 'Математика · Фізика · Англійська')}</small>
      </section>
      <section className="auth-form">
        <select
          className="lang-select"
          aria-label="Interface language"
          value={lang}
          onChange={(e) => setLang(e.target.value as 'en' | 'uk')}
        >
          <option value="en">English</option>
          <option value="uk">Українська</option>
        </select>
        <div>
          <h2>
            {register
              ? t('Your journey starts here.', 'Твій шлях починається тут.')
              : t('Welcome to LearnMap.', 'Вітаємо в LearnMap.')}
          </h2>
          <p>
            {t('A little curiosity goes a long way.', 'Допитливість відкриває нові можливості.')}
          </p>
          <div className="tabs">
            <button className={!register ? 'active' : ''} onClick={() => setRegister(false)}>
              {t('Sign in', 'Увійти')}
            </button>
            <button className={register ? 'active' : ''} onClick={() => setRegister(true)}>
              {t('Create account', 'Створити акаунт')}
            </button>
          </div>
          <form onSubmit={submit}>
            {register ? (
              <>
                <label>
                  {t('Name or nickname', 'Ім’я або псевдонім')}
                  <input name="name" required maxLength={60} />
                </label>
                <label>
                  {t('I am a', 'Я')}
                  <select name="role">
                    <option value="student">{t('Student', 'Учень / учениця')}</option>
                    <option value="parent">{t('Parent', 'Мама / тато')}</option>
                  </select>
                </label>
              </>
            ) : null}
            <label>
              {t('Email', 'Електронна пошта')}
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <label>
              {t('Password', 'Пароль')}
              <input
                type="password"
                name="password"
                minLength={10}
                maxLength={128}
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                placeholder={t('At least 10 characters', 'Щонайменше 10 символів')}
              />
            </label>
            <Notice error>{error}</Notice>
            {register && config.invite_required && (
              <label>
                {t('Pilot invite code', 'Код запрошення пілоту')}
                <input name="invite_code" required autoComplete="off" />
              </label>
            )}
            <button className="button full" disabled={busy}>
              {register ? t('Create account', 'Створити акаунт') : t('Sign in', 'Увійти')}
              <Arrow />
            </button>
          </form>
          {config.demo ? (
            <div className="demo-choices">
              <p>{t('Explore with fictional demo data', 'Спробуй із вигаданими демоданими')}</p>
              <div>
                {['student', 'parent', 'admin'].map((r, i) => (
                  <button key={r} disabled={busy} onClick={() => void demo(r)}>
                    {
                      [
                        t('Student demo', 'Демо учня'),
                        t('Parent demo', 'Демо батьків'),
                        t('Admin demo', 'Демо адміна'),
                      ][i]
                    }
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <small className="muted">
            {t(
              'All learning and parent features are free in the 0.3 pilot.',
              'У пілоті 0.3 усе навчання й батьківські функції безкоштовні.',
            )}
          </small>
          <p>
            <Link to="/about">{t('About LearnMap', 'Про LearnMap')}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
