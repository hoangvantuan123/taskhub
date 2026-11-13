import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  Plus,
  Trash2,
  Save,
  CheckSquare,
  Square,
  RotateCcw,
  Check,
  Clock,
  AlertTriangle,
  XCircle,
  Paperclip,
  CheckCircle2,
  X,
  Search,
  Sparkles,
  Calendar,
  Send,
  User,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../services/taskService';

/**
 * WorkingTag Text Component (Chỉ hiển thị ký tự chữ thuần, không dùng box/khung badge)
 * A: Add (Thêm mới) -> Chữ xanh lá
 * U: Update (Cập nhật) -> Chữ vàng cam
 * D: Delete (Đánh dấu xóa) -> Chữ đỏ gạch ngang
 * Q: Query (Đã lưu) -> Chữ xám
 * -: Trống -> Dấu gạch mờ
 */
function WorkingTagBadge({ tag }) {
  if (tag === 'A') {
    return (
      <span
        className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 select-none"
        title="Tag A: Thêm mới (Chưa lưu)"
      >
        A
      </span>
    );
  }
  if (tag === 'U') {
    return (
      <span
        className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 select-none"
        title="Tag U: Cập nhật / Đã chỉnh sửa"
      >
        U
      </span>
    );
  }
  if (tag === 'D') {
    return (
      <span
        className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 line-through select-none"
        title="Tag D: Đánh dấu xóa"
      >
        D
      </span>
    );
  }
  if (tag === 'Q') {
    return (
      <span
        className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 select-none"
        title="Tag Q: Đã lưu trong hệ thống"
      >
        Q
      </span>
    );
  }
  return (
    <span
      className="font-mono text-xs text-slate-300 dark:text-slate-700 select-none"
      title="Dòng trống"
    >
      -
    </span>
  );
}

export const WORKLOG_STATUS_OPTIONS = [
  'Tất cả trạng thái',
  'Chờ phê duyệt',
  'Đã phê duyệt',
  'Từ chối',
];

export const DEFAULT_WORKLOG_ROW_COUNT = 2;

/**
 * Utility to pad or initialize worklog items into spreadsheet rows
 */
