import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutTemplate,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { EventItem, Priority } from '../types';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { formatEventDate } from '../utils/date';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatesChanged?: () => void;
  onSelectTemplateToCreate?: (templateId: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onTemplatesChanged,
  onSelectTemplateToCreate,
}) => {
  const { enablePriority } = useSettings();
  const [templates, setTemplates] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editTerm, setEditTerm] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editPriority, setEditPriority] = useState<Priority | null>('med');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Deleting state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTemplates = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      // Query events with isTemplate === true, avoiding archived ones
      const data = await api.getEvents({ isTemplate: 'true' });
      setTemplates(data.filter((t) => t.status !== 'archived'));
    } catch (err) {
      console.error('Failed to load templates:', err);
      setErrorMessage('Failed to load templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setEditingTemplateId(null);
      setConfirmDeleteId(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleStartEdit = (tpl: EventItem) => {
    setEditingTemplateId(tpl.id);
    setEditTitle(tpl.title);
    setEditDepartment(tpl.department || '');
    setEditTerm(tpl.term || '');
    setEditYear(tpl.year || '');
    setEditPriority(tpl.priority || 'med');
    setConfirmDeleteId(null);
    setErrorMessage('');
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditTitle('');
    setEditDepartment('');
    setEditTerm('');
    setEditYear('');
    setErrorMessage('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateId) return;
    if (!editTitle.trim()) {
      setErrorMessage('Template title is required');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await api.updateEvent(editingTemplateId, {
        title: editTitle.trim(),
        department: editDepartment.trim() || null,
        term: editTerm.trim() || null,
        year: editYear.trim() || null,
        priority: editPriority,
      });

      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplateId
            ? {
                ...t,
                title: editTitle.trim(),
                department: editDepartment.trim() || null,
                term: editTerm.trim() || null,
                year: editYear.trim() || null,
                priority: editPriority,
              }
            : t
        )
      );

      setEditingTemplateId(null);
      onTemplatesChanged?.();
    } catch (err) {
      console.error('Failed to update template:', err);
      setErrorMessage('Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.deleteEvent(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteId(null);
      onTemplatesChanged?.();
    } catch (err) {
      console.error('Failed to delete template:', err);
      setErrorMessage('Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase().trim();
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.term && t.term.toLowerCase().includes(q)) ||
        (t.year && t.year.toLowerCase().includes(q))
    );
  }, [templates, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Template Management
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                  {templates.length} {templates.length === 1 ? 'Template' : 'Templates'}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Manage, edit metadata, and delete reusable event blueprints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close template modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Actions Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by title, department, term, or year..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              <span className="text-xs font-medium">Loading templates...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center">
                <LayoutTemplate className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  {searchQuery ? 'No templates match your search' : 'No templates saved yet'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try searching with a different term or clear the filter.'
                    : 'To create a template, open any event and select "Save as Template" from the canvas summary card or options.'}
                </p>
              </div>
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const isEditingThis = editingTemplateId === template.id;
              const isConfirmingDelete = confirmDeleteId === template.id;

              return (
                <div
                  key={template.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isEditingThis
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 shadow-md'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {isEditingThis ? (
                    /* Inline Edit Form */
                    <form onSubmit={handleSaveEdit} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editing Template Details</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 text-xs rounded-lg font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="px-3 py-1 text-xs rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Title */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Template Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="e.g. Standard Logistics Blueprint"
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Department */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Department
                          </label>
                          <input
                            type="text"
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            placeholder="e.g. Operations"
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Term */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Term / Season
                          </label>
                          <input
                            type="text"
                            value={editTerm}
                            onChange={(e) => setEditTerm(e.target.value)}
                            placeholder="e.g. Q1, Annual, Fall"
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Year */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Year
                          </label>
                          <input
                            type="text"
                            value={editYear}
                            onChange={(e) => setEditYear(e.target.value)}
                            placeholder="e.g. 2026"
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Priority */}
                        {enablePriority && (
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Default Priority
                            </label>
                            <select
                              value={editPriority || ''}
                              onChange={(e) => setEditPriority((e.target.value as Priority) || null)}
                              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="high">High Priority</option>
                              <option value="med">Medium Priority</option>
                              <option value="low">Low Priority</option>
                              <option value="">None</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </form>
                  ) : (
                    /* Read View */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {template.title}
                          </h4>
                          {enablePriority && template.priority && (
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                                template.priority === 'high'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                  : template.priority === 'med'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {template.priority}
                            </span>
                          )}
                        </div>

                        {/* Metadata Pills */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                          {template.department && (
                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{template.department}</span>
                            </span>
                          )}
                          {template.term && (
                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{template.term}</span>
                            </span>
                          )}
                          {template.year && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {template.year}
                            </span>
                          )}
                          {template._count?.nodes !== undefined && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <CheckSquare className="w-3 h-3" />
                              <span>{template._count.nodes} blocks</span>
                            </span>
                          )}
                          {template._count?.checklists !== undefined && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Layers className="w-3 h-3" />
                              <span>{template._count.checklists} checklists</span>
                            </span>
                          )}
                          {template.createdAt && (
                            <span className="text-[10px] text-slate-400">
                              Created {formatEventDate(template.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-1">
                              Delete?
                            </span>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              disabled={isDeleting}
                              className="px-2 py-1 text-xs rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs rounded-lg font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            {onSelectTemplateToCreate && (
                              <button
                                onClick={() => {
                                  onSelectTemplateToCreate(template.id);
                                  onClose();
                                }}
                                title="Create new event using this template"
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Use</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleStartEdit(template)}
                              title="Edit template details"
                              className="min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setConfirmDeleteId(template.id)}
                              title="Delete template"
                              className="min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <LayoutTemplate className="w-3.5 h-3.5 text-indigo-500" />
            <span>Templates are reusable blueprints with reset tasks & schedules.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
