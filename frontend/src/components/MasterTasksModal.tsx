import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { MasterTasksResponse } from '../types';
import {
  X,
  Calendar,
  CheckCircle2,
  Circle,
  Layers,
  Clock,
  CalendarDays,
  Search,
  Building2,
  CheckSquare,
} from 'lucide-react';

interface MasterTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (id: string) => void;
  onTaskToggled?: () => void;
  onLocateNode?: (nodeId: string, eventId: string) => void;
}

interface AgendaItem {
  id: string;
  isSubtask: boolean;
  parentTaskId?: string;
  parentTaskTitle?: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  type: 'task' | 'chaser' | 'subtask';
  event: {
    id: string;
    title: string;
    department: string | null;
    priority: string | null;
  };
  node: MasterTasksResponse['taskNodes'][0];
}

export const MasterTasksModal: React.FC<MasterTasksModalProps> = ({
  isOpen,
  onClose,
  onSelectEvent,
  onTaskToggled,
  onLocateNode,
}) => {
  const [data, setData] = useState<MasterTasksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [agendaSearch, setAgendaSearch] = useState('');

  const fetchTasks = useCallback(() => {
    setIsLoading(true);
    api
      .getMasterTasks(includeCompleted)
      .then((res) => {
        setData(res);
      })
      .catch((err) => console.error('Failed to load schedule agenda tasks:', err))
      .finally(() => {
        setIsLoading(false);
      });
  }, [includeCompleted]);

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, fetchTasks]);

  const handleToggleNodeTask = async (task: MasterTasksResponse['taskNodes'][0]) => {
    const newStatus = !task.isCompleted;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        taskNodes: prev.taskNodes.map((t) =>
          t.id === task.id ? { ...t, isCompleted: newStatus } : t
        ),
      };
    });

    try {
      await api.updateNode(task.event.id, task.id, { isCompleted: newStatus });
      if (onTaskToggled) onTaskToggled();
      if (!includeCompleted) fetchTasks();
    } catch (err) {
      console.error('Failed to toggle task in agenda:', err);
      fetchTasks();
    }
  };

  const handleToggleSubtask = async (
    task: MasterTasksResponse['taskNodes'][0],
    subtaskId: string
  ) => {
    let currentSubtasks: { id: string; label: string; done: boolean; dueDate?: string | null }[] = [];
    let metaObj: any = {};
    if (task.metadata) {
      try {
        metaObj = JSON.parse(task.metadata);
        if (Array.isArray(metaObj.subtasks)) {
          currentSubtasks = metaObj.subtasks;
        }
      } catch {}
    }

    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    const updatedMeta = JSON.stringify({ ...metaObj, subtasks: updatedSubtasks });

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        taskNodes: prev.taskNodes.map((t) =>
          t.id === task.id ? { ...t, metadata: updatedMeta } : t
        ),
      };
    });

    try {
      await api.updateNode(task.event.id, task.id, { metadata: updatedMeta });
      if (onTaskToggled) onTaskToggled();
      if (!includeCompleted) fetchTasks();
    } catch (err) {
      console.error('Failed to toggle subtask in agenda:', err);
      fetchTasks();
    }
  };

  // STRICT REQUIREMENT: ONLY show items (tasks, subtasks, chasers) that have a date attached!
  const agendaItems = useMemo<AgendaItem[]>(() => {
    const list: AgendaItem[] = [];
    if (!data?.taskNodes) return list;

    for (const task of data.taskNodes) {
      // 1. Main task/chaser node (if it has a dueDate attached)
      if (task.dueDate) {
        if (includeCompleted || !task.isCompleted) {
          list.push({
            id: task.id,
            isSubtask: false,
            title: task.title,
            dueDate: task.dueDate,
            isCompleted: task.isCompleted,
            type: task.type === 'chaser' ? 'chaser' : 'task',
            event: task.event,
            node: task,
          });
        }
      }

      // 2. Individual subtasks (if they have a dueDate attached)
      if (task.metadata) {
        try {
          const meta = JSON.parse(task.metadata);
          if (Array.isArray(meta.subtasks)) {
            for (const st of meta.subtasks) {
              if (st.dueDate) {
                if (includeCompleted || !st.done) {
                  list.push({
                    id: `${task.id}_st_${st.id}`,
                    isSubtask: true,
                    parentTaskId: task.id,
                    parentTaskTitle: task.title,
                    title: st.label,
                    dueDate: st.dueDate,
                    isCompleted: Boolean(st.done),
                    type: 'subtask',
                    event: task.event,
                    node: task,
                  });
                }
              }
            }
          }
        } catch {}
      }
    }

    // Sort chronologically
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [data?.taskNodes, includeCompleted]);

  // Filter agenda items by search
  const filteredAgenda = useMemo(() => {
    if (!agendaSearch.trim()) return agendaItems;
    const q = agendaSearch.toLowerCase().trim();
    return agendaItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.event.title.toLowerCase().includes(q) ||
        (item.parentTaskTitle && item.parentTaskTitle.toLowerCase().includes(q))
    );
  }, [agendaItems, agendaSearch]);

  // Group by Date for Google Calendar style Schedule view
  const groupedByDate = useMemo(() => {
    const groups: { [dateKey: string]: { date: Date; items: AgendaItem[] } } = {};

    for (const item of filteredAgenda) {
      const d = new Date(item.dueDate);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      if (!groups[dateKey]) {
        groups[dateKey] = { date: d, items: [] };
      }
      groups[dateKey].items.push(item);
    }

    return Object.keys(groups)
      .sort()
      .map((k) => groups[k]);
  }, [filteredAgenda]);

  if (!isOpen) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const getRelativeDateBadge = (d: Date) => {
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
          Overdue
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
          Today
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
          Tomorrow
        </span>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn select-none">
      <div className="w-full max-w-3xl max-h-[88vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Schedule & Agenda</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900">
                  {agendaItems.filter((i) => !i.isCompleted).length} Scheduled
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Google Calendar schedule view of cross-event dated tasks & subtasks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Completion Controls */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter agenda..."
              value={agendaSearch}
              onChange={(e) => setAgendaSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer min-h-[38px]">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Show Completed</span>
          </label>
        </div>

        {/* Google Calendar Schedule Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Loading calendar agenda...
            </div>
          ) : groupedByDate.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No dated items found
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tasks, chasers, or subtasks with due dates will automatically surface here in
                chronological Google Calendar schedule format.
              </p>
            </div>
          ) : (
            groupedByDate.map((group) => {
              const d = group.date;
              const dayOfWeek = d.toLocaleDateString(undefined, { weekday: 'short' });
              const monthStr = d.toLocaleDateString(undefined, { month: 'short' });
              const dayOfMonth = d.getDate();

              const target = new Date(d);
              target.setHours(0, 0, 0, 0);
              const isToday = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) === 0;

              return (
                <div
                  key={d.toISOString()}
                  className="flex items-start gap-4 pt-2 pb-5 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
                >
                  {/* Google Calendar Widget "Breathing Room" Date Column */}
                  <div
                    className={`w-20 min-w-[80px] flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border transition-all sticky top-2 shadow-xs ${
                      isToday
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/80 shadow-blue-500/10'
                        : 'bg-slate-50/90 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isToday
                          ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {dayOfWeek}
                    </span>
                    <span
                      className={`text-3xl font-black leading-none my-1 tracking-tight ${
                        isToday
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {dayOfMonth}
                    </span>
                    <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                      {monthStr}
                    </span>

                    {getRelativeDateBadge(d) && (
                      <div className="mt-2 flex justify-center w-full">
                        {getRelativeDateBadge(d)}
                      </div>
                    )}
                  </div>

                  {/* Schedule items for this date */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          const targetNodeId = item.parentTaskId || item.node.id;
                          onLocateNode?.(targetNodeId, item.event.id);
                          onSelectEvent(item.event.id);
                          onClose();
                        }}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer hover:ring-2 hover:ring-blue-400/50 ${
                          item.isCompleted
                            ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                            : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.isSubtask) {
                                const subtaskId = item.id.split('_st_')[1];
                                handleToggleSubtask(item.node, subtaskId);
                              } else {
                                handleToggleNodeTask(item.node);
                              }
                            }}
                            className="pt-0.5 hover:scale-110 transition-transform focus:outline-none"
                            title={item.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                          >
                            {item.isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-blue-500" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            {/* Parent Event Title (Strict requirement) */}
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/60">
                                <Layers className="w-3 h-3" />
                                <span>{item.event.title}</span>
                              </span>

                              {/* Item Type Badge */}
                              <span
                                className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                                  item.type === 'subtask'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : item.type === 'chaser'
                                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {item.type === 'subtask'
                                  ? 'Sub-Task'
                                  : item.type === 'chaser'
                                  ? 'Chaser'
                                  : 'Task'}
                              </span>
                            </div>

                            {/* Item Title & Parent info */}
                            <div className="flex flex-col">
                              <span
                                className={`text-xs font-bold truncate ${
                                  item.isCompleted
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {item.title}
                              </span>

                              {item.parentTaskTitle && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                  Parent Task:{' '}
                                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                                    {item.parentTaskTitle}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Locate & Open Action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetNodeId = item.parentTaskId || item.node.id;
                            onLocateNode?.(targetNodeId, item.event.id);
                            onSelectEvent(item.event.id);
                            onClose();
                          }}
                          className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex-shrink-0"
                        >
                          Locate
                        </button>
                      </div>
                    ))}
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