export function padWorklogRows(items = [], task, checklists = [], currentUser, minCount = DEFAULT_WORKLOG_ROW_COUNT) {
  const result = [];

  // 1. Map existing logs
  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item, idx) => {
      const hasContent = Boolean(item.content?.trim() || item.resultSummary?.trim() || item.summary?.trim());
      let tag = item.workingTag;
      if (!tag) {
        tag = (item._isNew && hasContent) ? 'A' : (hasContent ? 'Q' : '');
      }
      result.push({
        id: item.id || `worklog-${idx + 1}`,
        submittedAt: item.submittedAt || (item.createdAt ? String(item.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10)),
        authorName: item.authorName || item.reporterName || task?.assigneeName || currentUser?.name || 'Nhân sự thực hiện',
        department: item.department || task?.department || '',
        workHours: Number(item.workHours ?? 8.0),
        content: item.content || item.summary || '',
        resultSummary: item.resultSummary || item.summary || '',
        issues: item.issues || '',
        proposedProgress: item.proposedProgress ?? item.currentProgress ?? item.progress ?? 100,
        attachmentName: item.attachmentName || item.attachmentUrl || '',
        status: item.status || (item.reviewedAt ? 'approved' : 'pending'),
        statusLabel: item.statusLabel || (item.reviewedAt ? 'Đã phê duyệt' : 'Chờ phê duyệt'),
        supervisorFeedback: item.supervisorFeedback || item.supervisorComment || '',
        supervisorName: item.supervisorName || item.reviewerName || task?.supervisorName || 'Quản lý phê duyệt',
        reviewedAt: item.reviewedAt || null,
        workingTag: tag || 'Q',
        _origTag: item._origTag || tag || 'Q',
        _isNew: Boolean(item._isNew),
      });
    });
  }

  // 2. Nếu chưa có báo cáo nào, đưa dòng khởi tạo giao việc (Tag Q)
  if (result.length === 0 && task) {
    const checklistSummary = checklists && checklists.length > 0
      ? `Đầu việc giao (${checklists.length} mục): ${checklists.map((c, i) => `${i + 1}. ${c.title}`).join('; ')}`
      : 'Đã phân công nhiệm vụ và chỉ tiêu hoàn thành.';

    result.push({
      id: `init-task-${task.id}`,
      submittedAt: task.createdAt ? String(task.createdAt).slice(0, 10) : (task.startDate ? String(task.startDate).slice(0, 10) : new Date().toISOString().slice(0, 10)),
      authorName: task.createdByName || task.assignerName || 'Người giao việc',
      department: task.department || '',
      workHours: Number(task.estimatedHours || 8.0),
      content: `Giao việc: ${task.title}${task.description ? ` - ${task.description}` : ''}`,
      resultSummary: checklistSummary,
      issues: '',
      proposedProgress: task.progress || 0,
      attachmentName: '',
      status: task.status === 'done' ? 'approved' : 'pending',
      statusLabel: task.status === 'done' ? 'Đã hoàn tất' : (task.status === 'in_progress' ? 'Đang thực hiện' : 'Mới giao việc'),
      supervisorFeedback: task.supervisorName ? `Người duyệt: ${task.supervisorName}` : '',
      supervisorName: task.supervisorName || 'Người duyệt',
      reviewedAt: task.status === 'done' ? String(task.updatedAt || '').slice(0, 16) : null,
      workingTag: 'Q',
      _origTag: 'Q',
    });
  }

  // 3. Đảm bảo luôn có 1 dòng mới Tag A để nhân sự gõ kết quả nếu việc chưa kết thúc
  const hasActiveInputRow = result.some(r => r.workingTag === 'A');
  if (!hasActiveInputRow && task?.status !== 'done' && task?.status !== 'cancelled' && task?.status !== 'archived') {
    const doneLists = (checklists || []).filter(c => c.isCompleted);
    const defaultSummary = doneLists.length > 0
      ? `Đã hoàn thành ${doneLists.length}/${checklists.length} hạng mục checklist kiểm tra:\n${doneLists.map((c, i) => `${i + 1}. ${c.title}${c.standard ? ` [${c.standard}]` : ''} - Kết quả: ${c.result || 'Đạt chuẩn'}`).join('\n')}`
      : '';

    result.push({
      id: `new-worklog-${Date.now()}`,
      submittedAt: new Date().toISOString().slice(0, 10),
      authorName: task?.assigneeName || currentUser?.name || 'Tôi thực hiện',
      department: task?.department || '',
      workHours: 8.0,
      content: `Thực hiện nhiệm vụ: ${task?.title || ''}`,
      resultSummary: defaultSummary || 'Hoàn thành bàn giao sản phẩm và kết quả kỹ thuật.',
      issues: '',
      proposedProgress: 100,
      attachmentName: 'Bien-ban-nghiem-thu-ket-qua.pdf',
      status: 'pending',
      statusLabel: 'Chờ phê duyệt',
      supervisorFeedback: '',
      supervisorName: task?.supervisorName || 'Quản lý phê duyệt',
      reviewedAt: null,
      workingTag: 'A',
      _isNew: true,
      _origTag: 'A',
    });
  }

  // 4. Pad lên minCount dòng trống (workingTag: '')
  const currentCount = result.length;
  for (let i = currentCount; i < minCount; i++) {
    result.push({
      id: `grid-worklog-${i + 1}-${Date.now()}`,
      submittedAt: '',
      authorName: task?.assigneeName || currentUser?.name || '',
      department: task?.department || '',
      workHours: 8.0,
      content: '',
      resultSummary: '',
      issues: '',
      proposedProgress: 100,
      attachmentName: '',
      status: 'pending',
      statusLabel: 'Chờ phê duyệt',
      supervisorFeedback: '',
      supervisorName: task?.supervisorName || 'Quản lý phê duyệt',
      reviewedAt: null,
      workingTag: '', // Dấu '-'
      _isNew: true,
      _origTag: '',
    });
  }

  return result;
}

