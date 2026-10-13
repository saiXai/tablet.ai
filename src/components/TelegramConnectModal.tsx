'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ExternalLink, CheckCircle2, Copy, Check } from 'lucide-react';

interface TelegramConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onConnectedStatusChange: (status: boolean) => void;
}

export const TelegramConnectModal: React.FC<TelegramConnectModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  onConnectedStatusChange,
}) => {
  const [token, setToken] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !isConnected) {
      fetch('/api/v1/telegram/connect', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          setToken(data.token);
          setDeepLink(data.deepLink);
          if (data.connected) onConnectedStatusChange(true);
        })
        .catch(console.error);
    }
  }, [isOpen, isConnected, onConnectedStatusChange]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`/start ${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateConnection = () => {
    // For local prototype demonstration if no live telegram bot token configured yet
    onConnectedStatusChange(true);
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
              <p className="text-xs text-slate-500">Dual-channel reminder delivery</p>
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
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Connected to @TabletAiReminderBot
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your notifications are active. You will receive nudges 10 minutes prior to every dose with single-tap checkoff buttons.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onConnectedStatusChange(false)}
                  className="text-xs text-red-500 hover:underline font-semibold"
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
                  Connect your personal Telegram account to receive gentle nudges with interactive <b>[ ✅ Taken ]</b> and <b>[ ⏱️ Snooze 15m ]</b> buttons.
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
