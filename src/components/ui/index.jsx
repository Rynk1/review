import { 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Edit3,
  Send,
  FileText,
  Users,
  Star,
  Calendar,
  AlertCircle,
  CheckSquare,
  BarChart3
} from 'lucide-react';

// Status Badge Component
export function StatusBadge({ status, type = 'proposal' }) {
  const proposalConfig = {
    draft: { color: 'bg-slate-100 text-slate-700', icon: Edit3, label: 'Draft' },
    submitted: { color: 'bg-blue-100 text-blue-700', icon: Send, label: 'Submitted' },
    under_review: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Under Review' },
    accepted: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Accepted' },
    rejected: { color: 'bg-rose-100 text-rose-700', icon: XCircle, label: 'Rejected' },
    withdrawn: { color: 'bg-slate-100 text-slate-500', icon: XCircle, label: 'Withdrawn' },
  };

  const reviewConfig = {
    assigned: { color: 'bg-blue-100 text-blue-700', icon: Users, label: 'Assigned' },
    accepted: { color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle, label: 'Accepted' },
    declined: { color: 'bg-rose-100 text-rose-700', icon: XCircle, label: 'Declined' },
    in_progress: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'In Progress' },
    completed: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Completed' },
    cancelled: { color: 'bg-slate-100 text-slate-500', icon: XCircle, label: 'Cancelled' },
  };

  const config = type === 'review' ? reviewConfig : proposalConfig;
  const { color, icon: Icon, label } = config[status] || config.draft;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// Stat Card Component
export function StatCard({ icon: Icon, label, value, color, trend, subtext, delay = 0 }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', gradient: 'from-rose-500 to-red-600' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', gradient: 'from-slate-500 to-slate-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-500 to-indigo-600' },
  };
  
  const colors = colorClasses[color] || colorClasses.blue;
  
  return (
    <div 
      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors.bg} group-hover:scale-110 transition-transform`}>
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-slate-500'
          }`}>
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
        {label}
        {subtext && <span className="text-slate-400">({subtext})</span>}
      </div>
    </div>
  );
}

// Empty State Component
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center animate-slide-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 mb-6 max-w-sm mx-auto">{description}</p>
      {action}
    </div>
  );
}

// Loading Spinner
export function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizes[size]} border-b-indigo-600 rounded-full animate-spin`} />
      {text && <p className="text-slate-500 mt-4">{text}</p>}
    </div>
  );
}

// Alert Component
export function Alert({ type = 'error', message, onDismiss }) {
  const types = {
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertCircle },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: AlertCircle },
  };
  
  const config = types[type] || types.error;
  const Icon = config.icon;
  
  return (
    <div className={`${config.bg} ${config.border} border rounded-xl p-4 mb-4 flex items-start gap-3 animate-fade-in`}>
      <Icon className={`h-5 w-5 ${config.text} flex-shrink-0 mt-0.5`} />
      <p className={`text-sm ${config.text} flex-1`}>{message}</p>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Card Component
export function Card({ children, className = '', hover = false }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${hover ? 'hover:shadow-md transition-shadow duration-300' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Progress Bar
export function ProgressBar({ value, max = 100, color = 'indigo', showLabel = true }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colors = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
  };
  
  const barColor = colors[color] || colors.indigo;
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div 
          className={`${barColor} h-full rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-500 font-medium min-w-[40px] text-right">
          {value}/{max}
        </span>
      )}
    </div>
  );
}

// Avatar Component
export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };
  
  const initial = (name || '?').charAt(0).toUpperCase();
  
  return (
    <div className={`${sizes[size]} rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-semibold ${className}`}>
      {initial}
    </div>
  );
}

// Badge Component
export function Badge({ children, color = 'indigo', size = 'sm' }) {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    purple: 'bg-purple-100 text-purple-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colors[color]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

// Workload Bar Component
export function WorkloadBar({ current, limit }) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  
  const getColor = () => {
    if (pct >= 80) return 'bg-rose-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };
  
  const getStatus = () => {
    if (pct >= 100) return { text: 'Full', color: 'text-rose-600' };
    if (pct >= 80) return { text: 'Near Capacity', color: 'text-amber-600' };
    return { text: 'Available', color: 'text-emerald-600' };
  };
  
  const status = getStatus();
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Workload</span>
        <span className={`font-medium ${status.color}`}>{status.text}</span>
      </div>
      <ProgressBar value={current} max={limit} color={pct >= 80 ? 'rose' : pct >= 60 ? 'amber' : 'emerald'} />
    </div>
  );
}

// Score Input Component
export function ScoreInput({ label, value, onChange, disabled, min = 1, max = 10 }) {
  const getColor = (val) => {
    if (val >= 8) return 'text-emerald-600';
    if (val >= 5) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getLabel = (val) => {
    if (val >= 8) return 'Excellent';
    if (val >= 6) return 'Good';
    if (val >= 4) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <div className="text-right">
          <span className={`text-lg font-bold ${getColor(value)}`}>{value}</span>
          <span className="text-xs text-slate-400 ml-1">/ {max}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value || min}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
        />
        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${getColor(value)} bg-slate-50`}>
          {getLabel(value)}
        </span>
      </div>
    </div>
  );
}
