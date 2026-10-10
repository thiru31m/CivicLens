import React from 'react';
import { Navigation, Droplets, Zap, Trees, Trash2, Building2 } from 'lucide-react';

interface CategoryBadgeProps {
  name?: string | null;
  size?: 'sm' | 'md';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ name = 'General', size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  const getCategoryDetails = (catName: string) => {
    switch (catName.toLowerCase()) {
      case 'roads & bridges':
      case 'roads':
        return {
          icon: <Navigation className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          classes: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'water & sewage':
      case 'water':
        return {
          icon: <Droplets className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          classes: 'bg-sky-50 text-sky-800 border-sky-200',
        };
      case 'electricity & lighting':
      case 'electricity':
      case 'power':
        return {
          icon: <Zap className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          classes: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        };
      case 'parks & recreation':
      case 'parks':
        return {
          icon: <Trees className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'sanitation & waste':
      case 'sanitation':
        return {
          icon: <Trash2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          classes: 'bg-stone-50 text-stone-800 border-stone-200',
        };
      case 'public buildings & transit':
      case 'transit':
      case 'buildings':
        return {
          icon: <Building2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          classes: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };
      default:
        return {
          icon: <Building2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          classes: 'bg-slate-50 text-slate-800 border-slate-200',
        };
    }
  };

  const { icon, classes } = getCategoryDetails(name || 'General');

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${classes} ${sizeClasses}`}>
      {icon}
      <span>{name || 'General Infrastructure'}</span>
    </span>
  );
};
