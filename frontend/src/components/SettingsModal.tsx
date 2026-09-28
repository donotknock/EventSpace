import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTemplates?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenTemplates }) => {
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
  const { user: currentUser, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'features' | 'mobile' | 'users' | 'about'>('features');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  // Load devices when mobile tab selected
  useEffect(() => {
    if (isOpen && activeTab === 'mobile') {
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
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                EventSpace Preferences
              </h3>
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
            onClick={() => setActiveTab('features')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'features'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferences</span>
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`min-h-[44px] px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'mobile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile Companion App</span>
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
            <span>User Management</span>
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
            <span>About</span>
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
                    Workflow & Interface Customization
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Tailor your visual canvas and task system to your organization's workflow.
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
                        When disabled, hides all priority indicators (High/Med/Low tags, creation selectors, sidebar filters, and friction logs) across the application.
                      </p>
                    </div>
                  </div>

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

                {/* Subtask Style Options */}
                <div className="pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1 mb-2">
                    Subtask Style Options
                  </span>

                  {/* Grouped Single Container: Circle, Square, Bullet */}
                  <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 shadow-xs overflow-hidden">
                    {/* Circle Checkboxes */}
                    <div className="p-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Circle className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Circle Checkboxes
                        </span>
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

                    {/* Square Checkboxes */}
                    <div className="p-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Square className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Square Checkboxes
                        </span>
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

                    {/* Bullet Point Style */}
                    <div className="p-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                          <List className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Bullet Point Style
                        </span>
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

                {/* Template Management Card */}
                {onOpenTemplates && (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <LayoutTemplate className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Template Management
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          View, edit metadata, and delete your saved event templates and reusable blueprints.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenTemplates();
                      }}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shrink-0 transition-colors flex items-center gap-1.5"
                    >
                      <LayoutTemplate className="w-3.5 h-3.5" />
                      <span>Manage</span>
                    </button>
                  </div>
                )}
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
                    Device-Specific Mobile Companion Pairing
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Generate unique pairing codes per device. Specify a device name to monitor active companion links and easily revoke access when needed.
                  </p>
                </div>
              </div>

              {pairingError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pairingError}</span>
                </div>
              )}

              {/* Device Name input & Pairing Generator */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center space-y-4">
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
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied Code' : 'Copy 6-Digit Code'}</span>
                      </button>

                      <button
                        onClick={handleGenerateCode}
                        disabled={isGeneratingCode}
                        className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 transition-all"
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
                      className="min-h-[42px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 mx-auto active:scale-95 transition-all"
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

              {/* Connected / Paired Devices List */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Paired Devices ({devicesList.length})
                </span>

                {devicesList.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    No paired devices registered yet.
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
                          className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
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
                    className="min-h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
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
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  <strong>EventSpace Platform (v1.1.0)</strong>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Created by donotknock
                </div>
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-2">
                  <div>
                    <a
                      href="https://forums.unraid.net/topic/200695-support-eventspace/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Support</span>
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
