'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, LogOut, FileText, Users, CheckSquare, AlertTriangle,
  TrendingUp, Clock, RefreshCw, UserCheck, X, Star, Search, Filter, Plus,
  ArrowUpRight, ArrowDownRight, BarChart3, CheckCircle2, XCircle, FileSearch
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

function StatCard({ icon: Icon, label, value, color, trend, subtext, delay = 0 }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', gradient: 'from-rose-500 to-red-600' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', gradient: 'from-slate-500 to-slate-600' },
  };
  
  const colors = colorClasses[color] || colorClasses.blue;
  
  return (
    <div 
      className="stat-card group animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`stat-icon ${colors.bg}`}>
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend > 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label flex items-center gap-1.5">
        {label}
        {subtext && <span className="text-slate-400">({subtext})</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    draft: { color: 'bg-slate-100 text-slate-700', label: 'Draft' },
    submitted: { color: 'bg-blue-100 text-blue-700', label: 'Submitted' },
    under_review: { color: 'bg-amber-100 text-amber-700', label: 'Under Review' },
    accepted: { color: 'bg-emerald-100 text-emerald-700', label: 'Accepted' },
    rejected: { color: 'bg-rose-100 text-rose-700', label: 'Rejected' },
    withdrawn: { color: 'bg-slate-100 text-slate-500', label: 'Withdrawn' },
  };
  const { color, label } = config[status] || config.draft;
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
      {label}
    </span>
  );
}

