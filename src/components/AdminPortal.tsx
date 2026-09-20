import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  TrendingUp, 
  BookOpen, 
  Calendar, 
  School, 
  Search, 
  RefreshCw, 
  Download, 
  X, 
  Megaphone, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  UserCheck, 
  GraduationCap, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  CalendarDays,
  Lock,
  Mail,
  LogOut,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  Sun,
  Moon,
  Database,
  BarChart3,
  Layers,
  ArrowUpRight,
  Smartphone,
  Copy,
  Check,
  Zap,
  Bell,
  Flame,
  Filter,
  Info,
  UserPlus,
  Radio
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { 
  loginAdmin, 
  getAdminSession, 
  logoutAdmin, 
  AdminSession,
  fetchAdminMetrics, 
  fetchAdminActivityChart, 
  fetchAdminUsersList, 
  fetchAdminSchoolsBreakdown, 
  fetchAllAdminAnnouncements,
  createAdminAnnouncement,
  toggleAdminAnnouncementActive,
  deleteAdminAnnouncement,
  exportUsersToCSV,
  AdminMetrics, 
  DailyActivityStat, 
  AdminUserItem, 
  SchoolBreakdown 
} from '../services/adminService';
import { Announcement } from '../types';
import { triggerLightHaptic, triggerSuccessHaptic, triggerSelectionHaptic } from '../services/hapticsService';

interface AdminPortalProps {
  onExit?: () => void;
}

