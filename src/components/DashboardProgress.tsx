'use client';

import React from 'react';
import { Flame, Calendar } from 'lucide-react';
import { DailySummary } from '@/types';

interface DashboardProgressProps {
  summary: DailySummary;
}

export const DashboardProgress: React.FC<DashboardProgressProps> = ({ summary }) => {
  const percentage = Math.round(summary.completion_rate * 100);

  // 7-day adherence history grid
  const complianceHistory = [
    { label: 'Mon', status: 'full' },
    { label: 'Tue', status: 'full' },
    { label: 'Wed', status: 'full' },
    { label: 'Thu', status: 'full' },
    { label: 'Fri', status: 'full' },
    { label: 'Today', status: percentage === 100 ? 'full' : percentage > 0 ? 'partial' : 'pending' },
    { label: 'Sun', status: 'upcoming' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 1. Daily Progress Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Today&apos;s Adherence
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">
              {summary.completed_count} <span className="text-slate-400 font-normal text-lg">/ {summary.total_scheduled}</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">doses taken</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {percentage === 100 ? 'All doses completed for today! 🎉' : `${percentage}% adherence today`}
          </p>
        </div>

        {/* Circular Progress SVG */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-emerald-500 transition-all duration-700 ease-out"
              strokeDasharray={`${percentage}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-800">
            {percentage}%
          </span>
        </div>
      </div>

      {/* 2. Streak Counter Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Current Streak
          </span>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-2xl font-bold text-slate-900">
              {summary.current_streak_days} <span className="text-slate-500 font-normal text-base">Days</span>
            </h3>
          </div>
          <p className="text-xs text-amber-600 font-medium mt-1">
            Consistent dose timing maintains therapeutic levels
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm">
          <Flame className="w-7 h-7 fill-amber-400" />
        </div>
      </div>

      {/* 3. Weekly Heatmap Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            7-Day History
          </span>
          <Calendar className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-center justify-between gap-1.5 pt-1">
          {complianceHistory.map((day, idx) => {
            let bgClass = 'bg-slate-100 text-slate-400';
            if (day.status === 'full') bgClass = 'bg-emerald-500 text-white';
            else if (day.status === 'partial') bgClass = 'bg-amber-400 text-white';

            return (
              <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors ${bgClass}`}
                >
                  {day.status === 'full' ? '✓' : ''}
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
