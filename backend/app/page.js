'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import TimetableView from '../components/TimetableView';
import BookingsView from '../components/BookingsView';
import AIAssistantView from '../components/AIAssistantView';
import DisruptionView from '../components/DisruptionView';
import ExamsView from '../components/ExamsView';
import ValidatorView from '../components/ValidatorView';
import { 
  CheckCircle2, 
  ExternalLink, 
  Code2, 
  Sparkles, 
  ShieldCheck, 
  Layers,
  GraduationCap
} from 'lucide-react';

const DEFAULT_USER = {
  id: 'USER_ADMIN',
  name: "Dean Academic Office (Admin)",
  email: 'admin@cit.edu',
  role: 'admin',
  department: 'ADMIN',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('timetable');
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    // Check if user session exists in localStorage
    const saved = localStorage.getItem('cit_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  async function handleSwitchUser(user) {
    setCurrentUser(user);
    localStorage.setItem('cit_user', JSON.stringify(user));
    
    // Auto-login to receive fresh JWT
    try {
      const passwords = {
        'admin@cit.edu': 'Admin@123',
        'dept.cse@cit.edu': 'Dept@123',
        'faculty.f01@cit.edu': 'Faculty@123',
        'club.dramatics@cit.edu': 'Club@123',
      };
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: passwords[user.email] || 'Admin@123' }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('cit_token', data.token);
      }
    } catch (e) {}

    showToast(`Switched active role to: ${user.name} (${user.role.toUpperCase()})`);
  }

  async function handleResetData() {
    if (!confirm("Reset database to clean starter pack state? This restores all 15 collections and baseline schedule.")) {
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
      console.error('Reset error:', e);
    } finally {
      setIsResetting(false);
    }
  }

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      
      {/* Institutional Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onResetData={handleResetData}
        isResetting={isResetting}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'timetable' && <TimetableView />}
        {activeTab === 'bookings' && <BookingsView currentUser={currentUser} />}
        {activeTab === 'ai-assistant' && <AIAssistantView currentUser={currentUser} />}
        {activeTab === 'disruptions' && <DisruptionView currentUser={currentUser} />}
        {activeTab === 'exams' && <ExamsView />}
        {activeTab === 'validator' && <ValidatorView />}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-12 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-800 dark:text-slate-200">CampusFlow • OrchestrAI</span>
            <span>— Chilika Institute of Technology Autonomous Scheduling Platform</span>
          </div>

          <div className="flex items-center space-x-4">
            <a 
              href="https://github.com/abhisek0407/CampusFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-slate-900 dark:hover:text-white transition font-medium"
            >
              <Code2 className="w-4 h-4" />
              <span>GitHub Repository</span>
            </a>
            <span>•</span>
            <span>Google OR-Tools CP-SAT</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">0 Hard Violations</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
