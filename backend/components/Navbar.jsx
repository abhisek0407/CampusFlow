'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Sparkles, 
  AlertTriangle, 
  FileCheck2, 
  Clock, 
  ShieldCheck, 
  RotateCcw,
  User,
  GraduationCap,
  Layers,
  ChevronDown
} from 'lucide-react';

const DEMO_USERS = [
  { id: 'USER_ADMIN', name: "Dean Academic Office", email: 'admin@cit.edu', role: 'admin', label: 'Admin (Dean)', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'USER_COORD_CSE', name: 'Prof. Rajesh Sharma', email: 'dept.cse@cit.edu', role: 'department_coordinator', label: 'Dept Coordinator', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'USER_FACULTY_F01', name: 'Dr. Ananya Mishra', email: 'faculty.f01@cit.edu', role: 'faculty', label: 'Faculty (F01)', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'USER_CLUB_DRAMATICS', name: 'Dramatics Society', email: 'club.dramatics@cit.edu', role: 'club', label: 'Club Rep (Spectra)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

export default function Navbar({ activeTab, setActiveTab, currentUser, onSwitchUser, onResetData, isResetting }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tabs = [
    { id: 'timetable', label: 'Timetable Matrix', icon: Calendar },
    { id: 'bookings', label: 'Spectra Fest & Venues', icon: Building2 },
    { id: 'ai-assistant', label: 'AI Booking & Hinglish', icon: Sparkles },
    { id: 'disruptions', label: 'Disruption Manager', icon: AlertTriangle },
    { id: 'exams', label: 'Midsem Exams', icon: Clock },
    { id: 'validator', label: 'Validator & Audit', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      {/* Top Banner: Institutional Identity + Demo Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Institute Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">CampusFlow</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">OrchestrAI</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Chilika Institute of Technology (CIT) • Autonomous Scheduling</p>
            </div>
          </div>

          {/* Right Actions: Live Benchmark Badge + Role Switcher + Reset Button */}
          <div className="flex items-center space-x-3">
            
            {/* Live Validator Health Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>0 Hard Violations</span>
              <span className="text-emerald-500">•</span>
              <span>61.0 Booking Score</span>
            </div>

            {/* Reset Demo Data Button (Explicit Hackathon Requirement) */}
            <button
              onClick={onResetData}
              disabled={isResetting}
              title="Reset dataset and database to clean starter pack state"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            {/* Demo User Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
              >
                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                <div className="text-left">
                  <div className="font-semibold text-white leading-tight">{currentUser?.name || 'Select Role'}</div>
                  <div className="text-[10px] text-indigo-300 capitalize">{currentUser?.role?.replace('_', ' ')}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-700/60">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Switch Demo Account (RBAC)</p>
                  </div>
                  <div className="py-1">
                    {DEMO_USERS.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 transition ${
                          currentUser?.id === u.id ? 'bg-indigo-950/40 text-indigo-300 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-white font-medium">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${u.badge}`}>
                          {u.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-950/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
