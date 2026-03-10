'use client';

import { useState, useEffect } from 'react';
import {
  GraduationCap, LogOut, Users, Search, Filter, BookOpen,
  CheckCircle, XCircle, AlertCircle, User, BarChart2, RefreshCw
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

function WorkloadBar({ current, limit }) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const color = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">{current}/{limit}</span>
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
  const [total, setTotal] = useState(0);

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

  const fetchReviewers = async (authToken, expertise = '', available = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (expertise) params.set('expertise', expertise);
      if (available) params.set('available', 'true');

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
    fetchReviewers(token, searchExpertise, filterAvailable);
  };

  if (loading && !reviewers.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviewers...</p>
        </div>
      </div>
    );
  }

  const availableCount = reviewers.filter(r => r.current_assignments < r.workload_limit).length;
  const optInCount = reviewers.filter(r => r.opt_in).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} tenant={tenant} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reviewer Pool</h1>
          <p className="text-gray-500 mt-1">Browse and manage reviewers in your institution</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <a href="/dashboard" className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            Proposals
          </a>
          <a href="/reviewers" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            Reviewers
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Reviewers', value: total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Available', value: availableCount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Opted In', value: optInCount, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
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

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by expertise (e.g., machine learning, genomics)..."
                value={searchExpertise}
                onChange={(e) => setSearchExpertise(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={filterAvailable}
                onChange={(e) => setFilterAvailable(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Available only</span>
            </label>
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button
              onClick={() => fetchReviewers(token)}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Reviewers Grid */}
        {reviewers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-200" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No reviewers found</h3>
            <p className="text-gray-500">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewers.map((reviewer) => (
              <div key={reviewer.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {(reviewer.full_name || reviewer.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{reviewer.full_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{reviewer.email}</div>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    reviewer.opt_in ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {reviewer.opt_in ? 'Active' : 'Opted Out'}
                  </span>
                </div>

                {reviewer.orcid && (
                  <div className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    ORCID: {reviewer.orcid}
                  </div>
                )}

                {/* Expertise Tags */}
                {reviewer.expertise?.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {reviewer.expertise.slice(0, 4).map(exp => (
                        <span key={exp} className="inline-flex px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                          {exp}
                        </span>
                      ))}
                      {reviewer.expertise.length > 4 && (
                        <span className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                          +{reviewer.expertise.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Areas */}
                {reviewer.areas && Object.values(reviewer.areas).some(arr => arr?.length > 0) && (
                  <div className="mb-3 text-xs text-gray-500">
                    {Object.entries(reviewer.areas).map(([key, items]) =>
                      items?.length > 0 ? (
                        <div key={key} className="mb-1">
                          <span className="font-medium capitalize">{key}: </span>
                          {items.slice(0, 2).join(', ')}
                          {items.length > 2 && ` +${items.length - 2}`}
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {/* Workload */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Workload</span>
                    <span className={`text-xs font-medium ${
                      reviewer.current_assignments >= reviewer.workload_limit
                        ? 'text-red-600'
                        : reviewer.current_assignments >= reviewer.workload_limit * 0.8
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {reviewer.current_assignments >= reviewer.workload_limit ? 'Full' : 'Available'}
                    </span>
                  </div>
                  <WorkloadBar
                    current={reviewer.current_assignments}
                    limit={reviewer.workload_limit}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
