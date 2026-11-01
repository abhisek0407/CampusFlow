'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  DoorOpen
} from 'lucide-react';

export default function ClubBookingHistoryView() {
  const [history, setHistory] = useState([
    {
      id: 'REQ-25',
      title: 'Spectra Inaugural Musical Play',
      room: 'AUD-1',
      slot: 'THU P10-P12 (18:00-21:00)',
      attendance: 280,
      status: 'approved',
      reason: 'Approved by Dean. No academic classes scheduled in evening block.'
    },
    {
      id: 'REQ-18',
      title: 'Street Theatre Prelims',
      room: 'OAT (Open Air Theatre)',
      slot: 'WED P7-P9 (15:00-18:00)',
      attendance: 120,
      status: 'approved',
      reason: 'Open Air Theatre allocated. Audio system permitted.'
    },
    {
      id: 'REQ-12',
      title: 'Backstage Prop & Sound Rehearsal',
      room: 'LH-4',
      slot: 'TUE P6-P8 (14:00-17:00)',
      attendance: 50,
      status: 'rejected',
      reason: 'Rejected. LH-4 is under maintenance window for projector repairs.'
    },
    {
      id: 'REQ-07',
      title: 'Drama Script Reading Session',
      room: 'CR-101',
      slot: 'MON P3 (10:00-11:00)',
      attendance: 35,
      status: 'cancelled',
      reason: 'Withdrawn by club representative (Rule B3 strictly non-schedulable).'
    }
  ]);

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>Club Booking Historical Log & Decision Records</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Archived timeline of all Spectra festival requests, justifications, allocations, and withdrawals.
        </p>
      </div>

      <div className="space-y-3">
        {history.map((item) => (
          <div key={item.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md card-interactive text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{item.id}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.title}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                item.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                item.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                'bg-slate-200 text-slate-600 line-through'
              }`}>
                {item.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-500">
              <span>Venue: <strong className="text-slate-700 dark:text-slate-300">{item.room}</strong></span>
              <span>•</span>
              <span>Slot: <strong className="text-slate-700 dark:text-slate-300">{item.slot}</strong></span>
              <span>•</span>
              <span>Attendance: <strong className="text-slate-700 dark:text-slate-300">{item.attendance}</strong></span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
              <strong>Official Note:</strong> {item.reason}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
