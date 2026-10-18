import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import {
  Building2,
  MapPin,
  Clock,
  Trash2,
  Calendar,
  Edit3,
  Check,
  X,
  CheckCircle2,
  Circle,
  FileText,
  User,
  Copy,
  Plus,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { CanvasNodeItem } from '../../types';
import { api } from '../../services/api';
import { formatMonthDay } from '../../utils/date';
import { CustomDatePicker } from '../CustomDatePicker';
import { CustomTimePicker } from '../CustomTimePicker';
import { triggerAgendaRefresh } from '../../utils/agendaEvents';

interface VenueMetadata {
  location?: string;
  startTime?: string;
  endTime?: string;
  setupTime?: string;
  teardownTime?: string;
  contactPerson?: string;
  notes?: string;
  width?: number;
  height?: number;
}

export const VenueNode: React.FC<NodeProps> = (props) => {
  const nodeData = props.data as unknown as {
    node: CanvasNodeItem;
    onUpdate: (id: string, updates: Partial<CanvasNodeItem>) => void;
    onDelete: (id: string) => void;
    onDuplicate?: (id: string) => void;
    isLocated?: boolean;
    isReadOnly?: boolean;
  };

  const { node, onUpdate, onDelete, onDuplicate } = nodeData;
  const isReadOnly = Boolean(nodeData.isReadOnly);

  // Saved venues list & inline add state
  const [venuesList, setVenuesList] = useState<any[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [isAddingNewVenue, setIsAddingNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(node.title || 'Venue & Logistics');

  // Date picker state
  const [dateValue, setDateValue] = useState(
    node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : ''
  );

  // Parse metadata
  let metadataObj: VenueMetadata = {};
  try {
    if (node.metadata) {
      metadataObj = JSON.parse(node.metadata);
    }
  } catch {
    metadataObj = {};
  }

  const [location, setLocation] = useState(metadataObj.location || '');
  const [startTime, setStartTime] = useState(metadataObj.startTime || '');
  const [endTime, setEndTime] = useState(metadataObj.endTime || '');
  const [setupTime, setSetupTime] = useState(metadataObj.setupTime || '');
  const [teardownTime, setTeardownTime] = useState(metadataObj.teardownTime || '');
  const [contactPerson, setContactPerson] = useState(metadataObj.contactPerson || '');
  const [notes, setNotes] = useState(node.content || metadataObj.notes || '');

  // Load saved venues and contacts directory
  useEffect(() => {
    api.getVenues().then(setVenuesList).catch(console.error);
    api.getContacts().then(setContactsList).catch(console.error);
  }, []);

  // Keep local states synced with node
  useEffect(() => {
    setTitleText(node.title || 'Venue & Logistics');
    setDateValue(node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : '');

    try {
      if (node.metadata) {
        const parsed: VenueMetadata = JSON.parse(node.metadata);
        setLocation(parsed.location || '');
        setStartTime(parsed.startTime || '');
        setEndTime(parsed.endTime || '');
        setSetupTime(parsed.setupTime || '');
        setTeardownTime(parsed.teardownTime || '');
        setContactPerson(parsed.contactPerson || '');
        setNotes(node.content || parsed.notes || '');
      }
    } catch {
      // ignore
    }
  }, [node.title, node.dueDate, node.metadata, node.content]);

  const updateMetaField = (fields: Partial<VenueMetadata>, newContent?: string) => {
    const updated: VenueMetadata = {
      ...metadataObj,
      location,
      startTime,
      endTime,
      setupTime,
      teardownTime,
      contactPerson,
      notes,
      ...fields,
    };
    onUpdate(props.id, {
      metadata: JSON.stringify(updated),
      ...(newContent !== undefined ? { content: newContent } : {}),
    });
  };

  const handleSaveTitle = () => {
    onUpdate(props.id, { title: titleText.trim() || 'Venue & Logistics' });
    setIsEditingTitle(false);
  };

  const handleDateChange = (newDate: string) => {
    setDateValue(newDate);
    if (newDate) {
      onUpdate(props.id, { dueDate: new Date(newDate).toISOString() });
    } else {
      onUpdate(props.id, { dueDate: null });
    }
    triggerAgendaRefresh();
  };

  const formattedDate = node.dueDate ? formatMonthDay(node.dueDate) : null;

  // Single dot per side styling (purple brand)
  const handleBaseClasses = `!w-3.5 !h-3.5 !bg-purple-500 hover:!bg-purple-600 dark:!bg-purple-400 !border-2 !border-white dark:!border-slate-900 shadow-md hover:!scale-125 transition-all duration-200 -translate-x-1/2 -translate-y-1/2 ${
    isReadOnly
      ? '!pointer-events-none !opacity-0'
      : props.selected
      ? '!opacity-100'
      : 'opacity-0 group-hover:opacity-100'
  }`;

  return (
    <div
      style={{ '--locate-color': '#a855f7' } as React.CSSProperties}
      className={`group relative w-full h-full min-w-[300px] min-h-[290px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-purple-500/60 dark:border-purple-500/50 hover:border-purple-500 shadow-lg shadow-purple-500/10 transition-all select-none box-border flex flex-col justify-between ${
        nodeData.isLocated ? 'animate-locate-highlight ring-4 ring-offset-2 ring-purple-500' : ''
      } ${node.isCompleted ? 'opacity-50' : ''}`}
    >
      <NodeResizer
        isVisible={Boolean(props.selected) && !isReadOnly}
        minWidth={300}
        minHeight={290}
        color="#a855f7"
        lineClassName="!border-purple-500"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-purple-500 !rounded shadow-md"
        onResizeEnd={(_, params) => {
          let meta: any = {};
          try {
            meta = JSON.parse(node.metadata || '{}');
          } catch {}
          onUpdate(props.id, {
            metadata: JSON.stringify({
              ...meta,
              width: Math.round(params.width),
              height: Math.round(params.height),
            }),
          });
        }}
      />

      {/* 4 Cardinal Handles: Top, Right, Bottom, Left (Omnidirectional in loose mode) */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={!isReadOnly}
        className={handleBaseClasses}
        style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        isConnectable={!isReadOnly}
        className="!w-0 !h-0 !opacity-0 !pointer-events-none !border-0"
        style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={!isReadOnly}
        className={handleBaseClasses}
        style={{ top: '50%', left: '100%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        isConnectable={!isReadOnly}
        className="!w-0 !h-0 !opacity-0 !pointer-events-none !border-0"
        style={{ top: '50%', left: '100%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={!isReadOnly}
        className={handleBaseClasses}
        style={{ top: '100%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        isConnectable={!isReadOnly}
        className="!w-0 !h-0 !opacity-0 !pointer-events-none !border-0"
        style={{ top: '100%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={!isReadOnly}
        className={handleBaseClasses}
        style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        isConnectable={!isReadOnly}
        className="!w-0 !h-0 !opacity-0 !pointer-events-none !border-0"
        style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)' }}
      />

      {/* Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {!isReadOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(props.id, { isCompleted: !node.isCompleted });
                triggerAgendaRefresh();
              }}
              className={`w-5 h-5 flex items-center justify-center rounded-md transition-all nodrag nopan ${
                node.isCompleted
                  ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={node.isCompleted ? 'Mark Block Incomplete' : 'Mark Block Complete'}
            >
              {node.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>
          )}
          <div className="flex-shrink-0 text-purple-600 dark:text-purple-400">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
            Venue
          </span>
        </div>

        {/* Right side: 1. Duplicate & Delete (hover only), 2. Date (conditional visibility) */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          {/* Action buttons inside hover-only wrapper */}
          <div className="flex items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150">
            {/* 1. Duplicate block */}
            {!isReadOnly && onDuplicate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(props.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all"
                title="Duplicate block"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 2. Delete block */}
            {!isReadOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(props.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
                title="Delete node"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 3. Date picker badge at far right */}
          <div
            className={`nodrag nopan order-last ${
              dateValue
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-opacity duration-150'
            }`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CustomDatePicker
              value={dateValue}
              onChange={(newDate) => handleDateChange(newDate || '')}
              placeholder="+ Date"
              size="sm"
              align="right"
              disabled={isReadOnly}
              buttonClassName={
                dateValue
                  ? 'h-6 px-2 text-[11px] font-bold rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  : 'h-6 px-1.5 text-[10px] font-semibold rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700'
              }
            />
          </div>
        </div>
      </div>

      {/* Node Body with internal scrollable container */}
      <div
        className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-3 nodrag nowheel"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Title row */}
        {isEditingTitle && !isReadOnly ? (
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
              className="flex-1 text-lg font-semibold px-2 py-1 rounded-lg border border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <button
              onClick={handleSaveTitle}
              className="w-6 h-6 flex items-center justify-center rounded bg-teal-600 text-white"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEditingTitle(false)}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-1 group/title min-w-0">
            <h4
              onDoubleClick={() => !isReadOnly && setIsEditingTitle(true)}
              className={`text-lg font-semibold transition-colors leading-snug break-words min-w-0 ${
                isReadOnly ? 'cursor-default' : 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400'
              } ${
                node.isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
              title={isReadOnly ? undefined : "Double-click to edit title"}
            >
              {node.title || 'Venue & Logistics'}
            </h4>
            {!isReadOnly && (
              <Edit3
                onClick={() => setIsEditingTitle(true)}
                className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 cursor-pointer flex-shrink-0 mt-0.5"
              />
            )}
          </div>
        )}

        {/* Dedicated Logistics Fields */}
        <div className="space-y-2.5 bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
          {/* Location Dropdown menu */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="relative flex-1 min-w-0">
                {isReadOnly ? (
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 py-1 truncate">
                    {location || 'No venue specified'}
                  </p>
                ) : (
                  <>
                    <select
                      value={location}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW_VENUE__') {
                          setIsAddingNewVenue(true);
                        } else {
                          setLocation(val);
                          updateMetaField({ location: val });
                        }
                      }}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium appearance-none cursor-pointer pr-8"
                    >
                      <option value="">Select a saved venue...</option>
                      {location && !venuesList.some((v) => v.name === location) && (
                        <option value={location}>{location}</option>
                      )}
                      {venuesList.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                      <option value="__ADD_NEW_VENUE__" className="font-bold text-indigo-600 dark:text-indigo-400">
                        + Add new venue
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Inline Add New Venue modal / input */}
            {!isReadOnly && isAddingNewVenue && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  autoFocus
                  placeholder="New venue name..."
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!newVenueName.trim()) return;
                      try {
                        const created = await api.createVenue({ name: newVenueName.trim() });
                        setVenuesList((prev) => [...prev, created]);
                        setLocation(created.name);
                        updateMetaField({ location: created.name });
                        setNewVenueName('');
                        setIsAddingNewVenue(false);
                      } catch (err) {
                        console.error('Failed to create venue:', err);
                      }
                    }
                    if (e.key === 'Escape') setIsAddingNewVenue(false);
                  }}
                  className="flex-1 text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newVenueName.trim()) return;
                    try {
                      const created = await api.createVenue({ name: newVenueName.trim() });
                      setVenuesList((prev) => [...prev, created]);
                      setLocation(created.name);
                      updateMetaField({ location: created.name });
                      setNewVenueName('');
                      setIsAddingNewVenue(false);
                    } catch (err) {
                      console.error('Failed to create venue:', err);
                    }
                  }}
                  disabled={!newVenueName.trim()}
                  className="px-2 py-1 text-[11px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingNewVenue(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Start & End Time row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                Start Time
              </label>
              <CustomTimePicker
                value={startTime}
                onChange={(val) => {
                  const t = val || '';
                  setStartTime(t);
                  updateMetaField({ startTime: t });
                }}
                disabled={isReadOnly}
                size="sm"
                placeholder="Start time"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                End Time
              </label>
              <CustomTimePicker
                value={endTime}
                onChange={(val) => {
                  const t = val || '';
                  setEndTime(t);
                  updateMetaField({ endTime: t });
                }}
                disabled={isReadOnly}
                size="sm"
                placeholder="End time"
              />
            </div>
          </div>

          {/* Setup & Teardown Time row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-teal-500" />
                Setup Time
              </label>
              <CustomTimePicker
                value={setupTime}
                onChange={(val) => {
                  const t = val || '';
                  setSetupTime(t);
                  updateMetaField({ setupTime: t });
                }}
                disabled={isReadOnly}
                size="sm"
                placeholder="Setup time"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                Teardown Time
              </label>
              <CustomTimePicker
                value={teardownTime}
                onChange={(val) => {
                  const t = val || '';
                  setTeardownTime(t);
                  updateMetaField({ teardownTime: t });
                }}
                disabled={isReadOnly}
                size="sm"
                placeholder="Teardown time"
              />
            </div>
          </div>

          {/* Contact person / Facility manager with Contact list link and locked state */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-teal-500" />
              Venue Contact & Facility Manager
            </label>
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                {contactPerson ? (
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {contactPerson}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('eventspace:open-contacts'));
                      }}
                      className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 flex-shrink-0 font-medium cursor-pointer"
                      title="View in Contacts Directory"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>(Linked)</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      disabled={isReadOnly}
                      list={`contacts-list-${props.id}`}
                      placeholder="Select or enter Venue Contact..."
                      value={contactPerson}
                      onChange={(e) => {
                        setContactPerson(e.target.value);
                        updateMetaField({ contactPerson: e.target.value });
                      }}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                    />
                    <datalist id={`contacts-list-${props.id}`}>
                      {contactsList.map((c) => (
                        <option key={c.id} value={c.name ? `${c.name}${c.role ? ` (${c.role})` : ''}` : c.email || ''} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>
              {contactPerson && !isReadOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setContactPerson('');
                    updateMetaField({ contactPerson: '' });
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 cursor-pointer"
                  title="Unlink and change contact"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notes / Special requirements */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3 h-3 text-slate-400" />
            Logistics & Access Notes
          </label>
          {isReadOnly ? (
            <div className="w-full text-xs p-2 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 min-h-[40px] whitespace-pre-wrap">
              {notes || <span className="italic text-slate-400">No notes provided</span>}
            </div>
          ) : (
            <textarea
              rows={2}
              value={notes}
              placeholder="Loading dock access, electrical requirements, seating arrangements..."
              onChange={(e) => {
                setNotes(e.target.value);
                updateMetaField({ notes: e.target.value }, e.target.value);
              }}
              onWheel={(e) => e.stopPropagation()}
              className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none font-normal nodrag nowheel"
            />
          )}
        </div>
      </div>
    </div>
  );
};
