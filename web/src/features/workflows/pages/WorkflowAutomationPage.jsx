import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw, ArrowLeft, Search, Trash2 } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import Input from '../../../shared/ui/Input';
import Tabs from '../../../shared/ui/Tabs';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../../tasks/services/taskService';
import { useAuth } from '../../../shared/hooks/useAuth';

const INITIAL_AUTOMATIONS = [
  {
    id: 'AUTO-01',
    code: 'AUTO_REMINDER_24H',
    name: 'Tự động gửi thông báo nhắc hạn trước 24 giờ',
    trigger: 'Trước hạn chót (Deadline - 24h)',
    action: 'Gửi Email & Push Notification cho Người phụ trách',
    lastRun: '07/11/2026 08:00',
    runsCount: 1420,
    status: 'Hoạt động',
    description: 'Chỉ nhắc nhở với những nhiệm vụ chưa đạt trạng thái In Review hoặc Done',
  },
  {
    id: 'AUTO-02',
    code: 'AUTO_RECURRING_MONDAY',
    name: 'Khởi tạo công việc bảo trì định kỳ sáng Thứ 2',
    trigger: 'Lịch định kỳ (Mỗi Thứ 2 lúc 07:00)',
    action: 'Nhân bản từ mẫu TPL_MAINTENANCE_PRINTER và gán cho ca trực',
    lastRun: '03/11/2026 07:00',
    runsCount: 52,
    status: 'Hoạt động',
    description: 'Tự động kích hoạt task kiểm tra dầu bôi trơn máy in ống đồng',
  },
  {
    id: 'AUTO-03',
    code: 'AUTO_ESCALATE_OVERDUE',
    name: 'Cảnh báo leo thang khi công việc trễ hạn quá 48 giờ',
    trigger: 'Quá hạn > 48 giờ',
    action: 'Gửi cảnh báo khẩn cấp tới Trưởng phòng & Ban Giám đốc',
    lastRun: '06/11/2026 15:30',
    runsCount: 19,
    status: 'Hoạt động',
    description: 'Hỗ trợ giám sát các nút thắt cổ chai trong tiến độ dự án',
  },
  {
    id: 'AUTO-04',
    code: 'AUTO_ARCHIVE_PROJECT',
    name: 'Tự động lưu trữ dự án sau 30 ngày hoàn tất',
    trigger: 'Tất cả nhiệm vụ đạt 100% Done sau 30 ngày',
    action: 'Chuyển dự án sang trạng thái Đã lưu trữ',
    lastRun: '01/11/2026 00:00',
    runsCount: 8,
    status: 'Hoạt động',
    description: 'Giúp dọn dẹp không gian làm việc của các bộ phận',
  },
];

