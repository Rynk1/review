'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { Sidebar } from './Sidebar';

// Create context for user/tenant data
const DashboardContext = createContext(null);

export function useDashboard() {
  return useContext(DashboardContext);
}

export function DashboardLayout({ children, requiredRoles = [] }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tenant');
    localStorage.removeItem('demo_mode');
    window.location.href = '/login';
  }, []);

  const initAuth = useCallback(() => {
    if (initialized.current) return;
    initialized.current = true;

    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedTenant = localStorage.getItem('auth_tenant');

    if (!storedToken || !storedUser) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    
    // Check role permissions
    if (requiredRoles.length > 0 && !requiredRoles.includes(parsedUser.role)) {
      // Redirect based on role
      switch (parsedUser.role) {
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
      return;
    }

    // Use requestAnimationFrame to avoid setState in effect
    requestAnimationFrame(() => {
      setUser(parsedUser);
      setTenant(storedTenant ? JSON.parse(storedTenant) : null);
      setLoading(false);
      
      // Small delay for smooth transition
      setTimeout(() => setIsReady(true), 50);
    });
  }, [requiredRoles]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl animate-pulse" />
            <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          </div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{ user, tenant, handleLogout }}>
      <Sidebar user={user} tenant={tenant} onLogout={handleLogout}>
        <div className={`transition-all duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>
      </Sidebar>
    </DashboardContext.Provider>
  );
}

export default DashboardLayout;
