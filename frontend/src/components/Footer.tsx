import React from 'react';
import { ShieldCheck, Info, FileText } from 'lucide-react';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-2">
              <ShieldCheck className="w-5 h-5 text-civic-400" />
              <span>CivicLens</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              A transparent civic technology platform connecting citizens with municipal public works data, community observation verification, and official oversight.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-civic-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Demonstration & Simulation Environment:</strong> Public works records and review workflows in this application are realistic simulations designed for evaluation of civic transparency algorithms.
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Sections</h4>
            <ul className="text-xs space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('explore')}
                  className="hover:text-white transition-colors text-left"
                >
                  Explore Projects Directory
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('map')}
                  className="hover:text-white transition-colors text-left"
                >
                  Interactive Spatial Map
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('feed')}
                  className="hover:text-white transition-colors text-left"
                >
                  Civic Verification Feed
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('my-reports')}
                  className="hover:text-white transition-colors text-left"
                >
                  Citizen Case Tracker
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('review')}
                  className="hover:text-white transition-colors text-left"
                >
                  Reviewer Investigation Queue
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Platform Integrity</h4>
            <ul className="text-xs space-y-2">
              <li className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Deterministic Duplicate Matching</span>
              </li>
              <li className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Strict Immutable Audit Logging</span>
              </li>
              <li className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Privacy-Preserving Citizen Aliases</span>
              </li>
              <li className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Single-Engagement Constraint</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/80 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div>&copy; 2026 CivicLens. Public Works Transparency & Verification Platform.</div>
          <div className="mt-2 sm:mt-0 flex gap-4">
            <span>Terms of Service</span>
            <span>Privacy Guidelines</span>
            <span>Open Civic Data Standard</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
