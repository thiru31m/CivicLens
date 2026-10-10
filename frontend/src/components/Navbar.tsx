import React, { useState } from 'react';
import {
  Search, Map, MessageSquare, ClipboardList, ShieldAlert,
  Settings, PlusCircle, User, LogOut, Menu, X, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationsPopover } from './NotificationsPopover';
import { UserRole } from '../types';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const { user, logout, switchDemoAccount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const isReviewer = user?.role === 'reviewer' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const navLinks = [
    { id: 'explore', label: 'Explore', icon: Search },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'feed', label: 'Civic Feed', icon: MessageSquare },
    { id: 'my-reports', label: 'My Reports', icon: ClipboardList },
  ];

  if (isReviewer) {
    navLinks.push({ id: 'review', label: 'Review Dashboard', icon: ShieldAlert });
  }

  if (isAdmin) {
    navLinks.push({ id: 'admin', label: 'Administration', icon: Settings });
  }

  const handleRoleChange = async (role: UserRole) => {
    setRoleSwitcherOpen(false);
    await switchDemoAccount(role);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('explore')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-civic-700 to-civic-500 flex items-center justify-center text-white shadow-md shadow-civic-500/20 group-hover:scale-105 transition">
                <Search className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-civic-600 transition flex items-center gap-1">
                  Civic<span className="text-civic-600">Lens</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-500 -mt-1 font-medium">
                  Public Works Transparency
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-civic-50 text-civic-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-civic-600' : 'text-slate-500'}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Submit Report Button */}
            <button
              onClick={() => onNavigate('submit-report')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-civic-600 hover:bg-civic-700 text-white text-xs sm:text-sm font-medium shadow transition hover:shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Submit Observation</span>
              <span className="sm:hidden">Report</span>
            </button>

            {/* Notifications */}
            {user && <NotificationsPopover onNavigate={onNavigate} />}

            {/* Demo Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                  user?.role === 'admin'
                    ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                    : user?.role === 'reviewer'
                    ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
                title="Switch demo evaluation role"
              >
                <span className="w-2 h-2 rounded-full bg-current"></span>
                <span className="capitalize">{user ? user.role : 'Guest'}</span>
              </button>

              {roleSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRoleSwitcherOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 animate-fade-in text-xs">
                    <div className="px-2 py-1.5 font-bold text-slate-800 border-b border-slate-100 mb-1">
                      Demo Role Switcher:
                    </div>
                    {(['citizen', 'reviewer', 'admin'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                          user?.role === r ? 'bg-slate-100 font-bold text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="capitalize">{r}</div>
                          <div className="text-[10px] text-slate-400">
                            {r === 'citizen' && 'Rahul Sharma (Reporter)'}
                            {r === 'reviewer' && 'Priya Verma (Highways)'}
                            {r === 'admin' && 'Vikram Sen (Admin)'}
                          </div>
                        </div>
                        {user?.role === r && <Check className="w-3.5 h-3.5 text-civic-600" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Profile / Logout */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onNavigate('profile')}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </button>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('profile')}
                className="text-xs sm:text-sm font-semibold text-civic-600 hover:text-civic-700 px-2 py-1"
              >
                Sign In
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  onNavigate(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-civic-50 text-civic-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
