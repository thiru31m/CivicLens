import React from 'react';
import { ShieldCheck, Clock, HelpCircle, Link2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  switch (status) {
    // Report statuses
    case 'Awaiting Review':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
          <Clock className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Awaiting Review
        </span>
      );

    case 'Under Review':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <Clock className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Under Review
        </span>
      );

    case 'More Information Requested':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
          <HelpCircle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          More Information Requested
        </span>
      );

    case 'Linked to Existing Project':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 ${sizeClasses}`}>
          <Link2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Linked to Existing Project
        </span>
      );

    case 'Official Record Verified':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <ShieldCheck className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Official Record Verified
        </span>
      );

    case 'Referred to Another Department':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>
          <Link2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Referred to Another Dept
        </span>
      );

    case 'Closed — Outcome Explained':
    case 'Closed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}>
          <XCircle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Closed — Outcome Explained
        </span>
      );

    // Project statuses
    case 'Planned':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses}`}>
          <Clock className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Planned
        </span>
      );

    case 'Ongoing':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Ongoing Works
        </span>
      );

    case 'Delayed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
          <AlertTriangle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Delayed
        </span>
      );

    case 'Completed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 ${sizeClasses}`}>
          <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Completed
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};

export const VerificationNoticeBadge: React.FC<{ status: string }> = ({ status }) => {
  const isVerified = status === 'Official Record Verified' || status === 'Linked to Existing Project';

  if (isVerified) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Official Government Verified Record</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
      <AlertTriangle className="w-4 h-4 text-amber-600" />
      <span>Unverified Citizen Observation — Pending Official Review</span>
    </div>
  );
};
