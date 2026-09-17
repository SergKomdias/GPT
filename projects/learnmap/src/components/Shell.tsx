import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Home,
  Share2 as Network,
  BookOpen,
  ChartNoAxesColumn,
  Users,
  Settings,
  LogOut,
  Shield,
  Globe,
} from 'lucide-react';
import { Logo } from './UI';
import { useApp } from '../hooks/useApp';
export function Shell() {
  const { user, t, lang, setLang, logout, config } = useApp();
  const path = useLocation().pathname;
  const links =
    user?.role === 'student'
      ? [
          ['/today', Home, t('Today', 'Сьогодні')],
          ['/map', Network, 'LearnMap'],
          ['/subjects', BookOpen, t('Subjects', 'Предмети')],
          ['/progress', ChartNoAxesColumn, t('Progress', 'Прогрес')],
        ]
      : user?.role === 'parent'
        ? [
            ['/parent', Users, t('Overview', 'Огляд')],
            ['/parent/analytics', ChartNoAxesColumn, t('Analytics', 'Аналітика')],
            ['/parent/report', BookOpen, t('Weekly report', 'Звіт за тиждень')],
          ]
        : [['/admin', Shield, t('Curriculum editor', 'Редактор програми')]];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" aria-label="LearnMap home">
          <Logo />
        </Link>
        <nav>
          {links.map(([to, Icon, label]) => {
            const I = Icon as typeof Home;
            return (
              <NavLink key={String(to)} to={String(to)} end>
                <I size={21} />
                <span>{String(label)}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {user?.role === 'student' ? (
            <NavLink to="/family" aria-label={t('Parent connection', 'Зв’язок із батьками')}>
              <Users size={21} />
              <span>{t('Parent connection', 'Зв’язок із батьками')}</span>
            </NavLink>
          ) : null}
          <NavLink to="/settings" aria-label={t('Settings', 'Налаштування')}>
            <Settings size={21} />
            <span>{t('Settings', 'Налаштування')}</span>
          </NavLink>
          <div className="profile">
            <span className="avatar">
              {user?.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div>
              <strong>{user?.name}</strong>
              <small>
                {user?.role === 'student'
                  ? t(`Grade ${user.profile?.grade}`, `${user.profile?.grade} клас`)
                  : t(user?.role || '', user?.role === 'parent' ? 'Батьки' : 'Адміністратор')}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label={t('Sign out', 'Вийти')}
              onClick={() => void logout()}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            {t('Workspace', 'Мій простір')} <i>/</i>{' '}
            {String(links.find((l) => l[0] === path)?.[2] || t('Learning', 'Навчання'))}
          </span>
          <div className="top-actions">
            <Globe size={17} />
            <select
              aria-label="Interface language"
              value={lang}
              onChange={(e) => setLang(e.target.value as 'en' | 'uk')}
            >
              <option value="en">EN</option>
              <option value="uk">UA</option>
            </select>
            <span className="avatar small">
              {user?.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer>
          <span>
            {t(
              'A clearer picture of what you know. A confident next step.',
              'Чітке розуміння знань. Упевнений наступний крок.',
            )}
          </span>
          <small>
            {config.ai === 'mock' ? t('AI: demo adapter', 'AI: демоадаптер') : 'AI: OpenAI'} ·
            LearnMap 0.1
          </small>
        </footer>
      </div>
    </div>
  );
}
