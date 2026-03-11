'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Users, CheckSquare, AlertTriangle,
  TrendingUp, Clock, RefreshCw, UserCheck, X, Star, Search, Filter, Plus,
  ArrowUpRight, ArrowDownRight, BarChart3, CheckCircle2, XCircle, FileSearch,
  Calendar, MoreVertical, Download, Upload, FilterX, Mail, Eye, Edit, Send
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard, StatusBadge, LoadingSpinner, Alert, EmptyState, Card, Badge } from '@/components/ui';

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
            <Alert type="error" message={error} onDismiss={() => setError('')} />
          )}
          {assignSuccess && (
            <Alert type="success" message={assignSuccess} onDismiss={() => setAssignSuccess('')} />
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
            <LoadingSpinner />
          ) : matches.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No matches generated yet"
              description="Click 'Generate Matches' to find suitable reviewers based on expertise and availability."
            />
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
                          <Badge key={exp} color="indigo">{exp}</Badge>
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

function ProposalActions({ proposal, token, onRefresh }) {
  const [showMenu, setShowMenu] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/v1/proposals/${proposal.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={updating}
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        {updating ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
        ) : (
          <MoreVertical className="h-4 w-4" />
        )}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20 animate-fade-in">
            {proposal.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('submitted')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Send className="h-4 w-4 text-blue-500" />
                Submit Proposal
              </button>
            )}
            {['submitted', 'under_review'].includes(proposal.status) && (
              <>
                <button
                  onClick={() => handleStatusChange('accepted')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Accept Proposal
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <XCircle className="h-4 w-4 text-rose-500" />
                  Reject Proposal
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [token, setToken] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
      window.location.href = '/login';
      return;
    }
    setToken(storedToken);
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    fetchData(token);
  };

  const hasActiveFilters = searchQuery || statusFilter;

  if (loading && !proposals.length) {
    return (
      <DashboardLayout requiredRoles={['manager', 'admin']}>
        <LoadingSpinner text="Loading dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requiredRoles={['manager', 'admin']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage grant proposals and reviewer assignments</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(token)}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={FileText} label="Total Proposals" value={stats.total || 0} color="indigo" delay={0} />
          <StatCard icon={Clock} label="Submitted" value={stats.submitted || 0} color="blue" delay={0.05} />
          <StatCard icon={TrendingUp} label="Under Review" value={stats.under_review || 0} color="amber" delay={0.1} />
          <StatCard icon={CheckSquare} label="Accepted" value={stats.accepted || 0} color="emerald" delay={0.15} />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejected || 0} color="rose" delay={0.2} />
          <StatCard icon={FileText} label="Drafts" value={stats.draft || 0} color="slate" delay={0.25} />
        </div>

        {/* Search & Filter */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search proposals by title, keyword, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select w-full sm:w-40"
            >
              <option value="">All Status</option>
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
              Search
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn-secondary"
              >
                <FilterX className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </Card>

        {/* Proposals Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : proposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proposals found"
            description={hasActiveFilters ? "Try adjusting your search or filters" : "No proposals have been submitted yet"}
            action={hasActiveFilters && (
              <button onClick={clearFilters} className="btn-primary">
                Clear Filters
              </button>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposals.map((proposal, index) => (
              <Card 
                key={proposal.id} 
                className="p-5 hover:shadow-md transition-all duration-300 animate-slide-up"
                hover
                style={{ animationDelay: `${0.3 + index * 0.03}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <StatusBadge status={proposal.status} />
                  <ProposalActions proposal={proposal} token={token} onRefresh={() => fetchData(token)} />
                </div>
                
                <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{proposal.title}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{proposal.abstract}</p>
                
                {proposal.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {proposal.keywords.slice(0, 3).map(kw => (
                      <Badge key={kw} color="indigo" size="sm">{kw}</Badge>
                    ))}
                    {proposal.keywords.length > 3 && (
                      <Badge color="slate" size="sm">+{proposal.keywords.length - 3}</Badge>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {proposal.submitted_at 
                      ? new Date(proposal.submitted_at).toLocaleDateString()
                      : 'Not submitted'
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProposal(proposal)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Match Reviewers"
                    >
                      <UserCheck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Matching Modal */}
      {selectedProposal && (
        <MatchingModal 
          proposal={selectedProposal} 
          onClose={() => setSelectedProposal(null)} 
          token={token}
        />
      )}
    </DashboardLayout>
  );
}