export type AdminPortalTab = 'dashboard' | 'users' | 'schools' | 'announcements';
export type UserFilterPreset = 'all' | 'active24h' | 'highCourses' | 'hasSection';
export type SortColumn = 'fullName' | 'schoolName' | 'totalCourses' | 'lastActiveAt' | 'createdAt';
export type SortDirection = 'asc' | 'desc';
export type ChartMetricMode = 'active' | 'signups' | 'both';

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExit }) => {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => getAdminSession());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('eljohnsienes@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<AdminPortalTab>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Analytics Data
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [activityChart, setActivityChart] = useState<DailyActivityStat[]>([]);
  const [chartDays, setChartDays] = useState<number>(14);
  const [chartMetricMode, setChartMetricMode] = useState<ChartMetricMode>('both');
  const [hoveredDataPoint, setHoveredDataPoint] = useState<DailyActivityStat | null>(null);

  // Users Directory Data
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [filterPreset, setFilterPreset] = useState<UserFilterPreset>('all');
  const [sortCol, setSortCol] = useState<SortColumn>('lastActiveAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const pageSize = 20;

  // Schools Breakdown Data
  const [schools, setSchools] = useState<SchoolBreakdown[]>([]);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');

  // Announcements Data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<Announcement['type']>('banner');
  const [newVariant, setNewVariant] = useState<Announcement['variant']>('info');
  const [newActionText, setNewActionText] = useState('');
  const [newActionUrl, setNewActionUrl] = useState('');

  // Synchronize document theme class
  useEffect(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  }, [theme]);

  const toggleTheme = () => {
    triggerLightHaptic();
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    triggerLightHaptic();
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerLightHaptic();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await loginAdmin(loginEmail, loginPassword);
      if (res.success && res.session) {
        triggerSuccessHaptic();
        setAdminSession(res.session);
      } else {
        setLoginError(res.error || 'Invalid administrator credentials');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Admin Logout
  const handleAdminLogout = () => {
    triggerLightHaptic();
    logoutAdmin();
    setAdminSession(null);
    setLoginPassword('');
  };

  // Load Dashboard Data
  const loadDashboardData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const [metricsData, chartData, schoolsData, announcementsData] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminActivityChart(chartDays),
        fetchAdminSchoolsBreakdown(),
        fetchAllAdminAnnouncements()
      ]);

      setMetrics(metricsData);
      setActivityChart(chartData);
      setSchools(schoolsData);
      setAnnouncements(announcementsData);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Error loading admin portal data:', err);
      if (showIndicator) {
        showToast('Error syncing metrics: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [chartDays]);

  // Load Users List
  const loadUsersList = useCallback(async () => {
    try {
      const offset = (currentPage - 1) * pageSize;
      const result = await fetchAdminUsersList({
        searchQuery,
        schoolFilter,
        limit: pageSize,
        offset
      });
      setUsers(result.users);
      setTotalUsersCount(result.totalCount);
    } catch (err) {
      console.error('Failed to load users list:', err);
    }
  }, [searchQuery, schoolFilter, currentPage]);

  // Initial Load
  useEffect(() => {
    if (adminSession) {
      loadDashboardData(true);
      loadUsersList();
    }
  }, [adminSession, loadDashboardData, loadUsersList]);

  // Search / Filter / Page changes
  useEffect(() => {
    if (adminSession) {
      loadUsersList();
    }
  }, [searchQuery, schoolFilter, currentPage, adminSession, loadUsersList]);

  // Realtime Subscriptions & Background Pulse Heartbeat
  useEffect(() => {
    if (!adminSession) return;

    // Realtime channel for instant updates on new signups or profile activities
    const channel = supabase
      .channel('admin-metrics-live-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadDashboardData(false);
        loadUsersList();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_activity_logs' }, () => {
        loadDashboardData(false);
      })
      .subscribe();

    // 15-second heartbeat poll for real-time active user windows
    const heartbeatInterval = setInterval(() => {
      loadDashboardData(false);
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeatInterval);
    };
  }, [adminSession, loadDashboardData, loadUsersList]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    try {
      showToast('Preparing student dataset export...');
      const fullList = await fetchAdminUsersList({ limit: 5000, offset: 0 });
      exportUsersToCSV(fullList.users);
      triggerSuccessHaptic();
      showToast('Student dataset exported to CSV');
    } catch (err) {
      showToast('Failed to export dataset');
    }
  };

  // Preset Announcements Template Loader
  const applyAnnouncementTemplate = (templateKey: string) => {
    triggerSelectionHaptic();
    if (templateKey === 'exam') {
      setNewTitle('Midterm Examination Schedules');
      setNewMessage('Midterm examination schedules and room assignments are now synchronized. Please check your timetable for updates.');
      setNewType('modal');
      setNewVariant('info');
      setNewActionText('Review Exam Schedule');
      setNewActionUrl('#');
    } else if (templateKey === 'maintenance') {
      setNewTitle('System Maintenance Notice');
      setNewMessage('Schedly Cloud sync will undergo brief scheduled maintenance this Sunday from 2:00 AM to 3:00 AM UTC. Offline access remains active.');
      setNewType('banner');
      setNewVariant('warning');
      setNewActionText('Learn More');
      setNewActionUrl('#');
    } else if (templateKey === 'feature') {
      setNewTitle('New: Instant Schedule Sharing');
      setNewMessage('You can now export your semester class schedule with dynamic color tags and instant QR code sharing with your classmates!');
      setNewType('toast');
      setNewVariant('update');
      setNewActionText('Try It Now');
      setNewActionUrl('#');
    } else if (templateKey === 'alert') {
      setNewTitle('Campus Advisory / Class Suspension');
      setNewMessage('Due to inclement weather conditions, all on-campus afternoon classes are shifted to asynchronous online setup.');
      setNewType('banner');
      setNewVariant('alert');
      setNewActionText('Campus Memo');
      setNewActionUrl('#');
    }
    setIsCreatingAnnouncement(true);
  };

  // Handle Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      showToast('Title and message are required');
      return;
    }

    try {
      await createAdminAnnouncement({
        title: newTitle,
        message: newMessage,
        type: newType,
        variant: newVariant,
        actionText: newActionText || null,
        actionUrl: newActionUrl || null,
        isActive: true,
        dismissible: true
      });

      triggerSuccessHaptic();
      showToast('Broadcast published to all students!');
      setIsCreatingAnnouncement(false);
      setNewTitle('');
      setNewMessage('');
      setNewActionText('');
      setNewActionUrl('');
      
      const refreshedAnnouncements = await fetchAllAdminAnnouncements();
      setAnnouncements(refreshedAnnouncements);
    } catch (err: any) {
      showToast('Broadcast error: ' + err.message);
    }
  };

  // Handle Toggle Active
  const handleToggleAnnouncement = async (id: string, currentActive: boolean) => {
    try {
      await toggleAdminAnnouncementActive(id, !currentActive);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive: !currentActive } : a));
      showToast(`Announcement ${!currentActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showToast('Failed to update announcement');
    }
  };

  // Handle Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Permanently delete this announcement?')) return;
    try {
      await deleteAdminAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showToast('Announcement deleted');
    } catch (err) {
      showToast('Failed to delete announcement');
    }
  };

  // Filtered and Sorted Users (Client-side refinement on page)
  const processedUsers = useMemo(() => {
    let list = [...users];

    // Presets
    if (filterPreset === 'active24h') {
      const dayAgo = Date.now() - 86400000;
      list = list.filter(u => u.lastActiveAt && new Date(u.lastActiveAt).getTime() > dayAgo);
    } else if (filterPreset === 'highCourses') {
      list = list.filter(u => (u.totalCourses || 0) >= 6);
    } else if (filterPreset === 'hasSection') {
      list = list.filter(u => !!u.section);
    }

    // Sort
    list.sort((a, b) => {
      let valA: any = a[sortCol];
      let valB: any = b[sortCol];

      if (sortCol === 'lastActiveAt' || sortCol === 'createdAt') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [users, filterPreset, sortCol, sortDir]);

  // Handle Sort Change
  const handleSort = (col: SortColumn) => {
    triggerLightHaptic();
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    if (!schoolSearchQuery.trim()) return schools;
    return schools.filter(s => s.schoolName.toLowerCase().includes(schoolSearchQuery.toLowerCase()));
  }, [schools, schoolSearchQuery]);

  // Chart Calculations for Interactive Multi-Series Smooth Area Chart
  const maxActiveUsers = Math.max(...activityChart.map(c => c.activeUsers), 1);
  const maxSignups = Math.max(...activityChart.map(c => c.newSignups), 1);
  const chartMaxScale = Math.max(maxActiveUsers, maxSignups, 1);

  const avgActivity = Math.round(
    activityChart.reduce((acc, curr) => acc + curr.activeUsers, 0) / (activityChart.length || 1)
  );
  const totalPeriodSignups = activityChart.reduce((acc, curr) => acc + curr.newSignups, 0);

  // SVG Multi-Series Area Chart Generator
  const svgMultiChart = useMemo(() => {
    if (activityChart.length === 0) return { active: null, signups: null, points: [] };
    const width = 800;
    const height = 190;
    const padding = 30;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    const points = activityChart.map((d, index) => {
      const x = padding + (index / (activityChart.length - 1 || 1)) * innerWidth;
      const yActive = height - padding - (d.activeUsers / chartMaxScale) * innerHeight;
      const ySignup = height - padding - (d.newSignups / chartMaxScale) * innerHeight;
      return { x, yActive, ySignup, data: d };
    });

    if (points.length === 1) {
      return {
        active: { path: `M ${points[0].x} ${points[0].yActive}`, area: '' },
        signups: { path: `M ${points[0].x} ${points[0].ySignup}`, area: '' },
        points
      };
    }

    // Bézier generator for active users
    let activePath = `M ${points[0].x} ${points[0].yActive}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      activePath += ` C ${cpX} ${p0.yActive}, ${cpX} ${p1.yActive}, ${p1.x} ${p1.yActive}`;
    }
    const activeArea = `${activePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    // Bézier generator for new signups
    let signupPath = `M ${points[0].x} ${points[0].ySignup}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      signupPath += ` C ${cpX} ${p0.ySignup}, ${cpX} ${p1.ySignup}, ${p1.x} ${p1.ySignup}`;
    }
    const signupArea = `${signupPath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return {
      active: { path: activePath, area: activeArea },
      signups: { path: signupPath, area: signupArea },
      points
    };
  }, [activityChart, chartMaxScale]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // ==========================================
  // VIEW 1: DEDICATED ADMIN LOGIN SCREEN
  // ==========================================
  if (!adminSession) {
    return (
      <div 
        className="schedly-app-root"
        style={{
          minHeight: '100vh',
          width: '100vw',
          background: 'var(--ios-bg-primary)',
          color: 'var(--ios-text-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        <div 
          className="ios-card"
          style={{
            width: '100%',
            maxWidth: '430px',
            borderRadius: '26px',
            padding: '36px 32px',
            boxShadow: 'var(--ios-shadow-lg), 0 0 0 1px rgba(245, 158, 11, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 28px -6px rgba(245, 158, 11, 0.45)'
              }}
            >
              <ShieldCheck size={36} />
            </div>

            <div>
              <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ios-text-primary)' }}>
                Schedly Admin Portal
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ios-text-secondary)' }}>
                Superadmin Gateway & Live Campus Analytics
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--ios-red, #EF4444)',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{loginError}</span>
            </div>
          )}

          {/* Admin Login Form */}
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Admin Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@schedly.app"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '12px',
                    background: 'var(--ios-bg-secondary)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Admin Password
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '12px',
                    background: 'var(--ios-bg-secondary)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                marginTop: '8px',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#fff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 800,
                cursor: isLoggingIn ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.15s ease'
              }}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Authenticate as Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Return link */}
          {onExit && (
            <div style={{ textAlign: 'center', borderTop: '1px solid var(--ios-card-border)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={onExit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ios-text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600
                }}
              >
                <ArrowLeft size={14} />
                <span>Return to Student Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DESKTOP-MATCHING ADMIN WORKSPACE
  // ==========================================
  const SIDEBAR_TABS = [
    { key: 'dashboard', label: 'Dashboard & KPIs', icon: BarChart3, badge: null },
    { key: 'users', label: 'Student Directory', icon: Users, badge: metrics?.totalUsers || 0 },
    { key: 'schools', label: 'Campus Breakdown', icon: School, badge: metrics?.totalSchools || 0 },
    { key: 'announcements', label: 'Broadcast Studio', icon: Megaphone, badge: announcements.filter(a => a.isActive).length }
  ];

  return (
    <div className="schedly-app-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--ios-card-bg)',
            color: 'var(--ios-text-primary)',
            padding: '12px 20px',
            borderRadius: '14px',
            boxShadow: 'var(--ios-shadow-lg), 0 0 0 1px var(--ios-card-border)',
            zIndex: 10000,
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <Sparkles size={16} color="#F59E0B" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Identical Shell Layout */}
      <div className="app-shell-layout">
        {/* Left Desktop Side Panel */}
        <aside className="desktop-sidebar-container" aria-label="Admin Navigation">
          {/* Brand Header */}
          <div className="desktop-sidebar-header">
            <div className="desktop-sidebar-brand">
              <div 
                className="desktop-sidebar-logo-box"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: '0 8px 16px -4px rgba(245, 158, 11, 0.4)'
                }}
              >
                <ShieldCheck size={20} color="#fff" />
              </div>
              <div className="desktop-sidebar-brand-text">
                <div className="desktop-brand-title">Schedly</div>
                <div className="desktop-brand-subtitle" style={{ color: '#D97706', fontWeight: 800 }}>
                  Superadmin Hub
                </div>
              </div>
            </div>
          </div>

          {/* Admin Profile Card */}
          <div 
            className="desktop-sidebar-profile-card"
            style={{ 
              border: '1px solid rgba(245, 158, 11, 0.25)', 
              background: 'rgba(245, 158, 11, 0.05)',
              padding: '12px 14px'
            }}
          >
            <div 
              className="desktop-profile-avatar"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#fff', fontWeight: 800 }}
            >
              <span>ES</span>
            </div>
            <div className="desktop-profile-info">
              <div className="desktop-profile-name">{adminSession.fullName || 'Administrator'}</div>
              <div className="desktop-profile-sub" style={{ color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={11} /> Superadmin
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="desktop-sidebar-nav">
            <div className="desktop-nav-section-label">COMMAND WORKSPACES</div>
            {SIDEBAR_TABS.map(({ key, label, icon: Icon, badge }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`desktop-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    triggerSelectionHaptic();
                    setActiveTab(key as AdminPortalTab);
                  }}
                  aria-selected={isActive}
                >
                  <div className="desktop-nav-icon-wrap" style={{ color: isActive ? '#fff' : undefined }}>
                    <Icon size={18} />
                  </div>
                  <span className="desktop-nav-label" style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                  {badge !== null && badge > 0 && (
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        padding: '2px 7px', 
                        borderRadius: '10px', 
                        background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--ios-bg-secondary)',
                        color: isActive ? '#fff' : 'var(--ios-text-secondary)'
                      }}
                    >
                      {badge}
                    </span>
                  )}
                  {isActive && <div className="desktop-nav-active-indicator" />}
                </button>
              );
            })}

            {/* Quick Actions in Sidebar */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--ios-card-border)' }}>
              <div className="desktop-nav-section-label">ACTIONS & UTILITIES</div>
              
              <button
                type="button"
                className="desktop-nav-item"
                onClick={handleExportCSV}
                title="Download complete student dataset (CSV)"
              >
                <div className="desktop-nav-icon-wrap">
                  <Download size={17} />
                </div>
                <span className="desktop-nav-label">Export CSV Roster</span>
              </button>

              {onExit && (
                <button
                  type="button"
                  className="desktop-nav-item"
                  onClick={onExit}
                  title="Switch to student timetable view"
                >
                  <div className="desktop-nav-icon-wrap">
                    <ArrowLeft size={17} />
                  </div>
                  <span className="desktop-nav-label">Student Timetable</span>
                </button>
              )}

              <button
                type="button"
                className="desktop-nav-item"
                onClick={handleAdminLogout}
                style={{ color: 'var(--ios-red, #EF4444)' }}
                title="Log out of Superadmin"
              >
                <div className="desktop-nav-icon-wrap" style={{ color: 'var(--ios-red, #EF4444)' }}>
                  <LogOut size={17} />
                </div>
                <span className="desktop-nav-label">Sign Out</span>
              </button>
            </div>
          </nav>

          {/* Sidebar Footer (Live Connection + Theme Toggle) */}
          <div className="desktop-sidebar-footer">
            <div 
              className="desktop-sync-badge online"
              onClick={() => loadDashboardData(true)}
              style={{ cursor: 'pointer' }}
              title={`Live Realtime Connected • Synced at ${lastSyncTime.toLocaleTimeString()}`}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw size={13} className="spin-animation" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ios-green)', animation: 'pulse 1.5s infinite' }} />
                  <span>Realtime Live</span>
                </>
              )}
            </div>

            <button
              type="button"
              className="desktop-theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} color="#F59E0B" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="var(--ios-blue)" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="app-main-content">
          {/* Top Utility Header Bar */}
          <header className="top-utility-row">
            <div className="top-utility-left">
              <div className="top-utility-greeting-row">
                <span className="top-utility-subheading">{getGreeting()},</span>
                <h1 className="top-utility-greeting">{adminSession.fullName || 'Eljohn'}</h1>
              </div>
            </div>

            <div className="top-utility-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Realtime Active Pulse Badge */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 12px', 
                  borderRadius: '10px', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--ios-green)'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ios-green)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)' }} />
                <span>{metrics?.activeNow15m || 0} Online Now (15m)</span>
              </div>

              <button
                type="button"
                onClick={() => loadDashboardData(true)}
                disabled={isRefreshing}
                className="ios-button-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={isRefreshing ? 'spin-animation' : ''} />
                <span>Sync</span>
              </button>
            </div>
          </header>

          {/* Body Content Workspaces */}
          <main style={{ paddingBottom: '40px' }}>
            {/* ========================================================= */}
            {/* TAB 1: DASHBOARD & KPIS */}
            {/* ========================================================= */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Real-time Status Banner Strip */}
                <div 
                  className="ios-card"
                  style={{
                    padding: '14px 20px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
                    border: '1px solid rgba(37, 99, 235, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ios-green)', boxShadow: '0 0 10px rgba(16, 185, 129, 0.7)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                      Live Platform Pulse
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
                      • {metrics?.activeNow15m || 0} active in last 15 min • {metrics?.activeNow1h || 0} in last 1 hour
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', fontWeight: 700 }}>
                    <div style={{ color: 'var(--ios-blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserPlus size={14} />
                      <span>+{metrics?.signupsToday || 0} signups today</span>
                    </div>
                    <span style={{ color: 'var(--ios-text-muted)' }}>|</span>
                    <div style={{ color: 'var(--ios-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Activity size={14} />
                      <span>{metrics?.dauToday || 0} daily active (DAU)</span>
                    </div>
                  </div>
                </div>

                {/* Bento KPI Grid */}
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                    gap: '16px' 
                  }}
                >
                  {/* CARD 1: DAU & REALTIME ACTIVE */}
                  <div 
                    className="ios-card" 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '22px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Active Today (DAU)
                        </span>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ios-green)' }} />
                      </div>
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--ios-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={20} />
                      </div>
                    </div>
                    <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--ios-text-primary)' }}>
                      {metrics?.dauToday.toLocaleString() || 0}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--ios-card-border)' }}>
                      <span style={{ color: 'var(--ios-text-secondary)' }}>Realtime Activity</span>
                      <span style={{ color: 'var(--ios-green)', fontWeight: 700 }}>
                        {metrics?.activeNow15m || 0} online now
                      </span>
                    </div>
                  </div>

                  {/* CARD 2: NEW SIGNUPS (TODAY, 7D, 30D) */}
                  <div 
                    className="ios-card" 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '22px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        New Signups Today
                      </span>
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--ios-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserPlus size={20} />
                      </div>
                    </div>
                    <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--ios-blue)' }}>
                      +{metrics?.signupsToday.toLocaleString() || 0}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--ios-card-border)' }}>
                      <span style={{ color: 'var(--ios-text-secondary)' }}>Past 7d / 30d</span>
                      <span style={{ color: 'var(--ios-blue)', fontWeight: 700 }}>
                        +{metrics?.signups7d || 0} (7d) • +{metrics?.signups30d || 0} (30d)
                      </span>
                    </div>
                  </div>

                  {/* CARD 3: TOTAL REGISTERED STUDENTS */}
                  <div 
                    className="ios-card" 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '22px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Registered
                      </span>
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} />
                      </div>
                    </div>
                    <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--ios-text-primary)' }}>
                      {metrics?.totalUsers.toLocaleString() || 0}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--ios-card-border)' }}>
                      <span style={{ color: 'var(--ios-text-secondary)' }}>Campuses</span>
                      <span style={{ color: '#8B5CF6', fontWeight: 700 }}>{metrics?.totalSchools || 0} Universities</span>
                    </div>
                  </div>

                  {/* CARD 4: STICKINESS & RETENTION (DAU / MAU) */}
                  <div 
                    className="ios-card" 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '22px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Stickiness (DAU/MAU)
                      </span>
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.12)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserCheck size={20} />
                      </div>
                    </div>
                    <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--ios-text-primary)' }}>
                      {metrics?.stickinessRate}%
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--ios-card-border)' }}>
                      <span style={{ color: 'var(--ios-text-secondary)' }}>MAU: {metrics?.mau30d || 0}</span>
                      <span style={{ color: '#EC4899', fontWeight: 700 }}>
                        {Number(metrics?.stickinessRate || 0) >= 15 ? '🔥 High Retention' : '✨ Steady'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary Counters Strip */}
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: '12px' 
                  }}
                >
                  <div className="ios-card" style={{ padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--ios-blue)' }}>
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>TOTAL COURSES</div>
                      <div style={{ fontSize: '20px', fontWeight: 800 }}>{metrics?.totalCourses.toLocaleString() || 0}</div>
                    </div>
                  </div>
                  <div className="ios-card" style={{ padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>TOTAL SCHEDULES</div>
                      <div style={{ fontSize: '20px', fontWeight: 800 }}>{metrics?.totalSchedules.toLocaleString() || 0}</div>
                    </div>
                  </div>
                  <div className="ios-card" style={{ padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>EVENTS & EXAMS</div>
                      <div style={{ fontSize: '20px', fontWeight: 800 }}>{metrics?.totalEvents.toLocaleString() || 0}</div>
                    </div>
                  </div>
                  <div className="ios-card" style={{ padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                      <School size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>CAMPUSES</div>
                      <div style={{ fontSize: '20px', fontWeight: 800 }}>{metrics?.totalSchools.toLocaleString() || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Interactive Multi-Series Area & Signups Chart */}
                <div className="ios-card" style={{ padding: '28px', borderRadius: '24px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                          Daily Activity & Student Signups
                        </h3>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--ios-blue)' }}>
                          {totalPeriodSignups} New Signups in period
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ios-text-secondary)' }}>
                        Interactive timeline comparing active student sessions and new user registrations
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* Metric Mode Switcher */}
                      <div style={{ display: 'flex', background: 'var(--ios-bg-secondary)', padding: '3px', borderRadius: '10px', border: '1px solid var(--ios-card-border)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setChartMetricMode('both');
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: chartMetricMode === 'both' ? 'var(--ios-card-bg)' : 'transparent',
                            color: chartMetricMode === 'both' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Combined
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setChartMetricMode('active');
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: chartMetricMode === 'active' ? 'var(--ios-card-bg)' : 'transparent',
                            color: chartMetricMode === 'active' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Active Users
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setChartMetricMode('signups');
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: chartMetricMode === 'signups' ? 'var(--ios-card-bg)' : 'transparent',
                            color: chartMetricMode === 'signups' ? '#10B981' : 'var(--ios-text-secondary)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Signups
                        </button>
                      </div>

                      {/* Day Horizon */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[7, 14, 30].map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => {
                              triggerLightHaptic();
                              setChartDays(days);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: chartDays === days ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                              color: chartDays === days ? '#fff' : 'var(--ios-text-secondary)',
                              border: '1px solid var(--ios-card-border)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {days}D
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', fontSize: '12px', fontWeight: 700 }}>
                    {(chartMetricMode === 'both' || chartMetricMode === 'active') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ios-blue)' }}>
                        <div style={{ width: 12, height: 3, background: 'var(--ios-blue)', borderRadius: 2 }} />
                        <span>Active Students (DAU)</span>
                      </div>
                    )}
                    {(chartMetricMode === 'both' || chartMetricMode === 'signups') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
                        <div style={{ width: 12, height: 3, background: '#10B981', borderRadius: 2 }} />
                        <span>New Signups</span>
                      </div>
                    )}
                  </div>

                  {/* SVG Multi-Series Area Chart View */}
                  <div style={{ position: 'relative', width: '100%', height: '210px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <svg 
                      viewBox="0 0 800 190" 
                      preserveAspectRatio="none" 
                      style={{ width: '100%', height: '190px', overflow: 'visible' }}
                    >
                      <defs>
                        <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                          <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                          <stop offset="70%" stopColor="#34D399" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#34D399" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="30" y1="30" x2="770" y2="30" stroke="var(--ios-card-border)" strokeDasharray="4 4" strokeWidth="1" />
                      <line x1="30" y1="95" x2="770" y2="95" stroke="var(--ios-card-border)" strokeDasharray="4 4" strokeWidth="1" />
                      <line x1="30" y1="160" x2="770" y2="160" stroke="var(--ios-card-border)" strokeWidth="1" />

                      {/* Active Users Layer */}
                      {(chartMetricMode === 'both' || chartMetricMode === 'active') && svgMultiChart.active && (
                        <>
                          <path d={svgMultiChart.active.area} fill="url(#activeGradient)" />
                          <path 
                            d={svgMultiChart.active.path} 
                            fill="none" 
                            stroke="#2563EB" 
                            strokeWidth="3.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        </>
                      )}

                      {/* New Signups Layer */}
                      {(chartMetricMode === 'both' || chartMetricMode === 'signups') && svgMultiChart.signups && (
                        <>
                          <path d={svgMultiChart.signups.area} fill="url(#signupGradient)" />
                          <path 
                            d={svgMultiChart.signups.path} 
                            fill="none" 
                            stroke="#10B981" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        </>
                      )}

                      {/* Interactive Points */}
                      {svgMultiChart.points.map((pt, idx) => (
                        <g 
                          key={idx} 
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredDataPoint(pt.data)}
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        >
                          {(chartMetricMode === 'both' || chartMetricMode === 'active') && (
                            <circle 
                              cx={pt.x} 
                              cy={pt.yActive} 
                              r={hoveredDataPoint?.date === pt.data.date ? 6.5 : 4} 
                              fill={hoveredDataPoint?.date === pt.data.date ? '#fff' : '#2563EB'} 
                              stroke="#2563EB" 
                              strokeWidth={hoveredDataPoint?.date === pt.data.date ? 3.5 : 2} 
                            />
                          )}
                          {(chartMetricMode === 'both' || chartMetricMode === 'signups') && (
                            <circle 
                              cx={pt.x} 
                              cy={pt.ySignup} 
                              r={hoveredDataPoint?.date === pt.data.date ? 6.5 : 4} 
                              fill={hoveredDataPoint?.date === pt.data.date ? '#fff' : '#10B981'} 
                              stroke="#10B981" 
                              strokeWidth={hoveredDataPoint?.date === pt.data.date ? 3.5 : 2} 
                            />
                          )}
                        </g>
                      ))}
                    </svg>

                    {/* Interactive Tooltip Card */}
                    {hoveredDataPoint && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'var(--ios-card-bg)',
                          border: '1px solid var(--ios-card-border)',
                          borderRadius: '14px',
                          padding: '10px 18px',
                          boxShadow: 'var(--ios-shadow-lg)',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          pointerEvents: 'none',
                          zIndex: 10
                        }}
                      >
                        <div style={{ color: 'var(--ios-text-secondary)', borderRight: '1px solid var(--ios-card-border)', paddingRight: '12px' }}>
                          {new Date(hoveredDataPoint.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ios-blue)', fontWeight: 800 }}>
                          <Activity size={14} />
                          <span>{hoveredDataPoint.activeUsers} Active</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontWeight: 800 }}>
                          <UserPlus size={14} />
                          <span>+{hoveredDataPoint.newSignups} Signups</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Timeline Date Axis */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '0 20px', fontSize: '11px', color: 'var(--ios-text-muted)' }}>
                    {activityChart.filter((_, idx) => idx % Math.max(1, Math.floor(activityChart.length / 7)) === 0).map((item, idx) => (
                      <span key={idx}>
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Shortcuts Bento */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div 
                    className="ios-card" 
                    onClick={() => {
                      applyAnnouncementTemplate('exam');
                      setActiveTab('announcements');
                    }}
                    style={{ padding: '20px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--ios-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Megaphone size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>Draft Midterm Advisory</div>
                      <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                        Notify all active students of upcoming schedules
                      </div>
                    </div>
                    <ArrowUpRight size={18} color="var(--ios-text-muted)" />
                  </div>

                  <div 
                    className="ios-card" 
                    onClick={handleExportCSV}
                    style={{ padding: '20px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--ios-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Download size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>Export Master Dataset</div>
                      <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                        Generate CSV with {metrics?.totalUsers || 0} student profiles
                      </div>
                    </div>
                    <ArrowUpRight size={18} color="var(--ios-text-muted)" />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: STUDENT DIRECTORY */}
            {/* ========================================================= */}
            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Search & Filter Header */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '420px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search student by name, student number, program..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 40px',
                        borderRadius: '12px',
                        background: 'var(--ios-card-bg)',
                        border: '1px solid var(--ios-card-border)',
                        color: 'var(--ios-text-primary)',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                      value={schoolFilter}
                      onChange={(e) => {
                        setSchoolFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '11px 16px',
                        borderRadius: '12px',
                        background: 'var(--ios-card-bg)',
                        border: '1px solid var(--ios-card-border)',
                        color: 'var(--ios-text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="ALL">All Campuses ({schools.length})</option>
                      {schools.map((s, idx) => (
                        <option key={idx} value={s.schoolName}>
                          {s.schoolName} ({s.userCount})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="ios-button-secondary"
                      style={{ padding: '11px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={15} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Filter Presets Chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: `All Students (${totalUsersCount})` },
                    { key: 'active24h', label: '🔥 Active in Last 24h' },
                    { key: 'highCourses', label: '📚 High Load (≥ 6 Courses)' },
                    { key: 'hasSection', label: '🏷️ Has Section Assigned' }
                  ].map(preset => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setFilterPreset(preset.key as UserFilterPreset);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        background: filterPreset === preset.key ? 'var(--ios-blue)' : 'var(--ios-card-bg)',
                        color: filterPreset === preset.key ? '#fff' : 'var(--ios-text-secondary)',
                        border: '1px solid var(--ios-card-border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Data Table */}
                <div className="ios-card" style={{ borderRadius: '22px', overflow: 'hidden', padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                      <thead>
                        <tr style={{ background: 'var(--ios-bg-secondary)', borderBottom: '1px solid var(--ios-card-border)' }}>
                          <th 
                            onClick={() => handleSort('fullName')}
                            style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--ios-text-secondary)', cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>STUDENT</span>
                              {sortCol === 'fullName' && (sortDir === 'asc' ? '↑' : '↓')}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('schoolName')}
                            style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--ios-text-secondary)', cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>CAMPUS & PROGRAM</span>
                              {sortCol === 'schoolName' && (sortDir === 'asc' ? '↑' : '↓')}
                            </div>
                          </th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>YEAR & SECTION</th>
                          <th 
                            onClick={() => handleSort('totalCourses')}
                            style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--ios-text-secondary)', cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>ENROLLED STATS</span>
                              {sortCol === 'totalCourses' && (sortDir === 'asc' ? '↑' : '↓')}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('lastActiveAt')}
                            style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--ios-text-secondary)', cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>LAST ACTIVITY</span>
                              {sortCol === 'lastActiveAt' && (sortDir === 'asc' ? '↑' : '↓')}
                            </div>
                          </th>
                          <th style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--ios-text-secondary)', textAlign: 'right' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ios-text-secondary)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <Users size={32} color="var(--ios-text-muted)" />
                                <div style={{ fontWeight: 700, fontSize: '15px' }}>No student profiles match your filter</div>
                                <div style={{ fontSize: '12.5px', color: 'var(--ios-text-muted)' }}>Try adjusting your search keywords or campus selector</div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          processedUsers.map((student) => {
                            const initials = student.fullName
                              ? student.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                              : 'ST';
                            const isOnlineRecently = student.lastActiveAt && (Date.now() - new Date(student.lastActiveAt).getTime()) < 86400000;

                            return (
                              <tr 
                                key={student.id} 
                                style={{ 
                                  borderBottom: '1px solid var(--ios-card-border)',
                                  transition: 'background 0.15s ease'
                                }}
                              >
                                <td style={{ padding: '14px 20px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div 
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: student.accentColor || 'var(--ios-blue)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: '13.5px',
                                        overflow: 'hidden',
                                        flexShrink: 0
                                      }}
                                    >
                                      {student.profilePhotoUrl ? (
                                        <img src={student.profilePhotoUrl} alt={student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        initials
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>{student.fullName}</div>
                                      <div style={{ fontSize: '11.5px', color: 'var(--ios-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>{student.studentNumber || 'No ID Number'}</span>
                                        {student.studentNumber && (
                                          <button 
                                            type="button" 
                                            onClick={() => copyToClipboard(student.studentNumber || '', student.id)}
                                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ios-text-muted)' }}
                                            title="Copy Student ID"
                                          >
                                            {copiedId === student.id ? <Check size={11} color="var(--ios-green)" /> : <Copy size={11} />}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td style={{ padding: '14px 20px' }}>
                                  <div style={{ fontWeight: 600 }}>{student.schoolName}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>{student.program || 'General Program'}</div>
                                </td>

                                <td style={{ padding: '14px 20px' }}>
                                  <div style={{ fontWeight: 600 }}>{student.yearLevel || '—'}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--ios-text-muted)' }}>{student.section ? `Sec ${student.section}` : 'No section'}</div>
                                </td>

                                <td style={{ padding: '14px 20px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--ios-blue)' }}>
                                      {student.totalCourses} Courses
                                    </span>
                                    <span style={{ fontSize: '11.5px', color: 'var(--ios-text-muted)' }}>
                                      {student.totalEvents} Events
                                    </span>
                                  </div>
                                </td>

                                <td style={{ padding: '14px 20px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnlineRecently ? 'var(--ios-green)' : 'var(--ios-text-muted)' }} />
                                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{isOnlineRecently ? 'Active in 24h' : 'Inactive'}</span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--ios-text-muted)', marginTop: '2px' }}>
                                    {student.lastActiveAt ? new Date(student.lastActiveAt).toLocaleDateString() : 'Never'}
                                  </div>
                                </td>

                                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUser(student)}
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: '10px',
                                      background: 'var(--ios-bg-secondary)',
                                      border: '1px solid var(--ios-card-border)',
                                      color: 'var(--ios-blue)',
                                      fontSize: '12.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    Inspect Card
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--ios-bg-secondary)', borderTop: '1px solid var(--ios-card-border)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--ios-text-secondary)' }}>
                      Showing {users.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, totalUsersCount)} of {totalUsersCount} students
                    </span>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--ios-card-bg)', border: '1px solid var(--ios-card-border)', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1 }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontWeight: 700, padding: '0 8px' }}>
                        Page {currentPage} of {Math.max(1, Math.ceil(totalUsersCount / pageSize))}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= Math.ceil(totalUsersCount / pageSize)}
                        onClick={() => setCurrentPage(p => p + 1)}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--ios-card-bg)', border: '1px solid var(--ios-card-border)', cursor: currentPage >= Math.ceil(totalUsersCount / pageSize) ? 'not-allowed' : 'pointer', opacity: currentPage >= Math.ceil(totalUsersCount / pageSize) ? 0.5 : 1 }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: SCHOOLS & CAMPUSES */}
            {/* ========================================================= */}
            {activeTab === 'schools' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>Campus & University Breakdown</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--ios-text-secondary)' }}>
                      Student density, academic distribution, and campus adoption statistics
                    </p>
                  </div>

                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Filter campuses..."
                      value={schoolSearchQuery}
                      onChange={(e) => setSchoolSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        borderRadius: '10px',
                        background: 'var(--ios-card-bg)',
                        border: '1px solid var(--ios-card-border)',
                        color: 'var(--ios-text-primary)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Campus Cards Matrix */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {filteredSchools.map((school, idx) => (
                    <div 
                      key={idx}
                      className="ios-card" 
                      style={{ 
                        padding: '24px', 
                        borderRadius: '20px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '16px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div 
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: idx === 0 
                                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' 
                                : idx === 1 
                                ? 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)' 
                                : idx === 2 
                                ? 'linear-gradient(135deg, #B45309 0%, #78350F 100%)' 
                                : 'var(--ios-bg-secondary)',
                              color: idx < 3 ? '#fff' : 'var(--ios-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '15px'
                            }}
                          >
                            #{idx + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '16px' }}>{school.schoolName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
                              {school.programsCount} Degree Programs
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--ios-blue)' }}>{school.userCount}</div>
                          <div style={{ fontSize: '11px', color: 'var(--ios-text-muted)' }}>Students ({school.percentage}%)</div>
                        </div>
                      </div>

                      {/* Visual Density Bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginBottom: '6px' }}>
                          <span>Share of Userbase</span>
                          <span style={{ fontWeight: 700 }}>{school.percentage}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--ios-bg-secondary)', overflow: 'hidden' }}>
                          <div 
                            style={{
                              width: `${Math.min(100, Math.max(4, school.percentage))}%`,
                              height: '100%',
                              borderRadius: '4px',
                              background: idx === 0 
                                ? 'linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)' 
                                : idx === 1 
                                ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)' 
                                : 'linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: BROADCAST STUDIO */}
            {/* ========================================================= */}
            {activeTab === 'announcements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Broadcast Announcement Studio</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ios-text-secondary)' }}>
                      Publish live alerts, update banners, and exam notices with real-time preview
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreatingAnnouncement(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      background: 'var(--ios-blue)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    <Plus size={16} />
                    <span>{isCreatingAnnouncement ? 'Close Composer' : 'New Broadcast'}</span>
                  </button>
                </div>

                {/* Broadcast Composer with Split Live Preview */}
                {isCreatingAnnouncement && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                    {/* Left: Input Form */}
                    <form 
                      onSubmit={handleCreateAnnouncement}
                      className="ios-card"
                      style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '18px', border: '2px solid var(--ios-blue)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--ios-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Megaphone size={18} /> Compose Broadcast
                        </h4>
                      </div>

                      {/* Presets Strip */}
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ios-text-muted)', marginBottom: '8px' }}>
                          ⚡ QUICK PRESETS
                        </span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => applyAnnouncementTemplate('exam')}
                            style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', cursor: 'pointer' }}
                          >
                            📅 Exam Schedule
                          </button>
                          <button
                            type="button"
                            onClick={() => applyAnnouncementTemplate('maintenance')}
                            style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', cursor: 'pointer' }}
                          >
                            ⚡ Maintenance
                          </button>
                          <button
                            type="button"
                            onClick={() => applyAnnouncementTemplate('feature')}
                            style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', cursor: 'pointer' }}
                          >
                            🎉 New Feature
                          </button>
                          <button
                            type="button"
                            onClick={() => applyAnnouncementTemplate('alert')}
                            style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600, background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', cursor: 'pointer' }}
                          >
                            ⚠️ Class Advisory
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Announcement Title *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Midterm Examination Schedule"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Format Type
                          </label>
                          <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value as any)}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13.5px', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                          >
                            <option value="banner">Top Banner (Persistent)</option>
                            <option value="modal">Pop-up Modal (High Impact)</option>
                            <option value="toast">Quick Toast Notice</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Visual Tone / Color
                          </label>
                          <select
                            value={newVariant}
                            onChange={(e) => setNewVariant(e.target.value as any)}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13.5px', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                          >
                            <option value="info">Info (Blue)</option>
                            <option value="update">Update / Feature (Green)</option>
                            <option value="warning">Warning (Orange)</option>
                            <option value="alert">Critical Alert (Red)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                          Message Body *
                        </label>
                        <textarea
                          placeholder="Type the message shown to all active students..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          rows={3}
                          required
                          style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Action Button Label (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. View Schedule"
                            value={newActionText}
                            onChange={(e) => setNewActionText(e.target.value)}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Action URL (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="https://..."
                            value={newActionUrl}
                            onChange={(e) => setNewActionUrl(e.target.value)}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setIsCreatingAnnouncement(false)}
                          style={{ padding: '10px 18px', borderRadius: '12px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '12px', background: 'var(--ios-blue)', color: '#fff', border: 'none', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          <Send size={15} />
                          <span>Publish to Students</span>
                        </button>
                      </div>
                    </form>

                    {/* Right: Real-time Live Preview Mockup */}
                    <div className="ios-card" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--ios-bg-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Smartphone size={16} color="var(--ios-blue)" />
                          <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Live Student Preview
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--ios-text-muted)' }}>
                          Updates in real-time
                        </span>
                      </div>

                      {/* Mock Student Screen Viewport */}
                      <div 
                        style={{ 
                          flex: 1, 
                          minHeight: '260px', 
                          borderRadius: '16px', 
                          background: 'var(--ios-bg-primary)', 
                          border: '1px solid var(--ios-card-border)', 
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: newType === 'modal' ? 'center' : 'flex-start',
                          alignItems: 'center',
                          position: 'relative'
                        }}
                      >
                        {/* Mock Header */}
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', opacity: 0.5 }}>
                          <div style={{ fontSize: '11px', fontWeight: 800 }}>Schedly Student</div>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ios-green)' }} />
                        </div>

                        {/* Banner Preview */}
                        {newType === 'banner' && (
                          <div 
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: newVariant === 'alert' ? 'rgba(239, 68, 68, 0.15)' :
                                         newVariant === 'warning' ? 'rgba(245, 158, 11, 0.15)' :
                                         newVariant === 'update' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                              border: `1px solid ${
                                newVariant === 'alert' ? '#EF4444' :
                                newVariant === 'warning' ? '#F59E0B' :
                                newVariant === 'update' ? '#10B981' : '#2563EB'
                              }`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: '13px' }}>{newTitle || 'Announcement Title'}</div>
                            <div style={{ fontSize: '12px', opacity: 0.9 }}>{newMessage || 'Message details will be displayed here.'}</div>
                            {newActionText && (
                              <div style={{ marginTop: '4px', fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-blue)' }}>
                                {newActionText} →
                              </div>
                            )}
                          </div>
                        )}

                        {/* Modal Preview */}
                        {newType === 'modal' && (
                          <div 
                            style={{
                              width: '100%',
                              maxWidth: '300px',
                              padding: '20px',
                              borderRadius: '18px',
                              background: 'var(--ios-card-bg)',
                              border: '1px solid var(--ios-card-border)',
                              boxShadow: 'var(--ios-shadow-lg)',
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '10px'
                            }}
                          >
                            <div 
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: newVariant === 'alert' ? '#EF4444' :
                                           newVariant === 'warning' ? '#F59E0B' :
                                           newVariant === 'update' ? '#10B981' : '#2563EB',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Bell size={20} />
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '15px' }}>{newTitle || 'Pop-up Modal Title'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', lineHeight: 1.4 }}>
                              {newMessage || 'Full message copy for high-impact campus notice.'}
                            </div>
                            <button
                              type="button"
                              style={{
                                marginTop: '6px',
                                width: '100%',
                                padding: '8px',
                                borderRadius: '10px',
                                background: 'var(--ios-blue)',
                                color: '#fff',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 700
                              }}
                            >
                              {newActionText || 'Dismiss'}
                            </button>
                          </div>
                        )}

                        {/* Toast Preview */}
                        {newType === 'toast' && (
                          <div 
                            style={{
                              position: 'absolute',
                              bottom: '16px',
                              padding: '10px 16px',
                              borderRadius: '12px',
                              background: 'var(--ios-card-bg)',
                              border: '1px solid var(--ios-card-border)',
                              boxShadow: 'var(--ios-shadow-lg)',
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <Sparkles size={14} color="#F59E0B" />
                            <span>{newTitle || 'Quick Toast Alert'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Announcements List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {announcements.length === 0 ? (
                    <div className="ios-card" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '18px', color: 'var(--ios-text-secondary)' }}>
                      No announcements posted yet. Click "New Broadcast" to create one.
                    </div>
                  ) : (
                    announcements.map((item) => (
                      <div 
                        key={item.id}
                        className="ios-card"
                        style={{
                          padding: '20px 24px',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: item.isActive ? 1 : 0.6,
                          borderLeft: `4px solid ${
                            item.variant === 'alert' ? '#EF4444' :
                            item.variant === 'warning' ? '#F59E0B' :
                            item.variant === 'update' ? '#10B981' : 'var(--ios-blue)'
                          }`
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '75%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '15px' }}>{item.title}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px', background: 'var(--ios-bg-secondary)' }}>
                              {item.type}
                            </span>
                            {item.isActive ? (
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ios-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={13} /> Active
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ios-text-muted)' }}>
                                Inactive
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--ios-text-secondary)', lineHeight: 1.4 }}>
                            {item.message}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleAnnouncement(item.id, item.isActive)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '10px',
                              background: item.isActive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: item.isActive ? 'var(--ios-red, #EF4444)' : 'var(--ios-green)',
                              border: 'none',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {item.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'var(--ios-bg-secondary)',
                              border: '1px solid var(--ios-card-border)',
                              color: 'var(--ios-red, #EF4444)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Delete broadcast"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Selected Student Detail Drawer Modal */}
      {selectedUser && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="ios-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '30px',
              borderRadius: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
              boxShadow: 'var(--ios-shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div 
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '50%',
                    background: selectedUser.accentColor || 'var(--ios-blue)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '20px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {selectedUser.profilePhotoUrl ? (
                    <img src={selectedUser.profilePhotoUrl} alt={selectedUser.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selectedUser.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800 }}>{selectedUser.fullName}</h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>ID: {selectedUser.studentNumber || 'Unassigned'}</span>
                    {selectedUser.studentNumber && (
                      <button 
                        type="button" 
                        onClick={() => copyToClipboard(selectedUser.studentNumber || '', selectedUser.id)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ios-text-muted)' }}
                      >
                        {copiedId === selectedUser.id ? <Check size={12} color="var(--ios-green)" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--ios-bg-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
              <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--ios-bg-secondary)' }}>
                <div style={{ color: 'var(--ios-text-muted)', fontWeight: 700, fontSize: '10.5px' }}>CAMPUS / UNIVERSITY</div>
                <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '13.5px' }}>{selectedUser.schoolName}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--ios-bg-secondary)' }}>
                <div style={{ color: 'var(--ios-text-muted)', fontWeight: 700, fontSize: '10.5px' }}>DEGREE PROGRAM</div>
                <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '13.5px' }}>{selectedUser.program || 'General Program'}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--ios-bg-secondary)' }}>
                <div style={{ color: 'var(--ios-text-muted)', fontWeight: 700, fontSize: '10.5px' }}>YEAR LEVEL & SECTION</div>
                <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '13.5px' }}>{selectedUser.yearLevel || 'N/A'} {selectedUser.section ? `• Sec ${selectedUser.section}` : ''}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--ios-bg-secondary)' }}>
                <div style={{ color: 'var(--ios-text-muted)', fontWeight: 700, fontSize: '10.5px' }}>ACADEMIC LOAD</div>
                <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '13.5px', color: 'var(--ios-blue)' }}>{selectedUser.totalCourses} courses • {selectedUser.totalEvents} events</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)' }}>
              <div><strong>Registration Date:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</div>
              <div><strong>Last Active Session:</strong> {selectedUser.lastActiveAt ? new Date(selectedUser.lastActiveAt).toLocaleString() : 'Never logged in'}</div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                background: 'var(--ios-blue)',
                color: '#fff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
