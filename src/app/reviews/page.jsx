'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, CheckCircle, XCircle, AlertTriangle, Clock, Star, MessageSquare, 
  X, BookOpen, Calendar, AlertCircle, Send, Save, User, FileText, ChevronRight,
  CheckCircle2, FileCheck, FileX, AlertOctagon
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard, StatusBadge, LoadingSpinner, Alert, EmptyState, Card, Badge, ScoreInput } from '@/components/ui';

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
  const [conflictedReason, setConflictReason] = useState('');
  const [showConflictForm, setShowConflictForm] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

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

  const handleSaveDraft = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_draft',
          scores,
          comments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaveStatus('saved');
      setReview(data.review);
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const canEdit = review && ['accepted', 'in_progress'].includes(review.status);
  const canAccept = review?.status === 'assigned';
  const canDecline = review && ['assigned', 'accepted'].includes(review.status);
  const canSubmit = review && ['accepted', 'in_progress'].includes(review.status);
  const canDeclareConflict = review && !['completed', 'cancelled'].includes(review.status);

  const getAverageScore = () => {
    const { innovation, methodology, feasibility, impact, overall } = scores;
    return ((innovation + methodology + feasibility + impact + overall) / 5).toFixed(1);
  };

  const getRecommendationLabel = (rec) => {
    const labels = {
      strong_accept: 'Strong Accept',
      accept: 'Accept',
      borderline: 'Borderline',
      reject: 'Reject',
      strong_reject: 'Strong Reject',
    };
    return labels[rec] || rec;
  };

  const getRecommendationColor = (rec) => {
    const colors = {
      strong_accept: 'bg-emerald-100 text-emerald-700',
      accept: 'bg-blue-100 text-blue-700',
      borderline: 'bg-amber-100 text-amber-700',
      reject: 'bg-rose-100 text-rose-700',
      strong_reject: 'bg-red-100 text-red-700',
    };
    return colors[rec] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-4xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Review Assignment</h2>
            {review && <StatusBadge status={review.status} type="review" />}
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
          ) : error && !review ? (
            <Alert type="error" message={error} />
          ) : review ? (
            <div className="space-y-6">
              {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
              {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

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
                      <Badge key={kw} color="indigo">{kw}</Badge>
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
                {review.submitted_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Submitted: {new Date(review.submitted_at).toLocaleDateString()}</span>
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-500" />
                      Evaluation Scores
                    </h4>
                    {canEdit && (
                      <div className="text-sm text-slate-500">
                        Average: <span className="font-bold text-indigo-600">{getAverageScore()}</span>/10
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      {scores.recommendation && (
                        <div className={`mt-2 inline-flex px-3 py-1 text-xs font-medium rounded-full ${getRecommendationColor(scores.recommendation)}`}>
                          {getRecommendationLabel(scores.recommendation)}
                        </div>
                      )}
                    </div>
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
                      rows={8}
                      className="input resize-none"
                    />
                    <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {comments.length} characters
                    </div>
                  </div>
                </div>
              )}

              {/* Conflict Declaration Form */}
              {showConflictForm && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                  <h4 className="font-semibold text-rose-800 mb-3 flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4" />
                    Declare Conflict of Interest
                  </h4>
                  <textarea
                    value={conflictReason}
                    onChange={(e) => setConflictReason(e.target.value)}
                    placeholder="Please describe the nature of your conflict of interest (e.g., collaboration, co-authorship, same institution)..."
                    rows={4}
                    className="input mb-3 border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('declare_conflict')}
                      disabled={submitting || !conflictReason.trim()}
                      className="btn-primary bg-rose-600 hover:bg-rose-700"
                    >
                      <AlertOctagon className="h-4 w-4" />
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
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={submitting || saveStatus === 'saving'}
                    className="btn-secondary"
                  >
                    {saveStatus === 'saving' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
                    ) : saveStatus === 'saved' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => handleAction('submit')}
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit Review
                  </button>
                </>
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

      // Get review details for each proposal
      const details = {};
      for (const proposal of data.proposals || []) {
        if (proposal.my_review) {
          details[proposal.id] = proposal.my_review;
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

  const handleRefresh = () => {
    fetchAssignedProposals(token);
  };

  if (loading) {
    return (
      <DashboardLayout requiredRoles={['reviewer']}>
        <LoadingSpinner text="Loading reviews..." />
      </DashboardLayout>
    );
  }

  const assignedCount = Object.keys(reviewDetails).filter(id => 
    ['assigned', 'accepted', 'in_progress'].includes(reviewDetails[id]?.status)
  ).length;
  const completedCount = Object.keys(reviewDetails).filter(id => 
    reviewDetails[id]?.status === 'completed'
  ).length;
  const pendingCount = Object.keys(reviewDetails).filter(id => 
    reviewDetails[id]?.status === 'assigned'
  ).length;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned': return Clock;
      case 'accepted': return CheckCircle;
      case 'in_progress': return BookOpen;
      case 'completed': return CheckCircle2;
      case 'declined': return FileX;
      default: return FileText;
    }
  };

  return (
    <DashboardLayout requiredRoles={['reviewer']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Reviews</h1>
            <p className="text-slate-500 mt-1">Review assigned proposals and provide feedback</p>
          </div>
          <button
            onClick={handleRefresh}
            className="btn-secondary"
          >
            <ClipboardList className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error && (
          <Alert type="error" message={error} onDismiss={() => setError('')} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard 
            icon={ClipboardList} 
            label="Total Assigned" 
            value={Object.keys(reviewDetails).length} 
            color="indigo" 
            delay={0} 
          />
          <StatCard 
            icon={Clock} 
            label="Pending" 
            value={pendingCount} 
            color="amber" 
            delay={0.05} 
          />
          <StatCard 
            icon={BookOpen} 
            label="In Progress" 
            value={assignedCount - pendingCount} 
            color="blue" 
            delay={0.1} 
          />
          <StatCard 
            icon={CheckCircle2} 
            label="Completed" 
            value={completedCount} 
            color="emerald" 
            delay={0.15} 
          />
        </div>

        {/* Reviews List */}
        {Object.keys(reviewDetails).length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No reviews assigned"
            description="You don't have any proposal reviews assigned to you yet. Check back later for new assignments."
          />
        ) : (
          <div className="space-y-4">
            {proposals.filter(p => p.my_review).map((proposal, index) => {
              const review = reviewDetails[proposal.id];
              const StatusIcon = getStatusIcon(review?.status);
              
              return (
                <Card 
                  key={proposal.id} 
                  className="p-5 hover:shadow-md transition-all duration-300 animate-slide-up"
                  hover
                  style={{ animationDelay: `${0.2 + index * 0.03}s` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status={review?.status} type="review" />
                        {review?.due_date && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(review.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">{proposal.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{proposal.abstract}</p>
                      
                      {proposal.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {proposal.keywords.slice(0, 4).map(kw => (
                            <Badge key={kw} color="indigo" size="sm">{kw}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Score Summary if completed */}
                      {review?.status === 'completed' && review?.scores && (
                        <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                          <div className="text-sm">
                            <span className="text-slate-500">Overall: </span>
                            <span className="font-bold text-indigo-600">{review.scores.overall}/10</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-slate-500">Recommendation: </span>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              review.scores.recommendation === 'strong_accept' || review.scores.recommendation === 'accept'
                                ? 'bg-emerald-100 text-emerald-700'
                                : review.scores.recommendation === 'borderline'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {review.scores.recommendation?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedReviewId(review?.id)}
                      className="ml-4 btn-primary text-sm py-2"
                    >
                      {review?.status === 'completed' ? 'View' : 'Review'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReviewId && (
        <ReviewModal
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
          onUpdate={handleRefresh}
          token={token}
        />
      )}
    </DashboardLayout>
  );
}
