'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { ExtractedMedication, TimeSlot, MealRelation } from '@/types';
import { mapSlotsToTimes } from '@/services/scheduleEngine';

interface BillScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleCreated: () => void;
}

export const BillScanModal: React.FC<BillScanModalProps> = ({
  isOpen,
  onClose,
  onScheduleCreated,
}) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState<number>(0.95);
  const [medications, setMedications] = useState<ExtractedMedication[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setStep('processing');

      try {
        const response = await fetch('/api/v1/scans/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: base64,
            mime_type: file.type || 'image/jpeg',
          }),
        });

        const data = await response.json();
        setConfidenceScore(data.confidence_score || 0.94);
        setMedications(data.items || []);
        setStep('review');
      } catch (err) {
        console.error('Scan failed:', err);
        alert('Could not parse receipt. Please verify image or try again.');
        setStep('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleBill = () => {
    // Instant test drive with sample pharmacy receipt
    setStep('processing');
    setTimeout(async () => {
      try {
        const response = await fetch('/api/v1/scans/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: 'sample_mock_receipt',
            mime_type: 'image/jpeg',
          }),
        });
        const data = await response.json();
        setConfidenceScore(data.confidence_score || 0.96);
        setMedications(data.items || []);
        setStep('review');
      } catch {
        setStep('upload');
      }
    }, 1200);
  };

  const handleUpdateMed = (index: number, updates: Partial<ExtractedMedication>) => {
    setMedications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleToggleSlot = (index: number, slot: TimeSlot) => {
    setMedications((prev) => {
      const next = [...prev];
      const currentSlots = next[index].suggested_slots || [];
      const hasSlot = currentSlots.includes(slot);
      const newSlots = hasSlot
        ? currentSlots.filter((s) => s !== slot)
        : [...currentSlots, slot];
      next[index] = { ...next[index], suggested_slots: newSlots };
      return next;
    });
  };

  const handleRemoveMed = (index: number) => {
    setMedications((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddMed = () => {
    setMedications((prev) => [
      ...prev,
      {
        temp_id: `manual_${Date.now()}`,
        medicine_name: 'New Medication',
        strength: '500mg',
        dosage_quantity: '1 tablet',
        frequency_pattern: 'TWICE_DAILY',
        meal_timing: 'AFTER_FOOD',
        suggested_slots: ['MORNING', 'EVENING'],
        total_quantity: 14,
        inferred_duration_days: 7,
      },
    ]);
  };

  const handleConfirmSchedule = async () => {
    setIsSubmitting(true);
    try {
      const payloadItems = medications.map((med) => ({
        medicine_name: med.medicine_name,
        strength: med.strength,
        dosage_instruction: med.dosage_quantity,
        meal_relation: med.meal_timing,
        daily_times: mapSlotsToTimes(med.suggested_slots),
        suggested_slots: med.suggested_slots,
        duration_days: med.inferred_duration_days || 7,
      }));

      const res = await fetch('/api/v1/schedules/batch-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: new Date().toISOString().split('T')[0],
          items: payloadItems,
        }),
      });

      if (!res.ok) throw new Error('Schedule creation failed');

      onScheduleCreated();
      onClose();
    } catch (err) {
      console.error('Failed to commit schedules:', err);
      alert('Failed to save schedules. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {step === 'upload' && 'Scan Receipt or Prescription'}
                {step === 'processing' && 'Extracting Medication Schedule...'}
                {step === 'review' && 'Review Extracted Regimen'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'upload' && 'Upload a photo/PDF of your pharmacy bill'}
                {step === 'processing' && 'Gemini Vision AI is analyzing prescription entities'}
                {step === 'review' && 'Verify dosage times and duration before activation'}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Click to upload receipt photo or PDF
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports JPG, PNG, WEBP, and PDF up to 10MB
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-md flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Mobile Camera
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-md flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Pharmacy Invoice
                  </span>
                </div>
              </div>

              {/* Instant Test Drive Option */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Testing out the prototype?</h5>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Load a sample Apollo Pharmacy receipt with antibiotics and antacids
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseSampleBill}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm shadow-emerald-200"
                >
                  Use Sample Bill
                </button>
              </div>

              {/* HIPAA / Disclaimer */}
              <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-amber-50/60 border border-amber-200/60 p-3 rounded-xl">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  <b>Zero-Retention Privacy:</b> Images are processed ephemerally in memory and discarded. No patient identity or payment info is ever saved.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
                <Sparkles className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Parsing Pharmacy Receipt
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Gemini Vision is detecting tablet names, strengths, AC/PC meal rules, and dosage frequency...
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW */}
          {step === 'review' && (
            <div className="space-y-5">
              {/* Top Banner */}
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-900">
                    {medications.length} Medications Extracted
                  </span>
                </div>
                <span className="text-[11px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                  {Math.round(confidenceScore * 100)}% Confidence
                </span>
              </div>

              {/* Medication Cards List */}
              <div className="space-y-4">
                {medications.map((med, idx) => (
                  <div
                    key={med.temp_id || idx}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        {/* Name & Strength */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400">
                              Medicine Name
                            </label>
                            <input
                              type="text"
                              value={med.medicine_name}
                              onChange={(e) =>
                                handleUpdateMed(idx, { medicine_name: e.target.value })
                              }
                              className="w-full text-xs font-semibold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400">
                              Strength
                            </label>
                            <input
                              type="text"
                              value={med.strength}
                              onChange={(e) =>
                                handleUpdateMed(idx, { strength: e.target.value })
                              }
                              className="w-full text-xs font-semibold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Meal Relation Segmented Control */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400">
                            Meal Timing
                          </label>
                          <div className="flex items-center gap-1.5 mt-1">
                            {(['BEFORE_FOOD', 'AFTER_FOOD', 'NONE'] as MealRelation[]).map((rel) => (
                              <button
                                key={rel}
                                type="button"
                                onClick={() => handleUpdateMed(idx, { meal_timing: rel })}
                                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                                  med.meal_timing === rel
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {rel === 'BEFORE_FOOD' && 'Before Food'}
                                {rel === 'AFTER_FOOD' && 'After Food'}
                                {rel === 'NONE' && 'No Restriction'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Time Slots Toggles */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400">
                            Daily Slots
                          </label>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {(['MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME'] as TimeSlot[]).map((slot) => {
                              const active = med.suggested_slots?.includes(slot);
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => handleToggleSlot(idx, slot)}
                                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                    active
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {slot === 'MORNING' && 'Morning (08:30)'}
                                  {slot === 'AFTERNOON' && 'Afternoon (13:30)'}
                                  {slot === 'EVENING' && 'Evening (20:30)'}
                                  {slot === 'BEDTIME' && 'Bedtime (22:30)'}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Duration Preset Chips */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400">
                            Duration
                          </label>
                          <div className="flex items-center gap-1.5 mt-1">
                            {[7, 10, 14, 21].map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => handleUpdateMed(idx, { inferred_duration_days: days })}
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                  med.inferred_duration_days === days
                                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 font-bold'
                                    : 'border-slate-200 text-slate-500'
                                }`}
                              >
                                {days} Days
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMed(idx)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        title="Remove Medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Another Medicine Button */}
              <button
                type="button"
                onClick={handleAddMed}
                className="w-full py-2.5 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Another Medicine
              </button>

              {/* Mandatory PRD Disclaimer */}
              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                ⚠️ <b>Clinical Disclaimer:</b> tablet.ai is an organizational assistant and not a medical device or diagnostic service. Always verify extracted tablet names and dosages against your physician&apos;s explicit instructions.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2"
            >
              Back to Scan
            </button>
            <button
              type="button"
              disabled={isSubmitting || medications.length === 0}
              onClick={handleConfirmSchedule}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 shadow-emerald-200"
            >
              <span>{isSubmitting ? 'Activating Schedule...' : 'Confirm & Activate Schedule'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
