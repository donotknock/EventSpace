import React, { createContext, useContext, useEffect, useState } from 'react';

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
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('eventspace_theme');
    return (saved as Theme) || 'dark';
  });

  const [isDyslexic, setIsDyslexic] = useState<boolean>(() => {
    return localStorage.getItem('eventspace_dyslexic') === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'high-contrast');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'high-contrast') {
      root.classList.add('dark', 'high-contrast');
    }

    localStorage.setItem('eventspace_theme', theme);
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
    localStorage.setItem('eventspace_dyslexic', String(isDyslexic));
  }, [isDyslexic]);

  const cycleTheme = () => {
    setTheme((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'high-contrast';
      return 'dark';
    });
  };

  const toggleDyslexic = () => {
    setIsDyslexic((prev) => !prev);
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
