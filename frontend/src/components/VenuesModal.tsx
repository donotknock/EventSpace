import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  MapPin,
  Clock,
  Phone,
  User,
  FileText,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { Venue } from '../types';
import { api } from '../services/api';

interface VenuesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VenuesModal: React.FC<VenuesModalProps> = ({ isOpen, onClose }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [setupTime, setSetupTime] = useState('');
  const [teardownTime, setTeardownTime] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadVenues = async () => {
    setIsLoading(true);
    try {
      const data = await api.getVenues();
      setVenues(data);
    } catch (err) {
      console.error('Failed to load venues:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVenues();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingVenueId(null);
    setName('');
    setLocation('');
    setSetupTime('');
    setTeardownTime('');
    setContactName('');
    setContactPhone('');
    setNotes('');
    setErrorMessage('');
  };

  const handleStartEdit = (venue: Venue) => {
    setEditingVenueId(venue.id);
    setName(venue.name || '');
    setLocation(venue.location || '');
    setSetupTime(venue.setupTime || '');
    setTeardownTime(venue.teardownTime || '');
    setContactName(venue.contactName || '');
    setContactPhone(venue.contactPhone || '');
    setNotes(venue.notes || '');
    setIsFormOpen(true);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Venue name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (editingVenueId) {
        const updated = await api.updateVenue(editingVenueId, {
          name: name.trim(),
          location: location.trim() || null,
          setupTime: setupTime.trim() || null,
          teardownTime: teardownTime.trim() || null,
          contactName: contactName.trim() || null,
          contactPhone: contactPhone.trim() || null,
          notes: notes.trim() || null,
        });
        setVenues((prev) =>
          prev.map((v) => (v.id === editingVenueId ? updated : v))
        );
      } else {
        const created = await api.createVenue({
          name: name.trim(),
          location: location.trim() || null,
          setupTime: setupTime.trim() || null,
          teardownTime: teardownTime.trim() || null,
          contactName: contactName.trim() || null,
          contactPhone: contactPhone.trim() || null,
          notes: notes.trim() || null,
        });
        setVenues((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save venue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, venueName: string) => {
    if (!confirm(`Are you sure you want to remove "${venueName}" from saved venues?`)) return;
    try {
      await api.deleteVenue(id);
      setVenues((prev) => prev.filter((v) => v.id !== id));
      if (editingVenueId === id) resetForm();
    } catch (err) {
      console.error('Failed to delete venue:', err);
      alert('Failed to delete venue');
    }
  };

  const filteredVenues = venues.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.location && v.location.toLowerCase().includes(q)) ||
      (v.contactName && v.contactName.toLowerCase().includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Workspace Venues</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  {venues.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage reusable venue locations, setup/teardown logistics, and on-site contacts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search venues by name, location, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={() => {
              if (isFormOpen && !editingVenueId) {
                resetForm();
              } else {
                resetForm();
                setIsFormOpen(true);
              }
            }}
            className={`min-h-[40px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
              isFormOpen && !editingVenueId
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isFormOpen && !editingVenueId ? 'Cancel' : 'New Venue'}</span>
          </button>
        </div>

        {/* Modal Body: Split view or Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Add / Edit Form Dropdown */}
          {isFormOpen && (
            <form
              onSubmit={handleSubmit}
              className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3.5 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{editingVenueId ? 'Edit Venue' : 'Create New Venue'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Close
                </button>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grand Ballroom, West Hall..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Location / Address / Room
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. 100 Main St, 2nd Floor, Room 204"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Default Setup Time
                  </label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. 08:00 AM or -2 hours"
                      value={setupTime}
                      onChange={(e) => setSetupTime(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Default Teardown Time
                  </label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. 11:00 PM or +1 hour"
                      value={teardownTime}
                      onChange={(e) => setTeardownTime(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    On-Site Contact Person
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Sarah Miller (Venue Mgr)"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. +1 555-0192"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Logistics / Facilities Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Loading dock access codes, parking info, AV constraints, insurance notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="min-h-[38px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingVenueId ? 'Update Venue' : 'Save Venue'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Venues Grid */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading saved venues...</span>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {searchQuery ? 'No matching venues found' : 'No saved venues yet'}
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Save common event spaces, ballrooms, and auditoriums to instantly autofill venue blocks on your canvas.
              </p>
              {!isFormOpen && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm hover:bg-indigo-500"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Venue</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredVenues.map((venue) => (
                <div
                  key={venue.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-xs flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {venue.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(venue)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                          title="Edit Venue"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(venue.id, venue.name)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors"
                          title="Delete Venue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {venue.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{venue.location}</span>
                      </div>
                    )}

                    {(venue.setupTime || venue.teardownTime) && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {venue.setupTime && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Setup: {venue.setupTime}
                          </span>
                        )}
                        {venue.teardownTime && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Teardown: {venue.teardownTime}
                          </span>
                        )}
                      </div>
                    )}

                    {venue.contactName && (
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {venue.contactName}
                        </span>
                        {venue.contactPhone && (
                          <span className="flex items-center gap-1 text-slate-400">
                            • {venue.contactPhone}
                          </span>
                        )}
                      </div>
                    )}

                    {venue.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 italic pt-0.5">
                        "{venue.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
