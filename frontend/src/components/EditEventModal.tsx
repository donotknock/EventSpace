import React, { useState, useEffect, useMemo } from 'react';
import { FullEventDetails, Priority, EventItem, Contact } from '../types';
import {
  X,
  Settings,
  Building2,
  Calendar,
  Trash2,
  AlertTriangle,
  UserCheck,
  Plus,
  LayoutTemplate,
  Check,
  Clock,
  Palette,
  Share2,
  UserPlus,
  UserMinus,
  Shield,
  Loader2,
  LogOut,
  FileSpreadsheet,
  FileText,
  Download,
} from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { exportEventToExcel, exportEventToPdf } from '../utils/exportEvent';
import { formatEventDate, formatTime } from '../utils/date';
import { DateRangePicker } from './DateRangePicker';
import { CustomTimePicker } from './CustomTimePicker';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: FullEventDetails | null;
  onUpdate: (id: string, data: Partial<EventItem> & { contactIds?: string[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLeave?: (id: string) => Promise<void>;
  onTemplateCreated?: () => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onUpdate,
  onDelete,
  onLeave,
  onTemplateCreated,
}) => {
  const { enablePriority } = useSettings();
  const { user: currentUser, workspaces } = useAuth();

  const isOwner = Boolean(
    event &&
    (event.isOwner ?? (!event.workspaceId || workspaces.some((w) => w.id === event.workspaceId)))
  );
  const currentShare = event?.shares?.find((s: any) => s.userId === currentUser?.id);
  const isEditor = isOwner || currentShare?.role === 'editor';
  const isViewer = !isOwner && (currentShare?.role === 'viewer' || currentUser?.role === 'viewer');
  const isSharedUser = !isOwner || Boolean(event?.isShared);

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [priority, setPriority] = useState<Priority | null>('med');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // Event Sharing State
  const [sharesList, setSharesList] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('editor');
  const [isSharing, setIsSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // Contacts (Person in Charge)
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');

  // Department Combobox
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const departmentOptions = useMemo(() => {
    return Array.from(new Set(availableContacts.map((c) => c.department?.trim()).filter(Boolean) as string[]));
  }, [availableContacts]);

  const filteredDepartments = useMemo(() => {
    if (!department) return departmentOptions;
    return departmentOptions.filter((d) => d.toLowerCase().includes(department.toLowerCase()));
  }, [departmentOptions, department]);

  // Granular template options
  const [templateIncludeNodes, setTemplateIncludeNodes] = useState(true);
  const [templateIncludeEdges, setTemplateIncludeEdges] = useState(true);
  const [templateIncludeTasks, setTemplateIncludeTasks] = useState(true);
  const [showTemplateOptions, setShowTemplateOptions] = useState(false);

  const handleSaveAsTemplate = async () => {
    if (!event) return;
    try {
      setIsSavingTemplate(true);
      await api.saveAsTemplate(event.id, {
        includeNodes: templateIncludeNodes,
        includeEdges: templateIncludeEdges,
        includeTasks: templateIncludeTasks,
      });
      setTemplateSaved(true);
      onTemplateCreated?.();
      setTimeout(() => setTemplateSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save as template:', err);
      alert('Failed to save event as template. Please try again.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      api.getContacts().then(setAvailableContacts).catch(console.error);
      api.getUsers().then(setRegisteredUsers).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDepartment(event.department || '');
      setStartDate(
        event.startDate ? new Date(event.startDate).toISOString().slice(0, 10) : ''
      );
      const isMultiDay = Boolean(
        event.endDate &&
        event.startDate &&
        new Date(event.endDate).toDateString() !== new Date(event.startDate).toDateString()
      );
      setHasEndDate(isMultiDay);
      setEndDate(
        event.endDate && isMultiDay
          ? new Date(event.endDate).toISOString().slice(0, 10)
          : ''
      );
      setStartTime(event.startTime || '');
      setEndTime(event.endTime || '');
      setColor(event.color || '#3B82F6');
      setPriority(event.priority ?? null);
      setSelectedContactIds((event.contacts || []).map((c) => c.id));
      setShowDeleteConfirm(false);
    }
  }, [event]);

  const loadShares = async () => {
    if (!event) return;
    try {
      const res = await api.getEventShares(event.id);
      setSharesList(Array.isArray(res) ? res : (res as any).shares || []);
    } catch (err) {
      console.error('Failed to load shares:', err);
    }
  };

  useEffect(() => {
    if (isOpen && event) {
      loadShares();
    }
  }, [isOpen, event]);

  const shareableUsers = registeredUsers.filter(
    (u) => u.id !== currentUser?.id && !sharesList.some((sh) => sh.userId === u.id)
  );

  const handleShareEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !selectedUserId) return;
    setIsSharing(true);
    setShareMsg(null);
    setShareError(null);
    try {
      await api.shareEvent(event.id, {
        userId: selectedUserId,
        role: shareRole,
      });
      const targetUser = registeredUsers.find((u) => u.id === selectedUserId);
      setShareMsg(`Event shared with ${targetUser?.name || targetUser?.username || 'user'} as ${shareRole}!`);
      setSelectedUserId('');
      await loadShares();
    } catch (err: any) {
      setShareError(err.message || 'Failed to share event');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'editor' | 'viewer') => {
    if (!event) return;
    try {
      await api.updateEventShareRole(event.id, userId, newRole);
      await loadShares();
    } catch (err: any) {
      setShareError(err.message || 'Failed to update share role');
    }
  };

  const handleRemoveShare = async (userId: string) => {
    if (!event) return;
    try {
      await api.removeEventShare(event.id, userId);
      await loadShares();
    } catch (err: any) {
      setShareError(err.message || 'Failed to remove share');
    }
  };

  const handleLeaveEvent = async () => {
    if (!event) return;
    if (!window.confirm('Are you sure you want to leave this shared event? It will be removed from your directory.')) {
      return;
    }
    try {
      setIsLeaving(true);
      await api.leaveEvent(event.id);
      if (onLeave) {
        await onLeave(event.id);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to leave event:', err);
      alert(err.message || 'Failed to leave event');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleCreateContact = async () => {
    if (!newContactName.trim()) return;
    try {
      const created = await api.createContact({
        name: newContactName.trim(),
        role: newContactRole.trim() || null,
      });
      setAvailableContacts((prev) => [...prev, created]);
      setSelectedContactIds((prev) => [...prev, created.id]);
      setNewContactName('');
      setNewContactRole('');
      setIsAddingContact(false);
    } catch (err) {
      console.error('Failed to create contact:', err);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onUpdate(event.id, {
        title: title.trim(),
        department: department.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
        startTime: startTime.trim() || null,
        endTime: endTime.trim() || null,
        color: color.trim() || '#3B82F6',
        priority,
        contactIds: selectedContactIds,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    try {
      setIsDeleting(true);
      await onDelete(event.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete event:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Event Settings
              </h3>
              <p className="text-[11px] text-slate-400">Edit details or delete event</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation Banner */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Move "{event?.title || 'Event'}" to Trash?
                </h4>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                  This event and its associated blocks will be moved to the Trash. Connections between blocks will be lost if restored.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="min-h-[44px] flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="min-h-[44px] flex-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/25 disabled:opacity-50"
              >
                {isDeleting ? 'Moving to Trash...' : 'Move to Trash'}
              </button>
            </div>
          </div>
        ) : !isEditor ? (
          /* Strict Read-Only Viewer View: plain text (<p> or <span>), no inputs, selects, or date pickers */
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Title</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">{event?.title || 'Untitled Event'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department / Host</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{event?.department || 'None specified'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</span>
                <p className="text-xs font-semibold mt-0.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    event?.priority === 'high'
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                      : event?.priority === 'low'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  }`}>
                    {(event?.priority || 'Normal').toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Dates</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{formatEventDate(event?.startDate, event?.endDate) || 'Unscheduled'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                  {event?.startTime ? `${formatTime(event.startTime)}${event?.endTime ? ` – ${formatTime(event.endTime)}` : ''}` : 'All Day / Unset'}
                </p>
              </div>
            </div>

            {event?.contacts && event.contacts.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Persons in Charge</span>
                <div className="flex flex-wrap gap-1.5">
                  {event.contacts.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium">
                      <span>👤 {c.name}</span>
                      {c.role && <span className="text-[10px] text-slate-400">({c.role})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Read-Only Export Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => event && exportEventToExcel(event)}
                className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => event && exportEventToPdf(event)}
                className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Export PDF</span>
              </button>
            </div>

            {/* Footer Buttons for Viewer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              {isSharedUser && onLeave && (
                <button
                  type="button"
                  onClick={handleLeaveEvent}
                  disabled={isLeaving}
                  className="min-h-[44px] px-4 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-all"
                >
                  {isLeaving ? 'Leaving...' : 'Leave Event'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] flex-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Editor Form Body */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Department Combobox */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Department / Host</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Faculty of Engineering"
                  value={department}
                  onFocus={() => setIsDeptDropdownOpen(true)}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setIsDeptDropdownOpen(true);
                  }}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {department && (
                  <button
                    type="button"
                    onClick={() => setDepartment('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {isDeptDropdownOpen && filteredDepartments.length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDeptDropdownOpen(false)}
                    />
                    <ul className="absolute top-full left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredDepartments.map((deptName) => (
                        <li
                          key={deptName}
                          onClick={() => {
                            setDepartment(deptName);
                            setIsDeptDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-slate-800 dark:text-slate-200"
                        >
                          <span>{deptName}</span>
                          {department === deptName && (
                            <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            {/* Unified Date Range Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Event Dates (Schedule)</span>
              </label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(s, e) => {
                  setStartDate(s || '');
                  setEndDate(e || '');
                  setHasEndDate(Boolean(e && e !== s));
                }}
              />
            </div>

            {/* Start and End Time Grid with CustomTimePicker */}
            {(() => {
              const isOneDayEvent = Boolean(startDate && (!endDate || startDate === endDate));
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Start Time</span>
                    </label>
                    <CustomTimePicker
                      value={startTime}
                      onChange={(val) => {
                        const newStart = val || '';
                        setStartTime(newStart);
                        if (isOneDayEvent && newStart && endTime && endTime < newStart) {
                          setEndTime(newStart);
                        }
                      }}
                      placeholder="Select start..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>End Time</span>
                    </label>
                    <CustomTimePicker
                      value={endTime}
                      minTime={isOneDayEvent && startTime ? startTime : null}
                      onChange={(val) => {
                        if (isOneDayEvent && startTime && val && val < startTime) {
                          setEndTime(startTime);
                        } else {
                          setEndTime(val || '');
                        }
                      }}
                      placeholder="Select end..."
                    />
                  </div>
                </div>
              );
            })()}

            {/* Custom Event Color Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>Custom Event Color</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {['#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#64748B'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                      color === preset ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset }}
                  >
                    {color === preset && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                    title="Custom Hex Color"
                  />
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{color}</span>
                </div>
              </div>
            </div>

            {/* Person In Charge (Contacts) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Person in Charge (Contacts)</span>
                </label>
                {!isAddingContact && (
                  <button
                    type="button"
                    onClick={() => setIsAddingContact(true)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Assign Contact</span>
                  </button>
                )}
              </div>

              {/* Selected Contacts Pills */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {selectedContactIds.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No person in charge assigned</span>
                ) : (
                  selectedContactIds.map((cid) => {
                    const contact = availableContacts.find((c) => c.id === cid);
                    if (!contact) return null;
                    return (
                      <span
                        key={cid}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200/60 dark:border-blue-900/60"
                      >
                        <span>👤 {contact.name}</span>
                        {contact.role && (
                          <span className="text-[10px] text-blue-500 dark:text-blue-400">
                            ({contact.role})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleContactSelection(cid)}
                          className="hover:text-red-500 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>

              {/* Contact quick selector dropdown & Add Form (Only visible when user explicitly expands picker) */}
              {isAddingContact && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-900 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Contact Assignment
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingContact(false)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:underline flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 transition-colors"
                    >
                      <span>- Hide Picker</span>
                    </button>
                  </div>
                  {availableContacts.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Assign from Directory
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            toggleContactSelection(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200"
                      >
                        <option value="">+ Assign Contact from Directory...</option>
                        {availableContacts
                          .filter((c) => !selectedContactIds.includes(c.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.role ? `— ${c.role}` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className={availableContacts.length > 0 ? "pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2" : "space-y-2"}>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Add Contact to Directory
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Full Name *"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Role (e.g. Lead)"
                        value={newContactRole}
                        onChange={(e) => setNewContactRole(e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingContact(false)}
                        className="text-xs px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateContact}
                        disabled={!newContactName.trim()}
                        className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-50"
                      >
                        Save & Assign
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Priority Indicator (Hidden if priority system is globally disabled) */}
            {enablePriority && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Priority Indicator (Optional)
                  </label>
                  {priority && (
                    <button
                      type="button"
                      onClick={() => setPriority(null)}
                      className="text-[10px] text-slate-400 hover:text-red-500 transition-colors font-medium"
                    >
                      Clear Priority
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority(priority === 'high' ? null : 'high')}
                    className={`min-h-[44px] h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                      priority === 'high'
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/25 ring-2 ring-red-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/30'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    High
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority(priority === 'med' ? null : 'med')}
                    className={`min-h-[44px] h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                      priority === 'med'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Medium
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority(priority === 'low' ? null : 'low')}
                    className={`min-h-[44px] h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                      priority === 'low'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Low
                  </button>
                </div>
              </div>
            )}

            {/* Share Event Section (Owner or Editor Only) */}
            {isEditor && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Share Event & Permissions</span>
                  </label>
                </div>

                {shareMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{shareMsg}</span>
                  </div>
                )}

                {shareError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{shareError}</span>
                  </div>
                )}

                {/* Share dropdown row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white truncate"
                  >
                    <option value="">Select registered user to share...</option>
                    {shareableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} (@${u.username})` : u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                  <select
                    value={shareRole}
                    onChange={(e) => setShareRole(e.target.value as any)}
                    className="sm:w-auto px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleShareEvent}
                    disabled={isSharing || !selectedUserId}
                    className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0 whitespace-nowrap shadow-sm cursor-pointer"
                  >
                    {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Share</span>
                  </button>
                </div>

                {/* Currently Shared Users */}
                {sharesList.length > 0 && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
                    {sharesList.map((sh) => (
                      <div key={sh.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {(sh.user.name || sh.user.username)[0].toUpperCase()}
                          </div>
                          <div className="truncate min-w-0">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                              {sh.user.name ? `${sh.user.name} (${sh.user.username})` : sh.user.username}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={sh.role}
                            onChange={(e) => handleUpdateRole(sh.userId, e.target.value as 'editor' | 'viewer')}
                            className="text-[10px] uppercase font-bold px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-none cursor-pointer"
                            title="Toggle permission level"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveShare(sh.userId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 p-1 rounded-lg transition-colors"
                            title="Revoke access"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Leave Event Action for Shared Users */}
            {isSharedUser && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleLeaveEvent}
                  disabled={isLeaving}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLeaving ? 'Leaving Event...' : 'Leave Event'}</span>
                </button>
              </div>
            )}

            {/* Export Event Section */}
            {event && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Export Event
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => exportEventToExcel(event)}
                    className="min-h-[40px] px-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export to Excel (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportEventToPdf(event)}
                    className="min-h-[40px] px-3 flex items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export to PDF</span>
                  </button>
                </div>
              </div>
            )}

            {/* Save as Template Action (Owners and Editors only) */}
            {isEditor && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Template Creation
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTemplateOptions(!showTemplateOptions)}
                    className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {showTemplateOptions ? 'Hide Options' : 'Configure Options'}
                  </button>
                </div>

                {showTemplateOptions && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={templateIncludeNodes}
                        onChange={(e) => setTemplateIncludeNodes(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Include Canvas Building Blocks & Notes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={templateIncludeEdges}
                        onChange={(e) => setTemplateIncludeEdges(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Include Block Connections & Flow Lines</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={templateIncludeTasks}
                        onChange={(e) => setTemplateIncludeTasks(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Include Top Checklist & Tasks</span>
                    </label>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  disabled={isSavingTemplate}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all disabled:opacity-50"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  <span>{isSavingTemplate ? 'Saving Template...' : templateSaved ? '✓ Saved as Template!' : 'Save as Template'}</span>
                </button>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2 flex items-center gap-2">
              {isEditor ? (
                <>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="min-h-[48px] flex-1 flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving Changes...' : 'Save Settings'}
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="min-w-[48px] min-h-[48px] px-3.5 flex items-center justify-center rounded-2xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900 transition-all"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] flex-1 flex items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                >
                  Close
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
