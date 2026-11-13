import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams, useBlocker, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Layers,
  FolderArchive,
  Paperclip,
  Plus,
  Trash2,
  RotateCcw,
  CheckCheck,
  Zap,
  Building2,
  Save,
  Users,
  Edit3,
  FileText,
  CheckSquare,
  Flag,
  Calendar,
  Clock,
  User,
  AlertCircle,
  X,
  ChevronDown,
  Search,
} from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import ClickUpDatePicker from '../../../shared/ui/ClickUpDatePicker';
import Modal from '../../../shared/ui/Modal';
import { notify } from '../../../shared/lib/notify';
import { useAuth } from '../../../shared/hooks/useAuth';
import { taskService } from '../services/taskService';
import TaskChecklistTable, { padToDefaultRows, DEFAULT_ROW_COUNT } from '../components/TaskChecklistTable';
import TaskAttachmentsTab from '../components/TaskAttachmentsTab';
import { findDepartmentBoss } from '../utils/departmentBoss';

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

const PRIORITIES = [
  { id: 'urgent', label: 'Khẩn cấp', flagColor: 'text-rose-600', dot: 'bg-rose-500', bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
  { id: 'high', label: 'Ưu tiên cao', flagColor: 'text-amber-500', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
  { id: 'medium', label: 'Bình thường', flagColor: 'text-blue-500', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800' },
  { id: 'low', label: 'Thấp', flagColor: 'text-slate-400', dot: 'bg-slate-400', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
];

const STATUSES = [
  { id: 'todo', label: 'Chưa bắt đầu (TO DO)' },
  { id: 'in_progress', label: 'Đang thực hiện (IN PROGRESS)' },
  { id: 'review', label: 'Chờ duyệt / Nghiệm thu (IN REVIEW)' },
  { id: 'done', label: 'Đã hoàn thành (DONE)' },
];

const MIN_SIDEBAR_WIDTH = 340;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 480;

export default function CreateTaskPage({ taskId: propTaskId, onBack, onSuccess, initialLevel = 'department', mode: propMode }) {
  const { seq } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  const editTaskId = propTaskId || seq || searchParams.get('id') || searchParams.get('taskId');
  const isEditMode = propMode === 'edit' || location.pathname.endsWith('/edit') || Boolean(editTaskId);

  const [loadingEdit, setLoadingEdit] = useState(false);
  const [taskCode, setTaskCode] = useState('');
  const [actualTaskId, setActualTaskId] = useState(editTaskId);

  const isMyTasksSubmodule = location.pathname.startsWith('/app/tasks/my');
  const isDelegatedSubmodule = location.pathname.startsWith('/app/tasks/delegated');
  const paramDueDate = searchParams.get('dueDate') || searchParams.get('date') || '';
  const paramIsPersonal = isMyTasksSubmodule || searchParams.get('isPersonal') === 'true' || searchParams.get('filter') === 'my';
  const returnUrl = searchParams.get('returnUrl') || '';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (returnUrl) {
      navigate(returnUrl);
    } else if (isMyTasksSubmodule) {
      navigate('/app/tasks/my');
    } else if (isDelegatedSubmodule) {
      navigate('/app/tasks/delegated');
    } else {
      navigate('/app/tasks');
    }
  };

  const isPersonal = paramIsPersonal;

  // ══════════════════════════════════════════════════════════════
  // THÔNG TIN ĐIỀU PHỐI (MASTER SIDEBAR) - ĐÃ ĐƯỢC TỐI ƯU GỌN GÀNG
  // ══════════════════════════════════════════════════════════════
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState(() => currentUser?.department || 'Kỹ thuật');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => paramDueDate);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [description, setDescription] = useState('');

  // ══════════════════════════════════════════════════════════════
  // DỮ LIỆU CANVAS BÊN PHẢI (CHECKLIST TABLE & ATTACHMENTS)
  // ══════════════════════════════════════════════════════════════
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [checklistRows, setChecklistRows] = useState(() =>
    padToDefaultRows([], '', currentUser?.name || 'Tôi thực hiện', DEFAULT_ROW_COUNT)
  );
  const [selectedChecklistIds, setSelectedChecklistIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'attachments'
  const [attachments, setAttachments] = useState([]);
  const attachmentsRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // KÉO DÃN RỘNG CỘT THÔNG TIN MASTER (RESIZABLE SIDEBAR)
  // ══════════════════════════════════════════════════════════════
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('task_create_sidebar_width');
      const parsed = parseInt(saved, 10);
      return Number.isFinite(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH
        ? parsed
        : DEFAULT_SIDEBAR_WIDTH;
    } catch {
      return DEFAULT_SIDEBAR_WIDTH;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ startX: 0, startWidth: DEFAULT_SIDEBAR_WIDTH });

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    dragStartRef.current = {
      startX: e.clientX,
      startWidth: sidebarWidth,
    };
    setIsResizing(true);
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const delta = e.clientX - dragStartRef.current.startX;
      const nextWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, Math.round(dragStartRef.current.startWidth + delta))
      );
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    try {
      localStorage.setItem('task_create_sidebar_width', String(sidebarWidth));
    } catch {
      // ignore
    }
  }, [sidebarWidth]);

  // Load Projects & Partners
  useEffect(() => {
    taskService.getProjects().then(list => setProjects(list || []));
    taskService.getPartners().then(list => setPartners(list || []));
  }, []);

  // Load Task for Edit
  useEffect(() => {
    if (isEditMode && editTaskId) {
      setLoadingEdit(true);

      const applyDetail = (t, detail) => {
        if (!t) return;
        setActualTaskId(t.id || editTaskId);
        setTaskCode(
          t.code
            ? String(t.code).startsWith('TSK-')
              ? t.code
              : `TSK-${t.code}`
            : String(editTaskId).startsWith('TSK-')
            ? editTaskId
            : `TSK-${editTaskId}`
        );
        setTitle(t.title || '');
        setDescription(t.description || '');
        if (t.department) setDepartment(t.department);
        if (t.priority) setPriority(t.priority);
        if (t.status) setStatus(t.status);
        if (t.projectId) setProjectId(t.projectId);
        if (t.assigneeId) setAssigneeId(t.assigneeId);
        setSupervisorId(t.supervisorId || t.reviewerId || '');
        if (t.startDate) setStartDate(String(t.startDate).slice(0, 10));
        if (t.dueDate) setDueDate(String(t.dueDate).slice(0, 10));
        if (t.estimatedHours) setEstimatedHours(String(t.estimatedHours));
        if (Array.isArray(detail?.checklist) && detail.checklist.length > 0) {
          setChecklistRows(
            padToDefaultRows(
              detail.checklist,
              t.supervisorName || '',
              t.assigneeName || 'Tôi thực hiện',
              DEFAULT_ROW_COUNT
            )
          );
        }
        if (Array.isArray(detail?.documents)) {
          setAttachments(detail.documents);
        }
      };

      taskService
        .getTaskDetail(editTaskId)
        .then(async (detail) => {
          if (detail?.task) {
            applyDetail(detail.task, detail);
          } else {
            const allTasks = await taskService.listTasks();
            const cleanId = String(editTaskId).replace(/^TSK-/, '');
            const found = (allTasks || []).find(
              (t) =>
                String(t.id) === String(editTaskId) ||
                String(t.code) === String(editTaskId) ||
                String(t.code) === cleanId ||
                String(t.id) === cleanId ||
                String(t.IdSeq) === String(editTaskId)
            );
            if (found) {
              const realDetail = await taskService.getTaskDetail(found.id);
              applyDetail(found, realDetail || { checklist: [], documents: [] });
            }
          }
        })
        .catch((err) => {
          console.error('Error loading task for edit:', err);
        })
        .finally(() => {
          setLoadingEdit(false);
        });
    }
  }, [isEditMode, editTaskId]);

  // Load Employees
  useEffect(() => {
    taskService.getEmployees().then(list => {
      const arr = list || [];
      setEmployees(arr);
      if (!isEditMode) {
        const myEmp = arr.find(e =>
          (currentUser?.id && (e.userId === currentUser.id || String(e.id) === String(currentUser.id))) ||
          (currentUser?.email && e.email === currentUser.email) ||
          (currentUser?.name && (e.fullName === currentUser.name || e.name === currentUser.name))
        );
        if (myEmp) {
          if (myEmp.department) setDepartment(myEmp.department);
          setAssigneeId(myEmp.userId || String(myEmp.id));
        } else if (currentUser?.department) {
          setDepartment(currentUser.department);
        }
        const myName = myEmp?.fullName || myEmp?.name || currentUser?.name || 'Tôi thực hiện';
        setChecklistRows(prev => padToDefaultRows(prev.filter(r => r.title?.trim()), '', myName, DEFAULT_ROW_COUNT));
      }
    });
  }, [currentUser, isEditMode]);

  // Dirty state checking
  const isDirty = useMemo(() => {
    if (submitting) return false;
    if (title.trim() !== '') return true;
    if (description.trim() !== '') return true;
    if (projectId !== '') return true;
    if (dueDate !== paramDueDate && dueDate !== '') return true;
    if (estimatedHours !== '') return true;
    if (attachments.length > 0) return true;
    if (
      checklistRows.length > 0 &&
      checklistRows.some(
        r =>
          (r.workingTag === 'A' || r.workingTag === 'U' || r.workingTag === 'D') &&
          (r.title?.trim() || r.standard?.trim() || r.note?.trim() || r.isCompleted)
      )
    ) {
      return true;
    }
    return false;
  }, [submitting, title, description, projectId, dueDate, paramDueDate, estimatedHours, attachments, checklistRows]);

  const allowLeaveRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (allowLeaveRef.current) return false;
      return (
        isDirty &&
        !submitting &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search)
      );
    }
  );

  const isBlocked = (blocker.state === 'blocked' || showExitConfirm) && !allowLeaveRef.current;

  const handleAttemptBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      allowLeaveRef.current = true;
      handleBack();
    }
  };

  const handleCancelLeave = () => {
    setShowExitConfirm(false);
    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
  };

  const handleConfirmLeave = () => {
    setShowExitConfirm(false);
    allowLeaveRef.current = true;
    if (blocker.state === 'blocked') {
      blocker.proceed?.();
    } else {
      handleBack();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, submitting]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isBlocked) {
        handleAttemptBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isBlocked]);

  // Thêm 1 dòng mới vào checklist
  const handleAddChecklistRow = () => {
    const creatorName = currentUser?.name || currentUser?.fullName || 'Tôi phụ trách';
    const assigneeName = employees.find(e => (e.userId || String(e.id)) === String(assigneeId))?.fullName || creatorName;
    const supervisorName = employees.find(e => (e.userId || String(e.id)) === String(supervisorId))?.fullName || '';
    const newRow = {
      id: `grid-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: '',
      standard: '',
      executor: assigneeName,
      inspector: supervisorName,
      result: '',
      note: '',
      isCompleted: false,
      workingTag: 'A',
      _isNew: true,
      _origTag: '',
    };
    setChecklistRows(prev => [...prev, newRow]);
    notify.success('Đã thêm 1 dòng mới vào danh mục việc cần làm.');
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên công việc chính (Master Title).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const taskPayload = {
        title: title.trim(),
        description: description.trim(),
        department: (department || 'Kỹ thuật').trim(),
        projectId: projectId ? projectId : (isEditMode ? 'CLEAR' : null),
        assigneeId: assigneeId ? assigneeId : (isEditMode ? 'CLEAR' : null),
        supervisorId: supervisorId ? supervisorId : (isEditMode ? 'CLEAR' : null),
        reviewerId: supervisorId ? supervisorId : (isEditMode ? 'CLEAR' : null),
        priority: priority || 'medium',
        status: status || 'todo',
        startDate: startDate || null,
        dueDate: dueDate || null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
      };

      if (isEditMode && (actualTaskId || editTaskId)) {
        const targetId = actualTaskId || editTaskId;
        await taskService.updateTask({ ...taskPayload, id: targetId });

        // Update detail items
        const validRows = checklistRows.filter((r) => r.title?.trim() && r.workingTag !== 'D');
        for (const row of validRows) {
          if (
            !row.id ||
            String(row.id).startsWith('grid-row-') ||
            String(row.id).startsWith('item-') ||
            row._isNew
          ) {
            let formatted = row.title
              .replace(/\s*\(@Làm:[^)]*\)/gi, '')
              .replace(/\s*\(@Duyệt:[^)]*\)/gi, '')
              .trim();
            const added = await taskService.addChecklistItem(targetId, formatted);
            if (added?.id && row.isCompleted) {
              await taskService.toggleChecklistItem(added.id, true);
            }
          } else {
            await taskService.toggleChecklistItem(row.id, row.isCompleted);
          }
        }

        notify.success(`Đã cập nhật công việc "${title.trim()}" thành công!`);
        allowLeaveRef.current = true;
        if (onSuccess) onSuccess();
        handleBack();
        return;
      }

      // Create Master Task
      const created = await taskService.createTask(taskPayload);
      const taskId = created?.id || created?.data?.id;

      // Create Detail Checklist Items
      const validRows = checklistRows.filter(r => r.title?.trim() && r.workingTag !== 'D');
      if (taskId && validRows.length > 0) {
        for (const row of validRows) {
          try {
            let formatted = row.title
              .replace(/\s*\(@Làm:[^)]*\)/gi, '')
              .replace(/\s*\(@Duyệt:[^)]*\)/gi, '')
              .trim();
            const createdItem = await taskService.addChecklistItem(taskId, formatted);
            if (createdItem?.id && row.isCompleted) {
              await taskService.toggleChecklistItem(createdItem.id, true);
            }
          } catch (errItem) {
            console.error('Error adding detail row:', errItem);
          }
        }
      }

      // Attach documents
      if (taskId && attachments.length > 0) {
        for (const att of attachments) {
          try {
            await taskService.createDocument({
              name: att.name,
              code: `DOC-${Date.now().toString().slice(-4)}`,
              type: att.type || 'FILE',
              size: att.sizeFormatted || `${((att.size || 0) / 1024).toFixed(1)} KB`,
              taskId: taskId,
              project: projects.find(p => String(p.id) === String(projectId))?.name || 'Công việc độc lập',
              owner: employees.find(emp => (emp.userId || String(emp.id)) === String(assigneeId))?.fullName || currentUser?.name || 'Người giao việc',
              status: 'active',
              scope: 'task',
            });
          } catch (errDoc) {
            console.error('Error attaching doc:', errDoc);
          }
        }
      }

      notify.success(`Đã đăng ký công việc "${title.trim()}" thành công.`);
      allowLeaveRef.current = true;
      if (onSuccess) onSuccess();
      handleBack();
    } catch (err) {
      setError(err?.message || 'Lỗi khi lưu công việc vào hệ thống.');
    } finally {
      setSubmitting(false);
    }
  };

  const validDetailCount = checklistRows.filter(r => r.title?.trim() && r.workingTag !== 'D').length;
  const completedDetailCount = checklistRows.filter(r => r.title?.trim() && r.workingTag !== 'D' && r.isCompleted).length;

  return (
    <>
      <ManagementFrame
        className="h-full w-full"
        scrollableContent={false}
        header={
          <div className="flex items-center justify-between w-full gap-3 py-1.5 text-xs flex-nowrap min-w-0">
            {/* Left: Back button & Breadcrumb Title */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
              <Button
                size="sm"
                variant="ghost"
                icon={ArrowLeft}
                disabled={submitting}
                onClick={handleAttemptBack}
                title="Quay lại danh sách công việc"
                className="!h-7 !px-2 text-slate-500 hover:text-slate-900 shrink-0"
              >
                Quay lại
              </Button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0 truncate">
                <span
                  className="font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[280px] lg:max-w-[420px]"
                  title={title || editTaskId}
                >
                  {isEditMode
                    ? `${taskCode ? `[${taskCode}] ` : ''}${title || editTaskId}`
                    : 'Đăng ký công việc mới'}
                </span>
                <span className="shrink-0">/</span>
                <span className="shrink-0">Phòng {department}</span>
                {projectId && (
                  <>
                    <span className="shrink-0">/</span>
                    <span className="truncate max-w-[160px] font-medium text-slate-700 dark:text-slate-300">
                      {projects.find((p) => String(p.id) === String(projectId))?.name || 'Dự án'}
                    </span>
                  </>
                )}
                {isDirty && (
                  <>
                    <span className="shrink-0">·</span>
                    <span className="text-amber-600 dark:text-amber-400 italic font-medium shrink-0">
                      (Có thay đổi chưa lưu)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={handleAttemptBack}
                className="!h-7 !px-3"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Save}
                disabled={submitting || !title.trim()}
                onClick={handleSubmit}
                className="!h-7 !px-3.5 font-bold"
              >
                {submitting ? 'Đang lưu...' : (isEditMode ? 'Lưu thay đổi' : 'Lưu công việc')}
              </Button>
            </div>
          </div>
        }
      >
        {error && (
          <div className="px-5 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── 2-COLUMN SPLIT LAYOUT (MASTER SIDEBAR KÉO DÃN & DETAIL DATA CANVAS) ─── */}
        <div className="flex-1 min-h-0 h-full flex flex-col lg:flex-row bg-white dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 relative">
          
          {/* ─── CỘT 1 (TRÁI): THÔNG TIN ĐIỀU PHỐI MASTER (KÉO DÃN RỘNG RA ĐỂ ĐĂNG KÝ CHO ĐẸP) ─── */}
          <aside
            style={{ width: `${sidebarWidth}px` }}
            className="shrink-0 h-full border-b lg:border-b-0 border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto no-scrollbar-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4 bg-slate-50/40 dark:bg-slate-900/20"
          >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
                  Thông tin công việc (Master)
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {/* Tên công việc chính */}
                  <div className="pt-3 pb-2.5">
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                      Tên công việc / Yêu cầu chính <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      disabled={submitting}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="VD: Nâng cấp phân hệ quản trị và tự động hóa quy trình..."
                      className="w-full h-8 px-0 border-0 bg-transparent text-sm font-bold text-emerald-700 dark:text-emerald-400 outline-none ring-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>

                  {/* Phòng ban chủ trì */}
                  <div className="py-2.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Phòng ban chủ trì <span className="text-rose-500">*</span>
                    </label>
                    <div className="h-8 flex items-center">
                      <Select
                        size="sm"
                        disabled={submitting}
                        value={department}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          setDepartment(val);
                        }}
                        options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
                        className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                      />
                    </div>
                  </div>

                  {/* Thuộc dự án */}
                  <div className="py-2.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Thuộc dự án
                    </label>
                    <div className="h-8 flex items-center">
                      <Select
                        size="sm"
                        disabled={submitting}
                        value={projectId}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          setProjectId(val);
                        }}
                        options={[
                          { value: '', label: '-- Không thuộc dự án --' },
                          ...projects.map(p => ({ value: String(p.id), label: `[${p.code}] ${p.name}` })),
                        ]}
                        className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                      />
                    </div>
                  </div>

                  {/* Người thực hiện chính */}
                  <div className="py-2.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Người thực hiện chính <span className="text-rose-500">*</span>
                    </label>
                    <div className="h-8 flex items-center">
                      <Select
                        size="sm"
                        disabled={submitting}
                        value={assigneeId}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          setAssigneeId(val);
                        }}
                        options={[
                          { value: '', label: '-- Chọn nhân sự thực hiện --' },
                          ...employees.map(emp => ({
                            value: emp.userId || String(emp.id),
                            label: `${emp.fullName || emp.name} (${emp.position ? `${emp.position} · ` : ''}${emp.department || ''})`,
                          })),
                        ]}
                        className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                      />
                    </div>
                  </div>

                  {/* Người duyệt kết quả (Mặc định bỏ trống không cần đăng ký) */}
                  <div className="py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Người duyệt kết quả
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">
                        (Mặc định bỏ trống)
                      </span>
                    </div>
                    <div className="h-8 flex items-center">
                      <Select
                        size="sm"
                        disabled={submitting}
                        value={supervisorId}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          setSupervisorId(val);
                        }}
                        options={[
                          { value: '', label: '-- Không cần người duyệt (Bỏ trống) --' },
                          ...employees.map(emp => ({
                            value: emp.userId || String(emp.id),
                            label: `${emp.fullName || emp.name} (${emp.position ? `${emp.position} · ` : ''}${emp.department || ''})`,
                          })),
                        ]}
                        className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                      />
                    </div>
                  </div>

                  {/* Thời gian: Ngày làm & Hạn chót */}
                  <div className="py-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Ngày bắt đầu làm
                        </label>
                        <ClickUpDatePicker
                          mode="input"
                          tabLabel="Ngày bắt đầu"
                          disabled={submitting}
                          value={startDate}
                          placeholder="Chọn ngày bắt đầu..."
                          onChange={val => setStartDate(val)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Hạn chót / Deadline
                        </label>
                        <ClickUpDatePicker
                          mode="input"
                          tabLabel="Hạn chót"
                          disabled={submitting}
                          value={dueDate}
                          placeholder="Chọn hạn chót..."
                          onChange={val => setDueDate(val)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mức ưu tiên */}
                  <div className="py-2.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Mức ưu tiên
                    </label>
                    <div className="h-8 flex items-center">
                      <Select
                        size="sm"
                        disabled={submitting}
                        value={priority}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          setPriority(val);
                        }}
                        options={[
                          { value: 'urgent', label: 'Khẩn cấp' },
                          { value: 'high', label: 'Cao' },
                          { value: 'medium', label: 'Bình thường' },
                          { value: 'low', label: 'Thấp' },
                        ]}
                        className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                      />
                    </div>
                  </div>

                  {/* Trạng thái */}
                  <div className="py-2.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Trạng thái
                    </label>
                    <div className="h-8 flex items-center">
                      <Select
                        size="sm"
                        disabled={submitting}
                        value={status}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          setStatus(val);
                        }}
                        options={STATUSES.map(s => ({ value: s.id, label: s.label }))}
                        className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                      />
                    </div>
                  </div>

                  {/* Mô tả yêu cầu / Hướng dẫn */}
                  <div className="py-2.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Mô tả yêu cầu / Hướng dẫn
                    </label>
                    <textarea
                      rows={4}
                      disabled={submitting}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Mô tả tóm tắt bối cảnh, kết quả mong đợi, yêu cầu kỹ thuật..."
                      className="w-full px-0 py-1.5 rounded-none border-0 border-b border-slate-300 dark:border-slate-700 bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-emerald-600 dark:focus:border-emerald-500 resize-none leading-relaxed placeholder:font-normal placeholder:text-slate-400 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </aside>

            {/* ─── THANH KÉO DÃN ĐỘ RỘNG (RESIZABLE SPLITTER CHO CỘT MASTER) ─── */}
            <div
              onMouseDown={handleResizeMouseDown}
              title="Kéo thả sang trái / phải để điều chỉnh độ rộng cột thông tin Master"
              className={`hidden lg:flex items-center justify-center w-2 hover:w-2.5 hover:bg-emerald-500/40 cursor-col-resize select-none transition-all z-20 group relative border-r border-slate-200 dark:border-slate-800 shrink-0 ${
                isResizing ? 'bg-emerald-600 w-2.5' : 'bg-transparent'
              }`}
            >
              <div className="w-0.5 h-10 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-600 transition-colors" />
            </div>

            {/* ─── CỘT 2 (PHẢI): DATA CANVAS (CHECKLIST TABLE & ATTACHMENTS) ─── */}
            <main className="flex-1 flex flex-col min-w-0 min-h-0 h-full w-full overflow-hidden bg-white dark:bg-slate-950">
              {/* Tab Navigation Bar (Flat, Edge-to-Edge) */}
              <div className="h-10 min-h-[40px] px-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-stretch justify-between shrink-0 select-none">
                <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => setActiveTab('checklist')}
                    className={`h-full px-5 flex items-center gap-2.5 text-xs font-semibold border-r border-slate-200 dark:border-slate-800 transition cursor-pointer ${
                      activeTab === 'checklist'
                        ? 'bg-white dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 border-b-2 border-b-emerald-600 -mb-px z-10'
                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>1. Danh mục các đầu việc cần làm (Checklist)</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                        validDetailCount > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {validDetailCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('attachments')}
                    className={`h-full px-5 flex items-center gap-2.5 text-xs font-semibold border-r border-slate-200 dark:border-slate-800 transition cursor-pointer ${
                      activeTab === 'attachments'
                        ? 'bg-white dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 border-b-2 border-b-emerald-600 -mb-px z-10'
                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <FolderArchive size={14} />
                    <span>2. Tài liệu đính kèm</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                        attachments.length > 0
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {attachments.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Canvas Content */}
              <div className="flex-1 min-h-0 min-w-0 h-full w-full overflow-hidden flex flex-col">
                {activeTab === 'checklist' ? (
                  <TaskChecklistTable
                    isCreate={true}
                    isPersonal={isPersonal}
                    items={checklistRows}
                    onChange={setChecklistRows}
                    selectedRowIds={selectedChecklistIds}
                    onSelectRowIds={setSelectedChecklistIds}
                    onAddRow={handleAddChecklistRow}
                    department={department}
                    defaultExecutor={employees.find(e => (e.userId || String(e.id)) === String(assigneeId))?.fullName || currentUser?.name || 'Tôi thực hiện'}
                    defaultAssignee={employees.find(e => (e.userId || String(e.id)) === String(supervisorId))?.fullName || ''}
                  />
                ) : (
                  <TaskAttachmentsTab
                    ref={attachmentsRef}
                    attachments={attachments}
                    onChange={setAttachments}
                    disabled={submitting}
                  />
                )}
              </div>
            </main>
          </div>
      </ManagementFrame>

      {/* Confirmation Leave Modal */}
      <Modal
        open={isBlocked}
        onClose={handleCancelLeave}
        title="Thay đổi chưa được lưu"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelLeave}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleConfirmLeave}
            >
              Rời khỏi trang
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Bạn đang có các nội dung công việc và tiêu chí kiểm tra chưa được lưu. Nếu rời khỏi trang bây giờ, toàn bộ thông tin bạn vừa nhập sẽ bị mất. Bạn có chắc chắn muốn rời đi?
        </p>
      </Modal>
    </>
  );
}