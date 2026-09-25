import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: FullEventDetails | null;
  onUpdate: (id: string, data: Partial<EventItem> & { contactIds?: string[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTemplateCreated?: () => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onUpdate,
  onDelete,
  onTemplateCreated,
}) => {
  const { enablePriority } = useSettings();
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [priority, setPriority] = useState<Priority | null>('med');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // Contacts (Person in Charge)
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');

  const handleSaveAsTemplate = async () => {
    if (!event) return;
    try {
      setIsSavingTemplate(true);
      await api.saveAsTemplate(event.id);
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
      setPriority(event.priority ?? null);
      setSelectedContactIds((event.contacts || []).map((c) => c.id));
      setShowDeleteConfirm(false);
    }
  }, [event]);

  if (!isOpen || !event) return null;

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
      await onUpdate(event.id, {
        title: title.trim(),
        department: department.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
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
                  Move "{event.title}" to Trash?
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
        ) : (
          /* Form Body */
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
                className="w-full h-12 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Department / Host</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Save as Template Action */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
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

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="min-h-[48px] flex-1 flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Settings'}
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="min-w-[48px] min-h-[48px] px-3.5 flex items-center justify-center rounded-2xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900 transition-all"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
