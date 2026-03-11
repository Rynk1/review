'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, LogOut, ClipboardList, CheckCircle, XCircle,
  AlertTriangle, Clock, Star, MessageSquare, X, BookOpen, 
  Calendar, AlertCircle, Send, Save, User, FileText, ChevronRight
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

function StatusBadge({ status }) {
  const config = {
    assigned: { color: 'bg-blue-100 text-blue-700', label: 'Assigned' },
    accepted: { color: 'bg-indigo-100 text-indigo-700', label: 'Accepted' },
    declined: { color: 'bg-rose-100 text-rose-700', label: 'Declined' },
    in_progress: { color: 'bg-amber-100 text-amber-700', label: 'In Progress' },
    completed: { color: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
    cancelled: { color: 'bg-slate-100 text-slate-500', label: 'Cancelled' },
  };
  const { color, label } = config[status] || config.assigned;
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
      {label}
    </span>
  );
}

function ScoreInput({ label, value, onChange, disabled }) {
  const getColor = (val) => {
    if (val >= 8) return 'text-emerald-600';
    if (val >= 5) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="1"
          max="10"
          value={value || 5}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className={`w-8 text-center text-sm font-bold ${getColor(value)}`}>
          {value || 5}
        </span>
      </div>
    </div>
  );
}

