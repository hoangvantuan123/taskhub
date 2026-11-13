import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, RotateCcw } from 'lucide-react';
import SettingsNav, { SETTINGS_TABS } from '../components/SettingsNav';
import PersonalProfile from './PersonalProfile';
import SecuritySettings from './SecuritySettings';
import TableDisplaySettings from './TableDisplaySettings';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Modal from '../../../shared/ui/Modal';
import { useAuth } from '../../../shared/hooks/useAuth';
import { authService } from '../../../services/auth/auth.service';
import { useTablePreferences } from '../../../shared/lib/tablePreferences';

const activityColumns = [
  { id: 'created_at', label: 'Thời gian', width: 180 },
  { id: 'action', label: 'Hoạt động', width: 140 },
  { id: 'success', label: 'Kết quả', width: 150 },
  { id: 'ip', label: 'Địa chỉ IP', width: 160 },
  { id: 'user_agent', label: 'Trình duyệt / Thiết bị', flex: true, minWidth: 280 },
];

const normalize = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLocaleLowerCase('vi')
    .trim();

export default function SettingsPage() {
  const { currentUser } = useAuth();
  return <PersonalSettings key={currentUser?.id || currentUser?.username} currentUser={currentUser} />;
}

function PersonalSettings({ currentUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [tab, setTabState] = useState(() =>
    SETTINGS_TABS.some(t => t.id === initialTab) ? initialTab : 'profile'
  );

  const setTab = nextTab => {
    setTabState(nextTab);
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextTab);
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && SETTINGS_TABS.some(t => t.id === tabParam) && tabParam !== tab) {
      setTabState(tabParam);
    }
  }, [searchParams]);

  // Activity Log State
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState({ key: 'created_at', direction: -1 });
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState(null);

  const preferences = useTablePreferences();

  const formatCell = (column, row) => {
    if (column.id === 'created_at') {
      try {
        return new Date(row.created_at).toLocaleString('vi-VN', {
          timeZone: preferences.timezone || 'Asia/Ho_Chi_Minh',
        });
      } catch {
        return row.created_at || '—';
      }
    }
    if (column.id === 'success') {
      return row.success ? 'Thành công' : 'Không thành công';
    }
    return String(row[column.id] || '—');
  };

  useEffect(() => {
    if (tab !== 'activity') return;
    let active = true;
    setLoading(true);
    setError('');

    authService
      .history()
      .then(result => {
        if (!active) return;
        setHistory(
          (result.history || []).map((evt, idx) => ({
            ...evt,
            id: evt.id || `${evt.created_at || 'evt'}-${idx}`,
            action: evt.action || 'Đăng nhập',
          }))
        );
      })
      .catch(() => {
        if (active) {
          setHistory([]);
          setError('Không thể tải nhật ký hoạt động cá nhân. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tab, reload]);

  // Filter & Sort Activity History
  const filtered = useMemo(() => {
    return history
      .filter(row => {
        const matchesSearch =
          !search ||
          activityColumns.some(col => normalize(formatCell(col, row)).includes(normalize(search)));

        const matchesStatus =
          statusFilter === '' || String(row.success) === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sort.key === 'created_at') {
          diff = new Date(a.created_at) - new Date(b.created_at);
        } else {
          diff = formatCell({ id: sort.key }, a).localeCompare(formatCell({ id: sort.key }, b), 'vi');
        }
        return diff * (sort.direction === 1 ? 1 : -1);
      });
  }, [history, search, statusFilter, sort, preferences.timezone]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = useMemo(() => {
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filtered, currentPage, pageSize]);

  const hasActiveFilters = Boolean(search || statusFilter);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Left Sidebar Navigation */}
      <SettingsNav
        activeTab={tab}
        onSelectTab={setTab}
        currentUser={currentUser}
      />

      {/* Right Main Content Workspace */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-white dark:bg-slate-950">
        {tab === 'profile' && <PersonalProfile />}
        {tab === 'security' && <SecuritySettings />}
        {tab === 'display' && <TableDisplaySettings />}

        {tab === 'activity' && (
          <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
            {/* Top Header */}
            <header className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-950">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Nhật ký hoạt động
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lịch sử đăng nhập và các sự kiện bảo mật của tài khoản.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={RefreshCw}
                  disabled={loading}
                  onClick={() => setReload(v => v + 1)}
                >
                  Làm mới
                </Button>
              </div>
            </header>

            {/* Filter Toolbar */}
            <div className="px-8 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput
                  size="sm"
                  className="w-72 max-w-full"
                  placeholder="Tìm hoạt động, địa chỉ IP, thiết bị…"
                  value={search}
                  onChange={e => {
                    setSearch(typeof e === 'string' ? e : e?.target?.value ?? '');
                    setPage(1);
                  }}
                  onClear={() => {
                    setSearch('');
                    setPage(1);
                  }}
                />

                <Select
                  size="sm"
                  className="w-40"
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tất cả kết quả' },
                    { value: 'true', label: 'Thành công' },
                    { value: 'false', label: 'Không thành công' },
                  ]}
                />

                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={RotateCcw}
                    onClick={resetFilters}
                    title="Xóa bộ lọc"
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Xóa lọc
                  </Button>
                )}
              </div>
            </div>

            {/* Virtual Data Table Canvas */}
            <div className="flex-1 min-h-0 relative overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full p-8 text-xs text-slate-500">
                  Đang tải nhật ký hoạt động…
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full p-8 text-xs text-rose-600">
                  {error}
                </div>
              ) : (
                <VirtualDataTable
                  columns={activityColumns}
                  rows={rows}
                  formatCell={formatCell}
                  onOpen={row => setDetailRow(row)}
                  emptyMessage={
                    history.length
                      ? 'Không có hoạt động nào phù hợp với bộ lọc.'
                      : 'Chưa ghi nhận lịch sử đăng nhập nào.'
                  }
                  sort={sort}
                  onSort={key => {
                    setSort(prev => ({
                      key,
                      direction: prev.key === key ? -prev.direction : 1,
                    }));
                  }}
                />
              )}
            </div>

            {/* Status Footer */}
            <div className="h-8 min-h-[32px] px-3 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <TableStatusFooter
                title="Nhật ký hoạt động của tôi"
                totalCount={filtered.length}
                unit="lần đăng nhập"
                page={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                pageSizeOptions={[25, 50, 100]}
                onPageChange={setPage}
                onPageSizeChange={sz => {
                  setPageSize(sz);
                  setPage(1);
                }}
                loading={loading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Activity Detail Modal */}
      <Modal
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        title="Chi tiết hoạt động đăng nhập"
        size="md"
        density="compact"
        footer={
          <Button size="sm" variant="outline" onClick={() => setDetailRow(null)}>
            Đóng
          </Button>
        }
      >
        {detailRow && (
          <dl className="space-y-3.5 text-xs">
            {activityColumns.map(col => (
              <div
                key={col.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <dt className="font-semibold text-slate-500 dark:text-slate-400 mb-1">{col.label}</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100 break-words whitespace-pre-wrap font-mono">
                  {formatCell(col, detailRow)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
