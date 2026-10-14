'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { DashboardProgress } from '@/components/DashboardProgress';
import { AdherenceAgenda } from '@/components/AdherenceAgenda';
import { BillScanModal } from '@/components/BillScanModal';
import { TelegramConnectModal } from '@/components/TelegramConnectModal';
import { DailySummary, TaskStatus, User } from '@/types';
import { Sparkles, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthModal } from '@/components/AuthModal';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DailySummary>({
    date: new Date().toISOString().split('T')[0],
    total_scheduled: 0,
    completed_count: 0,
    completion_rate: 0,
    current_streak_days: 5,
    tasks: [],
  });

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const supabase = createClient();

  // Load active user details
  const loadUser = useCallback(async (email?: string) => {
    try {
      const url = email ? `/api/v1/user?email=${encodeURIComponent(email)}` : '/api/v1/user';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setIsTelegramConnected(!!data.user?.telegram_chat_id);
        return data.user;
      }
    } catch (err) {
      console.error('Failed to load user:', err);
    }
    return null;
  }, []);

  // Load daily summary for user
  const loadDailySummary = useCallback(async (userId?: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const targetUserId = userId || currentUser?.id;
      const url = targetUserId
        ? `/api/v1/dashboard/daily-summary?date=${today}&userId=${targetUserId}`
        : `/api/v1/dashboard/daily-summary?date=${today}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }, [currentUser?.id]);

  // Initial mount: only load if real Supabase session exists
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const u = await loadUser(session.user.email);
        if (u) loadDailySummary(u.id);
      } else {
        setCurrentUser(null);
        setIsTelegramConnected(false);
      }
    };
    initSession();

    // Listen to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        // Sync with backend active user
        await fetch('/api/v1/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email }),
        });
        loadUser(session.user.email).then((u) => {
          if (u) loadDailySummary(u.id);
        });
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsTelegramConnected(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadUser, loadDailySummary, supabase.auth]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await fetch('/api/v1/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logout: true }),
      });
      setCurrentUser(null);
      setIsTelegramConnected(false);
      setSummary({
        date: new Date().toISOString().split('T')[0],
        total_scheduled: 0,
        completed_count: 0,
        completion_rate: 0,
        current_streak_days: 0,
        tasks: [],
      });
      setIsAuthOpen(true);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleToggleTask = async (
    taskId: string,
    action: 'COMPLETE' | 'REVERT_PENDING' | 'SKIP'
  ) => {
    // Optimistic UI update
    setSummary((prev) => {
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          const newStatus: TaskStatus = action === 'COMPLETE' ? 'COMPLETED' : action === 'SKIP' ? 'SKIPPED' : 'PENDING';
          return {
            ...t,
            status: newStatus,
            completed_at: action === 'COMPLETE' ? new Date().toISOString() : null,
          };
        }
        return t;
      });

      const total = updatedTasks.length;
      const completed = updatedTasks.filter((t) => t.status === 'COMPLETED').length;

      return {
        ...prev,
        tasks: updatedTasks,
        completed_count: completed,
        completion_rate: total > 0 ? completed / total : 0,
      };
    });

    try {
      await fetch(`/api/v1/adherence/${taskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, source: 'APP_UI' }),
      });
      // Silent sync with server
      loadDailySummary();
    } catch (err) {
      console.error('Failed to sync toggle:', err);
      loadDailySummary();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <Header
        onOpenScan={() => setIsScanOpen(true)}
        onOpenTelegram={() => setIsTelegramOpen(true)}
        isTelegramConnected={isTelegramConnected}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {currentUser ? `Good day, ${currentUser.name} 👋` : 'Welcome to tablet.ai 👋'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser ? (
                <>Logged in as <span className="font-semibold text-slate-700">{currentUser.email}</span></>
              ) : (
                <>Not signed in. Connect via Google, Apple, or Email to track your medication schedule.</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!currentUser ? (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Test OAuth</span>
              </button>
            ) : (
              <button
                onClick={() => setIsScanOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all shadow-emerald-200 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Scan Bill / Receipt</span>
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Analytics & Streak */}
        <DashboardProgress summary={summary} />

        {/* Today's Medication Agenda */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <AdherenceAgenda
            tasks={summary.tasks}
            onToggleTask={handleToggleTask}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>tablet.ai • Intelligent Medication Adherence Companion</p>
      </footer>

      {/* Modals */}
      <BillScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onScheduleCreated={() => loadDailySummary()}
      />

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
        isConnected={isTelegramConnected}
        onConnectedStatusChange={setIsTelegramConnected}
        userEmail={currentUser?.email}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    </div>
  );
}
