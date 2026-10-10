import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Calendar, Building, DollarSign,
  Filter, PlusCircle, ArrowRight, ShieldCheck, SlidersHorizontal, RefreshCw
} from 'lucide-react';
import { Project, Category } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';

interface ExplorePageProps {
  onNavigate: (tab: string, params?: any) => void;
  onSelectProject: (project: Project) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ onNavigate, onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [useProximity, setUseProximity] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
      if (useProximity && userCoords) {
        params.lat = userCoords.lat;
        params.lng = userCoords.lng;
        params.radius_km = radiusKm;
      }

      const data = await api.getProjects(params);
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadInitial() {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (e) {
        console.error(e);
      }
      fetchProjects();
    }
    loadInitial();
  }, [selectedCategory, selectedStatus, useProximity, radiusKm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  const enableLocationSearch = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseProximity(true);
      },
      () => {
        // Fallback to sample coordinates (Vandalur/OMR)
        setUserCoords({ lat: 12.8624, lng: 80.1192 });
        setUseProximity(true);
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Hero Search Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-civic-950 to-slate-900 text-white p-6 sm:p-10 mb-8 shadow-xl overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-civic-500/20 text-civic-300 border border-civic-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Official Infrastructure Registry
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Discover Public Works in Your Neighborhood
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Search official road widening, sewer lines, flyovers, and public utilities. Verify contractor details, schedules, milestones, and citizen audits.
          </p>

          {/* Search Bar Form */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search area, road name (e.g. Vandalur, GST Road), landmark, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-civic-400 shadow-md"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-civic-500 hover:bg-civic-600 font-semibold text-sm transition shadow-md flex items-center justify-center gap-2 text-white"
            >
              <span>Search Projects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                selectedCategory === undefined
                  ? 'bg-civic-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  selectedCategory === c.id
                    ? 'bg-civic-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Status & Proximity Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-civic-500"
              >
                <option value="all">All Statuses</option>
                <option value="Planned">Planned</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Delayed">Delayed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Proximity Toggle */}
            <button
              onClick={useProximity ? () => setUseProximity(false) : enableLocationSearch}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                useProximity
                  ? 'bg-civic-50 border-civic-300 text-civic-700 font-semibold'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-current" />
              <span>{useProximity ? `Within ${radiusKm}km` : 'Nearby Projects'}</span>
            </button>

            {useProximity && (
              <input
                type="range"
                min="2"
                max="30"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-20 accent-civic-600 cursor-pointer"
                title={`Radius: ${radiusKm}km`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Projects List Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>Official Public Works Records</span>
          <span className="text-xs font-normal text-slate-500 px-2 py-0.5 rounded-full bg-slate-200">
            {projects.length} results
          </span>
        </h2>
        <button
          onClick={fetchProjects}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading Indicator */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-civic-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500 font-medium">Querying public works registry...</p>
        </div>
      ) : projects.length === 0 ? (
        /* Explicit Required Fallback Empty State */
        <div className="p-8 sm:p-12 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 text-center max-w-2xl mx-auto my-8">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            No Matching Public Works Record
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed font-medium mb-6">
            "No matching public project record was found. This does not necessarily mean the work is unauthorized. You can submit an observation for review."
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('submit-report')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-semibold text-sm transition shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit an Observation for Review</span>
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(undefined);
                setSelectedStatus('all');
                setUseProximity(false);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-white transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-civic-300 transition cursor-pointer flex flex-col"
            >
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-civic-700 bg-civic-50 px-2 py-0.5 rounded border border-civic-100">
                    {project.project_code}
                  </span>
                  <StatusBadge status={project.status} size="sm" />
                </div>

                <h3 className="font-bold text-slate-900 text-base group-hover:text-civic-600 transition line-clamp-2">
                  {project.title}
                </h3>

                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed flex-1">
                  {project.description}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{project.location_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{project.department_name || 'Municipal Works'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    {project.budget && (
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-600" />
                        <span>₹{(project.budget / 100000).toFixed(1)} Lakhs</span>
                      </span>
                    )}
                    {project.planned_completion_date && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>Est: {project.planned_completion_date}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <CategoryBadge name={project.category_name} size="sm" />
                <span className="text-xs font-semibold text-civic-600 group-hover:translate-x-1 transition flex items-center gap-1">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
