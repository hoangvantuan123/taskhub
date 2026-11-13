import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Tabs from '../../../shared/ui/Tabs';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import ExportDataModal from '../../../shared/ui/ExportDataModal';
import ImportDataModal from '../../../shared/ui/ImportDataModal';
import { notify } from '../../../shared/lib/notify';
import TaskDetailPage from './TaskDetailPage';
import TaskContextMenu from '../components/TaskContextMenu';
import TaskImagePreviewModal from '../components/TaskImagePreviewModal';
import { getTaskMedia, getAvatarInfo } from '../utils/taskMedia';
import { renderPriorityBadge, renderStatusBadge } from '../utils/taskStatusBadge';
import { taskService } from '../services/taskService';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  Plus,
  RotateCcw,
  Search,
  Table,
  Kanban,
  ZoomIn,
  Star,
  Trash2,
  Edit3,
} from 'lucide-react';
import DeleteTaskModal from '../components/DeleteTaskModal';
import { getUserStarredTaskIds, toggleUserStarredTask } from '../utils/userStarredTasks';

const VIEW_TITLES = {
  all: 'Tất cả công việc',
  important: 'Công việc quan trọng',
  overdue: 'Công việc quá hạn',
  recurring: 'Công việc định kỳ',
  archived: 'Kho lưu trữ công việc',
  my: 'Việc của tôi',
  delegated: 'Việc tôi giao',
};

const COLUMNS = [
  { id: 'favorite', label: '⭐', width: 44, pinned: true },
  { id: 'image', label: 'Tài liệu đính kèm', width: 110 },
  { id: 'code', label: 'Mã CV', width: 115 },
  { id: 'title', label: 'Tên công việc & Mục tiêu', width: 330 },
  { id: 'module', label: 'Phân hệ / Chức năng', width: 180 },
  { id: 'receiving', label: 'BP & Người tiếp nhận', width: 190 },
  { id: 'delegationLevel', label: 'Phân cấp', width: 140 },
  { id: 'department', label: 'Phòng ban / Đơn vị', width: 180 },
  { id: 'assigneeName', label: 'Người thực hiện', width: 180 },
  { id: 'supervisorName', label: 'Người giám sát / duyệt', width: 170 },
  { id: 'priority', label: 'Mức ưu tiên', width: 120 },
  { id: 'status', label: 'Trạng thái quy trình', width: 145 },
  { id: 'progress', label: 'Tiến độ', width: 110 },
  { id: 'dueDate', label: 'Hạn chót', width: 130 },
  // 4 cột mặc định hệ thống (có thể hiển thị/ẩn tùy chọn trong menu Tùy chỉnh cột)
  { id: 'createdByName', label: 'Người tạo', width: 160 },
  { id: 'createdAt', label: 'Ngày tạo', width: 140 },
  { id: 'updatedByName', label: 'Người sửa', width: 160 },
  { id: 'updatedAt', label: 'Ngày sửa', width: 140 },
  // (Cột rowVersion được ẩn hoàn toàn không hiển thị cột, dùng để kiểm soát xung đột phiên bản)
];

const PRIORITY_LABELS = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const STATUS_LABELS = {
  backlog: 'Backlog (Mới)',
  todo: 'To Do (Đã giao)',
  in_progress: 'In Progress (Đang làm)',
  in_review: 'In Review (Chờ duyệt)',
  review: 'In Review (Chờ duyệt)',
  done: 'Done (Hoàn tất)',
  completed: 'Done (Hoàn tất)',
  cancelled: 'Đã hủy',
  archived: 'Đã lưu trữ',
};

const DELEGATION_LABELS = {
  company: 'Cấp Ban Giám Đốc',
  director: 'Cấp Ban Giám Đốc',
  department: 'Cấp Phòng Ban',
  project: 'Cấp Dự Án',
  team: 'Cấp Tổ / Nhóm',
  personal: 'Cấp Cá Nhân',
};

