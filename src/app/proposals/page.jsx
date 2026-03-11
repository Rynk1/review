'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Send, Trash2, Eye, Clock, CheckCircle, XCircle, AlertCircle, 
  Edit3, X, Tag, FilePlus, ArrowRight, Calendar, User, Save, AlertTriangle,
  CheckCircle2, FileText, Search, Filter, RefreshCw, MoreVertical
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard, StatusBadge, LoadingSpinner, Alert, EmptyState, Card, Badge } from '@/components/ui';

function ProposalModal({ proposal, onClose, onSave, token }) {
  const [title, setTitle] = useState(proposal?.title || '');
  const [abstract, setAbstract] = useState(proposal?.abstract || '');
  const [keywordsInput, setKeywordsInput] = useState((proposal?.keywords || []).join(', '));
  const [methodology, setMethodology] = useState(proposal?.methodology || '');
  const [budget, setBudget] = useState(proposal?.budget || '');
  const [timeline, setTimeline] = useState(proposal?.timeline || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const autoSaveTimeoutRef = useRef(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || saving) return;
    
    const timer = setTimeout(() => {
      handleSave(false, true);
    }, 5000); // Auto-save after 5 seconds of inactivity
    
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges]);

  const handleChange = (setter, field) => (e) => {
    setter(e.target.value);
    setHasUnsavedChanges(true);
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const validate = () => {
    const errors = [];
    if (!title.trim()) errors.push('Title is required');
    if (!abstract.trim()) errors.push('Abstract is required');
    if (title.length < 10) errors.push('Title must be at least 10 characters');
    if (abstract.length < 50) errors.push('Abstract must be at least 50 characters');
    return errors;
  };

  const handleSave = async (submit = false, isAutoSave = false) => {
    const errors = validate();
    if (errors.length > 0 && !isAutoSave) {
      setError(errors.join(', '));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);

      const proposalData = { 
        title, 
        abstract, 
        keywords,
        methodology: methodology || undefined,
        budget: budget || undefined,
        timeline: timeline || undefined,
      };
      
      if (submit) proposalData.status = 'submitted';

      if (proposal?.id) {
        const res = await fetch(`/api/v1/proposals/${proposal.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(proposalData),
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
          body: JSON.stringify(proposalData),
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

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onSave();
      onClose();
    } catch (err) {
      if (!isAutoSave) {
        setError(err.message || 'Failed to save proposal');
      }
    } finally {
      setSaving(false);
    }
  };

  const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);
  
  const getCharacterCountClass = (current, min, max) => {
    if (current < min) return 'text-rose-500';
    if (current > max) return 'text-rose-500';
    return 'text-emerald-600';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-3xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {proposal?.id ? 'Edit Proposal' : 'New Proposal'}
            </h2>
            {hasUnsavedChanges && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 max-h-[65vh] space-y-6">
          {error && (
            <Alert type="error" message={error} onDismiss={() => setError('')} />
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={handleChange(setTitle, 'title')}
              onBlur={handleBlur('title')}
              placeholder="Enter a descriptive title for your grant proposal"
              className={`input ${touched.title && !title.trim() ? 'border-rose-300 focus:border-rose-500' : ''}`}
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-xs text-slate-400">
                {touched.title && title.length < 10 && (
                  <span className="text-rose-500">Minimum 10 characters required</span>
                )}
              </div>
              <div className={`text-xs ${getCharacterCountClass(title.length, 10, 200)}`}>
                {title.length}/200
              </div>
            </div>
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Abstract <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={abstract}
              onChange={handleChange(setAbstract, 'abstract')}
              onBlur={handleBlur('abstract')}
              placeholder="Provide a comprehensive abstract of your research proposal, including objectives, methodology, and expected outcomes..."
              rows={8}
              className={`input resize-none ${touched.abstract && abstract.length < 50 ? 'border-rose-300 focus:border-rose-500' : ''}`}
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-xs text-slate-400">
                {touched.abstract && abstract.length < 50 && (
                  <span className="text-rose-500">Minimum 50 characters required</span>
                )}
              </div>
              <div className={`text-xs flex items-center gap-1 ${getCharacterCountClass(abstract.length, 50, 3000)}`}>
                <Clock className="h-3 w-3" />
                {abstract.length}/3000 characters
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Keywords <span className="text-slate-400 font-normal">(helps match with reviewers)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => {
                  setKeywordsInput(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="machine learning, deep learning, computer vision (comma-separated)"
                className="input pl-10"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Add relevant keywords to help match your proposal with the most appropriate reviewers
            </p>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {keywords.map(kw => (
                  <Badge key={kw} color="indigo">{kw}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Methodology - Expanded Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Methodology <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={methodology}
              onChange={(e) => {
                setMethodology(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Describe your research methodology and approach in detail..."
              rows={4}
              className="input resize-none"
            />
            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {methodology.length}/2000 characters
            </div>
          </div>

          {/* Budget & Timeline Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Budget Request <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g., 50,000"
                  className="input pl-8"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Timeline <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={timeline}
                onChange={(e) => {
                  setTimeline(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g., 12 months"
                className="input"
              />
            </div>
          </div>

          {/* Auto-save indicator */}
          {lastSaved && (
            <div className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
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
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" /> : <Save className="h-4 w-4" />}
              Save Draft
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
        className="modal-content w-full max-w-3xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Proposal Details</h2>
            {detail?.proposal && <StatusBadge status={detail.proposal.status} />}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 max-h-[65vh]">
          {loading ? (
            <LoadingSpinner />
          ) : detail ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{detail.proposal?.title}</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-slate-600 leading-relaxed">{detail.proposal?.abstract}</p>
                </div>
              </div>

              {detail.proposal?.methodology && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Methodology</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{detail.proposal.methodology}</p>
                </div>
              )}

              {(detail.proposal?.budget || detail.proposal?.timeline) && (
                <div className="grid grid-cols-2 gap-4">
                  {detail.proposal?.budget && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-xs text-slate-500 mb-1">Budget Request</div>
                      <div className="text-lg font-bold text-slate-900">${detail.proposal.budget}</div>
                    </div>
                  )}
                  {detail.proposal?.timeline && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-xs text-slate-500 mb-1">Timeline</div>
                      <div className="text-lg font-bold text-slate-900">{detail.proposal.timeline}</div>
                    </div>
                  )}
                </div>
              )}

              {detail.proposal?.keywords?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.proposal.keywords.map(kw => (
                      <Badge key={kw} color="indigo">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 text-sm text-slate-500 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created: {detail.proposal?.created_at ? new Date(detail.proposal.created_at).toLocaleDateString() : 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Submitted: {detail.proposal?.submitted_at ? new Date(detail.proposal.submitted_at).toLocaleDateString() : 'Not submitted'}
                </div>
              </div>

              {detail.reviews?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Reviews ({detail.reviews.length})</h4>
                  <div className="space-y-2">
                    {detail.reviews.map(review => (
                      <div key={review.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-semibold">
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
                        <StatusBadge status={review.status} type="review" />
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
    if (!confirm('Are you sure you want to delete this draft proposal? This action cannot be undone.')) return;
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

  const refreshData = () => fetchProposals(token);

  if (loading) {
    return (
      <DashboardLayout requiredRoles={['applicant']}>
        <LoadingSpinner text="Loading proposals..." />
      </DashboardLayout>
    );
  }

  const draftCount = proposals.filter(p => p.status === 'draft').length;
  const submittedCount = proposals.filter(p => p.status === 'submitted').length;
  const underReviewCount = proposals.filter(p => p.status === 'under_review').length;
  const decidedCount = proposals.filter(p => ['accepted', 'rejected'].includes(p.status)).length;

  return (
    <DashboardLayout requiredRoles={['applicant']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Proposals</h1>
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
          <Alert type="error" message={error} onDismiss={() => setError('')} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Drafts', value: draftCount, color: 'slate', icon: Edit3 },
            { label: 'Submitted', value: submittedCount, color: 'blue', icon: Send },
            { label: 'Under Review', value: underReviewCount, color: 'amber', icon: Clock },
            { label: 'Decided', value: decidedCount, color: 'emerald', icon: CheckCircle },
          ].map((stat, index) => (
            <StatCard 
              key={stat.label}
              icon={stat.icon} 
              label={stat.label} 
              value={stat.value} 
              color={stat.color} 
              delay={index * 0.05}
            />
          ))}
        </div>

        {/* Proposals List */}
        {proposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proposals yet"
            description="Start by creating your first grant proposal. Our step-by-step form will guide you through the process."
            action={
              <button onClick={() => setShowNewModal(true)} className="btn-primary">
                <Plus className="h-5 w-5" />
                Create Your First Proposal
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal, index) => (
              <Card 
                key={proposal.id} 
                className="p-5 hover:shadow-md transition-all duration-300 animate-slide-up"
                hover
                style={{ animationDelay: `${0.2 + index * 0.03}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={proposal.status} />
                      {proposal.keywords?.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {proposal.keywords.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{proposal.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{proposal.abstract}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {proposal.submitted_at 
                          ? `Submitted ${new Date(proposal.submitted_at).toLocaleDateString()}`
                          : `Created ${proposal.created_at ? new Date(proposal.created_at).toLocaleDateString() : 'N/A'}`
                        }
                      </span>
                      {proposal.review_count > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {proposal.review_count} review{proposal.review_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
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
                          onClick={() => handleDelete(proposal.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSubmit(proposal.id)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Submit"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {['submitted', 'under_review', 'accepted', 'rejected'].includes(proposal.status) && (
                      <button
                        onClick={() => setViewingProposal(proposal)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showNewModal || editingProposal) && (
        <ProposalModal
          proposal={editingProposal}
          onClose={() => {
            setShowNewModal(false);
            setEditingProposal(null);
          }}
          onSave={refreshData}
          token={token}
        />
      )}

      {/* View Details Modal */}
      {viewingProposal && (
        <ProposalDetailModal
          proposal={viewingProposal}
          onClose={() => setViewingProposal(null)}
          token={token}
        />
      )}
    </DashboardLayout>
  );
}
