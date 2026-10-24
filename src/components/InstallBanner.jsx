import { useEffect, useState } from 'react';
import { usePrefs } from '../lib/prefs.jsx';
import Icon from './Icon.jsx';

const DISMISS_KEY = 'eft_install_dismissed';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // ask again after 3 days

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

// Android/desktop Chrome: shows our own Install button for the browser's install prompt.
// iPhone Safari has no prompt, so it shows how to use "Add to Home Screen" instead.
export default function InstallBanner() {
  const { t } = usePrefs();
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(() => isStandalone() || snoozed());

  useEffect(() => {
    if (isStandalone()) return undefined;
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => {
      setPrompt(null);
      setHidden(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    setIos(isIos());
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || (!prompt && !ios)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const install = async () => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === 'accepted') setHidden(true);
  };

  return (
    <div className="install-banner panel" role="region" aria-label={t('install.title')}>
      <img src="/icon-192.png" alt="" className="install-icon" />
      <div className="install-text">
        <b>{t('install.title')}</b>
        <small>{prompt ? t('install.sub') : t('install.iosSub')}</small>
      </div>
      {prompt && (
        <button className="btn sm" onClick={install}>
          <Icon name="download" size={15} /> {t('install.btn')}
        </button>
      )}
      <button className="icon-btn install-x" onClick={dismiss} aria-label={t('install.later')} title={t('install.later')}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
