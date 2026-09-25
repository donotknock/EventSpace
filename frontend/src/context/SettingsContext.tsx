import React, { createContext, useContext, useState } from 'react';

interface SettingsContextType {
  enablePriority: boolean;
  setEnablePriority: (val: boolean) => void;
  enableBulletSubtasks: boolean;
  setEnableBulletSubtasks: (val: boolean) => void;
  enableCircleSubtasks: boolean;
  setEnableCircleSubtasks: (val: boolean) => void;
  enableSquareSubtasks: boolean;
  setEnableSquareSubtasks: (val: boolean) => void;
  // Backwards compatibility helper
  enableSubtaskStyles: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enablePriority, setEnablePriorityState] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventspace_enable_priority');
    return saved === null ? true : saved === 'true';
  });

  const [enableBulletSubtasks, setEnableBulletSubtasksState] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventspace_subtask_bullets');
    return saved === null ? true : saved === 'true';
  });

  const [enableCircleSubtasks, setEnableCircleSubtasksState] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventspace_subtask_circles');
    return saved === null ? true : saved === 'true';
  });

  const [enableSquareSubtasks, setEnableSquareSubtasksState] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventspace_subtask_squares');
    return saved === null ? true : saved === 'true';
  });

  const setEnablePriority = (val: boolean) => {
    setEnablePriorityState(val);
    localStorage.setItem('eventspace_enable_priority', String(val));
  };

  const setEnableBulletSubtasks = (val: boolean) => {
    setEnableBulletSubtasksState(val);
    localStorage.setItem('eventspace_subtask_bullets', String(val));
  };

  const setEnableCircleSubtasks = (val: boolean) => {
    setEnableCircleSubtasksState(val);
    localStorage.setItem('eventspace_subtask_circles', String(val));
  };

  const setEnableSquareSubtasks = (val: boolean) => {
    setEnableSquareSubtasksState(val);
    localStorage.setItem('eventspace_subtask_squares', String(val));
  };

  return (
    <SettingsContext.Provider
      value={{
        enablePriority,
        setEnablePriority,
        enableBulletSubtasks,
        setEnableBulletSubtasks,
        enableCircleSubtasks,
        setEnableCircleSubtasks,
        enableSquareSubtasks,
        setEnableSquareSubtasks,
        enableSubtaskStyles: enableBulletSubtasks || enableSquareSubtasks,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
