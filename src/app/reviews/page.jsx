'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, LogOut, ClipboardList, CheckCircle, XCircle,
  AlertTriangle, Clock, Star, MessageSquare, X, ChevronRight,
  BookOpen, User, Calendar, AlertCircle, Send, Save
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
    assigned: { color: 'bg-blue-100 text-blue-700', label: 'Assigned' },
    accepted: { color: 'bg-indigo-100 text-indigo-700', label: 'Accepted' },
    declined: { color: 'bg-red-100 text-red-700', label: 'Declined' },
    in_progress: { color: 'bg-yellow-100 text-yellow-700', label: 'In Progress' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
    cancelled: { color: 'bg-gray-100 text-gray-500', label: 'Cancelled' },
  };
  const { color, label } = config[status] || config.assigned;
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
      {label}
    </span>
  );
}

function ScoreInput({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="1"
          max="10"
          value={value || 5}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <span className={`w-8 text-center text-sm font-bold ${
          value >= 8 ? 'text-green-600' : value >= 5 ? 'text-yellow-600' : 'text-red-600'
        }`}>
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

      // Pre-fill scores if exists
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Review Assignment</h2>
            {review && <StatusBadge status={review.status} />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error && !review ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : review ? (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              {/* Proposal Info */}
              <div className="bg-blue-50 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-2">{review.proposal?.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{review.proposal?.abstract}</p>
                {review.proposal?.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {review.proposal.keywords.map(kw => (
                      <span key={kw} className="inline-flex px-2 py-0.5 text-xs bg-white text-blue-700 rounded-full border border-blue-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                {review.proposal?.applicant_name && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    <span>Applicant: {review.proposal.applicant_name}</span>
                  </div>
                )}
              </div>

              {/* Review Dates */}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Assigned: {new Date(review.assigned_at).toLocaleDateString()}
                </div>
                {review.due_date && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Due: {new Date(review.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Action Buttons for Assigned Status */}
              {canAccept && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    You have been assigned to review this proposal. Please accept or decline.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction('accept')}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept Review
                    </button>
                    <button
                      onClick={() => handleAction('decline')}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-white text-red-600 border border-red-300 px-4 py-2 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Scoring Form */}
              {(canEdit || review.status === 'completed') && (
                <div className="space-y-5">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Evaluation Scores
                  </h4>

                  <div className="grid grid-cols-1 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Recommendation</label>
                    <select
                      value={scores.recommendation || 'accept'}
                      onChange={(e) => setScores(s => ({ ...s, recommendation: e.target.value }))}
                      disabled={!canEdit}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    >
                      <option value="strong_accept">Strong Accept</option>
                      <option value="accept">Accept</option>
                      <option value="borderline">Borderline</option>
                      <option value="reject">Reject</option>
                      <option value="strong_reject">Strong Reject</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <MessageSquare className="inline h-4 w-4 mr-1" />
                      Review Comments
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Provide detailed feedback on the proposal's strengths, weaknesses, and suggestions for improvement..."
                      rows={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50"
                    />
                  </div>
                </div>
              )}

              {/* Conflict Declaration Form */}
              {showConflictForm && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Declare Conflict of Interest
                  </h4>
                  <textarea
                    value={conflictReason}
                    onChange={(e) => setConflictReason(e.target.value)}
                    placeholder="Please describe the nature of your conflict of interest..."
                    rows={3}
                    className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('declare_conflict')}
                      disabled={submitting || !conflictReason.trim()}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Confirm Conflict
                    </button>
                    <button
                      onClick={() => setShowConflictForm(false)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
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
          <div className="p-6 border-t bg-gray-50 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {canDeclareConflict && !showConflictForm && (
                <button
                  onClick={() => setShowConflictForm(true)}
                  className="flex items-center gap-1.5 text-xs text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Declare Conflict
                </button>
              )}
              {canDecline && !canAccept && (
                <button
                  onClick={() => handleAction('decline')}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
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
                  className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" /> : <Save className="h-4 w-4" />}
                  Save Draft
                </button>
              )}
              {canSubmit && (
                <button
                  onClick={() => handleAction('submit')}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
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
      // Get proposals assigned to this reviewer
      const res = await fetch('/api/v1/proposals?limit=50', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/login'; return; }
        throw new Error('Failed to fetch assignments');
      }
      const data = await res.json();
      setProposals(data.proposals || []);

      // Fetch review details for each proposal
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  const pendingCount = Object.values(reviewDetails).filter(r => r.status === 'assigned').length;
  const inProgressCount = Object.values(reviewDetails).filter(r => ['accepted', 'in_progress'].includes(r.status)).length;
  const completedCount = Object.values(reviewDetails).filter(r => r.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} tenant={tenant} onLogout={handleLogout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-500 mt-1">Manage your assigned proposal reviews</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending Response', value: pendingCount, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
            { label: 'In Progress', value: inProgressCount, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: ClipboardList },
            { label: 'Completed', value: completedCount, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Reviews List */}
        {proposals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-200" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No reviews assigned</h3>
            <p className="text-gray-500">You have not been assigned any proposals to review yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => {
              const review = reviewDetails[proposal.id];
              return (
                <div key={proposal.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">{proposal.title}</h3>
                        {review && <StatusBadge status={review.status} />}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{proposal.abstract}</p>
                      {proposal.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {proposal.keywords.slice(0, 4).map(kw => (
                            <span key={kw} className="inline-flex px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {review && (
                        <button
                          onClick={() => setSelectedReviewId(review.id)}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                        >
                          {review.status === 'assigned' ? (
                            <>
                              <Clock className="h-4 w-4" />
                              Respond
                            </>
                          ) : review.status === 'completed' ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              View
                            </>
                          ) : (
                            <>
                              <ClipboardList className="h-4 w-4" />
                              Continue
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {review && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
                      <span>Assigned {new Date(review.assigned_at).toLocaleDateString()}</span>
                      {review.due_date && (
                        <span className={`flex items-center gap-1 ${
                          new Date(review.due_date) < new Date() ? 'text-red-500' : ''
                        }`}>
                          <Calendar className="h-3 w-3" />
                          Due {new Date(review.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {review.status === 'completed' && review.completed_at && (
                        <span className="text-green-600">
                          Completed {new Date(review.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
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
          onUpdate={() => fetchAssignedProposals(token)}
          token={token}
        />
      )}
    </div>
  );
}
