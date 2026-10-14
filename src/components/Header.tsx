'use client';

import React, { useState } from 'react';
import { Pill, MessageSquare, Sparkles, User as UserIcon, LogOut } from 'lucide-react';
import { AuthModal } from './AuthModal';

interface HeaderProps {
  onOpenScan: () => void;
  onOpenTelegram: () => void;
  isTelegramConnected: boolean;
  currentUser?: { name: string; email: string } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScan,
  onOpenTelegram,
  isTelegramConnected,
  currentUser,
  onLogout,
}) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <>
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
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* User Profile / Auth Button */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs transition-colors"
                  title="View Account"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    {currentUser.name ? currentUser.name.charAt(0) : <UserIcon className="w-3 h-3" />}
                  </div>
                  <span className="max-w-[100px] truncate">{currentUser.name}</span>
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-xs transition-colors"
                    title="Log Out of tablet.ai"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all active:scale-95"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Telegram Button */}
            <button
              onClick={onOpenTelegram}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isTelegramConnected
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Connect Telegram Reminders"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">
                {isTelegramConnected ? 'Telegram Active' : 'Connect Bot'}
              </span>
              <span className="sm:hidden">Bot</span>
              {isTelegramConnected && (
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              )}
            </button>

            {/* Scan Bill Button */}
            <button
              onClick={onOpenScan}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all shadow-emerald-200 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Scan Bill</span>
            </button>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
      />
    </>
  );
};
