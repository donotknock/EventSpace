import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Trash2,
  Calendar,
  Edit3,
  Check,
  X,
  Sparkles,
  RefreshCw,
  FileAudio,
  Volume2,
  Loader2,
  CheckCircle2,
  Circle,
  Copy,
  Download,
} from 'lucide-react';
import { CanvasNodeItem } from '../../types';
import { formatMonthDay } from '../../utils/date';
import { CustomDatePicker } from '../CustomDatePicker';
import { triggerAgendaRefresh } from '../../utils/agendaEvents';
import {
  transcribeAudioBlob,
  summarizeText,
  FALLBACK_SUMMARY_TEXT,
  formatSummaryAsBullets,
} from '../../utils/transcription';
import { AutoLinkText } from '../../utils/linkify';
import { downloadMediaFile } from '../../utils/mediaDownload';

export const AudioNode: React.FC<NodeProps> = (props) => {
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
  const [titleText, setTitleText] = useState(node.title || 'Audio Note');

  // Date picker state
  const [dateValue, setDateValue] = useState(
    node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : ''
  );

  // Transcript & Summary state
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState(node.content || '');

  // Audio Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Premium Audio Player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Local AI Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);

  // Parse metadata
  let metadataObj: { audioUrl?: string | null; audioName?: string; summary?: string } = {};
  try {
    metadataObj = node.metadata ? JSON.parse(node.metadata) : {};
  } catch (e) {
    metadataObj = {};
  }

  const audioUrl = metadataObj.audioUrl || null;
  const summaryText = metadataObj.summary || '';
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryInput, setSummaryInput] = useState(summaryText);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizingStatus, setSummarizingStatus] = useState('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Sync internal state when node updates
  useEffect(() => {
    setTitleText(node.title || 'Audio Note');
    setTranscriptText(node.content || '');
    setDateValue(node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : '');
    if (metadataObj.summary !== undefined) {
      setSummaryInput(metadataObj.summary);
    }
  }, [node.title, node.content, node.dueDate, metadataObj.summary]);

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

  const handleSaveTranscript = () => {
    onUpdate(props.id, { content: transcriptText });
    setIsEditingTranscript(false);
  };

  const handleSaveSummary = () => {
    const formatted = formatSummaryAsBullets(summaryInput.trim());
    setSummaryInput(formatted);
    const updatedMeta = { ...metadataObj, summary: formatted };
    onUpdate(props.id, { metadata: JSON.stringify(updatedMeta) });
    setIsEditingSummary(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          saveAudio(base64Audio, 'Voice Recording');
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Unable to access microphone. Please grant permission in browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Audio = event.target?.result as string;
      if (base64Audio) {
        saveAudio(base64Audio, file.name);
      }
    };
    reader.readAsDataURL(file);
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
    if (!file || (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i))) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Audio = event.target?.result as string;
      if (base64Audio) {
        saveAudio(base64Audio, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAudio = (url: string, name?: string) => {
    const updatedMeta = {
      ...metadataObj,
      audioUrl: url,
      audioName: name || 'Audio Note',
    };
    onUpdate(props.id, { metadata: JSON.stringify(updatedMeta) });
  };

  const handleRemoveAudio = () => {
    const updatedMeta = { ...metadataObj };
    delete updatedMeta.audioUrl;
    delete updatedMeta.audioName;
    onUpdate(props.id, { metadata: JSON.stringify(updatedMeta) });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  // Run local speech-to-text using @xenova/transformers (Whisper) + true AI summarizer
  const handleRunTranscription = async () => {
    if (!audioUrl) return;
    setIsTranscribing(true);
    setTranscriptionProgress(10);
    setTranscriptionStatus('Initializing local Whisper model...');

    try {
      const resultText = await transcribeAudioBlob(audioUrl, (prog, status) => {
        setTranscriptionProgress(prog);
        setTranscriptionStatus(status);
      });

      if (resultText) {
        setTranscriptText(resultText);
        setTranscriptionStatus('Generating concise AI summary...');
        let autoSummary = '';
        try {
          autoSummary = await summarizeText(resultText);
        } catch {
          autoSummary = formatSummaryAsBullets(resultText);
        }
        if (!autoSummary) autoSummary = FALLBACK_SUMMARY_TEXT;
        setSummaryInput(autoSummary);
        const updatedMeta = { ...metadataObj, summary: autoSummary };
        onUpdate(props.id, { content: resultText, metadata: JSON.stringify(updatedMeta) });
      }
      setTranscriptionStatus('Transcription complete!');
      setTimeout(() => {
        setIsTranscribing(false);
        setTranscriptionStatus('');
      }, 1500);
    } catch (err) {
      console.error('Transcription failed:', err);
      setTranscriptionStatus('Local transcription error. Check console.');
      setTimeout(() => setIsTranscribing(false), 2500);
    }
  };

  // Run on-demand AI summarization of transcript
  const handleRunSummarization = async () => {
    const textToSummarize = transcriptText || node.content;
    if (!textToSummarize) return;
    setIsSummarizing(true);
    setSummarizingStatus('AI Summarizing...');
    try {
      const result = await summarizeText(textToSummarize, (_prog, status) => {
        setSummarizingStatus(status);
      });
      const finalSummary = result || FALLBACK_SUMMARY_TEXT;
      setSummaryInput(finalSummary);
      const updatedMeta = { ...metadataObj, summary: finalSummary };
      onUpdate(props.id, { metadata: JSON.stringify(updatedMeta) });
    } catch (err) {
      console.error('Summarization failed:', err);
    } finally {
      setIsSummarizing(false);
      setSummarizingStatus('');
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const formattedDate = node.dueDate ? formatMonthDay(node.dueDate) : null;

  // Single dot per side styling (violet brand)
  const handleBaseClasses = `!w-3.5 !h-3.5 !bg-violet-500 hover:!bg-violet-600 dark:!bg-violet-400 !border-2 !border-white dark:!border-slate-900 shadow-md hover:!scale-125 transition-all duration-200 -translate-x-1/2 -translate-y-1/2 ${
    isReadOnly
      ? '!pointer-events-none !opacity-0'
      : props.selected
      ? '!opacity-100'
      : 'opacity-0 group-hover:opacity-100'
  }`;

  return (
    <div
      style={{ '--locate-color': '#8b5cf6' } as React.CSSProperties}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative w-full h-full min-w-[280px] min-h-[260px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-violet-500/60 dark:border-violet-500/50 hover:border-violet-500 shadow-lg shadow-violet-500/10 transition-all select-none box-border flex flex-col justify-between ${
        isDragOver ? 'ring-4 ring-violet-500 border-violet-500 bg-violet-50/30' : ''
      } ${
        nodeData.isLocated ? 'animate-locate-highlight ring-4 ring-offset-2 ring-violet-500' : ''
      } ${node.isCompleted ? 'opacity-50' : ''}`}
    >
      <NodeResizer
        isVisible={Boolean(props.selected) && !isReadOnly}
        minWidth={280}
        minHeight={260}
        color="#8b5cf6"
        lineClassName="!border-violet-500"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-violet-500 !rounded shadow-md"
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
            <div className="flex-shrink-0 text-violet-500">
              <Mic className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300">
              Audio
            </span>
          </div>

          {/* Right side: Hover action container (Download, Duplicate, Delete) + Date */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {/* Action buttons inside hover-only wrapper */}
            <div className="flex items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-opacity duration-150">
              {/* 1. Download Media button (visible on hover for ALL roles including Viewer whenever audio exists) */}
              {audioUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadMediaFile(audioUrl, metadataObj.audioName || `${node.title || 'voice-note'}.webm`);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-all cursor-pointer pointer-events-auto"
                  title="Download audio recording"
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
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-all pointer-events-auto"
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

      {/* Node Body with internal scrollable container */}
      <div
        className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-3 nodrag nowheel"
        onWheel={(e) => e.stopPropagation()}
      >
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
                className="flex-1 text-lg font-semibold px-2 py-1 rounded-lg border border-violet-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                onDoubleClick={() => {
                  if (!isReadOnly) setIsEditingTitle(true);
                }}
                className={`text-lg font-semibold ${
                  isReadOnly ? 'cursor-default' : 'cursor-pointer hover:text-violet-600 dark:hover:text-violet-400'
                } transition-colors leading-snug break-words min-w-0 ${
                  node.isCompleted
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
                title={isReadOnly ? undefined : 'Double-click to edit title'}
              >
                {node.title || 'Audio Note'}
              </h4>
              {!isReadOnly && (
                <Edit3
                  onClick={() => setIsEditingTitle(true)}
                  className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 cursor-pointer flex-shrink-0 mt-0.5"
                />
              )}
            </div>
          )}

          {/* Premium Audio Player or Recording Controls */}
          <div className="rounded-2xl border border-violet-200/80 dark:border-violet-900/60 bg-gradient-to-br from-violet-50/70 to-purple-50/40 dark:from-violet-950/30 dark:to-purple-950/20 p-3 space-y-2.5 shadow-xs">
            {audioUrl ? (
              <div className="space-y-2">
                {/* Hidden native audio element */}
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={() => {
                    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration);
                  }}
                  onEnded={() => setIsPlaying(false)}
                />

                {/* Premium Audio Player Toolbar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={handleTogglePlay}
                      className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-violet-500/20 transition-all flex-shrink-0"
                      title={isPlaying ? 'Pause' : 'Play audio'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                        {metadataObj.audioName || 'Voice Recording'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatSeconds(currentTime)} / {formatSeconds(duration || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadMediaFile(audioUrl, metadataObj.audioName || `${node.title || 'voice-note'}.webm`);
                      }}
                      className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                      title="Download audio recording"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleRunTranscription}
                      disabled={isTranscribing}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800 text-[10px] font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs transition-all disabled:opacity-50"
                      title="Generate local transcript using Whisper"
                    >
                      {isTranscribing ? (
                        <Loader2 className="w-3 h-3 animate-spin text-violet-600" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-violet-600" />
                      )}
                      <span>{isTranscribing ? 'Transcribing...' : 'AI Transcribe'}</span>
                    </button>
                    {!isReadOnly && (
                      <button
                        onClick={handleRemoveAudio}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                        title="Delete audio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrubber range bar */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-violet-200 dark:bg-violet-900/60 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />

                {/* Progress / Status banner during transcription */}
                {isTranscribing && (
                  <div className="p-2 rounded-xl bg-violet-100/70 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800 space-y-1 animate-fadeIn">
                    <div className="flex items-center justify-between text-[10px] font-bold text-violet-800 dark:text-violet-300">
                      <span>{transcriptionStatus}</span>
                      <span>{transcriptionProgress}%</span>
                    </div>
                    <div className="w-full bg-violet-200 dark:bg-violet-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-violet-600 h-1.5 transition-all duration-300"
                        style={{ width: `${transcriptionProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : isRecording ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono">
                    Recording: {formatSeconds(recordSeconds)}
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop
                </button>
              </div>
            ) : isReadOnly ? (
              <div className="text-center py-2 text-xs text-slate-400 font-medium">
                No audio recording attached
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={startRecording}
                  className="flex-1 min-h-[38px] px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  title="Record voice note with microphone"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Record Voice</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[38px] px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                  title="Upload audio file (or drag & drop)"
                >
                  <Upload className="w-3.5 h-3.5 text-violet-500" />
                  <span>Attach</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Transcript Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Transcript
              </label>
              {!isReadOnly && !isEditingTranscript && (
                <button
                  onClick={() => setIsEditingTranscript(true)}
                  className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingTranscript ? (
              <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                <textarea
                  autoFocus
                  rows={2}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  onWheel={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveTranscript();
                    if (e.key === 'Escape') setIsEditingTranscript(false);
                  }}
                  placeholder="Enter speech transcript, voice memo notes, or discussion points..."
                  className="w-full text-xs p-2 rounded-xl border border-violet-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none leading-relaxed font-sans nodrag nowheel"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setIsEditingTranscript(false)}
                    className="px-2 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTranscript}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 shadow-sm"
                  >
                    Save Transcript
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDoubleClick={() => {
                  if (!isReadOnly) setIsEditingTranscript(true);
                }}
                className={`p-2.5 rounded-xl border text-xs leading-relaxed transition-colors max-h-28 overflow-y-auto break-words min-w-0 whitespace-pre-wrap ${
                  isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-violet-300'
                } ${
                  node.content
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-transparent border-dashed border-slate-200 dark:border-slate-800 text-slate-400 italic'
                }`}
                title={isReadOnly ? undefined : 'Double-click to edit transcript'}
              >
                {node.content ? (
                  <AutoLinkText text={node.content} />
                ) : isReadOnly ? (
                  'No transcript recorded'
                ) : (
                  'Click to add or auto-transcribe speech...'
                )}
              </div>
            )}
          </div>

            {/* Dedicated "Summary" text field below transcript */}
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Summary / Key Takeaways
                </label>
                <div className="flex items-center gap-1.5">
                  {!isReadOnly && (transcriptText || node.content) && (
                    <button
                      onClick={handleRunSummarization}
                      disabled={isSummarizing}
                      className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
                      title="Generate concise summary with AI"
                    >
                      {isSummarizing ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5" />
                      )}
                      <span>{isSummarizing ? (summarizingStatus || 'Summarizing...') : 'AI Summarize'}</span>
                    </button>
                  )}
                  {!isReadOnly && !isEditingSummary && (
                    <button
                      onClick={() => setIsEditingSummary(true)}
                      className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {isEditingSummary ? (
                <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    autoFocus
                    rows={2}
                    value={summaryInput}
                    onChange={(e) => setSummaryInput(e.target.value)}
                    onWheel={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveSummary();
                      if (e.key === 'Escape') setIsEditingSummary(false);
                    }}
                    placeholder="Key takeaways, decisions, or action items from this audio..."
                    className="w-full text-xs p-2 rounded-xl border border-violet-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none leading-relaxed font-sans nodrag nowheel"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setIsEditingSummary(false)}
                      className="px-2 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSummary}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 shadow-sm"
                    >
                      Save Summary
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDoubleClick={() => {
                    if (!isReadOnly) setIsEditingSummary(true);
                  }}
                  className={`p-2.5 rounded-xl border text-xs leading-relaxed transition-colors break-words min-w-0 ${
                    isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-violet-300'
                  } ${
                    summaryText
                      ? 'bg-violet-50/40 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40 text-slate-700 dark:text-slate-300 font-medium'
                      : 'bg-transparent border-dashed border-slate-200 dark:border-slate-800 text-slate-400 italic'
                  }`}
                  title={isReadOnly ? undefined : 'Double-click to edit summary'}
                >
                  {!summaryText ? (
                    <span className="italic text-slate-400">
                      {isReadOnly ? 'No summary generated' : 'Add key takeaways or meeting highlights...'}
                    </span>
                  ) : summaryText === FALLBACK_SUMMARY_TEXT ? (
                    <span className="italic text-slate-400 dark:text-slate-500 font-normal">{FALLBACK_SUMMARY_TEXT}</span>
                  ) : (
                    <ul className="space-y-1.5 list-none m-0 p-0">
                      {summaryText.split('\n').filter(Boolean).map((bullet, idx) => {
                        const cleanLine = bullet.replace(/^[•\-\*]\s*/, '').trim();
                        return (
                          <li key={idx} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 mt-1.5 flex-shrink-0" />
                            <span className="flex-1 break-words min-w-0">
                              <AutoLinkText text={cleanLine} />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    );
  };
