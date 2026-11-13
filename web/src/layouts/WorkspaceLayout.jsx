import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HelpDialog from '../shared/components/HelpDialog';
import { Menu, CircleHelp, PanelLeftClose, ChevronDown } from 'lucide-react';
import { useAuth } from '../shared/hooks/useAuth';
import { navigation } from '../app/navigation';
import { groupedNavigation, visibleNavigation } from '../app/navigationGroups';

const SUBNAV_WIDTH_KEY = 'etpms_subnav_width';
const DEFAULT_SUBNAV_WIDTH = 250;
const MIN_SUBNAV_WIDTH = 190;
const MAX_SUBNAV_WIDTH = 420;

export default function WorkspaceLayout() {
  const { currentUser, authLoading, hasPermission } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Persistent sub-navigation collapsed preference in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('skillhub_subnav_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Persistent custom dragged width for sub-navigation sidebar
  const [subnavWidth, setSubnavWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(SUBNAV_WIDTH_KEY));
      if (Number.isFinite(saved) && saved >= MIN_SUBNAV_WIDTH && saved <= MAX_SUBNAV_WIDTH) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SUBNAV_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ startX: 0, startWidth: DEFAULT_SUBNAV_WIDTH });

  useEffect(() => {
    document.documentElement.style.setProperty('--subnav-width', `${subnavWidth}px`);
    try {
      localStorage.setItem(SUBNAV_WIDTH_KEY, String(subnavWidth));
    } catch {
      // ignore storage errors
    }
  }, [subnavWidth]);

  const startResizing = useCallback(
    event => {
      event.preventDefault();
      dragStartRef.current = { startX: event.clientX, startWidth: subnavWidth };
      setIsResizing(true);
    },
    [subnavWidth]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = event => {
      const delta = event.clientX - dragStartRef.current.startX;
      const nextWidth = Math.min(
        MAX_SUBNAV_WIDTH,
        Math.max(MIN_SUBNAV_WIDTH, Math.round(dragStartRef.current.startWidth + delta))
      );
      setSubnavWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const resetSubnavWidth = useCallback(() => {
    setSubnavWidth(DEFAULT_SUBNAV_WIDTH);
  }, []);

  const [chosenGroupId, setChosenGroupId] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = useCallback((sectionName) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  }, []);

  // Reset manually chosen group when route changes so subnav tracks current route
  useEffect(() => {
    setChosenGroupId(null);
  }, [location.pathname]);

  const groups = groupedNavigation(visibleNavigation(navigation, currentUser, hasPermission));
  const isMyTasksPath = location.pathname === '/app/tasks/my' || location.pathname.startsWith('/app/tasks/my/');
  const isProjectsPath = location.pathname.startsWith('/app/tasks/projects');
  const isCalendarMy = location.pathname === '/app/tasks/calendar' && location.search.includes('filter=my');
  const isCalendarWorkspace = location.pathname === '/app/tasks/calendar' && !location.search.includes('filter=my');
  const routeGroup = (isMyTasksPath || isCalendarMy ? groups.find(g => g.id === 'my-workspace') : null)
    || (isProjectsPath || isCalendarWorkspace ? groups.find(g => g.id === 'workspace') : null)
    || groups.find(group =>
      group.entries.some(item => {
        const fullUrl = location.pathname + location.search;
        if (item.path.includes('?')) {
          return fullUrl === item.path;
        }
        if (location.pathname === '/app/tasks' && location.search && group.id === 'workspace' && (location.search.includes('filter=important') || location.search.includes('filter=my'))) {
          return false;
        }
        if (group.id === 'workspace' && isMyTasksPath) {
          return false;
        }
        const itemBase = item.path.split('?')[0];
        if (location.pathname === itemBase && (!location.search || group.id !== 'workspace')) return true;
        if (itemBase === '/app/tasks' && location.pathname === '/app/tasks/new') return true;
        return itemBase !== '/app/tasks' && location.pathname.startsWith(itemBase + '/');
      })
    ) || groups.find(group =>
      group.entries.some(item => {
        const itemBase = item.path.split('?')[0];
        return location.pathname === itemBase;
      })
    );

  const activeGroup = chosenGroupId ? groups.find(g => g.id === chosenGroupId) : routeGroup;
  const selectedGroup = collapsed ? null : activeGroup;

  const sections = useMemo(() => {
    if (!selectedGroup) return [];
    const map = new Map();
    selectedGroup.entries.forEach(item => {
      const sec = item.section || 'Chức năng';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec).push(item);
    });
    return Array.from(map.entries()).map(([section, items]) => ({ section, items }));
  }, [selectedGroup]);

  const selectGroup = id => {
    if (!id) {
      setCollapsed(true);
      setChosenGroupId(null);
      try {
        localStorage.setItem('skillhub_subnav_collapsed', 'true');
      } catch (e) {
        console.error(e);
      }
    } else {
      setCollapsed(false);
      setChosenGroupId(id);
      try {
        localStorage.setItem('skillhub_subnav_collapsed', 'false');
      } catch (e) {
        console.error(e);
      }
    }
  };
  if (authLoading) return <div className="p-8">Đang xác thực…</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  const routeItem = navigation
    .filter(
      item =>
        item.path !== '/app' &&
        (location.pathname === item.path.split('?')[0] ||
          (item.path.split('?')[0] === '/app/tasks' && location.pathname === '/app/tasks/new') ||
          (item.path.split('?')[0] !== '/app/tasks' && location.pathname.startsWith(item.path.split('?')[0] + '/')))
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (routeItem?.permission && !hasPermission(routeItem.permission)) return <Navigate to="/access-denied" replace />;
  if (
    !routeItem?.permission &&
    (location.pathname.startsWith('/manage') || location.pathname.startsWith('/admin')) &&
    location.pathname !== '/admin/settings' &&
    currentUser.role === 'learner'
  ) {
    return <Navigate to="/access-denied" replace />;
  }
  return (
    <div className={`app-layout ${selectedGroup ? 'has-subnavigation' : ''}`}>
      <Sidebar
        selectedGroupId={selectedGroup?.id}
        onSelectGroup={selectGroup}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onOpenHelp={() => setHelpOpen(true)}
      />
      <div className="shell">
        {selectedGroup && (
          <aside
            className="workspace-subnavigation"
            style={{ width: `${subnavWidth}px` }}
            aria-label={selectedGroup.label}
          >
            <header>
              <strong className="truncate pr-2" title={selectedGroup.label}>
                {selectedGroup.label}
              </strong>
              <button
                type="button"
                aria-label="Thu gọn menu con"
                title="Thu gọn menu con"
                onClick={() => selectGroup('')}
              >
                <PanelLeftClose size={16} />
              </button>
            </header>
            <nav aria-label="Menu chức năng" className="subnav-menu-list">
              {sections.map(({ section, items }) => {
                const isSectionCollapsed = Boolean(collapsedSections[section]);
                return (
                  <div key={section} className="subnav-group">
                    <button
                      type="button"
                      onClick={() => toggleSection(section)}
                      className="subnav-group-header"
                      title={isSectionCollapsed ? `Mở rộng ${section}` : `Thu gọn ${section}`}
                    >
                      <span className="subnav-group-title">{section}</span>
                      <div className="subnav-group-header-right">
                        <span className="subnav-group-count">{items.length}</span>
                        <ChevronDown
                          size={13}
                          className={`subnav-group-chevron transition-transform duration-150 ${
                            isSectionCollapsed ? '-rotate-90 opacity-50' : 'opacity-80'
                          }`}
                        />
                      </div>
                    </button>
                    {!isSectionCollapsed && (
                      <div className="subnav-group-items">
                        {items.map(item => {
                          const Icon = item.icon;
                          const fullCurrentUrl = location.pathname + location.search;
                          const active = item.path.includes('?')
                            ? fullCurrentUrl === item.path
                            : location.pathname === item.path && !location.search;
                          return (
                            <Link
                              key={item.id}
                              to={item.path}
                              className="subnav-item"
                              aria-current={active ? 'page' : undefined}
                              title={item.label}
                            >
                              <Icon size={16} className="subnav-item-icon" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            <footer>Goldsun Packaging · Quản lý công việc</footer>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Kéo để thay đổi độ rộng thanh menu (Nhấp đúp để đặt lại)"
              title="Kéo để thay đổi độ rộng thanh menu (Nhấp đúp để đặt lại)"
              className={`workspace-subnavigation-resizer ${isResizing ? 'is-resizing' : ''}`}
              onMouseDown={startResizing}
              onDoubleClick={resetSubnavWidth}
            />
          </aside>
        )}
        <div className="shell-main flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <div className="md:hidden flex items-center justify-between px-4 h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Mở menu"
              >
                <Menu size={20} />
              </button>
              <img src="/assets/goldsun/goldsun-icon.png" alt="Goldsun" className="w-5 h-5 object-contain" />
              <span className="font-bold text-emerald-800 dark:text-emerald-400 text-sm tracking-wide">
                Quản lý công việc
              </span>
            </div>
            <button
              onClick={() => setHelpOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400"
              title="Trợ giúp"
            >
              <CircleHelp size={18} />
            </button>
          </div>
          <div className="content-scroll workstation-no-scroll flex-1">
            <main id="main" className="content workstation-content">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
