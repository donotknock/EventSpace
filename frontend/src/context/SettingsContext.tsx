import React, { createContext, useContext, useState } from 'react';
import { triggerAgendaRefresh } from '../utils/agendaEvents';

export type CheckboxStyle = 'circle' | 'square';
export type BulletStyle = 'dot' | 'dash' | 'arrow' | 'starred';
export type TimeFormat = '12h' | '24h';
export type DayOfWeek = 'monday' | 'saturday' | 'sunday';
export type TrackedBlockType = 'task' | 'note' | 'venue' | 'picture' | 'audio' | 'video';

export const normalizeTrackedBlockType = (type?: string): TrackedBlockType => {
  if (type === 'info' || type === 'note') return 'note';
  if (type === 'venue') return 'venue';
  if (type === 'picture') return 'picture';
  if (type === 'audio') return 'audio';
  if (type === 'video') return 'video';
  return 'task';
};

interface SettingsContextType {
  enablePriority: boolean;
  setEnablePriority: (val: boolean) => void;
  // Multi-select Checkbox indicator styles
  checkboxStyles: Array<'circle' | 'square'>;
  setCheckboxStyles: (val: Array<'circle' | 'square'>) => void;
  toggleCheckboxStyle: (val: 'circle' | 'square') => void;
  // Multi-select Bullet list styles
  bulletStyles: Array<'dot' | 'dash' | 'arrow' | 'starred'>;
  setBulletStyles: (val: Array<'dot' | 'dash' | 'arrow' | 'starred'>) => void;
  toggleBulletStyle: (val: 'dot' | 'dash' | 'arrow' | 'starred') => void;
  // Granular Schedule/Agenda tracking
  trackSubtasksInAgenda: boolean;
  setTrackSubtasksInAgenda: (val: boolean) => void;
  trackBlocksInAgenda: boolean;
  setTrackBlocksInAgenda: (val: boolean) => void;
  trackedBlockTypes: TrackedBlockType[];
  setTrackedBlockTypes: (types: TrackedBlockType[]) => void;
  toggleTrackedBlockType: (type: TrackedBlockType) => void;
  // Global Localization
  dateFormat: string;
  setDateFormat: (val: string) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (val: TimeFormat) => void;
  firstDayOfWeek: DayOfWeek;
  setFirstDayOfWeek: (val: DayOfWeek) => void;
  // Backwards compatibility helpers
  enableSquareSubtasks: boolean;
  enableCircleSubtasks: boolean;
  enableBulletSubtasks: boolean;
  enableSubtaskStyles: boolean;
  checkboxStyle: 'square' | 'circle';
  setCheckboxStyle: (val: 'square' | 'circle') => void;
  bulletStyle: BulletStyle;
  setBulletStyle: (val: BulletStyle) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enablePriority, setEnablePriorityState] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventspace_enable_priority');
    return saved === null ? true : saved === 'true';
  });

  const [checkboxStyles, setCheckboxStylesState] = useState<Array<'circle' | 'square'>>(() => {
    try {
      const saved = localStorage.getItem('eventspace_checkbox_styles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((s: string) => s === 'square' || s === 'circle');
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return ['circle', 'square'];
  });

  const [bulletStyles, setBulletStylesState] = useState<Array<'dot' | 'dash' | 'arrow' | 'starred'>>(() => {
    try {
      const saved = localStorage.getItem('eventspace_bullet_styles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((s: string) => (s === 'bullet' ? 'dot' : s));
          const valid = mapped.filter((s: string) => s === 'dot' || s === 'dash' || s === 'arrow' || s === 'starred');
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return ['dot', 'dash', 'arrow', 'starred'];
  });

  const [trackSubtasksInAgenda, setTrackSubtasksInAgendaState] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventspace_agenda_track_subtasks');
    return saved === null ? true : saved === 'true';
  });

  const [trackBlocksInAgenda, setTrackBlocksInAgendaState] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventspace_agenda_track_blocks');
    return saved === null ? true : saved === 'true';
  });

  const [trackedBlockTypes, setTrackedBlockTypesState] = useState<TrackedBlockType[]>(() => {
    try {
      const saved = localStorage.getItem('eventspace_agenda_tracked_block_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((t: string) =>
            ['task', 'note', 'venue', 'picture', 'audio', 'video'].includes(t)
          );
          return valid as TrackedBlockType[];
        }
      }
    } catch {}
    return ['task', 'note', 'venue', 'picture', 'audio', 'video'];
  });

  const [dateFormat, setDateFormatState] = useState<string>(() => {
    const saved = localStorage.getItem('eventspace_date_format');
    if (!saved || saved === 'default') return 'DD MMM YYYY';
    if (saved === 'us') return 'MM/DD/YYYY';
    if (saved === 'iso') return 'YYYY-MM-DD';
    return saved;
  });

  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(() => {
    const saved = localStorage.getItem('eventspace_time_format');
    return saved === '24h' || saved === '12h' ? saved : '12h';
  });

  const [firstDayOfWeek, setFirstDayOfWeekState] = useState<DayOfWeek>(() => {
    const saved = localStorage.getItem('eventspace_first_day_of_week') as DayOfWeek;
    return saved === 'monday' || saved === 'saturday' || saved === 'sunday' ? saved : 'monday';
  });

  const setEnablePriority = (val: boolean) => {
    setEnablePriorityState(val);
    localStorage.setItem('eventspace_enable_priority', String(val));
  };

  const setCheckboxStyles = (styles: Array<'square' | 'circle'>) => {
    const valid = styles.filter((s) => s === 'square' || s === 'circle');
    if (valid.length === 0) return;
    setCheckboxStylesState(valid);
    localStorage.setItem('eventspace_checkbox_styles', JSON.stringify(valid));
  };

  const toggleCheckboxStyle = (style: 'square' | 'circle') => {
    setCheckboxStylesState((prev) => {
      let next: Array<'square' | 'circle'>;
      if (prev.includes(style)) {
        if (prev.length <= 1) return prev; // Enforce minimum of 1 selection
        next = prev.filter((s) => s !== style);
      } else {
        next = [...prev, style];
      }
      localStorage.setItem('eventspace_checkbox_styles', JSON.stringify(next));
      return next;
    });
  };

  const setBulletStyles = (styles: Array<'dot' | 'dash' | 'arrow' | 'starred'>) => {
    const valid = styles.filter((s) => s === 'dot' || s === 'dash' || s === 'arrow' || s === 'starred');
    if (valid.length === 0) return;
    setBulletStylesState(valid);
    localStorage.setItem('eventspace_bullet_styles', JSON.stringify(valid));
  };

  const toggleBulletStyle = (style: 'dot' | 'dash' | 'arrow' | 'starred') => {
    setBulletStylesState((prev) => {
      let next: Array<'dot' | 'dash' | 'arrow' | 'starred'>;
      if (prev.includes(style)) {
        if (prev.length <= 1) return prev; // Enforce minimum of 1 selection
        next = prev.filter((s) => s !== style);
      } else {
        next = [...prev, style];
      }
      localStorage.setItem('eventspace_bullet_styles', JSON.stringify(next));
      return next;
    });
  };

  const setCheckboxStyle = (val: 'square' | 'circle') => {
    toggleCheckboxStyle(val);
  };

  const setBulletStyle = (val: BulletStyle) => {
    toggleBulletStyle(val);
  };

  const setTrackSubtasksInAgenda = (val: boolean) => {
    setTrackSubtasksInAgendaState(val);
    localStorage.setItem('eventspace_agenda_track_subtasks', String(val));
    triggerAgendaRefresh();
  };

  const setTrackBlocksInAgenda = (val: boolean) => {
    setTrackBlocksInAgendaState(val);
    localStorage.setItem('eventspace_agenda_track_blocks', String(val));
    triggerAgendaRefresh();
  };

  const setTrackedBlockTypes = (types: TrackedBlockType[]) => {
    const valid = types.filter((t) => ['task', 'note', 'venue', 'picture', 'audio', 'video'].includes(t));
    setTrackedBlockTypesState(valid);
    localStorage.setItem('eventspace_agenda_tracked_block_types', JSON.stringify(valid));
    triggerAgendaRefresh();
  };

  const toggleTrackedBlockType = (type: TrackedBlockType) => {
    setTrackedBlockTypesState((prev) => {
      let next: TrackedBlockType[];
      if (prev.includes(type)) {
        next = prev.filter((t) => t !== type);
      } else {
        next = [...prev, type];
      }
      localStorage.setItem('eventspace_agenda_tracked_block_types', JSON.stringify(next));
      triggerAgendaRefresh();
      return next;
    });
  };

  const setDateFormat = (val: string) => {
    setDateFormatState(val);
    localStorage.setItem('eventspace_date_format', val);
  };

  const setTimeFormat = (val: TimeFormat) => {
    setTimeFormatState(val);
    localStorage.setItem('eventspace_time_format', val);
  };

  const setFirstDayOfWeek = (val: DayOfWeek) => {
    setFirstDayOfWeekState(val);
    localStorage.setItem('eventspace_first_day_of_week', val);
  };

  const enableSquareSubtasks = checkboxStyles.includes('square');
  const enableCircleSubtasks = checkboxStyles.includes('circle');
  const enableBulletSubtasks = bulletStyles.length > 0;

  return (
    <SettingsContext.Provider
      value={{
        enablePriority,
        setEnablePriority,
        checkboxStyles,
        setCheckboxStyles,
        toggleCheckboxStyle,
        bulletStyles,
        setBulletStyles,
        toggleBulletStyle,
        trackSubtasksInAgenda,
        setTrackSubtasksInAgenda,
        trackBlocksInAgenda,
        setTrackBlocksInAgenda,
        trackedBlockTypes,
        setTrackedBlockTypes,
        toggleTrackedBlockType,
        dateFormat,
        setDateFormat,
        timeFormat,
        setTimeFormat,
        firstDayOfWeek,
        setFirstDayOfWeek,
        enableSquareSubtasks,
        enableCircleSubtasks,
        enableBulletSubtasks,
        enableSubtaskStyles: enableBulletSubtasks || enableSquareSubtasks,
        checkboxStyle: checkboxStyles[0] || 'circle',
        setCheckboxStyle,
        bulletStyle: bulletStyles[0] || 'dot',
        setBulletStyle,
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
