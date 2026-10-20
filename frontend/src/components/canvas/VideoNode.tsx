import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import {
  Video,
  Play,
  Upload,
  Trash2,
  Calendar,
  Edit3,
  Check,
  X,
  CheckCircle2,
  Circle,
  ExternalLink,
  Film,
  Copy,
  Download,
} from 'lucide-react';
import { CanvasNodeItem } from '../../types';
import { formatMonthDay } from '../../utils/date';
import { CustomDatePicker } from '../CustomDatePicker';
import { triggerAgendaRefresh } from '../../utils/agendaEvents';
import { downloadMediaFile } from '../../utils/mediaDownload';

interface VideoMetadata {
  videoUrl?: string;
  videoType?: 'youtube' | 'vimeo' | 'html5';
  caption?: string;
}

// Parse YouTube, Vimeo, or standard video URL
function parseVideoSource(rawUrl: string): { type: 'youtube' | 'vimeo' | 'html5' | 'unknown'; embedUrl: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { type: 'unknown', embedUrl: '' };
  }

  const trimmed = rawUrl.trim();

  // YouTube checks
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
    };
  }

  // Vimeo checks
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^/]*\/videos\/|album\/(?:\d+\/)?video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Direct video or data URL
  if (
    trimmed.startsWith('data:video/') ||
    trimmed.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ||
    trimmed.startsWith('blob:')
  ) {
    return {
      type: 'html5',
      embedUrl: trimmed,
    };
  }

  // Fallback: if it's a generic web URL, attempt HTML5 or treat as unknown
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      type: 'html5',
      embedUrl: trimmed,
    };
  }

  return { type: 'unknown', embedUrl: '' };
}

