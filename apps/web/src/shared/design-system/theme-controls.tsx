'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Toaster } from 'sonner';

import { getServerTheme, getTheme, setTheme, subscribeTheme } from './theme';

function useTheme() {
  return useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
}

export function ThemeSwitch() {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Modo claro' : 'Modo oscuro';
  const Icon = isDark ? Sun : Moon;
  return (
    <button
      type="button"
      aria-label={`Cambiar a ${label.toLowerCase()}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-variant focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden="true"
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-on-surface-variant p-0.5"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-surface text-on-surface transition-transform motion-reduce:transition-none ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
        >
          <Icon size={16} />
        </span>
      </span>
      <span>{label}</span>
    </button>
  );
}

export function ThemeToaster() {
  const theme = useTheme();
  return (
    <Toaster
      className="medical-toaster"
      closeButton
      position="top-right"
      richColors
      theme={theme}
    />
  );
}
