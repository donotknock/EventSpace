import React, { createContext, useContext, useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';

export type Theme = 'dark' | 'light' | 'high-contrast';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  isDyslexic: boolean;
  toggleDyslexic: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('eventspace_mobile_theme') as Theme) || 'dark';
  });

  const [isDyslexic, setIsDyslexicState] = useState<boolean>(() => {
    return localStorage.getItem('eventspace_mobile_dyslexic') === 'true';
  });

  useEffect(() => {
    // Also load from Capacitor Preferences asynchronously if available
    Preferences.get({ key: 'eventspace_mobile_theme' }).then(({ value }) => {
      if (value && (value === 'dark' || value === 'light' || value === 'high-contrast')) {
        setThemeState(value as Theme);
      }
    }).catch(() => {});

    Preferences.get({ key: 'eventspace_mobile_dyslexic' }).then(({ value }) => {
      if (value !== null) {
        setIsDyslexicState(value === 'true');
      }
    }).catch(() => {});
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('eventspace_mobile_theme', newTheme);
    Preferences.set({ key: 'eventspace_mobile_theme', value: newTheme }).catch(() => {});
  };

  const setIsDyslexic = (dyslexic: boolean) => {
    setIsDyslexicState(dyslexic);
    localStorage.setItem('eventspace_mobile_dyslexic', String(dyslexic));
    Preferences.set({ key: 'eventspace_mobile_dyslexic', value: String(dyslexic) }).catch(() => {});
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'high-contrast');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'high-contrast') {
      root.classList.add('dark', 'high-contrast');
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDyslexic) {
      root.classList.add('font-dyslexic');
      document.body.classList.add('font-dyslexic');
    } else {
      root.classList.remove('font-dyslexic');
      document.body.classList.remove('font-dyslexic');
    }
  }, [isDyslexic]);

  const cycleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : theme === 'light' ? 'high-contrast' : 'dark';
    setTheme(next);
  };

  const toggleDyslexic = () => {
    setIsDyslexic(!isDyslexic);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        cycleTheme,
        isDyslexic,
        toggleDyslexic,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
