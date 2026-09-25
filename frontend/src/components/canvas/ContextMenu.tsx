import React, { useEffect, useRef } from 'react';
import { NodeType } from '../../types';
import { CheckSquare, Clock, Info, Mic, Camera, Sparkles } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelect: (type: NodeType) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onSelect,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust positioning so menu doesn't overflow screen
  const menuWidth = 220;
  const menuHeight = 260;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 20);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 20);

  const items: {
    type: NodeType;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      type: 'task',
      label: 'Task Block',
      description: 'Actionable todo with due date',
      icon: <CheckSquare className="w-4 h-4 text-blue-500" />,
      color: 'hover:bg-blue-50 dark:hover:bg-blue-950/50',
    },
    {
      type: 'chaser',
      label: 'Chaser Block',
      description: 'Vendor liaison & chasers',
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      color: 'hover:bg-amber-50 dark:hover:bg-amber-950/50',
    },
    {
      type: 'info',
      label: 'Info Block',
      description: 'Meeting notes & briefing',
      icon: <Info className="w-4 h-4 text-emerald-500" />,
      color: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/50',
    },
    {
      type: 'audio',
      label: 'Audio Block',
      description: 'Voice note & transcript',
      icon: <Mic className="w-4 h-4 text-violet-500" />,
      color: 'hover:bg-violet-50 dark:hover:bg-violet-950/50',
    },
    {
      type: 'picture',
      label: 'Picture Block',
      description: 'Camera photo / image upload',
      icon: <Camera className="w-4 h-4 text-rose-500" />,
      color: 'hover:bg-rose-50 dark:hover:bg-rose-950/50',
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 animate-fadeIn select-none"
    >
      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Spawn Building Block
        </span>
      </div>

      <div className="space-y-0.5">
        {items.map((item) => (
          <button
            key={item.type}
            onClick={() => {
              onSelect(item.type);
              onClose();
            }}
            className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left transition-colors active:scale-98 ${item.color}`}
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {item.label}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
