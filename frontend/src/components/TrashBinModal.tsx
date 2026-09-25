import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Layers,
  ListChecks,
  Calendar,
  Loader2,
  CheckCircle2,
  Camera,
  Volume2,
  Mic,
  Image as ImageIcon,
  FileText,
  CheckSquare,
  Clock,
  HelpCircle,
  FolderKanban,
} from 'lucide-react';
import { api } from '../services/api';

interface TrashBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemRestored: () => void;
}

export const TrashBinModal: React.FC<TrashBinModalProps> = ({
  isOpen,
  onClose,
  onItemRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'nodes' | 'checklists'>('all');
  const [trashData, setTrashData] = useState<{
    events: any[];
    nodes: any[];
    checklists: any[];
    totalCount: number;
  }>({ events: [], nodes: [], checklists: [], totalCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchTrash = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTrash();
      setTrashData(data);
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestore = async (type: 'event' | 'node' | 'checklist', id: string) => {
    setActioningId(id);
    try {
      await api.restoreTrashItem(type, id);
      await fetchTrash();
      onItemRestored();
    } catch (err) {
      console.error('Failed to restore item:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handlePermanentDelete = async (type: 'event' | 'node' | 'checklist', id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      return;
    }
    setActioningId(id);
    try {
      await api.permanentlyDeleteTrashItem(type, id);
      await fetchTrash();
      onItemRestored();
    } catch (err) {
      console.error('Failed to delete item permanently:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Are you sure you want to empty the Trash Bin? All deleted items will be permanently erased.')) {
      return;
    }
    setIsLoading(true);
    try {
      await api.emptyTrash();
      await fetchTrash();
      onItemRestored();
    } catch (err) {
      console.error('Failed to empty trash:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = [
    ...(activeTab === 'all' || activeTab === 'events'
      ? trashData.events.map((e) => ({ ...e, trashType: 'event' as const }))
      : []),
    ...(activeTab === 'all' || activeTab === 'nodes'
      ? trashData.nodes.map((n) => ({ ...n, trashType: 'node' as const }))
      : []),
    ...(activeTab === 'all' || activeTab === 'checklists'
      ? trashData.checklists.map((c) => ({ ...c, trashType: 'checklist' as const }))
      : []),
  ].sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());

  const renderMediaThumbnailOrIcon = (item: any) => {
    if (item.trashType === 'event') {
      return (
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
          <Calendar className="w-5 h-5" />
        </div>
      );
    }

    if (item.trashType === 'checklist') {
      return (
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <ListChecks className="w-5 h-5" />
        </div>
      );
    }

    // Node types
    switch (item.type) {
      case 'picture': {
        const hasImage = Boolean(item.content && item.content.startsWith('data:image'));
        if (hasImage) {
          return (
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 shrink-0 shadow-sm">
              <img
                src={item.content}
                alt={item.title || 'Photo thumbnail'}
                className="w-full h-full object-cover"
              />
            </div>
          );
        }
        return (
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Camera className="w-5 h-5" />
          </div>
        );
      }
      case 'audio':
        return (
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20 shadow-sm">
            <Volume2 className="w-5 h-5" />
          </div>
        );
      case 'chaser':
        return (
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        );
      case 'info':
        return (
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <HelpCircle className="w-5 h-5" />
          </div>
        );
      case 'note':
        return (
          <div className="w-12 h-12 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center shrink-0 border border-slate-500/20">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'task':
      default:
        return (
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <CheckSquare className="w-5 h-5" />
          </div>
        );
    }
  };

  const getItemTitleAndSubtitle = (item: any) => {
    let title = '';
    let subtitle: string | null = null;

    if (item.trashType === 'event') {
      title = item.title || 'Untitled Event';
      subtitle = item.department ? `Department: ${item.department}` : null;
    } else if (item.trashType === 'checklist') {
      title = item.content || 'Checklist Item';
      subtitle = item.category ? `Category: ${item.category}` : null;
    } else {
      // Node
      if (item.type === 'picture') {
        title = item.title || 'Event Photo';
        subtitle = 'Image File';
      } else if (item.type === 'audio') {
        title = item.title || 'Voice Note';
        let summary = '';
        if (item.metadata) {
          try {
            const meta = JSON.parse(item.metadata);
            summary = meta.summary || meta.audioName || '';
          } catch {}
        }
        subtitle = summary ? `Memo: "${summary}"` : 'Audio Recording';
      } else {
        title = item.title || 'Untitled Block';
        if (item.content) {
          subtitle = item.content.length > 70 ? item.content.slice(0, 67) + '...' : item.content;
        }
      }
    }

    return { title, subtitle };
  };

  const getItemTypeBadge = (item: any) => {
    if (item.trashType === 'event') {
      return (
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          Event
        </span>
      );
    }

    if (item.trashType === 'checklist') {
      return (
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Checklist
        </span>
      );
    }

    // Node
    switch (item.type) {
      case 'picture':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <Camera className="w-3 h-3" />
            <span>Picture</span>
          </span>
        );
      case 'audio':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            <span>Audio</span>
          </span>
        );
      case 'chaser':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Chaser
          </span>
        );
      case 'info':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Info
          </span>
        );
      case 'note':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            Note
          </span>
        );
      case 'task':
      default:
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Task
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Trash Bin
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Restore soft-deleted events, blocks, photos, audio, or checklists
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trashData.totalCount > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
              >
                Empty Trash
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Items ({trashData.totalCount})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Events ({trashData.events.length})
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'nodes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Blocks & Media ({trashData.nodes.length})
          </button>
          <button
            onClick={() => setActiveTab('checklists')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'checklists'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Checklists ({trashData.checklists.length})
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Loading deleted items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Trash Bin is Empty
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Items you delete will be held here so you can undo or permanently erase them.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isActioning = actioningId === item.id;
              const { title, subtitle } = getItemTitleAndSubtitle(item);
              const parentEvent = item.event?.title;

              return (
                <div
                  key={`${item.trashType}-${item.id}`}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  {/* Thumbnail / Indicator */}
                  {renderMediaThumbnailOrIcon(item)}

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getItemTypeBadge(item)}
                      {item.category && item.trashType !== 'checklist' && (
                        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                          {item.category}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {title}
                    </div>

                    {subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {subtitle}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      {parentEvent && <span>Event: {parentEvent}</span>}
                      {item.deletedAt && (
                        <span>
                          Deleted: {new Date(item.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleRestore(item.trashType, item.id)}
                      disabled={isActioning}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Restore to canvas"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item.trashType, item.id)}
                      disabled={isActioning}
                      className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
