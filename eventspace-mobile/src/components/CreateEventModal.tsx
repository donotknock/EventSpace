import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Layers, AlertCircle, Loader2, UserCheck } from 'lucide-react';
import type { EventItem, Priority } from '../types';
import { mobileApi } from '../services/api';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: EventItem) => void;
  serverUrl: string;
  existingEvents: EventItem[];
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  serverUrl,
  existingEvents,
}) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [templates, setTemplates] = useState<EventItem[]>([]);
  const [availableContacts, setAvailableContacts] = useState<
    Array<{ id: string; name: string; email?: string | null; phone?: string | null; role?: string | null }>
  >([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);

  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if priority is globally enabled
  const enablePriority = localStorage.getItem('eventspace_enable_priority') !== 'false';

  // Load templates & contacts when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsLoadingTemplates(true);
    mobileApi
      .getTemplates(serverUrl)
      .then((res) => setTemplates(res))
      .catch((err) => console.warn('Could not load templates in mobile app:', err))
      .finally(() => setIsLoadingTemplates(false));

    mobileApi
      .getContacts(serverUrl)
      .then((res) => setAvailableContacts(res))
      .catch((err) => console.warn('Could not load contacts in mobile app:', err));
  }, [isOpen, serverUrl]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDepartment('');
      setStartDate('');
      setEndDate('');
      setPriority('');
      setSelectedTemplateId('');
      setSelectedContactIds([]);
      setIsAddingContact(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an event title');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      department: department.trim() || null,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      priority: enablePriority && priority ? (priority as Priority) : null,
      contactIds: selectedContactIds.length > 0 ? selectedContactIds : undefined,
    };

    try {
      let created: EventItem;
      if (selectedTemplateId) {
        created = await mobileApi.duplicateEvent(serverUrl, selectedTemplateId, payload);
      } else {
        created = await mobileApi.createEvent(serverUrl, payload);
      }
      onCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create event:', err);
      setError(err.message || 'Failed to create event. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">New Event</h2>
              <p className="text-[11px] text-slate-400">Initialize a canvas workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Event Title */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Annual Tech Symposium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
            />
          </div>

          {/* Template or Clone Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Use Template / Existing Event</span>
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Start with blank canvas</option>
              {templates.length > 0 && (
                <optgroup label="Saved Templates">
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      📁 {tpl.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {existingEvents.length > 0 && (
                <optgroup label="Existing Events">
                  {existingEvents
                    .filter((ev) => !ev.isTemplate)
                    .map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        🗓️ {ev.title}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Department
            </label>
            <input
              type="text"
              placeholder="e.g. Operations, Logistics, Marketing"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Person In Charge (Contacts) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
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
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
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
                        onClick={() => setSelectedContactIds((prev) => prev.filter((id) => id !== cid))}
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
                          const val = e.target.value;
                          setSelectedContactIds((prev) =>
                            prev.includes(val) ? prev.filter((id) => id !== val) : [...prev, val]
                          );
                          e.target.value = '';
                        }
                      }}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      <option value="">+ Assign Contact from Directory...</option>
                      {availableContacts
                        .filter((c) => !selectedContactIds.includes(c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.role ? `(${c.role})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Priority (Only if enabled) */}
          {enablePriority && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: '', label: 'None' },
                  { id: 'low', label: 'Low' },
                  { id: 'med', label: 'Medium' },
                  { id: 'high', label: 'High' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPriority(item.id as Priority | '')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      priority === item.id
                        ? item.id === 'high'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : item.id === 'med'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : item.id === 'low'
                          ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
