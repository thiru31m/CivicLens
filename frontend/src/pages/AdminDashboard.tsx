import React, { useState, useEffect } from 'react';
import {
  Settings, Users, Building, Flag, FileText, CheckCircle2,
  XCircle, Plus, Shield, RefreshCw, AlertTriangle, Layers
} from 'lucide-react';
import { User, Department, Category, ModerationFlag, AuditLog } from '../types';
import { api } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'flags' | 'audit'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New department modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptJurisdiction, setDeptJurisdiction] = useState('');
  const [deptEmail, setDeptEmail] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, d, c, f, a] = await Promise.all([
        api.getAllUsers(),
        api.getDepartments(),
        api.getCategories(),
        api.getModerationFlags(),
        api.getAuditLogs(100),
      ]);
      setUsers(u);
      setDepartments(d);
      setCategories(c);
      setFlags(f);
      setAuditLogs(a);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [activeTab]);

  const handleRoleChange = async (userId: number, newRole: string, deptId?: number | null) => {
    try {
      await api.updateUserRole(userId, newRole, deptId);
      alert('User role updated successfully');
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleModerateFlag = async (flagId: number, action: 'hide_post' | 'dismiss_flag') => {
    try {
      await api.moderateFlag(flagId, action);
      alert(`Moderation action '${action}' applied with audit record.`);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Moderation action failed');
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptJurisdiction.trim()) return;

    try {
      await api.createDepartment({
        name: deptName.trim(),
        jurisdiction: deptJurisdiction.trim(),
        contact_email: deptEmail.trim() || undefined,
        description: deptDesc.trim() || undefined,
      });
      setIsDeptModalOpen(false);
      setDeptName('');
      setDeptJurisdiction('');
      setDeptEmail('');
      setDeptDesc('');
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            System Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            CivicLens Admin Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Manage roles, departments, categories, content moderation queues, and immutable system audit logs.
          </p>
        </div>

        <button
          onClick={loadAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Admin Nav Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 mb-6 shadow-xs flex items-center gap-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
            activeTab === 'users' ? 'bg-civic-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & RBAC ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
            activeTab === 'departments' ? 'bg-civic-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
            activeTab === 'flags' ? 'bg-civic-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Moderation Queue ({flags.filter((f) => f.status === 'pending').length} pending)</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
            activeTab === 'audit' ? 'bg-civic-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Users & Roles */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4">User Role & Jurisdiction Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Current Role</th>
                  <th className="p-3">Assigned Department</th>
                  <th className="p-3">Role Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">
                      <div>{u.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">@{u.username} • {u.display_alias}</div>
                    </td>
                    <td className="p-3 text-slate-600">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'reviewer'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {u.department_name || 'None'}
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value, u.department_id)}
                        className="p-1 rounded border border-slate-300 bg-white text-xs text-slate-700"
                      >
                        <option value="citizen">Citizen</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Departments */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Municipal Departments & Jurisdictions</h3>
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-civic-600 hover:bg-civic-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((d) => (
              <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{d.name}</h4>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                    ID #{d.id}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{d.description}</p>
                <div className="mt-3 pt-2 border-t border-slate-200 space-y-1 text-slate-500 text-[11px]">
                  <div>📍 <strong>Jurisdiction:</strong> {d.jurisdiction}</div>
                  {d.contact_email && <div>✉️ <strong>Contact:</strong> {d.contact_email}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Moderation Flags */}
      {activeTab === 'flags' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Community Moderation Review Queue</h3>
          <p className="text-xs text-slate-500 mb-4">
            Citizen reports flagged for inaccuracies, spam, or harassment. Actions are recorded in the audit log without erasing historical submissions.
          </p>

          {flags.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No reported flags in queue.</p>
          ) : (
            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {f.reason}
                      </span>
                      <span className="text-slate-400 font-mono">{f.case_id}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        f.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900">{f.report_title}</h4>
                    {f.notes && <p className="text-slate-600 mt-1 italic">"{f.notes}"</p>}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Flagged by: {f.flagged_by_username} • {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {f.status === 'pending' && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleModerateFlag(f.id, 'dismiss_flag')}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
                      >
                        Dismiss Flag
                      </button>
                      <button
                        onClick={() => handleModerateFlag(f.id, 'hide_post')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
                      >
                        Hide Post
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Immutable System Audit Logs</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete traceability for all project status changes, verified records, review actions, and moderation decisions.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[550px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">Actor</th>
                  <th className="p-2.5">Action</th>
                  <th className="p-2.5">Target</th>
                  <th className="p-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 text-[11px]">
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2.5 text-slate-800">
                      <span className="font-bold">{log.actor_username}</span>{' '}
                      <span className="text-slate-400">({log.actor_role})</span>
                    </td>
                    <td className="p-2.5 font-bold text-civic-700">{log.action}</td>
                    <td className="p-2.5 text-slate-700">
                      {log.target_type} #{log.target_id}
                    </td>
                    <td className="p-2.5 text-slate-500 max-w-xs truncate">
                      {log.details || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-3">Add Municipal Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Coastal Infrastructure & Marine Works"
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jurisdiction *</label>
                <input
                  type="text"
                  required
                  value={deptJurisdiction}
                  onChange={(e) => setDeptJurisdiction(e.target.value)}
                  placeholder="e.g. South Coastal Zone 1-4"
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={deptEmail}
                  onChange={(e) => setDeptEmail(e.target.value)}
                  placeholder="dept@civiclens.local"
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-civic-600 hover:bg-civic-700 text-white rounded-lg font-semibold"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
