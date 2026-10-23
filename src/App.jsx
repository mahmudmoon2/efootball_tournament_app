import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { isDemo } from './lib/api.js';
import Icon from './components/Icon.jsx';
import { Avatar } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Tournament from './pages/Tournament.jsx';

export default function App() {
  const { user, logout } = useAuth();
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
            {user ? (
              <>
                <span className="user-chip" title={user.email}>
                  <Avatar name={user.name} size={26} />
                  <span className="hide-xs">{user.name}</span>
                  {user.isAdmin && <Icon name="shield" size={14} className="admin-mark" />}
                </span>
                <button
                  className="icon-btn"
                  title="Log out"
                  aria-label="Log out"
                  onClick={async () => {
                    await logout();
                    nav('/');
                  }}
                >
                  <Icon name="logout" />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn sm">
                <Icon name="login" size={16} /> Admin login
              </Link>
            )}
          </nav>
        </div>
      </header>
      {isDemo && (
        <div className="demo-banner">
          <Icon name="bolt" size={14} /> Demo mode: data stays in this browser. Log in with <b>admin / admin</b>.
        </div>
      )}
      <main className="container main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/t/:id" element={<Tournament />} />
          <Route
            path="*"
            element={
              <div className="empty panel">
                Page not found. <Link to="/">Go home</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  );
}
