import React, { useState } from 'react';
import {
  X,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Settings,
  Sparkles,
  Info,
  Sliders,
  Flag,
  CheckSquare,
  Circle,
  Square,
  List,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    enablePriority,
    setEnablePriority,
    enableBulletSubtasks,
    setEnableBulletSubtasks,
    enableCircleSubtasks,
    setEnableCircleSubtasks,
    enableSquareSubtasks,
    setEnableSquareSubtasks,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<'features' | 'mobile' | 'about'>('features');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  if (!isOpen) return null;

  const localIp = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://192.168.1.150:5173';
  const pairingPin = 'EVSP-9482';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(localIp);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pairingPin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                EventSpace Preferences
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage mobile companion sync, integrations & settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close settings modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => setActiveTab('features')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'features'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferences & Features</span>
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'mobile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile Companion App</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'about'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>About & System</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'features' ? (
            <div className="space-y-6">
              {/* Feature Intro */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-3">
                <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Workspace Customization
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Tailor the visibility of complexity features like priority traffic lights and multi-style subtasks to match your team's workflow.
                  </p>
                </div>
              </div>

              {/* Toggles Container */}
              <div className="space-y-4">
                {/* Enable Priority System Toggle */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Flag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Enable Priority System
                        </span>
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                          enablePriority
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {enablePriority ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        When disabled, hides all priority indicators (High/Med/Low tags, creation selectors, sidebar filters, and friction logs) across the entire application.
                      </p>
                    </div>
                  </div>

                  {/* Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enablePriority}
                    onClick={() => setEnablePriority(!enablePriority)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      enablePriority ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        enablePriority ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Granular Subtask Style Toggles */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
                    Subtask Style Options
                  </span>

                  {/* Enable Circle Checkboxes Toggle */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Circle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Enable Circle Checkboxes
                          </span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            enableCircleSubtasks
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {enableCircleSubtasks ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Standard circular checkbox for actionable subtasks and milestones.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableCircleSubtasks}
                      onClick={() => setEnableCircleSubtasks(!enableCircleSubtasks)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                        enableCircleSubtasks ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          enableCircleSubtasks ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Enable Square Checkboxes Toggle */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Square className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Enable Square Checkboxes
                          </span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            enableSquareSubtasks
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {enableSquareSubtasks ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Angular square check box variant for technical or operational deliverables.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableSquareSubtasks}
                      onClick={() => setEnableSquareSubtasks(!enableSquareSubtasks)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                        enableSquareSubtasks ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          enableSquareSubtasks ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Enable Bullet Points Toggle */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <List className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Enable Bullet Points
                          </span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            enableBulletSubtasks
                              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {enableBulletSubtasks ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Unordered informational bullet notes without checkbox completion states.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableBulletSubtasks}
                      onClick={() => setEnableBulletSubtasks(!enableBulletSubtasks)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                        enableBulletSubtasks ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          enableBulletSubtasks ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'mobile' ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white flex-shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Capacitor Mobile / Tablet Companion
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Pair your iPad, Android tablet, or smartphone to navigate event floorplans, capture site photos, record voice memos, and tick checklists live on location.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                {/* SVG QR Code */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-700">
                    <svg
                      className="w-44 h-44 text-slate-900"
                      viewBox="0 0 100 100"
                      fill="currentColor"
                      shapeRendering="crispEdges"
                    >
                      {/* Outer Position Detection Patterns */}
                      {/* Top-Left */}
                      <rect x="5" y="5" width="25" height="25" fill="#1e293b" />
                      <rect x="8" y="8" width="19" height="19" fill="#ffffff" />
                      <rect x="11" y="11" width="13" height="13" fill="#2563eb" rx="2" />

                      {/* Top-Right */}
                      <rect x="70" y="5" width="25" height="25" fill="#1e293b" />
                      <rect x="73" y="8" width="19" height="19" fill="#ffffff" />
                      <rect x="76" y="11" width="13" height="13" fill="#2563eb" rx="2" />

                      {/* Bottom-Left */}
                      <rect x="5" y="70" width="25" height="25" fill="#1e293b" />
                      <rect x="8" y="73" width="19" height="19" fill="#ffffff" />
                      <rect x="11" y="76" width="13" height="13" fill="#2563eb" rx="2" />

                      {/* Simulated QR Data Pixels */}
                      <rect x="35" y="8" width="5" height="5" />
                      <rect x="45" y="8" width="5" height="5" />
                      <rect x="55" y="8" width="5" height="5" />
                      <rect x="40" y="15" width="5" height="5" />
                      <rect x="50" y="15" width="5" height="5" />
                      <rect x="60" y="15" width="5" height="5" />
                      <rect x="35" y="22" width="5" height="5" />
                      <rect x="50" y="22" width="5" height="5" />

                      <rect x="8" y="35" width="5" height="5" />
                      <rect x="18" y="35" width="5" height="5" />
                      <rect x="8" y="45" width="5" height="5" />
                      <rect x="23" y="45" width="5" height="5" />
                      <rect x="13" y="55" width="5" height="5" />

                      <rect x="75" y="35" width="5" height="5" />
                      <rect x="85" y="35" width="5" height="5" />
                      <rect x="70" y="45" width="5" height="5" />
                      <rect x="80" y="45" width="5" height="5" />
                      <rect x="90" y="45" width="5" height="5" />
                      <rect x="75" y="55" width="5" height="5" />
                      <rect x="85" y="55" width="5" height="5" />

                      {/* Center Brand Badge */}
                      <rect x="38" y="38" width="24" height="24" rx="6" fill="#2563eb" />
                      <circle cx="50" cy="50" r="6" fill="#ffffff" />

                      {/* Bottom Data Pixels */}
                      <rect x="35" y="70" width="5" height="5" />
                      <rect x="45" y="70" width="5" height="5" />
                      <rect x="55" y="70" width="5" height="5" />
                      <rect x="40" y="78" width="5" height="5" />
                      <rect x="60" y="78" width="5" height="5" />
                      <rect x="35" y="86" width="5" height="5" />
                      <rect x="50" y="86" width="5" height="5" />
                      <rect x="75" y="72" width="5" height="5" />
                      <rect x="85" y="78" width="5" height="5" />
                      <rect x="75" y="86" width="5" height="5" />
                      <rect x="90" y="86" width="5" height="5" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-blue-500" />
                    Scan with Mobile Camera / Companion App
                  </span>
                </div>

                {/* Local IP Address & Pairing Credentials */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                      Local IP Pairing Address
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-2">
                        <Wifi className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="truncate">{localIp}</span>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className="min-h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Copy pairing URL"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                      Pairing Access PIN
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400">
                        {pairingPin}
                      </div>
                      <button
                        onClick={handleCopyPin}
                        className="min-h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Copy pairing PIN"
                      >
                        {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPin ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
                    <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Pairing Instructions</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                      <li>Ensure your mobile device is connected to the same local Wi-Fi.</li>
                      <li>Launch the EventSpace Capacitor app and scan the QR code.</li>
                      <li>Enter PIN <strong className="font-mono">{pairingPin}</strong> to authenticate live syncing.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  EventSpace Platform v1.2.0
                </h4>
                <p>
                  Architected with React 19, @xyflow/react canvas, SQLite WAL mode, Whisper local transcription, and Capacitor mobile pairing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
