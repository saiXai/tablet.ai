'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Mail, Sparkles, CheckCircle2, AlertCircle, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelected?: (email: string) => void;
  currentUser?: { name: string; email: string } | null;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onUserSelected,
  currentUser,
  onLogout,
}) => {
  const [email, setEmail] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  const handleOAuthSignIn = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      setLoadingProvider(provider);
      setMessage(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      }
    } catch (e: unknown) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'OAuth sign in failed',
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoadingProvider('email');
      setMessage(null);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({
          type: 'success',
          text: `Magic link sent! Check your inbox at ${email}`,
        });
      }
    } catch (e: unknown) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed to send login email',
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleSelectSeedUser = async (targetEmail: string) => {
    if (onUserSelected) {
      onUserSelected(targetEmail);
    }
    setMessage({
      type: 'success',
      text: `Switched active profile to ${targetEmail}`,
    });
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleSignOut = async () => {
    try {
      setLoadingProvider('logout');
      await supabase.auth.signOut();
      if (onLogout) {
        onLogout();
      }
      setMessage({ type: 'success', text: 'Logged out successfully.' });
    } catch (e: unknown) {
      setMessage({ type: 'error', text: 'Error signing out' });
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 z-50 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <Dialog.Title className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Account & Authentication</span>
              </Dialog.Title>
              <p className="text-xs text-slate-500 mt-0.5">
                OAuth 2.0, Supabase Auth & profile management
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Active Session & Logout Card */}
          {currentUser && (
            <div className="mt-4 p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  {currentUser.name ? currentUser.name.charAt(0) : <UserIcon className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-600 font-mono">{currentUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loadingProvider === 'logout'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 shadow-sm transition-colors"
              >
                {loadingProvider === 'logout' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Log Out</span>
              </button>
            </div>
          )}

          {/* Quick Seed Users Switcher */}
          <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Quick Seed Switcher
              </span>
              <span className="text-[10px] text-slate-600 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                1-Click Switch
              </span>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSelectSeedUser('saiphaneendra09@gmail.com')}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                  currentUser?.email === 'saiphaneendra09@gmail.com'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-900">Sai Phaneendra</p>
                  <p className="text-[11px] text-slate-500">saiphaneendra09@gmail.com</p>
                </div>
                {currentUser?.email === 'saiphaneendra09@gmail.com' && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectSeedUser('saiphanimba09@gmail.com')}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                  currentUser?.email === 'saiphanimba09@gmail.com'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-900">Sai Phanimba</p>
                  <p className="text-[11px] text-slate-500">saiphanimba09@gmail.com</p>
                </div>
                {currentUser?.email === 'saiphanimba09@gmail.com' && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Social OAuth 2.0 Section */}
          <div className="mt-5 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              OAuth 2.0 Social Logins
            </p>

            {/* Google */}
            <button
              type="button"
              disabled={loadingProvider !== null}
              onClick={() => handleOAuthSignIn('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              disabled={loadingProvider !== null}
              onClick={() => handleOAuthSignIn('apple')}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loadingProvider === 'apple' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.35c.64-.78 1.08-1.86.96-2.95-1 .04-2.14.65-2.82 1.44-.59.68-1.12 1.78-.98 2.84 1.11.08 2.2-.55 2.84-1.33z" />
                </svg>
              )}
              <span>Continue with Apple</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              disabled={loadingProvider !== null}
              onClick={() => handleOAuthSignIn('facebook')}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#1877F2] bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loadingProvider === 'facebook' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              <span>Continue with Facebook</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-white px-2 text-slate-400">Or with Email</span>
            </div>
          </div>

          {/* Email magic link form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <label htmlFor="auth-email" className="block text-[11px] font-medium text-slate-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingProvider !== null || !email}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingProvider === 'email' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              <span>Send Magic Link / OTP</span>
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
