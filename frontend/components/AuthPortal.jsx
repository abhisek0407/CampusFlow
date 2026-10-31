'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Layers,
  GraduationCap,
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Building2,
} from 'lucide-react';

export const ROLE_PRESETS = [
  {
    id: 'admin',
    title: 'Admin',
    subtitle: "Dean Academic Office",
    desc: 'Timetable orchestration & venue approvals',
    email: 'admin@cit.edu',
    defaultPass: 'Admin@123',
    badge: 'Dean Office',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    activeClass: 'border-rose-500 bg-rose-50 ring-2 ring-rose-200 text-rose-950 font-bold',
    icon: ShieldCheck,
    color: 'text-rose-600',
  },
  {
    id: 'department_coordinator',
    title: 'Coordinator',
    subtitle: 'CSE Department',
    desc: 'Department schedules & lab bookings',
    email: 'dept.cse@cit.edu',
    defaultPass: 'Dept@123',
    badge: 'CSE Dept',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    activeClass: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200 text-amber-950 font-bold',
    icon: Layers,
    color: 'text-amber-600',
  },
  {
    id: 'faculty',
    title: 'Faculty',
    subtitle: 'Dr. Ananya Mishra',
    desc: 'Weekly timetable & leave requests',
    email: 'faculty.f01@cit.edu',
    defaultPass: 'Faculty@123',
    badge: 'Prof. F01',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    activeClass: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 text-blue-950 font-bold',
    icon: GraduationCap,
    color: 'text-blue-600',
  },
  {
    id: 'club',
    title: 'Club Rep',
    subtitle: 'Dramatics Society',
    desc: 'Spectra fest bookings & AI requests',
    email: 'club.dramatics@cit.edu',
    defaultPass: 'Club@123',
    badge: 'Clubs',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    activeClass: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 text-emerald-950 font-bold',
    icon: Sparkles,
    color: 'text-emerald-600',
  },
];

