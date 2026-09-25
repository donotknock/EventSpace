import React, { useState, useEffect } from 'react';
import { Priority, EventItem, Contact } from '../types';
import { X, Sparkles, Building2, Calendar, Copy, UserCheck, Plus, Check, LayoutTemplate } from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  onCreate: (data: {
    title: string;
    department?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    priority?: Priority | null;
    contactIds?: string[];
  }) => Promise<void>;
  onDuplicate: (
    sourceId: string,
    data: {
      title?: string;
      department?: string;
      startDate?: string;
      endDate?: string;
      priority?: Priority | null;
    }
  ) => Promise<void>;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  onClose,
  events,
  onCreate,
  onDuplicate,
}) => {
  const { enablePriority } = useSettings();
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [priority, setPriority] = useState<Priority | null>('med');
  const [copyFromId, setCopyFromId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<EventItem[]>([]);

  // Contacts (Person in Charge)
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getContacts().then(setAvailableContacts).catch(console.error);
      api.getTemplates().then(setTemplates).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySourceChange = (sourceId: string) => {
    setCopyFromId(sourceId);
    if (sourceId) {
      const src = templates.find((t) => t.id === sourceId) || events.find((e) => e.id === sourceId);
      if (src) {
        if (!title || title.endsWith('(Copy)') || title.endsWith('(Template)')) {
          const cleanName = src.title.replace(' (Template)', '').replace(' (Copy)', '');
          setTitle(`${cleanName}`);
        }
        if (src.department && !department) {
          setDepartment(src.department);
        }
        if (src.startDate) {
          setStartDate(new Date(src.startDate).toISOString().slice(0, 10));
        }
        if (src.endDate && src.endDate !== src.startDate) {
          setEndDate(new Date(src.endDate).toISOString().slice(0, 10));
          setHasEndDate(true);
        } else {
          setEndDate('');
          setHasEndDate(false);
        }
        setPriority(src.priority ?? null);
      }
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
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const finalEndDate = hasEndDate && endDate ? new Date(endDate).toISOString() : undefined;
      const finalStartDate = startDate ? new Date(startDate).toISOString() : undefined;

      if (copyFromId) {
        await onDuplicate(copyFromId, {
          title: title.trim(),
          department: department.trim() || undefined,
          startDate: finalStartDate,
          endDate: finalEndDate,
          priority,
        });
      } else {
        await onCreate({
          title: title.trim(),
          department: department.trim() || undefined,
          startDate: finalStartDate,
          endDate: finalEndDate,
          priority,
          contactIds: selectedContactIds,
        });
      }

      setTitle('');
      setDepartment('');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setHasEndDate(false);
      setCopyFromId('');
      setSelectedContactIds([]);
      onClose();
    } catch (err) {
      console.error('Failed to create/duplicate event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Create New Event
              </h3>
              <p className="text-[11px] text-slate-400">Initialize a new spatial workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Use Template / Existing Event dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
              <span>Use Template / Existing Event (Optional)</span>
            </label>
            <select
              value={copyFromId}
              onChange={(e) => handleCopySourceChange(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Blank New Event --</option>
              {templates.length > 0 && (
                <optgroup label="Saved Templates">
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      📋 {tpl.title} {tpl.department ? `(${tpl.department})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {events.length > 0 && (
                <optgroup label="Existing Events">
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      🗓 {ev.title} {ev.department ? `(${ev.department})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Annual Tech Symposium 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Department / Host</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Faculty of Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Picker Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>End Date</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasEndDate) {
                      setHasEndDate(true);
                      setEndDate(startDate || new Date().toISOString().slice(0, 10));
                    } else {
                      setHasEndDate(false);
                      setEndDate('');
                    }
                  }}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                    hasEndDate
                      ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-950/40'
                      : 'text-blue-600 dark:text-blue-400 hover:underline'
                  }`}
                >
                  {hasEndDate ? 'Clear (One-Day)' : '+ Multi-Day'}
                </button>
              </div>

              <div
                onClick={() => {
                  if (!hasEndDate) {
                    setHasEndDate(true);
                    setEndDate(startDate || new Date().toISOString().slice(0, 10));
                  }
                }}
                className="relative"
              >
                <input
                  type="date"
                  disabled={!hasEndDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full h-12 px-3 rounded-xl border text-xs transition-all ${
                    hasEndDate
                      ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 cursor-pointer opacity-70'
                  }`}
                />
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="min-h-[48px] w-full flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Workspace...' : copyFromId ? 'Duplicate Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
