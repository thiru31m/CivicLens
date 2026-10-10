import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, FileText, MapPin, X } from 'lucide-react';
import { CandidateMatch } from '../types';

interface DuplicateSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  candidates: CandidateMatch[];
  isSubmitting?: boolean;
}

export const DuplicateSuggestionsModal: React.FC<DuplicateSuggestionsModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  candidates,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-5 bg-amber-50 border-b border-amber-200 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-950">
                Potential Related Records Detected ({candidates.length})
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                Our automated verification engine found existing public records or reports matching this location and category.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-amber-800 hover:bg-amber-200 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Review Candidate Matches Before Submitting:
          </p>

          {candidates.map((cand, idx) => {
            const isProject = cand.target_type === 'project';
            return (
              <div
                key={`${cand.target_type}-${cand.id}-${idx}`}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-civic-300 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isProject ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Official Project: {cand.code}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                        <FileText className="w-3.5 h-3.5" />
                        Citizen Report: {cand.code}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {cand.category_name}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      cand.similarity_score >= 70 ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {cand.similarity_score}% Match
                    </span>
                    {cand.distance_km !== null && cand.distance_km !== undefined && (
                      <span className="block text-xs text-slate-500">
                        {cand.distance_km.toFixed(2)} km away
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="font-semibold text-slate-900 mt-2 text-sm md:text-base">
                  {cand.title}
                </h4>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{cand.location_name}</span>
                </div>

                {/* Match Reasons */}
                <div className="mt-3 pt-2.5 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-1">
                    Deterministic Matching Reasons:
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {cand.match_reasons.map((r, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            If your observation is distinct or reports new unauthorized activity, you may proceed.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel & Edit
            </button>
            <button
              type="button"
              onClick={onContinue}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-civic-600 hover:bg-civic-700 text-white rounded-lg text-sm font-medium transition shadow disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Submitting...' : 'Continue with Submission'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
