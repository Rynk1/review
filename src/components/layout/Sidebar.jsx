'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  HelpCircle,
  Building2,
  Shield,
  Sparkles
} from 'lucide-react';

const MENU_ITEMS = {
  manager: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['manager', 'admin'] },
    { href: '/dashboard', icon: FileText, label: 'Proposals', roles: ['manager', 'admin'] },
    { href: '/reviewers', icon: Users, label: 'Reviewers', roles: ['manager', 'admin'] },
  ],
  admin: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['manager', 'admin'] },
    { href: '/dashboard', icon: FileText, label: 'Proposals', roles: ['manager', 'admin'] },
    { href: '/reviewers', icon: Users, label: 'Reviewers', roles: ['manager', 'admin'] },
  ],
  reviewer: [
    { href: '/reviews', icon: ClipboardList, label: 'My Reviews', roles: ['reviewer'] },
  ],
  applicant: [
    { href: '/proposals', icon: FileText, label: 'My Proposals', roles: ['applicant'] },
  ],
};

const ROLE_CONFIG = {
  admin: { icon: Shield, color: 'bg-purple-100 text-purple-700', label: 'Administrator' },
  manager: { icon: Building2, color: 'bg-blue-100 text-blue-700', label: 'Manager' },
  reviewer: { icon: Sparkles, color: 'bg-emerald-100 text-emerald-700', label: 'Reviewer' },
  applicant: { icon: GraduationCap, color: 'bg-amber-100 text-amber-700', label: 'Applicant' },
};

export function Sidebar({ user, tenant, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  
  const role = user?.role || 'applicant';
  const menuItems = MENU_ITEMS[role] || MENU_ITEMS.applicant;
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.applicant;
  const RoleIcon = roleConfig.icon;

  const isActive = (href) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard');
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside 
        className={`
          fixed left-0 top-0 h-screen bg-white border-r border-slate-200 
          flex flex-col transition-all duration-300 z-50
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo & Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm">Grant Review</span>
                <span className="text-xs text-slate-500 truncate max-w-[120px]">{tenant?.name || 'System'}</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-200 group
                      ${active 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    <div className={`
                      w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                      ${active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}
                      transition-colors
                    `}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {active && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-slate-100">
          <div
            className={`
              flex items-center gap-3 p-2 rounded-xl
              ${collapsed ? 'justify-center' : ''}
              hover:bg-slate-50 transition-colors cursor-pointer
            `}>
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
              ${roleConfig.color}
            `}>
              <RoleIcon className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {user?.full_name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-slate-500 truncate">{roleConfig.label}</div>
              </div>
            )}
          </div>
          
          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`
          flex-1 min-h-screen transition-all duration-300
          ${collapsed ? 'ml-20' : 'ml-64'}
        `}
      >
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search proposals, reviewers..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 ml-4">
              <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
              </button>
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Sidebar;