function ReviewModal({ reviewId, onClose, onUpdate, token }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scores, setScores] = useState({
    innovation: 5,
    methodology: 5,
    feasibility: 5,
    impact: 5,
    overall: 5,
    recommendation: 'accept',
  });
  const [comments, setComments] = useState('');
  const [conflictReason, setConflictReason] = useState('');
  const [showConflictForm, setShowConflictForm] = useState(false);

  const fetchReview = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReview(data.review);

      if (data.review.scores && Object.keys(data.review.scores).length > 0) {
        setScores(data.review.scores);
      }
      if (data.review.comments) {
        setComments(data.review.comments);
      }
    } catch (err) {
      setError(err.message || 'Failed to load review');
    } finally {
      setLoading(false);
    }
  }, [reviewId, token]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const handleAction = async (action) => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const body = { action };
      if (['save_draft', 'submit'].includes(action)) {
        body.scores = scores;
        body.comments = comments;
      }
      if (action === 'declare_conflict') {
        body.conflict_reason = conflictReason;
      }

      const res = await fetch(`/api/v1/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(data.message);
      setReview(data.review);
      onUpdate();

      if (['decline', 'declare_conflict'].includes(action)) {
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = review && ['accepted', 'in_progress'].includes(review.status);
  const canAccept = review?.status === 'assigned';
  const canDecline = review && ['assigned', 'accepted'].includes(review.status);
  const canSubmit = review && ['accepted', 'in_progress'].includes(review.status);
  const canDeclareConflict = review && !['completed', 'cancelled'].includes(review.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-3xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Review Assignment</h2>
            {review && <StatusBadge status={review.status} />}
          </div>
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
          ) : error && !review ? (
            <div className="text-center py-8 text-rose-600">{error}</div>
          ) : review ? (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {/* Proposal Info */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
                <div className="flex items-start gap-2 mb-3">
                  <FileText className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <h3 className="font-bold text-slate-900 text-lg">{review.proposal?.title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{review.proposal?.abstract}</p>
                {review.proposal?.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {review.proposal.keywords.map(kw => (
                      <span key={kw} className="inline-flex px-2.5 py-1 text-xs bg-white text-indigo-700 rounded-full border border-indigo-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                {review.proposal?.applicant_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User className="h-4 w-4" />
                    <span>Applicant: {review.proposal.applicant_name}</span>
                  </div>
                )}
              </div>

              {/* Review Dates */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Assigned: {new Date(review.assigned_at).toLocaleDateString()}</span>
                </div>
                {review.due_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>Due: {new Date(review.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Assigned Status */}
              {canAccept && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        You have been assigned to review this proposal
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Please accept or decline this assignment.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction('accept')}
                      disabled={submitting}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept Review
                    </button>
                    <button
                      onClick={() => handleAction('decline')}
                      disabled={submitting}
                      className="btn-secondary text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Scoring Form */}
              {(canEdit || review.status === 'completed') && (
                <div className="space-y-6">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Evaluation Scores
                  </h4>

                  <div className="grid grid-cols-1 gap-5">
                    <ScoreInput
                      label="Innovation (1-10)"
                      value={scores.innovation}
                      onChange={(v) => setScores(s => ({ ...s, innovation: v }))}
                      disabled={!canEdit}
                    />
                    <ScoreInput
                      label="Methodology (1-10)"
                      value={scores.methodology}
                      onChange={(v) => setScores(s => ({ ...s, methodology: v }))}
                      disabled={!canEdit}
                    />
                    <ScoreInput
                      label="Feasibility (1-10)"
                      value={scores.feasibility}
                      onChange={(v) => setScores(s => ({ ...s, feasibility: v }))}
                      disabled={!canEdit}
                    />
                    <ScoreInput
                      label="Impact (1-10)"
                      value={scores.impact}
                      onChange={(v) => setScores(s => ({ ...s, impact: v }))}
                      disabled={!canEdit}
                    />
                    <ScoreInput
                      label="Overall Score (1-10)"
                      value={scores.overall}
                      onChange={(v) => setScores(s => ({ ...s, overall: v }))}
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Recommendation</label>
                    <select
                      value={scores.recommendation || 'accept'}
                      onChange={(e) => setScores(s => ({ ...s, recommendation: e.target.value }))}
                      disabled={!canEdit}
                      className="select"
                    >
                      <option value="strong_accept">Strong Accept</option>
                      <option value="accept">Accept</option>
                      <option value="borderline">Borderline</option>
                      <option value="reject">Reject</option>
                      <option value="strong_reject">Strong Reject</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <MessageSquare className="inline h-4 w-4 mr-1" />
                      Review Comments
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Provide detailed feedback on the proposal's strengths, weaknesses, and suggestions for improvement..."
                      rows={6}
                      className="input resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Conflict Declaration Form */}
              {showConflictForm && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                  <h4 className="font-semibold text-rose-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Declare Conflict of Interest
                  </h4>
                  <textarea
                    value={conflictReason}
                    onChange={(e) => setConflictReason(e.target.value)}
                    placeholder="Please describe the nature of your conflict of interest..."
                    rows={3}
                    className="input mb-3 border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('declare_conflict')}
                      disabled={submitting || !conflictReason.trim()}
                      className="btn-primary bg-rose-600 hover:bg-rose-700"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Confirm Conflict
                    </button>
                    <button
                      onClick={() => setShowConflictForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {review && !['completed', 'cancelled', 'declined'].includes(review.status) && (
          <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {canDeclareConflict && !showConflictForm && (
                <button
                  onClick={() => setShowConflictForm(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-600 border border-rose-300 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Declare Conflict
                </button>
              )}
              {canDecline && !canAccept && (
                <button
                  onClick={() => handleAction('decline')}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Decline
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {canEdit && (
                <button
                  onClick={() => handleAction('save_draft')}
                  disabled={submitting}
                  className="btn-secondary"
                >
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" /> : <Save className="h-4 w-4" />}
                  Save Draft
                </button>
              )}
              {canSubmit && (
                <button
                  onClick={() => handleAction('submit')}
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send className="h-4 w-4" />}
                  Submit Review
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [reviewDetails, setReviewDetails] = useState({});

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedTenant = localStorage.getItem('auth_tenant');

    if (!storedToken || !storedUser) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'reviewer') {
      window.location.href = '/';
      return;
    }

    setToken(storedToken);
    setUser(parsedUser);
    setTenant(storedTenant ? JSON.parse(storedTenant) : null);
    fetchAssignedProposals(storedToken);
  }, []);

  const fetchAssignedProposals = async (authToken) => {
    try {
      const res = await fetch('/api/v1/proposals?limit=50', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/login'; return; }
        throw new Error('Failed to fetch assignments');
      }
      const data = await res.json();
      setProposals(data.proposals || []);

      const details = {};
      for (const proposal of (data.proposals || [])) {
        try {
          const propRes = await fetch(`/api/v1/proposals/${proposal.id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          });
          if (propRes.ok) {
            const propData = await propRes.json();
            const myReview = propData.reviews?.find(r => r.status !== 'cancelled');
            if (myReview) {
              details[proposal.id] = myReview;
            }
          }
        } catch (e) {
          // Skip individual proposal errors
        }
      }
      setReviewDetails(details);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl animate-pulse-subtle" />
            <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          </div>
          <p className="text-slate-500">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  const pendingCount = proposals.filter(p => {
    const review = reviewDetails[p.id];
    return review && ['assigned', 'accepted', 'in_progress'].includes(review.status);
  }).length;

  const completedCount = proposals.filter(p => {
    const review = reviewDetails[p.id];
    return review && review.status === 'completed';
  }).length;

  return (
    <div className="min-h-screen pb-12">
      <NavBar user={user} tenant={tenant} onLogout={handleLogout} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Reviews</h1>
          <p className="text-slate-500 mt-1">Review assigned grant proposals</p>
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
            { label: 'Total Assigned', value: proposals.length, color: 'indigo', icon: ClipboardList },
            { label: 'Pending', value: pendingCount, color: 'amber', icon: Clock },
            { label: 'Completed', value: completedCount, color: 'emerald', icon: CheckCircle },
            { label: 'Declined', value: Object.values(reviewDetails).filter(r => r.status === 'declined').length, color: 'rose', icon: XCircle },
          ].map((stat, index) => (
            <div 
              key={stat.label} 
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  ${stat.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : ''}
                  ${stat.color === 'amber' ? 'bg-amber-100 text-amber-600' : ''}
                  ${stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : ''}
                  ${stat.color === 'rose' ? 'bg-rose-100 text-rose-600' : ''}
                `}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Assignments List */}
        {proposals.length === 0 ? (
          <div className="card p-16 text-center animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-100 mb-6">
              <ClipboardList className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No assignments yet</h3>
            <p className="text-slate-500">You haven't been assigned any proposals to review yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal, index) => {
              const review = reviewDetails[proposal.id];
              return (
                <div 
                  key={proposal.id} 
                  className="card p-5 animate-slide-up hover:shadow-card-hover cursor-pointer"
                  style={{ animationDelay: `${0.25 + index * 0.03}s` }}
                  onClick={() => review && setSelectedReviewId(review.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate">{proposal.title}</h3>
                        {review && <StatusBadge status={review.status} />}
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
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {review && new Date(review.assigned_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {review && (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedReviewId && (
        <ReviewModal
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
          onUpdate={() => fetchAssignedProposals(token)}
          token={token}
        />
      )}
    </div>
  );
}
