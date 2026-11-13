import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  House,
  BookOpen,
  Target,
  Award,
  FileQuestion,
  FileText,
  CalendarDays,
  ClipboardCheck,
  Users,
  BarChart3,
  UserCog,
  ShieldCheck,
  Boxes,
  X,
  Sun,
  Moon,
  Bell,
  CircleHelp,
  CheckCheck,
  LogOut,
  UserRound,
  Settings,
  KeyRound,
  ChevronRight,
  Eye,
  EyeOff,
  Hexagon,
  LayoutDashboard,
} from 'lucide-react';
import { navigation } from '../../app/navigation';
import { visibleNavigation, groupedNavigation } from '../../app/navigationGroups';
import { useAuth } from '../../shared/hooks/useAuth';
import { ROLES } from '../../shared/config/constants';
import Modal from '../../shared/ui/Modal';
import Button from '../../shared/ui/Button';
import { authService } from '../../services/auth/auth.service';
import { mockApi } from '../../mocks/mockService';

function passwordStrength(value) {
  if (!value) return { score: 0, label: '' };
  let score = 0;
  const length = Array.from(value).length;
  if (length >= 12) score++;
  if (length >= 16) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  score = Math.min(4, score);
  return { score, label: ['Yếu', 'Yếu', 'Trung bình', 'Tốt', 'Mạnh'][score] };
}

function getUserInitials(user) {
  if (!user?.name && !user?.username) return 'TU';
  const name = (user.name || user.username).trim();
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1];
  return last.slice(0, 2).toUpperCase();
}

