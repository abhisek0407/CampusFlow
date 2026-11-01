'use client';

import React, { useState, useEffect } from 'react';
import Sidebar, { ROLE_NAV_CONFIG } from '../components/Sidebar';
import TopHeader, { DEMO_USERS } from '../components/TopHeader';
import LoginModal from '../components/LoginModal';
import AuthPortal from '../components/AuthPortal';
import EditProfileModal from '../components/EditProfileModal';

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
  const [currentUser, setCurrentUser] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    // If on mobile screen, default sidebar to collapsed
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }

    // Restore session from localStorage if present
    try {
      const saved = localStorage.getItem('cit_user');
      if (saved) {
        const u = JSON.parse(saved);
        setCurrentUser(u);
      }
    } catch (e) {
      console.warn('Could not restore user session from localStorage', e);
    } finally {
      setIsMounted(true);
    }
  }, []);

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  }

  function handleLoginSuccess(user) {
    setCurrentUser(user);
    setActiveTab('overview');
    showToast(`Welcome back, ${user.name}! (${user.role.toUpperCase()})`);
  }

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
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.token) {
          localStorage.setItem('cit_token', d.token);
        }
      })
      .catch(() => {});

    showToast(`Switched active portal: ${user.name} (${user.role.toUpperCase()})`);
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('cit_user');
    localStorage.removeItem('cit_token');
    setCurrentUser(null);
    setActiveTab('overview');
    showToast("Logged out successfully");
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

  // Prevent hydration flicker before localStorage is checked
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
          <span>Loading CampusFlow...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: AUTHENTICATION HOME PORTAL (SIGN-IN, REGISTER, FORGOT, RESET)
  // Renders when user is not logged in. Uses /logo.png as background picture.
  // =========================================================================
  if (!currentUser) {
    return <AuthPortal onLoginSuccess={handleLoginSuccess} />;
  }

  // =========================================================================
  // VIEW 2: ROLE-BASED DASHBOARD
  // Render the active view based on the current user's role and selected sidebar tab
  // =========================================================================
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
          return <BookingsView currentUser={currentUser} />;
        case 'disruptions':
          return <DisruptionView currentUser={currentUser} />;
        case 'ai-assistant':
          return <AIAssistantView currentUser={currentUser} />;
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
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex overflow-hidden">
      
      {/* Role-Based Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />

      {/* Mobile Backdrop Overlay when sidebar is open */}
      {!sidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-30 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20 ml-0' : 'md:ml-72 ml-0'}`}>
        
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
          onLogout={handleLogout}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
        />

        {/* View Content - Single Page Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 w-full max-w-7xl mx-auto flex flex-col justify-start">
          {renderActiveView()}
        </main>

        {/* Compact Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-4 sm:px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1 shrink-0">
          <div>
            <strong>CampusFlow</strong> • Chilika Institute of Technology (CIT) Autonomous Scheduling System
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          showToast("Profile details updated successfully!");
        }}
      />

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