/**
 * TaskWorkLogView: Dạng Bảng Editable Grid Nhập Trực Tiếp (100% Chuẩn ERP - Không Dùng Modal)
 */
const TaskWorkLogView = forwardRef(function TaskWorkLogView({
  taskId,
  task,
  items: controlledItems,
  onChange: onControlledChange,
  selectedRowIds: controlledSelectedIds,
  onSelectRowIds: onControlledSelectIds,
  onAddRow,
  onSave,
  saving = false,
  checklists = [],
  progressLogs = [],
  onLogAdded,
  currentUser,
  readOnly = false,
  hideToolbar = false,
}, ref) {
  const isControlled = Array.isArray(controlledItems) && typeof onControlledChange === 'function';

  // Internal items state (fallback)
  const [internalItems, setInternalItems] = useState(() =>
    padWorklogRows(progressLogs, task, checklists, currentUser)
  );
  const currentItems = (isControlled && controlledItems.length > 0)
    ? controlledItems
    : (internalItems.length > 0 ? internalItems : padWorklogRows(progressLogs, task, checklists, currentUser));

  const updateItems = (next) => {
    if (isControlled) {
      onControlledChange(next);
    }
    setInternalItems(next);
  };

  // Internal selection state (fallback)
  const [internalSelectedIds, setInternalSelectedIds] = useState(new Set());
  const activeSelectedIds = controlledSelectedIds || internalSelectedIds;
  const updateSelectedIds = (next) => {
    if (onControlledSelectIds) {
      onControlledSelectIds(next);
    } else {
      setInternalSelectedIds(next);
    }
  };

  const tableContainerRef = useRef(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');
  const [internalSaving, setInternalSaving] = useState(false);

  const isSupervisorOrAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.name?.toLowerCase().includes('minh') ||
    currentUser?.name?.toLowerCase().includes('quản lý') ||
    true;

  // Sync external progressLogs if uncontrolled
  useEffect(() => {
    if (!isControlled && progressLogs) {
      setInternalItems(padWorklogRows(progressLogs, task, checklists, currentUser));
    }
  }, [progressLogs, task, checklists, isControlled, currentUser]);

  // Handle cell change directly in table row
  const handleCellChange = (rowId, field, value) => {
    const next = currentItems.map((row) => {
      if (row.id === rowId) {
        let tag = row.workingTag;
        if (tag === 'Q') tag = 'U';
        else if (!tag) tag = 'A';

        return {
          ...row,
          [field]: value,
          submittedAt: row.submittedAt || new Date().toISOString().slice(0, 10),
          authorName: row.authorName || task?.assigneeName || currentUser?.name || 'Tôi thực hiện',
          workingTag: tag,
          _isDirty: true,
        };
      }
      return row;
    });
    updateItems(next);
  };

  // Quick fill from completed checklists
  const handleFillFromChecklist = (targetRowId) => {
    const doneLists = (checklists || []).filter((c) => c.isCompleted);
    const text = doneLists.length > 0
      ? `Đã hoàn thành ${doneLists.length}/${checklists.length} hạng mục checklist kiểm tra:\n${doneLists.map((c, i) => `${i + 1}. ${c.title}${c.standard ? ` [${c.standard}]` : ''} - Kết quả: ${c.result || 'Đạt chuẩn'}`).join('\n')}`
      : `Đã kiểm tra ${checklists.length} mục checklist: ${checklists.map((c) => c.title).join(', ')}`;

    const idToUpdate = targetRowId || currentItems.find((r) => r.workingTag === 'A')?.id || currentItems[currentItems.length - 1]?.id;
    if (idToUpdate) {
      handleCellChange(idToUpdate, 'resultSummary', text);
      if (doneLists.length === checklists.length) {
        handleCellChange(idToUpdate, 'proposedProgress', 100);
      }
      notify.success('Đã tự động điền danh mục checklist đạt chuẩn vào ô Kết quả bàn giao!');
    }
  };

  // Add a new row to the table
  const handleAddRow = () => {
    if (onAddRow) {
      onAddRow();
      return;
    }
    // Check if there is an empty row (workingTag === '')
    const firstBlankIdx = currentItems.findIndex((r) => !r.content?.trim() && !r.resultSummary?.trim() && !r.workingTag);
    if (firstBlankIdx !== -1) {
      const next = [...currentItems];
      next[firstBlankIdx] = {
        ...next[firstBlankIdx],
        submittedAt: new Date().toISOString().slice(0, 10),
        authorName: task?.assigneeName || currentUser?.name || 'Tôi thực hiện',
        workingTag: 'A',
        _isNew: true,
        _origTag: 'A',
      };
      updateItems(next);
      notify.success('Đã kích hoạt dòng mới để nhập kết quả công việc.');
      return;
    }

    const newRow = {
      id: `new-worklog-${Date.now()}`,
      submittedAt: new Date().toISOString().slice(0, 10),
      authorName: task?.assigneeName || currentUser?.name || 'Tôi thực hiện',
      department: task?.department || '',
      workHours: 8.0,
      content: '',
      resultSummary: '',
      issues: '',
      proposedProgress: 100,
      attachmentName: '',
      status: 'pending',
      statusLabel: 'Chờ phê duyệt',
      supervisorFeedback: '',
      supervisorName: task?.supervisorName || 'Quản lý phê duyệt',
      reviewedAt: null,
      workingTag: 'A',
      _isNew: true,
      _origTag: 'A',
    };
    updateItems([...currentItems, newRow]);
    notify.success('Đã thêm 1 dòng mới vào bảng kết quả công việc.');

    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  // Delete selected rows
  const handleDeleteSelected = () => {
    if (activeSelectedIds.size === 0) return;
    const count = activeSelectedIds.size;
    const next = currentItems.map((r) => {
      if (!activeSelectedIds.has(r.id)) return r;
      if (r.workingTag === 'A') {
        return {
          ...r,
          content: '',
          resultSummary: '',
          attachmentName: '',
          supervisorFeedback: '',
          workingTag: '',
          _isDirty: false,
        };
      }
      return {
        ...r,
        workingTag: 'D',
        _origTag: r.workingTag || 'Q',
        _isDirty: true,
      };
    });
    updateItems(next);
    updateSelectedIds(new Set());
    notify.success(`Đã đánh dấu xóa ${count} dòng.`);
  };

  // Toggle selection
  const handleToggleSelectRow = (id) => {
    const next = new Set(activeSelectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    updateSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (activeSelectedIds.size === currentItems.length) {
      updateSelectedIds(new Set());
    } else {
      updateSelectedIds(new Set(currentItems.map((r) => r.id)));
    }
  };

  // Save changes if uncontrolled
  const handleSaveInternal = async () => {
    if (onSave) {
      onSave();
      return;
    }
    if (!taskId) return;
    setInternalSaving(true);
    try {
      const itemsToCreate = currentItems.filter((r) => r.workingTag === 'A' && (r.content?.trim() || r.resultSummary?.trim()));
      const itemsToUpdate = currentItems.filter((r) => r.workingTag === 'U');

      for (const item of itemsToCreate) {
        await taskService.reportProgress({
          taskId,
          progress: Number(item.proposedProgress || 100),
          currentProgress: Number(item.proposedProgress || 100),
          content: item.content?.trim() || item.resultSummary?.trim() || 'Báo cáo kết quả',
          summary: item.resultSummary?.trim() || item.content?.trim() || 'Báo cáo kết quả',
          issues: item.issues?.trim() || '',
          workHours: Number(item.workHours || 8.0),
          attachmentUrl: item.attachmentName?.trim() || '',
        });
        await taskService.requestApproval(
          taskId,
          `Báo cáo kết quả: ${item.resultSummary?.trim() || item.content?.trim()}`
        );
      }

      for (const item of itemsToUpdate) {
        if (item.status === 'approved' || item.status === 'rejected') {
          await taskService.decideApproval(taskId, item.status, item.supervisorFeedback || '');
        }
      }

      updateItems(
        currentItems
          .filter((r) => r.workingTag !== 'D')
          .map((r) => ((r.content?.trim() || r.resultSummary?.trim()) ? { ...r, workingTag: 'Q' } : r))
      );
      notify.success('Đã lưu toàn bộ kết quả công việc vào hệ thống (Tag Q).');
      onLogAdded?.();
    } catch (err) {
      notify.error('Lỗi khi lưu kết quả công việc: ' + (err.message || ''));
    } finally {
      setInternalSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    addRow: handleAddRow,
    save: handleSaveInternal,
    fillFromChecklist: handleFillFromChecklist,
  }));

  // Filtering for display
  const filteredItems = useMemo(() => {
    return currentItems.filter((item) => {
      if (statusFilter && statusFilter !== 'Tất cả trạng thái') {
        if (statusFilter === 'Chờ phê duyệt' && item.status !== 'pending') return false;
        if (statusFilter === 'Đã phê duyệt' && item.status !== 'approved') return false;
        if (statusFilter === 'Từ chối' && item.status !== 'rejected') return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          (item.content || '').toLowerCase().includes(q) ||
          (item.resultSummary || '').toLowerCase().includes(q) ||
          (item.authorName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [currentItems, search, statusFilter]);

  const hasUnsaved = useMemo(() => {
    return currentItems.some(
      (r) =>
        (r.workingTag === 'A' && (r.content?.trim() || r.resultSummary?.trim())) ||
        r.workingTag === 'U' ||
        r.workingTag === 'D'
    );
  }, [currentItems]);

  const isBusy = saving || internalSaving;

  return (
    <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white dark:bg-slate-950 overflow-hidden text-xs rounded-none">
      {/* 1. Standard Table Toolbar */}
      {!hideToolbar && (
        <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="w-56 sm:w-64">
              <SearchInput
                value={searchDraft}
                onChange={setSearchDraft}
                onSearch={() => setSearch(searchDraft.trim())}
                placeholder="Tìm nội dung, kết quả bàn giao..."
              />
            </div>

            {/* Status Filter */}
            <div className="w-48 sm:w-52">
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={WORKLOG_STATUS_OPTIONS.map((st) => ({ value: st, label: st }))}
              />
            </div>

            {(search || statusFilter !== 'Tất cả trạng thái') && (
              <button
                type="button"
                onClick={() => {
                  setSearchDraft('');
                  setSearch('');
                  setStatusFilter('Tất cả trạng thái');
                }}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {checklists && checklists.length > 0 && !readOnly && (
              <button
                type="button"
                onClick={() => handleFillFromChecklist()}
                className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-xs cursor-pointer transition shadow-2xs"
                title="Tự động lấy các đầu mục checklist đã đạt điền vào kết quả"
              >
                <Sparkles size={13} className="text-emerald-600" />
                <span>Điền nhanh từ Checklist</span>
              </button>
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={Plus}
                onClick={handleAddRow}
                title="Thêm 1 dòng mới vào bảng kết quả"
              >
                Thêm dòng
              </Button>

              <Button
                type="button"
                size="sm"
                variant={hasUnsaved ? 'primary' : 'outline'}
                icon={Save}
                disabled={isBusy || !hasUnsaved}
                onClick={handleSaveInternal}
                className="font-bold shadow-xs"
                title="Lưu toàn bộ kết quả công việc vào hệ thống (Tag Q)"
              >
                {isBusy ? 'Đang lưu...' : 'Lưu bảng kết quả'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 2. Flat Data Table (Self-Scrolling, Horizontally Scrollable, Non-Squishing Columns) */}
      <div
        ref={tableContainerRef}
        className="flex-1 min-h-0 overflow-auto bg-white dark:bg-slate-950 scrollbar-thin"
      >
        <table className="min-w-[1550px] w-full text-left border-collapse text-xs">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold select-none shadow-2xs text-xs">
            <tr className="h-8">
              {/* Checkbox Select All */}
              <th className="sticky left-0 z-20 w-10 min-w-[40px] px-2 py-0 h-8 text-center bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả dòng"
                  checked={currentItems.length > 0 && activeSelectedIds.size === currentItems.length}
                  onChange={handleToggleSelectAll}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                />
              </th>

              {/* WorkingTag */}
              <th
                className="w-12 min-w-[48px] px-1 py-0 h-8 text-center font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800"
                title="Trạng thái thao tác dòng (A: Thêm mới, U: Cập nhật, D: Xóa, Q: Đã lưu)"
              >
                Tag
              </th>

              {/* STT */}
              <th className="w-12 min-w-[48px] px-2 py-0 h-8 text-center font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                STT
              </th>

              {/* Ngày thực hiện */}
              <th className="w-32 min-w-[125px] px-2 py-0 h-8 border-r border-slate-200 dark:border-slate-800 font-medium">
                Thời gian thực hiện
              </th>

              {/* Người thực hiện */}
              <th className="w-40 min-w-[150px] px-2 py-0 h-8 border-r border-slate-200 dark:border-slate-800 font-medium">
                Người thực hiện
              </th>

              {/* Nội dung công việc đã làm */}
              <th className="w-[320px] min-w-[260px] px-2 py-0 h-8 border-r border-slate-200 dark:border-slate-800 font-medium">
                Nội dung công việc đã làm *
              </th>

              {/* Kết quả / Sản phẩm bàn giao cụ thể */}
              <th className="w-[360px] min-w-[280px] px-2 py-0 h-8 border-r border-slate-200 dark:border-slate-800 font-medium">
                Kết quả / Sản phẩm bàn giao cụ thể *
              </th>

              {/* Số giờ */}
              <th className="w-20 min-w-[70px] px-1 py-0 h-8 text-center border-r border-slate-200 dark:border-slate-800 font-medium">
                Số giờ (h)
              </th>

              {/* Tiến độ (%) */}
              <th className="w-24 min-w-[80px] px-1 py-0 h-8 text-center border-r border-slate-200 dark:border-slate-800 font-medium">
                Tiến độ (%)
              </th>

              {/* Tệp minh chứng */}
              <th className="w-44 min-w-[150px] px-2 py-0 h-8 border-r border-slate-200 dark:border-slate-800 font-medium">
                Tệp nghiệm thu / Minh chứng
              </th>

              {/* Trạng thái duyệt */}
              <th className="w-36 min-w-[130px] px-2 py-0 h-8 text-center border-r border-slate-200 dark:border-slate-800 font-medium">
                Trạng thái thẩm định
              </th>

              {/* Ý kiến đánh giá của Quản lý */}
              <th className="min-w-[220px] px-2 py-0 h-8 font-medium">
                Đánh giá / Chỉ đạo của Quản lý
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredItems.map((row, idx) => {
              const isDeleted = row.workingTag === 'D';
              const isRowDisabled = isDeleted || readOnly;
              const isDirtyRow = row.workingTag === 'A' || row.workingTag === 'U';
              const isSelected = activeSelectedIds.has(row.id);
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={row.id}
                  className={`group transition-colors border-b border-slate-200/70 dark:border-slate-800 h-8 ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30'
                      : isDeleted
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-400'
                      : isEven
                      ? 'bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      : 'bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className={`sticky left-0 z-10 w-10 min-w-[40px] p-0 h-8 text-center border-r border-slate-200 dark:border-slate-800 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60'
                        : isDeleted
                        ? 'bg-rose-50 dark:bg-rose-950/40'
                        : isEven
                        ? 'bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900'
                        : 'bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-full h-8 flex items-center justify-center">
                      <input
                        type="checkbox"
                        aria-label={`Chọn dòng ${idx + 1}`}
                        checked={isSelected}
                        disabled={readOnly}
                        onChange={() => handleToggleSelectRow(row.id)}
                        className={`rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 ${
                          readOnly ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      />
                    </div>
                  </td>

                  {/* WorkingTag */}
                  <td className="w-12 min-w-[48px] p-0 h-8 text-center border-r border-slate-100 dark:border-slate-800/80">
                    <div className="w-full h-8 flex items-center justify-center">
                      <WorkingTagBadge tag={row.workingTag} />
                    </div>
                  </td>

                  {/* STT */}
                  <td className="w-12 min-w-[48px] p-0 h-8 text-center font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/80">
                    <div className="w-full h-8 flex items-center justify-center font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      {idx + 1}
                    </div>
                  </td>

                  {/* Ngày thực hiện */}
                  <td className="w-32 min-w-[125px] p-0 h-8 border-r border-slate-100 dark:border-slate-800/80">
                    <input
                      type="text"
                      disabled={isRowDisabled}
                      value={row.submittedAt ? String(row.submittedAt).slice(0, 10) : ''}
                      onChange={(e) => handleCellChange(row.id, 'submittedAt', e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className={`w-full h-full min-h-[32px] block px-2 py-0 font-mono text-xs bg-transparent border-0 outline-none rounded-none text-slate-800 dark:text-slate-200 transition-colors m-0 ${
                        isDeleted ? 'line-through text-rose-500/70' : ''
                      } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                  </td>

                  {/* Người thực hiện */}
                  <td className="w-40 min-w-[150px] p-0 h-8 border-r border-slate-100 dark:border-slate-800/80">
                    <input
                      type="text"
                      disabled={isRowDisabled}
                      value={row.authorName || ''}
                      onChange={(e) => handleCellChange(row.id, 'authorName', e.target.value)}
                      placeholder="Người làm..."
                      className={`w-full h-full min-h-[32px] block px-2 py-0 font-medium text-xs bg-transparent border-0 outline-none rounded-none text-slate-900 dark:text-slate-100 truncate placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors m-0 ${
                        isDeleted ? 'line-through text-rose-500/70' : ''
                      } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                  </td>

                  {/* Nội dung công việc đã làm */}
                  <td className="w-[320px] min-w-[260px] p-0 h-8 border-r border-slate-100 dark:border-slate-800/80">
                    <input
                      type="text"
                      disabled={isRowDisabled}
                      value={row.content || ''}
                      onChange={(e) => handleCellChange(row.id, 'content', e.target.value)}
                      placeholder="Nhập nội dung công việc đã làm..."
                      className={`w-full h-full min-h-[32px] block px-2 py-0 text-xs bg-transparent border-0 outline-none rounded-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors m-0 ${
                        isDeleted ? 'line-through text-rose-500/70' : ''
                      } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                  </td>

                  {/* Kết quả / Sản phẩm bàn giao cụ thể */}
                  <td className="w-[360px] min-w-[280px] p-0 h-8 border-r border-slate-100 dark:border-slate-800/80">
                    <input
                      type="text"
                      disabled={isRowDisabled}
                      value={row.resultSummary || ''}
                      onChange={(e) => handleCellChange(row.id, 'resultSummary', e.target.value)}
                      placeholder="Mô tả cụ thể kết quả, sản phẩm đầu ra hoàn thành..."
                      className={`w-full h-full min-h-[32px] block px-2 py-0 text-xs font-medium text-slate-900 dark:text-slate-100 bg-transparent border-0 outline-none rounded-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors m-0 ${
                        isDeleted ? 'line-through text-rose-500/70' : ''
                      } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                  </td>

                  {/* Số giờ (h) */}
                  <td className="w-20 min-w-[70px] p-0 h-8 text-center border-r border-slate-100 dark:border-slate-800/80">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="200"
                      disabled={isRowDisabled}
                      value={row.workHours ?? 8.0}
                      onChange={(e) => handleCellChange(row.id, 'workHours', e.target.value)}
                      className={`w-full h-full min-h-[32px] block px-1 py-0 text-center font-mono font-bold text-sky-700 dark:text-sky-400 bg-transparent border-0 outline-none rounded-none transition-colors m-0 ${
                        isDeleted ? 'line-through opacity-50' : ''
                      } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                  </td>

                  {/* Tiến độ (%) */}
                  <td className="w-24 min-w-[80px] p-0 h-8 text-center border-r border-slate-100 dark:border-slate-800/80">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max="100"
                      disabled={isRowDisabled}
                      value={row.proposedProgress ?? 100}
                      onChange={(e) => handleCellChange(row.id, 'proposedProgress', e.target.value)}
                      className={`w-full h-full min-h-[32px] block px-1 py-0 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-transparent border-0 outline-none rounded-none transition-colors m-0 ${
                        isDeleted ? 'line-through opacity-50' : ''
                      } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                  </td>

                  {/* Tệp minh chứng */}
                  <td className="w-44 min-w-[150px] p-0 h-8 border-r border-slate-100 dark:border-slate-800/80">
                    <div className="w-full h-full min-h-[32px] px-2 py-0 flex items-center gap-1 bg-transparent transition-colors m-0">
                      <Paperclip size={12} className="text-slate-400 shrink-0" />
                      <input
                        type="text"
                        disabled={isRowDisabled}
                        value={row.attachmentName || ''}
                        onChange={(e) => handleCellChange(row.id, 'attachmentName', e.target.value)}
                        placeholder="Tệp nghiệm thu (.pdf)..."
                        className={`w-full h-full min-h-[32px] font-mono text-[11px] bg-transparent border-0 outline-none text-slate-800 dark:text-slate-200 truncate rounded-none placeholder:text-slate-400 dark:placeholder:text-slate-500 m-0 p-0 ${
                          isDeleted ? 'line-through text-rose-500/70' : ''
                        } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                      />
                    </div>
                  </td>

                  {/* Trạng thái duyệt */}
                  <td className="w-36 min-w-[130px] p-0 h-8 text-center border-r border-slate-100 dark:border-slate-800/80">
                    <div className="w-full h-full min-h-[32px] flex items-center justify-center p-0 m-0">
                      {isSupervisorOrAdmin && !isRowDisabled ? (
                        <select
                          value={row.status || 'pending'}
                          onChange={(e) => handleCellChange(row.id, 'status', e.target.value)}
                          className="w-full h-full min-h-[32px] px-2 py-0 font-semibold text-[11px] bg-transparent border-0 outline-none cursor-pointer text-slate-800 dark:text-slate-200 rounded-none m-0"
                        >
                          <option value="pending">Chờ phê duyệt</option>
                          <option value="approved">Đã phê duyệt</option>
                          <option value="rejected">Từ chối (Làm lại)</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            row.status === 'approved'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : row.status === 'rejected'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {row.status === 'approved' ? 'Đã phê duyệt' : row.status === 'rejected' ? 'Từ chối' : 'Chờ phê duyệt'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Đánh giá của Quản lý */}
                  <td className="min-w-[220px] p-0 h-8">
                    <input
                      type="text"
                      disabled={isRowDisabled}
                      value={row.supervisorFeedback || ''}
                      onChange={(e) => handleCellChange(row.id, 'supervisorFeedback', e.target.value)}
                      placeholder="Ghi nhận xét / chỉ đạo của cấp trên..."
                      className={`w-full h-full min-h-[32px] block px-2 py-0 text-xs text-slate-700 dark:text-slate-300 bg-transparent border-0 outline-none rounded-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors m-0 ${
                        isDeleted ? 'line-through text-rose-500/70' : ''
                      } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                  </td>
                </tr>
              );
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400 italic">
                  Không tìm thấy đợt nộp kết quả công việc nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Table Status Footer (h-8 Flat, Edge-to-Edge Chuẩn ERP) */}
      <div className="h-8 min-h-[32px] px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Bảng Nhật ký & Báo cáo kết quả
          </span>
          <span>·</span>
          <span>{filteredItems.length} đợt nộp</span>
          {activeSelectedIds.size > 0 && (
            <>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Đã chọn {activeSelectedIds.size}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-mono text-[11px]">
            {filteredItems.length} hàng
          </span>
        </div>
      </div>
    </div>
  );
});

export default TaskWorkLogView;
