import React, { useState, useEffect } from 'react';
import {
  Heart, MessageCircle, Flag, MapPin, Calendar, ShieldCheck,
  AlertTriangle, Link2, Share2, Filter, Send, Image as ImageIcon,
  CheckCircle2, Clock, HelpCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import { CitizenReport, Category, CivicPostComment } from '../types';
import { api } from '../services/api';
import { StatusBadge, VerificationNoticeBadge } from '../components/StatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { PhotoModal } from '../components/PhotoModal';
import { useAuth } from '../context/AuthContext';

interface FeedPageProps {
  onSelectProject?: (projectId: number) => void;
  onSelectReport?: (reportId: number) => void;
}

export const FeedPage: React.FC<FeedPageProps> = ({ onSelectProject, onSelectReport }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [sortBy, setSortBy] = useState<'latest' | 'active'>('latest');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState('');

  // Comment expand state map { reportId: boolean }
  const [expandedComments, setExpandedComments] = useState<{ [key: number]: boolean }>({});
  const [commentsMap, setCommentsMap] = useState<{ [key: number]: CivicPostComment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
  const [loadingComments, setLoadingComments] = useState<{ [key: number]: boolean }>({});

  // Lightbox photo preview modal
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; caption?: string | null } | null>(null);

  // Flag moderation modal
  const [flagModalReportId, setFlagModalReportId] = useState<number | null>(null);
  const [flagReason, setFlagReason] = useState('Misleading or inaccurate observation');
  const [flagNotes, setFlagNotes] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const params: any = { sort_by: sortBy };
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
      if (areaFilter.trim()) params.area = areaFilter.trim();

      const data = await api.getFeed(params);
      setReports(data);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (e) {
        console.error(e);
      }
      fetchFeed();
    }
    init();
  }, [sortBy, selectedCategory, selectedStatus]);

  const handleLikeToggle = async (reportId: number) => {
    if (!user) {
      alert('Please log in to support community observations.');
      return;
    }

    try {
      const res = await api.toggleLike(reportId);
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, has_liked: res.liked, likes_count: res.likes_count }
            : r
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle support');
    }
  };

  const handleToggleComments = async (reportId: number) => {
    const isExpanded = expandedComments[reportId];
    if (isExpanded) {
      setExpandedComments((prev) => ({ ...prev, [reportId]: false }));
      return;
    }

    setExpandedComments((prev) => ({ ...prev, [reportId]: true }));
    if (!commentsMap[reportId]) {
      setLoadingComments((prev) => ({ ...prev, [reportId]: true }));
      try {
        const comments = await api.getComments(reportId);
        setCommentsMap((prev) => ({ ...prev, [reportId]: comments }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [reportId]: false }));
      }
    }
  };

  const handleAddComment = async (reportId: number) => {
    if (!user) {
      alert('Please log in to contribute comments.');
      return;
    }
    const content = commentInputs[reportId]?.trim();
    if (!content) return;

    try {
      const newComment = await api.addComment(reportId, content);
      setCommentsMap((prev) => ({
        ...prev,
        [reportId]: [...(prev[reportId] || []), newComment],
      }));
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, comments_count: r.comments_count + 1 } : r
        )
      );
      setCommentInputs((prev) => ({ ...prev, [reportId]: '' }));
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to report content.');
      return;
    }
    if (!flagModalReportId) return;

    try {
      setFlagSubmitting(true);
      await api.flagReport(flagModalReportId, flagReason, flagNotes);
      alert('Report submitted for administrative review. Thank you for maintaining community standards.');
      setFlagModalReportId(null);
      setFlagNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to report post');
    } finally {
      setFlagSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Feed Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-civic-50 text-civic-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <MessageCircle className="w-3.5 h-3.5" />
              Community Ground Truth Feed
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Civic Verification Feed
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Real-time citizen observations about public works, ongoing official reviews, and published verification outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchFeed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="leading-relaxed">
            <strong>Community Engagement Notice:</strong> Likes and comments indicate public interest, not established official facts. Citizen allegations remain explicitly unverified until investigated by authorized reviewers.
          </div>
        </div>

        {/* Controls: Sorting & Filter Tabs */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          {/* Sorting Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSortBy('latest')}
              className={`px-3 py-1.5 rounded-md transition ${
                sortBy === 'latest' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Latest Reports
            </button>
            <button
              onClick={() => setSortBy('active')}
              className={`px-3 py-1.5 rounded-md transition ${
                sortBy === 'active' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recent Activity
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-civic-500"
            >
              <option value="all">All Verification States</option>
              <option value="Awaiting Review">Awaiting Review</option>
              <option value="Under Review">Under Review</option>
              <option value="More Information Requested">More Info Requested</option>
              <option value="Linked to Existing Project">Linked to Existing Project</option>
              <option value="Official Record Verified">Official Record Verified</option>
              <option value="Closed — Outcome Explained">Closed — Outcome Explained</option>
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
              selectedCategory === undefined ? 'bg-civic-600 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                selectedCategory === c.id ? 'bg-civic-600 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Posts List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-civic-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading community feed...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No observations match this filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try switching categories or clearing verification status.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <article
              key={report.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition"
            >
              {/* Post Header */}
              <div className="p-5 sm:p-6 pb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-civic-600 to-sky-400 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {report.reporter_alias.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {report.reporter_alias}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {report.case_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{report.location_name}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={report.status} size="sm" />
                  </div>
                </div>

                {/* Verification Notice Banner */}
                <div className="mb-3">
                  <VerificationNoticeBadge status={report.status} />
                </div>

                {/* Title & Description */}
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  {report.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {report.description}
                </p>

                {/* Linked Project Banner */}
                {report.linked_project_id && (
                  <div className="mt-4 p-3 rounded-xl bg-teal-50/80 border border-teal-200 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2 text-teal-900">
                      <Link2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Linked to Official Public Project: </span>
                        <span>{report.linked_project_title || `Project #${report.linked_project_id}`}</span>
                      </div>
                    </div>
                    {onSelectProject && (
                      <button
                        onClick={() => onSelectProject(report.linked_project_id!)}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 whitespace-nowrap inline-flex items-center gap-1"
                      >
                        <span>View Project</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Official Response Banner */}
                {report.review_outcome_explanation && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                      <ShieldCheck className="w-4 h-4 text-civic-600" />
                      <span>Official Investigation Outcome:</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed italic">
                      "{report.review_outcome_explanation}"
                    </p>
                  </div>
                )}

                {/* Photo Evidence Preview */}
                {report.evidence && report.evidence.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {report.evidence.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() =>
                          setPreviewPhoto({
                            url: ev.file_path,
                            title: `Evidence for ${report.case_id}`,
                            caption: ev.caption,
                          })
                        }
                        className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video cursor-pointer"
                      >
                        <img
                          src={ev.file_path}
                          alt={ev.original_filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white text-xs font-medium">Click to Enlarge</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Engagement Toolbar */}
              <div className="px-5 sm:px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  {/* Single Like Toggle */}
                  <button
                    onClick={() => handleLikeToggle(report.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                      report.has_liked
                        ? 'text-rose-600 bg-rose-50 border border-rose-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title={report.has_liked ? 'Remove Support' : 'Support Community Observation'}
                  >
                    <Heart className={`w-4 h-4 ${report.has_liked ? 'fill-current' : ''}`} />
                    <span>{report.likes_count} Support</span>
                  </button>

                  {/* Comment Toggle */}
                  <button
                    onClick={() => handleToggleComments(report.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{report.comments_count} Comments</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFlagModalReportId(report.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Report abusive or misleading post"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comments Section Drawer */}
              {expandedComments[report.id] && (
                <div className="border-t border-slate-200 bg-slate-50/50 p-5 sm:p-6 animate-fade-in text-xs">
                  <div className="space-y-3 mb-4">
                    {loadingComments[report.id] ? (
                      <p className="text-slate-400 italic">Loading comments...</p>
                    ) : (commentsMap[report.id] || []).length === 0 ? (
                      <p className="text-slate-400 italic">No comments yet. Share your observation or context.</p>
                    ) : (
                      (commentsMap[report.id] || []).map((c) => (
                        <div
                          key={c.id}
                          className={`p-3 rounded-xl border ${
                            c.is_official
                              ? 'bg-blue-50/70 border-blue-200 text-slate-800'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-bold flex items-center gap-1.5 ${c.is_official ? 'text-civic-800' : 'text-slate-900'}`}>
                              {c.is_official && <ShieldCheck className="w-3.5 h-3.5 text-civic-600" />}
                              <span>{c.author_alias}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={user ? "Add constructive context, evidence, or observation..." : "Log in to post a comment..."}
                      disabled={!user}
                      value={commentInputs[report.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [report.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(report.id);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
                    />
                    <button
                      onClick={() => handleAddComment(report.id)}
                      disabled={!user || !commentInputs[report.id]?.trim()}
                      className="px-3.5 py-2 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-semibold transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Lightbox Photo Modal */}
      {previewPhoto && (
        <PhotoModal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          imageUrl={previewPhoto.url}
          title={previewPhoto.title}
          caption={previewPhoto.caption}
        />
      )}

      {/* Flag Moderation Modal */}
      {flagModalReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">Report Post to Moderators</h3>
            <p className="text-xs text-slate-500 mb-4">
              Flagged posts are reviewed by municipal administrators. Reason is logged to immutable audit records.
            </p>

            <form onSubmit={handleFlagSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Violation Reason</label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                >
                  <option value="Misleading or inaccurate observation">Misleading or inaccurate observation</option>
                  <option value="Abusive or harassing content">Abusive or harassing content</option>
                  <option value="Spam or promotional material">Spam or promotional material</option>
                  <option value="Private property or personal information">Private property or personal information</option>
                  <option value="Duplicate submission">Duplicate submission</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Additional Context (Optional)</label>
                <textarea
                  rows={3}
                  value={flagNotes}
                  onChange={(e) => setFlagNotes(e.target.value)}
                  placeholder="Explain why this content violates community integrity..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlagModalReportId(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flagSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {flagSubmitting ? 'Reporting...' : 'Submit Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
