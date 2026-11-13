import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, ArrowLeft, GitBranch, Search, Trash2 } from 'lucide-react';
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

const INITIAL_WORKFLOWS = [
  {
    id: 'WF-01',
    code: 'TASK_STD',
    name: 'Quy trình giao việc & Nghiệm thu tiêu chuẩn',
    steps: 'Khởi tạo → Đang xử lý → Chờ nghiệm thu → Hoàn tất',
    stepCount: 4,
    scope: 'Toàn doanh nghiệp',
    activeTasks: 42,
    status: 'Hoạt động',
    updatedAt: '05/11/2026 14:30',
    description: 'Áp dụng cho mọi công việc giao ban và phối hợp liên phòng ban',
  },
  {
    id: 'WF-02',
    code: 'TASK_PROD',
    name: 'Quy trình sản xuất bao bì phức hợp (KCS duyệt)',
    steps: 'Lập lệnh → Chuẩn bị phôi → In ấn → Ghép màng → KCS nghiệm thu → Nhập kho',
    stepCount: 6,
    scope: 'Khối Sản xuất & Nhà máy',
    activeTasks: 18,
    status: 'Hoạt động',
    updatedAt: '03/11/2026 09:15',
    description: 'Quy trình kiểm soát chất lượng đóng gói và gia công in ống đồng',
  },
  {
    id: 'WF-03',
    code: 'TASK_FAST',
    name: 'Quy trình việc gấp / Khẩn cấp không qua nghiệm thu',
    steps: 'Tiếp nhận → Xử lý ngay → Đóng việc',
    stepCount: 3,
    scope: 'Khối Kỹ thuật & Bảo trì',
    activeTasks: 5,
    status: 'Hoạt động',
    updatedAt: '01/11/2026 16:45',
    description: 'Khắc phục sự cố máy móc và bảo trì khẩn cấp trong ca sản xuất',
  },
  {
    id: 'WF-04',
    code: 'TASK_RD',
    name: 'Quy trình nghiên cứu phát triển mẫu vật liệu mới',
    steps: 'Ý tưởng → Thử nghiệm LAB → Sản xuất thử → Đánh giá độ bền → Phê duyệt mẫu',
    stepCount: 5,
    scope: 'Phòng R&D & Thiết kế',
    activeTasks: 7,
    status: 'Tạm ngưng',
    updatedAt: '28/10/2026 11:20',
    description: 'Thử nghiệm mực in thân thiện môi trường và màng tự phân hủy',
  },
];

