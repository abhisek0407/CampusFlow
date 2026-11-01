'use client';

import React, { useState } from 'react';
import {
  Menu,
  ShieldCheck,
  ChevronDown,
  User,
  GraduationCap,
  Sparkles,
  Calendar,
  Layers,
  LogOut,
  UserCog,
  Compass
} from 'lucide-react';
import { ROLE_NAV_CONFIG } from './Sidebar';
import ThemeToggle from './ThemeToggle';

export const DEMO_USERS = [
  {
    id: 'USER_ADMIN',
    name: "Dean Academic Office (Admin)",
    email: 'admin@cit.edu',
    role: 'admin',
    department: 'ADMIN',
    badge: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
  },
  {
    id: 'USER_COORD_CSE',
    name: 'Prof. Rajesh Sharma (Coordinator)',
    email: 'dept.cse@cit.edu',
    role: 'department_coordinator',
    department: 'CSE',
    badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  },
  {
    id: 'USER_FACULTY_F01',
    name: 'Dr. Ananya Mishra',
    email: 'faculty.f01@cit.edu',
    role: 'faculty',
    department: 'CSE',
    linked_faculty_id: 'F01',
    badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
  },
  {
    id: 'USER_CLUB_DRAMATICS',
    name: 'Dramatics Society Lead',
    email: 'club.dramatics@cit.edu',
    role: 'club',
    department: 'CLUBS',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
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
  onOpenLoginModal,
  onLogout,
  onOpenEditProfile,
  onGoToLanding
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const roleConfig = ROLE_NAV_CONFIG[currentUser?.role] || ROLE_NAV_CONFIG.admin;
  const currentTabObj = roleConfig.tabs.find(t => t.id === activeTab) || roleConfig.tabs[0];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="px-3 sm:px-6 h-13 sm:h-14 flex items-center justify-between">
        
        {/* Left: Sidebar Toggle + Breadcrumb */}
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Toggle Sidebar"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs overflow-hidden">
            <span className="font-medium text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
              {roleConfig.label}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              {currentTabObj?.label || 'Overview'}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Official Benchmark Status (Transparent background, sleek light styling) */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400 pr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0 Violations</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-600 dark:text-slate-300">67.0 Score</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400">3 Soft Penalty</span>
          </div>

          {/* Public Landing Page Button */}
          {onGoToLanding && (
            <button
              onClick={onGoToLanding}
              title="Return to Public Home / Landing Page"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline font-bold">Public Home</span>
            </button>
          )}

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
              aria-expanded={dropdownOpen}
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span className="hidden sm:inline">{currentUser?.name?.split(' ')[0]}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-bold">
                {currentUser?.role?.replace('_', ' ')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                        <div className="flex flex-col">
                          <span className="font-semibold">{user.name}</span>
                          <span className="text-[10px] text-slate-400">{user.email}</span>
                        </div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${user.badge}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 px-3">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenLoginModal();
                    }}
                    className="block w-full text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Custom Email / JWT Sign In
                  </button>
                  {onOpenEditProfile && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenEditProfile();
                      }}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span>Edit My Profile</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Edit Profile Button at Top Right */}
          {onOpenEditProfile && (
            <button
              onClick={onOpenEditProfile}
              title="Edit Profile Details"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <UserCog className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline font-bold">Edit Profile</span>
            </button>
          )}

          {/* Dedicated Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out of CIT Account"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
