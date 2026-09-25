import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TopChecklistBar } from './components/TopChecklistBar';
import { CanvasZone } from './components/CanvasZone';
import { NewEventModal } from './components/NewEventModal';
import { EditEventModal } from './components/EditEventModal';
import { MasterTasksModal } from './components/MasterTasksModal';
import { SettingsModal } from './components/SettingsModal';
import { TrashBinModal } from './components/TrashBinModal';
import { api } from './services/api';
import { EventItem, FullEventDetails, Priority } from './types';

function EventSpaceApp() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<FullEventDetails | null>(null);

  // Layout & Modals
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isMasterTasksModalOpen, setIsMasterTasksModalOpen] = useState(false);
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
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

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
        const hashMatch = window.location.hash.match(/event=([^&]+)/);
        const searchParams = new URLSearchParams(window.location.search);
        const targetEventId = hashMatch ? hashMatch[1] : searchParams.get('event');

        if (targetEventId && data.some((e) => e.id === targetEventId)) {
          setActiveEventId(targetEventId);
        } else if (!activeEventId || !data.some((e) => e.id === activeEventId)) {
          setActiveEventId(data[0].id);
        }
      } else {
        setActiveEventId(null);
        setActiveEvent(null);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [searchQuery, selectedYear, selectedDept, selectedTerm, selectedPriority, activeEventId]);

  // Fetch active event details (nodes, edges, checklists, frictionLogs)
  const loadActiveEventDetails = useCallback(async (id: string) => {
    try {
      const details = await api.getEventById(id);
      setActiveEvent(details);
    } catch (err) {
      console.error('Failed to load event details:', err);
    }
  }, []);

  // Fetch master tasks count
  const loadMasterTasksCount = useCallback(async () => {
    try {
      const res = await api.getMasterTasks(false);
      setPendingTasksCount(res.totalPending);
    } catch (err) {
      console.error('Failed to count master tasks:', err);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadMasterTasksCount();
  }, [loadEvents, loadMasterTasksCount]);

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
    if (activeEventId) {
      loadActiveEventDetails(activeEventId);
    }
  }, [activeEventId, loadActiveEventDetails]);

  const handleSelectEvent = (id: string) => {
    setActiveEventId(id);
  };

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
      await api.updateEvent(id, { isCompleted });
      await loadEvents();
      if (activeEventId === id) {
        await loadActiveEventDetails(id);
      }
      loadMasterTasksCount();
    } catch (err) {
      console.error('Failed to toggle event completion state:', err);
    }
  };

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
      await api.updateEvent(id, { isMuted: newMuted });
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors select-none">
      {/* 1. Left Navigation Rail (Collapsible, Filters, Traffic Lights, 44x44 Mute Toggles) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        events={events}
        activeEventId={activeEventId}
        onSelectEvent={handleSelectEvent}
        onToggleMute={handleToggleMute}
        onLocateNode={handleLocateNode}
        onLocateChecklist={handleLocateChecklist}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenTrash={() => setIsTrashModalOpen(true)}
        onToggleCompleteEvent={handleToggleCompleteEvent}
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
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenMasterTasks={() => setIsMasterTasksModalOpen(true)}
          onOpenNewEvent={() => setIsNewEventModalOpen(true)}
          onOpenEditEvent={() => setIsEditEventModalOpen(true)}
          pendingTasksCount={pendingTasksCount}
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
          />
        )}

        {/* Bottom Zoned Section: Infinite Spatial Canvas Container */}
        <CanvasZone
          activeEvent={activeEvent}
          locatedNodeId={locatedNodeId}
          onRefreshEvent={() => {
            if (activeEventId) {
              loadActiveEventDetails(activeEventId);
              loadMasterTasksCount();
            }
          }}
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
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
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
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <EventSpaceApp />
      </SettingsProvider>
    </ThemeProvider>
  );
}