export default function WorkflowAutomationPage() {
  const { currentUser, hasPermission } = useAuth();
  const isAdminOrManager = ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager'].includes((currentUser?.role || '').toLowerCase()) ||
                           currentUser?.username === 'admin';
  const canEdit = isAdminOrManager || hasPermission('workflows:create') || hasPermission('workflows:update');
  const canDelete = isAdminOrManager || hasPermission('workflows:delete');

  const [params, setParams] = useSearchParams();
  const [automations, setAutomations] = useState(INITIAL_AUTOMATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const activeId = params.get('item');
  const isCreating = activeId === 'new';
  const activeAuto = useMemo(() => {
    if (isCreating) {
      return {
        id: `AUTO-${String(automations.length + 1).padStart(2, '0')}`,
        code: '',
        name: '',
        trigger: 'Trước hạn chót (Deadline - 24h)',
        action: 'Gửi Email & Push Notification',
        lastRun: 'Chưa chạy',
        runsCount: 0,
        status: 'Hoạt động',
        description: '',
      };
    }
    return automations.find(a => a.id === activeId) || null;
  }, [activeId, isCreating, automations]);

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  React.useEffect(() => {
    if (activeAuto) {
      setDraft({ ...activeAuto });
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsDirty(false);
    }
  }, [activeAuto]);

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Mã tự động hóa', width: 190, sortable: true },
      { id: 'name', label: 'Tên kịch bản tự động', width: 280, sortable: true },
      { id: 'trigger', label: 'Điều kiện kích hoạt (Trigger)', width: 230 },
      { id: 'action', label: 'Hành động thực thi (Action)', width: 280 },
      { id: 'lastRun', label: 'Lần chạy cuối', width: 150 },
      { id: 'runsCount', label: 'Số lần chạy', width: 120 },
      { id: 'status', label: 'Trạng thái', width: 120 },
    ],
    []
  );

  const filteredAutomations = useMemo(() => {
    return automations.filter(a => {
      const matchSearch =
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.code.toLowerCase().includes(search.toLowerCase()) ||
        a.trigger.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [automations, search, statusFilter]);

  const paginatedAutomations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAutomations.slice(start, start + pageSize);
  }, [filteredAutomations, page, pageSize]);

  const handleOpenDetail = row => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  const handleDeleteAutomation = async (autoToDelete, e) => {
    if (e) e.stopPropagation();
    if (!autoToDelete) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa kịch bản tự động [${autoToDelete.code}] "${autoToDelete.name}" không?`
    );
    if (!confirmed) return;

    try {
      await taskService.deleteWorkflowAutomation(autoToDelete.id || autoToDelete.code);
      setAutomations(prev => prev.filter(a => a.id !== autoToDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== autoToDelete.id));
      notify(`Đã xóa kịch bản tự động "${autoToDelete.name}"`, 'success');
      if (activeId === autoToDelete.id) {
        handleCloseWorkspace();
      }
    } catch (err) {
      notify(err?.message || 'Không thể xóa kịch bản tự động', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} kịch bản tự động đã chọn không?`
    );
    if (!confirmed) return;
    try {
      for (const id of selectedIds) {
        await taskService.deleteWorkflowAutomation(id);
      }
      setAutomations(prev => prev.filter(a => !selectedIds.includes(a.id)));
      setSelectedIds([]);
      notify(`Đã xóa ${selectedIds.length} kịch bản tự động thành công`, 'success');
    } catch (err) {
      notify(err?.message || 'Không thể xóa các kịch bản tự động đã chọn', 'error');
    }
  };

  const handleSaveDraft = e => {
    e.preventDefault();
    if (!draft.name.trim()) {
      notify('Tên tự động hóa không được để trống', 'error');
      return;
    }
    if (isCreating) {
      const newAuto = {
        ...draft,
        code: draft.code || `AUTO_${Date.now().toString(36).toUpperCase()}`,
      };
      setAutomations(prev => [...prev, newAuto]);
      notify(`Đã kích hoạt kịch bản "${newAuto.name}"`, 'success');
    } else {
      setAutomations(prev => prev.map(a => (a.id === draft.id ? draft : a)));
      notify(`Đã cập nhật kịch bản "${draft.name}"`, 'success');
    }
    handleCloseWorkspace();
  };

  // In-Screen Workspace
  if (activeAuto && draft) {
    return (
      <ManagementFrame
        scrollableContent={false}
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleCloseWorkspace}>
                <ArrowLeft size={16} className="mr-1.5" />
                Quay lại
              </Button>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {isCreating ? 'Thiết lập tự động hóa quy trình mới' : draft.name}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Mã: @{draft.code || 'chưa đặt'} · Đã chạy: {draft.runsCount} lần
                  {isDirty && <span className="ml-2 text-amber-600 dark:text-amber-400 italic">(Có thay đổi chưa lưu)</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCloseWorkspace}>
                Hủy
              </Button>
              {!isCreating && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  onClick={() => handleDeleteAutomation(activeAuto)}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Xóa kịch bản
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleSaveDraft} disabled={!isDirty}>
                {isCreating ? 'Kích hoạt' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          {/* CỘT TRÁI: FORM CƠ BẢN (360px) */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông tin kịch bản
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên kịch bản <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.name}
                onChange={e => {
                  setDraft(d => ({ ...d, name: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Tự động nhắc việc..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mã kỹ thuật (Code)
              </label>
              <Input
                value={draft.code}
                onChange={e => {
                  setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }));
                  setIsDirty(true);
                }}
                placeholder="AUTO_REMINDER"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái hoạt động
              </label>
              <Select
                value={draft.status}
                onChange={v => {
                  setDraft(d => ({ ...d, status: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Hoạt động', label: 'Hoạt động (Đang chạy ngầm)' },
                  { value: 'Tạm ngưng', label: 'Tạm ngưng' },
                ]}
              />
            </div>
          </div>

          {/* CỘT PHẢI: TRIGGER & ACTION CANVAS */}
          <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Cấu hình Trigger (Kích hoạt) & Action (Thực thi)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Xác định chính xác thời điểm hệ thống bắt sự kiện và hành động cần thực thi tự động
              </p>
            </div>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Khi xảy ra sự kiện (WHEN / TRIGGER)
                </label>
                <Input
                  value={draft.trigger}
                  onChange={e => {
                    setDraft(d => ({ ...d, trigger: e.target.value }));
                    setIsDirty(true);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. Thực hiện ngay hành động (THEN / ACTION)
                </label>
                <Input
                  value={draft.action}
                  onChange={e => {
                    setDraft(d => ({ ...d, action: e.target.value }));
                    setIsDirty(true);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả chi tiết và điều kiện ngoại lệ
              </label>
              <textarea
                className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={4}
                value={draft.description}
                onChange={e => {
                  setDraft(d => ({ ...d, description: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Bỏ qua các nhiệm vụ đã gắn nhãn 'Không quan trọng'..."
              />
            </div>
          </div>
        </div>
      </ManagementFrame>
    );
  }

  // 4-Layer Standard Architecture (Identical to UserManagementPage)
  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <>
          <Tabs
            tabs={[
              { id: 'automation', label: 'Tự động hóa quy trình' }
            ]}
            activeTab="automation"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                {canDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Trash2}
                    className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    onClick={handleBulkDelete}
                  >
                    Xóa ({selectedIds.length})
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline px-1 cursor-pointer"
                >
                  Bỏ chọn
                </button>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 my-auto" />
              </>
            )}
            {canEdit && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setParams({ item: 'new' })}
              >
                Thêm tự động hóa
              </Button>
            )}
          </div>
        </>
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-64 max-w-full">
            <SearchInput
              size="sm"
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo tên kịch bản, mã hoặc điều kiện…"
            />
          </div>

          <button
            type="button"
            title="Tìm kiếm"
            aria-label="Tìm kiếm"
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Search size={15} />
          </button>

          <Select
            size="sm"
            className="w-48 text-xs font-medium"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'Hoạt động', label: 'Hoạt động' },
              { value: 'Tạm ngưng', label: 'Tạm ngưng' },
            ]}
          />

          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Xóa tất cả bộ lọc"
              aria-label="Xóa tất cả bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      }
      status={
        <TableStatusFooter
          title="Tự động hóa"
          totalCount={filteredAutomations.length}
          selectedCount={selectedIds.length}
          unit="kịch bản"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredAutomations.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-wf-automation-column-menu"
          onExport={() => notify('Đang xuất danh sách tự động hóa...', 'info')}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="admin-wf-automation:table"
        columnMenuTargetId="admin-wf-automation-column-menu"
        columns={columns}
        rows={paginatedAutomations}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={handleOpenDetail}
        formatCell={(column, row) => {
          if (column.id === 'name') {
            return (
              <span className="font-medium text-slate-800 dark:text-slate-200 hover:underline cursor-pointer">
                {row.name}
              </span>
            );
          }
          if (column.id === 'code') {
            return <span className="font-mono text-slate-600 dark:text-slate-400">@{row.code}</span>;
          }
          return String(row[column.id] ?? '—');
        }}
      />
    </ManagementFrame>
  );
}

