import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
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
import { notify } from '../../../shared/lib/notify';
import DeleteTaskModal from '../components/DeleteTaskModal';
import PurgeTrashModal from '../components/PurgeTrashModal';
import { getUserStarredTaskIds, toggleUserStarredTask } from '../utils/userStarredTasks';
import {
  UserCheck,
  RotateCcw,
  Search,
  Star,
  Plus,
  Trash2,
  FolderArchive,
  ArchiveRestore,
} from 'lucide-react';

const VIEW_TITLES = {
  all: 'Việc của tôi',
  important: 'Công việc quan trọng của tôi',
  archived: 'Kho lưu trữ của tôi',
  trash: 'Thùng rác của tôi',
};

const PRIORITY_LABELS = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const STATUS_LABELS = {
  backlog: 'Chờ xử lý',
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  in_review: 'Chờ duyệt',
  review: 'Chờ duyệt',
  done: 'Hoàn tất',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  archived: 'Lưu trữ',
};

const COLUMNS = [
  { id: 'favorite', label: '⭐', width: 44, pinned: true },
  { id: 'code', label: 'Mã CV', width: 120 },
  { id: 'title', label: 'Nhiệm vụ & Mục tiêu cần đạt', width: 350 },
  { id: 'supervisorName', label: 'Cấp trên giao / Duyệt', width: 190 },
  { id: 'priority', label: 'Ưu tiên', width: 120 },
  { id: 'status', label: 'Trạng thái', width: 140 },
  { id: 'progress', label: 'Tiến độ', width: 120 },
  { id: 'startDate', label: 'Ngày làm', width: 120 },
  { id: 'dueDate', label: 'Hạn chót', width: 120 },
  // 4 cột mặc định hệ thống (có thể ẩn/hiện tùy chọn trên menu Tùy chỉnh cột)
  { id: 'createdByName', label: 'Người tạo', width: 160 },
  { id: 'createdAt', label: 'Ngày tạo', width: 140 },
  { id: 'updatedByName', label: 'Người sửa', width: 160 },
  { id: 'updatedAt', label: 'Ngày sửa', width: 140 },
];