export default function AuthPortal({ onLoginSuccess }) {
  // 'signin' | 'register' | 'forgot' | 'reset'
  const [authView, setAuthView] = useState('signin');
  const [selectedRole, setSelectedRole] = useState('admin');

  // Sign-in Form (Starts completely blank per user request)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Registration Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('faculty');
  const [regDepartment, setRegDepartment] = useState('CSE');
  const [regFacultyId, setRegFacultyId] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);

  // Forgot / Reset Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState(null);
  const [forgotError, setForgotError] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState(null);
  const [resetError, setResetError] = useState(null);

  // Handle switching role option on Sign-In (Keeps input blank so user inputs manually)
  function handleSelectRole(preset) {
    setSelectedRole(preset.id);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError(null);
  }

  // Submit Sign-In
  async function handleLoginSubmit(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        if (data.token) {
          localStorage.setItem('cit_token', data.token);
        }
        localStorage.setItem('cit_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setLoginError(data.error || 'Invalid email or password.');
      }
    } catch (err) {
      setLoginError('Unable to connect to authentication server. Please ensure backend is running.');
    } finally {
      setLoginLoading(false);
    }
  }

  // Submit Registration
  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole,
          department: regDepartment,
          linked_faculty_id: regRole === 'faculty' ? regFacultyId || 'F01' : null,
        }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        if (data.token) {
          localStorage.setItem('cit_token', data.token);
        }
        localStorage.setItem('cit_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setRegError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setRegError('Failed to connect to backend registration API.');
    } finally {
      setRegLoading(false);
    }
  }

  // Submit Forgot Password
  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();

      if (data.success) {
        setForgotSuccessMsg(data.message);
        if (data.reset_token) {
          setResetToken(data.reset_token);
        }
        setTimeout(() => {
          setAuthView('reset');
        }, 1200);
      } else {
        setForgotError(data.error || 'Failed to request password reset.');
      }
    } catch (err) {
      setForgotError('Network error requesting password reset.');
    } finally {
      setForgotLoading(false);
    }
  }

  // Submit Reset Password
  async function handleResetSubmit(e) {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      setResetLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail || loginEmail,
          token: resetToken,
          new_password: newPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResetSuccessMsg(data.message);
        setLoginEmail(forgotEmail || loginEmail);
        setLoginPassword(newPassword);
        setTimeout(() => {
          setAuthView('signin');
        }, 1500);
      } else {
        setResetError(data.error || 'Password reset failed.');
      }
    } catch (err) {
      setResetError('Network error updating password.');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans bg-slate-100 overflow-x-hidden">
      
      {/* Background Watermark Layer for depth */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: "url('/logo.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "contain",
        }}
      />

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN CONTAINER: COLLEGE PHOTO (LEFT) + SIGN-IN FORM (RIGHT)    */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        
        {/* ===================================================================== */}
        {/* LEFT COLUMN: COLLEGE PHOTO (CHILIKA INSTITUTE OF TECHNOLOGY)          */}
        {/* ===================================================================== */}
        <div className="relative hidden md:block md:w-1/2 min-h-[540px] bg-slate-900 overflow-hidden">
          {/* Real Campus Image */}
          <img
            src="/campus.jpg"
            alt="Chilika Institute of Technology (CIT) Campus"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Elegant Dark Gradient Overlay for High Contrast Text */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent flex flex-col justify-end p-6 lg:p-8 text-white">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider w-fit mb-2.5 border border-white/20">
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              <span>Chilika Institute of Technology</span>
            </div>
            
            <h2 className="text-xl lg:text-2xl font-black tracking-tight leading-snug">
              Intelligent Campus Timetabling &amp; Venue Management
            </h2>
            
            <p className="text-xs text-slate-200 mt-2 leading-relaxed">
              Engineered with Google OR-Tools CP-SAT for zero hard clashes across 189 teaching sessions, 41 midsem exams, and Spectra '27 fest bookings.
            </p>

            <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-white/20 text-[10px] font-semibold text-slate-300">
              <span className="bg-white/10 px-2 py-0.5 rounded">0 Hard Violations</span>
              <span>•</span>
              <span className="bg-white/10 px-2 py-0.5 rounded">95.2% Disruption Stability</span>
              <span>•</span>
              <span className="bg-white/10 px-2 py-0.5 rounded">Hinglish AI Parser</span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: SIGN-IN / AUTH FORMS                                    */}
        {/* ===================================================================== */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-center bg-white">
          
          {/* Header with CIT Logo & Brand */}
          <div className="text-center mb-5">
            <img
              src="/logo.png"
              alt="CIT CampusFlow Logo"
              style={{ height: '52px', width: 'auto' }}
              className="mx-auto object-contain mb-1 drop-shadow-xs"
            />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              CampusFlow
            </h1>
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Chilika Institute of Technology (CIT)
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Smart Schedules • Brighter Campus
            </p>
          </div>

          {/* =================================================================== */}
          {/* VIEW 1: SIGN-IN FORM (WITH 4 SMALL ROLE BOXES IN 1 SINGLE ROW)      */}
          {/* =================================================================== */}
          {authView === 'signin' && (
            <div className="space-y-4">
              
              {/* 4 Small Role Boxes in 1 Single Horizontal Row */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Select Your Role
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    4 Roles
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {ROLE_PRESETS.map((preset) => {
                    const isSelected = selectedRole === preset.id;
                    const IconComp = preset.icon;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectRole(preset)}
                        className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? `${preset.activeClass} shadow-xs`
                            : 'border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300 text-slate-700'
                        }`}
                        title={`${preset.title} (${preset.email})`}
                      >
                        <div className={`p-1 rounded-lg mb-1 ${isSelected ? 'bg-white shadow-2xs' : 'bg-slate-200/60'}`}>
                          <IconComp className={`w-3.5 h-3.5 ${preset.color}`} />
                        </div>
                        <span className="text-[11px] leading-tight block truncate w-full font-bold">
                          {preset.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium block truncate w-full mt-0.5">
                          {preset.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error Alert */}
              {loginError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setAuthView('forgot');
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Sign In */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer mt-1"
                >
                  <span>{loginLoading ? 'Authenticating...' : 'Sign In to CampusFlow Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Bottom Button to Registration Page (Required) */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 font-medium">
                  Don't have an account?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRegError(null);
                    setAuthView('register');
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold rounded-xl border border-slate-200 hover:border-blue-300 transition text-xs flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>Create New Account / Register</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 2: REGISTRATION VIEW                                           */}
          {/* =================================================================== */}
          {authView === 'register' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Create New Account</h2>
                  <p className="text-[11px] text-slate-500">Register as a CIT faculty, coordinator, club lead, or admin.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthView('signin')}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Sign In
                </button>
              </div>

              {regError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Patnaik"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. faculty.r07@cit.edu"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Password (min. 6 chars)</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Role</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-blue-600 transition"
                    >
                      <option value="faculty">Faculty Member</option>
                      <option value="department_coordinator">Coordinator</option>
                      <option value="club">Club Representative</option>
                      <option value="admin">Admin (Dean Office)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Department</label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-blue-600 transition"
                    >
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="EE">EE</option>
                      <option value="ME">ME</option>
                      <option value="CE">CE</option>
                      <option value="CLUBS">Clubs & Societies</option>
                      <option value="ADMIN">Dean's Office</option>
                    </select>
                  </div>
                </div>

                {regRole === 'faculty' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Linked Faculty ID</label>
                    <input
                      type="text"
                      value={regFacultyId}
                      onChange={(e) => setRegFacultyId(e.target.value)}
                      placeholder="e.g. F01, F07, F15..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-blue-600 transition"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer mt-1"
                >
                  <span>{regLoading ? 'Registering...' : 'Register Account & Open Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setAuthView('signin')}
                  className="text-xs text-blue-600 hover:underline font-bold inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 3: FORGOT PASSWORD VIEW                                        */}
          {/* =================================================================== */}
          {authView === 'forgot' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Forgot Password
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your registered CIT email to receive a password reset token.
                </p>
              </div>

              {forgotSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Reset Token Generated!</span>
                  </div>
                  <p className="text-[11px] font-mono bg-white p-2 rounded-lg border border-emerald-100">
                    Verification Code: <strong className="text-emerald-700 text-sm font-bold">{resetToken}</strong>
                  </p>
                  <p className="text-[10px] text-emerald-600">Redirecting to Reset Password screen...</p>
                </div>
              )}

              {forgotError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>{forgotError}</span>
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. admin@cit.edu, faculty.f01@cit.edu"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-blue-600 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                >
                  <span>{forgotLoading ? 'Verifying...' : 'Generate Password Reset Token'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setAuthView('signin')}
                  className="text-blue-600 hover:underline font-bold inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthView('reset')}
                  className="text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Have token? Reset →
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 4: RESET PASSWORD VIEW                                         */}
          {/* =================================================================== */}
          {authView === 'reset' && (
            <div className="space-y-3.5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Set New Password
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your verification code and choose a new password.
                </p>
              </div>

              {resetSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              {resetError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>{resetError}</span>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail || loginEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. admin@cit.edu"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">6-Digit Reset Token</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="e.g. 842103"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:bg-white focus:outline-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">New Password (min. 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-blue-600 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer mt-1"
                >
                  <span>{resetLoading ? 'Updating...' : 'Save New Password & Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setAuthView('signin')}
                  className="text-xs text-blue-600 hover:underline font-bold inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Cancel & Return to Sign In</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
