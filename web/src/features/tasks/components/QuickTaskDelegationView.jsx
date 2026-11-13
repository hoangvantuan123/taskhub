import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Check,
  Send,
  Building2,
  Calendar,
  AlertCircle,
  RotateCcw,
  Save,
} from 'lucide-react';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import ClickUpDatePicker from '../../../shared/ui/ClickUpDatePicker';
import { notify } from '../../../shared/lib/notify';
import { useAuth } from '../../../shared/hooks/useAuth';
import { taskService } from '../services/taskService';
import { findDepartmentBoss } from '../utils/departmentBoss';

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Khẩn cấp' },
  { value: 'high', label: 'Cao' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'low', label: 'Thấp' },
];

function WorkingTagBadge({ tag }) {
  if (!tag) return <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none">-</span>;
  if (tag === 'A') {
    return <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 select-none" title="Tag A: Thêm mới">A</span>;
  }
  if (tag === 'U') {
    return <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 select-none" title="Tag U: Cập nhật">U</span>;
  }
  if (tag === 'D') {
    return <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 line-through select-none" title="Tag D: Xóa">D</span>;
  }
  return <span className="font-mono font-semibold text-xs text-slate-500 dark:text-slate-400 select-none" title="Tag Q: Đã lưu">Q</span>;
}

