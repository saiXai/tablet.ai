'use client';

import React, { useState, useEffect } from 'react';
import { Check, Clock, Utensils, RotateCcw } from 'lucide-react';
import { AdherenceTask } from '@/types';
import { formatTime, getMealRelationLabel } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface AdherenceAgendaProps {
  tasks: AdherenceTask[];
  onToggleTask: (taskId: string, action: 'COMPLETE' | 'REVERT_PENDING' | 'SKIP') => Promise<void>;
}

export const AdherenceAgenda: React.FC<AdherenceAgendaProps> = ({
  tasks,
  onToggleTask,
}) => {
  const [lastAction, setLastAction] = useState<{
    taskId: string;
    medicineName: string;
    previousStatus: string;
    timerId: NodeJS.Timeout | null;
  } | null>(null);

  const [undoCountdown, setUndoCountdown] = useState<number>(6);

  // Group tasks by time or slot
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
  );

  const handleTaskClick = async (task: AdherenceTask) => {
    // If completed -> toggle to REVERT_PENDING (persistent uncheck)
    // If pending -> toggle to COMPLETE
    const isCompleted = task.status === 'COMPLETED';
    const nextAction = isCompleted ? 'REVERT_PENDING' : 'COMPLETE';

    try {
      await onToggleTask(task.id, nextAction);

      if (!isCompleted) {
        // Trigger small vibration if supported
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(40);
        }

        // Show 6s sticky undo toast
        if (lastAction?.timerId) clearTimeout(lastAction.timerId);
        setUndoCountdown(6);

        const timer = setTimeout(() => {
          setLastAction(null);
        }, 6000);

        setLastAction({
          taskId: task.id,
          medicineName: task.medicine_name || 'Medication',
          previousStatus: task.status,
          timerId: timer,
        });

        // Check if all are completed now
        const pendingLeft = tasks.filter((t) => t.id !== task.id && t.status !== 'COMPLETED').length;
        if (pendingLeft === 0) {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.8 },
          });
        }
      } else {
        // Toggled back
        setLastAction(null);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    if (lastAction.timerId) clearTimeout(lastAction.timerId);

    await onToggleTask(lastAction.taskId, 'REVERT_PENDING');
    setLastAction(null);
  };

  // Countdown ticker for the 6s toast
  useEffect(() => {
    if (!lastAction) return;
    const interval = setInterval(() => {
      setUndoCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastAction]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Today&apos;s Schedule</h2>
          <p className="text-xs text-slate-500">Tap circular checkbox to mark doses taken</p>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">No scheduled doses for today</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Scan your pharmacy bill or prescription to instantly auto-generate your medication calendar.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedTasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            const scheduledTime = formatTime(task.scheduled_for);
            const foodRelation = task.meal_relation
              ? getMealRelationLabel(task.meal_relation, task.suggested_slots?.[0])
              : null;

            return (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isDone
                    ? 'bg-slate-50/70 border-slate-200 opacity-75'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Circular Checkbox */}
                  <button
                    type="button"
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : 'border-2 border-slate-300 group-hover:border-emerald-500 text-transparent'
                    }`}
                  >
                    <Check className={`w-4 h-4 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                  </button>

                  {/* Dose Information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`font-semibold text-sm truncate ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.medicine_name}
                      </h4>
                      {task.strength && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {task.strength}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500 font-medium">
                        {task.dosage_instruction}
                      </span>
                      {foodRelation && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          <Utensils className="w-3 h-3" />
                          {foodRelation}
                        </span>
                      )}
                      {task.channel_source === 'TELEGRAM' && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-medium">
                          via Telegram
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scheduled Time & Status */}
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{scheduledTime}</span>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isDone
                        ? 'text-emerald-600'
                        : task.status === 'DUE'
                        ? 'text-amber-600 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {isDone ? 'Taken' : task.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky 6-second Undo Toast */}
      {lastAction && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          <p className="text-xs font-medium">
            Marked <b>{lastAction.medicineName}</b> as taken.
          </p>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 rounded text-xs transition-colors ml-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo ({undoCountdown}s)</span>
          </button>
        </div>
      )}
    </div>
  );
};
