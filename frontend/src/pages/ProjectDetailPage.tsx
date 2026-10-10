import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Building, Calendar, DollarSign,
  FileText, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  History, MessageSquare, Plus, Edit3, X
} from 'lucide-react';
import { Project, CitizenReport } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { LeafletMap } from '../components/LeafletMap';
import { useAuth } from '../context/AuthContext';

interface ProjectDetailPageProps {
  projectId: number;
  onBack: () => void;
  onSelectReport?: (reportId: number) => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onBack,
  onSelectReport,
}) => {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [relatedReports, setRelatedReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Reviewer edit status modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('Ongoing');
  const [editBudget, setEditBudget] = useState<string>('');
  const [editExplanation, setEditExplanation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Milestone add modal
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneStatus, setMilestoneStatus] = useState('In Progress');
  const [milestoneNotes, setMilestoneNotes] = useState('');

  const isReviewer = user?.role === 'reviewer' || user?.role === 'admin';

  const loadProject = async () => {
    try {
      setLoading(true);
      const prj = await api.getProject(projectId);
      setProject(prj);
      setEditStatus(prj.status);
      setEditBudget(prj.budget ? prj.budget.toString() : '');

      const reports = await api.getProjectRelatedReports(projectId);
      setRelatedReports(reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExplanation.trim()) {
      alert('Please provide an explanation for this update to maintain audit logs.');
      return;
    }

    try {
      setIsUpdating(true);
      await api.updateProject(projectId, {
        status: editStatus,
        budget: editBudget ? parseFloat(editBudget) : undefined,
        explanation: editExplanation.trim(),
      });
      setIsEditModalOpen(false);
      setEditExplanation('');
      await loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to update project');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;

    try {
      await api.addMilestone(projectId, {
        title: milestoneTitle.trim(),
        target_date: milestoneDate || undefined,
        status: milestoneStatus,
        evidence_notes: milestoneNotes || undefined,
      });
      setIsMilestoneModalOpen(false);
      setMilestoneTitle('');
      setMilestoneDate('');
      setMilestoneNotes('');
      await loadProject();
    } catch (err: any) {
      alert(err.message || 'Failed to add milestone');
    }
  };

  if (loading || !project) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-civic-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500">Loading official record details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Breadcrumb & Action */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        {isReviewer && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-civic-600" />
              <span>Update Status & Budget</span>
            </button>
            <button
              onClick={() => setIsMilestoneModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-civic-600 text-white text-xs font-semibold hover:bg-civic-700 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Milestone</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Project Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-civic-800 bg-civic-50 px-2.5 py-1 rounded border border-civic-200">
              {project.project_code}
            </span>
            <CategoryBadge name={project.category_name} />
          </div>
          <StatusBadge status={project.status} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {project.title}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Scope & Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {project.description}
            </p>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">
              Civic Purpose & Need
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {project.purpose}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Location: </span>
                <span className="text-slate-600">{project.location_name}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Responsible Department: </span>
                <span className="text-slate-600">{project.department_name || 'Municipal Works'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Contractor: </span>
                <span className="text-slate-600">{project.contractor || 'Public Works In-House Unit'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Timeline: </span>
                <span className="text-slate-600">
                  {project.planned_start_date || 'N/A'} &rarr; {project.planned_completion_date || 'N/A'}
                </span>
              </div>
            </div>

            {project.budget && (
              <div className="flex items-start gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">Sanctioned Budget: </span>
                  <span className="text-emerald-700 font-bold">
                    ₹{(project.budget / 100000).toFixed(2)} Lakhs (₹{project.budget.toLocaleString()})
                  </span>
                </div>
              </div>
            )}

            {project.source_documents && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">Source Citations: </span>
                  <span className="text-slate-600">{project.source_documents}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spatial Location Map */}
        {project.latitude && project.longitude && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Geographic Work Site Coordinates
            </h3>
            <LeafletMap
              projects={[project]}
              center={[project.latitude, project.longitude]}
              zoom={14}
              height="280px"
            />
          </div>
        )}
      </div>

      {/* Grid: Milestones & Historical Update Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Project Milestones */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-civic-600" />
              <span>Project Milestones & Progress</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {project.milestones.length} milestones
            </span>
          </div>

          {project.milestones.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No milestones recorded for this project yet.
            </p>
          ) : (
            <div className="space-y-4">
              {project.milestones.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {m.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-slate-600 mt-1">{m.description}</p>
                  )}
                  {m.evidence_notes && (
                    <div className="mt-2 text-slate-700 bg-white p-2 rounded border border-slate-200">
                      <strong>Notes:</strong> {m.evidence_notes}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    {m.target_date && <span>Target: {m.target_date}</span>}
                    {m.completion_date && <span className="text-emerald-700 font-medium">Completed: {m.completion_date}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chronological Update History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <History className="w-5 h-5 text-civic-600" />
              <span>Official Chronological History</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Immutable Audit Record
            </span>
          </div>

          {project.update_history.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No previous updates recorded.
            </p>
          ) : (
            <div className="space-y-4">
              {project.update_history.map((h, idx) => (
                <div key={h.id || idx} className="relative pl-6 pb-2 border-l-2 border-civic-200">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-civic-600 border-2 border-white" />
                  <div className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{h.actor_name}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                        Status: {h.new_status}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1.5 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {h.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related Citizen Reports */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-civic-600" />
            <span>Related Citizen Observations ({relatedReports.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            Citizen claims verified or linked to this record
          </span>
        </div>

        {relatedReports.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No citizen observations linked to this project yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedReports.map((r) => (
              <div
                key={r.id}
                onClick={() => onSelectReport && onSelectReport(r.id)}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-civic-300 transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {r.case_id}
                  </span>
                  <StatusBadge status={r.status} size="sm" />
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">{r.title}</h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{r.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-200">
                  <span>By: {r.reporter_alias}</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewer Status Update Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">Update Official Project Record</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                >
                  <option value="Planned">Planned</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Revised Budget (₹)</label>
                <input
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  placeholder="e.g. 25000000"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Explanation for Update (Required for Public Audit) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  placeholder="Detail why the status or budget changed (e.g. equipment delay, completed paving, etc.)."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-civic-600 hover:bg-civic-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Publish Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviewer Milestone Add Modal */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">Record Project Milestone</h3>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Foundation Box Culvert Concrete Pouring"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Date</label>
                <input
                  type="date"
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={milestoneStatus}
                  onChange={(e) => setMilestoneStatus(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidence / Site Notes</label>
                <textarea
                  rows={2}
                  value={milestoneNotes}
                  onChange={(e) => setMilestoneNotes(e.target.value)}
                  placeholder="Density tests passed, concrete curing notes..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-civic-600 hover:bg-civic-700 text-white rounded-lg font-semibold"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
