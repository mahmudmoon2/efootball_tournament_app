import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { isDemo } from './lib/api.js';
import { usePrefs } from './lib/prefs.jsx';
import Icon from './components/Icon.jsx';
import { Avatar } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Tournament from './pages/Tournament.jsx';
import InstallBanner from './components/InstallBanner.jsx';

export default function App() {
  const { user, logout } = useAuth();
  const { t, lang, theme, toggleLang, toggleTheme } = usePrefs();
  const nav = useNavigate();
  return (
    <>
      <div className="scene" aria-hidden="true">
        <div className="glow g1" />
        <div className="glow g2" />
        <div className="floor" />
      </div>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-logo">⚽</span>
            <span className="brand-text">
              eFootball <b>Arena</b>
            </span>
          </Link>
          <nav className="topnav">
            <div className="prefs">
              <button
                className="pref-btn"
                onClick={toggleTheme}
                title={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
                aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
              >
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
              </button>
              <button className="pref-btn lang" onClick={toggleLang} title={t('lang.switch')} aria-label={t('lang.switch')}>
                <span className={lang === 'en' ? 'on' : ''}>EN</span>
                <span className={lang === 'bn' ? 'on' : ''}>বাং</span>
              </button>
            </div>
            {user ? (
              <>
                <span className="user-chip" title={user.email}>
                  <Avatar name={user.name} size={26} />
                  <span className="hide-sm">{user.name}</span>
                  {user.isAdmin && <Icon name="shield" size={14} className="admin-mark" />}
                </span>
                <button
                  className="icon-btn"
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                  onClick={async () => {
                    await logout();
                    nav('/');
                  }}
                >
                  <Icon name="logout" />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn sm login-btn" aria-label={t('nav.login')}>
                <Icon name="login" size={16} /> <span className="hide-sm">{t('nav.login')}</span>
              </Link>
            )}
          </nav>
        </div>
      </header>
      {isDemo && (
        <div className="demo-banner">
          <Icon name="bolt" size={14} /> {t('demo.banner')} <b>admin / admin</b>.
        </div>
      )}
      <main className="container main">
        <InstallBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/t/:id" element={<Tournament />} />
          <Route
            path="*"
            element={
              <div className="empty panel">
                {t('notFound')} <Link to="/">{t('goHome')}</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  );
}
