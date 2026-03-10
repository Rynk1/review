'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, LogOut, FileText, Plus, Send, Trash2, Eye,
  Clock, CheckCircle, XCircle, AlertCircle, Edit3, X, Tag
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
            <button onClick={onLogout} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    draft: { color: 'bg-gray-100 text-gray-700', icon: Edit3 },
    submitted: { color: 'bg-blue-100 text-blue-700', icon: Send },
    under_review: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    accepted: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
    withdrawn: { color: 'bg-gray-100 text-gray-500', icon: X },
  };
  const { color, icon: Icon } = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
      <Icon className="h-3 w-3" />
      {status?.replace('_', ' ')}
    </span>
  );
}

function ProposalModal({ proposal, onClose, onSave, token }) {
  const [title, setTitle] = useState(proposal?.title || '');
  const [abstract, setAbstract] = useState(proposal?.abstract || '');
  const [keywordsInput, setKeywordsInput] = useState((proposal?.keywords || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (submit = false) => {
    if (!title.trim() || !abstract.trim()) {
      setError('Title and abstract are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);

      if (proposal?.id) {
        // Update existing
        const body = { title, abstract, keywords };
        if (submit) body.status = 'submitted';

        const res = await fetch(`/api/v1/proposals/${proposal.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        // Create new
        const res = await fetch('/api/v1/proposals', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, abstract, keywords }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Submit if requested
        if (submit && data.proposal?.id) {
          await fetch(`/api/v1/proposals/${data.proposal.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'submitted' }),
          });
        }
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save proposal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {proposal?.id ? 'Edit Proposal' : 'New Proposal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for your grant proposal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Abstract <span className="text-red-500">*</span>
            </label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Provide a comprehensive abstract of your research proposal, including objectives, methodology, and expected outcomes..."
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="text-xs text-gray-400 mt-1">{abstract.length} characters</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Keywords
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="machine learning, deep learning, computer vision (comma-separated)"
                className="w-full pl-10 pr-4 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Keywords help match your proposal with the most relevant reviewers
            </p>
            {keywordsInput && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywordsInput.split(',').map(k => k.trim()).filter(Boolean).map(kw => (
                  <span key={kw} className="inline-flex px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-200">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" /> : null}
              Save as Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send className="h-4 w-4" />}
              Submit Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalDetailModal({ proposal, onClose, token }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(() => {
    fetch(`/api/v1/proposals/${proposal.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setDetail(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [proposal.id, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Proposal Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{detail.proposal?.title}</h3>
                  <StatusBadge status={detail.proposal?.status} />
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{detail.proposal?.abstract}</p>
              </div>

              {detail.proposal?.keywords?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.proposal.keywords.map(kw => (
                      <span key={kw} className="inline-flex px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.reviews?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Reviews ({detail.reviews.length})</h4>
                  <div className="space-y-2">
                    {detail.reviews.map(review => (
                      <div key={review.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{review.reviewer_name}</div>
                          <div className="text-xs text-gray-500">
                            Assigned {new Date(review.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                        <StatusBadge status={review.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Failed to load proposal details</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [viewingProposal, setViewingProposal] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedTenant = localStorage.getItem('auth_tenant');

    if (!storedToken || !storedUser) {
      window.location.href = '/login';
      return;
    }

    setToken(storedToken);
    setUser(JSON.parse(storedUser));
    setTenant(storedTenant ? JSON.parse(storedTenant) : null);
    fetchProposals(storedToken);
  }, []);

  const fetchProposals = async (authToken) => {
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

  const handleDelete = async (proposalId) => {
    if (!confirm('Are you sure you want to delete this draft proposal?')) return;
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchProposals(token);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (proposalId) => {
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'submitted' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchProposals(token);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading proposals...</p>
        </div>
      </div>
    );
  }

  const draftCount = proposals.filter(p => p.status === 'draft').length;
  const submittedCount = proposals.filter(p => p.status === 'submitted').length;
  const underReviewCount = proposals.filter(p => p.status === 'under_review').length;
  const decidedCount = proposals.filter(p => ['accepted', 'rejected'].includes(p.status)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} tenant={tenant} onLogout={handleLogout} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Proposals</h1>
            <p className="text-gray-500 mt-1">Submit and track your grant applications</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="h-5 w-5" />
            New Proposal
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Drafts', value: draftCount, color: 'text-gray-600', bg: 'bg-gray-50' },
            { label: 'Submitted', value: submittedCount, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Under Review', value: underReviewCount, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Decided', value: decidedCount, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Proposals List */}
        {proposals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-200" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No proposals yet</h3>
            <p className="text-gray-500 mb-6">Start by creating your first grant proposal</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Create First Proposal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{proposal.title}</h3>
                      <StatusBadge status={proposal.status} />
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{proposal.abstract}</p>
                    <div className="flex items-center gap-4">
                      {proposal.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {proposal.keywords.slice(0, 4).map(kw => (
                            <span key={kw} className="inline-flex px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {proposal.review_count > 0 && `${proposal.review_count} review(s)`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewingProposal(proposal)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {proposal.status === 'draft' && (
                      <>
                        <button
                          onClick={() => setEditingProposal(proposal)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSubmit(proposal.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Send className="h-3 w-3" />
                          Submit
                        </button>
                        <button
                          onClick={() => handleDelete(proposal.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span>Created {new Date(proposal.created_at).toLocaleDateString()}</span>
                  {proposal.submitted_at && proposal.status !== 'draft' && (
                    <span>Submitted {new Date(proposal.submitted_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewModal && (
        <ProposalModal
          onClose={() => setShowNewModal(false)}
          onSave={() => fetchProposals(token)}
          token={token}
        />
      )}
      {editingProposal && (
        <ProposalModal
          proposal={editingProposal}
          onClose={() => setEditingProposal(null)}
          onSave={() => fetchProposals(token)}
          token={token}
        />
      )}
      {viewingProposal && (
        <ProposalDetailModal
          proposal={viewingProposal}
          onClose={() => setViewingProposal(null)}
          token={token}
        />
      )}
    </div>
  );
}
