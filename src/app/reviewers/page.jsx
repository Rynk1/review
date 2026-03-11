'use client';

import { useState, useEffect } from 'react';
import {
  GraduationCap, LogOut, Users, Search, Filter, BookOpen,
  CheckCircle, XCircle, AlertCircle, User, RefreshCw, ChevronRight,
  Brain, Target, Clock, BarChart3
} from 'lucide-react';

function NavBar({ user, tenant, onLogout }) {
  return (
    <nav className="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="navbar-brand">
            <div className="navbar-icon">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-slate-900">Grant Review System</span>
              <span className="ml-2 text-sm text-slate-500">{tenant?.name}</span>
            </div>
          </div>
          <div className="navbar-user">
            <div className="navbar-avatar">
              {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="navbar-info hidden sm:block">
              <div className="navbar-name">{user?.full_name || user?.email}</div>
              <div className="navbar-role">{user?.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="ml-3 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function WorkloadBar({ current, limit }) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const getColor = () => {
    if (pct >= 80) return 'bg-rose-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-200 rounded-full h-1.5">
        <div className={`${getColor()} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 flex-shrink-0">{current}/{limit}</span>
    </div>
  );
}

export default function ReviewersPage() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [searchExpertise, setSearchExpertise] = useState('');
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedTenant = localStorage.getItem('auth_tenant');

    if (!storedToken || !storedUser) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (!['manager', 'admin'].includes(parsedUser.role)) {
      window.location.href = '/';
      return;
    }

    setToken(storedToken);
    setUser(parsedUser);
    setTenant(storedTenant ? JSON.parse(storedTenant) : null);
    fetchReviewers(storedToken);
  }, []);

  const fetchReviewers = async (authToken, expertise = '', available = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (expertise) params.set('expertise', expertise);
      if (available) params.set('available', 'true');

      const res = await fetch(`/api/v1/reviewers?${params}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/login'; return; }
        throw new Error('Failed to fetch reviewers');
      }
      const data = await res.json();
      setReviewers(data.reviewers || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tenant');
    window.location.href = '/login';
  };

  const handleSearch = () => {
    fetchReviewers(token, searchExpertise, filterAvailable);
  };

  if (loading && !reviewers.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl animate-pulse-subtle" />
            <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          </div>
          <p className="text-slate-500">Loading reviewers...</p>
        </div>
      </div>
    );
  }

  const availableCount = reviewers.filter(r => r.current_assignments < r.workload_limit).length;
  const optInCount = reviewers.filter(r => r.opt_in).length;

  return (
    <div className="min-h-screen pb-12">
      <NavBar user={user} tenant={tenant} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Reviewer Pool</h1>
          <p className="text-slate-500 mt-1">Browse and manage reviewers in your institution</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="tabs mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <a href="/dashboard" className="tab">
            <Users className="h-4 w-4" />
            Proposals
          </a>
          <a href="/reviewers" className="tab active">
            <BookOpen className="h-4 w-4" />
            Reviewers
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Reviewers', value: total, icon: Users, color: 'indigo' },
            { label: 'Available', value: availableCount, icon: CheckCircle, color: 'emerald' },
            { label: 'Opted In', value: optInCount, icon: User, color: 'blue' },
          ].map((stat, index) => (
            <div 
              key={stat.label} 
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  ${stat.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : ''}
                  ${stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : ''}
                  ${stat.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                `}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <span className={`text-2xl font-bold text-slate-900`}>{stat.value}</span>
              </div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="card p-4 mb-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by expertise (e.g., machine learning, genomics)..."
                value={searchExpertise}
                onChange={(e) => setSearchExpertise(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input pl-10"
              />
            </div>
            <label className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={filterAvailable}
                onChange={(e) => setFilterAvailable(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Available only</span>
            </label>
            <button
              onClick={handleSearch}
              className="btn-primary"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button
              onClick={() => fetchReviewers(token)}
              className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Reviewers Grid */}
        {reviewers.length === 0 ? (
          <div className="card p-16 text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-100 mb-6">
              <Users className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No reviewers found</h3>
            <p className="text-slate-500">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewers.map((reviewer, index) => (
              <div 
                key={reviewer.id} 
                className="card p-5 animate-slide-up hover:shadow-card-hover"
                style={{ animationDelay: `${0.35 + index * 0.02}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold">
                      {(reviewer.full_name || reviewer.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{reviewer.full_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{reviewer.email}</div>
                    </div>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                    reviewer.opt_in ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {reviewer.opt_in ? 'Active' : 'Opted Out'}
                  </span>
                </div>

                {reviewer.orcid && (
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    ORCID: {reviewer.orcid}
                  </div>
                )}

                {/* Expertise Tags */}
                {reviewer.expertise?.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Brain className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">Expertise</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {reviewer.expertise.slice(0, 4).map(exp => (
                        <span key={exp} className="inline-flex px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-full">
                          {exp}
                        </span>
                      ))}
                      {reviewer.expertise.length > 4 && (
                        <span className="inline-flex px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">
                          +{reviewer.expertise.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Areas */}
                {reviewer.areas && Object.values(reviewer.areas).some(arr => arr?.length > 0) && (
                  <div className="mb-4 text-xs text-slate-500">
                    {Object.entries(reviewer.areas).map(([key, items]) =>
                      items?.length > 0 ? (
                        <div key={key} className="mb-1.5">
                          <span className="font-medium capitalize">{key}: </span>
                          {items.slice(0, 2).join(', ')}
                          {items.length > 2 && ` +${items.length - 2}`}
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {/* Workload */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Workload
                    </span>
                    <span className={`text-xs font-medium ${
                      reviewer.current_assignments >= reviewer.workload_limit
                        ? 'text-rose-600'
                        : reviewer.current_assignments >= reviewer.workload_limit * 0.8
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      {reviewer.current_assignments >= reviewer.workload_limit 
                        ? 'Full' 
                        : reviewer.current_assignments >= reviewer.workload_limit * 0.8
                          ? 'Near Capacity'
                          : 'Available'
                      }
                    </span>
                  </div>
                  <WorkloadBar
                    current={reviewer.current_assignments}
                    limit={reviewer.workload_limit}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
