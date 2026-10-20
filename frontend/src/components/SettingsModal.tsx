import React, { useState, useEffect, useRef } from 'react';
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
  Users,
  Key,
  RefreshCw,
  Clock,
  Plus,
  UserPlus,
  UserMinus,
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
  LayoutTemplate,
  Lock,
  LogOut,
  Database,
  Download,
  Upload,
  Calendar,
  Globe,
  ChevronDown,
  ChevronRight,
  Disc,
  Type,
  Star,
  Sun,
  Moon,
  Monitor,
  Eye,
  FileText,
  Building2,
  Image as ImageIcon,
  Mic,
  Video as VideoIcon,
} from 'lucide-react';
import { useSettings, TrackedBlockType } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { formatCustomDate, formatCustomTime, isValidDateFormat } from '../utils/date';
import { triggerAgendaRefresh } from '../utils/agendaEvents';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTemplates?: () => void;
  initialSection?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenTemplates,
  initialSection,
}) => {
  const {
    enablePriority,
    setEnablePriority,
    checkboxStyles,
    toggleCheckboxStyle,
    bulletStyles,
    toggleBulletStyle,
    trackedBlockTypes,
    toggleTrackedBlockType,
    trackSubtasksInAgenda,
    setTrackSubtasksInAgenda,
    trackBlocksInAgenda,
    setTrackBlocksInAgenda,
    dateFormat,
    setDateFormat,
    timeFormat,
    setTimeFormat,
    firstDayOfWeek,
    setFirstDayOfWeek,
  } = useSettings();
  const { user: currentUser, logout } = useAuth();
  const { theme, setTheme, isDyslexic, toggleDyslexic } = useTheme();

  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'users' | 'about'>('general');
  const [datePatternInput, setDatePatternInput] = useState<string>(dateFormat || 'DD MMM YYYY');
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSavedIndicator = () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setShowSavedBadge(true);
    savedTimerRef.current = setTimeout(() => {
      setShowSavedBadge(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setDatePatternInput(dateFormat || 'DD MMM YYYY');
  }, [dateFormat]);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(() => ({
    theme: false,
    priority: false,
    dyslexia: false,
    subtasks: false,
    agenda: initialSection === 'agenda',
    localisation: false,
    templates: false,
    devices: false,
    addMember: false,
    memberList: true,
    aboutInfo: true,
    backupRestore: true,
  }));

  useEffect(() => {
    if (initialSection === 'agenda') {
      setActiveTab('general');
      setOpenAccordions({
        theme: false,
        priority: false,
        dyslexia: false,
        subtasks: false,
        agenda: true,
        localisation: false,
        templates: false,
        devices: false,
        addMember: false,
        memberList: true,
        aboutInfo: true,
        backupRestore: true,
      });
    }
  }, [initialSection, isOpen]);

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [showAddDevice, setShowAddDevice] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Backup & Restore State
  const [isExportingDb, setIsExportingDb] = useState(false);
  const [isRestoringDb, setIsRestoringDb] = useState(false);
  const [backupStatusMsg, setBackupStatusMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSqlite = async () => {
    try {
      setBackupStatusMsg('Downloading SQLite database...');
      await api.downloadDatabaseFile();
      setBackupStatusMsg('SQLite database downloaded successfully.');
      setTimeout(() => setBackupStatusMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setBackupErrorMsg('Failed to download SQLite database: ' + (err.message || String(err)));
      setTimeout(() => setBackupErrorMsg(null), 5000);
    }
  };

  const handleExportJson = async () => {
    try {
      setIsExportingDb(true);
      setBackupStatusMsg('Generating JSON backup snapshot...');
      await api.exportDatabaseBackup();
      setBackupStatusMsg('JSON backup snapshot exported successfully.');
      setTimeout(() => setBackupStatusMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setBackupErrorMsg('Failed to export backup: ' + (err.message || String(err)));
      setTimeout(() => setBackupErrorMsg(null), 5000);
    } finally {
      setIsExportingDb(false);
    }
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Are you sure you want to restore this database snapshot? Existing data will be merged or replaced.')) {
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      return;
    }

    try {
      setIsRestoringDb(true);
      setBackupStatusMsg('Reading backup snapshot...');
      const text = await file.text();
      const parsed = JSON.parse(text);
      setBackupStatusMsg('Restoring database records...');
      const res = await api.restoreDatabase(parsed);
      setBackupStatusMsg(`Database restored successfully (${res.restoredEvents || 0} events restored). Reloading...`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to restore backup:', err);
      setBackupErrorMsg('Restore failed: ' + (err.message || 'Invalid backup file format'));
      setTimeout(() => setBackupErrorMsg(null), 5000);
    } finally {
      setIsRestoringDb(false);
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
    }
  };

  // Transient Pairing Code State
  const [targetDeviceName, setTargetDeviceName] = useState('Mobile Device');
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  // User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'member' | 'admin'>('member');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordMsg, setChangePasswordMsg] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccountPassword !== confirmNewPassword) {
      setChangePasswordError("New passwords do not match");
      return;
    }
    if (newAccountPassword.length < 6) {
      setChangePasswordError("Password must be at least 6 characters");
      return;
    }
    setIsChangingPassword(true);
    setChangePasswordMsg(null);
    setChangePasswordError(null);
    try {
      await api.changePassword(currentPassword, newAccountPassword);
      setChangePasswordMsg("Password updated successfully!");
      setCurrentPassword('');
      setNewAccountPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Timer effect for pairing code countdown
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setPairingCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const loadDevices = async () => {
    try {
      const devs = await api.getCompanionDevices();
      setDevicesList(devs);
    } catch (err) {
      console.error('Failed to load companion devices:', err);
    }
  };

  // Load devices when integrations tab selected
  useEffect(() => {
    if (isOpen && activeTab === 'integrations') {
      loadDevices();
    }
  }, [isOpen, activeTab]);

  // Load users when users tab selected
  useEffect(() => {
    if (isOpen && activeTab === 'users') {
      loadUsers();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const localIp = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://192.168.1.150:5173';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(localIp);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    setPairingError(null);
    try {
      const res = await api.generatePairingCode(targetDeviceName.trim() || undefined);
      setPairingCode(res.code);
      setSecondsRemaining(res.expiresInSeconds || 300);
      await loadDevices();
    } catch (err: any) {
      setPairingError(err.message || 'Failed to generate pairing code');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      await api.deleteCompanionDevice(id);
      await loadDevices();
    } catch (err: any) {
      setPairingError(err.message || 'Failed to revoke device');
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await api.getUsers();
      setUsersList(users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to remove member "${username}"? Their associated workspace will be automatically archived.`)) {
      return;
    }
    try {
      await api.deleteUser(userId);
      setUserSuccessMsg(`Member ${username} removed and workspace archived.`);
      await loadUsers();
    } catch (err: any) {
      setUserErrorMsg(err.message || 'Failed to remove member');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;

    setIsCreatingUser(true);
    setUserSuccessMsg(null);
    setUserErrorMsg(null);

    try {
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword,
        name: newName.trim() || undefined,
        role: newRole,
      });
      setUserSuccessMsg(`User ${newUsername} created successfully!`);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewRole('member');
      await loadUsers();
    } catch (err: any) {
      setUserErrorMsg(err.message || 'Failed to create user account');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${String(remainder).padStart(2, '0')}`;
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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  EventSpace Preferences
                </h3>
                {showSavedBadge && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full animate-fade-in">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage mobile companion sync, users, integrations & settings
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
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50/50 dark:bg-slate-800/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'integrations'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Integrations</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'about'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>About/Backup</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' ? (
            <div className="space-y-4">
              {/* Theme Selector Accordion */}
              <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion('theme')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      {theme === 'light' ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                      ) : theme === 'high-contrast' ? (
                        <Eye className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Theme
                      </span>
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize">
                        {theme}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {openAccordions.theme ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {openAccordions.theme && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select interface color appearance: dark, light, or high contrast.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { id: 'dark' as const, label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
                        { id: 'light' as const, label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
                        { id: 'high-contrast' as const, label: 'High Contrast', icon: <Eye className="w-3.5 h-3.5" /> },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setTheme(opt.id);
                            triggerSavedIndicator();
                          }}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                            theme === opt.id
                              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30 font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dyslexia Font Toggle Accordion */}
              <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion('dyslexia')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Type className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Dyslexia Font
                      </span>
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isDyslexic
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {isDyslexic ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {openAccordions.dyslexia ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {openAccordions.dyslexia && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Apply OpenDyslexic typeface with weighted letter bottoms to reduce reading strain.
                    </p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDyslexic}
                      onClick={() => {
                        toggleDyslexic();
                        triggerSavedIndicator();
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                        isDyslexic ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isDyslexic ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Priority Tagging Accordion */}
              <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion('priority')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Flag className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Priority Tagging
                      </span>
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                        enablePriority
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {enablePriority ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {openAccordions.priority ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {openAccordions.priority && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Show priority tags (Low, Med, High, Urgent) on event blocks and filters.
                    </p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enablePriority}
                      onClick={() => {
                        setEnablePriority(!enablePriority);
                        triggerSavedIndicator();
                      }}
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
                )}
              </div>

              {/* Subtask Checkbox & Bullet Styles Accordion */}
              <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion('subtasks')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Checkbox & Bullet Styles
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {openAccordions.subtasks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {openAccordions.subtasks && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                        Checkbox Indicator Style
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { id: 'circle' as const, label: 'Circle', icon: <Circle className="w-3.5 h-3.5" /> },
                          { id: 'square' as const, label: 'Square', icon: <Square className="w-3.5 h-3.5" /> },
                        ].map((opt) => {
                          const isSelected = checkboxStyles.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                toggleCheckboxStyle(opt.id);
                                triggerSavedIndicator();
                              }}
                              className={`rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30 font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                        Bullet List Style
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { id: 'dot' as const, label: 'Solid Dot', icon: <Disc className="w-3.5 h-3.5" /> },
                          { id: 'dash' as const, label: 'Dash', icon: <span className="font-bold text-xs">—</span> },
                          { id: 'arrow' as const, label: 'Arrow', icon: <span className="font-bold text-xs">→</span> },
                          { id: 'starred' as const, label: 'Starred', icon: <Star className="w-3.5 h-3.5 fill-current" /> },
                        ].map((opt) => {
                          const isSelected = bulletStyles.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                toggleBulletStyle(opt.id);
                                triggerSavedIndicator();
                              }}
                              className={`rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30 font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Agenda Settings Accordion */}
              <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion('agenda')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Agenda Settings
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {openAccordions.agenda ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {openAccordions.agenda && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 divide-y divide-slate-100 dark:divide-slate-700/60">
                    {/* Tracked Block Types Multi-Select Pill Group */}
                    <div className="py-3 space-y-2">
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          Tracked Block Types
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Select which types of blocks appear on the calendar timeline.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {[
                          { id: 'task' as const, label: 'Task', icon: <CheckSquare className="w-3.5 h-3.5" /> },
                          { id: 'note' as const, label: 'Info / Note', icon: <FileText className="w-3.5 h-3.5" /> },
                          { id: 'venue' as const, label: 'Venue', icon: <Building2 className="w-3.5 h-3.5" /> },
                          { id: 'picture' as const, label: 'Photo', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                          { id: 'audio' as const, label: 'Audio', icon: <Mic className="w-3.5 h-3.5" /> },
                          { id: 'video' as const, label: 'Video', icon: <VideoIcon className="w-3.5 h-3.5" /> },
                        ].map((opt) => {
                          const isSelected = trackedBlockTypes.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                toggleTrackedBlockType(opt.id);
                                triggerAgendaRefresh();
                                triggerSavedIndicator();
                              }}
                              className={`rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/30 font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Track Subtasks */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          Track Subtasks in Agenda
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Include block subtasks with due dates on the calendar timeline.
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={trackSubtasksInAgenda}
                        onClick={() => {
                          setTrackSubtasksInAgenda(!trackSubtasksInAgenda);
                          triggerAgendaRefresh();
                          triggerSavedIndicator();
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                          trackSubtasksInAgenda ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            trackSubtasksInAgenda ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Track Canvas Blocks */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          Track Canvas Blocks in Agenda
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Include nodes (venues, logistics, notes) with assigned due dates.
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={trackBlocksInAgenda}
                        onClick={() => {
                          setTrackBlocksInAgenda(!trackBlocksInAgenda);
                          triggerAgendaRefresh();
                          triggerSavedIndicator();
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                          trackBlocksInAgenda ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            trackBlocksInAgenda ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Localisation Accordion */}
              <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion('localisation')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Localisation
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {openAccordions.localisation ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {openAccordions.localisation && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                    {/* Live Preview Banner using standard UI sans font and fixed timestamp 2 Nov 2026 - 1:23 PM */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between text-xs font-sans text-slate-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">Sample</span>
                      <div className="font-bold text-indigo-300">
                        Sample: [ {formatCustomDate(new Date(2026, 10, 2, 13, 23, 0), datePatternInput || 'DD MMM YYYY')} - {formatCustomTime(new Date(2026, 10, 2, 13, 23, 0), timeFormat)} ]
                      </div>
                    </div>

                    {/* Date Format Pattern Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-900 dark:text-white block">
                        Date Format
                      </label>
                      <input
                        type="text"
                        value={datePatternInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDatePatternInput(val);
                          if (isValidDateFormat(val)) {
                            setDateFormat(val);
                            triggerSavedIndicator();
                          }
                        }}
                        placeholder="DD MMM YYYY"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border ${
                          isValidDateFormat(datePatternInput)
                            ? 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
                            : 'border-amber-500/70 focus:border-amber-500'
                        } text-slate-900 dark:text-white focus:outline-none`}
                      />
                      {!isValidDateFormat(datePatternInput) && (
                        <p className="text-[10px] text-amber-500 font-medium">
                          Must contain day (DD/D), month (MM/MMM/MMMM/M), and year (YYYY/YY) tokens. Defaulting to DD MMM YYYY.
                        </p>
                      )}
                    </div>

                    {/* Time Format */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-900 dark:text-white block">
                        Time Format
                      </label>
                      <div className="flex items-center gap-2">
                        {(['12h', '24h'] as const).map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => {
                              setTimeFormat(tf);
                              triggerSavedIndicator();
                            }}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                              timeFormat === tf
                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{tf}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calendar First Day of the Week */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-900 dark:text-white block">
                        Calendar First Day of the Week
                      </label>
                      <div className="flex items-center gap-2">
                        {(['monday', 'saturday', 'sunday'] as const).map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              setFirstDayOfWeek(day);
                              triggerSavedIndicator();
                            }}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer capitalize ${
                              firstDayOfWeek === day
                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            <span>{day}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Management Accordion */}
              {onOpenTemplates && (
                <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('templates')}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <LayoutTemplate className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Template Management
                      </span>
                    </div>
                    <div className="text-slate-400">
                      {openAccordions.templates ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>
                  {openAccordions.templates && (
                    <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        View, edit metadata, and delete saved event blueprints.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenTemplates();
                        }}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'integrations' ? (
            <div className="space-y-6">
              {/* Integrations Header with Add Device Button */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Mobile Companion & Device Pairing
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      Pair field devices to capture media, complete checklist items, and log attendance in real-time.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddDevice((prev) => !prev)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddDevice ? 'Hide Pairing Panel' : '+ Add Companion Device'}</span>
                </button>
              </div>

              {pairingError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pairingError}</span>
                </div>
              )}

              {/* Nested Add Companion Device Panel */}
              {showAddDevice && (
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center space-y-4 animate-fadeIn">
                  <div className="w-full max-w-sm">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Device Name / Description
                    </label>
                    <input
                      type="text"
                      value={targetDeviceName}
                      onChange={(e) => setTargetDeviceName(e.target.value)}
                      placeholder="e.g. iPhone 15 Pro, Floor Tablet"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {pairingCode ? (
                    <div className="w-full flex flex-col items-center space-y-3 pt-2">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Device: <strong>{targetDeviceName || 'Mobile Device'}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Code expires in:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatCountdown(secondsRemaining)}
                        </span>
                      </div>

                      <div className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-500/40 shadow-xl flex items-center justify-center gap-3">
                        <span className="text-3xl sm:text-4xl font-black font-mono tracking-[0.25em] text-blue-600 dark:text-blue-400">
                          {pairingCode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={handleCopyCode}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? 'Copied Code' : 'Copy 6-Digit Code'}</span>
                        </button>

                        <button
                          onClick={handleGenerateCode}
                          disabled={isGeneratingCode}
                          className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingCode ? 'animate-spin' : ''}`} />
                          <span>Regenerate</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3 py-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                        <Key className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                          Generate Device Pairing Code
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5">
                          Each pairing code binds uniquely to a specific companion device.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateCode}
                        disabled={isGeneratingCode}
                        className="min-h-[42px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 mx-auto active:scale-95 transition-all cursor-pointer"
                      >
                        {isGeneratingCode ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-4 h-4" />
                            <span>Generate Code for Device</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Connected / Paired Devices List */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Paired Devices ({devicesList.length})
                </span>

                {devicesList.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    No paired devices registered yet. Click &quot;+ Add Companion Device&quot; to link one.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                    {devicesList.map((dev) => (
                      <div key={dev.id} className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {dev.deviceName || 'Companion Device'}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                Code: {dev.code}
                              </span>
                              {dev.isUsed && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Paired
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Created {new Date(dev.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevokeDevice(dev.id)}
                          className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Server address */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Server Address
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-2">
                    <Wifi className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="truncate">{localIp}</span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="min-h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="space-y-6">
              {/* User management description */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Access Control & User Accounts
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Open self-registration is disabled for security. Create user accounts below to grant access to your event workspace.
                  </p>
                </div>
              </div>

              {userSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{userSuccessMsg}</span>
                </div>
              )}

              {userErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userErrorMsg}</span>
                </div>
              )}

              {/* Change Password Form for Current User */}
              <form onSubmit={handleChangePassword} className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-4">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Change Your Password</span>
                </h5>

                {changePasswordMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{changePasswordMsg}</span>
                  </div>
                )}

                {changePasswordError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{changePasswordError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newAccountPassword}
                      onChange={(e) => setNewAccountPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Retype password"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Add User Form (Admin Only) */}
              {currentUser?.role === 'admin' && (
                <form onSubmit={handleCreateUser} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    <span>Add New User Account</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g. jdoe"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Role
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
                    >
                      {isCreatingUser ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating User...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Users Table */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Active Users ({usersList.length})
                </span>

                {isLoadingUsers ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading users...</div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                    {usersList.map((u) => (
                      <div key={u.id} className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                            {(u.name || u.username)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {u.username}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              }`}>
                                {u.role}
                              </span>
                              {currentUser?.id === u.id && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  (You)
                                </span>
                              )}
                            </div>
                            {u.name && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {u.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {currentUser?.role === 'admin' && currentUser.id !== u.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="px-2.5 py-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-red-200/50 dark:border-red-900/30"
                            title="Remove member and archive their workspace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Member</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
              {/* About EventSpace Info Accordion */}
              <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion('aboutInfo')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      About EventSpace
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {openAccordions.aboutInfo ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {openAccordions.aboutInfo && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      <strong>EventSpace Platform (v1.1.2a)</strong>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Created by donotknock
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-2">
                      <div>
                        <a
                          href="https://donotknock.app/apps/eventspace/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Support & Documentation</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div>
                        <a
                          href="https://ko-fi.com/donotknock"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 dark:text-pink-400 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Ko-fi</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Database Backup & Restore Accordion */}
              <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => toggleAccordion('backupRestore')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                        Database Backup & Restore
                      </h5>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {openAccordions.backupRestore ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {openAccordions.backupRestore && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-3.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Export portable JSON snapshots or download the live SQLite database file.
                    </p>

                    {backupStatusMsg && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{backupStatusMsg}</span>
                      </div>
                    )}

                    {backupErrorMsg && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{backupErrorMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {/* Export JSON */}
                      <button
                        type="button"
                        onClick={handleExportJson}
                        disabled={isExportingDb}
                        className="min-h-[42px] px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isExportingDb ? 'Exporting...' : 'Export JSON'}</span>
                      </button>

                      {/* Download SQLite DB */}
                      <button
                        type="button"
                        onClick={handleDownloadSqlite}
                        className="min-h-[42px] px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Download SQLite (.db)</span>
                      </button>

                      {/* Restore JSON Backup */}
                      <button
                        type="button"
                        onClick={() => restoreFileInputRef.current?.click()}
                        disabled={isRestoringDb}
                        className="min-h-[42px] px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isRestoringDb ? 'Restoring...' : 'Restore JSON'}</span>
                      </button>
                      <input
                        ref={restoreFileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleRestoreFileSelected}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Logout and Close */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={async () => {
              onClose();
              await logout();
            }}
            className="px-3.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold flex items-center gap-2 transition-colors border border-red-200/60 dark:border-red-900/40"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
