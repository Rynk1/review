'use client';

import { useState, useEffect } from 'react';
import {
  GraduationCap, LogOut, FileText, Users, CheckSquare, AlertTriangle,
  TrendingUp, Clock, ChevronRight, RefreshCw, UserCheck, X, Star,
  BarChart2, Search, Filter, Plus, Eye, Zap
} from 'lucide-react';

function NavBar({ user, tenant, onLogout }) {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-1.5">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900">Grant Review System</span>
              <span className="ml-2 text-sm text-gray-500">{tenant?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user?.full_name || user?.email}</div>
              <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    withdrawn: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status?.replace('_', ' ')}
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

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
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
  };

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reviewer Matching</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-md">{proposal.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {assignSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
              {assignSuccess}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {matches.length > 0 ? `${matches.length} Candidate Reviewers` : 'No matches yet'}
            </h3>
            <button
              onClick={generateMatches}
              disabled={generating}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate Matches'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No matches generated yet. Click &quot;Generate Matches&quot; to find suitable reviewers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div
                  key={match.reviewer_id}
                  onClick={() => toggleReviewer(match.reviewer_id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedReviewers.includes(match.reviewer_id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{match.reviewer_name}</span>
                        <span className="text-xs text-gray-500">{match.reviewer_email}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(match.expertise || []).slice(0, 4).map(exp => (
                          <span key={exp} className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {exp}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Workload: {match.current_assignments}/{match.workload_limit}</span>
                        {match.reasoning?.relevance_factors?.keyword_matches?.length > 0 && (
                          <span className="text-green-600">
                            {match.reasoning.relevance_factors.keyword_matches.length} keyword matches
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-blue-600">
                        {Math.round(match.final_score * 100)}%
                      </div>
                      <div className="text-xs text-gray-400">match score</div>
                      <div className="mt-1 space-y-0.5 text-xs">
                        <div className="text-gray-500">Rel: {Math.round(match.relevance_score * 100)}%</div>
                        <div className={match.conflict_score > 0.3 ? 'text-red-500' : 'text-gray-500'}>
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
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {selectedReviewers.length} reviewer(s) selected
              </span>
              <button
                onClick={assignReviewers}
                disabled={assigning}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
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

      // Compute stats
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} tenant={tenant} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage grant proposals and reviewer assignments</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={FileText} label="Total Proposals" value={stats.total || 0} color="bg-blue-500" />
          <StatCard icon={Clock} label="Submitted" value={stats.submitted || 0} color="bg-indigo-500" />
          <StatCard icon={TrendingUp} label="Under Review" value={stats.under_review || 0} color="bg-yellow-500" />
          <StatCard icon={CheckSquare} label="Accepted" value={stats.accepted || 0} color="bg-green-500" />
          <StatCard icon={AlertTriangle} label="Rejected" value={stats.rejected || 0} color="bg-red-500" />
          <StatCard icon={FileText} label="Drafts" value={stats.draft || 0} color="bg-gray-400" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <a href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            Proposals
          </a>
          <a href="/reviewers" className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            Reviewers
          </a>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search proposals by title, abstract, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Proposals Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Grant Proposals ({proposals.length})</h2>
            <button
              onClick={() => fetchData(token)}
              className="text-gray-400 hover:text-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {proposals.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No proposals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Proposal</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Reviews</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900 text-sm truncate">{proposal.title}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(proposal.keywords || []).slice(0, 3).map(kw => (
                              <span key={kw} className="inline-flex px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{proposal.applicant_name}</div>
                        <div className="text-xs text-gray-500">{proposal.applicant_email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={proposal.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <CheckSquare className="h-4 w-4 text-gray-400" />
                          {proposal.review_count || 0}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {proposal.submitted_at
                          ? new Date(proposal.submitted_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {['submitted', 'under_review'].includes(proposal.status) && (
                            <button
                              onClick={() => setSelectedProposal(proposal)}
                              className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                            >
                              <Users className="h-3 w-3" />
                              Match
                            </button>
                          )}
                          {proposal.status === 'under_review' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(proposal.id, 'accepted')}
                                className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleStatusChange(proposal.id, 'rejected')}
                                className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
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

      {/* Matching Modal */}
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
