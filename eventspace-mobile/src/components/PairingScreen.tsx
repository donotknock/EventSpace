import React, { useState, useRef } from 'react';
import {
  QrCode,
  Smartphone,
  Wifi,
  KeyRound,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clipboard,
  Server,
} from 'lucide-react';
import { mobileApi } from '../services/api';
import { storage } from '../services/storage';
import type { ServerConfig } from '../types';
import { decodeQrFromImageFile, parsePairingPayload } from '../utils/qrScanner';

interface PairingScreenProps {
  onPaired: (config: ServerConfig) => void;
}

export const PairingScreen: React.FC<PairingScreenProps> = ({ onPaired }) => {
  const getInitialServerUrl = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      if (!window.location.origin.includes(':5174')) {
        return window.location.origin;
      }
    }
    return 'http://localhost:3000';
  };
  const [serverUrl, setServerUrl] = useState(getInitialServerUrl);
  const [pin, setPin] = useState('EVSP-9482');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePair = async (urlToTest = serverUrl, pinToTest = pin) => {
    const cleanUrl = mobileApi.cleanUrl(urlToTest);
    const cleanPin = pinToTest.trim().toUpperCase();

    if (!cleanUrl) {
      setErrorMessage('Please enter the server address (e.g. http://192.168.1.150:3001)');
      return;
    }
    if (!cleanPin) {
      setErrorMessage('Please enter the 4-8 digit pairing PIN (e.g. EVSP-9482)');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const result = await mobileApi.verifyPairing(cleanUrl, cleanPin);
      if (!result.success) {
        setErrorMessage(result.error || 'Pairing failed. Please check IP and PIN.');
        setIsConnecting(false);
        return;
      }

      const config: ServerConfig = {
        serverUrl: cleanUrl,
        pin: cleanPin,
        pairedAt: new Date().toISOString(),
        serverName: 'EventSpace Server',
      };

      await storage.setServerConfig(config);
      onPaired(config);
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection error. Ensure device is on the same Wi-Fi.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parsePairingPayload(text);
      if (parsed) {
        if (parsed.serverUrl) setServerUrl(parsed.serverUrl);
        if (parsed.pin) setPin(parsed.pin);
        if (parsed.serverUrl && parsed.pin) {
          handlePair(parsed.serverUrl, parsed.pin);
        }
      } else {
        setServerUrl(text.trim());
      }
    } catch {
      setErrorMessage('Clipboard access not granted. Please paste manually.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const decoded = await decodeQrFromImageFile(file);
      if (decoded) {
        const parsed = parsePairingPayload(decoded);
        if (parsed?.serverUrl) setServerUrl(parsed.serverUrl);
        if (parsed?.pin) setPin(parsed.pin);
        if (parsed?.serverUrl && parsed?.pin) {
          await handlePair(parsed.serverUrl, parsed.pin);
          return;
        }
      } else {
        setErrorMessage('No QR code detected in the uploaded image. Try another photo or enter manually.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to decode QR image: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-slate-950 text-white p-6 safe-top safe-bottom overflow-y-auto">
      {/* Brand Hero */}
      <div className="pt-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl text-white mb-2 p-2">
          <img
            src="/EventSpace-Icon-Darkmode.png"
            alt="EventSpace"
            className="w-12 h-12 object-contain"
          />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span>EventSpace</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
            Companion
          </span>
        </h1>
        <p className="text-sm text-slate-400 max-w-xs mx-auto">
          Pair with your desktop or Unraid EventSpace instance to sync your schedule on the go.
        </p>
      </div>

      {/* Pairing Card */}
      <div className="my-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-blue-400" />
            <span>Connect to Instance</span>
          </span>
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/50 px-2 py-1 rounded-lg border border-blue-900/60"
            title="Paste link or pairing PIN from clipboard"
          >
            <Clipboard className="w-3 h-3" />
            <span>Paste Link</span>
          </button>
        </div>

        {/* Server Address Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Server Address
          </label>
          <div className="relative flex items-center">
            <Server className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://192.168.1.150:3001"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Pairing PIN Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Pairing PIN
          </label>
          <div className="relative flex items-center">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="EVSP-9482"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest font-bold"
            />
          </div>
          <p className="text-[10px] text-slate-500">
            Find the PIN in Web App → Settings → Mobile Companion App tab.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Connect Action */}
        <button
          type="button"
          onClick={() => handlePair()}
          disabled={isConnecting}
          className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Connection...</span>
            </>
          ) : (
            <>
              <span>Connect & Pair</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* QR Code Scan or Upload Option */}
        <div className="pt-2 text-center">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-800 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <QrCode className="w-4 h-4 text-blue-400" />
            <span>Scan QR Code Image / Photo</span>
          </button>
        </div>
      </div>

      {/* Quick Local Network Presets */}
      <div className="text-center space-y-2 pb-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Quick Network Presets
        </span>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setServerUrl('http://localhost:3001')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-white"
          >
            localhost:3001
          </button>
          <button
            type="button"
            onClick={() => setServerUrl('http://192.168.1.150:3001')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-white"
          >
            192.168.1.150:3001
          </button>
        </div>
      </div>
    </div>
  );
};
