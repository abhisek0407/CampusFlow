'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Building2,
  PlusCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function ClubOverviewView({ setActiveTab }) {
  const [bookings, setBookings] = useState([]);
  const clubName = 'Dramatics Society';

  useEffect(() => {
    fetch('/api/bookings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.bookings) {
          // Filter to Dramatics Society / Club requests
          const myB = data.bookings.filter(b => 
            b.requester?.includes('Dramatics') || 
            b.role === 'club' ||
            b.title?.toLowerCase().includes('drama') ||
            b.title?.toLowerCase().includes('play') ||
            b.title?.toLowerCase().includes('theatre')
          );
          setBookings(myB.length > 0 ? myB : data.bookings.slice(0, 5));
        }
      })
      .catch(e => console.error(e));
  }, []);

  const total = bookings.length || 4;
  const approved = bookings.filter(b => b.status === 'approved').length;
  const pending = bookings.filter(b => b.status === 'pending').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;

  return (
    <div className="space-y-6">
      
      {/* Clean Unboxed Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Chilika Institute of Technology</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Spectra Tech Fest</span>
            <span>•</span>
            <span className="text-slate-400">Club Representative Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {clubName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Submit venue requests in natural English or Hinglish, track Dean review status, and manage Spectra fest slots.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('new-venue-booking')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition flex items-center space-x-2 shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>
          <button
            onClick={() => setActiveTab('my-bookings')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium text-xs transition flex items-center space-x-2 cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Track Bookings</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Total Requests</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{total}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Submitted for Week 7</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Approved Venues</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{approved}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Auditorium & OAT secured</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Pending Dean Review</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pending}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting slot verification</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Withdrawn (Rule B3)</div>
          <div className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">{cancelled}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Strictly non-schedulable</p>
        </div>
      </div>

      {/* Festival Guidelines & Fast Track Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Priority Order Guide */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Section 4 Room Allocation Priority Hierarchy
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            When two requests want the same room at the same time, this strict order decides who gets it:
          </p>

          <div className="space-y-2">
            {[
              { rank: 1, title: 'Midsem & Final Exams', desc: 'Absolute priority across campus (50% capacity halving)', color: 'border-rose-400 bg-rose-50/40 text-rose-900' },
              { rank: 2, title: 'Regular Academic Classes', desc: 'Lectures, tutorials & 3-hour labs (H1–H14 compliant)', color: 'border-blue-400 bg-blue-50/40 text-blue-900' },
              { rank: 3, title: 'Institute Events', desc: 'Spectra main events, convocation, inaugurations', color: 'border-indigo-400 bg-indigo-50/40 text-indigo-900' },
              { rank: 4, title: 'Guest Lectures & Workshops', desc: 'Invited industry talks & symposiums', color: 'border-amber-400 bg-amber-50/40 text-amber-900' },
              { rank: 5, title: 'Department Events', desc: 'Branch technical seminars & coordinator meetings', color: 'border-purple-400 bg-purple-50/40 text-purple-900' },
              { rank: 6, title: 'Club & Society Events', desc: 'Dramatics, music, dance, coding rehearsals & competitions', color: 'border-emerald-400 bg-emerald-50/40 text-emerald-900' },
            ].map((p) => (
              <div key={p.rank} className={`p-2.5 rounded-xl border text-xs flex items-center space-x-3 ${p.color} dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`}>
                <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0">
                  {p.rank}
                </span>
                <div className="flex-1">
                  <span className="font-bold">{p.title}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">— {p.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Club Fast-Track Actions
            </h3>
            <p className="text-xs text-slate-500 mb-4">Quick options for festival logistics</p>

            <div className="space-y-2.5">
              <button
                onClick={() => setActiveTab('new-venue-booking')}
                className="w-full p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-emerald-900 dark:text-emerald-200">Submit Plain Text Booking</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Type in Hinglish or English</div>
                </div>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </button>

              <button
                onClick={() => setActiveTab('my-bookings')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Manage My Bookings</div>
                  <div className="text-[10px] text-slate-500">View room allocations or withdraw request</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </button>

              <button
                onClick={() => setActiveTab('booking-history')}
                className="w-full p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-indigo-900 dark:text-indigo-200">Past Approvals & Audit</div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-400">Review rejection justifications</div>
                </div>
                <Calendar className="w-4 h-4 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