export default function MyTasksPage() {
  const { seq } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || searchParams.get('filter') || 'all';

  const [activeTab, setActiveTab] = useState(urlTab);
  const [tasks, setTasks] = useState([]);
  const [trashTasks, setTrashTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Per-User Starred / Watched Tasks (Tách biệt riêng cho từng người dùng)
  const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.username || 'user';
  const [userStarredIds, setUserStarredIds] = useState(() => getUserStarredTaskIds(currentUserId));

  useEffect(() => {
    setUserStarredIds(getUserStarredTaskIds(currentUserId));
  }, [currentUserId]);

  // Delete & Purge modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeTargetIds, setPurgeTargetIds] = useState([]);
  const [purgeBusy, setPurgeBusy] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [activeData, trashData] = await Promise.all([
        taskService.listTasks({ view: 'my' }),
        taskService.getTrashTasks(),
      ]);
      const list = Array.isArray(activeData) ? activeData : [];
      setTasks(
        list.map((item) => ({
          ...item,
          createdByName: item.createdByName || item.assignerName || item.supervisorName || 'Cấp trên giao việc',
          createdAt: item.createdAt || '2026-11-01',
          updatedByName: item.updatedByName || item.assigneeName || currentUser?.name || 'Tôi (Cập nhật)',
          updatedAt: item.updatedAt || '2026-11-06',
          rowVersion: item.rowVersion || item.RowVersion || 1,
        }))
      );
      setTrashTasks(Array.isArray(trashData) ? trashData : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách công việc:', err);
      setTasks([]);
      setTrashTasks([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.name]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  // Đánh dấu / Bỏ theo dõi cá nhân ⭐ (Ghim lên đầu cho riêng người dùng)
  const handleToggleStar = (taskId) => {
    const isNowStarred = toggleUserStarredTask(currentUserId, taskId);
    setUserStarredIds(new Set(getUserStarredTaskIds(currentUserId)));
    const target = tasks.find((t) => t.id === taskId);
    notify.success(
      isNowStarred
        ? `Đã thêm công việc "${target?.code || taskId}" vào theo dõi cá nhân ⭐ (Ghim lên đầu)`
        : `Đã bỏ theo dõi cá nhân công việc "${target?.code || taskId}"`
    );
  };

  // Lưu trữ (Ẩn) hoặc Khôi phục hiển thị công việc
  const handleArchiveTask = async (taskId, shouldArchive = true) => {
    const target = tasks.find((t) => t.id === taskId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              isArchived: shouldArchive,
              status: shouldArchive ? 'archived' : (t.status === 'archived' ? 'todo' : t.status),
            }
          : t
      )
    );
    try {
      await taskService.archiveTask(taskId, shouldArchive);
      notify.success(
        shouldArchive
          ? `Đã lưu trữ công việc "${target?.code || taskId}" (Đã ẩn khỏi danh sách chính)`
          : `Đã khôi phục hiển thị công việc "${target?.code || taskId}"`
      );
    } catch {
      notify.error('Không thể thực hiện lưu trữ công việc');
    }
  };

  // Lưu trữ / Khôi phục hàng loạt các việc đã chọn
  const handleArchiveSelected = async () => {
    if (!selectedTaskIds.length) return;
    const shouldArchive = activeTab !== 'archived';
    const count = selectedTaskIds.length;
    for (const id of selectedTaskIds) {
      await taskService.archiveTask(id, shouldArchive);
    }
    setTasks((prev) =>
      prev.map((t) =>
        selectedTaskIds.includes(t.id)
          ? {
              ...t,
              isArchived: shouldArchive,
              status: shouldArchive ? 'archived' : (t.status === 'archived' ? 'todo' : t.status),
            }
          : t
      )
    );
    setSelectedTaskIds([]);
    notify.success(
      shouldArchive
        ? `Đã lưu trữ và ẩn ${count} công việc thành công`
        : `Đã khôi phục hiển thị ${count} công việc từ kho lưu trữ`
    );
  };

  // Kiểm tra quyền xóa công việc theo quy tắc ERP
  const canDeleteTask = useCallback((t) => {
    if (!t) return false;
    const role = (currentUser?.role || '').toLowerCase();
    const isAdmin = ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager'].includes(role) ||
                    currentUser?.username === 'admin' ||
                    currentUser?.username === 'superadmin';
    if (isAdmin) return true;

    const myId = String(currentUser?.id || currentUser?.user_id || '').toLowerCase();
    const myName = (currentUser?.name || currentUser?.fullName || '').trim().toLowerCase();
    const isAssigner = (myId && String(t.assignerId || '').toLowerCase() === myId) ||
                       (myName && (t.assignerName || '').toLowerCase().includes(myName));
    if (isAssigner) return true;

    const isPersonal = t.isPersonal || t.delegationLevel === 'personal' || (!t.supervisorName || t.supervisorName === 'Tôi');
    const isAssignee = (myId && String(t.assigneeId || '').toLowerCase() === myId) ||
                       (myName && (t.assigneeName || '').toLowerCase().includes(myName));
    if (isPersonal && isAssignee) return true;

    return false;
  }, [currentUser]);

  const canDeleteAllSelected = useMemo(() => {
    if (!selectedTaskIds.length) return false;
    const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
    return selectedTasks.length > 0 && selectedTasks.every((t) => canDeleteTask(t));
  }, [tasks, selectedTaskIds, canDeleteTask]);

  // Xóa danh sách công việc cá nhân đã chọn (Mở modal xác nhận)
  const handleDeleteSelected = () => {
    if (!selectedTaskIds.length) return;
    const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
    const unauthorized = selectedTasks.filter((t) => !canDeleteTask(t));
    if (unauthorized.length > 0) {
      notify.error(
        `Bạn không có quyền xóa ${unauthorized.length} công việc do cấp trên/người khác giao (ví dụ: "${unauthorized[0].title || unauthorized[0].code}"). Bạn chỉ có thể Lưu trữ/Ẩn hoặc báo cáo tiến độ.`
      );
      return;
    }
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTaskIds.length) return;
    setDeleteBusy(true);
    try {
      let count = 0;
      for (const id of selectedTaskIds) {
        await taskService.deleteTask(id);
        count++;
      }
      notify.success(`Đã chuyển ${count} công việc vào thùng rác cá nhân.`);
      setSelectedTaskIds([]);
      setDeleteModalOpen(false);
      loadTasks();
    } catch (err) {
      notify.error('Lỗi khi xóa công việc: ' + (err.message || ''));
    } finally {
      setDeleteBusy(false);
    }
  };

  // Khôi phục 1 công việc từ thùng rác
  const handleRestoreSingle = async (task, e) => {
    e?.stopPropagation?.();
    if (!task?.id) return;
    try {
      await taskService.restoreTask(task.id);
      notify.success(`Đã khôi phục công việc "${task.title || task.code}" về danh sách làm việc.`);
      setSelectedTaskIds((prev) => prev.filter((id) => id !== task.id));
      await loadTasks();
    } catch (err) {
      notify.error('Lỗi khi khôi phục công việc: ' + (err.message || ''));
    }
  };

  // Khôi phục nhiều công việc từ thùng rác
  const handleRestoreSelected = async () => {
    if (!selectedTaskIds.length) return;
    try {
      let count = 0;
      for (const id of selectedTaskIds) {
        await taskService.restoreTask(id);
        count++;
      }
      notify.success(`Đã khôi phục thành công ${count} công việc về danh sách.`);
      setSelectedTaskIds([]);
      await loadTasks();
    } catch (err) {
      notify.error('Lỗi khi khôi phục công việc: ' + (err.message || ''));
    }
  };

  // Xóa vĩnh viễn (Purge) từ thùng rác
  const handlePurgeSingle = (task, e) => {
    e?.stopPropagation?.();
    if (!task?.id) return;
    setPurgeTargetIds([task.id]);
    setPurgeModalOpen(true);
  };

  const handleOpenPurgeSelected = () => {
    if (!selectedTaskIds.length) return;
    setPurgeTargetIds(selectedTaskIds);
    setPurgeModalOpen(true);
  };

  const handleOpenPurgeAll = () => {
    if (!trashTasks.length) return;
    setPurgeTargetIds(trashTasks.map((t) => t.id));
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
      setSelectedTaskIds([]);
      setPurgeModalOpen(false);
      await loadTasks();
    } catch (err) {
      notify.error('Lỗi khi dọn dẹp thùng rác: ' + (err.message || ''));
    } finally {
      setPurgeBusy(false);
    }
  };

  // Filter tasks: chỉ hiển thị công việc của tôi, được @ tôi, và do phòng giao cho tôi làm
  const myBaseTasks = useMemo(() => {
    const myId = String(currentUser?.id || currentUser?.user_id || '').toLowerCase();
    const myName = (currentUser?.name || currentUser?.fullName || '').trim().toLowerCase();
    const myUsername = (currentUser?.username || '').trim().toLowerCase();
    const myDept = (currentUser?.department || '').trim().toLowerCase();

    return tasks.filter((t) => {
      // 1. Công việc của tôi / Tôi làm (Assignee)
      const assigneeId = String(t.assigneeId || '').toLowerCase();
      const assigneeName = (t.assigneeName || '').trim().toLowerCase();
      const isMyAssigneeId = Boolean(myId && assigneeId && assigneeId === myId);
      const isMyAssigneeName = Boolean(myName && assigneeName && (assigneeName.includes(myName) || (myUsername && assigneeName.includes(myUsername))));
      const isAssignedToMe = isMyAssigneeId || isMyAssigneeName || assigneeName === 'tôi thực hiện' || assigneeName === 'tôi' || assigneeName === 'tôi phụ trách';

      // 2. Được @ tôi (@tên, @username hoặc @tôi trong Tiêu đề, Mô tả, Tags hoặc Checklists)
      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const tags = typeof t.tags === 'string' ? t.tags.toLowerCase() : JSON.stringify(t.tags || '').toLowerCase();

      const isMentionedInText = (term) => term && (
        title.includes(`@${term}`) ||
        desc.includes(`@${term}`) ||
        tags.includes(`@${term}`)
      );

      const isMentioned = Boolean(
        (myName && isMentionedInText(myName)) ||
        (myUsername && isMentionedInText(myUsername)) ||
        title.includes('@tôi') ||
        desc.includes('@tôi') ||
        (t.checklists && Array.isArray(t.checklists) && t.checklists.some((item) => {
          const itemExec = (item.executor || item.assignee || '').toLowerCase();
          const itemTitle = (item.title || '').toLowerCase();
          return (
            (myName && itemExec.includes(myName)) ||
            (myUsername && itemExec.includes(myUsername)) ||
            itemExec === 'tôi thực hiện' ||
            (myName && itemTitle.includes(`@${myName}`)) ||
            itemTitle.includes('@tôi')
          );
        }))
      );

      // 3. Công việc cá nhân tôi tự tạo
      const isPersonalCreatedByMe = Boolean(
        (t.isPersonal || t.delegationLevel === 'personal') &&
        ((myId && (String(t.assignerId || '').toLowerCase() === myId || String(t.createdById || '').toLowerCase() === myId)) ||
         (myName && ((t.createdByName || '').toLowerCase().includes(myName) || (t.assignerName || '').toLowerCase().includes(myName))))
      );

      // 4. Phòng giao: Công việc thuộc phòng ban của tôi giao
      const taskDept = (t.department || '').trim().toLowerCase();
      const isSameDept = !taskDept || !myDept || taskDept === myDept ||
        (myDept.includes('erp') && (taskDept.includes('erp') || taskDept.includes('cntt'))) ||
        (myDept.includes('cntt') && (taskDept.includes('cntt') || taskDept.includes('it')));

      // Bắt buộc: Phải liên quan trực tiếp đến tôi (được giao cho tôi, tôi làm, hoặc được @ tôi) VÀ thuộc phòng ban giao
      return (isAssignedToMe || isMentioned || isPersonalCreatedByMe) && isSameDept;
    });
  }, [tasks, currentUser]);

  // Lọc và Sắp xếp: Ưu tiên công việc quan trọng ⭐ lên đầu bảng!
  const myTasks = useMemo(() => {
    if (activeTab === 'trash') {
      return trashTasks.filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.title?.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q) ||
          t.assigneeName?.toLowerCase().includes(q) ||
          t.supervisorName?.toLowerCase().includes(q) ||
          t.department?.toLowerCase().includes(q)
        );
      });
    }

    return myBaseTasks.filter((t) => {
      const isTaskArchived = Boolean(t.isArchived || t.status === 'archived');
      if (activeTab === 'archived') {
        if (!isTaskArchived) return false;
      } else {
        if (isTaskArchived) return false; // Ẩn khỏi các tab làm việc thường
      }

      // Tab filter: Phân biệt rõ giữa Theo dõi cá nhân (⭐) và Công việc quan trọng (Priority)
      if (activeTab === 'starred') {
        if (!userStarredIds.has(String(t.id))) return false;
      } else if (activeTab === 'important') {
        const isImportant =
          t.priority === 'urgent' ||
          t.priority === 'high' ||
          Boolean(t.isImportant || t.important) ||
          userStarredIds.has(String(t.id));
        if (!isImportant) return false;
      } else if (activeTab === 'in_progress') {
        if (t.status !== 'in_progress') return false;
      } else if (activeTab === 'in_review') {
        if (t.status !== 'in_review' && t.status !== 'review') return false;
      } else if (activeTab === 'done') {
        if (t.status !== 'done' && t.status !== 'completed') return false;
      }

      if (statusFilter && t.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchText =
          t.title?.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q) ||
          t.supervisorName?.toLowerCase().includes(q);
        if (!matchText) return false;
      }

      return true;
    }).sort((a, b) => {
      // 1. Ưu tiên công việc theo dõi cá nhân (⭐) của riêng user này lên đầu bảng!
      const aStar = userStarredIds.has(String(a.id));
      const bStar = userStarredIds.has(String(b.id));
      if (aStar !== bStar) return bStar ? 1 : -1;

      // 2. Tiếp theo ưu tiên công việc quan trọng (mức ưu tiên khẩn cấp / cao)
      const aImp = a.priority === 'urgent' || a.priority === 'high';
      const bImp = b.priority === 'urgent' || b.priority === 'high';
      if (aImp !== bImp) return bImp ? 1 : -1;

      // 3. Tiếp theo là hạn hoàn thành hoặc ngày tạo
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [myBaseTasks, activeTab, statusFilter, search, userStarredIds]);

  // Mở In-Screen Workspace khi xem chi tiết (Hỗ trợ URL /app/tasks/my/:seq)
  // Đặt sau toàn bộ hook để tuân thủ React Rules of Hooks
  const activeTaskId = seq || selectedTaskId;
  if (activeTaskId) {
    return (
      <TaskDetailPage
        taskId={activeTaskId}
        onBack={() => {
          setSelectedTaskId(null);
          navigate('/app/tasks/my');
        }}
        onTaskUpdated={loadTasks}
      />
    );
  }

  const total = myTasks.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = myTasks.slice(start, start + pageSize);

  const effectiveColumns = COLUMNS;

  const renderCell = (column, row) => {
    if (column.id === 'favorite' || column.id === 'isImportant') {
      const isStar = userStarredIds.has(String(row.id));
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStar(row.id);
          }}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
            isStar ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
          }`}
          title={isStar ? 'Bỏ theo dõi cá nhân' : 'Đánh sao theo dõi cá nhân ⭐ (Ghim lên đầu cho riêng bạn)'}
          aria-label="Theo dõi cá nhân"
        >
          <Star size={16} fill={isStar ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
      );
    }
    if (column.id === 'code') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/app/tasks/my/${row.code || row.id}`);
          }}
          className={`font-mono font-semibold ${
            activeTab === 'trash'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-emerald-700 dark:text-emerald-400'
          } hover:underline cursor-pointer text-left`}
        >
          {row.code}
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
          className={`font-medium ${
            activeTab === 'trash'
              ? 'text-slate-700 dark:text-slate-300 line-through decoration-slate-400'
              : 'text-slate-900 dark:text-slate-100'
          } truncate hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left cursor-pointer max-w-full block`}
          title={row.title}
        >
          {row.title}
        </button>
      );
    }
    if (column.id === 'priority') {
      const priMap = {
        urgent: { label: 'Khẩn cấp', color: 'text-rose-600 dark:text-rose-400 font-bold' },
        high: { label: 'Cao', color: 'text-amber-600 dark:text-amber-400 font-semibold' },
        medium: { label: 'Trung bình', color: 'text-sky-600 dark:text-sky-400 font-medium' },
        low: { label: 'Thấp', color: 'text-slate-400 dark:text-slate-500 font-normal' },
      };
      const pInfo = priMap[row.priority] || { label: PRIORITY_LABELS[row.priority] || row.priority || 'Trung bình', color: 'text-slate-600' };
      return <span className={pInfo.color}>{pInfo.label}</span>;
    }
    if (column.id === 'status') {
      if (activeTab === 'trash') {
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            Trong thùng rác
          </span>
        );
      }
      if (row.isArchived || row.status === 'archived') {
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Lưu trữ
          </span>
        );
      }
      const stMap = {
        done: { label: 'Hoàn tất', color: 'text-emerald-600 dark:text-emerald-400 font-semibold' },
        completed: { label: 'Hoàn tất', color: 'text-emerald-600 dark:text-emerald-400 font-semibold' },
        in_progress: { label: 'Đang làm', color: 'text-blue-600 dark:text-blue-400 font-medium' },
        in_review: { label: 'Chờ duyệt', color: 'text-amber-600 dark:text-amber-400 font-medium' },
        review: { label: 'Chờ duyệt', color: 'text-amber-600 dark:text-amber-400 font-medium' },
        todo: { label: 'Cần làm', color: 'text-indigo-600 dark:text-indigo-400 font-medium' },
        backlog: { label: 'Chờ xử lý', color: 'text-slate-600 dark:text-slate-400 font-medium' },
        cancelled: { label: 'Đã hủy', color: 'text-slate-400 line-through' },
      };
      const sInfo = stMap[row.status] || { label: STATUS_LABELS[row.status] || row.status || 'Cần làm', color: 'text-slate-600' };
      return <span className={sInfo.color}>{sInfo.label}</span>;
    }
    if (column.id === 'startDate') {
      return row.startDate ? new Date(row.startDate).toLocaleDateString('vi-VN') : '—';
    }
    if (column.id === 'dueDate') {
      return row.dueDate ? new Date(row.dueDate).toLocaleDateString('vi-VN') : '—';
    }
    if (column.id === 'progress') {
      return `${row.progress || 0}%`;
    }
    if (column.id === 'createdByName' || column.id === 'updatedByName') {
      const name = row[column.id] || (column.id === 'createdByName' ? (row.supervisorName || 'Cấp trên') : (row.assigneeName || 'Tôi'));
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
            tabs={[{ id: activeTab, label: VIEW_TITLES[activeTab] || 'Việc của tôi' }]}
            activeTab={activeTab}
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {activeTab === 'trash' ? (
              <>
                {selectedTaskIds.length > 0 ? (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={RotateCcw}
                      onClick={handleRestoreSelected}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      title="Khôi phục các công việc đã chọn"
                    >
                      Khôi phục ({selectedTaskIds.length})
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={handleOpenPurgeSelected}
                      title="Dọn dẹp vĩnh viễn các công việc đã chọn"
                    >
                      Dọn dẹp đã chọn ({selectedTaskIds.length})
                    </Button>
                  </>
                ) : (
                  trashTasks.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Trash2}
                      onClick={handleOpenPurgeAll}
                      className="text-rose-600 hover:text-rose-700 border-rose-300 dark:border-rose-800"
                      title="Dọn sạch toàn bộ thùng rác"
                    >
                      Dọn sạch thùng rác
                    </Button>
                  )
                )}

                <Button
                  variant="outline"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => loadTasks()}
                >
                  Làm mới
                </Button>
              </>
            ) : (
              <>
                {selectedTaskIds.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={activeTab === 'archived' ? ArchiveRestore : FolderArchive}
                      onClick={handleArchiveSelected}
                      className={activeTab === 'archived' ? 'text-emerald-600' : 'text-amber-600 dark:text-amber-400'}
                      title={activeTab === 'archived' ? 'Khôi phục hiển thị' : 'Lưu trữ / Ẩn việc'}
                    >
                      {activeTab === 'archived' ? `Hiện lại (${selectedTaskIds.length})` : `Lưu trữ / Ẩn (${selectedTaskIds.length})`}
                    </Button>

                    {canDeleteAllSelected ? (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={handleDeleteSelected}
                      >
                        Xóa ({selectedTaskIds.length})
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Trash2}
                        disabled
                        title="Bạn không có quyền xóa công việc do cấp trên hoặc người khác giao. Hãy sử dụng Lưu trữ / Ẩn việc."
                        className="opacity-40 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800"
                      >
                        Không thể xóa ({selectedTaskIds.length})
                      </Button>
                    )}
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

                {activeTab !== 'archived' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => navigate('/app/tasks/my/new')}
                  >
                    Thêm công việc
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => loadTasks()}
                >
                  Làm mới
                </Button>
              </>
            )}
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
              placeholder="Tìm mã CV, tên công việc, cấp trên…"
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
            className="w-44 font-medium text-xs"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'todo', label: 'Chưa làm (To Do)' },
              { value: 'in_progress', label: 'Đang làm (In Progress)' },
              { value: 'in_review', label: 'Chờ duyệt (In Review)' },
              { value: 'done', label: 'Đã hoàn tất (Done)' },
            ]}
          />

          {(search || statusFilter) && (
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
          title={VIEW_TITLES[activeTab] || 'Công việc của tôi'}
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
        preferenceKey="etpms-my-tasks"
        columns={effectiveColumns}
        rows={pageItems}
        loading={loading}
        selectedIds={selectedTaskIds}
        onSelectedIdsChange={setSelectedTaskIds}
        onOpen={(row) => navigate(`/app/tasks/my/${row.code || row.id}`)}
        onRowClick={(row) => navigate(`/app/tasks/my/${row.code || row.id}`)}
        onAddRow={() => navigate('/app/tasks/my/new')}
        renderCell={renderCell}
        page={page}
        pageSize={pageSize}
        columnMenuTargetId="etpms-my-tasks-column-menu"
        emptyText={
          activeTab === 'trash'
            ? 'Thùng rác của tôi đang trống. Không có công việc nào bị xóa.'
            : activeTab === 'archived'
            ? 'Kho lưu trữ đang trống. Chưa có công việc nào được lưu trữ.'
            : 'Bạn chưa có công việc nào cần xử lý.'
        }
      />

      <DeleteTaskModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        onArchive={handleArchiveSelected}
        task={selectedTaskIds.length === 1 ? tasks.find((t) => t.id === selectedTaskIds[0]) : null}
        count={selectedTaskIds.length}
        busy={deleteBusy}
      />

      <PurgeTrashModal
        open={purgeModalOpen}
        onClose={() => setPurgeModalOpen(false)}
        onConfirm={handleConfirmPurge}
        count={purgeTargetIds.length}
        tasks={trashTasks.filter((t) => purgeTargetIds.includes(t.id))}
        busy={purgeBusy}
      />
    </ManagementFrame>
  );
}
