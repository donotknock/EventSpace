import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import {
  Camera,
  Trash2,
  Calendar,
  Edit3,
  Check,
  X,
  RefreshCw,
  Image as ImageIcon,
  Maximize2,
} from 'lucide-react';
import { CanvasNodeItem } from '../../types';

export const PictureNode: React.FC<NodeProps> = (props) => {
  const nodeData = props.data as unknown as {
    node: CanvasNodeItem;
    onUpdate: (id: string, updates: Partial<CanvasNodeItem>) => void;
    onDelete: (id: string) => void;
    isLocated?: boolean;
  };

  const { node, onUpdate, onDelete } = nodeData;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(node.title || 'Event Photo');

  // Fullscreen Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Date picker state
  const [dateValue, setDateValue] = useState(
    node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : ''
  );

  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const handleSaveTitle = () => {
    if (titleText.trim() && titleText !== node.title) {
      onUpdate(props.id, { title: titleText.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDateChange = (newDate: string) => {
    setDateValue(newDate);
    if (newDate) {
      onUpdate(props.id, { dueDate: new Date(newDate).toISOString() });
    } else {
      onUpdate(props.id, { dueDate: null });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onUpdate(props.id, { content: base64 });
      }
      setIsLoadingFile(false);
    };
    reader.onerror = () => {
      console.error('Failed to read image file');
      setIsLoadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onUpdate(props.id, { content: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formattedDate = node.dueDate
    ? new Date(node.dueDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const hasImage = Boolean(node.content && node.content.startsWith('data:image'));

  const handleBaseClasses = `!w-3.5 !h-3.5 !bg-rose-500 hover:!bg-rose-600 dark:!bg-rose-400 !border-2 !border-white dark:!border-slate-900 shadow-md hover:!scale-125 transition-all duration-200 ${
    props.selected ? '!opacity-100' : 'opacity-0 group-hover:opacity-100'
  }`;

  return (
    <div
      style={{ '--locate-color': '#f43f5e' } as React.CSSProperties}
      className={`group relative w-full h-full min-w-[280px] min-h-[220px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-500/60 dark:border-rose-500/50 hover:border-rose-500 shadow-lg shadow-rose-500/10 transition-all select-none box-border flex flex-col justify-between ${
        nodeData.isLocated ? 'animate-locate-highlight ring-4 ring-offset-2 ring-rose-500' : ''
      }`}
    >
      <NodeResizer
        isVisible={Boolean(props.selected)}
        minWidth={280}
        minHeight={200}
        color="#f43f5e"
        lineClassName="!border-rose-500"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-rose-500 !rounded shadow-md"
      />

      {/* Exactly 1 Handle per side: Top (target), Left (target), Right (source), Bottom (source) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={handleBaseClasses}
        style={{ left: '50%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={handleBaseClasses}
        style={{ top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={handleBaseClasses}
        style={{ top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={handleBaseClasses}
        style={{ left: '50%' }}
      />

      {/* Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 text-rose-500">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
            Picture
          </span>
        </div>

        {/* Right side: Direct Native Date tag & Delete button */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          {/* Direct Native Date Picker Badge (No intermediate popup) */}
          <div
            className="relative inline-flex items-center nodrag nopan"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {formattedDate ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null;
                  if (input) {
                    try {
                      input.showPicker();
                    } catch {
                      input.focus();
                    }
                  }
                }}
                className="relative flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-all cursor-pointer"
              >
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{formattedDate}</span>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => handleDateChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="badge-date-input absolute inset-0 w-full h-full opacity-0 cursor-pointer nodrag nopan z-10"
                  title="Click to change date"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDateChange('');
                  }}
                  className="relative z-20 ml-0.5 p-0.5 text-amber-700/60 dark:text-amber-400/60 hover:text-red-500 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  title="Clear date"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null;
                  if (input) {
                    try {
                      input.showPicker();
                    } catch {
                      input.focus();
                    }
                  }
                }}
                className="relative flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                <span>+ Date</span>
                <input
                  type="date"
                  value=""
                  onChange={(e) => handleDateChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="badge-date-input absolute inset-0 w-full h-full opacity-0 cursor-pointer nodrag nopan z-10"
                  title="Click to set due date"
                />
              </div>
            )}
          </div>

          {/* Delete button */}
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
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-2.5 nodrag">
        {/* Title row */}
        {isEditingTitle ? (
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
              className="flex-1 text-lg font-semibold px-2 py-1 rounded-lg border border-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <button
              onClick={handleSaveTitle}
              className="w-6 h-6 flex items-center justify-center rounded bg-emerald-600 text-white"
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
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-semibold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-rose-600 dark:hover:text-rose-400 transition-colors leading-snug break-all [overflow-wrap:anywhere] min-w-0"
              title="Click to edit caption"
            >
              {node.title || 'Event Photo'}
            </h4>
            <Edit3
              onClick={() => setIsEditingTitle(true)}
              className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 cursor-pointer flex-shrink-0 mt-0.5"
            />
          </div>
        )}

        {/* Hidden File Input supporting iPad Camera and Unraid storage */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id={`photo-input-${props.id}`}
        />

        {/* Image Display or Upload Area */}
        {hasImage ? (
          <div className="space-y-2">
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="relative group/img overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black/5 max-h-56 flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all"
              title="Tap or click to view fullscreen"
            >
              <img
                src={node.content!}
                alt={node.title}
                className="w-full h-auto max-h-56 object-cover rounded-xl transition-transform duration-300 group-hover/img:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="min-h-[44px] px-3 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-slate-100 active:scale-95 transition-all"
                  title="View fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="min-h-[44px] px-3 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-slate-100 active:scale-95 transition-all"
                  title="Replace photo"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Replace
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="min-h-[44px] px-3 rounded-xl bg-red-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-red-500 active:scale-95 transition-all"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-2 border-dashed border-rose-300 dark:border-rose-900/60 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Snap or Upload Photo
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                iPad Camera or Unraid Storage
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingFile}
              className="min-h-[44px] w-full px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{isLoadingFile ? 'Uploading...' : 'Take Photo / Upload'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal (rendered via Portal to avoid ReactFlow zoom/scale clipping) */}
      {isLightboxOpen &&
        hasImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fadeIn select-none"
          >
            {/* Top Toolbar / Close Button */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(false);
                }}
                className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-2xl transition-all cursor-pointer"
                title="Close fullscreen view (Esc)"
                aria-label="Close fullscreen view"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main Lightbox Content */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-full max-h-[88vh] flex flex-col items-center justify-center"
            >
              <img
                src={node.content!}
                alt={node.title || 'Event Photo'}
                className="max-w-[92vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />

              {/* Caption Bar */}
              {(node.title || formattedDate) && (
                <div className="mt-3.5 px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-white flex items-center gap-3 shadow-lg max-w-md">
                  <span className="font-semibold text-sm truncate">
                    {node.title || 'Event Photo'}
                  </span>
                  {formattedDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {formattedDate}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Hint text at bottom */}
            <p className="absolute bottom-4 text-xs text-white/50 tracking-wide pointer-events-none">
              Tap anywhere outside or press Esc to close
            </p>
          </div>,
          document.body
        )}
    </div>
  );
};
