import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, CheckCircle2, AlertTriangle, Link2, PlusCircle,
  HelpCircle, XCircle, Search, RefreshCw, Eye, Sparkles, Building,
  ArrowRight, FileText, ChevronRight, MapPin, X
} from 'lucide-react';
import { CitizenReport, Project, Department, Category, CandidateMatch } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { PhotoModal } from '../components/PhotoModal';
import { useAuth } from '../context/AuthContext';

interface ReviewDashboardProps {
  onSelectProject?: (projectId: number) => void;
  initialCaseId?: string | null;
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ onSelectProject, initialCaseId }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter tabs
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);

  // Matching Engine Candidate Results for the selected report
  const [matchCandidates, setMatchCandidates] = useState<CandidateMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Review Action Modals
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [transitionAction, setTransitionAction] = useState<string>('under_review');
  const [transitionExplanation, setTransitionExplanation] = useState<string>('');
  const [referredDeptId, setReferredDeptId] = useState<number | undefined>(undefined);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkProjectId, setLinkProjectId] = useState<number | ''>('');
  const [linkExplanation, setLinkExplanation] = useState<string>('');

  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectPurpose, setNewProjectPurpose] = useState('');
  const [newProjectCatId, setNewProjectCatId] = useState<number>(1);
  const [newProjectDeptId, setNewProjectDeptId] = useState<number>(1);
  const [newProjectContractor, setNewProjectContractor] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState('');
  const [newProjectStartDate, setNewProjectStartDate] = useState('');
  const [newProjectCompletionDate, setNewProjectCompletionDate] = useState('');
  const [newProjectExplanation, setNewProjectExplanation] = useState('');

  // Photo Lightbox
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; caption?: string | null } | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const statusParam = activeStatusTab === 'all' ? undefined : activeStatusTab;

      // Fetch reports queue as the primary critical call
      const data = await api.getReviewQueue(statusParam);
      setReports(data);

      // Fetch support data independently — failure must not block the queue
      const [prjs, depts, cats] = await Promise.allSettled([
        api.getProjects(),
        api.getDepartments(),
        api.getCategories(),
      ]);
      if (prjs.status === 'fulfilled') setProjects(prjs.value);
      if (depts.status === 'fulfilled') setDepartments(depts.value);
      if (cats.status === 'fulfilled') setCategories(cats.value);

      if (initialCaseId) {
        const found = data.find((r) => r.case_id === initialCaseId);
        if (found) selectReportForInvestigation(found);
      } else if (data.length > 0 && !selectedReport) {
        selectReportForInvestigation(data[0]);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [activeStatusTab]);

  const selectReportForInvestigation = async (report: CitizenReport) => {
    setSelectedReport(report);
    setLoadingMatches(true);
    try {
      const matchRes = await api.getReportMatchingCandidates(report.id);
      setMatchCandidates(matchRes.candidates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Status transition handler (Under Review, Request Info, Close, Reopen)
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !transitionExplanation.trim()) return;

    try {
      const updated = await api.transitionReportStatus(
        selectedReport.id,
        transitionAction,
        transitionExplanation.trim(),
        referredDeptId
      );
      setIsTransitionModalOpen(false);
      setTransitionExplanation('');
      setSelectedReport(updated);
      await fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  // Link to Project handler
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !linkProjectId || !linkExplanation.trim()) return;

    try {
      const updated = await api.linkReportToProject(
        selectedReport.id,
        Number(linkProjectId),
        linkExplanation.trim()
      );
      setIsLinkModalOpen(false);
      setLinkExplanation('');
      setSelectedReport(updated);
      await fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Linking failed');
    }
  };

  // Verify and Create New Official Project
  const openVerifyCreateModal = () => {
    if (!selectedReport) return;
    setNewProjectTitle(selectedReport.title);
    setNewProjectDesc(selectedReport.description);
    setNewProjectPurpose(`Identified and confirmed via citizen report ${selectedReport.case_id}.`);
    setNewProjectCatId(selectedReport.category_id);
    setNewProjectDeptId(user?.department_id || (departments[0]?.id || 1));
    setNewProjectLocation(selectedReport.location_name);
    setNewProjectStartDate(selectedReport.observed_date || new Date().toISOString().split('T')[0]);
    setNewProjectExplanation(`Verified following site inspection for citizen report ${selectedReport.case_id}.`);
    setIsCreateProjectModalOpen(true);
  };

  const handleVerifyCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !newProjectTitle.trim() || !newProjectExplanation.trim()) return;

    try {
      const updated = await api.verifyAndCreateProject(selectedReport.id, {
        title: newProjectTitle.trim(),
        description: newProjectDesc.trim(),
        purpose: newProjectPurpose.trim(),
        category_id: newProjectCatId,
        department_id: newProjectDeptId,
        contractor: newProjectContractor.trim() || undefined,
        location_name: newProjectLocation.trim(),
        latitude: selectedReport.latitude || undefined,
        longitude: selectedReport.longitude || undefined,
        planned_start_date: newProjectStartDate || undefined,
        planned_completion_date: newProjectCompletionDate || undefined,
        budget: newProjectBudget ? parseFloat(newProjectBudget) : undefined,
        status: 'Ongoing',
        explanation: newProjectExplanation.trim(),
      });
      setIsCreateProjectModalOpen(false);
      setSelectedReport(updated);
      await fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Creation failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Official Case Management & Verification
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Reviewer Investigation Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Logged in as <strong className="text-white">{user?.full_name}</strong> ({user?.department_name || 'Government Reviewer'}). Examine community claims, cross-reference registries, and publish official verification determinations.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 mb-6 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-medium">
        {[
          { id: 'all', label: 'All Cases' },
          { id: 'Awaiting Review', label: 'Awaiting Review' },
          { id: 'Under Review', label: 'Under Review' },
          { id: 'More Information Requested', label: 'Info Requested' },
          { id: 'Linked to Existing Project', label: 'Linked Records' },
          { id: 'Official Record Verified', label: 'Verified New' },
          { id: 'Closed — Outcome Explained', label: 'Closed Cases' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStatusTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeStatusTab === tab.id
                ? 'bg-civic-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2-Column Investigation Layout: Left Case Queue, Right Active Investigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Reports Queue (4 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-bold text-sm text-slate-800">
              Incoming Reports Queue ({reports.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 space-y-1 pt-2">
            {loading ? (
              <p className="text-xs text-slate-400 py-10 text-center">Loading cases...</p>
            ) : reports.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No cases in this queue.</p>
            ) : (
              reports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => selectReportForInvestigation(r)}
                    className={`p-3.5 rounded-xl cursor-pointer transition border text-xs ${
                      isSelected
                        ? 'bg-civic-50/80 border-civic-300 shadow-xs'
                        : 'hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono font-bold text-[10px] text-civic-800 bg-civic-100 px-1.5 py-0.5 rounded">
                        {r.case_id}
                      </span>
                      <StatusBadge status={r.status} size="sm" />
                    </div>
                    <h4 className="font-semibold text-slate-900 line-clamp-1">{r.title}</h4>
                    <p className="text-slate-500 line-clamp-1 mt-0.5">📍 {r.location_name}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                      <span>By: {r.reporter_alias}</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Case Investigation Panel (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-y-auto max-h-[750px] space-y-6">
          {!selectedReport ? (
            <div className="py-24 text-center text-slate-400 text-xs">
              Select a case from the queue to inspect evidence and review.
            </div>
          ) : (
            <>
              {/* Case Header */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {selectedReport.case_id}
                    </span>
                    <CategoryBadge name={selectedReport.category_name} size="sm" />
                  </div>
                  <StatusBadge status={selectedReport.status} />
                </div>

                <h2 className="text-lg font-bold text-slate-900">{selectedReport.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                  <span>📍 {selectedReport.location_name}</span>
                  <span>•</span>
                  <span>Submitted by: <strong>{selectedReport.reporter_alias}</strong></span>
                  <span>•</span>
                  <span>{new Date(selectedReport.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                {/* Under Review */}
                {selectedReport.status === 'Awaiting Review' && (
                  <button
                    onClick={() => {
                      setTransitionAction('under_review');
                      setTransitionExplanation('Case accepted for on-site engineering audit and registry review.');
                      setIsTransitionModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                  >
                    Accept Under Review
                  </button>
                )}

                {/* Link to Existing Project */}
                <button
                  onClick={() => setIsLinkModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition flex items-center gap-1"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link to Existing Project</span>
                </button>

                {/* Verify and Create New Project */}
                <button
                  onClick={openVerifyCreateModal}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify & Create Official Project</span>
                </button>

                {/* Request More Information */}
                <button
                  onClick={() => {
                    setTransitionAction('request_info');
                    setTransitionExplanation('Please provide photo evidence or landmark details.');
                    setIsTransitionModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Request More Info</span>
                </button>

                {/* Close Case */}
                {selectedReport.status !== 'Closed — Outcome Explained' ? (
                  <button
                    onClick={() => {
                      setTransitionAction('close');
                      setTransitionExplanation('Investigation determined work is authorized private maintenance, not public works.');
                      setIsTransitionModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 transition flex items-center gap-1 ml-auto"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Close Case</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setTransitionAction('reopen');
                      setTransitionExplanation('Reopened following receipt of new evidence from citizen.');
                      setIsTransitionModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition ml-auto"
                  >
                    Reopen Case
                  </button>
                )}
              </div>

              {/* Description & Evidence */}
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider">Citizen Description</h3>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-line">
                  {selectedReport.description}
                </p>

                {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">Attached Evidence Photos:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.evidence.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() =>
                            setPreviewPhoto({
                              url: ev.file_path,
                              title: ev.original_filename,
                              caption: ev.caption,
                            })
                          }
                          className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition relative group"
                        >
                          <img src={ev.file_path} alt={ev.original_filename} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-medium">
                            Enlarge
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Matching Engine Assistance Section */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Deterministic Match Candidates ({matchCandidates.length})</span>
                  </div>
                  <span className="text-[10px] text-amber-800">
                    Proximity • Category • Text • Date Engine
                  </span>
                </div>

                {loadingMatches ? (
                  <p className="text-slate-400 py-3 text-center">Evaluating candidates...</p>
                ) : matchCandidates.length === 0 ? (
                  <p className="text-slate-500 py-2">
                    No existing projects or duplicate reports matched above the threshold (Score &ge; 40%). This appears to be a unique observation.
                  </p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {matchCandidates.map((cand, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col gap-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {cand.code} - {cand.title}
                          </span>
                          <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            {cand.similarity_score}% Match
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px]">📍 {cand.location_name}</p>
                        <div className="mt-1 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                          <strong>Reasons:</strong> {cand.match_reasons.join(', ')}
                        </div>
                        {cand.target_type === 'project' && (
                          <button
                            onClick={() => {
                              setLinkProjectId(cand.id);
                              setLinkExplanation(`Linked based on matching engine suggestion (${cand.similarity_score}% score).`);
                              setIsLinkModalOpen(true);
                            }}
                            className="mt-2 text-xs font-semibold text-civic-600 hover:text-civic-800 self-end"
                          >
                            &rarr; Link to this Project
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Case Action Audit History */}
              <div className="text-xs">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-2">Previous Action History</h3>
                <div className="space-y-2">
                  {selectedReport.review_actions.map((act, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900">{act.actor_name}</span>
                        <span className="text-slate-400">{new Date(act.created_at).toLocaleString()}</span>
                      </div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-medium">
                        {act.new_status}
                      </span>
                      <p className="text-slate-600 mt-1">{act.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transition Modal (Under Review, Request Info, Close, Reopen) */}
      {isTransitionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs sm:text-sm">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-2">
              Update Case Status: <span className="capitalize">{transitionAction.replace('_', ' ')}</span>
            </h3>

            <form onSubmit={handleTransitionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Explanation & Reviewer Notes * (Notifies citizen and logged to audit)
                </label>
                <textarea
                  required
                  rows={4}
                  value={transitionExplanation}
                  onChange={(e) => setTransitionExplanation(e.target.value)}
                  placeholder="Detail why status is being updated, instructions to citizen, or closure outcome..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransitionModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-civic-600 hover:bg-civic-700 text-white rounded-lg font-semibold"
                >
                  Confirm Transition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link to Project Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs sm:text-sm">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">Link Report to Official Project</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select an authorized project that corresponds to this citizen observation.
            </p>

            <form onSubmit={handleLinkSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Official Project *</label>
                <select
                  required
                  value={linkProjectId}
                  onChange={(e) => setLinkProjectId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900"
                >
                  <option value="">-- Choose Project from Registry --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reviewer Explanation *</label>
                <textarea
                  required
                  rows={3}
                  value={linkExplanation}
                  onChange={(e) => setLinkExplanation(e.target.value)}
                  placeholder="Explain why this observation relates to the selected project..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                >
                  Link & Notify Citizen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify & Create Official Project Modal */}
      {isCreateProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Verify & Create Official Project Record
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Published directly from investigated citizen observation {selectedReport?.case_id}.
            </p>

            <form onSubmit={handleVerifyCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Project Title *</label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newProjectCatId}
                    onChange={(e) => setNewProjectCatId(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsible Department *</label>
                  <select
                    value={newProjectDeptId}
                    onChange={(e) => setNewProjectDeptId(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  value={newProjectLocation}
                  onChange={(e) => setNewProjectLocation(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scope & Description *</label>
                <textarea
                  required
                  rows={2}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contractor (Optional)</label>
                <input
                  type="text"
                  value={newProjectContractor}
                  onChange={(e) => setNewProjectContractor(e.target.value)}
                  placeholder="e.g. Coromandel Infrastructure Ltd"
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sanctioned Budget (₹)</label>
                  <input
                    type="number"
                    value={newProjectBudget}
                    onChange={(e) => setNewProjectBudget(e.target.value)}
                    placeholder="e.g. 5000000"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Est. Completion Date</label>
                  <input
                    type="date"
                    value={newProjectCompletionDate}
                    onChange={(e) => setNewProjectCompletionDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verification Explanation *</label>
                <textarea
                  required
                  rows={2}
                  value={newProjectExplanation}
                  onChange={(e) => setNewProjectExplanation(e.target.value)}
                  placeholder="State ground inspection findings confirming this official work..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Publish Official Project Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewPhoto && (
        <PhotoModal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          imageUrl={previewPhoto.url}
          title={previewPhoto.title}
          caption={previewPhoto.caption}
        />
      )}
    </div>
  );
};
