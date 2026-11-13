import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import ClickUpDatePicker from '../../../shared/ui/ClickUpDatePicker';
import { useAuth } from '../../../shared/hooks/useAuth';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../services/taskService';
import { renderPriorityBadge } from '../utils/taskStatusBadge';
import {
  Plus,
  ArrowLeft,
  RotateCcw,
  Search,
  Save,
  Pencil,
  FolderArchive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Workflow,
} from 'lucide-react';

const FILTER_INFO = {
  all: {
    title: 'Tất cả dự án & Kế hoạch',
    desc: 'Danh mục toàn bộ dự án sản xuất và kế hoạch hành động chiến lược',
  },
  my: {
    title: 'Dự án của tôi',
    desc: 'Các dự án do bạn trực tiếp quản lý (PM) hoặc chủ trì khởi tạo',
  },
  active: {
    title: 'Dự án đang triển khai',
    desc: 'Các dự án đang trong tiến trình thực hiện và điều hành thường nhật',
  },
  completed: {
    title: 'Dự án đã hoàn thành',
    desc: 'Các dự án đã hoàn thành toàn bộ khối lượng công việc và đạt nghiệm thu',
  },
  archived: {
    title: 'Kho lưu trữ dự án',
    desc: 'Các dự án đã đóng và lưu trữ phục vụ tra cứu lịch sử, kiểm toán (Read-only)',
  },
};

const PROJECT_COLUMNS = [
  { id: 'code', label: 'Mã dự án', width: 120 },
  { id: 'name', label: 'Tên dự án / Kế hoạch', width: 340 },
  { id: 'department', label: 'Khối / Phòng ban', width: 200 },
  { id: 'priority', label: 'Ưu tiên', width: 110 },
  { id: 'status', label: 'Trạng thái', width: 140 },
  { id: 'requiresApproval', label: 'Quy trình duyệt', width: 180 },
  { id: 'taskSummary', label: 'Khối lượng CV', width: 130 },
  { id: 'progress', label: 'Tiến độ', width: 100 },
  { id: 'startDate', label: 'Ngày bắt đầu', width: 120 },
  { id: 'endDate', label: 'Hạn hoàn thành', width: 120 },
  // 4 cột mặc định hệ thống
  { id: 'createdByName', label: 'Người tạo', width: 160 },
  { id: 'createdAt', label: 'Ngày tạo', width: 120 },
  { id: 'updatedByName', label: 'Người sửa', width: 160 },
  { id: 'updatedAt', label: 'Ngày sửa', width: 120 },
];

const getTodayDateStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDefaultEndDateStr = (days = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatToDateInput = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
};

const getInitialFormData = (user) => ({
  id: '',
  code: '',
  name: '',
  description: '',
  department: user?.department || 'Phòng ban Quản trị ERP & CNTT',
  priority: 'high',
  status: 'active',
  startDate: getTodayDateStr(),
  endDate: getDefaultEndDateStr(30),
  budget: 0,
  progress: 0,
  requiresApproval: false,
  approvalWorkflow: '1_level',
});