const QuickTaskDelegationView = forwardRef(function QuickTaskDelegationView({
  onSuccess,
  onCancel,
  initialDueDate = '',
  initialIsPersonal = false,
  hideActions = false,
  onStateChange,
}, ref) {
  const { currentUser } = useAuth();

  // Shared Configuration State - Auto-linked to currentUser's department
  const [department, setDepartment] = useState(() => currentUser?.department || 'Phòng ban Quản trị ERP & CNTT');

  useEffect(() => {
    if (currentUser?.department && currentUser.department !== department) {
      setDepartment(currentUser.department);
    }
  }, [currentUser?.department]);
  const [isPersonal, setIsPersonal] = useState(initialIsPersonal);
  const [projectId, setProjectId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [generalDirective, setGeneralDirective] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [defaultDueDate, setDefaultDueDate] = useState(() => {
    if (initialDueDate) return initialDueDate;
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [defaultPriority, setDefaultPriority] = useState('medium');

  // Master Data
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState({ current: 0, total: 0 });

  // Selected row IDs for batch actions (Checkbox)
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  // Multi-Task Items State (Bảng danh sách các việc cần giao)
  const [items, setItems] = useState([
    {
      id: `quick-row-1`,
      title: '',
      standard: '',
      assigneeId: '',
      supervisorId: '',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: defaultDueDate,
      priority: defaultPriority,
      status: 'todo',
      note: '',
      workingTag: 'A',
    },
    {
      id: `quick-row-2`,
      title: '',
      standard: '',
      assigneeId: '',
      supervisorId: '',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: defaultDueDate,
      priority: defaultPriority,
      status: 'todo',
      note: '',
      workingTag: 'A',
    },
    {
      id: `quick-row-3`,
      title: '',
      standard: '',
      assigneeId: '',
      supervisorId: '',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: defaultDueDate,
      priority: defaultPriority,
      status: 'todo',
      note: '',
      workingTag: 'A',
    },
    {
      id: `quick-row-4`,
      title: '',
      standard: '',
      assigneeId: '',
      supervisorId: '',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: defaultDueDate,
      priority: defaultPriority,
      status: 'todo',
      note: '',
      workingTag: 'A',
    },
  ]);

  useEffect(() => {
    taskService.getProjects().then(list => setProjects(list || []));
  }, []);

  useEffect(() => {
    // Lọc theo đúng bộ phận phòng ban của user hiện tại khi gọi API để tránh load thừa dữ liệu
    const userDept = currentUser?.department || department;
    const filter = userDept ? { department: userDept } : {};

    taskService.getEmployees(filter).then(list => {
      const arr = list || [];
      setEmployees(arr);

      // Tự động tìm và chọn Sếp của phòng ban mình làm Người duyệt kết quả
      const myEmp = arr.find(e =>
        (currentUser?.id && (e.userId === currentUser.id || String(e.id) === String(currentUser.id))) ||
        (currentUser?.email && e.email === currentUser.email) ||
        (currentUser?.name && (e.fullName === currentUser.name || e.name === currentUser.name))
      );
      const effectiveDept = myEmp?.department || userDept;
      const deptBoss = findDepartmentBoss(arr, effectiveDept, currentUser?.id);
      if (deptBoss) {
        const bossId = deptBoss.userId || String(deptBoss.id);
        setSupervisorId(bossId);
        setItems(prev => prev.map(it => ({ ...it, supervisorId: it.supervisorId || bossId })));
      }

      // If isPersonal, auto assign current user to empty rows
      if (initialIsPersonal) {
        if (myEmp) {
          const empId = myEmp.userId || String(myEmp.id);
          setItems(prev => prev.map(it => ({ ...it, assigneeId: it.assigneeId || empId })));
        }
      }
    });
  }, [currentUser, department, initialIsPersonal]);

  const assigneeOptions = useMemo(() => {
    const userDept = (currentUser?.department || department || '').trim().toLowerCase();
    const filteredEmployees = employees.filter(emp => {
      if (!userDept) return true;
      const eDept = (emp.department || '').trim().toLowerCase();
      if (!eDept) return true;
      if (eDept === userDept) return true;
      if (userDept.includes('erp') && (eDept.includes('erp') || eDept.includes('cntt'))) return true;
      if (userDept.includes('cntt') && (eDept.includes('cntt') || eDept.includes('it'))) return true;
      return false;
    });

    return filteredEmployees.map(emp => ({
      value: emp.userId || String(emp.id),
      label: `${emp.fullName || emp.name} (${emp.code || emp.department || 'NV'})`,
      badge: emp.department,
    }));
  }, [employees, currentUser?.department, department]);

  const supervisorOptions = useMemo(() => {
    return employees.map(emp => ({
      value: emp.userId || String(emp.id),
      label: `${emp.fullName || emp.name} (${emp.code || emp.department || 'NV'})`,
      badge: emp.department,
    }));
  }, [employees]);

  // Xử lý chuyển đổi loại công việc riêng cá nhân
  const handleTogglePersonal = (checked) => {
    setIsPersonal(checked);
    if (checked) {
      const myEmp = employees.find(e =>
        (currentUser?.id && (e.userId === currentUser.id || String(e.id) === String(currentUser.id))) ||
        (currentUser?.email && e.email === currentUser.email) ||
        (currentUser?.name && (e.fullName === currentUser.name || e.name === currentUser.name))
      );
      if (myEmp) {
        const empId = myEmp.userId || String(myEmp.id);
        setItems(prev => prev.map(it => ({ ...it, assigneeId: it.assigneeId || empId })));
      }
    }
  };

  // Sync default due date change to empty date items
  const handleDefaultDueDateChange = (newDate) => {
    setDefaultDueDate(newDate);
    setItems(prev =>
      prev.map(it => (!it.dueDate || it.dueDate === defaultDueDate ? { ...it, dueDate: newDate } : it))
    );
  };

  // Add more rows
  const handleAddRow = (count = 1) => {
    const newItems = Array.from({ length: count }, (_, idx) => ({
      id: `quick-row-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      standard: '',
      assigneeId: isPersonal
        ? employees.find(e =>
            (currentUser?.id && (e.userId === currentUser.id || String(e.id) === String(currentUser.id))) ||
            (currentUser?.name && (e.fullName === currentUser.name || e.name === currentUser.name))
          )?.userId || ''
        : '',
      supervisorId: supervisorId || '',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: defaultDueDate,
      priority: defaultPriority,
      status: 'todo',
      note: '',
      workingTag: 'A',
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  // Checkbox Selection
  const handleToggleSelectRow = (id) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === items.length && items.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(items.map(r => r.id)));
    }
  };

  // Xóa các dòng được chọn khỏi bảng
  const handleDeleteSelectedRows = () => {
    if (selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    setItems(prev => {
      const remaining = prev.filter(it => !selectedRowIds.has(it.id));
      if (remaining.length === 0) {
        return [
          {
            id: `quick-row-${Date.now()}`,
            title: '',
            standard: '',
            assigneeId: isPersonal
              ? employees.find(e =>
                  (currentUser?.id && (e.userId === currentUser.id || String(e.id) === String(currentUser.id))) ||
                  (currentUser?.name && (e.fullName === currentUser.name || e.name === currentUser.name))
                )?.userId || ''
              : '',
            supervisorId: supervisorId || '',
            startDate: new Date().toISOString().slice(0, 10),
            dueDate: defaultDueDate,
            priority: defaultPriority,
            status: 'todo',
            note: '',
            workingTag: 'A',
          },
        ];
      }
      return remaining;
    });
    setSelectedRowIds(new Set());
    notify.success(`Đã xóa ${count} dòng khỏi bảng.`);
  };

  // Khôi phục các dòng đã đánh dấu xóa
  const handleRestoreSelectedRows = () => {
    setItems(prev =>
      prev.map(it => {
        if (selectedRowIds.has(it.id) && it.workingTag === 'D') {
          return { ...it, workingTag: 'A' };
        }
        return it;
      })
    );
    setSelectedRowIds(new Set());
  };

  // Update item field
  const handleItemChange = (id, field, value) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const nextTag = it.workingTag === 'D' ? 'A' : (it.workingTag || 'A');
          return { ...it, [field]: value, workingTag: nextTag };
        }
        return it;
      })
    );
  };

  // Paste from Excel support
  const handleTablePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData?.getData('Text');
    if (!pastedData || !pastedData.includes('\n')) return;

    e.preventDefault();
    const rows = pastedData.split(/\r\n|\n|\r/).filter(r => r.trim() !== '');
    if (rows.length === 0) return;

    const newRows = rows.map((r, idx) => {
      const cols = r.split('\t');
      return {
        id: `pasted-${Date.now()}-${idx}`,
        title: cols[0]?.trim() || '',
        standard: cols[1]?.trim() || '',
        note: cols[2]?.trim() || '',
        assigneeId: isPersonal
          ? employees.find(e =>
              (currentUser?.id && (e.userId === currentUser.id || String(e.id) === String(currentUser.id))) ||
              (currentUser?.name && (e.fullName === currentUser.name || e.name === currentUser.name))
            )?.userId || ''
          : '',
        supervisorId: supervisorId || '',
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: defaultDueDate,
        priority: defaultPriority,
        status: 'todo',
        workingTag: 'A',
      };
    });

    setItems(prev => [...prev.filter(it => it.title?.trim() !== ''), ...newRows]);
    notify.success(`Đã dán thành công ${newRows.length} đầu việc từ bảng tính.`);
  };

  // Summary Metrics
  const validItems = useMemo(
    () => items.filter(it => it.title?.trim() !== '' && it.workingTag !== 'D'),
    [items]
  );
  const assignedCount = useMemo(
    () => validItems.filter(it => it.assigneeId).length,
    [validItems]
  );
  const uniqueAssignees = useMemo(() => {
    const set = new Set();
    validItems.forEach(it => {
      if (it.assigneeId) set.add(it.assigneeId);
    });
    return set.size;
  }, [validItems]);

  const selectedDCount = useMemo(
    () => items.filter(r => selectedRowIds.has(r.id) && r.workingTag === 'D').length,
    [items, selectedRowIds]
  );

  // Expose methods for Parent Layout Header
  useImperativeHandle(ref, () => ({
    addRow: (count = 1) => handleAddRow(count),
    deleteSelected: () => handleDeleteSelectedRows(),
    restoreSelected: () => handleRestoreSelectedRows(),
    submitAll: () => handleSubmitAll(),
  }));

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        selectedCount: selectedRowIds.size,
        selectedDCount,
        validCount: validItems.length,
        submitting,
        isPersonal,
      });
    }
  }, [selectedRowIds.size, selectedDCount, validItems.length, submitting, isPersonal, onStateChange]);

  // Submit all tasks in batch
  const handleSubmitAll = async () => {
    if (validItems.length === 0) {
      notify.error('Vui lòng nhập ít nhất một nội dung công việc cần giao.');
      return;
    }

    setSubmitting(true);
    setSubmitProgress({ current: 0, total: validItems.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      setSubmitProgress({ current: i + 1, total: validItems.length });

      try {
        const itemTitle = item.title.trim();
        const fullTitle = generalDirective.trim()
          ? (itemTitle && itemTitle !== generalDirective.trim() ? `${generalDirective.trim()} - ${itemTitle}` : generalDirective.trim())
          : itemTitle;

        const payload = {
          title: fullTitle,
          description: generalDirective.trim()
            ? `${generalDirective.trim()}\n\n—\nYêu cầu cụ thể: ${itemTitle}`
            : (item.note ? `Nhiệm vụ: ${itemTitle}\nGhi chú: ${item.note.trim()}` : itemTitle),
          department,
          delegationLevel: 'department',
          isPersonal: Boolean(isPersonal),
          priority: item.priority || defaultPriority,
          status: item.status || 'todo',
          estimatedHours: 8,
        };

        if (projectId) payload.projectId = Number(projectId);
        if (item.assigneeId) payload.assigneeId = item.assigneeId;
        const effectiveSupervisor = item.supervisorId || supervisorId;
        if (effectiveSupervisor) payload.supervisorId = effectiveSupervisor;
        if (item.startDate) payload.startDate = new Date(item.startDate).toISOString();
        else if (startDate) payload.startDate = new Date(startDate).toISOString();
        if (item.dueDate) payload.dueDate = new Date(item.dueDate).toISOString();

        const created = await taskService.createTask(payload);
        const newTaskId = created?.id || created?.data?.id || created?.task?.id;
        if (newTaskId && itemTitle) {
          try {
            const formattedChecklistTitle = item.standard?.trim()
              ? `${itemTitle} [${item.standard.trim()}]`
              : itemTitle;
            await taskService.addChecklistItem(newTaskId, formattedChecklistTitle);
          } catch {}
        }
        successCount++;
      } catch (err) {
        console.error('Failed to create task batch item:', item.title, err);
        failCount++;
      }
    }

    setSubmitting(false);

    if (successCount > 0) {
      notify.success(
        isPersonal
          ? `Đã lưu thành công ${successCount} công việc cá nhân!`
          : `Đã lưu và giao thành công ${successCount} công việc!`
      );
      if (onSuccess) onSuccess();
    } else {
      notify.error('Có lỗi xảy ra khi khởi tạo công việc. Vui lòng kiểm tra lại.');
    }
  };

  return (
    /* 2-Column Split Layout Edge-to-Edge (Strict UI Design Standard In-Screen Workspace) */
    <div className="flex-1 min-h-0 h-full grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">
      
      {/* ─── CỘT 1 (TRÁI): THÔNG TIN ĐIỀU PHỐI GIAO VIỆC (360px Flat) ─── */}
      <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-5 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/20">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span>Thông tin giao việc chung</span>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {/* Chủ đề / Yêu cầu chỉ đạo chung */}
            <div className="py-2.5 first:pt-0">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Chủ đề / Yêu cầu chỉ đạo chung
              </label>
              <input
                type="text"
                disabled={submitting}
                value={generalDirective}
                onChange={e => setGeneralDirective(e.target.value)}
                placeholder="VD: Kế hoạch tuần 46, Triển khai bảo dưỡng..."
                className="w-full h-8 px-0 border-0 bg-transparent text-sm font-semibold text-slate-900 dark:text-white outline-none ring-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            {/* Người duyệt kết quả */}
            <div className="py-2.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Người duyệt kết quả
              </label>
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
                    { value: '', label: '-- Chọn người duyệt --' },
                    ...employees.map(emp => ({
                      value: emp.userId || String(emp.id),
                      label: `${emp.fullName || emp.name} (${emp.position ? `${emp.position} · ` : ''}${emp.department || ''})`,
                    })),
                  ]}
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

            {/* Thời gian: Ngày làm & Hạn chót mặc định */}
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
                    Hạn chót mặc định
                  </label>
                  <ClickUpDatePicker
                    mode="input"
                    tabLabel="Hạn chót"
                    disabled={submitting}
                    value={defaultDueDate}
                    placeholder="Chọn hạn chót..."
                    onChange={val => handleDefaultDueDateChange(val)}
                  />
                </div>
              </div>
            </div>

            {/* Mức ưu tiên mặc định */}
            <div className="py-2.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mức ưu tiên mặc định
              </label>
              <div className="h-8 flex items-center">
                <Select
                  size="sm"
                  disabled={submitting}
                  value={defaultPriority}
                  onChange={e => {
                    const val = typeof e === 'object' && e?.target ? e.target.value : e;
                    setDefaultPriority(val);
                    setItems(prev => prev.map(it => (!it.priority || it.priority === defaultPriority ? { ...it, priority: val } : it)));
                  }}
                  options={PRIORITY_OPTIONS}
                  className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                />
              </div>
            </div>
          </div>

          {/* Tóm tắt cấu hình */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 text-[11px]">
              Tóm tắt đợt giao việc
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Tổng đầu việc hợp lệ:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {validItems.length} việc
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Đã gán người phụ trách:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {assignedCount} / {validItems.length} việc
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Số nhân sự phụ trách:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {uniqueAssignees} nhân sự
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── CỘT 2 (PHẢI): CANVAS BẢNG DANH SÁCH ĐẦU VIỆC CHUẨN ERP ─── */}
      <main className="flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-white dark:bg-slate-950">
        
        {/* Canvas Header Tab Bar with Action Header */}
        <div className="h-10 min-h-[40px] px-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-stretch justify-between shrink-0 select-none">
          <div className="flex items-stretch">
            <div className="h-full px-5 flex items-center gap-2.5 text-xs font-semibold border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 border-b-2 border-b-emerald-600 -mb-px z-10">
              <span>{isPersonal ? '1. Danh mục các đầu việc cần làm' : '1. Danh mục các đầu việc cần giao'}</span>
              <span className="px-1.5 py-0.2 rounded-none font-mono text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {validItems.length}
              </span>
            </div>
          </div>

          {/* DẢI NÚT ACTION HEADER CỦA BẢNG (Chỉ hiển thị khi không được đưa lên Layout Header) */}
          {!hideActions && (
            <div className="flex items-center gap-2 px-3">
              {selectedDCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={RotateCcw}
                  onClick={handleRestoreSelectedRows}
                  className="h-7 text-xs font-medium cursor-pointer text-amber-600 dark:text-amber-400"
                  title="Khôi phục các dòng đã xóa"
                >
                  Khôi phục ({selectedDCount})
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={Trash2}
                disabled={selectedRowIds.size === 0}
                onClick={handleDeleteSelectedRows}
                className={`h-7 text-xs font-medium cursor-pointer ${
                  selectedRowIds.size > 0
                    ? 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title="Xóa các dòng đã chọn bằng checkbox"
              >
                Xóa dòng {selectedRowIds.size > 0 ? `(${selectedRowIds.size})` : ''}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={Plus}
                onClick={() => handleAddRow(1)}
                className="h-7 text-xs font-semibold cursor-pointer"
                title="Thêm 1 đầu việc mới"
              >
                Thêm dòng
              </Button>

              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={Save}
                disabled={submitting || validItems.length === 0}
                onClick={handleSubmitAll}
                className="h-7 text-xs font-semibold cursor-pointer"
              >
                {submitting
                  ? `Đang lưu (${submitProgress.current}/${submitProgress.total})...`
                  : `Lưu công việc (${validItems.length})`}
              </Button>
            </div>
          )}
        </div>

        {/* Flat Self-Scrolling Table per UI_DESIGN_STANDARD.md */}
        <div
          className="flex-1 min-h-0 overflow-auto bg-white dark:bg-slate-950 scrollbar-thin"
          onPaste={handleTablePaste}
        >
          <table className="min-w-[1200px] w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold select-none shadow-2xs">
              <tr>
                {/* Checkbox All */}
                <th className="sticky left-0 z-20 w-10 min-w-[40px] px-2 py-2.5 text-center bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả dòng"
                    checked={items.length > 0 && selectedRowIds.size === items.length}
                    onChange={handleToggleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                  />
                </th>

                {/* WorkingTag */}
                <th className="w-12 min-w-[48px] px-1 py-2.5 text-center font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800" title="Trạng thái thao tác dòng (A: Thêm, D: Xóa)">
                  Tag
                </th>

                {/* STT */}
                <th className="w-12 min-w-[48px] px-2 py-2.5 text-center font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                  STT
                </th>

                {/* Đầu việc / Nội dung cần làm */}
                <th className="w-[340px] min-w-[300px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800">
                  {isPersonal ? 'Đầu việc / Nội dung cần làm *' : 'Hạng mục / Tiêu chí kiểm tra *'}
                </th>

                {/* Yêu cầu kết quả cần đạt */}
                <th className="w-[260px] min-w-[220px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800">
                  {isPersonal ? 'Yêu cầu kết quả cần đạt' : 'Tiêu chuẩn kỹ thuật nghiệm thu'}
                </th>

                {/* Người thực hiện (@) */}
                <th className="w-52 min-w-[190px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800" title="Chọn nhân sự thực hiện hạng mục này (@)">
                  @ Người thực hiện
                </th>

                {/* Người nghiệm thu (@) */}
                <th className="w-52 min-w-[190px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800" title="Chọn nhân sự kiểm tra / nghiệm thu (@)">
                  @ Người nghiệm thu
                </th>

                {/* Hạn hoàn thành */}
                <th className="w-36 min-w-[130px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800">
                  Hạn hoàn thành
                </th>

                {/* Mức ưu tiên */}
                <th className="w-36 min-w-[120px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800">
                  Mức ưu tiên
                </th>

                {/* Ghi chú */}
                <th className="min-w-[180px] px-3 py-2.5">
                  {isPersonal ? 'Ghi chú' : 'Ghi chú kỹ thuật'}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {items.map((row, idx) => {
                const isDeleted = row.workingTag === 'D';
                const isSelected = selectedRowIds.has(row.id);
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={row.id}
                    className={`group transition-colors border-b border-slate-200/70 dark:border-slate-800 ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30'
                        : isDeleted
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-400'
                        : isEven
                        ? 'bg-white dark:bg-slate-950 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                        : 'bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className={`sticky left-0 z-10 w-10 min-w-[40px] px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-800 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60'
                          : isDeleted
                          ? 'bg-rose-50 dark:bg-rose-950/40'
                          : isEven
                          ? 'bg-white dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                          : 'bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Chọn dòng ${idx + 1}`}
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(row.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </td>

                    {/* Tag */}
                    <td className="w-12 min-w-[48px] px-1 py-1.5 text-center border-r border-slate-100 dark:border-slate-800/80">
                      <WorkingTagBadge tag={row.workingTag} />
                    </td>

                    {/* STT */}
                    <td className="w-12 min-w-[48px] px-2 py-1.5 text-center font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/80">
                      {idx + 1}
                    </td>

                    {/* Tiêu đề / Đầu việc */}
                    <td className="w-[340px] min-w-[300px] px-2 py-1 border-r border-slate-100 dark:border-slate-800/80">
                      <input
                        type="text"
                        disabled={isDeleted}
                        value={row.title}
                        onChange={e => handleItemChange(row.id, 'title', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && idx === items.length - 1) {
                            e.preventDefault();
                            handleAddRow(1);
                          }
                        }}
                        placeholder={idx === 0 ? "Nhập đầu việc cần làm (Enter để thêm dòng, dán từ Excel)..." : ""}
                        className={`w-full h-8 px-2 bg-transparent border-0 outline-none focus:bg-slate-100/70 dark:focus:bg-slate-800/70 text-xs transition-colors rounded-none placeholder:text-slate-400 ${
                          isDeleted ? 'line-through text-rose-500/70' : 'text-slate-900 dark:text-slate-100 font-medium'
                        }`}
                      />
                    </td>

                    {/* Yêu cầu kết quả cần đạt */}
                    <td className="w-[260px] min-w-[220px] px-2 py-1 border-r border-slate-100 dark:border-slate-800/80">
                      <input
                        type="text"
                        disabled={isDeleted}
                        value={row.standard || ''}
                        onChange={e => handleItemChange(row.id, 'standard', e.target.value)}
                        placeholder={idx === 0 ? "Quy chuẩn nghiệm thu / kết quả..." : ""}
                        className={`w-full h-8 px-2 bg-transparent border-0 outline-none focus:bg-slate-100/70 dark:focus:bg-slate-800/70 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 rounded-none ${
                          isDeleted ? 'line-through text-rose-500/70' : ''
                        }`}
                      />
                    </td>

                    {/* @ Người thực hiện */}
                    <td className="w-52 min-w-[190px] px-2 py-1 border-r border-slate-100 dark:border-slate-800/80">
                      <Select
                        size="sm"
                        searchable
                        clearable
                        disabled={isDeleted}
                        value={row.assigneeId}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          handleItemChange(row.id, 'assigneeId', val);
                        }}
                        placeholder="@ Chọn người làm..."
                        options={assigneeOptions}
                        className="w-full text-xs"
                      />
                    </td>

                    {/* @ Người nghiệm thu */}
                    <td className="w-52 min-w-[190px] px-2 py-1 border-r border-slate-100 dark:border-slate-800/80">
                      <Select
                        size="sm"
                        searchable
                        clearable
                        disabled={isDeleted}
                        value={row.supervisorId || supervisorId}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          handleItemChange(row.id, 'supervisorId', val);
                        }}
                        placeholder="@ Chọn người duyệt..."
                        options={supervisorOptions}
                        className="w-full text-xs"
                      />
                    </td>

                    {/* Hạn hoàn thành */}
                    <td className="w-36 min-w-[130px] px-2 py-0 border-r border-slate-100 dark:border-slate-800/80">
                      <ClickUpDatePicker
                        value={row.dueDate || defaultDueDate}
                        disabled={isDeleted}
                        tabLabel="Hạn chót"
                        placeholder="Chọn hạn chót..."
                        onChange={val => handleItemChange(row.id, 'dueDate', val)}
                      />
                    </td>

                    {/* Mức ưu tiên */}
                    <td className="w-36 min-w-[120px] px-2 py-1 border-r border-slate-100 dark:border-slate-800/80">
                      <Select
                        size="sm"
                        searchable={false}
                        disabled={isDeleted}
                        value={row.priority || defaultPriority}
                        onChange={e => {
                          const val = typeof e === 'object' && e?.target ? e.target.value : e;
                          handleItemChange(row.id, 'priority', val);
                        }}
                        options={PRIORITY_OPTIONS}
                        className="w-full text-xs"
                      />
                    </td>

                    {/* Ghi chú */}
                    <td className="min-w-[180px] px-2 py-1">
                      <input
                        type="text"
                        disabled={isDeleted}
                        value={row.note || ''}
                        onChange={e => handleItemChange(row.id, 'note', e.target.value)}
                        placeholder={idx === 0 ? "Ghi chú thêm..." : ""}
                        className="w-full h-8 px-2 bg-transparent border-0 outline-none focus:bg-slate-100/70 dark:focus:bg-slate-800/70 text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
});

export default QuickTaskDelegationView;
