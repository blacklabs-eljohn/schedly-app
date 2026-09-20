import React, { useState, useEffect, useCallback } from 'react';
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
  CalendarDays
} from 'lucide-react';
import { 
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
import { showSystemToast } from '../services/notificationService';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'analytics' | 'users' | 'schools' | 'announcements';

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Analytics Data
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [activityChart, setActivityChart] = useState<DailyActivityStat[]>([]);
  const [chartDays, setChartDays] = useState<number>(14);

  // Users Directory Data
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const pageSize = 25;

  // Schools Breakdown Data
  const [schools, setSchools] = useState<SchoolBreakdown[]>([]);

  // Announcements Data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<Announcement['type']>('banner');
  const [newVariant, setNewVariant] = useState<Announcement['variant']>('info');
  const [newActionText, setNewActionText] = useState('');
  const [newActionUrl, setNewActionUrl] = useState('');

  // Load all dashboard data
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
    } catch (err: any) {
      console.error('Error loading admin dashboard data:', err);
      showSystemToast('Failed to sync admin metrics: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [chartDays]);

  // Load user directory on filter change or page change
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

  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
      loadUsersList();
    }
  }, [isOpen, loadDashboardData, loadUsersList]);

  useEffect(() => {
    if (isOpen) {
      loadUsersList();
    }
  }, [searchQuery, schoolFilter, currentPage, isOpen, loadUsersList]);

  if (!isOpen) return null;

  // Handle Export CSV
  const handleExportCSV = async () => {
    triggerLightHaptic();
    try {
      showSystemToast('Preparing user export dataset...');
      // Fetch all users for complete export
      const fullList = await fetchAdminUsersList({ limit: 1000, offset: 0 });
      exportUsersToCSV(fullList.users);
      triggerSuccessHaptic();
      showSystemToast('Export downloaded successfully!');
    } catch (err) {
      showSystemToast('Failed to export dataset');
    }
  };

  // Handle Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      showSystemToast('Title and message are required');
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
      showSystemToast('Announcement broadcasted!');
      setIsCreatingAnnouncement(false);
      setNewTitle('');
      setNewMessage('');
      setNewActionText('');
      setNewActionUrl('');
      
      const refreshedAnnouncements = await fetchAllAdminAnnouncements();
      setAnnouncements(refreshedAnnouncements);
    } catch (err: any) {
      showSystemToast('Broadcast error: ' + err.message);
    }
  };

  // Handle Toggle Active
  const handleToggleAnnouncement = async (id: string, currentActive: boolean) => {
    triggerLightHaptic();
    try {
      await toggleAdminAnnouncementActive(id, !currentActive);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive: !currentActive } : a));
      showSystemToast(`Announcement ${!currentActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showSystemToast('Failed to update announcement');
    }
  };

  // Handle Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    triggerLightHaptic();
    try {
      await deleteAdminAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showSystemToast('Announcement removed');
    } catch (err) {
      showSystemToast('Failed to delete announcement');
    }
  };

  // Compute max activity count for chart scaling
  const maxActivity = Math.max(...activityChart.map(c => c.activeUsers), 1);

  return (
    <div className="ios-modal-overlay" style={{ zIndex: 9999 }}>
      <div 
        className="ios-modal-card" 
        style={{ 
          maxWidth: '1080px', 
          width: '95vw', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--ios-card-border)'
        }}
      >
        {/* Header Bar */}
        <header 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '20px 24px', 
            borderBottom: '1px solid var(--ios-card-border)',
            background: 'var(--ios-card-bg)',
            backdropFilter: 'blur(20px)',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 8px 16px -4px rgba(245, 158, 11, 0.4)',
                color: '#fff'
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ios-text-primary)' }}>
                  Schedly Admin Console
                </h2>
                <span 
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    padding: '2px 8px', 
                    borderRadius: '20px', 
                    background: 'rgba(245, 158, 11, 0.15)', 
                    color: '#D97706',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}
                >
                  SUPERUSER
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ios-text-secondary)' }}>
                Live Analytics, Student Directory & Broadcast Management
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => loadDashboardData(true)}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'var(--ios-bg-secondary)',
                border: '1px solid var(--ios-card-border)',
                color: 'var(--ios-text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'var(--ios-bg-secondary)',
                border: '1px solid var(--ios-card-border)',
                color: 'var(--ios-text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Download Student Data (CSV)"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--ios-bg-secondary)',
                border: 'none',
                color: 'var(--ios-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Tab Navigation Pill Bar */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            padding: '12px 24px', 
            borderBottom: '1px solid var(--ios-card-border)',
            background: 'var(--ios-bg-primary)',
            overflowX: 'auto'
          }}
        >
          {[
            { key: 'analytics', label: 'Analytics & Growth', icon: Activity },
            { key: 'users', label: `Student Directory (${metrics?.totalUsers || 0})`, icon: Users },
            { key: 'schools', label: `Schools & Campuses (${metrics?.totalSchools || 0})`, icon: School },
            { key: 'announcements', label: `Announcements (${announcements.length})`, icon: Megaphone }
          ].map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  triggerSelectionHaptic();
                  setActiveTab(key as AdminTab);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: isActive ? 'var(--ios-blue)' : 'var(--ios-card-bg)',
                  color: isActive ? '#fff' : 'var(--ios-text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--ios-card-border)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--ios-bg-primary)' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
              <RefreshCw size={32} className="spin-animation" style={{ color: 'var(--ios-blue)' }} />
              <div style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                Aggregating campus analytics & student rosters...
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: ANALYTICS & GROWTH */}
              {activeTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* KPI Stat Cards Grid */}
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '16px' 
                    }}
                  >
                    {/* Card 1: Total Students */}
                    <div className="ios-card" style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Registered Students
                        </span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.15)', color: 'var(--ios-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={18} />
                        </div>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--ios-text-primary)' }}>
                        {metrics?.totalUsers.toLocaleString() || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ios-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={13} />
                        <span>Active Across Campuses</span>
                      </div>
                    </div>

                    {/* Card 2: DAU (Daily Active) */}
                    <div className="ios-card" style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Daily Active (DAU)
                        </span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--ios-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Activity size={18} />
                        </div>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--ios-text-primary)' }}>
                        {metrics?.dauToday.toLocaleString() || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                        Active users today
                      </div>
                    </div>

                    {/* Card 3: MAU (Monthly Active) */}
                    <div className="ios-card" style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Monthly Active (MAU)
                        </span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TrendingUp size={18} />
                        </div>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--ios-text-primary)' }}>
                        {metrics?.mau30d.toLocaleString() || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                        Past 30-day window
                      </div>
                    </div>

                    {/* Card 4: Stickiness Ratio */}
                    <div className="ios-card" style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Stickiness (DAU/MAU)
                        </span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <UserCheck size={18} />
                        </div>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--ios-text-primary)' }}>
                        {metrics?.stickinessRate}%
                      </div>
                      <div style={{ fontSize: '12px', color: metrics && metrics.stickinessRate > 20 ? 'var(--ios-green)' : 'var(--ios-text-secondary)', fontWeight: 600 }}>
                        {metrics && metrics.stickinessRate > 20 ? '🌟 Exceptional student retention' : 'Student engagement index'}
                      </div>
                    </div>
                  </div>

                  {/* Secondary KPI Bar */}
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                      gap: '12px' 
                    }}
                  >
                    <div className="ios-card" style={{ padding: '14px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <BookOpen size={20} color="var(--ios-blue)" />
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>TOTAL COURSES</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{metrics?.totalCourses.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="ios-card" style={{ padding: '14px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Clock size={20} color="var(--ios-purple)" />
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>TOTAL SCHEDULES</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{metrics?.totalSchedules.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="ios-card" style={{ padding: '14px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CalendarDays size={20} color="var(--ios-orange)" />
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>CUSTOM EVENTS / EXAMS</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{metrics?.totalEvents.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="ios-card" style={{ padding: '14px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <School size={20} color="var(--ios-green)" />
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>CAMPUSES & SCHOOLS</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{metrics?.totalSchools.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Active Activity Graph */}
                  <div className="ios-card" style={{ padding: '24px', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                          Daily Active Users Activity Trend
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--ios-text-secondary)' }}>
                          Unique active sessions per day over the selected window
                        </p>
                      </div>

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
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: chartDays === days ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                              color: chartDays === days ? '#fff' : 'var(--ios-text-secondary)',
                              border: '1px solid var(--ios-card-border)',
                              cursor: 'pointer'
                            }}
                          >
                            {days}D
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Bar Chart */}
                    <div 
                      style={{ 
                        height: '180px', 
                        display: 'flex', 
                        alignItems: 'flex-end', 
                        gap: '8px', 
                        paddingTop: '20px', 
                        borderBottom: '1px solid var(--ios-card-border)' 
                      }}
                    >
                      {activityChart.map((item, idx) => {
                        const heightPct = Math.max(8, Math.round((item.activeUsers / maxActivity) * 100));
                        const dateLabel = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              flex: 1, 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              gap: '6px',
                              height: '100%',
                              justifyContent: 'flex-end'
                            }}
                          >
                            <span style={{ fontSize: '10.5px', fontWeight: 700, color: item.activeUsers > 0 ? 'var(--ios-blue)' : 'var(--ios-text-muted)' }}>
                              {item.activeUsers}
                            </span>
                            <div 
                              style={{ 
                                width: '100%', 
                                maxWidth: '28px', 
                                height: `${heightPct}%`, 
                                background: item.activeUsers > 0 
                                  ? 'linear-gradient(180deg, var(--ios-blue) 0%, rgba(37, 99, 235, 0.6) 100%)' 
                                  : 'var(--ios-bg-secondary)',
                                borderRadius: '6px 6px 2px 2px',
                                transition: 'height 0.3s ease',
                                boxShadow: item.activeUsers > 0 ? '0 4px 10px rgba(37, 99, 235, 0.25)' : 'none'
                              }} 
                              title={`${dateLabel}: ${item.activeUsers} active users`}
                            />
                            <span style={{ fontSize: '9.5px', color: 'var(--ios-text-muted)', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              {dateLabel.split(' ')[1]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STUDENT DIRECTORY */}
              {activeTab === 'users' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Filters Bar */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      flexWrap: 'wrap', 
                      alignItems: 'center', 
                      justifyContent: 'space-between' 
                    }}
                  >
                    {/* Search Input */}
                    <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
                      <Search 
                        size={16} 
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-muted)' }} 
                      />
                      <input
                        type="text"
                        placeholder="Search student name, ID, program..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 36px',
                          borderRadius: '12px',
                          background: 'var(--ios-card-bg)',
                          border: '1px solid var(--ios-card-border)',
                          color: 'var(--ios-text-primary)',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* School Filter Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SlidersHorizontal size={16} color="var(--ios-text-secondary)" />
                      <select
                        value={schoolFilter}
                        onChange={(e) => {
                          setSchoolFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'var(--ios-card-bg)',
                          border: '1px solid var(--ios-card-border)',
                          color: 'var(--ios-text-primary)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="ALL">All Schools & Campuses</option>
                        {schools.map((s, idx) => (
                          <option key={idx} value={s.schoolName}>
                            {s.schoolName} ({s.userCount})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Users Table Card */}
                  <div className="ios-card" style={{ borderRadius: '18px', overflow: 'hidden', padding: 0 }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'var(--ios-bg-secondary)', borderBottom: '1px solid var(--ios-card-border)' }}>
                            <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>STUDENT</th>
                            <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>CAMPUS & PROGRAM</th>
                            <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>YEAR & SECTION</th>
                            <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>ACTIVITY</th>
                            <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--ios-text-secondary)', textAlign: 'right' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ios-text-secondary)' }}>
                                No student profiles found matching your search.
                              </td>
                            </tr>
                          ) : (
                            users.map((student) => {
                              const initials = student.fullName
                                ? student.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                : 'ST';
                              const isOnlineRecently = student.lastActiveAt && (Date.now() - new Date(student.lastActiveAt).getTime()) < 86400000;

                              return (
                                <tr 
                                  key={student.id} 
                                  style={{ borderBottom: '1px solid var(--ios-card-border)', transition: 'background 0.15s ease' }}
                                >
                                  {/* Student Name & ID */}
                                  <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div 
                                        style={{ 
                                          width: '36px', 
                                          height: '36px', 
                                          borderRadius: '50%', 
                                          background: student.accentColor || 'var(--ios-blue)', 
                                          color: '#fff', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center',
                                          fontWeight: 800,
                                          fontSize: '12px',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        {student.profilePhotoUrl ? (
                                          <img src={student.profilePhotoUrl} alt={student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          initials
                                        )}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                                          {student.fullName}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--ios-text-muted)' }}>
                                          {student.studentNumber || 'No Student ID'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Campus & Program */}
                                  <td style={{ padding: '12px 16px' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--ios-text-primary)' }}>
                                      {student.schoolName}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>
                                      {student.program || 'General Program'}
                                    </div>
                                  </td>

                                  {/* Year Level & Section */}
                                  <td style={{ padding: '12px 16px' }}>
                                    <div style={{ fontWeight: 600 }}>{student.yearLevel || '—'}</div>
                                    <div style={{ fontSize: '11.5px', color: 'var(--ios-text-muted)' }}>{student.section ? `Sec: ${student.section}` : ''}</div>
                                  </td>

                                  {/* Activity Stats & Badge */}
                                  <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <div 
                                        style={{ 
                                          width: '8px', 
                                          height: '8px', 
                                          borderRadius: '50%', 
                                          background: isOnlineRecently ? 'var(--ios-green)' : 'var(--ios-text-muted)' 
                                        }} 
                                      />
                                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                        {isOnlineRecently ? 'Active Recently' : 'Inactive'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--ios-text-muted)', marginTop: '2px' }}>
                                      {student.totalCourses} courses • {student.totalEvents} events
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedUser(student)}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        background: 'var(--ios-bg-secondary)',
                                        border: '1px solid var(--ios-card-border)',
                                        color: 'var(--ios-blue)',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      View Card
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '12px 20px', 
                        borderTop: '1px solid var(--ios-card-border)',
                        background: 'var(--ios-bg-secondary)',
                        fontSize: '12.5px',
                        color: 'var(--ios-text-secondary)'
                      }}
                    >
                      <span>
                        Showing {users.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, totalUsersCount)} of {totalUsersCount} students
                      </span>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: 'var(--ios-card-bg)',
                            border: '1px solid var(--ios-card-border)',
                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage <= 1 ? 0.5 : 1
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                          Page {currentPage} of {Math.max(1, Math.ceil(totalUsersCount / pageSize))}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage >= Math.ceil(totalUsersCount / pageSize)}
                          onClick={() => setCurrentPage(p => p + 1)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: 'var(--ios-card-bg)',
                            border: '1px solid var(--ios-card-border)',
                            cursor: currentPage >= Math.ceil(totalUsersCount / pageSize) ? 'not-allowed' : 'pointer',
                            opacity: currentPage >= Math.ceil(totalUsersCount / pageSize) ? 0.5 : 1
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SCHOOLS & CAMPUSES */}
              {activeTab === 'schools' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="ios-card" style={{ padding: '24px', borderRadius: '20px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800 }}>
                      Campus & University Adoption Distribution
                    </h3>
                    <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--ios-text-secondary)' }}>
                      Ranked breakdown of students and academic departments registered across all campuses
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {schools.map((school, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '20px', fontWeight: 800, color: idx < 3 ? 'var(--ios-blue)' : 'var(--ios-text-muted)' }}>
                                #{idx + 1}
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                                {school.schoolName}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--ios-text-muted)', padding: '1px 6px', background: 'var(--ios-bg-secondary)', borderRadius: '6px' }}>
                                {school.programsCount} Programs
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                                {school.userCount} Students
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', minWidth: '42px', textAlign: 'right' }}>
                                {school.percentage}%
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--ios-bg-secondary)', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${Math.min(100, Math.max(3, school.percentage))}%`, 
                                height: '100%', 
                                borderRadius: '4px', 
                                background: idx === 0 
                                  ? 'linear-gradient(90deg, var(--ios-blue) 0%, #3B82F6 100%)' 
                                  : idx === 1 
                                  ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)' 
                                  : 'linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%)',
                                transition: 'width 0.4s ease'
                              }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ANNOUNCEMENTS MANAGER */}
              {activeTab === 'announcements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Broadcast Action Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>In-App Announcements Broadcast Hub</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--ios-text-secondary)' }}>
                        Send instant system notices, maintenance alerts, or updates to all active students
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCreatingAnnouncement(prev => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        background: 'var(--ios-blue)',
                        color: '#fff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      <Plus size={16} />
                      <span>{isCreatingAnnouncement ? 'Cancel Broadcast' : 'New Announcement'}</span>
                    </button>
                  </div>

                  {/* Create Announcement Form */}
                  {isCreatingAnnouncement && (
                    <form 
                      onSubmit={handleCreateAnnouncement}
                      className="ios-card" 
                      style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '2px solid var(--ios-blue)' }}
                    >
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ios-blue)' }}>
                        Broadcast Details
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Announcement Title *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Schedule Sync Maintenance Notice"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Format Type
                          </label>
                          <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value as any)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13px', fontWeight: 600 }}
                          >
                            <option value="banner">Top Banner (Persistent)</option>
                            <option value="modal">Pop-up Modal (High Impact)</option>
                            <option value="toast">Quick Toast Notice</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Alert Variant / Tone
                          </label>
                          <select
                            value={newVariant}
                            onChange={(e) => setNewVariant(e.target.value as any)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13px', fontWeight: 600 }}
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
                          Message Content *
                        </label>
                        <textarea
                          placeholder="Write the full message details shown to students..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          rows={3}
                          required
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13px', resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Action Button Label (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Read Guidelines"
                            value={newActionText}
                            onChange={(e) => setNewActionText(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ios-text-secondary)' }}>
                            Action URL / Link (Optional)
                          </label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={newActionUrl}
                            onChange={(e) => setNewActionUrl(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', color: 'var(--ios-text-primary)', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setIsCreatingAnnouncement(false)}
                          style={{ padding: '8px 16px', borderRadius: '10px', background: 'var(--ios-bg-secondary)', border: '1px solid var(--ios-card-border)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '10px', background: 'var(--ios-blue)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          <Send size={14} />
                          <span>Publish Announcement</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Existing Announcements */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {announcements.length === 0 ? (
                      <div className="ios-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--ios-text-secondary)' }}>
                        No announcements published yet. Click "New Announcement" to broadcast to students.
                      </div>
                    ) : (
                      announcements.map((item) => (
                        <div 
                          key={item.id} 
                          className="ios-card" 
                          style={{ 
                            padding: '16px 20px', 
                            borderRadius: '16px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            opacity: item.isActive ? 1 : 0.6,
                            borderLeft: `4px solid ${
                              item.variant === 'alert' ? 'var(--ios-red)' :
                              item.variant === 'warning' ? 'var(--ios-orange)' :
                              item.variant === 'update' ? 'var(--ios-green)' : 'var(--ios-blue)'
                            }`
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '75%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ios-text-primary)' }}>
                                {item.title}
                              </span>
                              <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '6px', background: 'var(--ios-bg-secondary)', color: 'var(--ios-text-secondary)' }}>
                                {item.type}
                              </span>
                              {item.isActive ? (
                                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ios-green)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle2 size={12} /> Live
                                </span>
                              ) : (
                                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ios-text-muted)' }}>
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--ios-text-secondary)', lineHeight: 1.4 }}>
                              {item.message}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleAnnouncement(item.id, item.isActive)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: item.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: item.isActive ? 'var(--ios-red)' : 'var(--ios-green)',
                                border: 'none',
                                fontSize: '12px',
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
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'var(--ios-bg-secondary)',
                                border: '1px solid var(--ios-card-border)',
                                color: 'var(--ios-red)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Delete announcement"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
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
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div 
              className="ios-card"
              style={{
                maxWidth: '480px',
                width: '100%',
                padding: '28px',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div 
                    style={{ 
                      width: '54px', 
                      height: '54px', 
                      borderRadius: '50%', 
                      background: selectedUser.accentColor || 'var(--ios-blue)', 
                      color: '#fff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '18px',
                      overflow: 'hidden'
                    }}
                  >
                    {selectedUser.profilePhotoUrl ? (
                      <img src={selectedUser.profilePhotoUrl} alt={selectedUser.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      selectedUser.fullName.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{selectedUser.fullName}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
                      ID: {selectedUser.studentNumber || 'Unassigned'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--ios-bg-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)' }}>
                  <div style={{ color: 'var(--ios-text-muted)', fontWeight: 700, fontSize: '10.5px' }}>CAMPUS</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>{selectedUser.schoolName}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)' }}>
                  <div style={{ color: 'var(--ios-text-muted)', fontWeight: 700, fontSize: '10.5px' }}>PROGRAM</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>{selectedUser.program || 'General'}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)' }}>
                  <div style={{ color: 'var(--ios-text-muted)', fontWeight: 700, fontSize: '10.5px' }}>YEAR & SECTION</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>{selectedUser.yearLevel || 'N/A'} - {selectedUser.section || 'N/A'}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--ios-bg-secondary)' }}>
                  <div style={{ color: 'var(--ios-text-muted)', fontWeight: 700, fontSize: '10.5px' }}>COURSES / EVENTS</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>{selectedUser.totalCourses} courses • {selectedUser.totalEvents} events</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                <div><strong>Last Active:</strong> {selectedUser.lastActiveAt ? new Date(selectedUser.lastActiveAt).toLocaleString() : 'Never'}</div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{
                  width: '100%',
                  padding: '12px',
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
    </div>
  );
};

export default AdminDashboardModal;
