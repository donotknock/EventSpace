import React, { useState } from 'react';
import {
  X,
  Server,
  Unlink,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  Contrast,
  Type,
} from 'lucide-react';
import type { ServerConfig } from '../types';
import { mobileApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ServerConfig;
  onDisconnect: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onDisconnect,
}) => {
  const [isPinging, setIsPinging] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const { theme, setTheme, isDyslexic, toggleDyslexic } = useTheme();

  if (!isOpen) return null;

  const handlePing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await mobileApi.checkHealth(config.serverUrl);
      setLatency(Math.round(performance.now() - start));
    } catch {
      setLatency(null);
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 animate-slideUp text-slate-800 dark:text-white safe-bottom shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Companion Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Appearance & Connectivity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Appearance & Accessibility */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Appearance & Accessibility
          </h4>

          {/* Theme selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all ${
                theme === 'light'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span className="text-xs">Light</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all ${
                theme === 'dark'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span className="text-xs">Dark</span>
            </button>

            <button
              onClick={() => setTheme('high-contrast')}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all ${
                theme === 'high-contrast'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Contrast className="w-4 h-4" />
              <span className="text-xs">Contrast</span>
            </button>
          </div>

          {/* Dyslexic font toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <Type className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">OpenDyslexic Font</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">High-legibility typeface</p>
              </div>
            </div>
            <button
              onClick={toggleDyslexic}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                isDyslexic ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  isDyslexic ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Server Info */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Backend Server
          </h4>
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Server Host
            </span>
            <div className="text-xs font-mono text-blue-600 dark:text-blue-300 font-semibold truncate">
              {config.serverUrl}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pairing PIN
              </span>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                {config.pin}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Latency
              </span>
              <div className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{latency !== null ? `${latency} ms` : 'Connected'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={handlePing}
            disabled={isPinging}
            className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>Test Connection Health</span>
          </button>

          <button
            onClick={() => {
              onDisconnect();
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Unlink className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>Disconnect & Switch Server</span>
          </button>
        </div>
      </div>
    </div>
  );
};
