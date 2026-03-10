'use client';

import { useEffect } from 'react';

/**
 * Home page - redirects based on authentication status and role.
 */
export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');

    if (!token || !userStr) {
      window.location.href = '/login';
      return;
    }

    try {
      const user = JSON.parse(userStr);
      switch (user.role) {
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
          window.location.href = '/login';
      }
    } catch {
      window.location.href = '/login';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
