import React, { useState, useEffect, useMemo } from 'react';
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
  MapPin,
  User,
  Copy,
  Table,
  Building2,
  Star,
} from 'lucide-react';
import type { CanvasNodeItem, NodeType, Priority, Subtask } from '../types';
import { ContentWithTables, tsvToMarkdownTable } from '../utils/markdownTable';
import { mobileApi } from '../services/api';
import { CustomDatePicker } from './CustomDatePicker';
import {
  formatDate,
  getStoredDateFormat,
  getStoredPriorityEnabled,
  getStoredCheckboxStyles,
  getStoredBulletStyles,
} from '../utils/date';

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
  onDuplicate?: (node: CanvasNodeItem) => void;
  initialNode?: CanvasNodeItem | null;
  defaultType?: NodeType;
  serverUrl?: string;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDuplicate,
  initialNode,
  defaultType = 'task',
  serverUrl,
}) => {
  const enablePriority = getStoredPriorityEnabled();
  const checkboxStyles = getStoredCheckboxStyles();
  const bulletStyles = getStoredBulletStyles();
  const enabledStyles = useMemo(() => {
    const combined = [...checkboxStyles, ...bulletStyles];
    return combined.length > 0 ? combined : ['circle', 'square', 'dot', 'dash', 'arrow', 'starred'];
  }, [checkboxStyles, bulletStyles]);

  const [type, setType] = useState<NodeType>(defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskStyle, setNewSubtaskStyle] = useState<string>(enabledStyles[0] || 'circle');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Venue logistics fields
  const [location, setLocation] = useState('');
  const [setupTime, setSetupTime] = useState('');
  const [teardownTime, setTeardownTime] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [venuesList, setVenuesList] = useState<any[]>([]);
  const [isAddingNewVenue, setIsAddingNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');

  // Load saved venues if serverUrl is provided
  useEffect(() => {
    if (serverUrl && isOpen) {
      mobileApi.getVenues(serverUrl).then(setVenuesList).catch(() => {});
    }
  }, [serverUrl, isOpen]);

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

          // Load venue fields from metadata
          setLocation(meta.location || '');
          setSetupTime(meta.setupTime || '');
          setTeardownTime(meta.teardownTime || '');
          setContactPerson(meta.contactPerson || '');
        } catch {
          setSubtasks([]);
          setLocation('');
          setSetupTime('');
          setTeardownTime('');
          setContactPerson('');
        }
      } else {
        setSubtasks([]);
        setLocation('');
        setSetupTime('');
        setTeardownTime('');
        setContactPerson('');
      }
    } else {
      setType(defaultType);
      setTitle('');
      setContent('');
      setPriority(null);
      setDueDate(''); // Strictly null/empty by default (No default dates requirement)
      setAssignee('');
      setSubtasks([]);
      setLocation('');
      setSetupTime('');
      setTeardownTime('');
      setContactPerson('');
    }

    setNewSubtaskText('');
    setNewSubtaskStyle(enabledStyles[0] || 'circle');
    setNewSubtaskDueDate('');
    setEditingSubtaskIndex(null);
    setEditingSubtaskText('');
    setIsAddingNewVenue(false);
    setNewVenueName('');
    setError(null);
  }, [initialNode, isOpen, defaultType, enabledStyles]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const isBulletType = ['dot', 'dash', 'arrow', 'starred', 'bullet'].includes(newSubtaskStyle);
    const subtask: Subtask = {
      id: `st-${Date.now()}`,
      text: newSubtaskText.trim(),
      label: newSubtaskText.trim(),
      done: false,
      style: newSubtaskStyle,
      dueDate: isBulletType ? null : (newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : null),
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
        const currentRaw = st.style || 'circle';
        const currentNormalized = currentRaw === 'bullet' ? 'dot' : currentRaw;
        const styleCycle = enabledStyles.length > 0 ? enabledStyles : ['circle', 'square', 'dot', 'dash', 'arrow', 'starred'];
        const curIdx = styleCycle.indexOf(currentNormalized as any);
        const nextStyle = curIdx === -1 ? styleCycle[0] : styleCycle[(curIdx + 1) % styleCycle.length];
        const isBulletType = ['dot', 'dash', 'arrow', 'starred'].includes(nextStyle);
        return {
          ...st,
          style: nextStyle,
          done: isBulletType ? false : st.done,
          dueDate: isBulletType ? null : st.dueDate,
        };
      })
    );
  };

  const renderStyleIcon = (style?: string) => {
    switch (style) {
      case 'square':
        return <Square className="w-3.5 h-3.5 text-blue-500" />;
      case 'dot':
      case 'bullet':
        return <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />;
      case 'dash':
        return <span className="font-bold text-slate-500 text-xs select-none leading-none">—</span>;
      case 'arrow':
        return <span className="font-bold text-slate-500 text-xs select-none leading-none">→</span>;
      case 'starred':
        return <Star className="w-3.5 h-3.5 text-slate-400 fill-current" />;
      case 'circle':
      default:
        return <Circle className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const handleRemoveSubtask = (idx: number) => {
    if (editingSubtaskIndex === idx) {
      setEditingSubtaskIndex(null);
    }
    setSubtasks(subtasks.filter((_, i) => i !== idx));
  };

  const handleCreateInlineVenue = async () => {
    if (!newVenueName.trim() || !serverUrl) return;
    try {
      const created = await mobileApi.createVenue(serverUrl, { name: newVenueName.trim() });
      setVenuesList((prev) => [...prev, created]);
      setLocation(created.name);
      setIsAddingNewVenue(false);
      setNewVenueName('');
    } catch {
      setLocation(newVenueName.trim());
      setIsAddingNewVenue(false);
      setNewVenueName('');
    }
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
      metaObj.subtasks = subtasks.map((st) => {
        const isBulletType = ['dot', 'dash', 'arrow', 'starred', 'bullet'].includes(st.style || '');
        return {
          id: st.id,
          label: st.label || st.text,
          text: st.label || st.text,
          done: isBulletType ? false : Boolean(st.done),
          style: st.style || 'circle',
          dueDate: isBulletType ? null : st.dueDate || null,
        };
      });

      // Venue fields
      if (type === 'venue') {
        metaObj.location = location.trim() || undefined;
        metaObj.setupTime = setupTime || undefined;
        metaObj.teardownTime = teardownTime || undefined;
        metaObj.contactPerson = contactPerson.trim() || undefined;
      }

      metadataStr = JSON.stringify(metaObj);

      await onSave({
        type,
        title: title.trim(),
        content: content.trim() || null,
        priority: enablePriority ? (priority || null) : null,
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
          <div className="flex items-center gap-1.5">
            {initialNode && onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onDuplicate(initialNode);
                  onClose();
                }}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Duplicate this block"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {[
                  { id: 'task', label: 'Task', color: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                  { id: 'chaser', label: 'Chaser', color: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                  { id: 'info', label: 'Info', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  { id: 'venue', label: 'Venue', color: 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
                  { id: 'picture', label: 'Picture', color: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400' },
                  { id: 'audio', label: 'Audio', color: 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400' },
                  { id: 'video', label: 'Video', color: 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400' },
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

          {/* Venue Specific Logistics Fields */}
          {type === 'venue' && (
            <div className="space-y-3 p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
              <div className="flex items-center justify-between">
                <label className="block font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Venue Location</span>
                </label>
                {!isAddingNewVenue && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewVenue(true)}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add new venue</span>
                  </button>
                )}
              </div>

              {isAddingNewVenue ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    placeholder="New venue name..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-xs text-slate-900 dark:text-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateInlineVenue}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewVenue(false)}
                    className="px-2 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={location}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsAddingNewVenue(true);
                    } else {
                      setLocation(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Select or choose location...</option>
                  {venuesList.map((v) => (
                    <option key={v.id || v.name} value={v.name}>
                      {v.name} {v.address ? `(${v.address})` : ''}
                    </option>
                  ))}
                  {location && !venuesList.some((v) => v.name === location) && (
                    <option value={location}>{location} (Custom)</option>
                  )}
                  <option value="__add_new__">+ Add new venue...</option>
                </select>
              )}

              {/* Setup and Teardown Times */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Setup Time</span>
                  </label>
                  <input
                    type="time"
                    value={setupTime}
                    onChange={(e) => setSetupTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Teardown Time</span>
                  </label>
                  <input
                    type="time"
                    value={teardownTime}
                    onChange={(e) => setTeardownTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Contact Person */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px] flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Contact Person</span>
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Venue Manager, Phone #..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Content / Notes with Table Support */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[10px]">
                {type === 'venue' ? 'Venue Notes & Logistics' : 'Details / Description'}
              </label>
              <button
                type="button"
                onClick={() => {
                  const tableTemplate = `\n| Item | Specification | Status |\n| --- | --- | --- |\n| Item 1 | Detail 1 | Ready |\n| Item 2 | Detail 2 | Pending |\n`;
                  setContent((prev) => (prev ? `${prev.trim()}\n${tableTemplate}` : tableTemplate.trim()));
                }}
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Table className="w-3 h-3" />
                <span>+ Insert Table</span>
              </button>
            </div>
            <textarea
              rows={type === 'venue' ? 2 : 4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={(e) => {
                const pasteText = e.clipboardData.getData('text');
                if (pasteText && pasteText.includes('\t') && pasteText.includes('\n')) {
                  const markdown = tsvToMarkdownTable(pasteText);
                  if (markdown) {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const start = target.selectionStart || 0;
                    const end = target.selectionEnd || 0;
                    const updated = content.slice(0, start) + markdown + content.slice(end);
                    setContent(updated);
                  }
                }
              }}
              placeholder={
                type === 'info'
                  ? "Add information or paste spreadsheets (Excel/Sheets)... Use '+ Insert Table' to format."
                  : 'Add additional details, links, or instructions...'
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-mono"
            />

            {/* Table preview if content contains table */}
            {content && content.includes('|') && content.includes('---') && (
              <div className="mt-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Table Preview
                </span>
                <ContentWithTables content={content} />
              </div>
            )}
          </div>

          {/* Subtasks (for Task and Chaser types) */}
          {(type === 'task' || type === 'chaser') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[10px]">
                  Subtasks & Notes ({subtasks.length})
                </label>
                <span className="text-[10px] text-slate-400 italic">
                  Tap style icon to cycle: {enabledStyles.map((s) => s === 'dot' ? 'Solid Dot' : s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')}
                </span>
              </div>

              {/* Subtask list */}
              {subtasks.length > 0 && (
                <div className="space-y-1.5 mb-2.5">
                  {subtasks.map((st, idx) => {
                    const text = st.label || st.text || '';
                    const isBullet = ['bullet', 'dot', 'dash', 'arrow', 'starred'].includes(st.style || '');
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
                          title="Tap to cycle style"
                        >
                          {renderStyleIcon(st.style)}
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

                            {/* Due date */}
                            {st.dueDate && (
                              <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
                                {formatDate(st.dueDate)}
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
                  <div className="flex gap-1 shrink-0 flex-wrap">
                    {enabledStyles.includes('circle') && (
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
                    )}

                    {enabledStyles.includes('square') && (
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
                    )}

                    {(enabledStyles.includes('dot') || enabledStyles.includes('bullet' as any)) && (
                      <button
                        type="button"
                        onClick={() => setNewSubtaskStyle('dot')}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                          newSubtaskStyle === 'dot' || newSubtaskStyle === 'bullet'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>Solid Dot</span>
                      </button>
                    )}

                    {enabledStyles.includes('dash') && (
                      <button
                        type="button"
                        onClick={() => setNewSubtaskStyle('dash')}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                          newSubtaskStyle === 'dash'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="font-bold text-xs leading-none">—</span>
                        <span>Dash</span>
                      </button>
                    )}

                    {enabledStyles.includes('arrow') && (
                      <button
                        type="button"
                        onClick={() => setNewSubtaskStyle('arrow')}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                          newSubtaskStyle === 'arrow'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="font-bold text-xs leading-none">→</span>
                        <span>Arrow</span>
                      </button>
                    )}

                    {enabledStyles.includes('starred') && (
                      <button
                        type="button"
                        onClick={() => setNewSubtaskStyle('starred')}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                          newSubtaskStyle === 'starred'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                        <span>Starred</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    placeholder="New subtask text..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  />

                  <div className="shrink-0">
                    <CustomDatePicker
                      value={newSubtaskDueDate}
                      onChange={(val) => setNewSubtaskDueDate(val || '')}
                      placeholder="+ Date"
                      size="sm"
                      align="right"
                      disabled={['dot', 'dash', 'arrow', 'starred', 'bullet'].includes(newSubtaskStyle)}
                    />
                  </div>

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
          <div className={enablePriority ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
            {enablePriority && (
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
            )}

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 text-[10px]">
                Due Date
              </label>
              <CustomDatePicker
                value={dueDate}
                onChange={(val) => setDueDate(val || '')}
                placeholder="Set due date..."
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
