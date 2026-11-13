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

const INITIAL_STATUSES = [
  {
    id: 'ST-01',
    code: 'backlog',
    name: 'Backlog (Chờ giao việc)',
    category: 'Khởi tạo',
    order: 1,
    isFinal: 'Không',
    activeCount: 14,
    description: 'Nhiệm vụ mới tạo trong danh sách chờ phân bổ nhân sự',
  },
  {
    id: 'ST-02',
    code: 'todo',
    name: 'To Do (Đã giao / Lên lịch)',
    category: 'Khởi tạo',
    order: 2,
    isFinal: 'Không',
    activeCount: 28,
    description: 'Nhiệm vụ đã phân công người chịu trách nhiệm, chờ bắt đầu',
  },
  {
    id: 'ST-03',
    code: 'in_progress',
    name: 'In Progress (Đang thực hiện)',
    category: 'Đang xử lý',
    order: 3,
    isFinal: 'Không',
    activeCount: 65,
    description: 'Nhân viên đang tích cực triển khai và cập nhật tiến độ',
  },
  {
    id: 'ST-04',
    code: 'in_review',
    name: 'In Review (Chờ nghiệm thu)',
    category: 'Kiểm tra & Nghiệm thu',
    order: 4,
    isFinal: 'Không',
    activeCount: 19,
    description: 'Đã hoàn tất sản phẩm, gửi cấp trên / quản lý phê duyệt',
  },
  {
    id: 'ST-05',
    code: 'done',
    name: 'Done (Nghiệm thu thành công)',
    category: 'Kết thúc',
    order: 5,
    isFinal: 'Có (Đóng việc)',
    activeCount: 312,
    description: 'Quản lý đã nghiệm thu đạt yêu cầu, hoàn tất chu trình',
  },
  {
    id: 'ST-06',
    code: 'rejected',
    name: 'Rejected (Cần sửa đổi / Làm lại)',
    category: 'Đang xử lý',
    order: 6,
    isFinal: 'Không',
    activeCount: 6,
    description: 'Sản phẩm chưa đạt chuẩn KCS / QC, yêu cầu nhân viên làm lại',
  },
  {
    id: 'ST-07',
    code: 'cancelled',
    name: 'Cancelled (Đã hủy)',
    category: 'Kết thúc',
    order: 7,
    isFinal: 'Có (Đóng việc)',
    activeCount: 8,
    description: 'Kế hoạch thay đổi hoặc hủy theo chỉ đạo của ban giám đốc',
  },
];

