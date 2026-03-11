'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, LogIn, AlertCircle, Shield, Building2, Sparkles } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    label: 'Stanford Admin',
    email: 'admin@stanford.edu',
    domain: 'stanford.edu',
    role: 'admin',
    description: 'Full system access, manage tenant config',
    institution: 'Stanford University',
  },
  {
    label: 'Stanford Manager',
    email: 'manager@stanford.edu',
    domain: 'stanford.edu',
    role: 'manager',
    description: 'Assign reviewers, view all proposals',
    institution: 'Stanford University',
  },
  {
    label: 'Stanford Reviewer (Dr. Alice Chen)',
    email: 'reviewer1@stanford.edu',
    domain: 'stanford.edu',
    role: 'reviewer',
    description: 'ML/Computer Vision expert',
    institution: 'Stanford University',
  },
  {
    label: 'Stanford Reviewer (Dr. Bob Martinez)',
    email: 'reviewer2@stanford.edu',
    domain: 'stanford.edu',
    role: 'reviewer',
    description: 'NLP/Text Mining expert',
    institution: 'Stanford University',
  },
  {
    label: 'Stanford Applicant',
    email: 'applicant@stanford.edu',
    domain: 'stanford.edu',
    role: 'applicant',
    description: 'Submit and manage proposals',
    institution: 'Stanford University',
  },
  {
    label: 'MIT Manager',
    email: 'manager@mit.edu',
    domain: 'mit.edu',
    role: 'manager',
    description: 'MIT tenant manager',
    institution: 'MIT',
  },
  {
    label: 'MIT Reviewer (Dr. David Kim)',
    email: 'reviewer1@mit.edu',
    domain: 'mit.edu',
    role: 'reviewer',
    description: 'Quantum Computing expert',
    institution: 'MIT',
  },
  {
    label: 'Harvard Admin',
    email: 'admin@harvard.edu',
    domain: 'harvard.edu',
    role: 'admin',
    description: 'Harvard tenant admin',
    institution: 'Harvard University',
  },
];

const INSTITUTION_COLORS = {
  'stanford.edu': {
    bg: 'from-red-50 to-red-100/50',
    border: 'border-red-200',
    accent: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  'mit.edu': {
    bg: 'from-gray-50 to-gray-100/50',
    border: 'border-gray-200',
    accent: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-700',
  },
  'harvard.edu': {
    bg: 'from-red-50 to-red-100/50',
    border: 'border-red-200',
    accent: 'text-red-800',
    badge: 'bg-red-100 text-red-800',
  },
};

const ROLE_CONFIG = {
  admin: { icon: Shield, color: 'bg-purple-100 text-purple-700', label: 'Administrator' },
  manager: { icon: Building2, color: 'bg-blue-100 text-blue-700', label: 'Manager' },
  reviewer: { icon: Sparkles, color: 'bg-emerald-100 text-emerald-700', label: 'Reviewer' },
  applicant: { icon: GraduationCap, color: 'bg-amber-100 text-amber-700', label: 'Applicant' },
};

export default function LoginPage() {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredAccount, setHoveredAccount] = useState(null);

  useEffect(() => {
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

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      localStorage.setItem('auth_tenant', JSON.stringify(data.tenant));
      if (data.demoMode) {
        localStorage.setItem('demo_mode', 'true');
      }

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
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-emerald-300/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-50 to-white rounded-full blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-4xl">
        {/* Premium Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-2xl blur-xl opacity-30 animate-pulse-subtle" />
              <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-4 shadow-lg shadow-indigo-500/25">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Grant Review System
          </h1>
          <p className="text-slate-500 mt-3 text-lg max-w-md mx-auto">
            Multi-Tenant Grant Application & Peer Review Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="card p-1 animate-slide-up stagger-2" style={{ animationDelay: '0.1s' }}>
          <div className="bg-white rounded-[0.875rem] p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Demo Login</h2>
              <p className="text-sm text-slate-500 mt-1">
                Select a demo account to explore the system with different roles and permissions.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Authentication Failed</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Account Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {DEMO_ACCOUNTS.map((account, index) => {
                const instColors = INSTITUTION_COLORS[account.domain];
                const roleConfig = ROLE_CONFIG[account.role];
                const isSelected = selectedAccount?.email === account.email;
                const isHovered = hoveredAccount === account.email;
                const RoleIcon = roleConfig.icon;

                return (
                  <button
                    key={account.email}
                    onClick={() => setSelectedAccount(account)}
                    onMouseEnter={() => setHoveredAccount(account.email)}
                    onMouseLeave={() => setHoveredAccount(null)}
                    className={`
                      relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${isSelected 
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-500/10' 
                        : isHovered
                          ? 'border-slate-300 bg-slate-50 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }
                      animate-slide-up
                    `}
                    style={{ animationDelay: `${0.15 + index * 0.03}s` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                        ${roleConfig.color}
                      `}>
                        <RoleIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm truncate">
                            {account.label}
                          </span>
                          <span className={`
                            inline-flex px-2 py-0.5 text-xs font-medium rounded-full
                            ${roleConfig.color}
                          `}>
                            {roleConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-xs font-medium ${instColors.accent}`}>
                            {account.institution}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 truncate">{account.description}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center animate-scale-in">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Login Button */}
            <button
              onClick={() => selectedAccount && handleLogin(selectedAccount)}
              disabled={!selectedAccount || loading}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Sign In{selectedAccount ? ` as ${selectedAccount.label.split(' (')[0]}` : ''}</span>
                </>
              )}
            </button>

            {/* Footer Note */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700">Demo Environment</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    This is a demonstration. Production authentication uses SAML/OIDC SSO configured per institution. All data is isolated by tenant.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4 animate-slide-up stagger-6" style={{ animationDelay: '0.3s' }}>
          {[
            { 
              title: 'Multi-Tenant', 
              desc: 'Isolated per institution',
              icon: Building2,
              color: 'from-indigo-50 to-indigo-100/50',
              iconColor: 'text-indigo-600',
            },
            { 
              title: 'Peer Review', 
              desc: 'Double-blind support',
              icon: Shield,
              color: 'from-emerald-50 to-emerald-100/50',
              iconColor: 'text-emerald-600',
            },
            { 
              title: 'AI Matching', 
              desc: 'Smart reviewer pairing',
              icon: Sparkles,
              color: 'from-amber-50 to-amber-100/50',
              iconColor: 'text-amber-600',
            },
          ].map((feature) => (
            <div 
              key={feature.title} 
              className={`
                bg-gradient-to-br ${feature.color} 
                backdrop-blur-sm rounded-xl p-4 text-center
                border border-white/50 shadow-sm
                hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
              `}
            >
              <div className={`
                inline-flex items-center justify-center w-10 h-10 rounded-xl 
                bg-white shadow-sm mb-2
              `}>
                <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
              </div>
              <div className="font-semibold text-slate-800 text-sm">{feature.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{feature.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
