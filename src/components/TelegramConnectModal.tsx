'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, CheckCircle2, Copy, Check, BellRing, Loader2, Globe, Smartphone } from 'lucide-react';

interface TelegramConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onConnectedStatusChange: (status: boolean) => void;
  userEmail?: string;
}

export const TelegramConnectModal: React.FC<TelegramConnectModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  onConnectedStatusChange,
  userEmail,
}) => {
  const [token, setToken] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const [botUsername, setBotUsername] = useState<string>('sai_tablet_ai_bot');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedBot, setCopiedBot] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/telegram/connect', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          setToken(data.token);
          setDeepLink(data.deepLink);
          if (data.deepLink) {
            const match = data.deepLink.match(/t\.me\/([^?]+)/);
            if (match && match[1]) setBotUsername(match[1]);
          }
          if (data.connected) onConnectedStatusChange(true);
        })
        .catch(console.error);
    }
  }, [isOpen, onConnectedStatusChange]);

  if (!isOpen) return null;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(`/start ${token}`);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleCopyBot = () => {
    navigator.clipboard.writeText(`@${botUsername}`);
    setCopiedBot(true);
    setTimeout(() => setCopiedBot(false), 2000);
  };

  const handleSimulateConnection = () => {
    onConnectedStatusChange(true);
  };

  const handleSendTestNotification = async () => {
    try {
      setIsSendingTest(true);
      setTestStatus(null);
      const res = await fetch('/api/v1/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus(`Dispatched ${data.reminders_dispatched || 1} reminder notification!`);
      } else {
        setTestStatus(data.error || 'Failed to dispatch test notification');
      }
    } catch {
      setTestStatus('Notification trigger error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const webTelegramUrl = `https://web.telegram.org/a/#?tgaddr=${encodeURIComponent(`tg://resolve?domain=${botUsername}&start=${token}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Telegram Nudge Bot</h3>
              <p className="text-xs text-slate-500">
                {userEmail ? `Pairing ${userEmail}` : 'Dual-channel reminder delivery'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {isConnected ? (
            <div className="text-center py-2 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Connected to @{botUsername}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your notifications are active. You will receive nudges 10 minutes prior to every dose with single-tap checkoff buttons.
              </p>

              {/* Test Notification Trigger */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  disabled={isSendingTest}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-200 transition-colors disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BellRing className="w-3.5 h-3.5" />
                  )}
                  <span>Send Test Dose Reminder Now</span>
                </button>
                {testStatus && (
                  <p className="text-[11px] text-slate-600 mt-2 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {testStatus}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onConnectedStatusChange(false)}
                  className="text-xs text-rose-500 hover:underline font-semibold"
                >
                  Disconnect Telegram
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 text-center">
                <h4 className="text-sm font-bold text-slate-900">
                  Pair with @{botUsername}
                </h4>
                <p className="text-xs text-slate-500">
                  Choose how you want to open Telegram to activate instant dose alerts:
                </p>
              </div>

              {/* 2 Opening Options for Desktop & Mobile */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Option A: Telegram Web (Browser) */}
                <a
                  href={webTelegramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-900 transition-colors flex flex-col items-center text-center gap-1.5"
                >
                  <Globe className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold">Telegram Web</p>
                    <p className="text-[10px] text-blue-700">Open in browser</p>
                  </div>
                </a>

                {/* Option B: Telegram App */}
                <a
                  href={deepLink || `https://t.me/${botUsername}?start=${token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 transition-colors flex flex-col items-center text-center gap-1.5"
                >
                  <Smartphone className="w-5 h-5 text-slate-700" />
                  <div>
                    <p className="text-xs font-bold">Telegram App</p>
                    <p className="text-[10px] text-slate-500">Desktop / Mobile</p>
                  </div>
                </a>
              </div>

              {/* Manual Direct Command Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Or Search Bot in Telegram
                  </span>
                  <button
                    onClick={handleCopyBot}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    {copiedBot ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>@{botUsername}</span>
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-slate-800">
                    /start {token || 'tk_demo'}
                  </span>
                  <button
                    onClick={handleCopyCmd}
                    className="text-xs font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1"
                  >
                    {copiedCmd ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 text-[11px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[11px]">Copy Command</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Open Telegram, search for <b>@{botUsername}</b>, and send the copied command.
                </p>
              </div>

              {/* Demo button */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleSimulateConnection}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  ⚡ Simulate Successful Connection (Demo Mode)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
