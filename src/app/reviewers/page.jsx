'use client';

import { useState, useEffect } from 'react';
import {
  Users, Search, Filter, BookOpen, CheckCircle, XCircle, AlertCircle, 
  User, RefreshCw, ChevronRight, Brain, Target, Clock, BarChart3,
  Mail, ExternalLink, Award, TrendingUp, Grid, List
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard, LoadingSpinner, Alert, EmptyState, Card, Badge, WorkloadBar, Avatar } from '@/components/ui';

function ReviewerDetailModal({ reviewer, onClose, token }) {
  if (!reviewer) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Reviewer Profile</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 max-h-[65vh] space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Avatar name={reviewer.full_name} size="xl" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900">{reviewer.full_name || 'Unknown'}</h3>
              <p className="text-sm text-slate-500">{reviewer.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge color={reviewer.opt_in ? 'emerald' : 'slate'}>
                  {reviewer.opt_in ? 'Active Reviewer' : 'Opted Out'}
                </Badge>
                {reviewer.orcid && (
                  <a 
                    href={`https://orcid.org/${reviewer.orcid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    ORCID
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{reviewer.current_assignments}</div>
              <div className="text-xs text-slate-500">Current</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{reviewer.completed_reviews || 0}</div>
              <div className="text-xs text-slate-500">Completed</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{reviewer.workload_limit}</div>
              <div className="text-xs text-slate-500">Limit</div>
            </Card>
          </div>

          {/* Workload */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Workload</h4>
            <WorkloadBar current={reviewer.current_assignments} limit={reviewer.workload_limit} />
          </div>

          {/* Expertise */}
          {reviewer.expertise?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-500" />
                Expertise Areas
              </h4>
              <div className="flex flex-wrap gap-2">
                {reviewer.expertise.map(exp => (
                  <Badge key={exp} color="indigo">{exp}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Research Areas */}
          {reviewer.areas && Object.values(reviewer.areas).some(arr => arr?.length > 0) && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                Research Areas
              </h4>
              <div className="space-y-3">
                {Object.entries(reviewer.areas).map(([key, items]) =>
                  items?.length > 0 ? (
                    <div key={key}>
                      <div className="text-xs font-medium text-slate-500 uppercase mb-1.5">{key}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map(item => (
                          <Badge key={item} color="slate" size="sm">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Publications */}
          {reviewer.publications?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-500" />
                Recent Publications
              </h4>
              <div className="space-y-2">
                {reviewer.publications.slice(0, 5).map((pub, i) => (
                  <div key={i} className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                    {pub}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
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
  const [filterOptIn, setFilterOptIn] = useState(false);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedReviewer, setSelectedReviewer] = useState(null);

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

  const fetchReviewers = async (authToken, expertise = '', available = false, optIn = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (expertise) params.set('expertise', expertise);
      if (available) params.set('available', 'true');
      if (optIn) params.set('opt_in', 'true');

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
    fetchReviewers(token, searchExpertise, filterAvailable, filterOptIn);
  };

  const clearFilters = () => {
    setSearchExpertise('');
    setFilterAvailable(false);
    setFilterOptIn(false);
    fetchReviewers(token);
  };

  const hasActiveFilters = searchExpertise || filterAvailable || filterOptIn;

  if (loading && !reviewers.length) {
    return (
      <DashboardLayout requiredRoles={['manager', 'admin']}>
        <LoadingSpinner text="Loading reviewers..." />
      </DashboardLayout>
    );
  }

  const availableCount = reviewers.filter(r => r.current_assignments < r.workload_limit).length;
  const optInCount = reviewers.filter(r => r.opt_in).length;
  const activeReviewers = reviewers.filter(r => r.opt_in && r.current_assignments < r.workload_limit).length;

  return (
    <DashboardLayout requiredRoles={['manager', 'admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reviewer Pool</h1>
            <p className="text-slate-500 mt-1">Browse and manage reviewers in your institution</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => fetchReviewers(token, searchExpertise, filterAvailable, filterOptIn)}
              className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <Alert type="error" message={error} onDismiss={() => setError('')} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Reviewers" value={total} color="indigo" delay={0} />
          <StatCard icon={CheckCircle} label="Available" value={availableCount} color="emerald" delay={0.05} />
          <StatCard icon={User} label="Opted In" value={optInCount} color="blue" delay={0.1} />
          <StatCard icon={TrendingUp} label="Active" value={activeReviewers} color="purple" delay={0.15} />
        </div>

        {/* Search & Filter */}
        <Card className="p-4">
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
              <span className="text-sm text-slate-700">Available</span>
            </label>
            <label className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={filterOptIn}
                onChange={(e) => setFilterOptIn(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Opted In</span>
            </label>
            <button
              onClick={handleSearch}
              className="btn-primary"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn-secondary"
              >
                Clear
              </button>
            )}
          </div>
        </Card>

        {/* Reviewers Grid/List */}
        {loading ? (
          <LoadingSpinner />
        ) : reviewers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No reviewers found"
            description={hasActiveFilters ? "Try adjusting your search filters" : "No reviewers have registered yet"}
            action={hasActiveFilters && (
              <button onClick={clearFilters} className="btn-primary">
                Clear Filters
              </button>
            )}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewers.map((reviewer, index) => (
              <Card 
                key={reviewer.id} 
                className="p-5 hover:shadow-md transition-all duration-300 cursor-pointer animate-slide-up"
                hover
                style={{ animationDelay: `${0.2 + index * 0.02}s` }}
                onClick={() => setSelectedReviewer(reviewer)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={reviewer.full_name} />
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{reviewer.full_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{reviewer.email}</div>
                    </div>
                  </div>
                  <Badge color={reviewer.opt_in ? 'emerald' : 'slate'}>
                    {reviewer.opt_in ? 'Active' : 'Opted Out'}
                  </Badge>
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
                        <Badge key={exp} color="indigo" size="sm">{exp}</Badge>
                      ))}
                      {reviewer.expertise.length > 4 && (
                        <Badge color="slate" size="sm">+{reviewer.expertise.length - 4} more</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Workload */}
                <div className="pt-3 border-t border-slate-100">
                  <WorkloadBar current={reviewer.current_assignments} limit={reviewer.workload_limit} />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reviewer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Expertise</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Workload</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviewers.map((reviewer, index) => (
                  <tr 
                    key={reviewer.id} 
                    className="hover:bg-slate-50 transition-colors animate-slide-up"
                    style={{ animationDelay: `${0.2 + index * 0.02}s` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={reviewer.full_name} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">{reviewer.full_name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{reviewer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {reviewer.expertise?.slice(0, 2).map(exp => (
                          <Badge key={exp} color="indigo" size="sm">{exp}</Badge>
                        ))}
                        {reviewer.expertise?.length > 2 && (
                          <Badge color="slate" size="sm">+{reviewer.expertise.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={reviewer.opt_in ? 'emerald' : 'slate'}>
                        {reviewer.opt_in ? 'Active' : 'Opted Out'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <WorkloadBar current={reviewer.current_assignments} limit={reviewer.workload_limit} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedReviewer(reviewer)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Reviewer Detail Modal */}
      {selectedReviewer && (
        <ReviewerDetailModal
          reviewer={selectedReviewer}
          onClose={() => setSelectedReviewer(null)}
          token={token}
        />
      )}
    </DashboardLayout>
  );
}
