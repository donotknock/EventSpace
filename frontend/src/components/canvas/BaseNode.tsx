import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import {
  Calendar,
  Trash2,
  CheckCircle2,
  Circle,
  Square,
  CheckSquare,
  Disc,
  Edit3,
  X,
  Check,
  Plus,
  FileText,
} from 'lucide-react';
import { CanvasNodeItem } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface BaseNodeProps {
  id: string;
  data: {
    node: CanvasNodeItem;
    onUpdate: (id: string, updates: Partial<CanvasNodeItem>) => void;
    onDelete: (id: string) => void;
    isLocated?: boolean;
  };
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ReactNode;
  typeName: string;
  selected?: boolean;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  id,
  data,
  accentColor,
  badgeBg,
  badgeText,
  icon,
  typeName,
  selected,
}) => {
  const { node, onUpdate, onDelete } = data;
  const {
    enablePriority,
    enableBulletSubtasks,
    enableCircleSubtasks,
    enableSquareSubtasks,
  } = useSettings();

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(node.title || '');

  // Content editing state
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentText, setContentText] = useState(node.content || '');

  // Date picker state
  const [dateValue, setDateValue] = useState(
    node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : ''
  );

  // Subtask editing & creation state
  const defaultSubtaskStyle: 'bullet' | 'circle' | 'square' = enableCircleSubtasks
    ? 'circle'
    : enableSquareSubtasks
    ? 'square'
    : enableBulletSubtasks
    ? 'bullet'
    : 'circle';

  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const [editingSubtaskDueDate, setEditingSubtaskDueDate] = useState('');
  const [editingSubtaskStyle, setEditingSubtaskStyle] = useState<'bullet' | 'circle' | 'square'>(defaultSubtaskStyle);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskStyle, setNewSubtaskStyle] = useState<'bullet' | 'circle' | 'square'>(defaultSubtaskStyle);

  // Sync state with incoming props
  useEffect(() => {
    setTitleText(node.title || '');
    setContentText(node.content || '');
    setDateValue(node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : '');
  }, [node.title, node.content, node.dueDate]);

  // Parse metadata for subtasks
  let metadataObj: {
    bullets?: string[];
    subtasks?: {
      id: string;
      label: string;
      done: boolean;
      dueDate?: string | null;
      style?: 'bullet' | 'circle' | 'square';
    }[];
  } = {};
  if (node.metadata) {
    try {
      metadataObj = JSON.parse(node.metadata);
    } catch {
      metadataObj = {};
    }
  }

  const handleSaveTitle = () => {
    if (titleText.trim() && titleText !== node.title) {
      onUpdate(id, { title: titleText.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveContent = () => {
    onUpdate(id, { content: contentText.trim() });
    setIsEditingContent(false);
  };

  const handleDateChange = (newDate: string) => {
    setDateValue(newDate);
    if (newDate) {
      onUpdate(id, { dueDate: new Date(newDate).toISOString() });
    } else {
      onUpdate(id, { dueDate: null });
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    if (!metadataObj.subtasks) return;
    const updatedSubtasks = metadataObj.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    const newMetadata = JSON.stringify({ ...metadataObj, subtasks: updatedSubtasks });
    onUpdate(id, { metadata: newMetadata });
  };

  const handleCycleSubtaskStyle = (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!metadataObj.subtasks) return;
    const activeStyles: Array<'circle' | 'square' | 'bullet'> = [];
    if (enableCircleSubtasks) activeStyles.push('circle');
    if (enableSquareSubtasks) activeStyles.push('square');
    if (enableBulletSubtasks) activeStyles.push('bullet');
    if (activeStyles.length <= 1) return;

    const updated = metadataObj.subtasks.map((st) => {
      if (st.id === subtaskId) {
        const currentStyle = (st.style as 'circle' | 'square' | 'bullet') || 'circle';
        const currentIndex = activeStyles.indexOf(currentStyle);
        const nextStyle = activeStyles[(currentIndex + 1) % activeStyles.length] || activeStyles[0];
        return { ...st, style: nextStyle };
      }
      return st;
    });
    onUpdate(id, { metadata: JSON.stringify({ ...metadataObj, subtasks: updated }) });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const currentSubtasks = metadataObj.subtasks || [];
    const isBullet = newSubtaskStyle === 'bullet';
    const updated = [
      ...currentSubtasks,
      {
        id: `st_${Date.now()}`,
        label: newSubtaskText.trim(),
        done: false,
        dueDate: isBullet ? null : (newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : null),
        style: newSubtaskStyle,
      },
    ];
    onUpdate(id, { metadata: JSON.stringify({ ...metadataObj, subtasks: updated }) });
    setNewSubtaskText('');
    setNewSubtaskDueDate('');
    setIsAddingSubtask(false);
  };

  const handleStartEditSubtask = (st: {
    id: string;
    label: string;
    dueDate?: string | null;
    style?: 'bullet' | 'circle' | 'square';
  }) => {
    setEditingSubtaskId(st.id);
    setEditingSubtaskText(st.label);
    setEditingSubtaskDueDate(st.dueDate ? new Date(st.dueDate).toISOString().slice(0, 10) : '');
    setEditingSubtaskStyle(st.style || 'circle');
  };

  const handleSaveSubtaskLabel = (subtaskId: string) => {
    if (!metadataObj.subtasks) return;
    const isBullet = editingSubtaskStyle === 'bullet';
    const updated = metadataObj.subtasks.map((st) =>
      st.id === subtaskId
        ? {
            ...st,
            label: editingSubtaskText.trim() || st.label,
            done: isBullet ? false : st.done,
            dueDate: isBullet ? null : (editingSubtaskDueDate ? new Date(editingSubtaskDueDate).toISOString() : null),
            style: editingSubtaskStyle,
          }
        : st
    );
    onUpdate(id, { metadata: JSON.stringify({ ...metadataObj, subtasks: updated }) });
    setEditingSubtaskId(null);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!metadataObj.subtasks) return;
    const updated = metadataObj.subtasks.filter((st) => st.id !== subtaskId);
    onUpdate(id, { metadata: JSON.stringify({ ...metadataObj, subtasks: updated }) });
  };

  const handleSubtaskDateChange = (subtaskId: string, newDate: string | null) => {
    if (!metadataObj.subtasks) return;
    const updated = metadataObj.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, dueDate: newDate } : st
    );
    onUpdate(id, { metadata: JSON.stringify({ ...metadataObj, subtasks: updated }) });
  };

  const formattedDate = node.dueDate
    ? new Date(node.dueDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const handleColor = useMemo(() => {
    switch (node.type) {
      case 'chaser':
        return '!bg-amber-500 hover:!bg-amber-600 dark:!bg-amber-400';
      case 'info':
        return '!bg-emerald-500 hover:!bg-emerald-600 dark:!bg-emerald-400';
      case 'note':
        return '!bg-violet-500 hover:!bg-violet-600 dark:!bg-violet-400';
      case 'picture':
        return '!bg-rose-500 hover:!bg-rose-600 dark:!bg-rose-400';
      case 'task':
      default:
        return '!bg-blue-500 hover:!bg-blue-600 dark:!bg-blue-400';
    }
  }, [node.type]);

  const handleBaseClasses = `!w-3.5 !h-3.5 ${handleColor} !border-2 !border-white dark:!border-slate-900 shadow-md hover:!scale-125 transition-all duration-200 ${
    selected ? '!opacity-100' : 'opacity-0 group-hover:opacity-100'
  }`;

  const resizerLineColor =
    node.type === 'chaser'
      ? '!border-amber-500'
      : node.type === 'info'
      ? '!border-emerald-500'
      : node.type === 'note'
      ? '!border-violet-500'
      : '!border-blue-500';

  const resizerHandleColor =
    node.type === 'chaser'
      ? '!w-2.5 !h-2.5 !bg-white !border-2 !border-amber-500 !rounded'
      : node.type === 'info'
      ? '!w-2.5 !h-2.5 !bg-white !border-2 !border-emerald-500 !rounded'
      : node.type === 'note'
      ? '!w-2.5 !h-2.5 !bg-white !border-2 !border-violet-500 !rounded'
      : '!w-2.5 !h-2.5 !bg-white !border-2 !border-blue-500 !rounded';

  const locateBrandColor =
    node.type === 'chaser'
      ? '#f59e0b'
      : node.type === 'info'
      ? '#10b981'
      : node.type === 'note'
      ? '#8b5cf6'
      : node.type === 'picture'
      ? '#f43f5e'
      : '#3b82f6';

  return (
    <div
      style={{ '--locate-color': locateBrandColor } as React.CSSProperties}
      className={`group relative w-full h-full min-w-[280px] rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-lg transition-all select-none box-border flex flex-col justify-between ${accentColor} ${
        data.isLocated ? 'animate-locate-highlight ring-4 ring-offset-2 ring-blue-500' : ''
      } ${node.isCompleted ? 'opacity-70 dark:opacity-60' : ''}`}
    >
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={280}
        minHeight={160}
        color={locateBrandColor}
        lineClassName={resizerLineColor}
        handleClassName={`${resizerHandleColor} shadow-md`}
      />

      {/* Exactly 1 Handle per side: Top (target), Left (target), Right (source), Bottom (source) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={handleBaseClasses}
        style={{ left: '50%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={handleBaseClasses}
        style={{ top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={handleBaseClasses}
        style={{ top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={handleBaseClasses}
        style={{ left: '50%' }}
      />

      {/* Node Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 text-slate-600 dark:text-slate-300">
            {icon}
          </div>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeBg} ${badgeText}`}
          >
            {typeName}
          </span>
        </div>

        {/* Right side of header: Direct Native Date Tag and Delete button */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          {/* Direct Native Date Picker Badge (No intermediate popup) */}
          <div
            className="relative inline-flex items-center nodrag nopan"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {formattedDate ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null;
                  if (input) {
                    try {
                      input.showPicker();
                    } catch {
                      input.focus();
                    }
                  }
                }}
                className="relative flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-all cursor-pointer"
              >
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{formattedDate}</span>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => handleDateChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="badge-date-input absolute inset-0 w-full h-full opacity-0 cursor-pointer nodrag nopan z-10"
                  title="Click to change date"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDateChange('');
                  }}
                  className="relative z-20 ml-0.5 p-0.5 text-amber-700/60 dark:text-amber-400/60 hover:text-red-500 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  title="Clear date"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null;
                  if (input) {
                    try {
                      input.showPicker();
                    } catch {
                      input.focus();
                    }
                  }
                }}
                className="relative flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                <span>+ Date</span>
                <input
                  type="date"
                  value=""
                  onChange={(e) => handleDateChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="badge-date-input absolute inset-0 w-full h-full opacity-0 cursor-pointer nodrag nopan z-10"
                  title="Click to set due date"
                />
              </div>
            )}
          </div>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
            title="Delete node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Node Body with internal scrollable container */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-2.5 nodrag">
        {/* Title row */}
        {isEditingTitle ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              autoFocus
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="flex-1 text-lg font-semibold px-2 py-1 rounded-lg border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <button
              onClick={handleSaveTitle}
              className="w-6 h-6 flex items-center justify-center rounded bg-emerald-600 text-white"
              title="Save Title"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEditingTitle(false)}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-1 group/title min-w-0">
            <h4
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-semibold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug break-all [overflow-wrap:anywhere] min-w-0"
              title="Click or double-click to edit title"
            >
              {node.title}
            </h4>
            <Edit3
              onClick={() => setIsEditingTitle(true)}
              className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 cursor-pointer flex-shrink-0 mt-0.5"
            />
          </div>
        )}

        {/* Content text / notes (Double-click or click to edit) */}
        {isEditingContent ? (
          <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <textarea
              autoFocus
              rows={3}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveContent();
                if (e.key === 'Escape') setIsEditingContent(false);
              }}
              placeholder="Enter node notes, details, briefing..."
              className="w-full text-xs p-2 rounded-xl border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none leading-relaxed font-sans"
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => setIsEditingContent(false)}
                className="px-2 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContent}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-sm"
              >
                Save Content
              </button>
            </div>
          </div>
        ) : node.content ? (
          <div
            onDoubleClick={() => setIsEditingContent(true)}
            className="group/content relative text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-all [overflow-wrap:anywhere] min-w-0 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 font-sans text-[11px] cursor-pointer hover:border-blue-300 dark:hover:border-blue-700/60 transition-colors"
            title="Double-click to edit content"
          >
            {node.content}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingContent(true);
              }}
              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white dark:bg-slate-700 shadow-sm text-slate-400 hover:text-blue-500 opacity-0 group-hover/content:opacity-100 transition-opacity"
              title="Edit content"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingContent(true)}
            className="w-full text-left py-1 px-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-3 h-3" />
            <span>+ Add details or notes...</span>
          </button>
        )}

        {/* Embedded Subtasks (with inline editing, add, and delete) */}
        <div className="pt-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Sub-Tasks {metadataObj.subtasks ? `(${metadataObj.subtasks.length})` : ''}
            </span>
            {!isAddingSubtask && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingSubtask(true);
                }}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            )}
          </div>

          {metadataObj.subtasks &&
            metadataObj.subtasks.map((st) => (
              <div
                key={st.id}
                className="group/st flex items-center justify-between gap-1 py-0.5 px-1 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
              >
                {editingSubtaskId === st.id ? (
                  <div
                    className="flex flex-col gap-1.5 flex-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="Subtask label..."
                      value={editingSubtaskText}
                      onChange={(e) => setEditingSubtaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSubtaskLabel(st.id);
                        if (e.key === 'Escape') setEditingSubtaskId(null);
                      }}
                      className="w-full text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      {/* Style selector for editing (Only actively enabled options) */}
                      {(enableCircleSubtasks || enableSquareSubtasks || enableBulletSubtasks) && (
                        <div className="flex items-center gap-1">
                          {enableCircleSubtasks && (
                            <button
                              type="button"
                              onClick={() => setEditingSubtaskStyle('circle')}
                              className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                                editingSubtaskStyle === 'circle'
                                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold'
                                  : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                              title="Circle Checkbox"
                            >
                              <Circle className="w-2.5 h-2.5" /> Circle
                            </button>
                          )}
                          {enableSquareSubtasks && (
                            <button
                              type="button"
                              onClick={() => setEditingSubtaskStyle('square')}
                              className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                                editingSubtaskStyle === 'square'
                                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold'
                                  : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                              title="Square Checkbox"
                            >
                              <Square className="w-2.5 h-2.5" /> Square
                            </button>
                          )}
                          {enableBulletSubtasks && (
                            <button
                              type="button"
                              onClick={() => setEditingSubtaskStyle('bullet')}
                              className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                                editingSubtaskStyle === 'bullet'
                                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold'
                                  : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                              title="Bullet Point"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" /> Bullet
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1 ml-auto">
                        {editingSubtaskStyle !== 'bullet' && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <input
                              type="date"
                              value={editingSubtaskDueDate}
                              onChange={(e) => setEditingSubtaskDueDate(e.target.value)}
                              className="text-[10px] px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            />
                          </div>
                        )}
                        <button
                          onClick={() => handleSaveSubtaskLabel(st.id)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-emerald-600 text-white"
                          title="Save subtask"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingSubtaskId(null)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                  {(() => {
                    let effectiveStyle: 'bullet' | 'circle' | 'square' = st.style || 'circle';
                    if (effectiveStyle === 'bullet' && !enableBulletSubtasks) {
                      effectiveStyle = enableCircleSubtasks ? 'circle' : enableSquareSubtasks ? 'square' : 'circle';
                    } else if (effectiveStyle === 'square' && !enableSquareSubtasks) {
                      effectiveStyle = enableCircleSubtasks ? 'circle' : enableBulletSubtasks ? 'bullet' : 'circle';
                    } else if (effectiveStyle === 'circle' && !enableCircleSubtasks) {
                      effectiveStyle = enableSquareSubtasks ? 'square' : enableBulletSubtasks ? 'bullet' : 'square';
                    }

                    return effectiveStyle === 'bullet' ? (
                      <div className="flex items-start gap-2 text-left min-w-0 flex-1 text-xs">
                        <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                        </div>
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartEditSubtask(st);
                          }}
                          className="text-slate-700 dark:text-slate-300 font-normal break-all [overflow-wrap:anywhere] min-w-0 whitespace-pre-wrap flex-1"
                          title="Double-click to edit note"
                        >
                          {st.label}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubtask(st.id);
                        }}
                        className="flex items-start gap-2 text-left min-w-0 flex-1 text-xs"
                      >
                        {effectiveStyle === 'square' ? (
                          st.done ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          )
                        ) : st.done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartEditSubtask(st);
                          }}
                          className={`break-all [overflow-wrap:anywhere] min-w-0 whitespace-pre-wrap flex-1 ${
                            st.done
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                          title="Double-click to edit"
                        >
                          {st.label}
                        </span>
                      </button>
                    );
                  })()}

                    {/* HTML5 Date Picker for subtask - Right-aligned (Hidden for bullet point notes) */}
                    {st.style !== 'bullet' && (
                      <div
                        className="flex items-center gap-1 flex-shrink-0 ml-auto nodrag nopan"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <label
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-all border ${
                            st.dueDate
                              ? 'font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800'
                              : 'text-slate-400 dark:text-slate-500 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 opacity-60 hover:opacity-100'
                          }`}
                          title="Sub-task due date"
                        >
                          <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                          <input
                            type="date"
                            value={st.dueDate ? new Date(st.dueDate).toISOString().slice(0, 10) : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleSubtaskDateChange(st.id, val ? new Date(val).toISOString() : null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="bg-transparent text-[10px] p-0 border-0 outline-none cursor-pointer w-auto font-inherit text-inherit nodrag nopan"
                            title="Sub-task due date"
                          />
                        </label>
                      </div>
                    )}

                    <div className="flex items-center gap-0.5 opacity-0 group-hover/st:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditSubtask(st);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-500"
                        title="Edit subtask"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubtask(st.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500"
                        title="Delete subtask"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

          {/* Inline Add Subtask input */}
          {isAddingSubtask && (
            <div
              className="flex flex-col gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-blue-400"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                autoFocus
                placeholder="New subtask label..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                  if (e.key === 'Escape') setIsAddingSubtask(false);
                }}
                className="w-full text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <div className="flex items-center justify-between gap-1 flex-wrap">
                {/* Style selector for adding subtask (Only actively enabled options) */}
                {(enableCircleSubtasks || enableSquareSubtasks || enableBulletSubtasks) && (
                  <div className="flex items-center gap-1">
                    {enableCircleSubtasks && (
                      <button
                        type="button"
                        onClick={() => setNewSubtaskStyle('circle')}
                        className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                          newSubtaskStyle === 'circle'
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold'
                            : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Circle Checkbox"
                      >
                        <Circle className="w-2.5 h-2.5" /> Circle
                      </button>
                    )}
                    {enableSquareSubtasks && (
                      <button
                        type="button"
                        onClick={() => setNewSubtaskStyle('square')}
                        className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                          newSubtaskStyle === 'square'
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold'
                            : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Square Checkbox"
                      >
                        <Square className="w-2.5 h-2.5" /> Square
                      </button>
                    )}
                    {enableBulletSubtasks && (
                      <button
                        type="button"
                        onClick={() => setNewSubtaskStyle('bullet')}
                        className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                          newSubtaskStyle === 'bullet'
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold'
                            : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Bullet Point"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" /> Bullet
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1 ml-auto">
                  {newSubtaskStyle !== 'bullet' && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <input
                        type="date"
                        value={newSubtaskDueDate}
                        onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                        title="Optional sub-task due date"
                        className="text-[10px] px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleAddSubtask}
                    className="h-6 px-2.5 flex items-center justify-center rounded bg-blue-600 text-white text-[10px] font-bold shadow-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setIsAddingSubtask(false)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Node Footer details (Assignee / Priority) */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          {node.assignee && (
            <span className="font-medium text-slate-500 dark:text-slate-400">
              👤 {node.assignee}
            </span>
          )}
          {enablePriority && node.priority && (
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {node.priority} priority
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
