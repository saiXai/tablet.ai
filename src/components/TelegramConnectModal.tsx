'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ExternalLink, CheckCircle2, Copy, Check, BellRing, Loader2 } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/telegram/connect', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          setToken(data.token);
          setDeepLink(data.deepLink);
          if (data.connected) onConnectedStatusChange(true);
        })
        .catch(console.error);
    }
  }, [isOpen, onConnectedStatusChange]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`/start ${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                {userEmail ? `Configuring for ${userEmail}` : 'Dual-channel reminder delivery'}
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
        <div className="p-6 space-y-5">
          {isConnected ? (
            <div className="text-center py-2 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Connected to @TabletAiReminderBot
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
              <div className="space-y-2 text-center">
                <h4 className="text-sm font-bold text-slate-900">
                  Receive Timely Alerts in Telegram
                </h4>
                <p className="text-xs text-slate-500">
                  Connect your personal Telegram account to receive gentle nudges with interactive <b>[ ✅ Taken ]</b>, <b>[ ⏱️ Snooze 15m ]</b>, and <b>[ ❌ Skip ]</b> buttons.
                </p>
              </div>

              {/* Action Button */}
              <a
                href={deepLink || 'https://t.me/TabletAiReminderBot'}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-200 transition-colors"
              >
                <span>Open in Telegram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* Deep link manual command */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Or Send Bot Command
                </span>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono">
                  <span>/start {token || 'tk_demo'}</span>
                  <button
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
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