export default function ProjectListPage() {
  const navigate = useNavigate();
  const { currentUser, hasPermission } = useAuth();
  const isAdminOrPM =
    ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager', 'project_manager'].includes(
      (currentUser?.role || '').toLowerCase()
    ) || currentUser?.username === 'admin';
  const canCreateProject = isAdminOrPM || hasPermission('projects:create');

  const [searchParams, setSearchParams] = useSearchParams();
  const rawFilter = searchParams.get('filter') || 'all';
  const urlFilter = rawFilter === 'cards' ? 'all' : rawFilter;

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(urlFilter);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);

  // In-screen workspace state ('list' | 'create' | 'edit')
  const [workspaceMode, setWorkspaceMode] = useState('list');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => getInitialFormData(currentUser));

  useEffect(() => {
    if (rawFilter === 'cards') {
      const next = new URLSearchParams(searchParams);
      next.delete('filter');
      setSearchParams(next, { replace: true });
    }
  }, [rawFilter, searchParams, setSearchParams]);

  useEffect(() => {
    setActiveTab(urlFilter);
    setPage(1);
    setSelectedIds([]);
  }, [urlFilter]);

  useEffect(() => {
    taskService
      .getEmployees()
      .then((res) => {
        if (Array.isArray(res)) setEmployees(res);
      })
      .catch(() => {});
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await taskService.listProjects();
      if (Array.isArray(data)) {
        setProjects(
          data.map((item) => ({
            ...item,
            createdByName: item.createdByName || item.managerName || 'Ban Giám Đốc',
            createdAt: item.createdAt || '2026-01-15',
            updatedByName: item.updatedByName || item.managerName || 'Quản lý dự án',
            updatedAt: item.updatedAt || '2026-11-01',
            rowVersion: item.rowVersion || item.RowVersion || 1,
          }))
        );
      } else {
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setDeptFilter('');
    setPage(1);
  };

  const handleStartCreate = () => {
    setFormData(getInitialFormData(currentUser));
    setWorkspaceMode('create');
  };

  const handleStartEdit = (project) => {
    if (!project) return;
    setFormData({
      id: project.id || project.IdSeq || '',
      code: project.code || '',
      name: project.name || '',
      description: project.description || '',
      department: project.department || currentUser?.department || 'Phòng ban Quản trị ERP & CNTT',
      priority: project.priority || 'high',
      status: project.status || 'active',
      startDate: formatToDateInput(project.startDate) || getTodayDateStr(),
      endDate: formatToDateInput(project.endDate) || getDefaultEndDateStr(30),
      budget: project.budget || 0,
      progress: project.progress || 0,
      requiresApproval: Boolean(project.requiresApproval),
      approvalWorkflow: project.approvalWorkflow || '1_level',
    });
    setWorkspaceMode('edit');
  };

  const handleSaveProject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name?.trim()) {
      notify.error('Vui lòng nhập tên dự án');
      return;
    }
    setSubmitting(true);
    try {
      if (workspaceMode === 'edit') {
        await taskService.updateProject({
          id: formData.id,
          code: formData.code?.trim(),
          name: formData.name?.trim(),
          description: formData.description,
          department: formData.department,
          priority: formData.priority,
          status: formData.status,
          startDate: formData.startDate,
          endDate: formData.endDate,
          progress: Number(formData.progress) || 0,
          budget: Number(formData.budget) || 0,
          requiresApproval: Boolean(formData.requiresApproval),
          approvalWorkflow: formData.approvalWorkflow || '1_level',
        });
        notify.success(`Đã cập nhật dự án ${formData.code || formData.name} thành công`);
      } else {
        await taskService.createProject({
          ...formData,
          requiresApproval: Boolean(formData.requiresApproval),
          approvalWorkflow: formData.approvalWorkflow || '1_level',
        });
        notify.success('Đã đăng ký dự án mới vào hệ thống');
      }
      setWorkspaceMode('list');
      await loadProjects();
    } catch (err) {
      notify.error(err?.message || (workspaceMode === 'edit' ? 'Không thể cập nhật dự án' : 'Không thể tạo dự án'));
    } finally {
      setSubmitting(false);
    }
  };

  const canArchiveProject = (project) => {
    if (
      currentUser?.role === 'admin' ||
      currentUser?.role === 'director' ||
      currentUser?.role === 'manager' ||
      currentUser?.role === 'giam_doc' ||
      currentUser?.isSuperAdmin
    ) {
      return true;
    }
    const myName = (currentUser?.name || currentUser?.fullName || '').toLowerCase();
    if (myName) {
      if (project?.managerName && project.managerName.toLowerCase().includes(myName)) return true;
      if (project?.createdByName && project.createdByName.toLowerCase().includes(myName)) return true;
    }
    return false;
  };

  const handleArchiveProject = async (project, e) => {
    if (e) e.stopPropagation();
    if (!canArchiveProject(project)) {
      notify.error('Chỉ Giám đốc dự án (PM) hoặc Ban Giám Đốc mới có thẩm quyền Lưu trữ dự án này');
      return;
    }
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn lưu trữ dự án [${project.code}] "${project.name}"?\n\nDự án sẽ được chuyển vào Kho lưu trữ chỉ đọc (Read-only) để bảo toàn dữ liệu lịch sử.`
    );
    if (!confirmed) return;

    try {
      await taskService.updateProject({ id: project.id, status: 'archived' });
      setProjects((prev) =>
        prev.map((item) => (item.id === project.id ? { ...item, status: 'archived' } : item))
      );
      notify.success(`Đã lưu trữ dự án ${project.code} vào kho lưu trữ thành công`);
    } catch (err) {
      notify.error(err?.message || 'Không thể lưu trữ dự án');
    }
  };

  const handleRestoreProject = async (project, e) => {
    if (e) e.stopPropagation();
    if (!canArchiveProject(project)) {
      notify.error('Chỉ Giám đốc dự án (PM) hoặc Ban Giám Đốc mới có thẩm quyền Khôi phục dự án này');
      return;
    }
    const confirmed = window.confirm(
      `Khôi phục dự án [${project.code}] "${project.name}" về trạng thái Đang triển khai?`
    );
    if (!confirmed) return;

    try {
      await taskService.updateProject({ id: project.id, status: 'active' });
      setProjects((prev) =>
        prev.map((item) => (item.id === project.id ? { ...item, status: 'active' } : item))
      );
      notify.success(`Đã khôi phục dự án ${project.code} về trạng thái đang triển khai`);
    } catch (err) {
      notify.error(err?.message || 'Không thể khôi phục dự án');
    }
  };

  const canDeleteProject = (project) => {
    if (!project) return false;
    if (
      currentUser?.role === 'admin' ||
      currentUser?.role === 'director' ||
      currentUser?.role === 'giam_doc' ||
      currentUser?.isSuperAdmin ||
      currentUser?.username === 'admin'
    ) {
      return true;
    }
    const myName = (currentUser?.name || currentUser?.fullName || '').toLowerCase();
    const myId = String(currentUser?.id || currentUser?.user_id || '').toLowerCase();
    if (myName) {
      if (project?.managerName && project.managerName.toLowerCase().includes(myName)) return true;
      if (project?.createdByName && project.createdByName.toLowerCase().includes(myName)) return true;
    }
    if (myId && project?.managerId && String(project.managerId).toLowerCase() === myId) return true;
    return false;
  };

  const handleDeleteProject = async (project, e) => {
    if (e) e.stopPropagation();
    if (!canDeleteProject(project)) {
      notify.error('Bạn không có quyền xóa dự án này. Chỉ Giám đốc dự án (PM) hoặc Ban Giám Đốc mới có thẩm quyền.');
      return;
    }
    if (project.totalTasks > 0) {
      const confirmed = window.confirm(
        `CẢNH BÁO DỮ LIỆU LIÊN KẾT:\n\nDự án [${project.code}] "${project.name}" đang có ${project.totalTasks} công việc liên quan (${project.doneTasks || 0} việc đã hoàn thành).\n\nTheo quy chuẩn ERP, bạn nên chọn "Lưu trữ" để bảo toàn lịch sử. Nếu xóa, các công việc sẽ bị gỡ liên kết khỏi dự án này.\n\nBạn có chắc chắn vẫn muốn XÓA dự án này không?`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        `Bạn có chắc chắn muốn xóa dự án [${project.code}] "${project.name}" khỏi hệ thống không?`
      );
      if (!confirmed) return;
    }

    try {
      await taskService.deleteProject(project.id);
      setProjects((prev) => prev.filter((item) => item.id !== project.id));
      setSelectedIds((prev) => prev.filter((id) => id !== project.id));
      notify.success(`Đã xóa dự án ${project.code} khỏi hệ thống thành công.`);
    } catch (err) {
      notify.error(err?.message || 'Không thể xóa dự án');
    }
  };

  const handleBulkArchive = async () => {
    if (!selectedIds.length) return;
    const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));
    const unauthorized = selectedProjects.filter((p) => !canArchiveProject(p));
    if (unauthorized.length > 0) {
      notify.error(
        `Bạn không có quyền lưu trữ ${unauthorized.length} dự án (chỉ Giám đốc dự án hoặc Ban Giám Đốc mới có thẩm quyền).`
      );
      return;
    }
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn lưu trữ ${selectedProjects.length} dự án đã chọn vào Kho lưu trữ chỉ đọc (Read-only)?`
    );
    if (!confirmed) return;

    try {
      let count = 0;
      for (const p of selectedProjects) {
        await taskService.updateProject({ id: p.id, status: 'archived' });
        count++;
      }
      setProjects((prev) =>
        prev.map((item) => (selectedIds.includes(item.id) ? { ...item, status: 'archived' } : item))
      );
      setSelectedIds([]);
      notify.success(`Đã lưu trữ ${count} dự án vào kho lưu trữ thành công.`);
    } catch (err) {
      notify.error(err?.message || 'Không thể lưu trữ các dự án đã chọn');
    }
  };

  const handleBulkRestore = async () => {
    if (!selectedIds.length) return;
    const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));
    const unauthorized = selectedProjects.filter((p) => !canArchiveProject(p));
    if (unauthorized.length > 0) {
      notify.error(
        `Bạn không có quyền khôi phục ${unauthorized.length} dự án (chỉ Giám đốc dự án hoặc Ban Giám Đốc mới có thẩm quyền).`
      );
      return;
    }
    const confirmed = window.confirm(
      `Khôi phục ${selectedProjects.length} dự án đã chọn về trạng thái Đang triển khai?`
    );
    if (!confirmed) return;

    try {
      let count = 0;
      for (const p of selectedProjects) {
        await taskService.updateProject({ id: p.id, status: 'active' });
        count++;
      }
      setProjects((prev) =>
        prev.map((item) => (selectedIds.includes(item.id) ? { ...item, status: 'active' } : item))
      );
      setSelectedIds([]);
      notify.success(`Đã khôi phục ${count} dự án về trạng thái đang triển khai.`);
    } catch (err) {
      notify.error(err?.message || 'Không thể khôi phục các dự án đã chọn');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));
    const unauthorized = selectedProjects.filter((p) => !canDeleteProject(p));
    if (unauthorized.length > 0) {
      notify.error(
        `Bạn không có quyền xóa ${unauthorized.length} dự án do người khác phụ trách. Chỉ Giám đốc dự án (PM) hoặc Ban Giám Đốc mới có thẩm quyền.`
      );
      return;
    }

    const projectsWithTasks = selectedProjects.filter((p) => p.totalTasks > 0);
    let confirmMsg = `Bạn có chắc chắn muốn xóa ${selectedProjects.length} dự án đã chọn khỏi hệ thống không?`;
    if (projectsWithTasks.length > 0) {
      confirmMsg = `CẢNH BÁO DỮ LIỆU LIÊN KẾT:\n\nTrong ${selectedProjects.length} dự án đã chọn, có ${projectsWithTasks.length} dự án đang chứa công việc liên quan.\nNếu xóa, các công việc sẽ bị gỡ liên kết khỏi dự án.\n\nBạn có chắc chắn vẫn muốn XÓA ${selectedProjects.length} dự án này không?`;
    }
    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;

    try {
      let count = 0;
      for (const p of selectedProjects) {
        await taskService.deleteProject(p.id);
        count++;
      }
      setProjects((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      notify.success(`Đã xóa ${count} dự án khỏi hệ thống thành công.`);
    } catch (err) {
      notify.error(err?.message || 'Không thể xóa các dự án đã chọn');
    }
  };

  const filtered = useMemo(() => {
    const myName = (currentUser?.name || currentUser?.fullName || '').toLowerCase();
    return projects.filter((p) => {
      const pStatus = p.status || 'active';
      if (activeTab === 'active' && pStatus !== 'active') return false;
      if (activeTab === 'completed' && pStatus !== 'completed') return false;
      if (activeTab === 'archived' && pStatus !== 'archived') return false;

      if (activeTab === 'my') {
        const isMyProject =
          (p.managerName && p.managerName.toLowerCase().includes(myName)) ||
          (p.createdByName && p.createdByName.toLowerCase().includes(myName)) ||
          currentUser?.role === 'admin' ||
          currentUser?.role === 'director';
        if (!isMyProject) return false;
        if (pStatus === 'archived') return false;
      }

      if (activeTab === 'all' && pStatus === 'archived') {
        return false;
      }

      if (deptFilter && p.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          (p.code || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.managerName || '').toLowerCase().includes(q) ||
          (p.department || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [projects, activeTab, deptFilter, search, currentUser]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const currentInfo = FILTER_INFO[activeTab] || FILTER_INFO.all;

  const selectedProject = useMemo(
    () => (selectedIds.length === 1 ? projects.find((p) => p.id === selectedIds[0]) : null),
    [selectedIds, projects]
  );

  const renderCell = (column, row) => {
    const percent =
      row.totalTasks > 0
        ? Math.round(((row.doneTasks || 0) / row.totalTasks) * 100)
        : row.progress || 0;

    if (column.id === 'code') {
      return (
        <span
          className="font-mono font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          onClick={() => navigate(`/app/tasks?projectId=${row.id}`)}
          title={`Xem công việc của dự án ${row.code}`}
        >
          {row.code || '—'}
        </span>
      );
    }
    if (column.id === 'name') {
      return (
        <span
          className="font-medium text-slate-900 dark:text-white truncate hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline cursor-pointer"
          onClick={() => navigate(`/app/tasks?projectId=${row.id}`)}
          title={row.name || ''}
        >
          {row.name || '—'}
        </span>
      );
    }
    if (column.id === 'priority') {
      return renderPriorityBadge(row.priority);
    }
    if (column.id === 'status') {
      const st = row.status || 'active';
      if (st === 'completed') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Đã hoàn thành
          </span>
        );
      }
      if (st === 'archived') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
            Lưu trữ (Chỉ đọc)
          </span>
        );
      }
      if (st === 'planning') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Lập kế hoạch
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
          Đang triển khai
        </span>
      );
    }
    if (column.id === 'requiresApproval') {
      if (row.requiresApproval) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Bắt buộc duyệt ({row.approvalWorkflow === '2_level' ? '2 cấp' : '1 cấp'})
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          Tự động duyệt khi xong
        </span>
      );
    }
    if (column.id === 'taskSummary') {
      return `${row.doneTasks || 0}/${row.totalTasks || 0} hoàn tất`;
    }
    if (column.id === 'progress') {
      return (
        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
          {percent}%
        </span>
      );
    }
    if (column.id === 'startDate' || column.id === 'endDate') {
      const val = row[column.id];
      if (!val) return '—';
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('vi-VN');
    }
    if (column.id === 'createdByName' || column.id === 'updatedByName') {
      const name =
        row[column.id] ||
        (column.id === 'createdByName'
          ? row.managerName || 'Ban Giám Đốc'
          : row.managerName || 'Quản lý dự án');
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

  if (workspaceMode === 'create' || workspaceMode === 'edit') {
    const isEditing = workspaceMode === 'edit';
    return (
      <ManagementFrame
        className="h-full"
        scrollableContent={false}
        header={
          <div className="flex items-center justify-between w-full gap-3 py-2">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => setWorkspaceMode('list')}
              >
                Quay lại
              </Button>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing
                    ? `Chỉnh sửa Thông tin Dự án: ${formData.code || formData.name}`
                    : 'Khởi tạo Dự án & Kế hoạch mới'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isEditing
                    ? 'Cập nhật thông tin chi tiết, tiến độ, thời hạn thực tế và phân công quản lý'
                    : 'Thiết lập thông tin điều hành dự án và phân bổ phòng ban chủ trì'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWorkspaceMode('list')}
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Save}
                disabled={submitting}
                onClick={handleSaveProject}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật dự án' : 'Lưu dự án mới'}
              </Button>
            </div>
          </div>
        }
      >
        <form
          onSubmit={handleSaveProject}
          className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950"
        >
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-5 space-y-4 bg-slate-50/40 dark:bg-slate-900/20 text-xs overflow-y-auto">
            <h3 className="font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
              Cấu hình quản trị dự án
            </h3>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Mã dự án</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Tự động tạo nếu để trống (VD: PRJ-2026-07)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Khối / Phòng ban chủ trì</label>
              <input
                type="text"
                list="department-suggestions"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Chọn hoặc nhập phòng ban..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs"
              />
              <datalist id="department-suggestions">
                <option value="Phòng ban Quản trị ERP & CNTT" />
                <option value="Khối Sản xuất In Offset & Flexo" />
                <option value="Khối Sản xuất Sóng & Thành phẩm" />
                <option value="Phòng Quản lý Chất lượng (QA/QC)" />
                <option value="Phòng R&D & Thiết kế Cấu trúc Bao bì" />
                <option value="Khối Cung ứng & Logistics" />
                <option value="Kỹ thuật & Bảo trì" />
              </datalist>
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Trạng thái dự án</label>
              <Select
                size="sm"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e?.target?.value ?? e })}
                options={[
                  { value: 'active', label: 'Đang triển khai' },
                  { value: 'completed', label: 'Đã hoàn thành' },
                  { value: 'planning', label: 'Lập kế hoạch' },
                  { value: 'on_hold', label: 'Tạm dừng' },
                  { value: 'archived', label: 'Lưu trữ' },
                ]}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Mức độ ưu tiên</label>
              <Select
                size="sm"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e?.target?.value ?? e })}
                options={[
                  { value: 'urgent', label: 'Khẩn cấp (Urgent)' },
                  { value: 'high', label: 'Cao (High)' },
                  { value: 'medium', label: 'Trung bình (Medium)' },
                  { value: 'low', label: 'Thấp (Low)' },
                ]}
              />
            </div>
            {isEditing && (
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Tiến độ dự án (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress || 0}
                    onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                    className="flex-1 accent-emerald-600"
                  />
                  <span className="font-mono font-bold text-emerald-600 w-10 text-right">
                    {formData.progress || 0}%
                  </span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Ngân sách dự kiến (VNĐ)</label>
              <input
                type="number"
                min="0"
                step="1000000"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="Nhập ngân sách..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            {/* Cấu hình Quy trình duyệt */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="requiresApprovalInput"
                  checked={formData.requiresApproval}
                  onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="requiresApprovalInput" className="cursor-pointer">
                  <span className="block font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Kích hoạt duyệt nghiệm thu
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-snug">
                    {formData.requiresApproval
                      ? 'Công việc xong 100% sẽ chuyển vào hàng đợi Chờ duyệt tại Ban Giám sát.'
                      : 'Mặc định (Tắt): Công việc xong là duyệt luôn, không cần duyệt rườm rà.'}
                  </span>
                </label>
              </div>

              {formData.requiresApproval && (
                <div className="pl-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium text-[10px] uppercase tracking-wider">
                    Cấp độ phê duyệt dự án
                  </label>
                  <Select
                    size="sm"
                    value={formData.approvalWorkflow || '1_level'}
                    onChange={(e) => setFormData({ ...formData, approvalWorkflow: e?.target?.value ?? e })}
                    options={[
                      { value: '1_level', label: '1 Cấp: Quản lý trực tiếp duyệt' },
                      { value: '2_level', label: '2 Cấp: Theo dõi kỹ thuật -> PM duyệt' },
                    ]}
                  />
                </div>
              )}
            </div>
          </aside>

          <main className="p-6 space-y-4 overflow-y-auto text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên dự án / Chương trình hành động *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên dự án chiến lược hoặc kế hoạch sản xuất..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-sm font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mục tiêu & Phạm vi triển khai
              </label>
              <textarea
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả mục tiêu KPI, phạm vi nhà máy áp dụng và tiêu chuẩn nghiệm thu..."
                className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày bắt đầu (Thực tế) *
                </label>
                <ClickUpDatePicker
                  mode="input"
                  tabLabel="Ngày bắt đầu"
                  value={formData.startDate}
                  placeholder="Chọn ngày bắt đầu..."
                  onChange={(val) => setFormData({ ...formData, startDate: val })}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hạn hoàn thành dự kiến (Thực tế) *
                </label>
                <ClickUpDatePicker
                  mode="input"
                  tabLabel="Hạn hoàn thành"
                  value={formData.endDate}
                  placeholder="Chọn hạn hoàn thành..."
                  onChange={(val) => setFormData({ ...formData, endDate: val })}
                />
              </div>
            </div>
          </main>
        </form>
      </ManagementFrame>
    );
  }

  return (
    <ManagementFrame
      header={
        <div className="flex items-center justify-between w-full gap-3 py-1">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {currentInfo.title}
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                  {total} dự án
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                {currentInfo.desc}
              </p>
            </div>
          </div>

          <div className="management-actions flex items-center gap-2 shrink-0">
            {selectedIds.length > 0 && (
              <>
                {selectedIds.length === 1 ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Pencil}
                      onClick={() => handleStartEdit(selectedProject)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      title="Chỉnh sửa thông tin dự án, thời hạn, người quản trị"
                    >
                      Sửa thông tin
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={ExternalLink}
                      onClick={() => navigate(`/app/tasks?projectId=${selectedProject?.id}`)}
                      className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      Xem việc
                    </Button>
                    {selectedProject?.status === 'archived' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={ArchiveRestore}
                        onClick={() => handleRestoreProject(selectedProject)}
                        className="text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        Mở lại
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={FolderArchive}
                        onClick={() => handleArchiveProject(selectedProject)}
                        className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        Lưu trữ
                      </Button>
                    )}
                    {canDeleteProject(selectedProject) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Trash2}
                        onClick={() => handleDeleteProject(selectedProject)}
                        className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Xóa
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        icon={Trash2}
                        title="Chỉ Quản lý dự án hoặc Ban Giám Đốc mới có thẩm quyền xóa"
                        className="opacity-40 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800"
                      >
                        Không thể xóa
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {activeTab === 'archived' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={ArchiveRestore}
                        onClick={handleBulkRestore}
                        className="text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        Mở lại ({selectedIds.length})
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={FolderArchive}
                        onClick={handleBulkArchive}
                        className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        Lưu trữ ({selectedIds.length})
                      </Button>
                    )}
                    {projects.filter((p) => selectedIds.includes(p.id)).every(canDeleteProject) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Trash2}
                        onClick={handleBulkDelete}
                        className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Xóa ({selectedIds.length})
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        icon={Trash2}
                        title="Một hoặc nhiều dự án đã chọn bạn không có thẩm quyền xóa"
                        className="opacity-40 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800"
                      >
                        Không thể xóa
                      </Button>
                    )}
                  </>
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

            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={loadProjects}
            >
              Làm mới
            </Button>
            {canCreateProject && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={handleStartCreate}
              >
                Tạo dự án mới
              </Button>
            )}
          </div>
        </div>
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
              placeholder="Tìm mã dự án, tên dự án, PM…"
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
            className="w-44 font-medium text-xs"
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả phòng ban' },
              { value: 'Phòng ban Quản trị ERP & CNTT', label: 'Quản trị ERP & CNTT' },
              { value: 'Khối Sản xuất In Offset & Flexo', label: 'Sản xuất In Offset & Flexo' },
              { value: 'Khối Sản xuất Sóng & Thành phẩm', label: 'Sản xuất Sóng & Thành phẩm' },
              { value: 'Phòng Quản lý Chất lượng (QA/QC)', label: 'Quản lý chất lượng (QA/QC)' },
              { value: 'Phòng R&D & Thiết kế Cấu trúc Bao bì', label: 'R&D & Thiết kế Bao bì' },
              { value: 'Khối Cung ứng & Logistics', label: 'Cung ứng & Logistics' },
              { value: 'Kỹ thuật & Bảo trì', label: 'Kỹ thuật & Bảo trì' },
            ]}
          />

          {(search || deptFilter) && (
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
          title="Danh mục dự án"
          totalCount={total}
          selectedCount={selectedIds.length}
          unit="dự án"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <VirtualDataTable
        columns={PROJECT_COLUMNS}
        rows={pageItems}
        loading={loading}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={(row) => handleStartEdit(row)}
        renderCell={renderCell}
        preferenceKey="etpms-projects-table"
        page={page}
        pageSize={pageSize}
        emptyMessage="Chưa có dự án nào phù hợp bộ lọc."
      />
    </ManagementFrame>
  );
}
