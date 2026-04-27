'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const hasLoadedStoredTheme = useRef(false);

  useEffect(() => {
    if (!hasLoadedStoredTheme.current) {
      hasLoadedStoredTheme.current = true;
      const saved = window.localStorage.getItem('theme');

      if ((saved === 'light' || saved === 'dark') && saved !== theme) {
        const frame = window.requestAnimationFrame(() => {
          setTheme(saved);
        });
        return () => window.cancelAnimationFrame(frame);
      }
    }

    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
