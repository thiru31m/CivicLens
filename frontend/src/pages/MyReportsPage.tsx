import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Clock, CheckCircle2, AlertCircle, ArrowRight,
  MessageSquare, Upload, HelpCircle, ChevronDown, ChevronUp, Image as ImageIcon,
  ShieldCheck, ExternalLink, RefreshCw
} from 'lucide-react';
import { CitizenReport } from '../types';
import { api } from '../services/api';
import { StatusBadge, VerificationNoticeBadge } from '../components/StatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { PhotoModal } from '../components/PhotoModal';
import { useAuth } from '../context/AuthContext';

interface MyReportsPageProps {
  onNavigate: (tab: string, params?: any) => void;
  onSelectProject?: (projectId: number) => void;
  initialCaseId?: string | null;
}

export const MyReportsPage: React.FC<MyReportsPageProps> = ({
  onNavigate,
  onSelectProject,
  initialCaseId,
}) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded report cards { reportId: boolean }
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Response form for "More Information Requested"
  const [activeRespondReportId, setActiveRespondReportId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Photo Lightbox
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; caption?: string | null } | null>(null);

  const fetchMyReports = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getMyReports();
      setReports(data);
      if (initialCaseId) {
        const match = data.find((r) => r.case_id === initialCaseId);
        if (match) setExpandedId(match.id);
      } else if (data.length > 0 && expandedId === null) {
        setExpandedId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [user]);

  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRespondReportId || !responseText.trim()) return;

    try {
      setIsSubmittingResponse(true);
      const formData = new FormData();
      formData.append('response_text', responseText.trim());
      if (responseFile) formData.append('file', responseFile);

      await api.respondToReport(activeRespondReportId, formData);
      alert('Additional evidence submitted successfully! Case returned to Under Review.');
      setActiveRespondReportId(null);
      setResponseText('');
      setResponseFile(null);
      await fetchMyReports();
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Sign in to Track Your Reports</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-6">
          Access your submitted observations, official investigation responses, and case timelines.
        </p>
        <button
          onClick={() => onNavigate('profile')}
          className="px-6 py-2.5 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-semibold text-xs shadow-md transition"
        >
          Sign In to Your Account
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-civic-50 text-civic-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <ClipboardList className="w-3.5 h-3.5" />
            Citizen Case Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Submitted Observations
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track official review progress, reviewer inquiries, and outcome determinations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMyReports}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigate('submit-report')}
            className="px-4 py-2 rounded-xl bg-civic-600 hover:bg-civic-700 text-white text-xs font-semibold shadow transition"
          >
            + New Observation
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-civic-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Loading your submitted reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">You haven't submitted any observations yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            Notice missing project signboards or road excavation? Submit your observation for review.
          </p>
          <button
            onClick={() => onNavigate('submit-report')}
            className="px-5 py-2.5 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-semibold text-xs transition"
          >
            Submit Your First Observation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id;
            const needsMoreInfo = report.status === 'More Information Requested';

            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition"
              >
                {/* Header summary row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-civic-700 bg-civic-50 px-2 py-0.5 rounded border border-civic-200">
                        {report.case_id}
                      </span>
                      <CategoryBadge name={report.category_name} size="sm" />
                      <span className="text-[11px] text-slate-400">
                        Submitted {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                      {report.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      📍 {report.location_name}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <StatusBadge status={report.status} />
                    <button className="p-1 text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Case Timeline */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 sm:p-6 bg-slate-50/40 space-y-6 text-xs sm:text-sm animate-fade-in">
                    {/* Prompt banner if reviewer requested more info */}
                    {needsMoreInfo && (
                      <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <HelpCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-purple-950">
                              Official Reviewer Requested Additional Evidence
                            </h4>
                            <p className="text-xs text-purple-800 mt-0.5">
                              {report.review_outcome_explanation || 'Please provide site photos or landmark descriptions to help field engineers.'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveRespondReportId(report.id)}
                          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs whitespace-nowrap shadow-xs transition"
                        >
                          Provide Additional Info
                        </button>
                      </div>
                    )}

                    {/* Investigation Outcome if verified or linked */}
                    {report.review_outcome_explanation && !needsMoreInfo && (
                      <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
                        <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-civic-600" />
                          <span>Official Review Explanation</span>
                        </h4>
                        <p className="text-slate-700 leading-relaxed italic">
                          "{report.review_outcome_explanation}"
                        </p>
                        {report.linked_project_id && onSelectProject && (
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-slate-500">Linked to official record:</span>
                            <button
                              onClick={() => onSelectProject(report.linked_project_id!)}
                              className="font-bold text-civic-600 hover:text-civic-700 inline-flex items-center gap-1"
                            >
                              <span>{report.linked_project_title || `Project #${report.linked_project_id}`}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Report Description & Evidence Photos */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider">
                        Submitted Observation Description
                      </h4>
                      <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-line">
                        {report.description}
                      </p>

                      {report.evidence && report.evidence.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <h5 className="font-semibold text-slate-600 text-xs mb-2">
                            Attached Photographic Evidence:
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {report.evidence.map((ev) => (
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
                                <img
                                  src={ev.file_path}
                                  alt={ev.original_filename}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-medium">
                                  Preview
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Official Review Timeline */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-civic-600" />
                        <span>Case Review Actions Timeline</span>
                      </h4>

                      <div className="space-y-3">
                        {report.review_actions.map((act, idx) => (
                          <div key={act.id || idx} className="relative pl-5 border-l-2 border-slate-200">
                            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-civic-600 border-2 border-white" />
                            <div className="text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{act.actor_name}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(act.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                Status: {act.new_status}
                              </span>
                              <p className="text-slate-600 mt-1 leading-relaxed">
                                {act.explanation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Citizen Response Drawer Modal */}
      {activeRespondReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 text-xs sm:text-sm">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Respond to Reviewer Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your response and uploaded evidence will be reviewed by the assigned municipal investigator.
            </p>

            <form onSubmit={handleResponseSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Additional Explanation or Landmarks *
                </label>
                <textarea
                  required
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Detail the exact location, specific landmarks (e.g. opposite temple or pillar #42), or observed machinery..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-civic-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attach Photo Evidence (Optional, Max 5MB)
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => setResponseFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-civic-50 file:text-civic-700 file:font-semibold hover:file:bg-civic-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRespondReportId(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResponse || !responseText.trim()}
                  className="px-4 py-2 bg-civic-600 hover:bg-civic-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmittingResponse ? 'Submitting...' : 'Submit Clarification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview */}
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
