import React, { useState, useEffect } from 'react';
import {
  MapPin, ShieldCheck, AlertTriangle, Layers, Filter,
  Building, ChevronRight, Search
} from 'lucide-react';
import { Project, CitizenReport, Category } from '../types';
import { api } from '../services/api';
import { LeafletMap } from '../components/LeafletMap';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';

interface MapPageProps {
  onSelectProject: (project: Project) => void;
  onSelectReport: (reportId: number) => void;
}

export const MapPage: React.FC<MapPageProps> = ({ onSelectProject, onSelectReport }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Layer & filter controls
  const [showProjects, setShowProjects] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'projects' | 'reports'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cats, prjs, reps] = await Promise.all([
          api.getCategories(),
          api.getProjects(),
          api.getFeed({ limit: 50 } as any),
        ]);
        setCategories(cats);
        setProjects(prjs);
        setReports(reps);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter items
  const filteredProjects = projects.filter((p) => {
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (searchFilter && !p.title.toLowerCase().includes(searchFilter.toLowerCase()) && !p.location_name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  const filteredReports = reports.filter((r) => {
    if (selectedCategory && r.category_id !== selectedCategory) return false;
    if (searchFilter && !r.title.toLowerCase().includes(searchFilter.toLowerCase()) && !r.location_name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Header & Layer Toggles */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-civic-600" />
              <span>Spatial Infrastructure Map</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualizing registered public works and unverified citizen observations across neighborhoods.
            </p>
          </div>

          {/* Layer Checkboxes */}
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={showProjects}
                onChange={(e) => setShowProjects(e.target.checked)}
                className="rounded text-civic-600 focus:ring-civic-500"
              />
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-civic-600"></span>
                Official Projects ({filteredProjects.length})
              </span>
            </label>

            <span className="text-slate-300">|</span>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={showReports}
                onChange={(e) => setShowReports(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Citizen Reports ({filteredReports.length})
              </span>
            </label>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by road, landmark, or keyword..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-civic-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                selectedCategory === undefined ? 'bg-civic-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                  selectedCategory === c.id ? 'bg-civic-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map + Side Drawer Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Map Area */}
        <div className="lg:col-span-2 h-full min-h-[400px]">
          <LeafletMap
            projects={filteredProjects}
            reports={filteredReports}
            showProjectsLayer={showProjects}
            showReportsLayer={showReports}
            onProjectClick={(p) => onSelectProject(p)}
            onReportClick={(r) => onSelectReport(r.id)}
            height="100%"
          />
        </div>

        {/* Side List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col shadow-xs min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2 py-1 rounded-md transition ${activeTab === 'all' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'}`}
              >
                All ({filteredProjects.length + filteredReports.length})
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-2 py-1 rounded-md transition ${activeTab === 'projects' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'}`}
              >
                Projects ({filteredProjects.length})
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-2 py-1 rounded-md transition ${activeTab === 'reports' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'}`}
              >
                Reports ({filteredReports.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pt-2 space-y-2">
            {/* Show Projects */}
            {(activeTab === 'all' || activeTab === 'projects') &&
              filteredProjects.map((p) => (
                <div
                  key={`p-${p.id}`}
                  onClick={() => onSelectProject(p)}
                  className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] font-bold text-civic-700 bg-civic-50 px-1.5 py-0.5 rounded">
                      {p.project_code}
                    </span>
                    <StatusBadge status={p.status} size="sm" />
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 line-clamp-1">{p.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{p.location_name}</span>
                  </p>
                </div>
              ))}

            {/* Show Reports */}
            {(activeTab === 'all' || activeTab === 'reports') &&
              filteredReports.map((r) => (
                <div
                  key={`r-${r.id}`}
                  onClick={() => onSelectReport(r.id)}
                  className="p-3 rounded-lg hover:bg-amber-50/50 cursor-pointer transition border border-transparent hover:border-amber-200"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      {r.case_id}
                    </span>
                    <StatusBadge status={r.status} size="sm" />
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 line-clamp-1">{r.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{r.location_name}</span>
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
