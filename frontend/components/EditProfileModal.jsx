'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Building2,
  Lock,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  UserCog,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export default function EditProfileModal({ isOpen, onClose, currentUser, onProfileUpdated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [linkedFacultyId, setLinkedFacultyId] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setDepartment(currentUser.department || 'CSE');
      setLinkedFacultyId(currentUser.linked_faculty_id || '');
      setPhone(currentUser.phone || '');
      setDesignation(currentUser.designation || '');
      setSuccessMsg(null);
      setErrorMsg(null);
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  async function handleSaveProfile(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (showPasswordSection && newPassword) {
      if (newPassword !== confirmPassword) {
        setErrorMsg('New passwords do not match.');
        setLoading(false);
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      if (!currentPassword) {
        setErrorMsg('Please enter your current password to set a new password.');
        setLoading(false);
        return;
      }
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('cit_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        email,
        name,
        department,
        linked_faculty_id: linkedFacultyId || null,
        phone,
        designation,
      };

      if (showPasswordSection && newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setSuccessMsg(data.message || 'Profile successfully updated!');
        if (data.token) {
          localStorage.setItem('cit_token', data.token);
        }
        const updated = {
          ...currentUser,
          ...data.user,
        };
        localStorage.setItem('cit_user', JSON.stringify(updated));
        onProfileUpdated(updated);

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg('Network error connecting to profile update API.');
    } finally {
      setLoading(false);
    }
  }

  const roleLabels = {
    admin: "Dean's Academic Office (Admin)",
    department_coordinator: 'Department Coordinator',
    faculty: 'Faculty Member',
    club: 'Club Representative',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <UserCog className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Edit Profile</h2>
              <p className="text-xs text-slate-400">
                Update personal details, contact information, and security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <div className="p-6 sm:p-8 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            
            {/* Account Role Badge (Non-editable system role) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned CIT System Role
                </span>
                <span className="font-extrabold text-xs text-slate-800">
                  {roleLabels[currentUser?.role] || currentUser?.role}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                {currentUser?.role?.replace('_', ' ')}
              </span>
            </div>

            {/* Basic Info Fields */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Mishra"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. faculty.f01@cit.edu"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-blue-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-blue-600 transition"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EE">EE</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                    <option value="CLUBS">Clubs &amp; Societies</option>
                    <option value="ADMIN">Dean's Academic Office</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Phone / Contact (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-blue-600 transition"
                    />
                  </div>
                </div>
              </div>

              {currentUser?.role === 'faculty' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Linked Faculty ID
                  </label>
                  <input
                    type="text"
                    value={linkedFacultyId}
                    onChange={(e) => setLinkedFacultyId(e.target.value)}
                    placeholder="e.g. F01, F07..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-blue-600 transition"
                  />
                </div>
              )}
            </div>

            {/* Optional Password Change Section */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{showPasswordSection ? '– Hide Password Change' : '+ Change Password'}</span>
              </button>

              {showPasswordSection && (
                <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      New Password (min. 6 characters)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
