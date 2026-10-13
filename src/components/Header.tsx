'use client';

import React from 'react';
import { Pill, MessageSquare, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenScan: () => void;
  onOpenTelegram: () => void;
  isTelegramConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScan,
  onOpenTelegram,
  isTelegramConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
            <Pill className="w-5 h-5 rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900">tablet.ai</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                MVP
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Smart Medication Adherence</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenTelegram}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isTelegramConnected
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Connect Telegram Reminders"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">
              {isTelegramConnected ? 'Telegram Connected' : 'Connect Telegram'}
            </span>
            <span className="sm:hidden">Telegram</span>
            {isTelegramConnected && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>

          <button
            onClick={onOpenScan}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all shadow-emerald-200 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scan Bill</span>
          </button>
        </div>
      </div>
    </header>
  );
};
