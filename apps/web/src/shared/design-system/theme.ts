export type Theme = 'light' | 'dark';
const THEME_KEY = 'centro-medico-theme';
const THEME_EVENT = 'medical-theme-change';

// Static, user-input-free bootstrap: runs before body paint, independent of React.
export const initializeThemeScript = `(()=>{let theme="light";try{if(localStorage.getItem("${THEME_KEY}")==="dark")theme="dark"}catch{}document.documentElement.dataset.theme=theme})()`;

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function getServerTheme(): Theme {
  return 'light';
}

export function setTheme(theme: Theme): void {
  if (getTheme() === theme) return;
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Privacy settings may deny persistence; the current page still changes.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}
