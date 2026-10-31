'use client';

import React, { useState } from 'react';
import {
  Menu,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  User,
  GraduationCap,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';
import { ROLE_NAV_CONFIG } from './Sidebar';

export const DEMO_USERS = [
  {
    id: 'USER_ADMIN',
    name: "Dean Academic Office (Admin)",
    email: 'admin@cit.edu',
    role: 'admin',
    department: 'ADMIN',
    badge: 'bg-rose-100 text-rose-800 border-rose-200'
  },
  {
    id: 'USER_COORD_CSE',
    name: 'Prof. Rajesh Sharma (Coordinator)',
    email: 'dept.cse@cit.edu',
    role: 'department_coordinator',
    department: 'CSE',
    badge: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'USER_FACULTY_F01',
    name: 'Dr. Ananya Mishra',
    email: 'faculty.f01@cit.edu',
    role: 'faculty',
    department: 'CSE',
    linked_faculty_id: 'F01',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'USER_CLUB_DRAMATICS',
    name: 'Dramatics Society Lead',
    email: 'club.dramatics@cit.edu',
    role: 'club',
    department: 'CLUBS',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
];

export default function TopHeader({
  currentUser,
  activeTab,
  onSwitchUser,
  onResetData,
  isResetting,
  sidebarCollapsed,
  setSidebarCollapsed,
  onOpenLoginModal
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const roleConfig = ROLE_NAV_CONFIG[currentUser?.role] || ROLE_NAV_CONFIG.admin;
  const currentTabObj = roleConfig.tabs.find(t => t.id === activeTab) || roleConfig.tabs[0];

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Sidebar Toggle + Breadcrumb */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-sm">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {roleConfig.label}
            </span>
            <span className="text-slate-400">/</span>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {currentTabObj?.label || 'Overview'}
            </span>
          </div>

          {/* Academic Semester Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>Week 7: Spectra Fest & Midsems Prep</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Official Benchmark Status Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>0 Hard Violations</span>
            <span className="text-emerald-400">•</span>
            <span>67.0 Booking Score (Ceiling)</span>
            <span className="text-emerald-400">•</span>
            <span>3 Soft Penalty</span>
          </div>

          {/* Admin Reset Demo Data Button */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={onResetData}
              disabled={isResetting}
              title="Reset database to clean starter dataset state"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-rose-500' : ''}`} />
              <span>{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>
          )}

          {/* Role Switcher for Hackathon Judges */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span>{currentUser?.name?.split(' ')[0]}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-bold">
                {currentUser?.role?.replace('_', ' ')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Demo Role (RBAC)
                  </p>
                </div>
                <div className="py-1">
                  {DEMO_USERS.map((user) => {
                    const isCurrent = currentUser?.email === user.email;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSwitchUser(user);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs transition ${
                          isCurrent
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{user.email}</div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          user.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                          user.role === 'department_coordinator' ? 'bg-amber-100 text-amber-800' :
                          user.role === 'faculty' ? 'bg-blue-100 text-blue-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="px-3 pt-2 mt-1 border-t border-slate-100 dark:border-slate-700 text-center">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenLoginModal();
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Open Full Auth Credentials Modal →
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
