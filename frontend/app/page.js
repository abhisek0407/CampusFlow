'use client';

import React, { useState, useEffect } from 'react';
import Sidebar, { ROLE_NAV_CONFIG } from '../components/Sidebar';
import TopHeader, { DEMO_USERS } from '../components/TopHeader';
import LoginModal from '../components/LoginModal';

// Shared & Admin Views
import AdminOverviewView from '../components/AdminOverviewView';
import TimetableView from '../components/TimetableView';
import ExamsView from '../components/ExamsView';
import BookingsView from '../components/BookingsView';
import DisruptionView from '../components/DisruptionView';
import AIAssistantView from '../components/AIAssistantView';
import RoomManagementView from '../components/RoomManagementView';
import AnalyticsView from '../components/AnalyticsView';
import DatasetManagementView from '../components/DatasetManagementView';

// Coordinator Views
import CoordinatorOverviewView from '../components/CoordinatorOverviewView';
import DepartmentBookingsView from '../components/DepartmentBookingsView';
import CoordinatorChangeRequestsView from '../components/CoordinatorChangeRequestsView';

// Faculty Views
import FacultyOverviewView from '../components/FacultyOverviewView';
import FacultyMyTimetableView from '../components/FacultyMyTimetableView';
import FacultyUnavailabilityView from '../components/FacultyUnavailabilityView';
import FacultyRequestSessionView from '../components/FacultyRequestSessionView';

// Club Views
import ClubOverviewView from '../components/ClubOverviewView';
import ClubNewBookingView from '../components/ClubNewBookingView';
import ClubMyBookingsView from '../components/ClubMyBookingsView';
import ClubBookingHistoryView from '../components/ClubBookingHistoryView';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS[0]);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    // Restore session from localStorage if present
    const saved = localStorage.getItem('cit_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);
      } catch (e) {}
    }
  }, []);

  function handleSwitchUser(user) {
    setCurrentUser(user);
    setActiveTab('overview');
    localStorage.setItem('cit_user', JSON.stringify(user));

    // Request JWT from backend
    const passwords = {
      'admin@cit.edu': 'Admin@123',
      'dept.cse@cit.edu': 'Dept@123',
      'faculty.f01@cit.edu': 'Faculty@123',
      'club.dramatics@cit.edu': 'Club@123',
    };
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: passwords[user.email] || 'Admin@123' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.token) {
          localStorage.setItem('cit_token', d.token);
        }
      })
      .catch(() => {});

    showToast(`Switched active portal: ${user.name} (${user.role.toUpperCase()})`);
  }

  async function handleResetData() {
    if (!confirm("Reset database to clean starter pack state? This restores all 15 collections, baseline schedule, and demo users.")) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset-database', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast("Database successfully restored to clean starter dataset state!");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        alert(data.error || "Reset failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  }

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // Render the active view based on the current user's role and selected sidebar tab
  function renderActiveView() {
    const role = currentUser?.role || 'admin';

    // 1. Admin Views
    if (role === 'admin') {
      switch (activeTab) {
        case 'overview':
          return <AdminOverviewView setActiveTab={setActiveTab} onResetData={handleResetData} isResetting={isResetting} />;
        case 'timetable':
          return <TimetableView />;
        case 'exams':
          return <ExamsView />;
        case 'bookings':
          return <BookingsView />;
        case 'disruptions':
          return <DisruptionView />;
        case 'ai-assistant':
          return <AIAssistantView />;
        case 'rooms':
          return <RoomManagementView />;
        case 'analytics':
          return <AnalyticsView />;
        case 'dataset':
          return <DatasetManagementView onResetData={handleResetData} isResetting={isResetting} />;
        default:
          return <AdminOverviewView setActiveTab={setActiveTab} onResetData={handleResetData} isResetting={isResetting} />;
      }
    }

    // 2. Department Coordinator Views
    if (role === 'department_coordinator') {
      switch (activeTab) {
        case 'overview':
          return <CoordinatorOverviewView setActiveTab={setActiveTab} />;
        case 'department-timetable':
          return <TimetableView />;
        case 'department-bookings':
          return <DepartmentBookingsView />;
        case 'schedule-change-requests':
          return <CoordinatorChangeRequestsView />;
        default:
          return <CoordinatorOverviewView setActiveTab={setActiveTab} />;
      }
    }

    // 3. Faculty Views
    if (role === 'faculty') {
      switch (activeTab) {
        case 'overview':
          return <FacultyOverviewView setActiveTab={setActiveTab} />;
        case 'my-timetable':
          return <FacultyMyTimetableView />;
        case 'mark-unavailability':
          return <FacultyUnavailabilityView />;
        case 'request-extra-session':
          return <FacultyRequestSessionView />;
        case 'ai-faculty-assistant':
          return <AIAssistantView />;
        default:
          return <FacultyOverviewView setActiveTab={setActiveTab} />;
      }
    }

    // 4. Club Representative Views
    if (role === 'club') {
      switch (activeTab) {
        case 'overview':
          return <ClubOverviewView setActiveTab={setActiveTab} />;
        case 'new-venue-booking':
          return <ClubNewBookingView setActiveTab={setActiveTab} />;
        case 'my-bookings':
          return <ClubMyBookingsView setActiveTab={setActiveTab} />;
        case 'booking-history':
          return <ClubBookingHistoryView />;
        default:
          return <ClubOverviewView setActiveTab={setActiveTab} />;
      }
    }

    return <AdminOverviewView setActiveTab={setActiveTab} onResetData={handleResetData} isResetting={isResetting} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex">
      
      {/* Role-Based Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        
        {/* Top Header */}
        <TopHeader
          currentUser={currentUser}
          activeTab={activeTab}
          onSwitchUser={handleSwitchUser}
          onResetData={handleResetData}
          isResetting={isResetting}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>CampusFlow / OrchestrAI</strong> • Chilika Institute of Technology (CIT) Autonomous Scheduling System
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>Google OR-Tools CP-SAT</span>
            <span>•</span>
            <span>0 Hard Violations</span>
            <span>•</span>
            <span>Next.js 16</span>
          </div>
        </footer>

      </div>

      {/* Login & Demo Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleSwitchUser}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
