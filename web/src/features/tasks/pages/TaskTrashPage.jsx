import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Tabs from '../../../shared/ui/Tabs';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../services/taskService';
import PurgeTrashModal from '../components/PurgeTrashModal';
import {
  RotateCcw,
  Search,
  Trash2,
  RefreshCw,
  CheckSquare,
  AlertTriangle,
  Eye,
} from 'lucide-react';

const TRASH_COLUMNS = [
  { id: 'code', label: 'Mã CV', width: 120 },
  { id: 'title', label: 'Tên công việc & Mục tiêu', width: 340 },
  { id: 'department', label: 'Phòng ban thực hiện', width: 190 },
  { id: 'assigneeName', label: 'Người thực hiện', width: 170 },
  { id: 'priority', label: 'Mức ưu tiên', width: 110 },
  { id: 'deletedAt', label: 'Thời gian xóa', width: 150 },
];

const PRIORITY_LABELS = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

export default function TaskTrashPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [actionBusy, setActionBusy] = useState(false);

  // Purge modal state
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeTargetIds, setPurgeTargetIds] = useState([]);
  const [purgeBusy, setPurgeBusy] = useState(false);

  const loadTrashTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskService.getTrashTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải thùng rác công việc:', err);
      notify.error('Không thể tải thùng rác: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrashTasks();
  }, [loadTrashTasks]);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setPage(1);
  };

  // Khôi phục 1 công việc
  const handleRestoreSingle = async (task, e) => {
    e?.stopPropagation?.();
    if (!task?.id) return;
    setActionBusy(true);
    try {
      await taskService.restoreTask(task.id);
      notify.success(`Đã khôi phục công việc "${task.title || task.code}".`);
      setSelectedIds((prev) => prev.filter((id) => id !== task.id));
      await loadTrashTasks();
    } catch (err) {
      notify.error('Lỗi khi khôi phục công việc: ' + (err.message || ''));
    } finally {
      setActionBusy(false);
    }
  };

  // Khôi phục nhiều công việc
  const handleRestoreSelected = async () => {
    if (!selectedIds.length) return;
    setActionBusy(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        await taskService.restoreTask(id);
        successCount++;
      }
      notify.success(`Đã khôi phục thành công ${successCount} công việc.`);
      setSelectedIds([]);
      await loadTrashTasks();
    } catch (err) {
      notify.error('Lỗi khi khôi phục các công việc đã chọn: ' + (err.message || ''));
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenPurgeSelected = () => {
    if (!selectedIds.length) return;
    setPurgeTargetIds(selectedIds);
    setPurgeModalOpen(true);
  };

  const handleOpenPurgeAll = () => {
    if (!tasks.length) return;
    setPurgeTargetIds(tasks.map((t) => t.id));
    setPurgeModalOpen(true);
  };

  const handleConfirmPurge = async () => {
    if (!purgeTargetIds.length) return;
    setPurgeBusy(true);
    try {
      let count = 0;
      for (const id of purgeTargetIds) {
        await taskService.purgeTask(id);
        count++;
      }
      notify.success(`Đã dọn dẹp vĩnh viễn ${count} công việc khỏi thùng rác.`);
      setSelectedIds([]);
      setPurgeModalOpen(false);
      await loadTrashTasks();
    } catch (err) {
      notify.error('Lỗi khi dọn dẹp thùng rác: ' + (err.message || ''));
    } finally {
      setPurgeBusy(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.code && t.code.toLowerCase().includes(q)) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(q))
      );
    });
  }, [tasks, search]);

  const total = filteredTasks.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = filteredTasks.slice(start, start + pageSize);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const renderCell = (column, row) => {
    if (column.id === 'code') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/app/tasks/my/${row.code || row.id}`);
          }}
          className="font-mono font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer text-left"
          title="Bấm để xem lại chi tiết công việc"
        >
          {row.code || row.id}
        </button>
      );
    }

    if (column.id === 'title') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/app/tasks/my/${row.code || row.id}`);
          }}
          className="flex flex-col min-w-0 py-0.5 text-left cursor-pointer hover:underline max-w-full"
          title="Bấm để xem lại chi tiết công việc"
        >
          <span className="font-medium text-slate-800 dark:text-slate-200 line-through decoration-slate-400 truncate">
            {row.title}
          </span>
          {row.goal && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {row.goal}
            </span>
          )}
        </button>
      );
    }

    if (column.id === 'priority') {
      const label = PRIORITY_LABELS[row.priority] || row.priority || 'Trung bình';
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {label}
        </span>
      );
    }

    if (column.id === 'deletedAt') {
      return (
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {formatDateTime(row.deletedAt || row.updatedAt)}
        </span>
      );
    }

    return String(row[column.id] || '—');
  };

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'trash', label: 'Thùng rác công việc' }]}
            activeTab="trash"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {selectedIds.length > 0 ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={RotateCcw}
                  disabled={actionBusy}
                  onClick={handleRestoreSelected}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Khôi phục ({selectedIds.length})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  disabled={actionBusy}
                  onClick={handleOpenPurgeSelected}
                  className="text-rose-600 hover:text-rose-700 border-rose-300 dark:border-rose-800"
                  title="Dọn dẹp vĩnh viễn các công việc đã chọn"
                >
                  Dọn dẹp đã chọn ({selectedIds.length})
                </Button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline px-1 cursor-pointer"
                >
                  Bỏ chọn
                </button>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 my-auto" />
              </>
            ) : tasks.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                icon={Trash2}
                disabled={actionBusy}
                onClick={handleOpenPurgeAll}
                className="text-rose-600 hover:text-rose-700 border-rose-300 dark:border-rose-800"
                title="Dọn dẹp sạch toàn bộ thùng rác"
              >
                Dọn sạch thùng rác
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              disabled={loading}
              onClick={loadTrashTasks}
              title="Tải lại danh sách thùng rác"
            >
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </>
      }
      filters={
        <div className="flex items-center justify-between gap-3 flex-wrap min-w-0 w-full">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="w-64 max-w-full">
              <SearchInput
                size="sm"
                value={searchDraft}
                onChange={(e) => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
                onClear={handleClearFilters}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplySearch();
                  }
                }}
                placeholder="Tìm công việc đã xóa…"
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

            {search && (
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

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Công việc trong thùng rác có thể xem lại, tích chọn để khôi phục hoặc dọn dẹp vĩnh viễn.</span>
          </div>
        </div>
      }
      status={
        <TableStatusFooter
          title="Thùng rác của tôi"
          totalCount={total}
          selectedCount={selectedIds.length}
          unit="công việc đã xóa"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <VirtualDataTable
        columns={TRASH_COLUMNS}
        rows={pageItems}
        renderCell={renderCell}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={(row) => navigate(`/app/tasks/my/${row.code || row.id}`)}
        onRowClick={(row) => navigate(`/app/tasks/my/${row.code || row.id}`)}
        emptyText={
          loading
            ? 'Đang tải danh sách công việc trong thùng rác...'
            : 'Thùng rác của tôi đang trống. Không có công việc nào bị xóa.'
        }
      />

      <PurgeTrashModal
        open={purgeModalOpen}
        onClose={() => setPurgeModalOpen(false)}
        onConfirm={handleConfirmPurge}
        count={purgeTargetIds.length}
        tasks={tasks.filter((t) => purgeTargetIds.includes(t.id))}
        busy={purgeBusy}
      />
    </ManagementFrame>
  );
}

