import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Tabs from '../../../shared/ui/Tabs';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import SearchInput from '../../../shared/ui/SearchInput';
import TaskDetailPage from './TaskDetailPage';
import { taskService } from '../services/taskService';
import { renderPriorityBadge, renderStatusBadge } from '../utils/taskStatusBadge';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';

const COLUMNS = [
  { id: 'code', label: 'Mã CV', width: 120 },
  { id: 'title', label: 'Nhiệm vụ & Mục tiêu bàn giao', width: 340 },
  { id: 'delegationLevel', label: 'Cấp bậc giao', width: 160 },
  { id: 'assigneeName', label: 'Cấp dưới phụ trách', width: 190 },
  { id: 'department', label: 'Phòng ban', width: 140 },
  { id: 'priority', label: 'Ưu tiên', width: 120 },
  { id: 'progress', label: 'Tiến độ cấp dưới', width: 140 },
  { id: 'status', label: 'Trạng thái', width: 140 },
  { id: 'dueDate', label: 'Hạn hoàn thành', width: 140 },
  // 4 cột mặc định hệ thống (có thể ẩn/hiện tùy chọn trên menu Tùy chỉnh cột)
  { id: 'createdByName', label: 'Người tạo', width: 160 },
  { id: 'createdAt', label: 'Ngày tạo', width: 140 },
  { id: 'updatedByName', label: 'Người sửa', width: 160 },
  { id: 'updatedAt', label: 'Ngày sửa', width: 140 },
];

const DEPARTMENTS = [
  'Phòng ban Quản trị ERP & CNTT',
  'Ban Giám Đốc',
  'Kỹ thuật',
  'Sản xuất',
  'Kinh doanh',
  'Marketing',
  'CNTT',
  'Quản lý chất lượng (QA/QC)',
  'Hành chính & Nhân sự',
  'Kế toán & Tài chính',
  'Kho vận & Logistics',
];

