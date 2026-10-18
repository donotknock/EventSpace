import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit3,
  Camera,
  Mic,
  Square,
  Play,
  Pause,
  Clock,
  Sparkles,
  Link as LinkIcon,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  RefreshCw,
  AlertCircle,
  Image as ImageIcon,
  CheckSquare,
  Check,
  X,
  Volume2,
  HelpCircle,
  FolderKanban,
  FileText,
  User,
  Sun,
  Moon,
  Boxes,
  Info,
  Building2,
  Video,
  Contrast,
  Copy,
  MapPin,
  Eye,
  EyeOff,
  Tv,
  UtensilsCrossed,
  Music,
  Shield,
  Wrench,
  Truck,
  Users,
  Megaphone,
  Star,
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AutoLinkText } from '../utils/linkify';
import { ContentWithTables } from '../utils/markdownTable';
import { useTheme } from '../context/ThemeContext';
import { getLuminance } from '../utils/color';
import type {
  CanvasEdgeItem,
  CanvasNodeItem,
  ChecklistItem,
  EventItem,
  FullEventItem,
  NodeType,
  Priority,
  ServerConfig,
  Subtask,
  FrictionLogItem,
} from '../types';
import { mobileApi } from '../services/api';
import { BlockModal } from './BlockModal';

const CATEGORY_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  building: Building2,
  tv: Tv,
  utensils: UtensilsCrossed,
  music: Music,
  shield: Shield,
  sparkles: Sparkles,
  wrench: Wrench,
  truck: Truck,
  users: Users,
  megaphone: Megaphone,
};

const DEFAULT_CATEGORY_CONFIGS: Record<string, { icon: string; color: string; title: string }> = {
  FM: { icon: 'building', color: 'emerald', title: 'Facilities Management' },
  AV: { icon: 'tv', color: 'blue', title: 'Audio / Visual' },
  CT: { icon: 'utensils', color: 'amber', title: 'Catering & Dining' },
  SODEXO: { icon: 'utensils', color: 'amber', title: 'Sodexo Services' },
  CATERING: { icon: 'utensils', color: 'amber', title: 'Catering & Hospitality' },
  COMMUNICATIONS: { icon: 'megaphone', color: 'purple', title: 'Communications' },
  General: { icon: 'sparkles', color: 'indigo', title: 'General Overarching' },
};

function getCategoryConfig(catName: string) {
  try {
    const raw = localStorage.getItem('eventspace_category_configs');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[catName]) {
        return {
          icon: parsed[catName].icon || 'building',
          color: parsed[catName].color || 'emerald',
          title: parsed[catName].title || catName,
        };
      }
    }
  } catch {}
  if (DEFAULT_CATEGORY_CONFIGS[catName]) {
    return DEFAULT_CATEGORY_CONFIGS[catName];
  }
  return { icon: 'sparkles', color: 'indigo', title: catName };
}