function MatchingModal({ proposal, onClose, token }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/proposals/${proposal.id}/matching`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [proposal.id, token]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const generateMatches = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/proposals/${proposal.id}/matching`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ top_n: 10, force_refresh: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatches(data.matches || []);
    } catch (err) {
      setError(err.message || 'Failed to generate matches');
    } finally {
      setGenerating(false);
    }
  };

  const assignReviewers = async () => {
    if (selectedReviewers.length === 0) return;
    setAssigning(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/proposals/${proposal.id}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewer_ids: selectedReviewers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssignSuccess(`Successfully assigned ${data.assignments?.length || 0} reviewer(s)`);
      setSelectedReviewers([]);
    } catch (err) {
      setError(err.message || 'Failed to assign reviewers');
    } finally {
      setAssigning(false);
    }
  };

  const toggleReviewer = (reviewerId) => {
    setSelectedReviewers(prev =>
      prev.includes(reviewerId)
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-3xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reviewer Matching</h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate max-w-md">{proposal.title}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 max-h-[60vh]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {assignSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {assignSuccess}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">
              {matches.length > 0 ? `${matches.length} Candidate Reviewers` : 'No matches yet'}
            </h3>
            <button
              onClick={generateMatches}
              disabled={generating}
              className="btn-primary py-2 text-sm"
            >
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Star className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate Matches'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                <FileSearch className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500">No matches generated yet.</p>
              <p className="text-sm text-slate-400 mt-1">Click "Generate Matches" to find suitable reviewers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match, index) => (
                <div
                  key={match.reviewer_id}
                  onClick={() => toggleReviewer(match.reviewer_id)}
                  className={`
                    p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 animate-slide-up
                    ${selectedReviewers.includes(match.reviewer_id)
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm shadow-indigo-500/10'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }
                  `}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{match.reviewer_name}</span>
                        <span className="text-xs text-slate-500">{match.reviewer_email}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(match.expertise || []).slice(0, 4).map(exp => (
                          <span key={exp} className="inline-flex px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                            {exp}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {match.current_assignments}/{match.workload_limit}
                        </span>
                        {match.reasoning?.relevance_factors?.keyword_matches?.length > 0 && (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {match.reasoning.relevance_factors.keyword_matches.length} keyword matches
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-indigo-600">
                        {Math.round(match.final_score * 100)}%
                      </div>
                      <div className="text-xs text-slate-400">match score</div>
                      <div className="mt-2 space-y-0.5 text-xs">
                        <div className="text-slate-500">Rel: {Math.round(match.relevance_score * 100)}%</div>
                        <div className={match.conflict_score > 0.3 ? 'text-rose-500' : 'text-slate-500'}>
                          Conf: {Math.round(match.conflict_score * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedReviewers.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 font-medium">
                {selectedReviewers.length} reviewer(s) selected
              </span>
              <button
                onClick={assignReviewers}
                disabled={assigning}
                className="btn-primary"
              >
                {assigning ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                {assigning ? 'Assigning...' : 'Assign Selected Reviewers'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [token, setToken] = useState('');

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
    fetchData(storedToken);
  }, []);

  const fetchData = async (authToken) => {
    try {
      const res = await fetch('/api/v1/proposals?limit=50', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/login'; return; }
        throw new Error('Failed to fetch proposals');
      }
      const data = await res.json();
      setProposals(data.proposals || []);

      const allProposals = data.proposals || [];
      setStats({
        total: data.total || 0,
        submitted: allProposals.filter(p => p.status === 'submitted').length,
        under_review: allProposals.filter(p => p.status === 'under_review').length,
        accepted: allProposals.filter(p => p.status === 'accepted').length,
        rejected: allProposals.filter(p => p.status === 'rejected').length,
        draft: allProposals.filter(p => p.status === 'draft').length,
      });
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

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/v1/proposals?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setProposals(data.proposals || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (proposalId, newStatus) => {
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchData(token);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && !proposals.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl animate-pulse-subtle" />
            <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          </div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <NavBar user={user} tenant={tenant} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage grant proposals and reviewer assignments</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={FileText} label="Total Proposals" value={stats.total || 0} color="indigo" delay={0} />
          <StatCard icon={Clock} label="Submitted" value={stats.submitted || 0} color="blue" delay={0.05} />
          <StatCard icon={TrendingUp} label="Under Review" value={stats.under_review || 0} color="amber" delay={0.1} />
          <StatCard icon={CheckSquare} label="Accepted" value={stats.accepted || 0} color="emerald" delay={0.15} />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejected || 0} color="rose" delay={0.2} />
          <StatCard icon={FileText} label="Drafts" value={stats.draft || 0} color="slate" delay={0.25} />
        </div>

        {/* Navigation Tabs */}
        <div className="tabs mb-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <a href="/dashboard" className="tab active">
            <FileText className="h-4 w-4" />
            Proposals
          </a>
          <a href="/reviewers" className="tab">
            <Users className="h-4 w-4" />
            Reviewers
          </a>
        </div>

        {/* Search & Filter */}
        <div className="card p-4 mb-6 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search proposals by title, abstract, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select sm:w-48"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={handleSearch}
              className="btn-primary"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Proposals Table */}
        <div className="table-container animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Grant Proposals ({proposals.length})</h2>
            <button
              onClick={() => fetchData(token)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {proposals.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500">No proposals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Proposal</th>
                    <th>Applicant</th>
                    <th>Status</th>
                    <th>Reviews</th>
                    <th>Submitted</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal, index) => (
                    <tr 
                      key={proposal.id} 
                      className="animate-fade-in"
                      style={{ animationDelay: `${0.45 + index * 0.02}s` }}
                    >
                      <td>
                        <div className="max-w-xs">
                          <div className="font-medium text-slate-900 text-sm truncate">{proposal.title}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(proposal.keywords || []).slice(0, 3).map(kw => (
                              <span key={kw} className="inline-flex px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-full">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-slate-900">{proposal.applicant_name}</div>
                        <div className="text-xs text-slate-500">{proposal.applicant_email}</div>
                      </td>
                      <td>
                        <StatusBadge status={proposal.status} />
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <CheckSquare className="h-4 w-4 text-slate-400" />
                          {proposal.review_count || 0}
                        </div>
                      </td>
                      <td className="text-sm text-slate-500">
                        {proposal.submitted_at
                          ? new Date(proposal.submitted_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {['submitted', 'under_review'].includes(proposal.status) && (
                            <button
                              onClick={() => setSelectedProposal(proposal)}
                              className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <Users className="h-3 w-3" />
                              Match
                            </button>
                          )}
                          {proposal.status === 'under_review' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(proposal.id, 'accepted')}
                                className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleStatusChange(proposal.id, 'rejected')}
                                className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedProposal && (
        <MatchingModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          token={token}
        />
      )}
    </div>
  );
}
