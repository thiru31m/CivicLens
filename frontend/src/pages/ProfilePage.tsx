import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Briefcase, Mail, Calendar, Key, AlertCircle, CheckCircle, LogOut, UserPlus, LogIn } from 'lucide-react';
import { UserRole } from '../types';

interface DemoAccountItem {
  name: string;
  username: string;
  role: UserRole;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccountItem[] = [
  {
    name: 'Rahul Verma',
    username: 'citizen_rahul',
    role: 'citizen',
    desc: 'Citizen Reporter (Ward 7 Resident)',
  },
  {
    name: 'Priya Nair',
    username: 'reviewer_priya',
    role: 'reviewer',
    desc: 'Government Reviewer (Public Works Dept)',
  },
  {
    name: 'Civic Admin',
    username: 'admin_civic',
    role: 'admin',
    desc: 'System Administrator (Full Privileges)',
  },
];

export const ProfilePage: React.FC = () => {
  const { user, login, register, logout, switchDemoAccount, loading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both username and password.');
      return;
    }

    try {
      setIsSubmittingLogin(true);
      await login(loginUsername, loginPassword);
      setLoginSuccess('Logged in successfully!');
      setLoginUsername('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regFullName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('All fields are required.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmittingReg(true);
      await register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        full_name: regFullName.trim(),
        password: regPassword,
      });
      setRegSuccess('Registration successful! You are now logged in as a Citizen.');
      setRegFullName('');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">User Account & Roles</h1>
        <p className="text-slate-600 mt-1">
          Manage your CivicLens profile, review permission levels, or switch role perspectives.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Current User Card or Auth Form */}
        <div className="lg:col-span-2 space-y-6">
          {user ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 px-6 py-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-white text-2xl font-bold">
                      {user.full_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        {user.full_name}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : user.role === 'reviewer'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {user.role}
                        </span>
                      </h2>
                      <p className="text-slate-300 text-sm">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <Mail className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</div>
                      <div className="text-sm font-medium text-slate-900 mt-0.5">{user.email}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role & Permissions</div>
                      <div className="text-sm font-medium text-slate-900 mt-0.5 capitalize">
                        {user.role === 'admin' ? 'System Administrator (Full)' : user.role === 'reviewer' ? 'Official Reviewer' : 'Citizen Reporter'}
                      </div>
                    </div>
                  </div>

                  {user.department_name && (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
                      <Briefcase className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Department</div>
                        <div className="text-sm font-medium text-slate-900 mt-0.5">{user.department_name}</div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Member Since</div>
                      <div className="text-sm font-medium text-slate-900 mt-0.5">
                        {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy & RBAC Disclaimer */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-sm text-emerald-900 space-y-2">
                  <div className="font-semibold flex items-center gap-2 text-emerald-800">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Privacy-Preserving Alias Protection
                  </div>
                  <p className="text-emerald-800 text-xs leading-relaxed">
                    When you submit observations or engage on the Civic Feed, your real email and direct contact details are never exposed to other citizens. Only your alias (e.g., <strong>@{user.username}</strong>) and observation evidence are shown. Official reviewers can access your verified submission context to request clarifying evidence.
                  </p>
                </div>

                {/* Role Capabilities List */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Your Role Capabilities</h3>
                  <div className="space-y-2 text-sm text-slate-700">
                    {user.role === 'citizen' && (
                      <ul className="space-y-2 list-disc list-inside text-xs text-slate-600">
                        <li>Browse official municipal projects and track update histories.</li>
                        <li>Submit observations with geographic pin coordinates and photo evidence.</li>
                        <li>Pre-submission deterministic duplicate & nearby project detection.</li>
                        <li>Engage on Civic Feed: 1-like-per-user toggle, post comments, flag content.</li>
                        <li>Respond to official reviewer requests for additional photographic evidence.</li>
                      </ul>
                    )}
                    {user.role === 'reviewer' && (
                      <ul className="space-y-2 list-disc list-inside text-xs text-slate-600">
                        <li>Access protected Review Dashboard with case filtering.</li>
                        <li>Inspect citizen evidence and deterministic duplicate match candidate scores.</li>
                        <li>Transition report lifecycle: Under Review, Request Info, Link to Existing Project, Close with Explanation.</li>
                        <li>Verify unlisted work and publish new official public works projects.</li>
                        <li>Update existing official project timelines, milestones, and progress percentages.</li>
                      </ul>
                    )}
                    {user.role === 'admin' && (
                      <ul className="space-y-2 list-disc list-inside text-xs text-slate-600">
                        <li>Full role-based access control: assign Reviewer or Admin roles to users.</li>
                        <li>Manage municipal departments and civic project categories.</li>
                        <li>Review citizen moderation flags and take actions (dismiss or hide content).</li>
                        <li>Inspect tamper-evident system audit logs of all administrative and review actions.</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Auth Tab Form (Login / Register) */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => { setActiveTab('login'); setLoginError(''); }}
                  className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'login'
                      ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-50'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to CivicLens
                </button>
                <button
                  onClick={() => { setActiveTab('register'); setRegError(''); }}
                  className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'register'
                      ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-50'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Register Citizen Account
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {loginError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {loginError}
                      </div>
                    )}
                    {loginSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {loginSuccess}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="e.g. citizen_rahul"
                        className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLogin}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingLogin ? 'Authenticating...' : 'Sign In'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {regError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {regError}
                      </div>
                    )}
                    {regSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {regSuccess}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Anita Desai"
                        className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="anita_d"
                          className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="anita@example.com"
                          className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-200">
                      <strong>Security Note:</strong> New accounts are always created with the <strong>Citizen</strong> role. Reviewer and Administrator privileges are restricted and can only be granted by existing authorized administrators.
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReg}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingReg ? 'Creating Account...' : 'Register as Citizen'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: 1-Click Role Switcher & Seed Credentials */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">1-Click Role Switcher</h2>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Instantly toggle between pre-configured seed accounts to test Citizen, Reviewer, and Administrator features end-to-end.
            </p>

            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((account) => {
                const isCurrent = user?.username === account.username;
                return (
                  <button
                    key={account.username}
                    onClick={() => switchDemoAccount(account.role)}
                    disabled={loading}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-slate-900">{account.name}</div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        account.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : account.role === 'reviewer'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {account.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                      <span>@{account.username}</span>
                      <span className="text-[11px] text-slate-400">Password123!</span>
                    </div>
                    {isCurrent && (
                      <div className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Currently Active
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seed Credentials Reference */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-600 space-y-3">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Seed Accounts Reference
            </h3>
            <div className="space-y-2">
              <div className="p-2 bg-white rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Citizen: Rahul Verma</div>
                <div className="text-slate-500">username: <code>citizen_rahul</code> / pwd: <code>Password123!</code></div>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Reviewer: Priya Nair (PWD)</div>
                <div className="text-slate-500">username: <code>reviewer_priya</code> / pwd: <code>Password123!</code></div>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Admin: Civic Admin</div>
                <div className="text-slate-500">username: <code>admin_civic</code> / pwd: <code>Password123!</code></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
