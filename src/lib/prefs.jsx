// Viewer preferences: language (en / bn) and colour theme (dark / light), remembered per browser.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICT } from './i18n.js';

const PrefsCtx = createContext(null);

function load(key, allowed, fallback) {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: keep it for this visit only */
  }
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toBnDigits = (s) => String(s).replace(/\d/g, (d) => BN_DIGITS[d]);

// Numbers inside Bangla sentences use Bangla digits; names and scores elsewhere stay as entered.
function format(lang, key, vars) {
  let s = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars[k];
      if (v && typeof v === 'object' && v.key) return format(lang, v.key, v.vars);
      if (lang === 'bn' && typeof v === 'number') return toBnDigits(v);
      return v ?? '';
    });
  }
  return s;
}

export function PrefsProvider({ children }) {
  const [lang, setLang] = useState(() => load('eft_lang', ['en', 'bn'], 'en'));
  const [theme, setTheme] = useState(() => load('eft_theme', ['dark', 'light'], 'dark'));

  useEffect(() => {
    document.documentElement.lang = lang;
    store('eft_lang', lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#eef2f8' : '#05070f');
    store('eft_theme', theme);
  }, [theme]);

  const t = useCallback((key, vars) => format(lang, key, vars), [lang]);

  // Translates a { key, vars } message, an error carrying a key, or falls back to plain text
  const tr = useCallback(
    (msg) => {
      if (!msg) return '';
      if (typeof msg === 'string') return msg;
      if (msg.key) return format(lang, msg.key, msg.vars);
      return msg.message || String(msg);
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      theme,
      t,
      tr,
      locale: lang === 'bn' ? 'bn-BD' : 'en-GB',
      toggleLang: () => setLang((l) => (l === 'en' ? 'bn' : 'en')),
      toggleTheme: () => setTheme((x) => (x === 'dark' ? 'light' : 'dark')),
    }),
    [lang, theme, t, tr]
  );

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export const usePrefs = () => useContext(PrefsCtx);

// Round label from its position in the bracket: Final, Semi-final, Quarter-final, Round of N
export function roundLabel(t, idx, total) {
  const left = total - idx;
  if (left === 1) return t('round.final');
  if (left === 2) return t('round.semi');
  if (left === 3) return t('round.quarter');
  return t('round.of', { n: 2 ** left });
}

export function groupLabel(t, tour, g) {
  if (g.id === 'L') return t(tour.format === 'swiss_knockout' ? 'leaguePhase' : 'leagueTable');
  return t('group', { id: g.id });
}