function getCategoryColorClasses(colorName: string) {
  switch (colorName) {
    case 'emerald':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' };
    case 'blue':
      return { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' };
    case 'amber':
      return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' };
    case 'purple':
      return { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' };
    case 'rose':
      return { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' };
    case 'indigo':
      return { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' };
    case 'cyan':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' };
    case 'orange':
      return { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30' };
    default:
      return { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' };
  }
}

interface EventDetailViewProps {
  event: EventItem;
  config: ServerConfig;
  onBack: () => void;
  onOpenAgenda: (eventId?: string) => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  event: initialEvent,
  config,
  onBack,
  onOpenAgenda,
}) => {
  const { theme, cycleTheme } = useTheme();
  const [eventData, setEventData] = useState<FullEventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checklists collapse state - default to collapsed/minimized
  const [isChecklistsCollapsed, setIsChecklistsCollapsed] = useState(true);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');

  // Inline subtask editing state
  const [editingSubtaskKey, setEditingSubtaskKey] = useState<string | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');

  // Block Modal state (Create / Edit)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<CanvasNodeItem | null>(null);
  const [defaultBlockType, setDefaultBlockType] = useState<NodeType>('task');

  // Collapsible Connections state per node
  const [expandedConnections, setExpandedConnections] = useState<Record<string, boolean>>({});

  const toggleConnections = (nodeId: string) => {
    setExpandedConnections((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Native Audio Recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackCurrentTime, setAudioPlaybackCurrentTime] = useState<number>(0);
  const [audioPlaybackDuration, setAudioPlaybackDuration] = useState<number>(0);
  const currentAudioElemRef = useRef<HTMLAudioElement | null>(null);

  // Fallback file input for pictures
  const pictureFileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox picture preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Media Quick Capture Prompt modal ('picture' | 'audio' | 'video' | null)
  const [mediaPromptType, setMediaPromptType] = useState<'picture' | 'audio' | 'video' | null>(null);

  // Global Hide Completed state
  const [hideCompleted, setHideCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('eventspace_mobile_hide_completed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideCompleted = () => {
    setHideCompleted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('eventspace_mobile_hide_completed', String(next));
      } catch {}
      return next;
    });
  };

  // Additional file inputs for quick capture media prompts
  const pictureUploadInputRef = useRef<HTMLInputElement>(null);
  const audioUploadFileInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);
  const videoUploadInputRef = useRef<HTMLInputElement>(null);

  // Quick Capture Carousel horizontal scroll state & edge indicators
  const quickCaptureScrollRef = useRef<HTMLDivElement>(null);
  const [qcHiddenLeftCount, setQcHiddenLeftCount] = useState(0);
  const [qcHiddenRightCount, setQcHiddenRightCount] = useState(0);

  const updateQcScrollCounts = () => {
    const container = quickCaptureScrollRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const cardElements = container.querySelectorAll('.quick-capture-carousel-card');
    let leftHidden = 0;
    let rightHidden = 0;

    cardElements.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      if (cardRect.right < containerRect.left + 10) {
        leftHidden++;
      } else if (cardRect.left > containerRect.right - 10) {
        rightHidden++;
      }
    });

    setQcHiddenLeftCount(leftHidden);
    setQcHiddenRightCount(rightHidden);
  };

  useEffect(() => {
    // Initial measure after DOM nodes render
    const timer = setTimeout(updateQcScrollCounts, 150);
    const handleResize = () => updateQcScrollCounts();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Friction Log state
  const [frictionLogs, setFrictionLogs] = useState<FrictionLogItem[]>([]);
  const [isFrictionLogOpen, setIsFrictionLogOpen] = useState(false);
  const [isAddingFriction, setIsAddingFriction] = useState(false);
  const [newFrictionTitle, setNewFrictionTitle] = useState('');
  const [newFrictionDesc, setNewFrictionDesc] = useState('');
  const [newFrictionSeverity, setNewFrictionSeverity] = useState<'low' | 'medium' | 'critical' | 'none'>('medium');
  const [isSubmittingFriction, setIsSubmittingFriction] = useState(false);
  const [frictionFilter, setFrictionFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  const isViewer =
    (eventData as any)?.userRole?.toUpperCase() === 'VIEWER' ||
    (initialEvent as any)?.userRole?.toUpperCase() === 'VIEWER' ||
    (initialEvent as any)?.role?.toUpperCase() === 'VIEWER';

  const unresolvedFrictionCount = useMemo(() => {
    return frictionLogs.filter((f) => !f.resolved).length;
  }, [frictionLogs]);

  const totalAgendaCount = useMemo(() => {
    let count = 0;
    if (eventData?.nodes) {
      for (const n of eventData.nodes) {
        if (n.dueDate) count++;
        if (n.metadata) {
          try {
            const m = JSON.parse(n.metadata);
            if (Array.isArray(m.subtasks)) {
              for (const st of m.subtasks) {
                const isBullet = ['bullet', 'dot', 'dash', 'arrow', 'starred'].includes(st.style || '');
                if (!isBullet && st.dueDate) count++;
              }
            }
          } catch {}
        }
      }
    }
    return count || initialEvent.totalAgendaDated || 0;
  }, [eventData?.nodes, initialEvent.totalAgendaDated]);

  const filteredFrictionLogs = useMemo(() => {
    return frictionLogs.filter((f) => {
      if (frictionFilter === 'unresolved') return !f.resolved;
      if (frictionFilter === 'resolved') return f.resolved;
      return true;
    });
  }, [frictionLogs, frictionFilter]);

  // Load event details with nodes, edges, checklists, and friction logs
  const loadEventDetails = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [data, logs] = await Promise.all([
        mobileApi.getEvent(config.serverUrl, initialEvent.id),
        mobileApi.getFrictionLogs(config.serverUrl, initialEvent.id).catch(() => []),
      ]);
      setEventData(data);
      setFrictionLogs(logs);
    } catch (err: any) {
      console.error('Failed to load event details:', err);
      setError(err.message || 'Failed to load event details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCreateFrictionLog = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFrictionTitle.trim() || isSubmittingFriction || isViewer) return;
    setIsSubmittingFriction(true);
    try {
      const created = await mobileApi.createFrictionLog(config.serverUrl, initialEvent.id, {
        title: newFrictionTitle.trim(),
        description: newFrictionDesc.trim() || null,
        severity: newFrictionSeverity,
        resolved: false,
      });
      setFrictionLogs((prev) => [created, ...prev]);
      setNewFrictionTitle('');
      setNewFrictionDesc('');
      setNewFrictionSeverity('medium');
      setIsAddingFriction(false);
    } catch (err) {
      console.error('Failed to create friction log:', err);
    } finally {
      setIsSubmittingFriction(false);
    }
  };

  const handleToggleResolveFriction = async (log: FrictionLogItem) => {
    if (isViewer) return;
    const nextResolved = !log.resolved;
    setFrictionLogs((prev) =>
      prev.map((item) => (item.id === log.id ? { ...item, resolved: nextResolved } : item))
    );
    try {
      await mobileApi.updateFrictionLog(
        config.serverUrl,
        log.id,
        { resolved: nextResolved },
        initialEvent.id
      );
    } catch (err) {
      console.error('Failed to toggle friction log:', err);
      setFrictionLogs((prev) =>
        prev.map((item) => (item.id === log.id ? { ...item, resolved: !nextResolved } : item))
      );
    }
  };

  const handleDeleteFrictionLog = async (logId: string) => {
    if (isViewer) return;
    setFrictionLogs((prev) => prev.filter((item) => item.id !== logId));
    try {
      await mobileApi.deleteFrictionLog(config.serverUrl, logId, initialEvent.id);
    } catch (err) {
      console.error('Failed to delete friction log:', err);
    }
  };

  useEffect(() => {
    loadEventDetails();
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (currentAudioElemRef.current) {
        currentAudioElemRef.current.pause();
      }
    };
  }, [initialEvent.id, config.serverUrl]);

  // Open In Web Link (Dynamically uses configured server URL IP/Port)
  const handleOpenInWeb = () => {
    try {
      const url = new URL(config.serverUrl);
      // In local development where backend runs on 3001, route to Vite dev port 5173.
      // In unified Docker/production deployments, preserve the exact user-configured host and port.
      if (url.port === '3001' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        url.port = '5173';
      }
      url.pathname = '/';
      url.search = `?event=${encodeURIComponent(initialEvent.id)}`;
      url.hash = `event=${encodeURIComponent(initialEvent.id)}`;
      window.open(url.toString(), '_blank');
    } catch {
      const base = mobileApi.cleanUrl(config.serverUrl);
      window.open(
        `${base}/?event=${encodeURIComponent(initialEvent.id)}#event=${encodeURIComponent(initialEvent.id)}`,
        '_blank'
      );
    }
  };

  // Node lookup map for simplified connectors
  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNodeItem>();
    if (eventData?.nodes) {
      eventData.nodes.forEach((n) => map.set(n.id, n));
    }
    return map;
  }, [eventData?.nodes]);

  // Checklist categories
  const checklistCategories = useMemo(() => {
    const set = new Set<string>();
    if (eventData?.checklists) {
      eventData.checklists.forEach((c) => set.add(c.category || 'General'));
    }
    if (set.size === 0) set.add('General');
    return Array.from(set);
  }, [eventData?.checklists]);

  // Checklist Actions
  const handleToggleChecklist = async (item: ChecklistItem) => {
    if (!eventData) return;
    try {
      const updated = await mobileApi.updateChecklistItem(
        config.serverUrl,
        initialEvent.id,
        item.id,
        { isCompleted: !item.isCompleted }
      );
      setEventData({
        ...eventData,
        checklists: eventData.checklists.map((c) => (c.id === item.id ? updated : c)),
      });
    } catch (err) {
      console.error('Failed to toggle checklist:', err);
    }
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim() || !eventData) return;

    try {
      const newItem = await mobileApi.createChecklistItem(
        config.serverUrl,
        initialEvent.id,
        {
          category: selectedCategory,
          content: newChecklistText.trim(),
          isCompleted: false,
          order: eventData.checklists.length,
        }
      );
      setEventData({
        ...eventData,
        checklists: [...eventData.checklists, newItem],
      });
      setNewChecklistText('');
    } catch (err) {
      console.error('Failed to create checklist item:', err);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!eventData) return;
    try {
      await mobileApi.deleteChecklistItem(config.serverUrl, initialEvent.id, itemId);
      setEventData({
        ...eventData,
        checklists: eventData.checklists.filter((c) => c.id !== itemId),
      });
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  // Node Actions
  const handleToggleNodeCompleted = async (node: CanvasNodeItem) => {
    if (!eventData) return;
    try {
      const updated = await mobileApi.updateNode(config.serverUrl, initialEvent.id, node.id, {
        isCompleted: !node.isCompleted,
      });
      setEventData({
        ...eventData,
        nodes: eventData.nodes.map((n) => (n.id === node.id ? updated : n)),
      });
    } catch (err) {
      console.error('Failed to toggle node:', err);
    }
  };

  const handleToggleSubtask = async (node: CanvasNodeItem, subtaskIndex: number) => {
    if (!eventData || !node.metadata) return;
    try {
      const meta = JSON.parse(node.metadata);
      if (Array.isArray(meta.subtasks) && meta.subtasks[subtaskIndex]) {
        const stStyle = meta.subtasks[subtaskIndex].style || meta.subtasks[subtaskIndex].bulletStyle || meta.subtasks[subtaskIndex].checkboxStyle;
        if (['bullet', 'dot', 'dash', 'arrow', 'starred'].includes(stStyle)) return;
        meta.subtasks[subtaskIndex].done = !meta.subtasks[subtaskIndex].done;
        const updatedMetaStr = JSON.stringify(meta);
        const updated = await mobileApi.updateNode(config.serverUrl, initialEvent.id, node.id, {
          metadata: updatedMetaStr,
        });
        setEventData({
          ...eventData,
          nodes: eventData.nodes.map((n) => (n.id === node.id ? updated : n)),
        });
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  const handleSaveInlineSubtask = async (node: CanvasNodeItem, subtaskIndex: number) => {
    if (!eventData || !node.metadata || !editingSubtaskText.trim()) {
      setEditingSubtaskKey(null);
      return;
    }
    try {
      const meta = JSON.parse(node.metadata);
      if (Array.isArray(meta.subtasks) && meta.subtasks[subtaskIndex]) {
        meta.subtasks[subtaskIndex].label = editingSubtaskText.trim();
        meta.subtasks[subtaskIndex].text = editingSubtaskText.trim();
        const updatedMetaStr = JSON.stringify(meta);
        const updated = await mobileApi.updateNode(config.serverUrl, initialEvent.id, node.id, {
          metadata: updatedMetaStr,
        });
        setEventData({
          ...eventData,
          nodes: eventData.nodes.map((n) => (n.id === node.id ? updated : n)),
        });
        setEditingSubtaskKey(null);
        setEditingSubtaskText('');
      }
    } catch (err) {
      console.error('Failed to update inline subtask text:', err);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!window.confirm('Move this block to trash?')) return;
    if (!eventData) return;

    try {
      await mobileApi.deleteNode(config.serverUrl, initialEvent.id, nodeId);
      setEventData({
        ...eventData,
        nodes: eventData.nodes.filter((n) => n.id !== nodeId),
      });
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
  };

  const handleSaveBlock = async (data: any) => {
    if (!eventData) return;
    if (editingNode) {
      const updated = await mobileApi.updateNode(
        config.serverUrl,
        initialEvent.id,
        editingNode.id,
        data
      );
      setEventData({
        ...eventData,
        nodes: eventData.nodes.map((n) => (n.id === editingNode.id ? updated : n)),
      });
    } else {
      const created = await mobileApi.createNode(config.serverUrl, initialEvent.id, data);
      setEventData({
        ...eventData,
        nodes: [...eventData.nodes, created],
      });
    }
    setEditingNode(null);
  };

  // Native Picture Capture using @capacitor/camera with fallback
  const handleSnapPicture = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl && eventData) {
        const title = `Photo ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const created = await mobileApi.createNode(config.serverUrl, initialEvent.id, {
          type: 'picture',
          title,
          content: image.dataUrl,
        });
        setEventData({
          ...eventData,
          nodes: [...eventData.nodes, created],
        });
      }
    } catch (err) {
      console.warn('Capacitor camera threw or not supported in web preview, falling back to file picker:', err);
      pictureFileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventData) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        const title = `Photo ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const created = await mobileApi.createNode(config.serverUrl, initialEvent.id, {
          type: 'picture',
          title,
          content: base64,
        });
        setEventData({
          ...eventData,
          nodes: [...eventData.nodes, created],
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAudioUploadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventData) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        const title = file.name.replace(/\.[^/.]+$/, '') || 'Voice Memo';
        const meta = JSON.stringify({
          audioUrl: base64,
          audioName: file.name,
          summary: 'Uploaded audio recording',
        });
        const created = await mobileApi.createNode(config.serverUrl, initialEvent.id, {
          type: 'audio',
          title,
          content: '',
          metadata: meta,
        });
        setEventData({
          ...eventData,
          nodes: [...eventData.nodes, created],
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleVideoFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventData) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        const title = file.name.replace(/\.[^/.]+$/, '') || `Video ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const created = await mobileApi.createNode(config.serverUrl, initialEvent.id, {
          type: 'video',
          title,
          content: base64,
        });
        setEventData({
          ...eventData,
          nodes: [...eventData.nodes, created],
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDuplicateNode = async (node: CanvasNodeItem) => {
    if (!eventData) return;
    try {
      const copyTitle = node.title.endsWith(' (Copy)') ? node.title : `${node.title} (Copy)`;
      const created = await mobileApi.createNode(config.serverUrl, initialEvent.id, {
        type: node.type,
        title: copyTitle,
        content: node.content || null,
        xPosition: (node.xPosition || 100) + 40,
        yPosition: (node.yPosition || 100) + 40,
        dueDate: null, // Note: Strictly null by default!
        priority: node.priority || null,
        assignee: node.assignee || null,
        metadata: node.metadata || null,
      });
      setEventData((prev) => (prev ? { ...prev, nodes: [...prev.nodes, created] } : prev));
    } catch (err: any) {
      console.error('Failed to duplicate block:', err);
      alert('Failed to duplicate block: ' + err.message);
    }
  };

  // Native Audio Recording
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingSeconds(0);
      setIsRecordingAudio(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (base64Audio && eventData) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const title = `Voice Note (${timeStr})`;
            const metadataStr = JSON.stringify({
              audioUrl: base64Audio,
              audioName: `Mobile Voice Recording ${timeStr}`,
              summary: 'Quick voice memo captured on mobile companion app',
            });
            const created = await mobileApi.createNode(config.serverUrl, initialEvent.id, {
              type: 'audio',
              title,
              content: '',
              metadata: metadataStr,
            });
            setEventData({
              ...eventData,
              nodes: [...eventData.nodes, created],
            });
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecordingAudio(false);
      };

      mediaRecorder.start();
    } catch (err: any) {
      console.error('Audio recording failed:', err);
      alert('Could not access microphone: ' + err.message);
      setIsRecordingAudio(false);
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Play audio node
  const handlePlayAudio = (node: CanvasNodeItem) => {
    if (playingAudioId === node.id) {
      if (currentAudioElemRef.current) {
        currentAudioElemRef.current.pause();
      }
      setPlayingAudioId(null);
      setAudioPlaybackCurrentTime(0);
      return;
    }

    if (!node.metadata) return;
    try {
      const meta = JSON.parse(node.metadata);
      if (meta.audioUrl) {
        if (currentAudioElemRef.current) {
          currentAudioElemRef.current.pause();
        }
        const audio = new Audio(meta.audioUrl);
        currentAudioElemRef.current = audio;
        setPlayingAudioId(node.id);
        setAudioPlaybackCurrentTime(0);
        setAudioPlaybackDuration(0);

        audio.onloadedmetadata = () => {
          setAudioPlaybackDuration(audio.duration || 0);
        };
        audio.ontimeupdate = () => {
          setAudioPlaybackCurrentTime(audio.currentTime);
        };
        audio.onended = () => {
          setPlayingAudioId(null);
          setAudioPlaybackCurrentTime(0);
        };
        audio.onerror = () => {
          setPlayingAudioId(null);
          setAudioPlaybackCurrentTime(0);
        };

        audio.play().catch(() => {
          setPlayingAudioId(null);
          setAudioPlaybackCurrentTime(0);
        });
      }
    } catch {}
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setAudioPlaybackCurrentTime(newTime);
    if (currentAudioElemRef.current) {
      currentAudioElemRef.current.currentTime = newTime;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const enablePriority = localStorage.getItem('eventspace_enable_priority') !== 'false';

  const getPriorityBadge = (priority?: string | null) => {
    if (!enablePriority) return null;
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/30">
            High
          </span>
        );
      case 'med':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30">
            Med
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/30">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const getNodeTypeBadge = (type: NodeType) => {
    switch (type) {
      case 'task':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Task</span>;
      case 'chaser':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Chaser</span>;
      case 'info':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Info</span>;
      case 'venue':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">Venue</span>;
      case 'picture':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Picture</span>;
      case 'audio':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Audio</span>;
      case 'video':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">Video</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">Note</span>;
    }
  };

  const getCardBorderClass = (type: NodeType) => {
    switch (type) {
      case 'task':
        return 'border-blue-400 dark:border-blue-600 bg-blue-50/20 dark:bg-blue-950/10 hover:border-blue-500';
      case 'chaser':
        return 'border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-500';
      case 'info':
        return 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-500';
      case 'venue':
        return 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10 hover:border-indigo-500';
      case 'picture':
        return 'border-rose-400 dark:border-rose-600 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-500';
      case 'audio':
        return 'border-purple-400 dark:border-purple-600 bg-purple-50/20 dark:bg-purple-950/10 hover:border-purple-500';
      case 'video':
        return 'border-orange-400 dark:border-orange-600 bg-orange-50/20 dark:bg-orange-950/10 hover:border-orange-500';
      default:
        return 'border-slate-300 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-900/10 hover:border-slate-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Hidden File Inputs for Picture/Audio/Video captures & uploads */}
      <input
        ref={pictureFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={pictureUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={audioUploadFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioUploadInputChange}
      />
      <input
        ref={videoCameraInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleVideoFileInputChange}
      />
      <input
        ref={videoUploadInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoFileInputChange}
      />

      {/* Top Header */}
      {(() => {
        const hasCustomColor = Boolean(initialEvent.color && initialEvent.color.trim() && !initialEvent.isCompleted);
        const isLightHeader = hasCustomColor && initialEvent.color ? getLuminance(initialEvent.color) > 0.6 : false;
        const isLightBg = isLightHeader;

        return (
          <header
            style={hasCustomColor ? { backgroundColor: initialEvent.color! } : undefined}
            className={`safe-top border-b px-4 py-3 shrink-0 shadow-sm backdrop-blur-md ${
              hasCustomColor
                ? isLightHeader
                  ? 'border-slate-900/15'
                  : 'border-white/20'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              {/* Back Button */}
              <button
                onClick={onBack}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm ${
                  hasCustomColor
                    ? isLightHeader
                      ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 border border-slate-900/20'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                }`}
                aria-label="Back to Events"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Event Title */}
              <div className="flex-1 min-w-0 px-1">
                <h1
                  className={`text-base tracking-tight truncate ${
                    hasCustomColor
                      ? isLightHeader
                        ? 'text-slate-900 font-bold'
                        : 'text-white font-bold'
                      : 'text-slate-900 dark:text-white font-black'
                  }`}
                >
                  {initialEvent.title}
                </h1>
                <div
                  className={`flex items-center gap-1.5 text-[11px] min-w-0 ${
                    hasCustomColor
                      ? isLightHeader
                        ? 'text-slate-800 font-medium'
                        : 'text-white/80 font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {initialEvent.department && (
                    <span
                      className={`truncate max-w-[120px] ${
                        hasCustomColor
                          ? isLightHeader
                            ? 'font-bold text-slate-900'
                            : 'font-bold text-white'
                          : 'font-semibold text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {initialEvent.department}
                    </span>
                  )}
                  {initialEvent.department && <span className="shrink-0">•</span>}
                  <span className="shrink-0">{eventData?.nodes?.length || 0} blocks</span>
                </div>
              </div>

              {/* Action Buttons: Friction Log, Theme Toggle, Schedule & Open in Web */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Dedicated Friction Log Button */}
                <button
                  type="button"
                  onClick={() => setIsFrictionLogOpen(true)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0 border relative ${
                    hasCustomColor
                      ? isLightHeader
                        ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 border border-slate-900/20'
                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Friction Log"
                  aria-label="Friction Log"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {unresolvedFrictionCount > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] flex items-center justify-center leading-none ${
                        hasCustomColor
                          ? isLightHeader
                            ? 'bg-slate-900 text-white font-extrabold shadow ring-1 ring-white/50'
                            : 'bg-white text-slate-900 font-extrabold shadow ring-1 ring-black/20'
                          : 'bg-rose-600 text-white font-bold ring-2 ring-white dark:ring-slate-900'
                      }`}
                    >
                      {unresolvedFrictionCount}
                    </span>
                  )}
                </button>

                {/* Quick theme cycle */}
                <button
                  type="button"
                  onClick={cycleTheme}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0 border ${
                    hasCustomColor
                      ? isLightHeader
                        ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 border border-slate-900/20'
                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border-slate-200 dark:border-slate-700'
                  }`}
                  title={`Theme: ${theme}`}
                  aria-label="Cycle theme"
                >
                  {theme === 'light' ? (
                    <Sun className={`w-4 h-4 ${hasCustomColor ? (isLightHeader ? 'text-amber-600' : 'text-amber-300') : 'text-amber-500'}`} />
                  ) : theme === 'high-contrast' ? (
                    <Contrast className={`w-4 h-4 ${hasCustomColor ? (isLightHeader ? 'text-blue-700' : 'text-blue-200') : 'text-blue-400'}`} />
                  ) : (
                    <Moon className={`w-4 h-4 ${hasCustomColor ? (isLightHeader ? 'text-indigo-700' : 'text-indigo-200') : 'text-indigo-400'}`} />
                  )}
                </button>

                {/* Schedule button: icon-only */}
                <button
                  onClick={() => onOpenAgenda(initialEvent.id)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0 border relative ${
                    hasCustomColor
                      ? isLightHeader
                        ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 border border-slate-900/20'
                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
                  }`}
                  title="Schedule / Agenda"
                  aria-label="Schedule / Agenda"
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  {totalAgendaCount > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] flex items-center justify-center leading-none ${
                        hasCustomColor
                          ? isLightHeader
                            ? 'bg-slate-900 text-white font-extrabold shadow'
                            : 'bg-white text-slate-900 font-extrabold shadow'
                          : 'bg-blue-600 text-white font-bold'
                      }`}
                    >
                      {totalAgendaCount}
                    </span>
                  )}
                </button>

                {/* Open in Web Canvas */}
                <button
                  onClick={handleOpenInWeb}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0 border ${
                    hasCustomColor
                      ? isLightHeader
                        ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 border border-slate-900/20'
                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Open event canvas on web"
                  aria-label="Open event canvas on web"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          </header>
        );
      })()}

      {/* Main Vertical Feed */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 safe-bottom">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Loading event blocks...</p>
          </div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center space-y-3">
            <AlertCircle className="w-7 h-7 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">Could Not Load Event</h3>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">{error}</p>
            </div>
            <button
              onClick={() => loadEventDetails()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* OVERARCHING CHECKLISTS SECTION (Collapsible) */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all">
              <div
                onClick={() => setIsChecklistsCollapsed(!isChecklistsCollapsed)}
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Overarching Checklists
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {eventData?.checklists?.filter((c) => c.isCompleted).length || 0} of{' '}
                      {eventData?.checklists?.length || 0} completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {isChecklistsCollapsed ? 'Expand' : 'Collapse'}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                    {isChecklistsCollapsed ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {!isChecklistsCollapsed && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/60">
                  {/* Grouped Checklist Items by Category */}
                  {eventData?.checklists && eventData.checklists.length > 0 ? (
                    <div className="space-y-4 pt-2">
                      {Array.from(new Set(eventData.checklists.map((c) => c.category || 'General'))).map((catName) => {
                        const catConfig = getCategoryConfig(catName);
                        const CatIcon = CATEGORY_ICON_MAP[catConfig.icon] || Sparkles;
                        const colorStyles = getCategoryColorClasses(catConfig.color);
                        const catItems = eventData.checklists.filter((c) => (c.category || 'General') === catName);
                        const completedCount = catItems.filter((c) => c.isCompleted).length;

                        return (
                          <div
                            key={catName}
                            className={`rounded-2xl border p-3 space-y-2.5 bg-slate-50/70 dark:bg-slate-800/40 ${colorStyles.border}`}
                          >
                            {/* Category Header with Full Title, Custom Icon & Color */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-lg ${colorStyles.bg} ${colorStyles.text} flex items-center justify-center shrink-0`}>
                                  <CatIcon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                    {catConfig.title}
                                  </h3>
                                  {catName !== catConfig.title && (
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                      {catName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700/80 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                                {completedCount}/{catItems.length}
                              </span>
                            </div>

                            {/* Checklist items in this category */}
                            <div className="space-y-1.5">
                              {catItems.map((chk) => (
                                <div
                                  key={chk.id}
                                  className="flex items-start justify-between gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 transition-colors"
                                >
                                  <button
                                    onClick={() => handleToggleChecklist(chk)}
                                    className="mt-0.5 text-slate-400 hover:text-blue-500 transition-colors shrink-0"
                                  >
                                    {chk.isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                                    ) : (
                                      <Circle className="w-4 h-4" />
                                    )}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <span
                                      className={`text-sm font-medium leading-snug block ${
                                        chk.isCompleted
                                          ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                                          : 'text-slate-800 dark:text-slate-100'
                                      }`}
                                    >
                                      {chk.content}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleDeleteChecklistItem(chk.id)}
                                    className="text-slate-400 hover:text-rose-500 p-1 shrink-0"
                                    title="Delete checklist item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-2 italic text-center">
                      No checklist items added yet.
                    </p>
                  )}

                  {/* Add Checklist Item Form */}
                  <form onSubmit={handleAddChecklistItem} className="pt-1 flex gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-2 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
                    >
                      {checklistCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      {!checklistCategories.includes('Audio') && <option value="Audio">Audio</option>}
                      {!checklistCategories.includes('Lighting') && <option value="Lighting">Lighting</option>}
                      {!checklistCategories.includes('Logistics') && <option value="Logistics">Logistics</option>}
                    </select>

                    <input
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      placeholder="Add checklist item..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={!newChecklistText.trim()}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-50 shadow-sm shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </section>

            {/* QUICK CAPTURE SECTION (Horizontal Building Blocks Carousel) */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2.5 relative">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Quick Capture (Building Blocks)
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">Scroll to explore</span>
              </div>

              {/* Relative wrapper for horizontal carousel and edge indicators */}
              <div className="relative">
                {/* Left Scroll Indicator Badge */}
                {qcHiddenLeftCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      quickCaptureScrollRef.current?.scrollBy({ left: -90, behavior: 'smooth' });
                      setTimeout(updateQcScrollCounts, 250);
                    }}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 pl-1.5 pr-2 py-1 rounded-full bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-xl border border-white/20 dark:border-slate-800 text-[10px] font-black backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title={`${qcHiddenLeftCount} block${qcHiddenLeftCount > 1 ? 's' : ''} to the left. Tap to scroll`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{qcHiddenLeftCount}</span>
                  </button>
                )}

                {/* Right Scroll Indicator Badge */}
                {qcHiddenRightCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      quickCaptureScrollRef.current?.scrollBy({ left: 90, behavior: 'smooth' });
                      setTimeout(updateQcScrollCounts, 250);
                    }}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 pl-2 pr-1.5 py-1 rounded-full bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-xl border border-white/20 dark:border-slate-800 text-[10px] font-black backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title={`${qcHiddenRightCount} more block${qcHiddenRightCount > 1 ? 's' : ''} to the right. Tap to scroll`}
                  >
                    <span>+{qcHiddenRightCount}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Horizontal Carousel */}
                <div
                  ref={quickCaptureScrollRef}
                  onScroll={updateQcScrollCounts}
                  className="flex flex-row overflow-x-auto no-scrollbar scroll-smooth px-0.5 py-1"
                >
                  <div className="flex flex-row gap-2 min-w-max mx-auto">
                    {/* 1. Task */}
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultBlockType('task');
                        setEditingNode(null);
                        setIsBlockModalOpen(true);
                      }}
                      className="quick-capture-carousel-card w-20 h-20 min-w-[80px] max-w-[80px] aspect-square rounded-2xl p-2 bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 leading-none">
                        Task
                      </span>
                    </button>

                    {/* 2. Chaser */}
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultBlockType('chaser');
                        setEditingNode(null);
                        setIsBlockModalOpen(true);
                      }}
                      className="quick-capture-carousel-card w-20 h-20 min-w-[80px] max-w-[80px] aspect-square rounded-2xl p-2 bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 leading-none">
                        Chaser
                      </span>
                    </button>

                    {/* 3. Info */}
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultBlockType('info');
                        setEditingNode(null);
                        setIsBlockModalOpen(true);
                      }}
                      className="quick-capture-carousel-card w-20 h-20 min-w-[80px] max-w-[80px] aspect-square rounded-2xl p-2 bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                        <Info className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 leading-none">
                        Info
                      </span>
                    </button>

                    {/* 4. Venue */}
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultBlockType('venue');
                        setEditingNode(null);
                        setIsBlockModalOpen(true);
                      }}
                      className="quick-capture-carousel-card w-20 h-20 min-w-[80px] max-w-[80px] aspect-square rounded-2xl p-2 bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 leading-none">
                        Venue
                      </span>
                    </button>

                    {/* 5. Picture */}
                    <button
                      type="button"
                      onClick={() => setMediaPromptType('picture')}
                      className="quick-capture-carousel-card w-20 h-20 min-w-[80px] max-w-[80px] aspect-square rounded-2xl p-2 bg-rose-50/80 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-none">
                        Picture
                      </span>
                    </button>

                    {/* 6. Audio */}
                    <button
                      type="button"
                      onClick={isRecordingAudio ? stopRecordingAudio : () => setMediaPromptType('audio')}
                      className={`quick-capture-carousel-card w-20 h-20 min-w-[80px] max-w-[80px] aspect-square rounded-2xl p-2 border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm ${
                        isRecordingAudio
                          ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse'
                          : 'bg-purple-50/80 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-purple-200/80 dark:border-purple-900/60 text-purple-700 dark:text-purple-300'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isRecordingAudio
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        {isRecordingAudio ? (
                          <Square className="w-4 h-4 fill-white" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs font-bold leading-none truncate max-w-full">
                        {isRecordingAudio ? formatSeconds(recordingSeconds) : 'Audio'}
                      </span>
                    </button>

                    {/* 7. Video */}
                    <button
                      type="button"
                      onClick={() => setMediaPromptType('video')}
                      className="quick-capture-carousel-card w-20 h-20 min-w-[80px] max-w-[80px] aspect-square rounded-2xl p-2 bg-orange-50/80 hover:bg-orange-100/80 dark:bg-orange-950/30 dark:hover:bg-orange-950/50 border border-orange-200/80 dark:border-orange-900/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/60 flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400">
                        <Video className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-orange-700 dark:text-orange-300 leading-none">
                        Video
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {isRecordingAudio && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Recording Voice Note ({formatSeconds(recordingSeconds)})</span>
                  </div>
                  <button
                    onClick={stopRecordingAudio}
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-sm"
                  >
                    Done & Save
                  </button>
                </div>
              )}
            </div>

            {/* BUILDING BLOCKS VERTICAL FEED */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Building Blocks ({eventData?.nodes?.filter((n) => (hideCompleted ? !n.isCompleted : true)).length || 0})
                </span>
                <div className="flex items-center gap-2">
                  {/* Global Hide Completed toggle */}
                  <button
                    type="button"
                    onClick={toggleHideCompleted}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      hideCompleted
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                    title={hideCompleted ? 'Showing incomplete blocks only' : 'Hide completed blocks and subtasks'}
                  >
                    {hideCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{hideCompleted ? 'Hiding Completed' : 'Hide Completed'}</span>
                  </button>

                  <button
                    onClick={() => loadEventDetails(true)}
                    disabled={isRefreshing}
                    className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              {(!eventData?.nodes || eventData.nodes.length === 0) ? (
                <div className="py-12 text-center space-y-3 bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Building Blocks Yet</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Use the Quick Capture buttons above to add Tasks, Notes, Photos, or Voice Memos.
                    </p>
                  </div>
                </div>
              ) : (
                eventData.nodes
                  .filter((n) => (hideCompleted ? !n.isCompleted : true))
                  .map((node) => {
                  // Find connected incoming and outgoing links
                  const incomingEdges = eventData.edges?.filter((e) => e.targetId === node.id) || [];
                  const outgoingEdges = eventData.edges?.filter((e) => e.sourceId === node.id) || [];

                  // Subtasks parser
                  let subtasksList: Subtask[] = [];
                  let nodeMetadataObj: any = {};
                  if (node.metadata) {
                    try {
                      nodeMetadataObj = JSON.parse(node.metadata);
                      if (Array.isArray(nodeMetadataObj.subtasks)) {
                        subtasksList = nodeMetadataObj.subtasks;
                      }
                    } catch {}
                  }

                  const isNonCheckable = (s: Subtask) =>
                    ['bullet', 'dot', 'dash', 'arrow', 'starred'].includes(
                      (s as any).style || (s as any).bulletStyle || (s as any).checkboxStyle || ''
                    );
                  const displayedSubtasks = hideCompleted
                    ? subtasksList.filter((s) => isNonCheckable(s) || !s.done)
                    : subtasksList;

                  const formattedDate = node.dueDate
                    ? new Date(node.dueDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : null;

                  return (
                    <div
                      key={node.id}
                      className={`p-4 rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-sm transition-all space-y-3 ${getCardBorderClass(
                        node.type
                      )}`}
                    >
                      {/* Top Bar: Type, Priority, Date, Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getNodeTypeBadge(node.type)}
                          {getPriorityBadge(node.priority)}
                          {formattedDate && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formattedDate}</span>
                            </span>
                          )}
                          {node.assignee && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{node.assignee}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDuplicateNode(node)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-colors"
                            title="Duplicate block"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingNode(node);
                              setDefaultBlockType(node.type);
                              setIsBlockModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
                            title="Edit block"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors"
                            title="Delete block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Global Completion Checkbox for ALL Blocks */}
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => handleToggleNodeCompleted(node)}
                          className="mt-1 text-slate-400 hover:text-blue-500 shrink-0 transition-colors"
                          title={node.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                        >
                          {node.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400 hover:text-blue-500" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-lg font-semibold leading-snug break-all [overflow-wrap:anywhere] min-w-0 ${
                              node.isCompleted
                                ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {node.title}
                          </h3>

                          {/* Node Content / Description with Markdown Tables */}
                          {node.content && node.type !== 'picture' && (
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 break-all [overflow-wrap:anywhere] min-w-0 leading-relaxed">
                              <ContentWithTables content={node.content} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subtasks (if any, filtered by hideCompleted) */}
                      {displayedSubtasks.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                            Subtasks ({subtasksList.filter((s) => !isNonCheckable(s) && s.done).length}/{subtasksList.filter((s) => !isNonCheckable(s)).length})
                          </span>
                          {displayedSubtasks.map((st, idx) => {
                            const subtaskText = st.label || st.text || 'Untitled note';
                            const subStyle = (st as any).style || (st as any).bulletStyle || (st as any).checkboxStyle || 'circle';
                            const isBulletStyle = ['bullet', 'dot', 'dash', 'arrow', 'starred'].includes(subStyle);
                            const formattedSubDate = st.dueDate
                              ? new Date(st.dueDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : null;

                            const isEditing = editingSubtaskKey === `${node.id}-${idx}`;

                            return (
                              <div
                                key={st.id || idx}
                                onClick={() => !isBulletStyle && !isEditing && handleToggleSubtask(node, idx)}
                                className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors ${
                                  isBulletStyle || isEditing
                                    ? 'cursor-default'
                                    : 'cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/40'
                                }`}
                              >
                                {/* Indicator */}
                                {isBulletStyle ? (
                                  subStyle === 'starred' ? (
                                    <div className="w-4 h-[20px] flex items-center justify-center shrink-0">
                                      <Star className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 fill-current" />
                                    </div>
                                  ) : subStyle === 'dash' ? (
                                    <div className="w-4 h-[20px] flex items-center justify-center shrink-0 font-bold text-slate-400 dark:text-slate-500 text-xs select-none">
                                      —
                                    </div>
                                  ) : subStyle === 'arrow' ? (
                                    <div className="w-4 h-[20px] flex items-center justify-center shrink-0 font-bold text-slate-400 dark:text-slate-500 text-xs select-none">
                                      →
                                    </div>
                                  ) : (
                                    <div className="w-4 h-[20px] flex items-center justify-center shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                                    </div>
                                  )
                                ) : subStyle === 'square' ? (
                                  <div className="w-4 h-[20px] text-slate-400 shrink-0 flex items-center justify-center">
                                    {st.done ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-400 rounded" />
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-4 h-[20px] text-slate-400 shrink-0 flex items-center justify-center">
                                    {st.done ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-slate-400 rounded-full" />
                                    )}
                                  </div>
                                )}

                                {isEditing ? (
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={editingSubtaskText}
                                      onChange={(e) => setEditingSubtaskText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveInlineSubtask(node, idx);
                                        } else if (e.key === 'Escape') {
                                          setEditingSubtaskKey(null);
                                        }
                                      }}
                                      className="flex-1 min-w-0 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-blue-500 text-xs text-slate-900 dark:text-white focus:outline-none ring-1 ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveInlineSubtask(node, idx)}
                                      className="w-5 h-5 flex items-center justify-center rounded bg-emerald-600 text-white shrink-0"
                                      title="Save text"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSubtaskKey(null)}
                                      className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSubtaskKey(`${node.id}-${idx}`);
                                        setEditingSubtaskText(subtaskText);
                                      }}
                                      className={`text-xs flex-1 break-all [overflow-wrap:anywhere] min-w-0 leading-[20px] cursor-pointer hover:text-blue-500 transition-colors ${
                                        isBulletStyle
                                          ? 'text-slate-700 dark:text-slate-300 font-normal'
                                          : st.done
                                          ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                                          : 'text-slate-800 dark:text-slate-200 font-medium'
                                      }`}
                                      title="Tap to edit subtask"
                                    >
                                      <AutoLinkText text={subtaskText} />
                                    </span>

                                    {formattedSubDate && (
                                      <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 shrink-0 mt-0.5">
                                        {formattedSubDate}
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSubtaskKey(`${node.id}-${idx}`);
                                        setEditingSubtaskText(subtaskText);
                                      }}
                                      className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-blue-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors shrink-0 mt-0.5"
                                      title="Edit subtask text"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Venue Node Logistics Card (Venue Parity) */}
                      {node.type === 'venue' && (
                        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2 text-xs">
                          {nodeMetadataObj.location && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Location
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {nodeMetadataObj.location}
                                </span>
                              </div>
                            </div>
                          )}

                          {(nodeMetadataObj.setupTime || nodeMetadataObj.teardownTime) && (
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                              {nodeMetadataObj.setupTime && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Setup</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {nodeMetadataObj.setupTime}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {nodeMetadataObj.teardownTime && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Teardown</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {nodeMetadataObj.teardownTime}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {nodeMetadataObj.contactPerson && (
                            <div className="flex items-center gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                              <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <div>
                                <span className="text-[10px] text-slate-400 block">Contact</span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {nodeMetadataObj.contactPerson}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Video Node Player / Embed */}
                      {node.type === 'video' && node.content && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center">
                          {node.content.includes('youtube.com') || node.content.includes('youtu.be') ? (
                            <iframe
                              src={node.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                              className="w-full h-full border-0"
                              allowFullScreen
                              title={node.title}
                            />
                          ) : node.content.includes('vimeo.com') ? (
                            <iframe
                              src={`https://player.vimeo.com/video/${node.content.split('/').pop()}`}
                              className="w-full h-full border-0"
                              allowFullScreen
                              title={node.title}
                            />
                          ) : (
                            <video
                              src={node.content}
                              controls
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                      )}

                      {/* Picture Node Content */}
                      {node.type === 'picture' && node.content && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={node.content}
                            alt={node.title}
                            onClick={() => setPreviewImage(node.content || null)}
                            className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          />
                        </div>
                      )}

                      {/* Audio Node Player */}
                      {node.type === 'audio' && nodeMetadataObj.audioUrl && (
                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handlePlayAudio(node)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                            >
                              {playingAudioId === node.id ? (
                                <>
                                  <Pause className="w-3.5 h-3.5 fill-white" />
                                  <span>Pause Audio</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                  <span>Play Recording</span>
                                </>
                              )}
                            </button>
                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                              <Volume2 className="w-3.5 h-3.5" />
                              Voice Memo
                            </span>
                          </div>

                          {/* Audio Seekbar: Conditionally rendered ONLY when audio is actively playing */}
                          {playingAudioId === node.id && (
                            <div className="pt-1.5 space-y-1 animate-fadeIn">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={audioPlaybackDuration > 0 ? audioPlaybackDuration : 100}
                                  step="0.1"
                                  value={audioPlaybackCurrentTime}
                                  onChange={handleAudioSeek}
                                  className="w-full h-1.5 bg-purple-200 dark:bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-purple-700/70 dark:text-purple-300/70 font-mono">
                                <span>{formatSeconds(Math.floor(audioPlaybackCurrentTime))}</span>
                                <span>
                                  {audioPlaybackDuration > 0
                                    ? formatSeconds(Math.floor(audioPlaybackDuration))
                                    : '--:--'}
                                </span>
                              </div>
                            </div>
                          )}

                          {nodeMetadataObj.summary && (
                            <div className="text-[11px] text-purple-900/90 dark:text-purple-200/90 pt-1">
                              {nodeMetadataObj.summary.includes('•') ? (
                                <ul className="space-y-1">
                                  {nodeMetadataObj.summary
                                    .split('\n')
                                    .filter((line: string) => line.trim())
                                    .map((line: string, idx: number) => (
                                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
                                        <span className="text-purple-500 font-bold shrink-0">•</span>
                                        <span>{line.replace(/^[•\-\*]\s*/, '')}</span>
                                      </li>
                                    ))}
                                </ul>
                              ) : (
                                <p className="italic leading-snug">"{nodeMetadataObj.summary}"</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SIMPLIFIED CONNECTORS (Collapsible Section) */}
                      {(incomingEdges.length > 0 || outgoingEdges.length > 0) && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleConnections(node.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/70 transition-colors"
                          >
                            <LinkIcon className="w-3 h-3 text-blue-500" />
                            <span>Connections ({incomingEdges.length + outgoingEdges.length})</span>
                            <ChevronDown
                              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                                expandedConnections[node.id] ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {expandedConnections[node.id] && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 animate-fadeIn">
                              {/* Incoming connections */}
                              {incomingEdges.map((edge) => {
                                const sourceNode = nodeMap.get(edge.sourceId);
                                const sourceTitle = sourceNode?.title || 'Connected Block';
                                return (
                                  <div
                                    key={edge.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                                  >
                                    <ArrowLeftIcon className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span>Receives from:</span>
                                    <span className="font-bold underline decoration-indigo-400/40">
                                      {sourceTitle}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Outgoing connections */}
                              {outgoingEdges.map((edge) => {
                                const targetNode = nodeMap.get(edge.targetId);
                                const targetTitle = targetNode?.title || 'Connected Block';
                                return (
                                  <div
                                    key={edge.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                                  >
                                    <LinkIcon className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span>Linked to:</span>
                                    <span className="font-bold underline decoration-blue-400/40">
                                      {targetTitle}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* Block Create/Edit Modal */}
      <BlockModal
        key={editingNode ? editingNode.id : 'new-node'}
        isOpen={isBlockModalOpen}
        onClose={() => {
          setIsBlockModalOpen(false);
          setEditingNode(null);
        }}
        onSave={handleSaveBlock}
        onDuplicate={handleDuplicateNode}
        serverUrl={config.serverUrl}
        initialNode={editingNode}
        defaultType={defaultBlockType}
      />

      {/* Media Quick Capture Prompts Modal (Upload vs Take New) */}
      {mediaPromptType && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMediaPromptType(null)}
        >
          <div
            className="w-full sm:max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slideUp text-slate-900 dark:text-white safe-bottom shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {mediaPromptType === 'picture' && <Camera className="w-5 h-5 text-rose-500" />}
                {mediaPromptType === 'audio' && <Mic className="w-5 h-5 text-purple-500" />}
                {mediaPromptType === 'video' && <Video className="w-5 h-5 text-orange-500" />}
                <h3 className="text-sm font-bold capitalize">
                  {mediaPromptType === 'picture'
                    ? 'Picture Capture'
                    : mediaPromptType === 'audio'
                    ? 'Audio Memo'
                    : 'Video Capture'}
                </h3>
              </div>
              <button
                onClick={() => setMediaPromptType(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {mediaPromptType === 'picture' && (
                <>
                  <button
                    onClick={() => {
                      setMediaPromptType(null);
                      handleSnapPicture();
                    }}
                    className="w-full p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-rose-500" />
                    <span>Take New Photo</span>
                  </button>
                  <button
                    onClick={() => {
                      setMediaPromptType(null);
                      pictureUploadInputRef.current?.click();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span>Upload Photo</span>
                  </button>
                </>
              )}

              {mediaPromptType === 'audio' && (
                <>
                  <button
                    onClick={() => {
                      setMediaPromptType(null);
                      startRecordingAudio();
                    }}
                    className="w-full p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <Mic className="w-4 h-4 text-purple-500" />
                    <span>Record Voice Note (Take New)</span>
                  </button>
                  <button
                    onClick={() => {
                      setMediaPromptType(null);
                      audioUploadFileInputRef.current?.click();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-slate-500" />
                    <span>Upload Audio File</span>
                  </button>
                </>
              )}

              {mediaPromptType === 'video' && (
                <>
                  <button
                    onClick={() => {
                      setMediaPromptType(null);
                      setDefaultBlockType('video');
                      setEditingNode(null);
                      setIsBlockModalOpen(true);
                    }}
                    className="w-full p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-900/60 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-orange-500" />
                    <span>Embed Video (URL)</span>
                  </button>
                  <button
                    onClick={() => {
                      setMediaPromptType(null);
                      videoCameraInputRef.current?.click();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <Video className="w-4 h-4 text-orange-500" />
                    <span>Take New Video</span>
                  </button>
                  <button
                    onClick={() => {
                      setMediaPromptType(null);
                      videoUploadInputRef.current?.click();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Upload Video File</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setMediaPromptType(null)}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Picture Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Friction Log Modal / Slide-over Drawer */}
      {isFrictionLogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setIsFrictionLogOpen(false)}
        >
          <div
            className="w-full sm:max-w-xl max-h-[88vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Friction Log
                    </h2>
                    {unresolvedFrictionCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                        {unresolvedFrictionCount} Unresolved
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Obstacles & issues recorded for {initialEvent.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFrictionLogOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs & Log Creation Action */}
            <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFrictionFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    frictionFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All ({frictionLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFrictionFilter('unresolved')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    frictionFilter === 'unresolved'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Open ({unresolvedFrictionCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFrictionFilter('resolved')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    frictionFilter === 'resolved'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Resolved ({frictionLogs.length - unresolvedFrictionCount})
                </button>
              </div>

              {!isViewer && !isAddingFriction && (
                <button
                  type="button"
                  onClick={() => setIsAddingFriction(true)}
                  className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Issue</span>
                </button>
              )}
            </div>

            {/* Read-Only Notice for Viewers */}
            {isViewer && (
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>You have read-only access (Viewer role). Logging and resolving controls are disabled.</span>
              </div>
            )}

            {/* Friction Creation Form (if open & !isViewer) */}
            {!isViewer && isAddingFriction && (
              <form
                onSubmit={handleCreateFrictionLog}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    + Log New Friction Issue
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingFriction(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>

                <input
                  type="text"
                  value={newFrictionTitle}
                  onChange={(e) => setNewFrictionTitle(e.target.value)}
                  placeholder="Issue title (e.g. Broken XLR feed, Catering delay)..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  autoFocus
                />

                <textarea
                  value={newFrictionDesc}
                  onChange={(e) => setNewFrictionDesc(e.target.value)}
                  placeholder="Description or context (optional)..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Severity:</span>
                    {(['none', 'low', 'medium', 'critical'] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setNewFrictionSeverity(sev)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all border ${
                          newFrictionSeverity === sev
                            ? sev === 'critical'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : sev === 'medium'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : sev === 'low'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-600 text-white border-slate-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={!newFrictionTitle.trim() || isSubmittingFriction}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    {isSubmittingFriction ? 'Logging...' : 'Submit Log'}
                  </button>
                </div>
              </form>
            )}

            {/* List of Friction Logs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredFrictionLogs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {frictionFilter === 'unresolved'
                      ? 'No open friction points! Everything is running smoothly.'
                      : frictionFilter === 'resolved'
                      ? 'No resolved friction logs yet.'
                      : 'No friction logs recorded for this event.'}
                  </p>
                  {!isViewer && !isAddingFriction && (
                    <button
                      type="button"
                      onClick={() => setIsAddingFriction(true)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1 inline-block"
                    >
                      + Log a friction issue
                    </button>
                  )}
                </div>
              ) : (
                filteredFrictionLogs.map((log) => {
                  const severityBadgeClass =
                    log.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-500/30'
                      : log.severity === 'medium'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : log.severity === 'low'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';

                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                        log.resolved
                          ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75'
                          : log.severity === 'critical'
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${severityBadgeClass}`}>
                            {log.severity}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                              log.resolved
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {log.resolved ? 'Resolved' : 'Open'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {!isViewer && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleResolveFriction(log)}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border ${
                                log.resolved
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                  : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs'
                              }`}
                              title={log.resolved ? 'Reopen issue' : 'Mark as resolved'}
                            >
                              <Check className="w-3 h-3" />
                              <span className="text-[10px]">{log.resolved ? 'Reopen' : 'Resolve'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFrictionLog(log.id)}
                              className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4
                          className={`text-xs font-bold ${
                            log.resolved
                              ? 'line-through text-slate-500 dark:text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {log.title}
                        </h4>
                        {log.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                            <AutoLinkText text={log.description} />
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
