import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ExplorePage } from './pages/ExplorePage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { MapPage } from './pages/MapPage';
import { FeedPage } from './pages/FeedPage';
import { SubmitReportPage } from './pages/SubmitReportPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { ReviewDashboard } from './pages/ReviewDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { Project } from './types';
import { useAuth } from './context/AuthContext';

export const App: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('explore');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [initialCaseId, setInitialCaseId] = useState<string | null>(null);

  // Sync hash routing on mount and hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('project/')) {
        const id = parseInt(hash.split('/')[1], 10);
        if (!isNaN(id)) {
          setSelectedProjectId(id);
          setCurrentTab('project-detail');
          return;
        }
      }

      if (['explore', 'map', 'feed', 'my-reports', 'submit-report', 'review', 'admin', 'profile'].includes(hash)) {
        setCurrentTab(hash);
        setSelectedProjectId(null);
      } else if (!hash) {
        setCurrentTab('explore');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (tab: string, params?: any) => {
    if (tab === 'project-detail') {
      const pId = params?.projectId || (typeof params === 'number' ? params : null);
      if (pId) {
        setSelectedProjectId(pId);
        setCurrentTab('project-detail');
        window.location.hash = `project/${pId}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (params?.caseId) {
      setInitialCaseId(params.caseId);
    } else {
      setInitialCaseId(null);
    }

    setSelectedProjectId(null);
    setCurrentTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProject = (projectOrId: Project | number) => {
    const pId = typeof projectOrId === 'number' ? projectOrId : projectOrId.id;
    setSelectedProjectId(pId);
    setCurrentTab('project-detail');
    window.location.hash = `project/${pId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromProject = () => {
    setSelectedProjectId(null);
    setCurrentTab('explore');
    window.location.hash = 'explore';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // RBAC safety check for protected views
  const isReviewer = user?.role === 'reviewer' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased font-sans">
      <Navbar currentTab={currentTab} onNavigate={handleNavigate} />

      <main className="flex-1 pb-16">
        {currentTab === 'project-detail' && selectedProjectId ? (
          <ProjectDetailPage
            projectId={selectedProjectId}
            onBack={handleBackFromProject}
            onSelectReport={() => handleNavigate('feed')}
          />
        ) : currentTab === 'explore' ? (
          <ExplorePage
            onNavigate={handleNavigate}
            onSelectProject={handleSelectProject}
          />
        ) : currentTab === 'map' ? (
          <MapPage
            onSelectProject={handleSelectProject}
            onSelectReport={() => handleNavigate('feed')}
          />
        ) : currentTab === 'feed' ? (
          <FeedPage
            onSelectProject={(id) => handleSelectProject(id)}
            onSelectReport={() => handleNavigate('feed')}
          />
        ) : currentTab === 'submit-report' ? (
          <SubmitReportPage onNavigate={handleNavigate} />
        ) : currentTab === 'my-reports' ? (
          <MyReportsPage
            onNavigate={handleNavigate}
            onSelectProject={(id) => handleSelectProject(id)}
            initialCaseId={initialCaseId}
          />
        ) : currentTab === 'review' ? (
          isReviewer ? (
            <ReviewDashboard
              onSelectProject={(id) => handleSelectProject(id)}
              initialCaseId={initialCaseId}
            />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
              <div className="bg-amber-50 border border-amber-200 p-8 rounded-xl">
                <h2 className="text-xl font-bold text-amber-900 mb-2">Reviewer Authorization Required</h2>
                <p className="text-sm text-amber-700 mb-6">
                  The Review Dashboard is restricted to authorized municipal reviewers. Use the role switcher in the navigation bar to switch to <strong>Priya Nair (Reviewer)</strong>.
                </p>
                <button
                  onClick={() => handleNavigate('profile')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  Go to Role Switcher
                </button>
              </div>
            </div>
          )
        ) : currentTab === 'admin' ? (
          isAdmin ? (
            <AdminDashboard />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
              <div className="bg-purple-50 border border-purple-200 p-8 rounded-xl">
                <h2 className="text-xl font-bold text-purple-900 mb-2">System Administrator Authorization Required</h2>
                <p className="text-sm text-purple-700 mb-6">
                  Administrative tools are restricted to system administrators. Use the role switcher to switch to <strong>Civic Admin</strong>.
                </p>
                <button
                  onClick={() => handleNavigate('profile')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  Go to Role Switcher
                </button>
              </div>
            </div>
          )
        ) : currentTab === 'profile' ? (
          <ProfilePage />
        ) : (
          <ExplorePage
            onNavigate={handleNavigate}
            onSelectProject={handleSelectProject}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
};
