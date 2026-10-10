import React, { useState, useEffect } from 'react';
import {
  PlusCircle, MapPin, Upload, AlertCircle, CheckCircle2,
  Calendar, Building, ArrowRight, ShieldAlert, Sparkles, FileText, Image as ImageIcon
} from 'lucide-react';
import { Category, Project, CandidateMatch } from '../types';
import { api } from '../services/api';
import { LeafletMap } from '../components/LeafletMap';
import { DuplicateSuggestionsModal } from '../components/DuplicateSuggestionsModal';
import { useAuth } from '../context/AuthContext';

interface SubmitReportPageProps {
  onNavigate: (tab: string, params?: any) => void;
}

export const SubmitReportPage: React.FC<SubmitReportPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number | null>(12.9249);
  const [lng, setLng] = useState<number | null>(80.1700);
  const [observedDate, setObservedDate] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [relatedProjectId, setRelatedProjectId] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Pre-submission Duplicate Check & Suggestions Modal
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [candidateMatches, setCandidateMatches] = useState<CandidateMatch[]>([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-submission Confirmation Screen
  const [submittedCase, setSubmittedCase] = useState<{ case_id: string; time: string } | null>(null);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [cats, prjs] = await Promise.all([
          api.getCategories(),
          api.getProjects(),
        ]);
        setCategories(cats);
        setProjects(prjs);
        if (cats.length > 0) setCategoryId(cats[0].id);
      } catch (err) {
        console.error(err);
      }
    }
    loadInitial();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = e.target.files[0];
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowed.includes(ext)) {
      setFileError(`Invalid file format '${ext}'. Allowed: .jpg, .png, .webp, .pdf`);
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds maximum limit of 5MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleMapLocationSelect = (selectedLat: number, selectedLng: number) => {
    setLat(selectedLat);
    setLng(selectedLng);
  };

  // Run duplicate check using matching engine before submission
  const runDuplicateCheck = async () => {
    if (!title.trim() || !description.trim() || !categoryId || !locationName.trim()) {
      alert('Please fill in title, category, description, and location first.');
      return;
    }

    setCheckingDuplicates(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category_id', categoryId.toString());
      formData.append('location_name', locationName.trim());
      if (lat !== null) formData.append('latitude', lat.toString());
      if (lng !== null) formData.append('longitude', lng.toString());
      if (observedDate) formData.append('observed_date', observedDate);

      const res = await api.checkDuplicates(formData);
      setCandidateMatches(res.candidates);

      if (res.candidates.length > 0) {
        setIsDuplicateModalOpen(true);
      } else {
        // No duplicates found: proceed directly to submit
        await executeSubmit();
      }
    } catch (err: any) {
      alert(err.message || 'Duplicate check failed');
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await runDuplicateCheck();
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category_id', categoryId.toString());
      formData.append('location_name', locationName.trim());
      if (lat !== null) formData.append('latitude', lat.toString());
      if (lng !== null) formData.append('longitude', lng.toString());
      if (observedDate) formData.append('observed_date', observedDate);
      if (additionalContext.trim()) formData.append('additional_context', additionalContext.trim());
      if (relatedProjectId) formData.append('related_project_id', relatedProjectId.toString());
      if (selectedFile) formData.append('file', selectedFile);

      const report = await api.submitReport(formData);

      setIsDuplicateModalOpen(false);
      setSubmittedCase({
        case_id: report.case_id,
        time: new Date().toLocaleString(),
      });
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation Screen
  if (submittedCase) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-3">
          Status: Awaiting Official Review
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Observation Submitted Successfully
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
          Your report has been safely registered in the municipal verification queue. It is now published to the Civic Feed with an unverified label while reviewers investigate.
        </p>

        {/* Case Ticket Card */}
        <div className="mt-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-left max-w-md mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <span className="text-xs text-slate-500 font-medium">Tracking Case ID</span>
            <span className="font-mono text-sm font-bold text-civic-700 bg-civic-50 px-2.5 py-1 rounded border border-civic-200">
              {submittedCase.case_id}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 text-xs">
            <span className="text-slate-500">Submission Timestamp</span>
            <span className="text-slate-800 font-medium">{submittedCase.time}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Public Feed Visibility</span>
            <span className="text-amber-700 font-semibold">Live (Unverified Status)</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('my-reports')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-semibold text-sm transition shadow-md"
          >
            Track in My Reports
          </button>
          <button
            onClick={() => onNavigate('feed')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
          >
            View on Civic Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-civic-50 text-civic-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <PlusCircle className="w-3.5 h-3.5" />
            Citizen Public Works Observation
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Report Unlisted Works or Discrepancies
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            Observed ongoing road tear-ups, pipeline digging, or discrepancies in published public records? Submit your observation with evidence for official verification.
          </p>
        </div>

        <form onSubmit={handleSubmitForm} className="space-y-6 text-xs sm:text-sm">
          {/* Required Fields Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Required Information
            </h3>

            {/* Title */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Observation Title *
              </label>
              <input
                type="text"
                required
                minLength={5}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unlisted trench digging and road margin excavation along Vandalur link road"
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Project Domain / Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-civic-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Location (Area, Road Name, or Landmark) *
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={200}
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Vandalur-Kelambakkam Road, Near Outer Ring Junction"
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Detailed Description of Observed Works *
              </label>
              <textarea
                required
                minLength={10}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you observed: machinery present, whether safety signs or contractor boards are visible, depth of excavation, obstruction to traffic, etc."
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500"
              />
            </div>
          </div>

          {/* Interactive Coordinates Picker */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Pin Exact Site Coordinates on Map (Optional)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Click anywhere on the interactive map below to place a red marker at the exact excavation or construction site.
            </p>
            <LeafletMap
              height="280px"
              selectedLocation={lat !== null && lng !== null ? [lat, lng] : null}
              onSelectLocation={handleMapLocationSelect}
            />
            {lat !== null && lng !== null && (
              <div className="mt-2 text-xs text-slate-600 font-mono flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Selected Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
            )}
          </div>

          {/* Optional Supporting Fields */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Optional Supporting Details & Evidence
            </h3>

            {/* Photo / Document Upload */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Supporting Photograph or Document (Max 5MB)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-civic-400 transition bg-slate-50/50">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-8 w-8 text-slate-400" />
                  <div className="flex text-xs text-slate-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-semibold text-civic-600 hover:text-civic-500 focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    PNG, JPG, WEBP, or PDF up to 5MB
                  </p>
                  {selectedFile && (
                    <div className="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 py-1 px-2.5 rounded-full inline-flex items-center gap-1.5 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  )}
                  {fileError && (
                    <p className="mt-2 text-xs font-medium text-rose-600">
                      {fileError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Approximate Date Observed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Approximate Date Observed
                </label>
                <input
                  type="date"
                  value={observedDate}
                  onChange={(e) => setObservedDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900"
                />
              </div>

              {/* Related Project */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Related Official Project (If Discrepancy in Existing Record)
                </label>
                <select
                  value={relatedProjectId}
                  onChange={(e) => setRelatedProjectId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900"
                >
                  <option value="">None (Report as Unlisted Work)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code} - {p.title.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Context */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Additional Context
              </label>
              <input
                type="text"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g. Work is taking place between 11 PM and 4 AM; noticed two heavy JCB excavators"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="leading-relaxed">
              <strong>Privacy Protection:</strong> Your report will be displayed under your alias{' '}
              <span className="font-semibold text-slate-900">
                {user ? user.display_alias : 'CitizenObserver_Guest'}
              </span>
              . Your personal email and contact information remain private and will never be published to the public feed.
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition w-full sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={checkingDuplicates || isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50 w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {checkingDuplicates
                  ? 'Checking Existing Records...'
                  : isSubmitting
                  ? 'Submitting...'
                  : 'Verify & Submit Observation'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Duplicate Check Suggestions Modal */}
      <DuplicateSuggestionsModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        onContinue={executeSubmit}
        candidates={candidateMatches}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