export default function WorkflowStatusesPage() {
  const { currentUser, hasPermission } = useAuth();
  const isAdminOrManager = ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager'].includes((currentUser?.role || '').toLowerCase()) ||
                           currentUser?.username === 'admin';
  const canEdit = isAdminOrManager || hasPermission('workflows:create') || hasPermission('workflows:update');
  const canDelete = isAdminOrManager || hasPermission('workflows:delete');

  const [params, setParams] = useSearchParams();
  const [statuses, setStatuses] = useState(INITIAL_STATUSES);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const activeId = params.get('item');
  const isCreating = activeId === 'new';
  const activeStatus = useMemo(() => {
    if (isCreating) {
      return {
        id: `ST-${String(statuses.length + 1).padStart(2, '0')}`,
        code: '',
        name: '',
        category: 'Đang xử lý',
        order: statuses.length + 1,
        isFinal: 'Không',
        activeCount: 0,
        description: '',
      };
    }
    return statuses.find(s => s.id === activeId) || null;
  }, [activeId, isCreating, statuses]);

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  React.useEffect(() => {
    if (activeStatus) {
      setDraft({ ...activeStatus });
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsDirty(false);
    }
  }, [activeStatus]);

  const columns = useMemo(
    () => [
      { id: 'order', label: 'Thứ tự', width: 90, sortable: true },
      { id: 'code', label: 'Mã trạng thái', width: 150, sortable: true },
      { id: 'name', label: 'Tên trạng thái', width: 260, sortable: true },
      { id: 'category', label: 'Giai đoạn', width: 170 },
      { id: 'isFinal', label: 'Kết thúc chu trình', width: 160 },
      { id: 'activeCount', label: 'Số việc hiện tại', width: 140 },
      { id: 'description', label: 'Mô tả & Ý nghĩa', width: 340 },
    ],
    []
  );

  const filteredStatuses = useMemo(() => {
    return statuses.filter(s => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || s.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [statuses, search, categoryFilter]);

  const paginatedStatuses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStatuses.slice(start, start + pageSize);
  }, [filteredStatuses, page, pageSize]);

  const handleOpenDetail = row => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  const handleDeleteStatus = async (stToDelete, e) => {
    if (e) e.stopPropagation();
    if (!stToDelete) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa trạng thái [${stToDelete.code}] "${stToDelete.name}" không?`
    );
    if (!confirmed) return;

    try {
      await taskService.deleteWorkflowStatus(stToDelete.id || stToDelete.code);
      setStatuses(prev => prev.filter(s => s.id !== stToDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== stToDelete.id));
      notify(`Đã xóa trạng thái "${stToDelete.name}"`, 'success');
      if (activeId === stToDelete.id) {
        handleCloseWorkspace();
      }
    } catch (err) {
      notify(err?.message || 'Không thể xóa trạng thái', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} trạng thái đã chọn không?`
    );
    if (!confirmed) return;
    try {
      for (const id of selectedIds) {
        await taskService.deleteWorkflowStatus(id);
      }
      setStatuses(prev => prev.filter(s => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      notify(`Đã xóa ${selectedIds.length} trạng thái thành công`, 'success');
    } catch (err) {
      notify(err?.message || 'Không thể xóa các trạng thái đã chọn', 'error');
    }
  };

  const handleSaveDraft = e => {
    e.preventDefault();
    if (!draft.name.trim()) {
      notify('Tên trạng thái không được để trống', 'error');
      return;
    }
    if (isCreating) {
      const newSt = {
        ...draft,
        code: draft.code || draft.name.toLowerCase().replace(/\s+/g, '_'),
      };
      setStatuses(prev => [...prev, newSt]);
      notify(`Đã thêm trạng thái "${newSt.name}"`, 'success');
    } else {
      setStatuses(prev => prev.map(s => (s.id === draft.id ? draft : s)));
      notify(`Đã cập nhật trạng thái "${draft.name}"`, 'success');
    }
    handleCloseWorkspace();
  };

  // In-Screen Workspace
  if (activeStatus && draft) {
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
                  {isCreating ? 'Thêm trạng thái công việc mới' : draft.name}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Mã: @{draft.code || 'chưa đặt'} · Giai đoạn: {draft.category}
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
                  onClick={() => handleDeleteStatus(activeStatus)}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Xóa trạng thái
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleSaveDraft} disabled={!isDirty}>
                {isCreating ? 'Thêm trạng thái' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          {/* CỘT TRÁI: FORM CƠ BẢN (360px) */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông tin trạng thái
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên trạng thái <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.name}
                onChange={e => {
                  setDraft(d => ({ ...d, name: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Đang in ấn..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mã kỹ thuật (Code)
              </label>
              <Input
                value={draft.code}
                onChange={e => {
                  setDraft(d => ({ ...d, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }));
                  setIsDirty(true);
                }}
                placeholder="in_progress"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Giai đoạn nghiệp vụ
              </label>
              <Select
                value={draft.category}
                onChange={v => {
                  setDraft(d => ({ ...d, category: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Khởi tạo', label: 'Khởi tạo' },
                  { value: 'Đang xử lý', label: 'Đang xử lý' },
                  { value: 'Kiểm tra & Nghiệm thu', label: 'Kiểm tra & Nghiệm thu' },
                  { value: 'Kết thúc', label: 'Kết thúc' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Thứ tự sắp xếp
              </label>
              <Input
                type="number"
                value={draft.order}
                onChange={e => {
                  setDraft(d => ({ ...d, order: Number(e.target.value) }));
                  setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Đóng chu trình (Trạng thái kết thúc)
              </label>
              <Select
                value={draft.isFinal}
                onChange={v => {
                  setDraft(d => ({ ...d, isFinal: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Không', label: 'Không (Tiếp tục xử lý)' },
                  { value: 'Có (Đóng việc)', label: 'Có (Đóng việc)' },
                ]}
              />
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT & QUYỀN HẠN TRẠNG THÁI */}
          <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Quy định thực thi & Mô tả trạng thái
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quy định điều kiện cần thiết khi một công việc được chuyển sang trạng thái này
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả ý nghĩa và hướng dẫn thao tác
              </label>
              <textarea
                className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={4}
                value={draft.description}
                onChange={e => {
                  setDraft(d => ({ ...d, description: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Nhập hướng dẫn cho nhân viên khi nhận nhiệm vụ ở trạng thái này..."
              />
            </div>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Hành vi hệ thống mặc định
              </div>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Tự động ghi nhận thời điểm bắt đầu/kết thúc vào nhật ký tiến độ</li>
                <li>Gửi thông báo nhắc việc nếu công việc tồn tại quá 48h mà không cập nhật checklist</li>
                <li>Đồng bộ trạng thái trực tiếp lên Kanban Board và Gantt Timeline</li>
              </ul>
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
              { id: 'statuses', label: 'Trạng thái công việc' }
            ]}
            activeTab="statuses"
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
                Thêm trạng thái
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
              placeholder="Tìm trạng thái, mã hoặc mô tả…"
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
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: '', label: 'Tất cả giai đoạn' },
              { value: 'Khởi tạo', label: 'Khởi tạo' },
              { value: 'Đang xử lý', label: 'Đang xử lý' },
              { value: 'Kiểm tra & Nghiệm thu', label: 'Kiểm tra & Nghiệm thu' },
              { value: 'Kết thúc', label: 'Kết thúc' },
            ]}
          />

          {(search || categoryFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
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
          title="Trạng thái công việc"
          totalCount={filteredStatuses.length}
          selectedCount={selectedIds.length}
          unit="trạng thái"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredStatuses.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-wf-statuses-column-menu"
          onExport={() => notify('Đang xuất danh sách trạng thái...', 'info')}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="admin-wf-statuses:table"
        columnMenuTargetId="admin-wf-statuses-column-menu"
        columns={columns}
        rows={paginatedStatuses}
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

