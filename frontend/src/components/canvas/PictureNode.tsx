import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import {
  Camera,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Edit3,
  Check,
  X,
  RefreshCw,
  Image as ImageIcon,
  Maximize2,
  Copy,
  Download,
} from 'lucide-react';
import { CanvasNodeItem } from '../../types';
import { formatMonthDay } from '../../utils/date';
import { CustomDatePicker } from '../CustomDatePicker';
import { triggerAgendaRefresh } from '../../utils/agendaEvents';
import { downloadMediaFile } from '../../utils/mediaDownload';
import {
  extractRawEmbeddedJpeg,
  isRawFileType,
  RAW_EXTENSIONS,
  RAW_MIME_TYPES,
} from '../../utils/rawImageDecoder';

const ACCEPT_IMAGE_TYPES = `image/*,${RAW_EXTENSIONS.join(',')},${RAW_MIME_TYPES.join(',')}`;

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageOrRawFile(file: File): boolean {
  if (file.type) {
    const lowerType = file.type.toLowerCase();
    if (lowerType.startsWith('image/') || RAW_MIME_TYPES.includes(lowerType)) {
      return true;
    }
  }
  const lowerName = file.name.toLowerCase();
  return RAW_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export const PictureNode: React.FC<NodeProps> = (props) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(node.title || 'Event Photo');

  // Fullscreen Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Image decode error state (for unsupported RAW browser rendering)
  const [imgError, setImgError] = useState(false);

  // Date picker state
  const [dateValue, setDateValue] = useState(
    node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : ''
  );

  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Sync internal state when node updates (including dueDate clearing)
  useEffect(() => {
    setTitleText(node.title || 'Event Photo');
    setDateValue(node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : '');
  }, [node.title, node.dueDate]);

  // Reset decode error when image source changes
  useEffect(() => {
    setImgError(false);
  }, [node.content]);

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
    triggerAgendaRefresh();
  };

  const handleProcessFile = async (file: File) => {
    setIsLoadingFile(true);
    const fileName = file.name;
    const fileSize = file.size;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isRaw = isRawFileType(file.type, file.name);

    let meta: any = {};
    try {
      meta = JSON.parse(node.metadata || '{}');
    } catch {}

    try {
      if (isRaw) {
        // 1. Extract high-res embedded JPEG preview stream from the RAW file binary buffer
        const buffer = await file.arrayBuffer();
        const extractedPreview = await extractRawEmbeddedJpeg(buffer);

        // 2. Read full original RAW file as base64 data URL to preserve for download
        const originalDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        if (extractedPreview) {
          // Display the extracted JPEG photograph in <img> and store original RAW in metadata
          onUpdate(props.id, {
            content: extractedPreview,
            metadata: JSON.stringify({
              ...meta,
              fileName,
              fileSize,
              isRaw: true,
              rawExt: ext.toUpperCase(),
              rawOriginalUrl: originalDataUrl,
              hasExtractedPreview: true,
            }),
          });
        } else {
          // Fallback if no valid embedded JPEG preview found
          onUpdate(props.id, {
            content: originalDataUrl,
            metadata: JSON.stringify({
              ...meta,
              fileName,
              fileSize,
              isRaw: true,
              rawExt: ext.toUpperCase(),
              rawOriginalUrl: originalDataUrl,
            }),
          });
        }
      } else {
        // Standard web image (JPEG, PNG, WebP, GIF, SVG)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        onUpdate(props.id, {
          content: base64,
          metadata: JSON.stringify({
            ...meta,
            fileName,
            fileSize,
            isRaw: false,
            rawExt: undefined,
            rawOriginalUrl: undefined,
            hasExtractedPreview: false,
          }),
        });
      }
    } catch (err) {
      console.error('Failed to process image/RAW file:', err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
  };

  const handleRemoveImage = () => {
    let meta: any = {};
    try {
      meta = JSON.parse(node.metadata || '{}');
    } catch {}
    delete meta.fileName;
    delete meta.fileSize;
    delete meta.isRaw;
    delete meta.rawExt;
    delete meta.rawOriginalUrl;
    delete meta.hasExtractedPreview;

    onUpdate(props.id, {
      content: null,
      metadata: JSON.stringify(meta),
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !isImageOrRawFile(file)) return;
    handleProcessFile(file);
  };

  const formattedDate = node.dueDate ? formatMonthDay(node.dueDate) : null;

  let metaObj: any = {};
  try {
    metaObj = node.metadata ? JSON.parse(node.metadata) : {};
  } catch {}

  const fileName = metaObj.fileName || node.title || 'Event Photo';
  const fileSizeDisplay = metaObj.fileSize ? formatFileSize(metaObj.fileSize) : null;
  const isRawFormat = Boolean(
    metaObj.isRaw || (fileName && RAW_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext)))
  );
  const rawBadgeText = metaObj.rawExt || (fileName?.includes('.') ? fileName.split('.').pop()?.toUpperCase() : 'RAW');

  const hasImage = Boolean(
    node.content &&
      (node.content.startsWith('data:') || node.content.startsWith('http') || node.content.startsWith('blob:'))
  );

  const handleBaseClasses = `!w-3.5 !h-3.5 !bg-rose-500 hover:!bg-rose-600 dark:!bg-rose-400 !border-2 !border-white dark:!border-slate-900 shadow-md hover:!scale-125 transition-all duration-200 -translate-x-1/2 -translate-y-1/2 ${
    isReadOnly
      ? '!pointer-events-none !opacity-0'
      : props.selected
      ? '!opacity-100'
      : 'opacity-0 group-hover:opacity-100'
  }`;

  return (
    <div
      style={{ '--locate-color': '#f43f5e' } as React.CSSProperties}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative w-full h-full min-w-[280px] min-h-[220px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-500/60 dark:border-rose-500/50 hover:border-rose-500 shadow-lg shadow-rose-500/10 transition-all select-none box-border flex flex-col justify-between overflow-visible ${
        isDragOver ? 'ring-4 ring-rose-500 border-rose-500 bg-rose-50/30' : ''
      } ${
        nodeData.isLocated ? 'animate-locate-highlight ring-4 ring-offset-2 ring-rose-500' : ''
      } ${node.isCompleted ? 'opacity-50' : ''}`}
    >
      <NodeResizer
        isVisible={Boolean(props.selected) && !isReadOnly}
        minWidth={280}
        minHeight={200}
        color="#f43f5e"
        lineClassName="!border-rose-500"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-rose-500 !rounded shadow-md"
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

      {/* Inner content wrapper containing Header, Image, and Caption/Footer */}
      <div className="w-full h-full flex flex-col overflow-hidden rounded-[14px]">
        {/* 1. Header Bar: shrink-0 */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 rounded-t-[14px] flex items-center justify-between gap-2 shrink-0">
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
          <div className="shrink-0 text-rose-500">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
            Picture
          </span>
        </div>

        {/* Right side: Hover action container (Download, Duplicate, Delete) + Date */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Action buttons inside hover-only wrapper */}
          <div className="flex items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-opacity duration-150">
            {/* 1. Download Media button (visible on hover for ALL roles including Viewer when media exists) */}
            {hasImage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadMediaFile(metaObj.rawOriginalUrl || node.content!, fileName);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer pointer-events-auto"
                title="Download photo / RAW file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 2. Duplicate button (non-Viewers) */}
            {!isReadOnly && onDuplicate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(props.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all pointer-events-auto"
                title="Duplicate block"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 3. Delete button (non-Viewers) */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(props.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all pointer-events-auto"
                title="Delete node"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4. Date picker badge at far right */}
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

      {/* Hidden File Input supporting standard images, iPad Camera, and Camera RAW files */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_IMAGE_TYPES}
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id={`photo-input-${props.id}`}
      />

      {/* Body: Flex column, full height available, overflow-hidden */}
      <div
        className="flex-1 min-h-0 p-3.5 flex flex-col justify-between space-y-2 nodrag nowheel overflow-hidden"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* 2. Editable Block Title (Top) */}
        <div className="shrink-0">
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
                type="button"
                onClick={handleSaveTitle}
                className="w-6 h-6 flex items-center justify-center rounded bg-emerald-600 text-white"
                title="Save Title"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-1 group/title min-w-0">
              <h4
                onDoubleClick={() => {
                  if (!isReadOnly) setIsEditingTitle(true);
                }}
                className={`text-lg font-semibold ${
                  isReadOnly ? 'cursor-default' : 'cursor-pointer hover:text-rose-600 dark:hover:text-rose-400'
                } transition-colors leading-snug break-words min-w-0 ${
                  node.isCompleted
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
                title={isReadOnly ? undefined : 'Double-click to edit title'}
              >
                {node.title || 'Event Photo'}
              </h4>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                {isRawFormat && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                    {rawBadgeText}
                  </span>
                )}
                {!isReadOnly && (
                  <Edit3
                    onClick={() => setIsEditingTitle(true)}
                    className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 cursor-pointer shrink-0"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Photo / RAW Image Preview Container & Upload Dropzone (Middle) */}
        {hasImage ? (
          imgError ? (
            /* High-contrast RAW File Preview Card */
            <div className="relative flex-1 min-h-[120px] w-full rounded-lg border-2 border-dashed border-rose-400 dark:border-rose-700 bg-rose-50/70 dark:bg-rose-950/40 p-3 flex flex-col items-center justify-center text-center space-y-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black tracking-wider uppercase shadow-xs">
                  {rawBadgeText} RAW
                </span>
              </div>
              <div className="min-w-0 max-w-full">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate px-2" title={fileName}>
                  {fileName}
                </p>
                {fileSizeDisplay && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {fileSizeDisplay}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadMediaFile(metaObj.rawOriginalUrl || node.content!, fileName);
                  }}
                  className="min-h-[32px] px-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition-all cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  title="Download original RAW file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download RAW</span>
                </button>
                {!isReadOnly && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="min-h-[32px] px-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
                      title="Replace file"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="min-h-[32px] px-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 active:scale-95 transition-all"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="relative flex-1 min-h-[120px] w-full flex items-center justify-center overflow-hidden bg-slate-950/30 rounded-lg group/img cursor-pointer shadow-sm hover:shadow-md transition-all"
              title="Tap or click to view fullscreen"
            >
              {/* Image Element (<img>): max-w-full max-h-full w-auto h-auto object-contain rounded */}
              <img
                src={node.content!}
                alt={node.title}
                onError={() => setImgError(true)}
                className="max-w-full max-h-full w-auto h-auto object-contain rounded transition-transform duration-300 group-hover/img:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="min-h-[36px] px-3 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-slate-100 active:scale-95 transition-all"
                  title="View fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadMediaFile(metaObj.rawOriginalUrl || node.content!, fileName);
                  }}
                  className="min-h-[36px] px-3 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  title="Download photo"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                {!isReadOnly && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="min-h-[36px] px-3 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-slate-100 active:scale-95 transition-all"
                      title="Replace photo"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="min-h-[36px] px-3 rounded-xl bg-red-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-red-500 active:scale-95 transition-all"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        ) : isReadOnly ? (
          <div className="relative flex-1 min-h-[120px] w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20 text-center space-y-1 overflow-hidden">
            <div className="w-8 h-8 mx-auto rounded-full bg-slate-100 dark:bg-slate-900/40 text-slate-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400 font-medium">No photo uploaded</p>
          </div>
        ) : (
          <div className="relative flex-1 min-h-[120px] w-full flex flex-col items-center justify-center p-3 border-2 border-dashed border-rose-300 dark:border-rose-900/60 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-2 overflow-hidden">
            <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Snap or Upload Photo / RAW
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                JPEG, PNG, DNG, CR3, ARW, NEF, or camera
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingFile}
              className="min-h-[38px] w-full max-w-xs px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{isLoadingFile ? 'Processing...' : 'Take Photo / Upload RAW'}</span>
            </button>
          </div>
        )}

        {/* 4. Caption / Notes & Footer (Bottom) */}
        {fileSizeDisplay && (
          <div className="shrink-0 pt-0.5">
            <p className="text-[10px] text-slate-400 font-mono truncate" title={fileName}>
              {fileName} • {fileSizeDisplay}
            </p>
          </div>
        )}
      </div>
      </div>

      {/* Fullscreen Lightbox Modal (rendered via Portal to avoid ReactFlow zoom/scale clipping) */}
      {isLightboxOpen &&
        hasImage &&
        !imgError &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fadeIn select-none"
          >
            {/* Top Toolbar / Download & Close Buttons */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadMediaFile(metaObj.rawOriginalUrl || node.content!, fileName);
                }}
                className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-2xl transition-all cursor-pointer"
                title="Download photo / RAW file"
                aria-label="Download photo"
              >
                <Download className="w-5 h-5" />
              </button>
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
