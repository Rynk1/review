'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, LogOut, FileText, Plus, Send, Trash2, Eye,
  Clock, CheckCircle, XCircle, AlertCircle, Edit3, X, Tag, FilePlus,
  ArrowRight, Calendar, User
} from 'lucide-react';

function NavBar({ user, tenant, onLogout }) {
  return (
    <nav className="navbar">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

function StatusBadge({ status }) {
  const config = {
    draft: { color: 'bg-slate-100 text-slate-700', icon: Edit3, label: 'Draft' },
    submitted: { color: 'bg-blue-100 text-blue-700', icon: Send, label: 'Submitted' },
    under_review: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Under Review' },
    accepted: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Accepted' },
    rejected: { color: 'bg-rose-100 text-rose-700', icon: XCircle, label: 'Rejected' },
    withdrawn: { color: 'bg-slate-100 text-slate-500', icon: X, label: 'Withdrawn' },
  };
  const { color, icon: Icon, label } = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
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

  const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {proposal?.id ? 'Edit Proposal' : 'New Proposal'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 max-h-[60vh] space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for your grant proposal"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Abstract <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Provide a comprehensive abstract of your research proposal, including objectives, methodology, and expected outcomes..."
              rows={8}
              className="input resize-none"
            />
            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {abstract.length} characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Keywords
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="machine learning, deep learning, computer vision (comma-separated)"
                className="input pl-10"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Keywords help match your proposal with the most relevant reviewers
            </p>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {keywords.map(kw => (
                  <span key={kw} className="inline-flex px-2.5 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="btn-secondary"
            >
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" /> : null}
              Save as Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="btn-primary"
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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Proposal Details</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{detail.proposal?.title}</h3>
                  <StatusBadge status={detail.proposal?.status} />
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{detail.proposal?.abstract}</p>
              </div>

              {detail.proposal?.keywords?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.proposal.keywords.map(kw => (
                      <span key={kw} className="inline-flex px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.reviews?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Reviews ({detail.reviews.length})</h4>
                  <div className="space-y-2">
                    {detail.reviews.map(review => (
                      <div key={review.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                            {(review.reviewer_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{review.reviewer_name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Assigned {new Date(review.assigned_at).toLocaleDateString()}
                            </div>
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
            <p className="text-slate-500 text-center py-8">Failed to load proposal details</p>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl animate-pulse-subtle" />
            <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          </div>
          <p className="text-slate-500">Loading proposals...</p>
        </div>
      </div>
    );
  }

  const draftCount = proposals.filter(p => p.status === 'draft').length;
  const submittedCount = proposals.filter(p => p.status === 'submitted').length;
  const underReviewCount = proposals.filter(p => p.status === 'under_review').length;
  const decidedCount = proposals.filter(p => ['accepted', 'rejected'].includes(p.status)).length;

  return (
    <div className="min-h-screen pb-12">
      <NavBar user={user} tenant={tenant} onLogout={handleLogout} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 animate-slide-up">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Proposals</h1>
            <p className="text-slate-500 mt-1">Submit and track your grant applications</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary"
          >
            <Plus className="h-5 w-5" />
            New Proposal
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Drafts', value: draftCount, color: 'slate', icon: Edit3 },
            { label: 'Submitted', value: submittedCount, color: 'blue', icon: Send },
            { label: 'Under Review', value: underReviewCount, color: 'amber', icon: Clock },
            { label: 'Decided', value: decidedCount, color: 'emerald', icon: CheckCircle },
          ].map((stat, index) => (
            <div 
              key={stat.label} 
              className={`
                stat-card animate-slide-up
              `}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  ${stat.color === 'slate' ? 'bg-slate-100 text-slate-600' : ''}
                  ${stat.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                  ${stat.color === 'amber' ? 'bg-amber-100 text-amber-600' : ''}
                  ${stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : ''}
                `}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Proposals List */}
        {proposals.length === 0 ? (
          <div className="card p-16 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 mb-6">
              <FilePlus className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No proposals yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Start by creating your first grant proposal to begin the application process</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="btn-primary mx-auto"
            >
              <Plus className="h-5 w-5" />
              Create First Proposal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal, index) => (
              <div 
                key={proposal.id} 
                className="card p-5 animate-slide-up hover:shadow-card-hover"
                style={{ animationDelay: `${0.25 + index * 0.03}s` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate">{proposal.title}</h3>
                      <StatusBadge status={proposal.status} />
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{proposal.abstract}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      {proposal.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {proposal.keywords.slice(0, 4).map(kw => (
                            <span key={kw} className="inline-flex px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-slate-400 flex-shrink-0 flex items-center gap-1">
                        {proposal.review_count > 0 && (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            {proposal.review_count} review(s)
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewingProposal(proposal)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {proposal.status === 'draft' && (
                      <>
                        <button
                          onClick={() => setEditingProposal(proposal)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSubmit(proposal.id)}
                          className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Submit"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(proposal.id)}
                          className="p-2 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewModal && (
        <ProposalModal
          proposal={null}
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