export default function DelegatedTasksPage() {
  const { seq } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // In-Screen Workspace State (KHÔNG DÙNG MODAL NỔI)
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadTasks = () => {
    setLoading(true);
    taskService
      .getTasks({ department: departmentFilter })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTasks(
          list.map((item) => ({
            ...item,
            createdByName: item.createdByName || item.assignerName || currentUser?.name || 'Tôi (Cấp trên)',
            createdAt: item.createdAt || '2026-11-01',
            updatedByName: item.updatedByName || item.supervisorName || item.assigneeName || 'Lê Giám Sát',
            updatedAt: item.updatedAt || '2026-11-06',
            rowVersion: item.rowVersion || item.RowVersion || 1,
          }))
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, [departmentFilter]);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setDepartmentFilter('');
    setPage(1);
  };

  const handleDeleteTask = async (row, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa công việc [${row.code || row.title}] không? Công việc sẽ được chuyển vào thùng rác.`
    );
    if (!confirmed) return;

    try {
      await taskService.deleteTask(row.id);
      setSelectedTaskIds((prev) => prev.filter((id) => id !== row.id));
      notify.success(`Đã chuyển công việc ${row.code} vào thùng rác`);
      loadTasks();
    } catch (err) {
      notify.error(err?.message || 'Không thể xóa công việc');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedTaskIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${selectedTaskIds.length} công việc đã chọn không? Các công việc sẽ được chuyển vào thùng rác.`
    );
    if (!confirmed) return;
    try {
      for (const id of selectedTaskIds) {
        await taskService.deleteTask(id);
      }
      setSelectedTaskIds([]);
      notify.success(`Đã chuyển ${selectedTaskIds.length} công việc vào thùng rác`);
      loadTasks();
    } catch (err) {
      notify.error(err?.message || 'Không thể xóa các công việc đã chọn');
    }
  };

  // Mở In-Screen Workspace khi Xem chi tiết (Hỗ trợ URL /app/tasks/delegated/:seq)
  const activeTaskId = seq || selectedTaskId;
  if (activeTaskId) {
    return (
      <TaskDetailPage
        taskId={activeTaskId}
        onBack={() => {
          setSelectedTaskId(null);
          navigate('/app/tasks/delegated');
        }}
        onTaskUpdated={loadTasks}
      />
    );
  }

  // Filter tasks delegated
  const delegatedTasks = tasks.filter((t) => {
    const currentName = currentUser?.name || currentUser?.username || 'admin';
    const matchDelegated =
      t.supervisorName?.toLowerCase().includes(currentName.toLowerCase()) ||
      t.delegationLevel === 'company' ||
      currentUser?.role === 'admin';

    if (!matchDelegated) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText =
        t.title?.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        t.assigneeName?.toLowerCase().includes(q);
      if (!matchText) return false;
    }

    return true;
  });

  const total = delegatedTasks.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = delegatedTasks.slice(start, start + pageSize);

  const renderCell = (column, row) => {
    if (column.id === 'code') {
      return (
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {row.code}
        </span>
      );
    }
    if (column.id === 'title') {
      return (
        <span className="font-medium text-slate-900 dark:text-white">
          {row.title}
        </span>
      );
    }
    if (column.id === 'delegationLevel') {
      const labels = {
        company: 'Cấp Ban Giám Đốc',
        department: 'Cấp Phòng Ban',
        project: 'Cấp Dự Án',
        team: 'Cấp Tổ / Nhóm',
      };
      return labels[row.delegationLevel] || 'Cấp Phòng Ban';
    }
    if (column.id === 'dueDate') {
      return row.dueDate ? new Date(row.dueDate).toLocaleDateString('vi-VN') : '—';
    }
    if (column.id === 'progress') {
      return `${row.progress || 0}%`;
    }
    if (column.id === 'priority') {
      return renderPriorityBadge(row.priority);
    }
    if (column.id === 'status') {
      return renderStatusBadge(row.status);
    }
    if (column.id === 'createdByName' || column.id === 'updatedByName') {
      const name = row[column.id] || (column.id === 'createdByName' ? (row.assignerName || 'Tôi') : (row.assigneeName || 'Cấp dưới'));
      return (
        <span className="text-slate-700 dark:text-slate-300 font-medium truncate" title={name}>
          {name}
        </span>
      );
    }
    if (column.id === 'createdAt' || column.id === 'updatedAt') {
      const val = row[column.id];
      if (!val) return '—';
      try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('vi-VN');
      } catch {
        return String(val);
      }
    }
    return String(row[column.id] || '—');
  };

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'delegated-tasks', label: 'Công việc tôi giao & Giám sát' }]}
            activeTab="delegated-tasks"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {selectedTaskIds.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  onClick={handleBulkDelete}
                  className="text-rose-600 hover:text-rose-700 border-rose-300 dark:border-rose-800"
                >
                  Xóa ({selectedTaskIds.length})
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskIds([])}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline px-1 cursor-pointer"
                >
                  Bỏ chọn
                </button>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 my-auto" />
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={loadTasks}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/app/tasks/delegated/new')}
            >
              Giao việc mới
            </Button>
          </div>
        </>
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-64 max-w-full">
            <SearchInput
              size="sm"
              value={searchDraft}
              onChange={(e) => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
              onClear={() => {
                setSearchDraft('');
                setSearch('');
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplySearch();
                }
              }}
              placeholder="Tìm mã CV, tên công việc, cấp dưới…"
            />
          </div>

          <button
            type="button"
            title="Tìm kiếm"
            aria-label="Tìm kiếm"
            onClick={handleApplySearch}
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Search size={15} />
          </button>

          <Select
            size="sm"
            className="w-48 font-medium text-xs"
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả phòng ban' },
              ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
            ]}
          />

          {(search || departmentFilter) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Xóa bộ lọc"
              aria-label="Xóa bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      }
      status={
        <TableStatusFooter
          title="Công việc đã giao"
          totalCount={total}
          selectedCount={selectedTaskIds.length}
          unit="nhiệm vụ"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={loading}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="etpms-delegated-tasks"
        columns={COLUMNS}
        rows={pageItems}
        loading={loading}
        selectedIds={selectedTaskIds}
        onSelectedIdsChange={setSelectedTaskIds}
        onOpen={(row) => navigate(`/app/tasks/delegated/${row.code || row.id}`)}
        onRowClick={(row) => navigate(`/app/tasks/delegated/${row.code || row.id}`)}
        onAddRow={() => navigate('/app/tasks/delegated/new')}
        renderCell={renderCell}
        emptyText="Chưa có công việc nào được giao trong phạm vi này."
      />
    </ManagementFrame>
  );
}