function PasswordInput({ label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{label}<span className="relative mt-1 block"><input required type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"/><button type="button" onClick={() => setVisible(current => !current)} aria-label={(visible ? 'Ẩn ' : 'Hiện ') + label.toLowerCase()} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>;
}

function AccountPasswordForm({ user, onActionState }) {
  const { refreshUser } = useAuth();
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const strength = passwordStrength(values.next);
  const passwordLengthValid = Array.from(values.next).length >= 12 && new TextEncoder().encode(values.next).length <= 72;
  const passwordsMatch = Boolean(values.confirm) && values.next === values.confirm;
  const canSubmit = Boolean(values.current && values.next && values.confirm) && passwordLengthValid && passwordsMatch && values.current !== values.next;
  const strengthColors = ['bg-slate-200 dark:bg-slate-700', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-600'];
  const initials = (user?.name || user?.username || 'U').trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toLocaleUpperCase('vi');
  useEffect(() => { onActionState?.({ canSubmit, busy }); }, [onActionState, canSubmit, busy]);
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setError(''); setMessage('');
    const chars = Array.from(values.next).length;
    if (chars < 12 || new TextEncoder().encode(values.next).length > 72) return setError('Mật khẩu mới cần ít nhất 12 ký tự.');
    if (values.next !== values.confirm) return setError('Mật khẩu xác nhận chưa khớp.');
    if (values.current === values.next) return setError('Mật khẩu mới phải khác mật khẩu hiện tại.');
    setBusy(true);
    try {
      await authService.changePassword({ current_password: values.current, new_password: values.next, RowVersion: user?.RowVersion });
      try { await refreshUser(); } catch { /* Password update already succeeded. */ }
      setMessage('Đã đổi mật khẩu thành công. Các phiên đăng nhập khác đã được đăng xuất.');
      setValues({ current: '', next: '', confirm: '' });
    } catch (requestError) { setError(requestError.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-5 md:grid-cols-[165px_minmax(0,1fr)]">
    <aside className="md:border-r md:border-slate-200 md:pr-5 dark:md:border-slate-800"><div className="flex items-center gap-3 md:flex-col md:items-start"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-700 text-xs font-semibold text-white">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover"/> : initials}</div><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name || 'Tài khoản'}</h3><p className="truncate text-[11px] text-slate-500">@{user?.username || user?.email}</p></div></div><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-[11px] text-slate-500">Vai trò</dt><dd className="mt-0.5 font-medium">{user?.roleName || user?.role || 'Chưa cập nhật'}</dd></div><div><dt className="text-[11px] text-slate-500">Đơn vị</dt><dd className="mt-0.5 font-medium">{user?.department || 'Chưa cập nhật'}</dd></div></dl><p className="mt-4 hidden text-[11px] leading-4 text-slate-500 md:block">Đổi mật khẩu sẽ kết thúc các phiên đăng nhập khác.</p></aside>
    <form id="account-password-form" onSubmit={submit} className="min-w-0 space-y-3"><p className="text-xs text-slate-600 dark:text-slate-300">Nhập mật khẩu hiện tại và chọn mật khẩu mới.</p>{[['current','Mật khẩu hiện tại'],['next','Mật khẩu mới'],['confirm','Nhập lại mật khẩu mới']].map(([key,label])=><PasswordInput key={key} label={label} autoComplete={key==='current'?'current-password':'new-password'} value={values[key]} onChange={event=>setValues(previous=>({...previous,[key]:event.target.value}))}/>)}{values.confirm&&<p aria-live="polite" className={passwordsMatch?'text-[11px] text-emerald-700 dark:text-emerald-400':'text-[11px] text-rose-600'}>{passwordsMatch?'Mật khẩu xác nhận khớp.':'Mật khẩu xác nhận chưa khớp.'}</p>}<div aria-live="polite" className="space-y-1"><div className="flex items-center justify-between text-[11px]"><span className="text-slate-500">Độ mạnh mật khẩu</span><span className={strength.score < 2 ? 'text-rose-600' : strength.score < 4 ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-400'}>{values.next ? strength.label : 'Chưa nhập'}</span></div><div className="grid grid-cols-4 gap-1" aria-hidden="true">{[1,2,3,4].map(level=><div key={level} className={`h-1 rounded-full ${strength.score >= level ? strengthColors[strength.score] : 'bg-slate-100 dark:bg-slate-800'}`}/>)}</div></div><p className="text-[11px] leading-4 text-slate-500">Ít nhất 12 ký tự; nên kết hợp chữ hoa, chữ thường, số và ký hiệu.</p>{error&&<p role="alert" className="text-xs text-rose-600">{error}</p>}{message&&<p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{message}</p>}</form>
  </div>;
}

export default function Sidebar({ open, onClose, onOpenHelp, selectedGroupId, onSelectGroup }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, hasPermission, logout } = useAuth();
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordAction, setPasswordAction] = useState({ canSubmit: false, busy: false });

  // Popover state: null | 'notifications' | 'profile'
  const [popover, setPopover] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const popoverRef = useRef(null);
  const avatarBtnRef = useRef(null);

  useEffect(() => {
    if (!popover) return;
    const closeOnEscape = event => { if (event.key === 'Escape') setPopover(null); };
    const handleOutsideClick = event => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        !avatarBtnRef.current?.contains(event.target)
      ) {
        setPopover(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [popover]);

  // Floating tooltip for desktop collapsed rail
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  const showTooltip = (label, e) => {
    if (window.innerWidth <= 768) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label,
      top: rect.top + rect.height / 2,
    });
  };

  const hideTooltip = () => {
    setHoveredTooltip(null);
  };

  // Theme toggle state (syncs with localStorage & class dark on html)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('skillhub_theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('skillhub_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    mockApi.getNotifications().then((res) => setNotifications(res.data || []));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    const res = await mockApi.markAllNotificationsAsRead();
    setNotifications(res.data || []);
  };

  const visibleItems = visibleNavigation(navigation, currentUser, hasPermission);
  const groups = groupedNavigation(visibleItems);
  const bottomItems = visibleItems.filter(item => item.isBottom);
  const activeGroup = groups.find(group => {
    if (selectedGroupId && group.id === selectedGroupId) return true;
    if (group.id === 'my-workspace' && (location.pathname === '/app/tasks/my' || location.pathname.startsWith('/app/tasks/my/'))) return true;
    if (group.id === 'workspace' && (location.pathname === '/app/tasks/my' || location.pathname.startsWith('/app/tasks/my/'))) return false;
    if (group.id === 'workspace' && location.pathname.startsWith('/app/tasks/projects')) return true;
    if (group.id === 'my-workspace' && location.pathname.startsWith('/app/tasks/projects')) return false;
    return group.entries.some(item => {
      const basePath = item.path.split('?')[0];
      return location.pathname === basePath || (basePath !== '/app/tasks' && location.pathname.startsWith(basePath + '/'));
    });
  });


  const operationalGroups = groups.filter((g) => !g.isSystem);
  const systemGroups = groups.filter((g) => g.isSystem);

  useEffect(() => { setPopover(null); }, [location.pathname]);
  return (
    <>
      {/* Mobile scrim / backdrop */}
      <button
        className={`scrim ${open ? 'visible' : ''}`}
        aria-label="Đóng menu"
        onClick={onClose}
      />


      <aside className={`sidebar ${open ? 'open' : ''}`} onMouseLeave={hideTooltip}>
        {/* Mobile drawer header (only on small screens) */}
        <div className="brand md:hidden">
          <Link
            to="/app"
            aria-label="Quản lý công việc - Trang chủ"
            onClick={() => { hideTooltip(); onClose?.(); }}
            className="flex items-center gap-2"
          >
            <span className="font-bold tracking-wider text-slate-900 dark:text-white text-sm">Quản lý công việc</span>
          </Link>
          <button className="mobile-close icon-button" onClick={onClose} aria-label="Đóng menu">
            <X size={18} />
          </button>
        </div>

        {/* Navigation list: each icon logically represents one functional module */}
        <nav aria-label="Điều hướng chính" className="grouped-navigation">
          {/* Top Home / Dashboard Link */}
          <Link
            to="/app"
            className={`nav-item ${location.pathname === '/app' ? 'active' : ''}`}
            aria-label="Tổng quan"
            aria-current={location.pathname === '/app' ? 'page' : undefined}
            onClick={() => {
              setPopover(null);
              onSelectGroup?.('');
              onClose?.();
            }}
            onMouseEnter={(e) => showTooltip('Tổng quan', e)}
            onMouseLeave={hideTooltip}
          >
            <LayoutDashboard size={19} strokeWidth={location.pathname === '/app' ? 2 : 1.7} />
            {unreadCount > 0 && <span className="nav-dot" />}
            <span className="mobile-only-label">Tổng quan</span>
          </Link>

          <div className="nav-group-divider" />

          {/* Operational Module Groups */}
          {operationalGroups.map((group) => {
            const Icon = group.icon;
            const inCurrentRoute = group.entries.some((entry) => {
              const fullUrl = location.pathname + location.search;
              if (entry.path.includes('?')) {
                return fullUrl === entry.path;
              }
              if (location.pathname.startsWith('/app/tasks/projects')) {
                return group.id === 'workspace';
              }
              if (location.pathname === '/app/tasks/calendar') {
                if (location.search.includes('filter=my')) {
                  return group.id === 'my-workspace';
                }
                return group.id === 'workspace';
              }
              if (location.pathname === '/app/tasks' && location.search && group.id === 'workspace' && (location.search.includes('filter=important') || location.search.includes('filter=my'))) {
                return false;
              }
              if (group.id === 'workspace' && (location.pathname === '/app/tasks/my' || location.pathname.startsWith('/app/tasks/my/'))) {
                return false;
              }
              if (group.id === 'my-workspace' && (location.pathname === '/app/tasks/my' || location.pathname.startsWith('/app/tasks/my/'))) {
                return true;
              }
              const basePath = entry.path.split('?')[0];
              return (
                (location.pathname === basePath && (!location.search || group.id !== 'workspace')) ||
                (basePath !== '/app/tasks' && location.pathname.startsWith(basePath + '/'))
              );
            });
            const isExpanded = selectedGroupId === group.id;
            const isActive = isExpanded || inCurrentRoute;

            const handleClick = () => {
              hideTooltip();
              setPopover(null);
              if (group.entries.length === 1) {
                onSelectGroup?.('');
                navigate(group.entries[0].path);
                onClose?.();
                return;
              }
              if (isExpanded) {
                onSelectGroup?.('');
              } else {
                onSelectGroup?.(group.id);
                if (!inCurrentRoute) {
                  navigate(group.defaultPath || group.entries[0].path);
                }
              }
            };

            return (
              <div key={group.id} className="nav-group-wrapper w-full flex flex-col items-center">
                <button
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  aria-label={group.label}
                  aria-expanded={isExpanded}
                  onClick={handleClick}
                  onMouseEnter={(e) => showTooltip(group.label, e)}
                  onMouseLeave={hideTooltip}
                >
                  <Icon size={19} strokeWidth={isActive ? 2 : 1.7} />
                  <span className="mobile-only-label">{group.label}</span>
                </button>

                {/* Mobile accordion submenu drawer */}
                {isExpanded && (
                  <div className="nav-mobile-children md:hidden">
                    {group.entries.map((item) => {
                      const ItemIcon = item.icon;
                      const itemActive =
                        location.pathname === item.path ||
                        (item.path !== '/app/tasks' && location.pathname.startsWith(item.path + '/'));
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          aria-current={itemActive ? 'page' : undefined}
                          onClick={() => {
                            setPopover(null);
                            onClose?.();
                          }}
                          className={`flex items-center gap-2 py-2 px-3 text-xs rounded-md ${
                            itemActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <ItemIcon size={14} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider separating Operational & Admin modules */}
          {systemGroups.length > 0 && <div className="nav-group-divider" />}

          {/* System Module Groups (Quản trị hệ thống) */}
          {systemGroups.map((group) => {
            const Icon = group.icon;
            const inCurrentRoute = group.entries.some((entry) => {
              const fullUrl = location.pathname + location.search;
              if (entry.path.includes('?')) {
                return fullUrl === entry.path;
              }
              if (location.pathname.startsWith('/app/tasks/projects')) {
                return group.id === 'workspace';
              }
              if (location.pathname === '/app/tasks/calendar') {
                if (location.search.includes('filter=my')) {
                  return group.id === 'my-workspace';
                }
                return group.id === 'workspace';
              }
              if (location.pathname === '/app/tasks' && location.search && group.id === 'workspace' && (location.search.includes('filter=important') || location.search.includes('filter=my'))) {
                return false;
              }
              if (group.id === 'workspace' && (location.pathname === '/app/tasks/my' || location.pathname.startsWith('/app/tasks/my/'))) {
                return false;
              }
              if (group.id === 'my-workspace' && (location.pathname === '/app/tasks/my' || location.pathname.startsWith('/app/tasks/my/'))) {
                return true;
              }
              const basePath = entry.path.split('?')[0];
              return (
                (location.pathname === basePath && (!location.search || group.id !== 'workspace')) ||
                (basePath !== '/app/tasks' && location.pathname.startsWith(basePath + '/'))
              );
            });
            const isExpanded = selectedGroupId === group.id;
            const isActive = isExpanded || inCurrentRoute;

            const handleClick = () => {
              hideTooltip();
              setPopover(null);
              if (group.entries.length === 1) {
                onSelectGroup?.('');
                navigate(group.entries[0].path);
                onClose?.();
                return;
              }
              if (isExpanded) {
                onSelectGroup?.('');
              } else {
                onSelectGroup?.(group.id);
                if (!inCurrentRoute) {
                  navigate(group.defaultPath || group.entries[0].path);
                }
              }
            };

            return (
              <div key={group.id} className="nav-group-wrapper w-full flex flex-col items-center">
                <button
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  aria-label={group.label}
                  aria-expanded={isExpanded}
                  onClick={handleClick}
                  onMouseEnter={(e) => showTooltip(group.label, e)}
                  onMouseLeave={hideTooltip}
                >
                  <Icon size={19} strokeWidth={isActive ? 2 : 1.7} />
                  <span className="mobile-only-label">{group.label}</span>
                </button>

                {/* Mobile accordion submenu drawer */}
                {isExpanded && (
                  <div className="nav-mobile-children md:hidden">
                    {group.entries.map((item) => {
                      const ItemIcon = item.icon;
                      const itemActive =
                        location.pathname === item.path ||
                        (item.path !== '/app/tasks' && location.pathname.startsWith(item.path + '/'));
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          aria-current={itemActive ? 'page' : undefined}
                          onClick={() => {
                            setPopover(null);
                            onClose?.();
                          }}
                          className={`flex items-center gap-2 py-2 px-3 text-xs rounded-md ${
                            itemActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <ItemIcon size={14} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Avatar Button */}
        <div className="sidebar-bottom-controls">
          <button
            ref={avatarBtnRef}
            type="button"
            className={`sidebar-avatar-btn ${popover === 'profile' ? 'active-avatar' : ''}`}
            aria-label="Mở hồ sơ và cài đặt tài khoản"
            title="Hồ sơ & cài đặt tài khoản"
            onClick={() => {
              hideTooltip();
              setPopover(prev => (prev === 'profile' ? null : 'profile'));
            }}
            onMouseEnter={(e) => {
              if (!popover) {
                showTooltip(`${currentUser?.name || 'Tài khoản'} (${currentUser?.roleName || 'Vai trò'})`, e);
              }
            }}
            onMouseLeave={hideTooltip}
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Ảnh đại diện" className="avatar-circle object-cover" />
            ) : (
              <span className="avatar-circle">{getUserInitials(currentUser) || <UserRound size={15} />}</span>
            )}
          </button>
        </div>

        {/* Global Floating Tooltip for Desktop Rail */}
        {hoveredTooltip && !popover && (
          <div
            className="sidebar-floating-tooltip"
            style={{ top: `${hoveredTooltip.top}px` }}
            role="tooltip"
          >
            {hoveredTooltip.label}
          </div>
        )}

        {/* Notifications Popover (Floats to the right of sidebar) */}
        {popover === 'notifications' && (
          <div
            ref={popoverRef}
            className="fixed z-[100] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-4 text-slate-800 dark:text-slate-100"
            style={{
              left: '64px',
              bottom: '50px',
              width: '340px',
              maxHeight: '440px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
              <div className="flex items-center gap-2">
                <strong className="text-sm font-bold text-slate-900 dark:text-white">Thông báo</strong>
                {unreadCount > 0 && (
                  <span className="text-[11px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 px-1.5 py-0.5"
                    title="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck size={14} /> Đã đọc
                  </button>
                )}
                <button
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  onClick={() => setPopover(null)}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 flex flex-col gap-2 max-h-[300px] pr-1">
              {notifications.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500 text-center py-6 text-xs">
                  Bạn chưa có thông báo nào.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl text-xs transition-colors ${
                      n.read
                        ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                        : 'bg-emerald-50/70 dark:bg-emerald-950/30 text-slate-800 dark:text-slate-200 border-l-2 border-emerald-600'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{n.title}</div>
                    <div className="text-slate-600 dark:text-slate-300 line-clamp-2">{n.message}</div>
                    <small className="text-slate-400 dark:text-slate-500 mt-1 block">{n.time}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* User Profile & Role Switcher Popover (Floats to the right of sidebar) */}
        {popover === 'profile' && (
          <div
            ref={popoverRef}
            className="fixed z-[100] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-3 text-slate-800 dark:text-slate-100"
            style={{
              left: '64px',
              bottom: '12px',
              width: 'min(290px, calc(100vw - 80px))',
              maxHeight: 'calc(100dvh - 24px)',
              overflowY: 'auto',
            }}
          >
            <div className="flex items-center justify-between gap-3 px-2 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
              <div className="flex items-center gap-3">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Ảnh đại diện" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center text-sm">
                    {getUserInitials(currentUser)}
                  </div>
                )}
                <div>
                  <strong className="text-sm font-semibold text-slate-900 dark:text-white block leading-tight">
                    {currentUser?.name || 'Tài khoản'}
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block max-w-48">
                    {currentUser?.username || currentUser?.email}
                  </span>
                </div>
              </div>
              <button
                aria-label="Đóng menu tài khoản"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={() => setPopover(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-2 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">{currentUser?.roleName || 'Tài khoản'}</span>
              {currentUser?.department && <span> · {currentUser.department}</span>}
            </div>

            <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
            <div className="space-y-0.5">
              <button type="button" onClick={() => { setPopover(null); navigate('/app/settings?tab=profile'); }} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                <UserRound size={17} className="text-slate-500"/><span className="flex-1">Hồ sơ cá nhân</span><ChevronRight size={15} className="text-slate-400"/>
              </button>
              <button type="button" onClick={() => { setPopover(null); navigate('/app/settings?tab=display'); }} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                <Settings size={17} className="text-slate-500"/><span className="flex-1">Cài đặt tài khoản</span><ChevronRight size={15} className="text-slate-400"/>
              </button>
              <button type="button" onClick={() => { setPopover(null); navigate('/app/settings?tab=security'); }} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                <KeyRound size={17} className="text-slate-500"/><span className="flex-1">Đổi mật khẩu</span><ChevronRight size={15} className="text-slate-400"/>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPopover(null);
                logout();
                navigate('/login');
              }}
              className="w-full mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Đăng xuất hệ thống</span>
            </button>
          </div>
        )}
      </aside>
      <Modal open={passwordDialog} onClose={() => { if (!passwordAction.busy) { setPasswordDialog(false); setPasswordAction({ canSubmit: false, busy: false }); } }} title="Đổi mật khẩu" size="md" maxWidth="560px" fitContent density="comfortable" footer={<><Button type="button" variant="outline" size="sm" disabled={passwordAction.busy} onClick={() => { setPasswordDialog(false); setPasswordAction({ canSubmit: false, busy: false }); }}>Đóng</Button><Button type="submit" form="account-password-form" size="sm" disabled={!passwordAction.canSubmit} loading={passwordAction.busy}>Cập nhật mật khẩu</Button></>}>
        <AccountPasswordForm user={currentUser} onActionState={setPasswordAction} />
      </Modal>
    </>
  );
}







