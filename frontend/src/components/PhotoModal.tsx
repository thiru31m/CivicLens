import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  caption?: string | null;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  caption,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-4xl w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm md:text-base">{title}</h3>
            {caption && <p className="text-xs text-slate-500 mt-0.5">{caption}</p>}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
              title="Open full size"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-2 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-auto">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[70vh] w-auto object-contain rounded"
          />
        </div>
      </div>
    </div>
  );
};
