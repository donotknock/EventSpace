import { useState, useEffect } from 'react';
import { PairingScreen } from './components/PairingScreen';
import { EventListView } from './components/EventListView';
import { EventDetailView } from './components/EventDetailView';
import { AgendaView } from './components/AgendaView';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { ThemeProvider } from './context/ThemeContext';
import { storage } from './services/storage';
import type { EventItem, ServerConfig } from './types';
import { Loader2 } from 'lucide-react';

function MobileAppContent() {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Navigation state
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [agendaEventId, setAgendaEventId] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    storage.getServerConfig().then((saved) => {
      if (saved && saved.serverUrl) {
        setConfig(saved);
      }
      setIsInitializing(false);
    });
  }, []);

  const handlePaired = (newConfig: ServerConfig) => {
    setConfig(newConfig);
  };

  const handleDisconnect = async () => {
    await storage.clearServerConfig();
    setConfig(null);
    setSelectedEvent(null);
    setIsAgendaOpen(false);
    setIsSettingsOpen(false);
  };

  const handleOpenAgenda = (eventId?: string) => {
    setAgendaEventId(eventId);
    setIsAgendaOpen(true);
  };

  const handleCloseAgenda = () => {
    setIsAgendaOpen(false);
    setAgendaEventId(undefined);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading EventSpace Companion...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100">
        <PairingScreen onPaired={handlePaired} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
      {isAgendaOpen ? (
        <AgendaView
          config={config}
          onDisconnect={handleDisconnect}
          onClose={handleCloseAgenda}
          initialEventId={agendaEventId}
        />
      ) : selectedEvent ? (
        <EventDetailView
          event={selectedEvent}
          config={config}
          onBack={() => setSelectedEvent(null)}
          onOpenAgenda={handleOpenAgenda}
        />
      ) : (
        <EventListView
          config={config}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAgenda={() => handleOpenAgenda(undefined)}
        />
      )}

      {/* Global Server & Appearance Settings Modal */}
      <ServerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MobileAppContent />
    </ThemeProvider>
  );
}