export default function TaskListPage() {
  const { seq } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();

  const urlView = searchParams.get('view');
  const urlFilter = searchParams.get('filter') || searchParams.get('tab') || 'all';
  const urlProjectId = searchParams.get('projectId') || '';

  // View Modes: 'table' (Bảng dữ liệu custom) | 'kanban' (Bảng Kanban)
  const [viewMode, setViewMode] = useState(
    urlView === 'kanban' ? 'kanban' : 'table'
  );
  const [activeTab, setActiveTab] = useState(urlFilter === 'kanban' ? 'all' : urlFilter);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState(urlProjectId);
  const [projectsList, setProjectsList] = useState([]);

  // Modals for Export and Import
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Per-User Starred / Watched Tasks (Tách biệt riêng cho từng người dùng)
  const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.username || 'user';
  const [userStarredIds, setUserStarredIds] = useState(() => getUserStarredTaskIds(currentUserId));

  useEffect(() => {
    setUserStarredIds(getUserStarredTaskIds(currentUserId));
  }, [currentUserId]);

  // Pagination for table view
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Row selection checkboxes state
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, task }

  // Lightbox Media Preview
  const [previewMedia, setPreviewMedia] = useState(null);

  // Delete Task Modal State
  const [deleteModalState, setDeleteModalState] = useState({ open: false, task: null, count: 1, isBulk: false });
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Handle right-click on table rows
  const handleRowContextMenu = (e, row) => {
    setContextMenu({ x: e.clientX, y: e.clientY, task: row });
  };

  // 1. Duplicate / Clone Task
  const handleDuplicateTask = async (task) => {
    if (!task) return;
    try {
      const payload = {
        title: `[Bản sao] ${task.title}`,
        description: task.description || '',
        department: task.department || 'Kỹ thuật',
        delegationLevel: task.delegationLevel || 'department',
        priority: task.priority || 'medium',
        estimatedHours: Number(task.estimatedHours || 8),
      };
      if (task.projectId) payload.projectId = Number(task.projectId);
      if (task.assigneeId) payload.assigneeId = task.assigneeId;
      if (task.supervisorId) payload.supervisorId = task.supervisorId;
      if (task.dueDate) payload.dueDate = task.dueDate;

      await taskService.createTask(payload);
      notify.success(`Đã nhân bản công việc "${task.title}" thành công.`);
      loadTasks();
    } catch (err) {
      console.error('Error duplicating task:', err);
      notify.error('Lỗi khi nhân bản công việc: ' + (err.message || ''));
    }
  };

  // 2. Quick Status Update
  const handleUpdateTaskStatus = async (task, newStatus) => {
    if (!task) return;
    try {
      await taskService.updateTaskStatus(task.id, newStatus);
      notify.success(`Đã cập nhật trạng thái công việc sang "${STATUS_LABELS[newStatus] || newStatus}".`);
      loadTasks();
    } catch (err) {
      console.error('Error updating task status:', err);
      notify.error('Lỗi khi cập nhật trạng thái: ' + (err.message || ''));
    }
  };

  // 3. Quick Priority Update
  const handleUpdateTaskPriority = async (task, newPriority) => {
    if (!task) return;
    try {
      await taskService.updateTask({ id: task.id, priority: newPriority });
      notify.success(`Đã đổi mức độ ưu tiên sang "${PRIORITY_LABELS[newPriority] || newPriority}".`);
      loadTasks();
    } catch (err) {
      console.error('Error updating task priority:', err);
      notify.error('Lỗi khi cập nhật mức ưu tiên: ' + (err.message || ''));
    }
  };

  // 4. Delete Task (Soft-delete with permission checks)
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

  const handleDeleteTask = (task) => {
    if (!task) return;
    if (!canDeleteTask(task)) {
      notify.error(
        `Bạn không có quyền xóa công việc do cấp trên hoặc người khác giao ("${task.title || task.code}"). Vui lòng sử dụng tính năng Lưu trữ để ẩn hoặc báo cáo tiến độ.`
      );
      return;
    }
    setDeleteModalState({ open: true, task, count: 1, isBulk: false });
  };

  const canDeleteAllSelected = useMemo(() => {
    if (!selectedTaskIds.length) return false;
    const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
    return selectedTasks.length > 0 && selectedTasks.every((t) => canDeleteTask(t));
  }, [tasks, selectedTaskIds, canDeleteTask]);

  const handleBulkDelete = () => {
    if (!selectedTaskIds.length) return;
    const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
    const unauthorized = selectedTasks.filter((t) => !canDeleteTask(t));
    if (unauthorized.length > 0) {
      notify.error(
        `Bạn không có quyền xóa ${unauthorized.length} công việc do cấp trên/người khác giao (ví dụ: "${unauthorized[0].title || unauthorized[0].code}"). Bạn chỉ có thể Lưu trữ/Ẩn hoặc báo cáo tiến độ.`
      );
      return;
    }
    setDeleteModalState({ open: true, task: null, count: selectedTaskIds.length, isBulk: true });
  };

  const handleConfirmDelete = async () => {
    setDeleteBusy(true);
    try {
      if (deleteModalState.isBulk) {
        let deleted = 0;
        for (const id of selectedTaskIds) {
          await taskService.deleteTask(id);
          deleted++;
        }
        notify.success(`Đã chuyển ${deleted} công việc vào thùng rác cá nhân.`);
        setSelectedTaskIds([]);
      } else if (deleteModalState.task) {
        await taskService.deleteTask(deleteModalState.task.id);
        notify.success(`Đã chuyển công việc "${deleteModalState.task.title}" vào thùng rác cá nhân.`);
        setSelectedTaskIds((prev) => prev.filter((id) => id !== deleteModalState.task.id));
      }
      setDeleteModalState({ open: false, task: null, count: 1, isBulk: false });
      loadTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      notify.error('Lỗi khi xóa công việc: ' + (err.message || ''));
    } finally {
      setDeleteBusy(false);
    }
  };

  // 5. Copy Code
  const handleCopyCode = (task) => {
    if (!task) return;
    const text = task.code || String(task.id);
    navigator.clipboard?.writeText(text);
    notify.success(`Đã sao chép mã công việc ${text} vào clipboard.`);
  };

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      navigate('/app/tasks/new', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (urlView === 'kanban') {
      setViewMode('kanban');
    } else {
      setViewMode('table');
    }
  }, [urlView]);

  useEffect(() => {
    if (urlFilter && urlFilter !== 'kanban') {
      setActiveTab(urlFilter);
    } else {
      setActiveTab('all');
    }
  }, [urlFilter]);

  useEffect(() => {
    setProjectFilter(urlProjectId);
  }, [urlProjectId]);

  useEffect(() => {
    taskService.listProjects().then((data) => {
      if (Array.isArray(data)) setProjectsList(data);
    });
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.listTasks();
      if (Array.isArray(data)) {
        setTasks(
          data.map((item, idx) => ({
            ...item,
            createdByName: item.createdByName || item.assignerName || 'Nguyễn Quản Lý',
            createdAt: item.createdAt || '2026-11-01',
            updatedByName: item.updatedByName || item.supervisorName || item.assigneeName || 'Lê Giám Sát',
            updatedAt: item.updatedAt || '2026-11-06',
            rowVersion: item.rowVersion || item.RowVersion || 1,
          }))
        );
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleTabChange = (tabId) => {
    if (tabId === 'my') {
      navigate('/app/tasks/my');
      return;
    }
    setActiveTab(tabId);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (tabId === 'all') {
      next.delete('filter');
      next.delete('tab');
    } else {
      next.set('filter', tabId);
    }
    setSearchParams(next, { replace: true });
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    const next = new URLSearchParams(searchParams);
    if (mode === 'table') {
      next.delete('view');
    } else {
      next.set('view', mode);
    }
    setSearchParams(next, { replace: true });
  };

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setDepartmentFilter('');
    setPriorityFilter('');
    setStatusFilter('');
    setLevelFilter('');
    setProjectFilter('');
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.delete('projectId');
    setSearchParams(next, { replace: true });
  };

  // Filter Tasks by Tab and Toolbar Filters (All hooks MUST be declared before any conditional early returns)
  const filteredTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      // 1. Tab filter: Phân biệt rõ giữa Theo dõi cá nhân (⭐) và Công việc quan trọng (Priority)
      if (activeTab === 'starred') {
        if (!userStarredIds.has(String(t.id))) return false;
      } else if (activeTab === 'important') {
        const isImportant =
          t.priority === 'urgent' ||
          t.priority === 'high' ||
          Boolean(t.isImportant || t.important);
        if (!isImportant) return false;
      }
      if (activeTab === 'my') {
        const myName = currentUser?.name || currentUser?.username || 'admin';
        const match =
          (t.assigneeName || '').toLowerCase().includes(myName.toLowerCase()) ||
          (t.assigneeName || '').toLowerCase().includes('user 01');
        if (!match) return false;
      }
      if (activeTab === 'delegated') {
        const myName = currentUser?.name || currentUser?.username || 'admin';
        const match =
          (t.supervisorName || '').toLowerCase().includes(myName.toLowerCase()) ||
          t.delegationLevel === 'company';
        if (!match) return false;
      }
      if (activeTab === 'overdue') {
        const isDone = t.status === 'done' || t.status === 'completed';
        const isOverdue = t.isOverdue || (t.dueDate && new Date(t.dueDate) < now);
        if (isDone || !isOverdue) return false;
      }
      if (activeTab === 'recurring') {
        if (!t.isRecurring && !t.title?.toLowerCase().includes('định kỳ')) return false;
      }
      
      const isTaskArchived = Boolean(t.isArchived || t.status === 'archived');
      if (activeTab === 'archived') {
        if (!isTaskArchived) return false;
      } else {
        if (isTaskArchived) return false;
      }

      // 2. Toolbar filters
      if (projectFilter) {
        const matchProject =
          String(t.projectId || '') === String(projectFilter) ||
          String(t.projectName || '').toLowerCase().includes(projectFilter.toLowerCase());
        if (!matchProject) return false;
      }
      if (departmentFilter && t.department !== departmentFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (levelFilter && t.delegationLevel !== levelFilter) return false;

      // 3. Search query
      if (search) {
        const q = search.toLowerCase();
        const match =
          (t.title || '').toLowerCase().includes(q) ||
          (t.code || '').toLowerCase().includes(q) ||
          (t.assigneeName || '').toLowerCase().includes(q) ||
          (t.department || '').toLowerCase().includes(q) ||
          (t.supervisorName || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      // 1. Ưu tiên công việc đánh sao (⭐ Theo dõi cá nhân của riêng user này) lên đầu!
      const aStar = userStarredIds.has(String(a.id));
      const bStar = userStarredIds.has(String(b.id));
      if (aStar !== bStar) return bStar ? 1 : -1;

      // 2. Tiếp theo ưu tiên việc quan trọng (urgent/high)
      const aImp = a.priority === 'urgent' || a.priority === 'high';
      const bImp = b.priority === 'urgent' || b.priority === 'high';
      if (aImp !== bImp) return bImp ? 1 : -1;

      // 3. Tiếp theo là hạn chót hoặc ngày tạo
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [tasks, activeTab, projectFilter, departmentFilter, priorityFilter, statusFilter, levelFilter, search, currentUser, userStarredIds]);

  // If View Detail is active -> Render In-Screen Workspace! (Hỗ trợ URL /app/tasks/:seq)
  const activeTaskId = seq || selectedTaskId;
  if (activeTaskId) {
    return (
      <TaskDetailPage
        taskId={activeTaskId}
        onBack={() => {
          setSelectedTaskId(null);
          navigate('/app/tasks');
        }}
        onTaskUpdated={loadTasks}
      />
    );
  }

  const total = filteredTasks.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filteredTasks.slice(start, start + pageSize);

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

  // Standard Plain-Text Cell Renderer (UI_DESIGN_STANDARD.md Rule 3)
  const renderCell = (column, row, rowIndex) => {
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
    if (column.id === 'image') {
      const media = getTaskMedia(row, rowIndex);
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setPreviewMedia(media);
          }}
          className="relative group w-9 h-9 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center shrink-0"
          title="Bấm để xem ảnh mẫu / bản vẽ kỹ thuật"
        >
          <img
            src={media.thumbUrl}
            alt={media.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <ZoomIn size={14} />
          </div>
        </div>
      );
    }
    if (column.id === 'code') {
      return (
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {row.code || '—'}
        </span>
      );
    }
    if (column.id === 'title') {
      return (
        <span className="font-medium text-slate-900 dark:text-white truncate">
          {row.title}
        </span>
      );
    }
    if (column.id === 'module') {
      const tags = typeof row.tags === 'object' ? (row.tags || {}) : (() => {
        try { return JSON.parse(row.tags || '{}'); } catch { return {}; }
      })();
      const mod = tags.module || row.subDepartment || '—';
      const feat = tags.feature || '';
      return (
        <div className="flex flex-col text-xs leading-snug py-0.5 min-w-0">
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{mod}</span>
          {feat && <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{feat}</span>}
        </div>
      );
    }
    if (column.id === 'receiving') {
      const tags = typeof row.tags === 'object' ? (row.tags || {}) : (() => {
        try { return JSON.parse(row.tags || '{}'); } catch { return {}; }
      })();
      const dept = tags.receivingDept || 'ERP';
      const rec = tags.recipientName || row.assigneeName || '—';
      const isBravo = dept.toLowerCase().includes('bravo');
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
            isBravo ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
          }`}>
            {dept}
          </span>
          <span className="font-medium text-xs text-slate-700 dark:text-slate-300 truncate">{rec}</span>
        </div>
      );
    }
    if (column.id === 'delegationLevel') {
      return DELEGATION_LABELS[row.delegationLevel] || row.delegationLevel || 'Cấp Phòng Ban';
    }
    if (column.id === 'assigneeName') {
      const avatar = getAvatarInfo(row.assigneeName);
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatar.colorClass}`}
          >
            {avatar.initials}
          </span>
          <span className="truncate font-medium text-slate-800 dark:text-slate-200">
            {row.assigneeName || '—'}
          </span>
        </div>
      );
    }
    if (column.id === 'priority') {
      return renderPriorityBadge(row.priority);
    }
    if (column.id === 'status') {
      return renderStatusBadge(row.status);
    }
    if (column.id === 'progress') {
      const p = row.progress ?? 0;
      return (
        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
          {p}%
        </span>
      );
    }
    if (column.id === 'dueDate') {
      if (!row.dueDate) return '—';
      const d = new Date(row.dueDate);
      const isOverdue = d < new Date() && row.status !== 'done' && row.status !== 'completed';
      const formatted = Number.isNaN(d.getTime()) ? String(row.dueDate) : d.toLocaleDateString('vi-VN');
      return (
        <span className={isOverdue ? 'font-semibold text-rose-600' : ''}>
          {formatted}{isOverdue ? ' (Quá hạn)' : ''}
        </span>
      );
    }
    if (column.id === 'createdByName' || column.id === 'updatedByName') {
      const name = row[column.id] || (column.id === 'createdByName' ? (row.assignerName || 'Hệ thống') : (row.supervisorName || row.assigneeName || 'Hệ thống'));
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
    return String(row[column.id] ?? '—');
  };

  // Kanban Stage Grouping
  const backlogTasks = filteredTasks.filter((t) => t.status === 'backlog');
  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const inReviewTasks = filteredTasks.filter((t) => t.status === 'in_review' || t.status === 'review');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done' || t.status === 'completed');

  const handleUpdateStatus = async (taskId, newStatus) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      await loadTasks();
      notify.success(`Đã cập nhật trạng thái nhiệm vụ: ${targetTask?.code || taskId}`);
    } catch (err) {
      if (err?.message?.includes('ROW_VERSION_CONFLICT') || err?.code === 40001) {
        notify.error(`Xung đột phiên bản: Dữ liệu đã được ${targetTask?.updatedByName || 'người khác'} sửa đổi trước đó (Phiên bản ${targetTask?.rowVersion || 1}). Vui lòng tải lại.`);
        await loadTasks();
      } else {
        notify.error('Không thể cập nhật trạng thái công việc');
      }
    }
  };

  const selectedProj = projectsList.find(
    (p) => String(p.id) === String(projectFilter) || String(p.code) === String(projectFilter)
  );
  const headerTitle = selectedProj
    ? `Dự án: ${selectedProj.code} - ${selectedProj.name}`
    : (VIEW_TITLES[activeTab] || 'Tất cả công việc');

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: activeTab, label: headerTitle }]}
            activeTab={activeTab}
            onChange={() => {}}
          />
          <div className="management-actions flex items-center gap-2">
            {selectedTaskIds.length > 0 && (
              <>
                {selectedTaskIds.length === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Edit3}
                    onClick={() => {
                      const selected = tasks.find((t) => t.id === selectedTaskIds[0]);
                      if (selected) {
                        navigate(`/app/tasks/${selected.code || selected.id}/edit`);
                      }
                    }}
                    className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    title="Chỉnh sửa chi tiết thông tin công việc đã chọn"
                  >
                    Sửa công việc
                  </Button>
                )}
                {canDeleteAllSelected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Trash2}
                    onClick={handleBulkDelete}
                    className="text-rose-600 hover:text-rose-700 border-rose-300 dark:border-rose-800"
                  >
                    Xóa ({selectedTaskIds.length})
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Trash2}
                    disabled
                    title="Bạn không có quyền xóa công việc do cấp trên hoặc người khác giao. Vui lòng sử dụng tính năng Lưu trữ để ẩn hoặc báo cáo tiến độ."
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
              onClick={() => navigate('/app/tasks/new')}
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
              placeholder="Tìm mã, tên công việc, người phụ trách…"
            />
          </div>

          <button
            type="button"
            title="Tìm kiếm"
            aria-label="Tìm kiếm"
            onClick={handleApplySearch}
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <Search size={15} />
          </button>

          <Select
            size="sm"
            className="w-60 font-medium text-xs"
            value={projectFilter}
            clearable={true}
            placeholder="Tất cả dự án"
            onChange={(e) => {
              const val = e?.target?.value ?? e;
              setProjectFilter(val);
              setPage(1);
              const next = new URLSearchParams(searchParams);
              if (val) {
                next.set('projectId', val);
              } else {
                next.delete('projectId');
              }
              setSearchParams(next, { replace: true });
            }}
            options={[
              { value: '', label: 'Tất cả dự án' },
              ...projectsList.map((p) => ({
                value: p.id,
                label: `${p.code} - ${p.name}`,
              })),
            ]}
          />

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
              { value: 'Phòng ban Quản trị ERP & CNTT', label: 'Phòng Quản trị ERP & CNTT' },
              { value: 'Khối Cung ứng & Logistics', label: 'Khối Cung ứng & Logistics' },
              { value: 'Khối Sản xuất In Offset & Flexo', label: 'Khối In Offset & Flexo' },
              { value: 'Phòng R&D & Thiết kế Cấu trúc Bao bì', label: 'Phòng R&D Bao bì' },
              { value: 'Phòng Quản lý Chất lượng (QA/QC)', label: 'Phòng Quản lý Chất lượng' },
              { value: 'Phòng CNTT & Chuyển đổi số (IT & MES)', label: 'Phòng CNTT & MES' },
              { value: 'Khối Sản xuất Sóng & Thành phẩm', label: 'Khối Sản xuất Sóng' },
              { value: 'Ban Tổng Giám đốc (BOD)', label: 'Ban Tổng Giám đốc' },
            ]}
          />

          <Select
            size="sm"
            className="w-36 font-medium text-xs"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả ưu tiên' },
              { value: 'urgent', label: 'Khẩn cấp' },
              { value: 'high', label: 'Cao' },
              { value: 'medium', label: 'Trung bình' },
              { value: 'low', label: 'Thấp' },
            ]}
          />

          <Select
            size="sm"
            className="w-40 font-medium text-xs"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'backlog', label: '1. Backlog (Mới)' },
              { value: 'todo', label: '2. To Do (Đã giao)' },
              { value: 'in_progress', label: '3. In Progress (Đang làm)' },
              { value: 'in_review', label: '4. In Review (Chờ duyệt)' },
              { value: 'done', label: '5. Done (Hoàn tất)' },
            ]}
          />

          <Select
            size="sm"
            className="w-40 font-medium text-xs"
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả phân cấp' },
              { value: 'company', label: 'Cấp Ban Giám Đốc' },
              { value: 'department', label: 'Cấp Phòng Ban' },
              { value: 'project', label: 'Cấp Dự Án' },
              { value: 'team', label: 'Cấp Tổ / Nhóm' },
            ]}
          />

          {(search || projectFilter || departmentFilter || priorityFilter || statusFilter || levelFilter) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
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
          title={selectedProj ? `Công việc dự án: ${selectedProj.code}` : "Danh sách nhiệm vụ"}
          totalCount={total}
          unit="công việc"
          selectedCount={selectedTaskIds.length}
          page={viewMode === 'table' ? page : undefined}
          totalPages={viewMode === 'table' ? totalPages : undefined}
          pageSize={viewMode === 'table' ? pageSize : undefined}
          pageSizeOptions={[20, 50, 100, 200]}
          onPageChange={viewMode === 'table' ? setPage : undefined}
          onPageSizeChange={viewMode === 'table' ? setPageSize : undefined}
          onExport={() => setExportModalOpen(true)}
          onImport={() => setImportModalOpen(true)}
          columnMenuTargetId="etpms-tasks-column-menu"
          actionsExtra={
            <div className="inline-flex items-center p-0.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs">
              <button
                type="button"
                onClick={() => handleViewModeChange('table')}
                className={`p-1 rounded transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Bảng dữ liệu"
                aria-label="Bảng dữ liệu"
              >
                <Table size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('kanban')}
                className={`p-1 rounded transition cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Bảng quy trình Kanban"
                aria-label="Bảng quy trình Kanban"
              >
                <Kanban size={13} />
              </button>
            </div>
          }
        />
      }
    >
      {/* 1. Kanban View (5 Stages with Packaging Images & Avatar) */}
      {viewMode === 'kanban' && (
        <div className="h-full overflow-x-auto p-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="grid grid-cols-5 gap-3.5 min-w-[1150px] h-full items-start">
            {[
              { id: 'backlog', title: '1. Backlog (Mới)', items: backlogTasks, next: 'todo', color: 'border-slate-300' },
              { id: 'todo', title: '2. To Do (Đã giao)', items: todoTasks, next: 'in_progress', color: 'border-blue-400' },
              { id: 'in_progress', title: '3. In Progress (Đang làm)', items: inProgressTasks, next: 'in_review', color: 'border-amber-400' },
              { id: 'in_review', title: '4. In Review (Chờ duyệt)', items: inReviewTasks, next: 'done', color: 'border-purple-400' },
              { id: 'done', title: '5. Done (Hoàn tất)', items: doneTasks, next: null, color: 'border-emerald-500' },
            ].map((col) => (
              <div
                key={col.id}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-3 flex flex-col max-h-full shadow-xs"
              >
                <div className={`flex items-center justify-between pb-2 border-b-2 ${col.color}`}>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{col.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {col.items.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                  {col.items.map((task, idx) => {
                    const media = getTaskMedia(task, idx);
                    const avatar = getAvatarInfo(task.assigneeName);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5 hover:border-emerald-500 hover:shadow-sm cursor-pointer transition"
                      >
                        {/* Header: Code & Priority */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{task.code}</span>
                          <span className="font-medium text-slate-500">{PRIORITY_LABELS[task.priority] || task.priority}</span>
                        </div>

                        {/* Packaging Thumbnail Preview */}
                        <div
                          className="relative group h-20 w-full rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewMedia(media);
                          }}
                        >
                          <img
                            src={media.thumbUrl}
                            alt={media.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                            <ZoomIn size={13} /> Xem ảnh mẫu
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {task.title}
                        </h4>

                        {/* Assignee & Progress */}
                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${avatar.colorClass}`}>
                              {avatar.initials}
                            </span>
                            <span className="truncate max-w-[90px]">{task.assigneeName || 'Chưa giao'}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600">{task.progress}%</span>
                        </div>

                        {/* Next status advance */}
                        {col.next && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(task.id, col.next);
                              }}
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                            >
                              Chuyển tiếp →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {col.items.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs italic">Không có việc</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Table View (Bảng dữ liệu phẳng VirtualDataTable) */}
      {viewMode === 'table' && (
        <VirtualDataTable
          columns={COLUMNS}
          rows={pageItems}
          loading={loading}
          selectedIds={selectedTaskIds}
          onSelectedIdsChange={setSelectedTaskIds}
          onRowContextMenu={handleRowContextMenu}
          onOpen={(row) => navigate(`/app/tasks/${row.code || row.id}`)}
          onAddRow={() => navigate('/app/tasks/new')}
          onExport={() => setExportModalOpen(true)}
          renderCell={(col, row) => renderCell(col, row, pageItems.indexOf(row))}
          preferenceKey="etpms-tasklist"
          columnMenuTargetId="etpms-tasks-column-menu"
          page={page}
          pageSize={pageSize}
          emptyMessage="Không có công việc nào phù hợp với bộ lọc hiện tại."
        />
      )}

      {/* Image Preview Lightbox Modal */}
      {previewMedia && (
        <TaskImagePreviewModal
          media={previewMedia}
          onClose={() => setPreviewMedia(null)}
        />
      )}

      {/* EXPORT DATA MODAL */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Xuất dữ liệu danh sách công việc"
        columns={COLUMNS.filter((c) => c.id !== 'image').map((c) => ({ key: c.id, label: c.label }))}
        selectedRows={filteredTasks.filter((t) => selectedTaskIds.includes(t.id))}
        currentPageRows={pageItems}
        totalCount={total}
        onFetchAllRows={async () => filteredTasks}
      />

      {/* IMPORT DATA MODAL */}
      <ImportDataModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Nhập dữ liệu công việc từ file Excel"
        onImport={async (rows, options) => {
          let count = 0;
          for (const row of rows) {
            try {
              await taskService.createTask({
                title: row.title || row['Tên công việc & Mục tiêu'] || row.name || 'Công việc mới',
                department: row.department || row['Phòng ban / Đơn vị'] || 'Kỹ thuật',
                delegationLevel: row.delegationLevel || 'department',
                priority: row.priority || 'medium',
                description: row.description || '',
              });
              count++;
            } catch (err) {
              if (!options.skipErrors) {
                throw new Error(`Lỗi tại công việc "${row.title || 'không tên'}": ${err.message}`);
              }
            }
          }
          await loadTasks();
          return count;
        }}
        onSuccess={(count) => {
          notify.success(`Đã nhập thành công ${count} công việc vào hệ thống.`);
        }}
      />

      {/* CUSTOM RIGHT-CLICK CONTEXT MENU (Menu chuột phải trên hàng công việc) */}
      {contextMenu && (
        <TaskContextMenu
          task={contextMenu.task}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={(task) => navigate(`/app/tasks/${task.code || task.id}/edit`)}
          onDuplicate={handleDuplicateTask}
          onOpenDetail={(task) => navigate(`/app/tasks/${task.code || task.id}`)}
          onUpdateStatus={handleUpdateTaskStatus}
          onUpdatePriority={handleUpdateTaskPriority}
          onDelete={handleDeleteTask}
          onCopyCode={handleCopyCode}
        />
      )}
      {/* Delete Task Confirmation Modal */}
      <DeleteTaskModal
        open={deleteModalState.open}
        onClose={() => setDeleteModalState({ open: false, task: null, count: 1, isBulk: false })}
        onConfirm={handleConfirmDelete}
        task={deleteModalState.task}
        count={deleteModalState.count}
        busy={deleteBusy}
      />
    </ManagementFrame>
  );
}