export const VideoNode: React.FC<NodeProps> = (props) => {
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

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(node.title || 'Video Player');

  // Date picker state
  const [dateValue, setDateValue] = useState(
    node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : ''
  );

  // Metadata
  let metadataObj: VideoMetadata = {};
  try {
    if (node.metadata) {
      metadataObj = JSON.parse(node.metadata);
    }
  } catch {
    metadataObj = {};
  }

  const [inputUrl, setInputUrl] = useState(metadataObj.videoUrl || '');
  const [caption, setCaption] = useState(node.content || metadataObj.caption || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleText(node.title || 'Video Player');
    setDateValue(node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : '');

    try {
      if (node.metadata) {
        const parsed: VideoMetadata = JSON.parse(node.metadata);
        setInputUrl(parsed.videoUrl || '');
        setCaption(node.content || parsed.caption || '');
      }
    } catch {
      // ignore
    }
  }, [node.title, node.dueDate, node.metadata, node.content]);

  const activeVideoUrl = metadataObj.videoUrl || inputUrl;
  const parsedSource = parseVideoSource(activeVideoUrl);

  const saveVideoUrl = (url: string) => {
    const parsed = parseVideoSource(url);
    const updatedMeta: VideoMetadata = {
      ...metadataObj,
      videoUrl: url,
      videoType: parsed.type === 'unknown' ? undefined : parsed.type,
      caption,
    };
    onUpdate(props.id, {
      metadata: JSON.stringify(updatedMeta),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Video = reader.result as string;
      setInputUrl(base64Video);
      saveVideoUrl(base64Video);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveVideo = () => {
    setInputUrl('');
    const updatedMeta: VideoMetadata = {
      ...metadataObj,
      videoUrl: '',
      videoType: undefined,
    };
    onUpdate(props.id, {
      metadata: JSON.stringify(updatedMeta),
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    if (!file || (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|ogg|mov|m4v)$/i))) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Video = reader.result as string;
      setInputUrl(base64Video);
      saveVideoUrl(base64Video);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTitle = () => {
    onUpdate(props.id, { title: titleText.trim() || 'Video Player' });
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

  // Single dot per side styling (orange brand)
  const handleBaseClasses = `!w-3.5 !h-3.5 !bg-orange-500 hover:!bg-orange-600 dark:!bg-orange-400 !border-2 !border-white dark:!border-slate-900 shadow-md hover:!scale-125 transition-all duration-200 -translate-x-1/2 -translate-y-1/2 ${
    isReadOnly
      ? '!pointer-events-none !opacity-0'
      : props.selected
      ? '!opacity-100'
      : 'opacity-0 group-hover:opacity-100'
  }`;

  return (
    <div
      style={{ '--locate-color': '#f97316' } as React.CSSProperties}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative w-full h-full min-w-[320px] min-h-[300px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-orange-500/60 dark:border-orange-500/50 hover:border-orange-500 shadow-lg shadow-orange-500/10 transition-all select-none box-border flex flex-col justify-between overflow-visible ${
        isDragOver ? 'ring-4 ring-orange-500 border-orange-500 bg-orange-50/30' : ''
      } ${
        nodeData.isLocated ? 'animate-locate-highlight ring-4 ring-offset-2 ring-orange-500' : ''
      } ${node.isCompleted ? 'opacity-50' : ''}`}
    >
      <NodeResizer
        isVisible={Boolean(props.selected) && !isReadOnly}
        minWidth={320}
        minHeight={300}
        color="#f97316"
        lineClassName="!border-orange-500"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-orange-500 !rounded shadow-md"
        onResizeEnd={(_, params) => {
          let meta: any = {};
          try {
            meta = JSON.parse(node.metadata || '{}');
          } catch {}
          onUpdate(props.id, {
            metadata: JSON.stringify({
              ...meta,
              videoUrl: meta.videoUrl || activeVideoUrl || undefined,
              caption: meta.caption || caption || undefined,
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

      {/* Inner content wrapper containing Header and Video Player/Body */}
      <div className="w-full h-full flex flex-col overflow-hidden rounded-[14px]">
        {/* Header */}
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
          <div className="shrink-0 text-orange-500">
            <Video className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300">
            Video
          </span>
        </div>

        {/* Right side: Hover action container (Download, Duplicate, Delete) + Date */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Action buttons inside hover-only wrapper */}
          <div className="flex items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-opacity duration-150">
            {/* 1. Download Media button (visible on hover for ALL roles including Viewer whenever video source exists) */}
            {activeVideoUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadMediaFile(activeVideoUrl, `${node.title || 'video'}.mp4`);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-all cursor-pointer pointer-events-auto"
                title="Download video"
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
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-all pointer-events-auto"
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

      {/* Node Body with internal flex container */}
      <div
        className="flex-1 min-h-0 p-3.5 flex flex-col justify-between space-y-2 nodrag nowheel overflow-hidden"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Title row */}
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
                className="flex-1 text-lg font-semibold px-2 py-1 rounded-lg border border-orange-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  isReadOnly ? 'cursor-default' : 'cursor-pointer hover:text-orange-600 dark:hover:text-orange-400'
                } transition-colors leading-snug break-words min-w-0 ${
                  node.isCompleted
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
                title={isReadOnly ? undefined : 'Double-click to edit title'}
              >
                {node.title || 'Video Player'}
              </h4>
              {!isReadOnly && (
                <Edit3
                  onClick={() => setIsEditingTitle(true)}
                  className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 cursor-pointer flex-shrink-0 mt-0.5"
                />
              )}
            </div>
          )}
        </div>

        {/* Video Player or Input */}
        {activeVideoUrl && parsedSource.type !== 'unknown' ? (
          <div className="space-y-1.5 flex-1 flex flex-col min-h-0 w-full">
            <div className="relative flex-1 min-h-[140px] w-full flex flex-col items-center justify-center overflow-hidden bg-black/40 rounded-xl shadow-md border border-slate-200 dark:border-slate-800">
              {parsedSource.type === 'youtube' || parsedSource.type === 'vimeo' ? (
                <iframe
                  src={parsedSource.embedUrl}
                  title="Video Player"
                  className="w-full h-full object-contain aspect-video max-h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  src={parsedSource.embedUrl}
                  controls
                  className="w-full h-full object-contain aspect-video max-h-full bg-black"
                >
                  Your browser does not support HTML5 video.
                </video>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 shrink-0">
              <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                {parsedSource.type}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadMediaFile(activeVideoUrl, `${node.title || 'video'}.mp4`);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                  title="Download video file"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium text-[11px] hover:underline"
                  >
                    Change Video
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : isReadOnly ? (
          <div className="relative flex-1 min-h-[140px] w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-1 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400 font-medium">No video attached</p>
          </div>
        ) : (
          <div className="relative flex-1 min-h-[140px] w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-3 space-y-2 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-red-100 dark:bg-red-950/60 text-red-500 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Embed or Upload Video
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Paste a YouTube, Vimeo, or direct video URL, or drag & drop video file.
            </p>

            <div className="flex items-center gap-1.5 pt-0.5 w-full max-w-sm">
              <input
                type="text"
                placeholder="https://youtu.be/... or .mp4 URL"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveVideoUrl(inputUrl);
                }}
                className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={() => saveVideoUrl(inputUrl)}
                className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
              >
                Set
              </button>
            </div>

            <div className="relative flex py-0.5 items-center w-full max-w-sm">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
              <span className="flex-shrink mx-2 text-[9px] text-slate-400 uppercase font-medium">Or</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="video/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Record video using device camera"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Take Video</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
            </div>
          </div>
        )}

        {/* Video Notes / Description */}
        <div className="shrink-0 space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Video Notes & Presentation Cue
          </label>
          {isReadOnly ? (
            <div className="w-full text-xs p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 min-h-[36px] max-h-[80px] overflow-y-auto whitespace-pre-wrap break-words">
              {caption || <span className="italic text-slate-400">No notes provided</span>}
            </div>
          ) : (
            <textarea
              rows={2}
              value={caption}
              placeholder="Timestamps, presentation cues, playback instructions..."
              onChange={(e) => {
                setCaption(e.target.value);
                const updatedMeta: VideoMetadata = {
                  ...metadataObj,
                  videoUrl: activeVideoUrl,
                  caption: e.target.value,
                };
                onUpdate(props.id, {
                  content: e.target.value,
                  metadata: JSON.stringify(updatedMeta),
                });
              }}
              onWheel={(e) => e.stopPropagation()}
              className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none font-normal nodrag nowheel break-words max-h-[80px]"
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