export default function WorkflowListPage() {
  const { currentUser, hasPermission } = useAuth();
  const isAdminOrManager = ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager'].includes((currentUser?.role || '').toLowerCase()) ||
                           currentUser?.username === 'admin';
  const canEdit = isAdminOrManager || hasPermission('workflows:create') || hasPermission('workflows:update');
  const canDelete = isAdminOrManager || hasPermission('workflows:delete');

  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // Backward compatibility: If accessed via legacy ?tab= query param, redirect to dedicated route
  useEffect(() => {
    const tab = params.get('tab');
    if (tab === 'statuses') navigate('/admin/workflows/statuses', { replace: true });
    else if (tab === 'rules') navigate('/admin/workflows/rules', { replace: true });
    else if (tab === 'templates') navigate('/admin/workflows/templates', { replace: true });
    else if (tab === 'automation') navigate('/admin/workflows/automation', { replace: true });
  }, [params, navigate]);

  const [workflows, setWorkflows] = useState(INITIAL_WORKFLOWS);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const activeId = params.get('item');
  const isCreating = activeId === 'new';
  const activeWorkflow = useMemo(() => {
    if (isCreating) {
      return {
        id: `WF-${String(workflows.length + 1).padStart(2, '0')}`,
        code: '',
        name: '',
        steps: 'Khởi tạo → Đang xử lý → Hoàn tất',
        stepCount: 3,
        scope: 'Toàn doanh nghiệp',
        status: 'Hoạt động',
        description: '',
      };
    }
    return workflows.find(w => w.id === activeId) || null;
  }, [activeId, isCreating, workflows]);

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Sync draft when active workflow changes
  React.useEffect(() => {
    if (activeWorkflow) {
      setDraft({ ...activeWorkflow });
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsDirty(false);
    }
  }, [activeWorkflow]);

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Mã quy trình', width: 140, sortable: true },
      { id: 'name', label: 'Tên quy trình', width: 280, sortable: true },
      { id: 'steps', label: 'Các bước xử lý', width: 340 },
      { id: 'scope', label: 'Phạm vi áp dụng', width: 200 },
      { id: 'activeTasks', label: 'Việc đang chạy', width: 130 },
      { id: 'status', label: 'Trạng thái', width: 130 },
      { id: 'updatedAt', label: 'Cập nhật lần cuối', width: 160 },
    ],
    []
  );

  const filteredWorkflows = useMemo(() => {
    return workflows.filter(w => {
      const matchSearch =
        !search ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.code.toLowerCase().includes(search.toLowerCase()) ||
        w.scope.toLowerCase().includes(search.toLowerCase());
      const matchScope = !scopeFilter || w.scope === scopeFilter;
      const matchStatus = !statusFilter || w.status === statusFilter;
      return matchSearch && matchScope && matchStatus;
    });
  }, [workflows, search, scopeFilter, statusFilter]);

  const paginatedWorkflows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredWorkflows.slice(start, start + pageSize);
  }, [filteredWorkflows, page, pageSize]);

  const handleOpenDetail = (row) => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  const handleDeleteWorkflow = async (wfToDelete, e) => {
    if (e) e.stopPropagation();
    if (!wfToDelete) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa quy trình [${wfToDelete.code}] "${wfToDelete.name}" không?`
    );
    if (!confirmed) return;

    try {
      await taskService.deleteWorkflow(wfToDelete.id || wfToDelete.code);
      setWorkflows(prev => prev.filter(w => w.id !== wfToDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== wfToDelete.id));
      notify(`Đã xóa quy trình "${wfToDelete.name}" thành công`, 'success');
      if (activeId === wfToDelete.id) {
        handleCloseWorkspace();
      }
    } catch (err) {
      notify(err?.message || 'Không thể xóa quy trình', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} quy trình đã chọn không?`
    );
    if (!confirmed) return;
    try {
      for (const id of selectedIds) {
        await taskService.deleteWorkflow(id);
      }
      setWorkflows(prev => prev.filter(w => !selectedIds.includes(w.id)));
      setSelectedIds([]);
      notify(`Đã xóa ${selectedIds.length} quy trình thành công`, 'success');
    } catch (err) {
      notify(err?.message || 'Không thể xóa các quy trình đã chọn', 'error');
    }
  };

  const handleSaveDraft = (e) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      notify('Tên quy trình không được để trống', 'error');
      return;
    }
    if (isCreating) {
      const newWf = {
        ...draft,
        code: draft.code || `WF_${Date.now().toString(36).toUpperCase()}`,
        activeTasks: 0,
        updatedAt: 'Vừa xong',
      };
      setWorkflows(prev => [newWf, ...prev]);
      notify(`Đã tạo quy trình "${newWf.name}" thành công`, 'success');
    } else {
      setWorkflows(prev => prev.map(w => (w.id === draft.id ? { ...draft, updatedAt: 'Vừa xong' } : w)));
      notify(`Đã cập nhật quy trình "${draft.name}"`, 'success');
    }
    handleCloseWorkspace();
  };

  // If In-Screen Workspace is active, show the 2-Column Split Layout
  if (activeWorkflow && draft) {
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
                  {isCreating ? 'Tạo quy trình làm việc mới' : draft.name}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Mã: {draft.code || 'Chưa đặt'} · Phạm vi: {draft.scope} · Trạng thái: {draft.status}
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
                  onClick={() => handleDeleteWorkflow(activeWorkflow)}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Xóa quy trình
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleSaveDraft} disabled={!isDirty}>
                {isCreating ? 'Tạo quy trình' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          {/* CỘT TRÁI: FORM CƠ BẢN (360px) */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông tin cơ bản
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên quy trình <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.name}
                onChange={e => {
                  setDraft(d => ({ ...d, name: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Quy trình nghiệm thu..."
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
                placeholder="TASK_STD"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phạm vi áp dụng
              </label>
              <Select
                value={draft.scope}
                onChange={v => {
                  setDraft(d => ({ ...d, scope: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Toàn doanh nghiệp', label: 'Toàn doanh nghiệp' },
                  { value: 'Khối Sản xuất & Nhà máy', label: 'Khối Sản xuất & Nhà máy' },
                  { value: 'Khối Kỹ thuật & Bảo trì', label: 'Khối Kỹ thuật & Bảo trì' },
                  { value: 'Phòng R&D & Thiết kế', label: 'Phòng R&D & Thiết kế' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái
              </label>
              <Select
                value={draft.status}
                onChange={v => {
                  setDraft(d => ({ ...d, status: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Hoạt động', label: 'Hoạt động' },
                  { value: 'Tạm ngưng', label: 'Tạm ngưng' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả chi tiết
              </label>
              <textarea
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={4}
                value={draft.description}
                onChange={e => {
                  setDraft(d => ({ ...d, description: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Mục đích và quy tắc chuyển bước của quy trình..."
              />
            </div>
          </div>

          {/* CỘT PHẢI: DATA CANVAS CÁC BƯỚC QUY TRÌNH */}
          <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Thiết lập các bước & luồng xử lý
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Định nghĩa tuần tự các trạng thái từ khi giao việc đến khi hoàn tất nghiệm thu
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Chuỗi bước thực hiện hiện tại
                </div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800">
                  {draft.steps}
                </div>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Chỉnh sửa chuỗi bước (ngăn cách bằng dấu mũi tên →)
                </div>
                <Input
                  value={draft.steps}
                  onChange={e => {
                    setDraft(d => ({ ...d, steps: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="Khởi tạo → Đang xử lý → Chờ nghiệm thu → Hoàn tất"
                />
              </div>
            </div>
          </div>
        </div>
      </ManagementFrame>
    );
  }

  // BỐ CỤC CHUẨN 4 TẦNG (Identical to UserManagementPage)
  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <>
          <Tabs
            tabs={[
              { id: 'workflows', label: 'Quy trình làm việc' }
            ]}
            activeTab="workflows"
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
                Tạo quy trình mới
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
              placeholder="Tìm theo tên quy trình, mã hoặc phạm vi…"
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
            value={scopeFilter}
            onChange={setScopeFilter}
            options={[
              { value: '', label: 'Tất cả phạm vi' },
              { value: 'Toàn doanh nghiệp', label: 'Toàn doanh nghiệp' },
              { value: 'Khối Sản xuất & Nhà máy', label: 'Khối Sản xuất & Nhà máy' },
              { value: 'Khối Kỹ thuật & Bảo trì', label: 'Khối Kỹ thuật & Bảo trì' },
              { value: 'Phòng R&D & Thiết kế', label: 'Phòng R&D & Thiết kế' },
            ]}
          />

          <Select
            size="sm"
            className="w-40 text-xs font-medium"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'Hoạt động', label: 'Hoạt động' },
              { value: 'Tạm ngưng', label: 'Tạm ngưng' },
            ]}
          />

          {(search || scopeFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setScopeFilter('');
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
          title="Quy trình làm việc"
          totalCount={filteredWorkflows.length}
          selectedCount={selectedIds.length}
          unit="quy trình"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredWorkflows.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-wf-list-column-menu"
          onExport={() => notify('Đang xuất danh sách quy trình...', 'info')}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="admin-wf-list:table"
        columnMenuTargetId="admin-wf-list-column-menu"
        columns={columns}
        rows={paginatedWorkflows}
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
