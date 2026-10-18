import React, { useState, useEffect, useMemo } from 'react';
import { Priority, EventItem, Contact } from '../types';
import { X, Sparkles, Building2, Calendar, Copy, UserCheck, Plus, Check, LayoutTemplate, Clock, Palette, Search } from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { DateRangePicker } from './DateRangePicker';
import { CustomTimePicker } from './CustomTimePicker';

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  onCreate: (data: {
    title: string;
    department?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    color?: string | null;
    priority?: Priority | null;
    contactIds?: string[];
    includeDefaultChecklists?: boolean;
  }) => Promise<void>;
  onDuplicate: (
    sourceId: string,
    data: {
      title?: string;
      department?: string;
      startDate?: string;
      endDate?: string;
      startTime?: string;
      endTime?: string;
      color?: string;
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
  const [hasDate, setHasDate] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [copyFromId, setCopyFromId] = useState('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<EventItem[]>([]);

  // Strictly filter out archived items and completed events from template and clone selectors
  const availableTemplates = useMemo(
    () => {
      const q = templateSearchQuery.trim().toLowerCase();
      return templates
        .filter((t) => t.status !== 'archived')
        .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.department && t.department.toLowerCase().includes(q)));
    },
    [templates, templateSearchQuery]
  );
  const availableEvents = useMemo(
    () => {
      const q = templateSearchQuery.trim().toLowerCase();
      return events
        .filter((e) => e.status !== 'archived' && !e.isCompleted && !e.isTemplate)
        .filter((e) => !q || e.title.toLowerCase().includes(q) || (e.department && e.department.toLowerCase().includes(q)));
    },
    [events, templateSearchQuery]
  );

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

  const resetForm = () => {
    setTitle('');
    setDepartment('');
    setHasDate(true);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setHasEndDate(false);
    setStartTime('');
    setEndTime('');
    setColor('#3B82F6');
    setPriority(null);
    setCopyFromId('');
    setTemplateSearchQuery('');
    setIsDropdownOpen(false);
    setSelectedContactIds([]);
    setIsAddingContact(false);
    setNewContactName('');
    setNewContactRole('');
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      api.getContacts().then(setAvailableContacts).catch(console.error);
      api.getTemplates().then(setTemplates).catch(console.error);
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleCopySourceChange = (sourceId: string) => {
    setCopyFromId(sourceId);
    if (!sourceId) {
      // Switched back to Blank New Event - completely reset fields
      setTitle('');
      setDepartment('');
      setHasDate(true);
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setHasEndDate(false);
      setStartTime('');
      setEndTime('');
      setColor('#3B82F6');
      setPriority(null);
      return;
    }
    const src = templates.find((t) => t.id === sourceId) || events.find((e) => e.id === sourceId);
    if (src) {
      const cleanName = src.title.replace(' (Template)', '').replace(' (Copy)', '');
      setTitle(`${cleanName}`);
      setDepartment(src.department || '');
      if (src.startDate) {
        setHasDate(true);
        setStartDate(new Date(src.startDate).toISOString().slice(0, 10));
      } else {
        setHasDate(false);
        setStartDate('');
      }
      if (src.endDate && src.endDate !== src.startDate) {
        setEndDate(new Date(src.endDate).toISOString().slice(0, 10));
        setHasEndDate(true);
      } else {
        setEndDate('');
        setHasEndDate(false);
      }
      setStartTime(src.startTime || '');
      setEndTime(src.endTime || '');
      setColor(src.color || '#3B82F6');
      setPriority(src.priority ?? 'med');
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
      const finalStartDate = hasDate && startDate ? new Date(startDate).toISOString() : null;
      const finalEndDate = hasDate && hasEndDate && endDate ? new Date(endDate).toISOString() : null;

      if (copyFromId) {
        await onDuplicate(copyFromId, {
          title: title.trim(),
          department: department.trim() || undefined,
          startDate: finalStartDate || undefined,
          endDate: finalEndDate || undefined,
          startTime: startTime.trim() || undefined,
          endTime: endTime.trim() || undefined,
          color: color.trim() || undefined,
          priority,
        });
      } else {
        await onCreate({
          title: title.trim(),
          department: department.trim() || undefined,
          startDate: finalStartDate,
          endDate: finalEndDate,
          startTime: startTime.trim() || null,
          endTime: endTime.trim() || null,
          color: color.trim() || null,
          priority,
          contactIds: selectedContactIds,
          includeDefaultChecklists: false,
        });
      }

      resetForm();
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
            onClick={handleClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Dynamic Fuzzy Search for Templates & Clones */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
                <span>Search Template / Existing Event</span>
              </label>
              {copyFromId && (
                <button
                  type="button"
                  onClick={() => {
                    handleCopySourceChange('');
                    setTemplateSearchQuery('');
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-medium"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates or existing events..."
                value={templateSearchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setTemplateSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full h-11 pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Dynamic Fuzzy Search Dropdown */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <ul className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <li
                      onClick={() => {
                        handleCopySourceChange('');
                        setTemplateSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between"
                    >
                      <span>-- Blank New Event --</span>
                      {!copyFromId && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </li>

                    {availableTemplates.length > 0 && (
                      <div>
                        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                          Saved Templates
                        </div>
                        {availableTemplates.map((tpl) => (
                          <li
                            key={tpl.id}
                            onClick={() => {
                              handleCopySourceChange(tpl.id);
                              setTemplateSearchQuery(tpl.title);
                              setIsDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white truncate">
                                📋 {tpl.title}
                              </div>
                              {tpl.department && (
                                <div className="text-[10px] text-slate-400 truncate">{tpl.department}</div>
                              )}
                            </div>
                            {copyFromId === tpl.id && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          </li>
                        ))}
                      </div>
                    )}

                    {availableEvents.length > 0 && (
                      <div>
                        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                          Existing Events
                        </div>
                        {availableEvents.map((ev) => (
                          <li
                            key={ev.id}
                            onClick={() => {
                              handleCopySourceChange(ev.id);
                              setTemplateSearchQuery(ev.title);
                              setIsDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white truncate">
                                🗓 {ev.title}
                              </div>
                              {ev.department && (
                                <div className="text-[10px] text-slate-400 truncate">{ev.department}</div>
                              )}
                            </div>
                            {copyFromId === ev.id && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          </li>
                        ))}
                      </div>
                    )}

                    {availableTemplates.length === 0 && availableEvents.length === 0 && (
                      <li className="p-3 text-center text-slate-400 text-xs">
                        No matching templates or events
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
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
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                setHasDate(Boolean(s));
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
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    color === preset
                      ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset }}
                >
                  {color === preset && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
              <div className="relative flex items-center gap-1.5 ml-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
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
