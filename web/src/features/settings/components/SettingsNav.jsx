import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRound, Lock, Palette, Clock } from 'lucide-react';

const SUBNAV_WIDTH_KEY = 'etpms_subnav_width';
const DEFAULT_SUBNAV_WIDTH = 250;
const MIN_SUBNAV_WIDTH = 190;
const MAX_SUBNAV_WIDTH = 420;

export const SETTINGS_TABS = [
  {
    id: 'profile',
    label: 'Hồ sơ cá nhân',
    description: 'Thông tin cá nhân, ảnh đại diện và cơ cấu tổ chức',
    icon: UserRound,
  },
  {
    id: 'security',
    label: 'Mật khẩu & Bảo mật',
    description: 'Thay đổi mật khẩu và tiêu chuẩn an toàn tài khoản',
    icon: Lock,
  },
  {
    id: 'display',
    label: 'Giao diện & Hiển thị',
    description: 'Tông màu thanh điều hướng, mật độ bảng và múi giờ',
    icon: Palette,
  },
  {
    id: 'activity',
    label: 'Nhật ký hoạt động',
    description: 'Lịch sử các phiên đăng nhập và bảo mật',
    icon: Clock,
  },
];

export default function SettingsNav({ activeTab, onSelectTab }) {
  const [subnavWidth, setSubnavWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(SUBNAV_WIDTH_KEY));
      if (Number.isFinite(saved) && saved >= MIN_SUBNAV_WIDTH && saved <= MAX_SUBNAV_WIDTH) {
        return saved;
      }
    } catch {
      // ignore
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
      // ignore
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
    const handleMouseUp = () => setIsResizing(false);

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

  return (
    <aside
      className="workspace-subnavigation"
      style={{ width: `${subnavWidth}px` }}
      aria-label="Menu cài đặt tài khoản"
    >
      <header>
        <strong className="truncate">Cài đặt tài khoản</strong>
      </header>

      <nav aria-label="Menu chức năng cài đặt" className="subnav-menu-list">
        <div className="subnav-group">
          <div className="subnav-group-items">
            {SETTINGS_TABS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`subnav-item flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer group ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelectTab(item.id)}
                  title={item.label}
                >
                  <Icon
                    size={16}
                    className={`subnav-item-icon shrink-0 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <footer>Goldsun Packaging · Quản lý công việc</footer>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Kéo để thay đổi độ rộng thanh menu (Nhấp đúp để đặt lại)"
        title="Kéo để thay đổi độ rộng thanh menu (Nhấp đúp để đặt lại)"
        className={`workspace-subnavigation-resizer ${isResizing ? 'is-resizing' : ''}`}
        onMouseDown={startResizing}
        onDoubleClick={() => setSubnavWidth(DEFAULT_SUBNAV_WIDTH)}
      />
    </aside>
  );
}
