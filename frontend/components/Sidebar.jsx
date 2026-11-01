'use client';

import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Building2,
  AlertTriangle,
  Sparkles,
  Layers,
  BarChart3,
  Database,
  BookOpen,
  CalendarCheck2,
  FileEdit,
  UserCheck,
  PlusCircle,
  History,
  GraduationCap,
  LogOut,
  ChevronRight,
  Shield,
  CalendarDays,
  Briefcase,
  Users,
  DoorOpen
} from 'lucide-react';

// Exact role sidebar configuration as specified in requirements
export const ROLE_NAV_CONFIG = {
  admin: {
    label: "Dean's Office (Admin)",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    icon: Shield,
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, desc: 'Institutional KPIs & Status' },
      { id: 'timetable', label: 'Timetable Management', icon: Calendar, desc: 'Weekly Matrix & Allocation' },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, desc: 'Faculty Leaves by Date' },
      { id: 'exams', label: 'Exam Scheduling', icon: Clock, desc: 'Midsem Exam Matrix' },
      { id: 'bookings', label: 'Venue Bookings', icon: Building2, desc: 'Spectra Fest Allocations' },
      { id: 'disruptions', label: 'Disruption Management', icon: AlertTriangle, desc: 'Minimal-Move Rescheduling' },
      { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, desc: 'NLP Parser & Decision Explainer' },
      { id: 'rooms', label: 'Room Management', icon: DoorOpen, desc: '27 Rooms & Maintenance' },
      { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, desc: 'Utilisation & Soft Penalties' },
      { id: 'dataset', label: 'Dataset Management', icon: Database, desc: 'Exports & Benchmark Sync' },
    ]
  },
  department_coordinator: {
    label: "CSE Coordinator",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    icon: Briefcase,
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, desc: 'Department Metrics & Status' },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, desc: 'Faculty Leaves by Date' },
      { id: 'department-timetable', label: 'Department Timetable', icon: Calendar, desc: 'CSE Cohorts & Faculty' },
      { id: 'department-bookings', label: 'Department Bookings', icon: Building2, desc: 'CSE Lab Approvals' },
      { id: 'schedule-change-requests', label: 'Schedule Change Requests', icon: FileEdit, desc: 'Session Move Proposals' },
    ]
  },
  faculty: {
    label: "Faculty (Dr. A. Mishra)",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    icon: BookOpen,
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, desc: 'Teaching Load & Daily Cap' },
      { id: 'calendar', label: 'My Calendar', icon: CalendarDays, desc: 'Classes & Leave by Date' },
      { id: 'request-extra-session', label: 'Request Extra Session', icon: PlusCircle, desc: 'Reschedule or Extra Lab' },
    ]
  },
  club: {
    label: "Club Representative",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    icon: Users,
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, desc: 'Fest Quota & Requests' },
      { id: 'new-venue-booking', label: 'New Venue Booking', icon: PlusCircle, desc: 'Hinglish & Form Booking' },
      { id: 'my-bookings', label: 'My Bookings', icon: CalendarCheck2, desc: 'Live Status & Cancellation' },
    ]
  }
};

export default function Sidebar({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenLoginModal,
  sidebarCollapsed,
  setSidebarCollapsed
}) {
  const role = currentUser?.role || 'admin';
  const config = ROLE_NAV_CONFIG[role] || ROLE_NAV_CONFIG.admin;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 shadow-xs ${sidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-72'
        }`}
    >
      {/* Brand Header */}
      <div className="h-15 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 min-w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">CampusFlow</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  CIT
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                Chilika Institute of Tech
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {!sidebarCollapsed && (
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation Menu
          </div>
        )}
        {config.tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`w-full flex items-center rounded-xl transition-all ${sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2 space-x-3 text-left'
                } ${isActive
                  ? 'bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              {!sidebarCollapsed && (
                <span className="flex-1 text-xs font-semibold truncate tracking-tight">{tab.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Quick Switch Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
        {!sidebarCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{currentUser?.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{currentUser?.email}</div>
              </div>
            </div>
            <button
              onClick={onOpenLoginModal}
              title="Change Active Role"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Switch User Role"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            title="Change Active Role"
            className="w-full flex justify-center py-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            aria-label="Switch User Role"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
