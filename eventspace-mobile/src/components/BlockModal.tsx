import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Calendar,
  AlertCircle,
  FileText,
  CheckSquare,
  HelpCircle,
  Clock,
  Plus,
  Trash2,
  Circle,
  Square,
  List,
  Edit3,
} from 'lucide-react';
import type { CanvasNodeItem, NodeType, Priority, Subtask } from '../types';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    type: NodeType;
    title: string;
    content?: string | null;
    priority?: Priority | null;
    dueDate?: string | null;
    assignee?: string | null;
    metadata?: string | null;
  }) => Promise<void>;
  initialNode?: CanvasNodeItem | null;
  defaultType?: NodeType;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNode,
  defaultType = 'task',
}) => {
  const [type, setType] = useState<NodeType>(defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskStyle, setNewSubtaskStyle] = useState<'circle' | 'square' | 'bullet'>('circle');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever initialNode or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialNode) {
      setType(initialNode.type || defaultType);
      setTitle(initialNode.title || '');
      setContent(initialNode.content || '');
      setPriority(initialNode.priority || null);
      setDueDate(
        initialNode.dueDate ? new Date(initialNode.dueDate).toISOString().slice(0, 10) : ''
      );
      setAssignee(initialNode.assignee || '');

      if (initialNode.metadata) {
        try {
          const meta = JSON.parse(initialNode.metadata);
          if (Array.isArray(meta.subtasks)) {
            setSubtasks(
              meta.subtasks.map((st: any) => ({
                id: st.id || `st-${Math.random().toString(36).slice(2, 9)}`,
                text: st.label || st.text || '',
                label: st.label || st.text || '',
                done: Boolean(st.done),
                style: st.style || 'circle',
                dueDate: st.dueDate || null,
              }))
            );
          } else {
            setSubtasks([]);
          }
        } catch {
          setSubtasks([]);
        }
      } else {
        setSubtasks([]);
      }
    } else {
      setType(defaultType);
      setTitle('');
      setContent('');
      setPriority(null);
      setDueDate('');
      setAssignee('');
      setSubtasks([]);
    }

    setNewSubtaskText('');
    setNewSubtaskStyle('circle');
    setNewSubtaskDueDate('');
    setEditingSubtaskIndex(null);
    setEditingSubtaskText('');
    setError(null);
  }, [initialNode, isOpen, defaultType]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const isBullet = newSubtaskStyle === 'bullet';
    const subtask: Subtask = {
      id: `st-${Date.now()}`,
      text: newSubtaskText.trim(),
      label: newSubtaskText.trim(),
      done: false,
      style: newSubtaskStyle,
      dueDate: isBullet ? null : (newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : null),
    };
    setSubtasks([...subtasks, subtask]);
    setNewSubtaskText('');
    setNewSubtaskDueDate('');
  };

  const handleStartEditSubtask = (idx: number, currentText: string) => {
    setEditingSubtaskIndex(idx);
    setEditingSubtaskText(currentText);
  };

  const handleSaveEditSubtask = (idx: number) => {
    if (!editingSubtaskText.trim()) {
      setEditingSubtaskIndex(null);
      return;
    }
    setSubtasks(
      subtasks.map((st, i) => {
        if (i !== idx) return st;
        return {
          ...st,
          text: editingSubtaskText.trim(),
          label: editingSubtaskText.trim(),
        };
      })
    );
    setEditingSubtaskIndex(null);
    setEditingSubtaskText('');
  };

  const handleCycleSubtaskStyle = (idx: number) => {
    setSubtasks(
      subtasks.map((st, i) => {
        if (i !== idx) return st;
        const currentStyle = st.style || 'circle';
        const nextStyle: 'circle' | 'square' | 'bullet' =
          currentStyle === 'circle' ? 'square' : currentStyle === 'square' ? 'bullet' : 'circle';
        return {
          ...st,
          style: nextStyle,
          done: nextStyle === 'bullet' ? false : st.done,
          dueDate: nextStyle === 'bullet' ? null : st.dueDate,
        };
      })
    );
  };

  const handleRemoveSubtask = (idx: number) => {
    if (editingSubtaskIndex === idx) {
      setEditingSubtaskIndex(null);
    }
    setSubtasks(subtasks.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let metadataStr: string | null = initialNode?.metadata || null;
      let metaObj: any = {};
      try {
        if (metadataStr) metaObj = JSON.parse(metadataStr);
      } catch {}

      // Normalize subtasks for cross-platform compatibility
      metaObj.subtasks = subtasks.map((st) => ({
        id: st.id,
        label: st.label || st.text,
        text: st.label || st.text,
        done: st.style === 'bullet' ? false : Boolean(st.done),
        style: st.style || 'circle',
        dueDate: st.style === 'bullet' ? null : st.dueDate || null,
      }));

      metadataStr = JSON.stringify(metaObj);

      await onSave({
        type,
        title: title.trim(),
        content: content.trim() || null,
        priority: priority || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignee: assignee.trim() || null,
        metadata: metadataStr,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save block');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 animate-slideUp text-slate-900 dark:text-white safe-bottom shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold">
            {initialNode ? 'Edit Building Block' : 'Create Building Block'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Block Type Picker (only when creating) */}
          {!initialNode && (
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">
                Block Type
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'task', label: 'Task', color: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                  { id: 'chaser', label: 'Chaser', color: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                  { id: 'info', label: 'Info', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  { id: 'audio', label: 'Audio', color: 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400' },
                  { id: 'picture', label: 'Picture', color: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setType(item.id as NodeType)}
                    className={`py-2 px-1 rounded-xl border text-center font-bold text-[11px] transition-all ${
                      type === item.id
                        ? `${item.color} shadow-sm`
                        : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px]">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Finalize Stage Lighting"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white"
            />
          </div>

          {/* Content / Notes */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px]">
              Details / Description
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add additional details, links, or instructions..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white"
            />
          </div>

          {/* Subtasks (for Task and Chaser types) */}
          {(type === 'task' || type === 'chaser') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[10px]">
                  Subtasks & Notes ({subtasks.length})
                </label>
                <span className="text-[10px] text-slate-400 italic">
                  Tap style icon to cycle: Circle / Square / Bullet
                </span>
              </div>

              {/* Subtask list */}
              {subtasks.length > 0 && (
                <div className="space-y-1.5 mb-2.5">
                  {subtasks.map((st, idx) => {
                    const text = st.label || st.text || '';
                    const isBullet = st.style === 'bullet';
                    return (
                      <div
                        key={st.id || idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
                      >
                        {/* Style toggle button */}
                        <button
                          type="button"
                          onClick={() => handleCycleSubtaskStyle(idx)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 hover:border-blue-500 text-slate-600 dark:text-slate-300"
                          title="Cycle subtask style: Circle / Square / Bullet"
                        >
                          {st.style === 'square' ? (
                            <Square className="w-3.5 h-3.5 text-blue-500" />
                          ) : st.style === 'bullet' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </button>

                        {editingSubtaskIndex === idx ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                              type="text"
                              value={editingSubtaskText}
                              onChange={(e) => setEditingSubtaskText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditSubtask(idx);
                                } else if (e.key === 'Escape') {
                                  setEditingSubtaskIndex(null);
                                }
                              }}
                              className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-500 text-xs text-slate-900 dark:text-white focus:outline-none ring-1 ring-blue-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditSubtask(idx)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500 shrink-0"
                              title="Save subtask text"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSubtaskIndex(null)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              onClick={() => handleStartEditSubtask(idx, text)}
                              className={`text-xs flex-1 truncate cursor-pointer hover:text-blue-500 transition-colors ${
                                isBullet ? 'text-slate-700 dark:text-slate-300 font-normal' : 'font-medium'
                              }`}
                              title="Tap to edit subtask text"
                            >
                              {text}
                            </span>

                            {/* Due date if not bullet */}
                            {!isBullet && st.dueDate && (
                              <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
                                {new Date(st.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStartEditSubtask(idx, text)}
                              className="text-slate-400 hover:text-blue-500 p-1 transition-colors"
                              title="Edit subtask"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveSubtask(idx)}
                              className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                              title="Delete subtask"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add subtask input row */}
              <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5">
                  {/* Style selector chips */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setNewSubtaskStyle('circle')}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                        newSubtaskStyle === 'circle'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Circle className="w-3 h-3" />
                      <span>Circle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewSubtaskStyle('square')}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                        newSubtaskStyle === 'square'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Square className="w-3 h-3" />
                      <span>Square</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewSubtaskStyle('bullet')}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                        newSubtaskStyle === 'bullet'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>Bullet Note</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder={newSubtaskStyle === 'bullet' ? 'Add a bullet list note...' : 'Add a checkable subtask...'}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  />

                  {/* Due date picker hidden if bullet style */}
                  {newSubtaskStyle !== 'bullet' && (
                    <input
                      type="date"
                      value={newSubtaskDueDate}
                      onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                      className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      title="Optional subtask due date"
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-40 shadow-sm shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px]">
                Priority
              </label>
              <div className="flex gap-1">
                {(['high', 'med', 'low'] as Priority[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(priority === p ? null : p)}
                    className={`flex-1 py-1.5 rounded-lg border font-bold uppercase text-[10px] transition-all ${
                      priority === p
                        ? p === 'high'
                          ? 'bg-rose-500 text-white border-rose-500'
                          : p === 'med'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-blue-500 text-white border-blue-500'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px]">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px]">
              Assignee / PIC
            </label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="e.g., Clara or Audio Tech"
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialNode ? 'Update Block' : 'Create Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
