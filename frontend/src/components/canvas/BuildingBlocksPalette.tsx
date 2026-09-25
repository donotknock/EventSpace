import React, { useState } from 'react';
import { NodeType } from '../../types';
import {
  Boxes,
  CheckSquare,
  Clock,
  Info,
  Mic,
  Camera,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';

interface BuildingBlocksPaletteProps {
  onSpawnNode: (type: NodeType) => void;
}

export const BuildingBlocksPalette: React.FC<BuildingBlocksPaletteProps> = ({
  onSpawnNode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const blocks: {
    type: NodeType;
    name: string;
    description: string;
    icon: React.ReactNode;
    colorClasses: string;
    borderClasses: string;
  }[] = [
    {
      type: 'task',
      name: 'Task Block',
      description: 'Actionable todo with due date',
      icon: <CheckSquare className="w-4 h-4 text-blue-500" />,
      colorClasses: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
      borderClasses: 'border-blue-200 dark:border-blue-800/70',
    },
    {
      type: 'chaser',
      name: 'Chaser Block',
      description: 'Vendor liaison & follow-up',
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      colorClasses: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
      borderClasses: 'border-amber-200 dark:border-amber-800/70',
    },
    {
      type: 'info',
      name: 'Info Block',
      description: 'Meeting notes & briefings',
      icon: <Info className="w-4 h-4 text-emerald-500" />,
      colorClasses: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
      borderClasses: 'border-emerald-200 dark:border-emerald-800/70',
    },
    {
      type: 'audio',
      name: 'Audio Block',
      description: 'Voice notes, audio & transcript',
      icon: <Mic className="w-4 h-4 text-violet-500" />,
      colorClasses: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
      borderClasses: 'border-violet-200 dark:border-violet-800/70',
    },
    {
      type: 'picture',
      name: 'Picture Block',
      description: 'Camera photo / image upload',
      icon: <Camera className="w-4 h-4 text-rose-500" />,
      colorClasses: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
      borderClasses: 'border-rose-200 dark:border-rose-800/70',
    },
  ];

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`absolute top-4 left-4 z-20 transition-all duration-300 select-none ${
        isCollapsed ? 'w-11' : 'w-64 sm:w-72'
      }`}
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-2.5 px-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Building Blocks
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand building blocks palette' : 'Collapse building blocks palette'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Blocks list */}
        {!isCollapsed ? (
          <div className="p-2.5 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1 leading-tight">
              Drag onto canvas or click to add block
            </p>
            {blocks.map((b) => (
              <div
                key={b.type}
                draggable
                onDragStart={(e) => onDragStart(e, b.type)}
                onClick={() => onSpawnNode(b.type)}
                className={`p-2.5 rounded-xl border ${b.borderClasses} ${b.colorClasses} cursor-grab active:cursor-grabbing hover:shadow-md transition-all active:scale-98 flex items-center justify-between gap-2.5 group`}
                title={`Drag or click to spawn ${b.name}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center flex-shrink-0">
                    {b.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs truncate leading-tight">
                      {b.name}
                    </div>
                    <div className="text-[10px] opacity-75 truncate leading-tight">
                      {b.description}
                    </div>
                  </div>
                </div>
                <GripVertical className="w-4 h-4 opacity-40 group-hover:opacity-100 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-1.5 space-y-1.5 flex flex-col items-center">
            {blocks.map((b) => (
              <button
                key={b.type}
                draggable
                onDragStart={(e) => onDragStart(e, b.type)}
                onClick={() => onSpawnNode(b.type)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={`Click or drag to spawn ${b.name}`}
              >
                {b.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
