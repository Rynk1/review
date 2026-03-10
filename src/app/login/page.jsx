'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, LogIn, AlertCircle, ChevronDown } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    label: 'Stanford Admin',
    email: 'admin@stanford.edu',
    domain: 'stanford.edu',
    role: 'admin',
    description: 'Full system access, manage tenant config',
  },
  {
    label: 'Stanford Manager',
    email: 'manager@stanford.edu',
    domain: 'stanford.edu',
    role: 'manager',
    description: 'Assign reviewers, view all proposals',
  },
  {
    label: 'Stanford Reviewer (Dr. Alice Chen)',
    email: 'reviewer1@stanford.edu',
    domain: 'stanford.edu',
    role: 'reviewer',
    description: 'ML/Computer Vision expert',
  },
  {
    label: 'Stanford Reviewer (Dr. Bob Martinez)',
    email: 'reviewer2@stanford.edu',
    domain: 'stanford.edu',
    role: 'reviewer',
    description: 'NLP/Text Mining expert',
  },
  {
    label: 'Stanford Applicant',
    email: 'applicant@stanford.edu',
    domain: 'stanford.edu',
    role: 'applicant',
    description: 'Submit and manage proposals',
  },
  {
    label: 'MIT Manager',
    email: 'manager@mit.edu',
    domain: 'mit.edu',
    role: 'manager',
    description: 'MIT tenant manager',
  },
  {
    label: 'MIT Reviewer (Dr. David Kim)',
    email: 'reviewer1@mit.edu',
    domain: 'mit.edu',
    role: 'reviewer',
    description: 'Quantum Computing expert',
  },
  {
    label: 'Harvard Admin',
    email: 'admin@harvard.edu',
    domain: 'harvard.edu',
    role: 'admin',
    description: 'Harvard tenant admin',
  },
];

export default function LoginPage() {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      window.location.href = '/';
    }
  }, []);

  const handleLogin = async (account) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/sso/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          full_name: account.label,
          tenant_domain: account.domain,
          provider: 'demo',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store auth data
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      localStorage.setItem('auth_tenant', JSON.stringify(data.tenant));

      // Redirect based on role
      switch (data.user.role) {
        case 'applicant':
          window.location.href = '/proposals';
          break;
        case 'reviewer':
          window.location.href = '/reviews';
          break;
        case 'manager':
        case 'admin':
          window.location.href = '/dashboard';
          break;
        default:
          window.location.href = '/';
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'reviewer': return 'bg-green-100 text-green-800';
      case 'applicant': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDomainColor = (domain) => {
    switch (domain) {
      case 'stanford.edu': return 'text-red-600';
      case 'mit.edu': return 'text-gray-800';
      case 'harvard.edu': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 rounded-xl p-3">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Grant Review System</h1>
          <p className="text-gray-600 mt-2">Multi-Tenant Grant Application & Peer Review Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Demo Login</h2>
            <p className="text-sm text-gray-500">
              Select a demo account to explore the system. Each account has different permissions.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Account Grid */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                onClick={() => setSelectedAccount(account)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedAccount?.email === account.email
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        account.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        account.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                        account.role === 'reviewer' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {account.label.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{account.label}</span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(account.role)}`}>
                          {account.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${getDomainColor(account.domain)}`}>
                          {account.domain}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{account.description}</span>
                      </div>
                    </div>
                  </div>
                  {selectedAccount?.email === account.email && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => selectedAccount && handleLogin(selectedAccount)}
            disabled={!selectedAccount || loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Sign In as {selectedAccount?.label || 'Selected Account'}
              </>
            )}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              This is a demo environment. In production, authentication is handled via SAML/OIDC SSO
              configured per institution. All data is isolated by tenant.
            </p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { title: 'Multi-Tenant', desc: 'Isolated per institution' },
            { title: 'Peer Review', desc: 'Double-blind support' },
            { title: 'AI Matching', desc: 'Smart reviewer pairing' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white/60 backdrop-blur rounded-lg p-3 text-center">
              <div className="font-semibold text-gray-800 text-sm">{feature.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{feature.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
