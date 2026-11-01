'use client';

import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
  Mail,
  MapPin,
  Phone,
  Layers,
  GraduationCap,
  Users,
  Compass,
  FileText,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Send,
  Zap,
  Cpu
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function LandingPage({
  currentUser,
  onOpenOperations,
  onOpenSignIn,
  onOpenRegister,
  onSwitchUser,
  onLogout
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(0);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Demo user presets for quick 1-click test inside locked modal
  const DEMO_PRESETS = [
    {
      id: 'USER_ADMIN',
      name: "Dean Academic Office",
      email: 'admin@cit.edu',
      role: 'admin',
      label: 'Admin (Dean)',
      badge: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300',
      desc: 'Master timetable, disruption approvals & exam scheduling'
    },
    {
      id: 'USER_COORD_CSE',
      name: 'Prof. Rajesh Sharma',
      email: 'dept.cse@cit.edu',
      role: 'department_coordinator',
      label: 'Department Coordinator',
      badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
      desc: 'CSE department timetable & lab bookings authority'
    },
    {
      id: 'USER_FACULTY_F01',
      name: 'Dr. Ananya Mishra',
      email: 'faculty.f01@cit.edu',
      role: 'faculty',
      label: 'Faculty Member',
      badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300',
      desc: 'Personal schedule, leave marking & AI reschedule'
    },
    {
      id: 'USER_CLUB_DRAMATICS',
      name: 'Dramatics Society Lead',
      email: 'club.dramatics@cit.edu',
      role: 'club',
      label: 'Club Representative',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300',
      desc: 'Hinglish NLP venue bookings & Spectra fest tracking'
    },
  ];

  const FAQ_ITEMS = [
    {
      q: 'How does CampusFlow guarantee zero timetable clashes across 1,000 students?',
      a: 'CampusFlow models all university scheduling constraints (H1 to H14) mathematically into a Google OR-Tools CP-SAT constraint satisfaction engine. It schedules all 189 teaching sessions (243 hours/week) simultaneously, strictly verifying that no room, faculty member, or student cohort has two concurrent assignments.'
    },
    {
      q: 'Can the AI Assistant hallucinate or approve invalid venue bookings?',
      a: 'No. In strict compliance with Section 6 hackathon governance rules, LLMs in CampusFlow only act as draft translators (e.g. converting colloquial Hinglish festival requests into structured parameters). Every single allocation is evaluated and validated deterministically by code and constraint solvers before being placed before the Dean.'
    },
    {
      q: 'How does the multi-lingual Hinglish venue booking parser work?',
      a: 'The NLP engine understands natural colloquial prompts such as "Humhe Auditorium chahiye Thursday shaam 6 baje se 9 baje tak Dramatics rehearsal ke liye". It extracts requested duration, target hall, date/time window, and expected headcount, presenting an editable check-and-edit card to the student lead prior to submission.'
    },
    {
      q: 'What occurs during last-minute emergencies or faculty leave in Week 7?',
      a: 'The built-in Large Neighborhood Search (LNS) repair solver identifies minimal-move fixes. When a disruption file is uploaded (e.g., room closure or faculty leave), it relocates conflicting sessions while leaving 96.3% of the existing timetable untouched, producing an interactive diff view for Dean approval.'
    },
    {
      q: 'Why is the User Operation section locked for public visitors?',
      a: 'CampusFlow implements institutional Role-Based Access Control (RBAC). Only authenticated users belonging to one of the four verified roles (Admin, Coordinator, Faculty, or Club Lead) can perform operational functions. You can use any of the pre-configured 1-click demo accounts to unlock and test your desired role.'
    }
  ];

  function handleUserOperationClick() {
    if (currentUser) {
      onOpenOperations();
    } else {
      setLockedModalOpen(true);
    }
  }

  function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email) return;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: '', email: '', message: '' });
    }, 4000);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (STICKY, TRANSLUCENT WITH LIGHT/DARK TOGGLE)                */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Identity */}
          <a href="#hero" className="flex items-center space-x-2.5 group cursor-pointer">
            <img
              src="/logo.png"
              alt="CIT CampusFlow Logo"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105 duration-200"
            />
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight text-slate-900 dark:text-white leading-tight">
                CampusFlow
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Chilika Institute of Technology
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-semibold">
            <a
              href="#hero"
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              Home
            </a>

            {/* User Operation Tab (Locked indicator when logged out) */}
            <button
              onClick={handleUserOperationClick}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                currentUser
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-semibold'
              }`}
            >
              {currentUser ? (
                <Unlock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>User Operation</span>
              {currentUser ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold uppercase">
                  {currentUser.role.replace('_', ' ')}
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold uppercase">
                  Locked
                </span>
              )}
            </button>

            <a
              href="#features"
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              Features
            </a>

            <a
              href="#faq"
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              FAQ
            </a>

            <a
              href="#contact"
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              Contact
            </a>
          </nav>

          {/* Right Actions: Auth Buttons + Theme Toggle */}
          <div className="hidden md:flex items-center space-x-2.5">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenOperations}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Launch Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-xs font-medium text-slate-600 dark:text-slate-400 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenSignIn}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={onOpenRegister}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}

            {/* Light / Dark Mode Toggle Icon */}
            <div className="pl-1 border-l border-slate-200 dark:border-slate-800">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex items-center space-x-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 animate-slide-up">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Home
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleUserOperationClick();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              <div className="flex items-center space-x-2">
                {currentUser ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                <span>User Operation</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono">
                {currentUser ? currentUser.role : 'Locked'}
              </span>
            </button>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Features
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              FAQ
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Contact
            </a>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2">
              {currentUser ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenOperations();
                  }}
                  className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold text-center"
                >
                  Enter User Operation Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenSignIn();
                    }}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-center"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenRegister();
                    }}
                    className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold text-center"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION WITH CAMPUS.JPG & FLOATING ANIMATED BADGES                */}
      {/* ========================================================================= */}
      <section id="hero" className="relative pt-8 sm:pt-14 pb-16 lg:pb-24 overflow-hidden">
        
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Copy */}
          <div className="text-center max-w-3xl mx-auto space-y-4 animate-slide-up">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Chilika Institute of Technology • Autonomous Scheduling</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Smart Schedules. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">Zero Clashes.</span> Brighter Campus.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Engineered with Google OR-Tools CP-SAT to orchestrate 189 teaching sessions, 41 midsem exams, and high-demand Spectra fest venue allocations with verified zero hard violations.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleUserOperationClick}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer group"
              >
                {currentUser ? (
                  <>
                    <span>Enter User Operation ({currentUser.name?.split(' ')[0]})</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>Enter User Operation (Authorized Only)</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <a
                href="#features"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 active:scale-95 text-slate-800 dark:text-slate-200 text-sm font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>Explore Features &amp; Architecture</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>

          {/* =================================================================== */}
          {/* HERO SHOWCASE: CAMPUS.JPG WITH FLOATING ANIMATED STATS CARDS         */}
          {/* =================================================================== */}
          <div className="mt-10 sm:mt-14 relative max-w-5xl mx-auto rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-2xl bg-slate-900 group">
            
            {/* Campus Image with Slow Gentle Ken-Burns Hover */}
            <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden">
              <img
                src="/campus.jpg"
                alt="Chilika Institute of Technology (CIT) Campus"
                className="w-full h-full object-cover object-center transform transition-transform duration-1000 ease-out group-hover:scale-105"
              />
              
              {/* Gradient Scrim for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent pointer-events-none" />
            </div>

            {/* Floating Glassmorphism Badge 1: 0 Hard Violations (Top-Left) */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/40 dark:border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-xl text-xs max-w-[200px] sm:max-w-[240px] animate-float">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>0 Hard Violations</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                100% feasibility verified by official hackathon validator across H1–H14.
              </p>
            </div>

            {/* Floating Glassmorphism Badge 2: Spectra '27 Fest (Top-Right) */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/40 dark:border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-xl text-xs max-w-[190px] sm:max-w-[220px] animate-float" style={{ animationDelay: '1.2s' }}>
              <div className="flex items-center space-x-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Spectra '27 Fest</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Score: <strong>67.0 / 70.0</strong> — Mathematical benchmark ceiling.
              </p>
            </div>

            {/* Floating Glassmorphism Badge 3: Hinglish NLP Parser (Bottom-Left) */}
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/40 dark:border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-xl text-xs max-w-[210px] sm:max-w-[260px] animate-float" style={{ animationDelay: '2.4s' }}>
              <div className="flex items-center space-x-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                <Cpu className="w-3.5 h-3.5" />
                <span>Multi-lingual AI Parser</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Converts plain English &amp; Hinglish festival requests into structured bookings.
              </p>
            </div>

            {/* Floating Glassmorphism Badge 4: Capacity Scale (Bottom-Right) */}
            <div className="hidden sm:block absolute bottom-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/40 dark:border-slate-700/80 rounded-2xl p-4 shadow-xl text-xs max-w-[230px] animate-float" style={{ animationDelay: '3.6s' }}>
              <div className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white">
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>27 Physical Venues</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                40 Faculty • 14 Student Groups • 41 Midsem Exams coordinated.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. KEY METRICS TICKER                                                     */}
      {/* ========================================================================= */}
      <section className="py-8 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">0</div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Hard Violations</div>
              <p className="text-[11px] text-slate-400">Strict mathematical CP-SAT guarantee</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">189</div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Sessions Scheduled</div>
              <p className="text-[11px] text-slate-400">243 teaching hours every week</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">41</div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Midsem Exams</div>
              <p className="text-[11px] text-slate-400">Halved room capacity enforced</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">96.3%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Disruption Stability</div>
              <p className="text-[11px] text-slate-400">Only 7 sessions moved during leave</p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FOUR CORE FEATURES SECTION (#features)                                 */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Engineered For Higher Education
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Four Pillars of Autonomous Campus Scheduling
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Engineered specifically to solve the high-density bottlenecks of Week 7 and daily semester operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Feature 1 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 card-interactive shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Constraint Solver</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Google OR-Tools CP-SAT Schedule Engine
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Handles all 14 hard constraints: 1-hour lectures, 3-hour labs (strictly P2–P4 or P6–P8), lunchtime protections (13:00–14:00), faculty daily teaching limits (max 4h), and wheelchair accessibility verification.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono font-semibold">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">0 Hard Clashes</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Penalty: 3.0</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Fast Convergence</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 card-interactive shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Natural Language NLP</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Multi-lingual Hinglish Venue Parser
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Accepts plain English or Hinglish festival booking requests from student leads, extracts structured timing, room, and equipment attributes, and lets the user check and edit before final submission.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono font-semibold">
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">Hinglish Parser</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">Human Review Card</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">Fallback Manual Form</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 card-interactive shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Disruption Resilience</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Minimal-Move Schedule Repair
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              When a professor takes sudden medical leave or a room undergoes maintenance, the Large Neighborhood Search solver relocates only the directly impacted classes, displaying an interactive diff before Admin approval.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono font-semibold">
              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">96.3% Stability</span>
              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">Diff Visualizer</span>
              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">Dean Approval Gate</span>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 card-interactive shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Governance &amp; RBAC</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                4-Tier Priority Arbitration
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Enforces the strict competition rules: Exams &gt; Regular Classes &gt; Institute Events &gt; Guest Lectures &gt; Dept Events &gt; Club Events. Implements Rule Section 4: "Nobody can approve their own request."
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono font-semibold">
              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">4 Official Roles</span>
              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">Zero Priority Inversions</span>
              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">Audit Trail</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. USER OPERATION ROLES PREVIEW & UNLOCK PROMPT                           */}
      {/* ========================================================================= */}
      <section className="py-16 bg-slate-100/70 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" />
                <span>Protected Operations Hub</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Role-Based Operational Portals
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Logging in dynamically activates one of the four dedicated operational interfaces already built into CampusFlow.
              </p>
            </div>

            <button
              onClick={handleUserOperationClick}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer shrink-0"
            >
              <span>{currentUser ? 'Access Operational Portal' : 'Unlock User Operations'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEMO_PRESETS.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  if (onSwitchUser) onSwitchUser(p);
                  onOpenOperations();
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 card-interactive shadow-xs space-y-3 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badge}`}>
                    {p.label}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{p.email}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {p.desc}
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                  <span>1-Click Launch</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FAQ SECTION (#faq)                                                     */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Common Questions
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Answers regarding scheduling algorithms, AI boundaries, and security rules.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {item.q}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
                    <p className="mt-2.5">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 7. CONTACT & DEAN'S OFFICE SECTION (#contact)                             */}
      {/* ========================================================================= */}
      <section id="contact" className="py-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Campus Info */}
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Institutional Administration
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Chilika Institute of Technology (CIT)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Directorate of Academic Scheduling &amp; Campus Logistics. For emergency venue reservations, exam timetable adjustments, or department coordinator queries, reach out directly.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Main Campus, Academic Complex Block A, Chilika, Odisha, India</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>scheduling@cit.edu • dean.academic@cit.edu</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Office Hours: Monday – Friday (08:00 – 18:00 IST)</span>
                </div>
              </div>
            </div>

            {/* Quick Contact / Feedback Form */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Submit Academic Scheduling Inquiry
              </h3>
              
              {contactSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center space-x-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your message has been received by the Dean's Academic Scheduling Office.</span>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prof. Rajesh Sharma / Student Lead"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Official Email</label>
                    <input
                      type="email"
                      required
                      placeholder="name@cit.edu"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Inquiry / Note</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Describe your timetable clash or venue query..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-blue-600"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Transmit to Academic Office</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. SIMPLE & CLEAN FOOTER                                                  */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 px-4 sm:px-6 text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1 shrink-0 max-w-7xl mx-auto">
        <span>© 2026 Chilika Institute of Technology. All rights reserved.</span>
        <span>CampusFlow Autonomous Timetabling</span>
      </footer>

      {/* ========================================================================= */}
      {/* 9. LOCKED PORTAL MODAL (WHEN LOGGED OUT USER CLICKS USER OPERATION)      */}
      {/* ========================================================================= */}
      {lockedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    User Operation is Locked
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Role-Based Access Control (RBAC) required.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLockedModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To enter the <strong>User Operation dashboard</strong>, you must authenticate as one of the 4 official campus roles. Select a 1-click demo role below or sign in with your email:
            </p>

            {/* 1-Click Demo Logins */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1-Click Instant Unlock (4 Official Roles):
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setLockedModalOpen(false);
                      if (onSwitchUser) onSwitchUser(p);
                      onOpenOperations();
                    }}
                    className="p-2.5 text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer"
                  >
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border block w-fit ${p.badge}`}>
                      {p.label}
                    </span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block mt-1 truncate">
                      {p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Sign In / Register Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <button
                onClick={() => {
                  setLockedModalOpen(false);
                  onOpenSignIn();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition text-center cursor-pointer"
              >
                Sign In with Password
              </button>
              <button
                onClick={() => {
                  setLockedModalOpen(false);
                  onOpenRegister();
                }}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center cursor-pointer"
              >
                Create Account
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
