import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider, useSettings, normalizeTrackedBlockType } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TopChecklistBar } from './components/TopChecklistBar';
import { CanvasZone } from './components/CanvasZone';
import { NewEventModal } from './components/NewEventModal';
import { EditEventModal } from './components/EditEventModal';
import { MasterTasksModal } from './components/MasterTasksModal';
import { SettingsModal } from './components/SettingsModal';
import { TrashBinModal } from './components/TrashBinModal';
import { ContactsModal } from './components/ContactsModal';
import { TemplatesModal } from './components/TemplatesModal';
import { VenuesModal } from './components/VenuesModal';
import { api } from './services/api';
import { EventItem, FullEventDetails, Priority, CanvasNodeItem } from './types';
import { triggerAgendaRefresh } from './utils/agendaEvents';

function EventSpaceApp() {
  const { logout } = useAuth();
  const { trackBlocksInAgenda, trackSubtasksInAgenda, trackedBlockTypes } = useSettings();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<FullEventDetails | null>(null);
  const activeEventIdRef = useRef<string | null>(activeEventId);
  activeEventIdRef.current = activeEventId;

  // Layout & Modals
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isMasterTasksModalOpen, setIsMasterTasksModalOpen] = useState(false);
  const [returnToAgendaOnSettingsClose, setReturnToAgendaOnSettingsClose] = useState(false);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  // Filters from Clara's wireframe
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Located Node State for Canvas Viewport Panning & Blinking Glow
  const [locatedNodeId, setLocatedNodeId] = useState<string | null>(null);
  const [locatedChecklistCategory, setLocatedChecklistCategory] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isVenuesModalOpen, setIsVenuesModalOpen] = useState(false);

  // Fetch events list
  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getEvents({
        search: searchQuery || undefined,
        year: selectedYear || undefined,
        department: selectedDept || undefined,
        term: selectedTerm || undefined,
        priority: selectedPriority || undefined,
      });
      setEvents(data);

      if (data.length > 0) {
        const searchParams = new URLSearchParams(window.location.search);
        const hashMatch = window.location.hash.match(/event=([^&]+)/);
        const storedId = localStorage.getItem('eventspace_active_event_id');
        const targetEventId =
          searchParams.get('event') || (hashMatch ? hashMatch[1] : null) || storedId;

        const currentActive = activeEventIdRef.current;
        if (targetEventId && data.some((e) => e.id === targetEventId)) {
          setActiveEventId((prev) => (prev === targetEventId ? prev : targetEventId));
        } else if (currentActive && data.some((e) => e.id === currentActive)) {
          // Keep current active selection
        } else {
          setActiveEventId((prev) => (prev === data[0].id ? prev : data[0].id));
        }
      } else {
        setActiveEventId(null);
        setActiveEvent(null);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [searchQuery, selectedYear, selectedDept, selectedTerm, selectedPriority]);

  // Fetch active event details (nodes, edges, checklists, frictionLogs)
  const loadActiveEventDetails = useCallback(async (id: string) => {
    try {
      const details = await api.getEventById(id);
      setActiveEvent(details);
    } catch (err) {
      console.error('Failed to load event details:', err);
    }
  }, []);

  // Fetch master tasks count (strictly matching filtered dated items in schedule/agenda)
  const loadMasterTasksCount = useCallback(async () => {
    try {
      const res = await api.getMasterTasks(true);
      let filteredCount = 0;
      if (res?.taskNodes) {
        for (const task of res.taskNodes) {
          if (task.event?.status === 'archived') continue;
          const blockType = normalizeTrackedBlockType(task.type);
          if (!trackedBlockTypes.includes(blockType)) continue;
          if (trackBlocksInAgenda && task.dueDate && !task.isCompleted) {
            filteredCount++;
          }
          if (trackSubtasksInAgenda && !task.isCompleted && task.metadata) {
            try {
              const meta = JSON.parse(task.metadata);
              if (Array.isArray(meta.subtasks)) {
                for (const st of meta.subtasks) {
                  if (st.dueDate && !st.done && st.style !== 'bullet') {
                    filteredCount++;
                  }
                }
              }
            } catch {}
          }
        }
      }
      setPendingTasksCount(filteredCount);
    } catch (err) {
      console.error('Failed to count master tasks:', err);
    }
  }, [trackBlocksInAgenda, trackSubtasksInAgenda, trackedBlockTypes]);

  useEffect(() => {
    loadEvents();
    loadMasterTasksCount();
  }, [loadEvents, loadMasterTasksCount]);

  // Global agenda update listener
  useEffect(() => {
    const handleAgendaUpdate = () => {
      loadMasterTasksCount();
      loadEvents();
      if (activeEventIdRef.current) {
        loadActiveEventDetails(activeEventIdRef.current);
      }
    };
    window.addEventListener('agenda-updated', handleAgendaUpdate);
    return () => window.removeEventListener('agenda-updated', handleAgendaUpdate);
  }, [loadMasterTasksCount, loadEvents, loadActiveEventDetails]);

  useEffect(() => {
    const handleHash = () => {
      const hashMatch = window.location.hash.match(/event=([^&]+)/);
      if (hashMatch && hashMatch[1]) {
        setActiveEventId(hashMatch[1]);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const handleOpenContacts = () => setIsContactsModalOpen(true);
    window.addEventListener('eventspace:open-contacts', handleOpenContacts);
    return () => window.removeEventListener('eventspace:open-contacts', handleOpenContacts);
  }, []);

  useEffect(() => {
    if (activeEventId) {
      localStorage.setItem('eventspace_active_event_id', activeEventId);
      const url = new URL(window.location.href);
      if (url.searchParams.get('event') !== activeEventId) {
        url.searchParams.set('event', activeEventId);
        window.history.replaceState(null, '', url.toString());
      }
      loadActiveEventDetails(activeEventId);
    }
  }, [activeEventId, loadActiveEventDetails]);

  const handleSelectEvent = (id: string) => {
    setActiveEventId(id);
    localStorage.setItem('eventspace_active_event_id', id);
    const url = new URL(window.location.href);
    url.searchParams.set('event', id);
    window.history.replaceState(null, '', url.toString());
  };

  const handleRefreshWorkspace = useCallback(async () => {
    await Promise.all([
      loadEvents(),
      activeEventId ? loadActiveEventDetails(activeEventId) : Promise.resolve(),
      loadMasterTasksCount(),
    ]);
  }, [loadEvents, activeEventId, loadActiveEventDetails, loadMasterTasksCount]);

  const handleLocateNode = (nodeId: string, eventId: string) => {
    setActiveEventId(eventId);
    setLocatedNodeId(nodeId);
    setTimeout(() => {
      setLocatedNodeId((curr) => (curr === nodeId ? null : curr));
    }, 3500);
  };

  const handleLocateChecklist = (category: string, eventId: string, _checklistId?: string) => {
    setActiveEventId(eventId);
    setLocatedChecklistCategory(category.toUpperCase());
    setTimeout(() => {
      setLocatedChecklistCategory((curr) => (curr === category.toUpperCase() ? null : curr));
    }, 3500);
  };

  const handleToggleCompleteEvent = async (id: string, isCompleted: boolean) => {
    try {
      await api.updateEvent(id, {
        isCompleted,
        status: isCompleted ? 'archived' : 'active',
      });
      await loadEvents();
      if (activeEventId === id) {
        await loadActiveEventDetails(id);
      }
      loadMasterTasksCount();
    } catch (err) {
      console.error('Failed to toggle event completion state:', err);
    }
  };

  const handleRefreshEvent = useCallback(() => {
    if (activeEventId) {
      loadActiveEventDetails(activeEventId);
      loadMasterTasksCount();
    }
  }, [activeEventId, loadActiveEventDetails, loadMasterTasksCount]);

  const handleUpdateActiveEventNode = useCallback((nodeId: string, updates: Partial<CanvasNodeItem>) => {
    setActiveEvent((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: (prev.nodes || []).map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
      };
    });
  }, []);

  // Mute toggle
  const handleToggleMute = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetEvent = events.find((ev) => ev.id === id);
    if (!targetEvent) return;

    const newMuted = !targetEvent.isMuted;
    setEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, isMuted: newMuted } : ev))
    );
    if (activeEvent && activeEvent.id === id) {
      setActiveEvent({ ...activeEvent, isMuted: newMuted });
    }

    try {
      await api.toggleEventMute(id, newMuted);
      loadMasterTasksCount();
    } catch (err) {
      console.error('Failed to toggle mute state:', err);
      loadEvents();
    }
  };

  // Checklist item toggle in top zone
  const handleToggleChecklist = async (id: string, isCompleted: boolean) => {
    if (!activeEvent) return;

    setActiveEvent({
      ...activeEvent,
      checklists: activeEvent.checklists.map((c) =>
        c.id === id ? { ...c, isCompleted } : c
      ),
    });

    try {
      await api.toggleChecklist(activeEvent.id, id, isCompleted);
      loadMasterTasksCount();
      triggerAgendaRefresh();
    } catch (err) {
      console.error('Failed to toggle checklist:', err);
      loadActiveEventDetails(activeEvent.id);
    }
  };

  // Checklist item creation
  const handleAddChecklistItem = async (category: string, content: string) => {
    if (!activeEvent) return;
    try {
      const created = await api.createChecklistItem(activeEvent.id, {
        category,
        content,
        order: activeEvent.checklists.length,
      });
      setActiveEvent((prev) =>
        prev ? { ...prev, checklists: [...prev.checklists, created] } : prev
      );
      loadMasterTasksCount();
      triggerAgendaRefresh();
    } catch (err) {
      console.error('Failed to create checklist item:', err);
    }
  };

  // Checklist item edit
  const handleUpdateChecklistItem = async (id: string, content: string) => {
    if (!activeEvent) return;
    try {
      await api.updateChecklistItem(activeEvent.id, id, { content });
      setActiveEvent((prev) =>
        prev
          ? {
              ...prev,
              checklists: prev.checklists.map((c) =>
                c.id === id ? { ...c, content } : c
              ),
            }
          : prev
      );
      triggerAgendaRefresh();
    } catch (err) {
      console.error('Failed to update checklist item:', err);
    }
  };

  // Checklist item delete
  const handleDeleteChecklistItem = async (id: string) => {
    if (!activeEvent) return;
    try {
      await api.deleteChecklistItem(activeEvent.id, id);
      setActiveEvent((prev) =>
        prev
          ? {
              ...prev,
              checklists: prev.checklists.filter((c) => c.id !== id),
            }
          : prev
      );
      loadMasterTasksCount();
      triggerAgendaRefresh();
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  // Create new event handler
  const handleCreateEvent = async (data: {
    title: string;
    department?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    color?: string | null;
    priority?: Priority | null;
    contactIds?: string[];
  }) => {
    const created = await api.createEvent(data);
    await loadEvents();
    setActiveEventId(created.id);
  };

  // Duplicate existing event handler
  const handleDuplicateEvent = async (
    sourceId: string,
    data: {
      title?: string;
      department?: string;
      startDate?: string;
      endDate?: string;
      startTime?: string;
      endTime?: string;
      color?: string;
      priority?: Priority | null;
    }
  ) => {
    const duplicated = await api.duplicateEvent(sourceId, data);
    await loadEvents();
    setActiveEventId(duplicated.id);
  };

  // Update existing event details
  const handleUpdateEvent = async (id: string, updates: Partial<EventItem>) => {
    await api.updateEvent(id, updates);
    await loadEvents();
    if (activeEventId === id) {
      await loadActiveEventDetails(id);
    }
    loadMasterTasksCount();
  };

  // Delete event handler
  const handleDeleteEvent = async (id: string) => {
    await api.deleteEvent(id);
    const updatedEvents = events.filter((e) => e.id !== id);
    setEvents(updatedEvents);
    if (activeEventId === id) {
      if (updatedEvents.length > 0) {
        setActiveEventId(updatedEvents[0].id);
      } else {
        setActiveEventId(null);
        setActiveEvent(null);
      }
    }
    await loadEvents();
    await loadMasterTasksCount();
  };

  // Leave event handler (for shared users)
  const handleLeaveEvent = async (id: string) => {
    try {
      await api.leaveEvent(id);
      const updatedEvents = events.filter((e) => e.id !== id);
      setEvents(updatedEvents);
      if (activeEventId === id) {
        if (updatedEvents.length > 0) {
          setActiveEventId(updatedEvents[0].id);
        } else {
          setActiveEventId(null);
          setActiveEvent(null);
        }
      }
      await loadEvents();
      await loadMasterTasksCount();
    } catch (err) {
      console.error('Failed to leave event:', err);
    }
  };

  // Compute viewer / read-only state for active event
  const isOwner = (activeEvent as any)?.isOwner ?? true;
  const userRole = (activeEvent as any)?.userRole;
  const shareRole = (activeEvent as any)?.shareRole;
  const isReadOnly = userRole === 'viewer' || (!isOwner && shareRole === 'viewer');

  // Sidebar resize and collapse state
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('eventspace_sidebar_width');
      return saved ? Math.min(500, Math.max(72, parseInt(saved, 10))) : 288;
    } catch {
      return 288;
    }
  });

  const isSidebarCollapsed = sidebarWidth < 160;

  const handleToggleSidebar = () => {
    if (isSidebarCollapsed) {
      const prev = parseInt(localStorage.getItem('eventspace_prev_sidebar_width') || '288', 10);
      const newW = prev >= 160 ? prev : 288;
      setSidebarWidth(newW);
      localStorage.setItem('eventspace_sidebar_width', String(newW));
    } else {
      localStorage.setItem('eventspace_prev_sidebar_width', String(sidebarWidth));
      setSidebarWidth(72);
      localStorage.setItem('eventspace_sidebar_width', '72');
    }
  };

  // Reorder events handler
  const handleReorderEvents = async (orderedIds: string[]) => {
    try {
      await api.reorderEvents(orderedIds);
      await loadEvents();
    } catch (err) {
      console.error('Failed to reorder events:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors select-none">
      {/* 1. Left Navigation Rail (Collapsible, Filters, Traffic Lights, 44x44 Mute Toggles) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={setSidebarWidth}
        events={events}
        activeEventId={activeEventId}
        onSelectEvent={handleSelectEvent}
        onToggleMute={handleToggleMute}
        onLocateNode={handleLocateNode}
        onLocateChecklist={handleLocateChecklist}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenTrash={() => setIsTrashModalOpen(true)}
        onOpenContacts={() => setIsContactsModalOpen(true)}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenVenues={() => setIsVenuesModalOpen(true)}
        onLogout={logout}
        onToggleCompleteEvent={handleToggleCompleteEvent}
        onReorderEvents={handleReorderEvents}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedDept={selectedDept}
        onDeptChange={setSelectedDept}
        selectedTerm={selectedTerm}
        onTermChange={setSelectedTerm}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
      />

      {/* 2. Main Viewport Shell */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Global Header Bar */}
        <Header
          activeEvent={activeEvent}
          sidebarOpen={sidebarOpen}
          isCollapsedMode={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onOpenMasterTasks={() => setIsMasterTasksModalOpen(true)}
          onOpenNewEvent={() => setIsNewEventModalOpen(true)}
          onOpenEditEvent={() => setIsEditEventModalOpen(true)}
          onLeaveEvent={handleLeaveEvent}
          onRefreshWorkspace={handleRefreshWorkspace}
          pendingTasksCount={pendingTasksCount}
          isReadOnly={isReadOnly}
        />

        {/* Top Zoned Section: Overarching Department Checklists (FM, AV, CT) */}
        {activeEvent && (
          <TopChecklistBar
            eventId={activeEvent.id}
            checklists={activeEvent.checklists || []}
            locatedCategory={locatedChecklistCategory}
            onToggleItem={handleToggleChecklist}
            onAddItem={handleAddChecklistItem}
            onUpdateItem={handleUpdateChecklistItem}
            onDeleteItem={handleDeleteChecklistItem}
            onReorderItems={(reordered) =>
              setActiveEvent((prev) => (prev ? { ...prev, checklists: reordered } : prev))
            }
            isReadOnly={isReadOnly}
          />
        )}

        {/* Bottom Zoned Section: Infinite Spatial Canvas Container */}
        <CanvasZone
          activeEvent={activeEvent}
          locatedNodeId={locatedNodeId}
          onRefreshEvent={handleRefreshEvent}
          onUpdateNodeLocal={handleUpdateActiveEventNode}
          onOpenEditEvent={() => setIsEditEventModalOpen(true)}
          isReadOnly={isReadOnly}
        />
      </main>

      {/* Modals */}
      <NewEventModal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        events={events}
        onCreate={handleCreateEvent}
        onDuplicate={handleDuplicateEvent}
      />

      <EditEventModal
        isOpen={isEditEventModalOpen}
        onClose={() => setIsEditEventModalOpen(false)}
        event={activeEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        onLeave={handleLeaveEvent}
      />

      <MasterTasksModal
        isOpen={isMasterTasksModalOpen}
        onClose={() => setIsMasterTasksModalOpen(false)}
        onSelectEvent={(id) => {
          setActiveEventId(id);
        }}
        onLocateNode={handleLocateNode}
        onTaskToggled={() => {
          loadMasterTasksCount();
          if (activeEventId) loadActiveEventDetails(activeEventId);
        }}
        onOpenSettings={(section) => {
          setReturnToAgendaOnSettingsClose(true);
          setIsMasterTasksModalOpen(false);
          setSettingsInitialSection(section || 'agenda');
          setIsSettingsModalOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setSettingsInitialSection(undefined);
          if (returnToAgendaOnSettingsClose) {
            setIsMasterTasksModalOpen(true);
            setReturnToAgendaOnSettingsClose(false);
          }
        }}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        initialSection={settingsInitialSection}
      />

      <TrashBinModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        onItemRestored={async () => {
          await loadEvents();
          if (activeEventId) {
            await loadActiveEventDetails(activeEventId);
          }
          await loadMasterTasksCount();
        }}
      />

      <ContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
      />

      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onTemplatesChanged={loadEvents}
        onSelectTemplateToCreate={(_tplId) => {
          setIsNewEventModalOpen(true);
        }}
      />

      <VenuesModal
        isOpen={isVenuesModalOpen}
        onClose={() => setIsVenuesModalOpen(false)}
      />
    </div>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading EventSpace...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <EventSpaceApp />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <AuthGate />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
