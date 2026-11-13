import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import Badge from '../../../shared/ui/Badge';
import ClickUpDatePicker from '../../../shared/ui/ClickUpDatePicker';
import {
  Layers,
  Building2,
  Users,
  UserCheck,
  Calendar,
  Clock,
  Target,
  ListPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { taskService } from '../services/taskService';
import { useAuth } from '../../../shared/hooks/useAuth';

const DELEGATION_LEVELS = [
  {
    id: 'company',
    label: 'Cấp Ban Giám Đốc',
    desc: 'Chỉ đạo toàn diện từ Ban Giám Đốc xuống Trưởng phòng/Đơn vị',
    badge: 'red',
  },
  {
    id: 'department',
    label: 'Cấp Phòng Ban',
    desc: 'Trưởng phòng phân công nội bộ cho Tổ trưởng, Chuyên viên, Kỹ sư',
    badge: 'primary',
  },
  {
    id: 'project',
    label: 'Cấp Dự Án',
    desc: 'Quản lý dự án giao nhiệm vụ theo các mốc Milestones',
    badge: 'purple',
  },
  {
    id: 'team',
    label: 'Cấp Tổ / Nhóm',
    desc: 'Tổ trưởng giao việc trực tiếp cho nhân viên vận hành',
    badge: 'info',
  },
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

export default function CreateTaskModal({ open, onClose, onSuccess, initialLevel = 'department', initialDueDate }) {
  const { currentUser } = useAuth();
  const [delegationLevel, setDelegationLevel] = useState(initialLevel);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [department, setDepartment] = useState(() => currentUser?.department || 'Kỹ thuật');
  const [priority, setPriority] = useState('medium');
  const [assigneeName, setAssigneeName] = useState('Trần Trưởng Phòng Kỹ Thuật');
  const [supervisorName, setSupervisorName] = useState('Nguyễn Văn Giám Đốc');
  const [coAssignees, setCoAssignees] = useState('Phạm Tổ Trưởng Cơ Điện, Vũ Kỹ Sư Lập Trình');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [requireApproval, setRequireApproval] = useState(true);

  // Initial checklist items
  const [checklistItems, setChecklistItems] = useState([
    'Khảo sát hiện trạng và chuẩn bị phương án triển khai',
    'Thực hiện các hạng mục kỹ thuật theo tiêu chuẩn',
    'Nghiệm thu nội bộ và lập biên bản bàn giao kết quả',
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCode(`TSK-${Math.floor(100 + Math.random() * 900)}`);
      taskService.getProjects().then((list) => setProjects(list || []));
      if (initialDueDate) {
        setDueDate(initialDueDate);
      }
    }
  }, [open, initialDueDate]);

  // Adjust default Assignee / Supervisor based on Delegation Level
  useEffect(() => {
    if (delegationLevel === 'company') {
      setSupervisorName('Nguyễn Văn Giám Đốc (Ban Giám Đốc)');
      setAssigneeName('Trần Trưởng Phòng Kỹ Thuật (Trưởng phòng)');
    } else if (delegationLevel === 'department') {
      setSupervisorName('Trần Trưởng Phòng Kỹ Thuật (Trưởng phòng)');
      setAssigneeName('Phạm Tổ Trưởng Cơ Điện (Tổ trưởng)');
    } else if (delegationLevel === 'project') {
      setSupervisorName('Quản lý dự án MES');
      setAssigneeName('Vũ Kỹ Sư Lập Trình (Kỹ sư)');
    } else if (delegationLevel === 'team') {
      setSupervisorName('Phạm Tổ Trưởng Cơ Điện (Tổ trưởng)');
      setAssigneeName('User 01 (Nhân viên vận hành)');
    }
  }, [delegationLevel]);

  const handleAddChecklist = (e) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    setChecklistItems([...checklistItems, newChecklistText.trim()]);
    setNewChecklistText('');
  };

  const handleRemoveChecklist = (index) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề công việc.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const created = await taskService.createTask({
        code: code.trim(),
        title: title.trim(),
        description: description.trim(),
        target: target.trim(),
        delegationLevel,
        department,
        priority,
        status: 'todo',
        assigneeName,
        supervisorName,
        coAssignees,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        projectId: projectId ? Number(projectId) : undefined,
      });

      // Add initial checklists if task was created
      if (created?.id && checklistItems.length > 0) {
        for (const item of checklistItems) {
          await taskService.addChecklistItem(created.id, item).catch(() => {});
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Không thể tạo công việc. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Giao việc & Phân công nhiệm vụ theo cấp bậc"
      maxWidth="850px"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. CẤP BẬC GIAO VIỆC (DELEGATION HIERARCHY) */}
        <div className="space-y-2">
          <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
            1. Cấp bậc giao việc & Thẩm quyền (Delegation Level)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {DELEGATION_LEVELS.map((level) => {
              const active = delegationLevel === level.id;
              return (
                <div
                  key={level.id}
                  onClick={() => setDelegationLevel(level.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{level.label}</span>
                      {active && <CheckCircle2 size={14} className="text-emerald-600" />}
                    </div>
                    <p className="text-[10px] leading-3 text-slate-500 dark:text-slate-400">
                      {level.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. PHÂN CÔNG TRÁCH NHIỆM & CƠ CẤU */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
            2. Trách nhiệm, Đơn vị & Người phê duyệt
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Phòng ban phụ trách *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Dự án liên kết
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              >
                <option value="">Không thuộc dự án (Nhiệm vụ độc lập)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Mức độ ưu tiên *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-medium"
              >
                <option value="low">Thấp (Có thể hoãn)</option>
                <option value="medium">Trung bình (Bình thường)</option>
                <option value="high">Ưu tiên cao (Cần xử lý sớm)</option>
                <option value="urgent">Khẩn cấp (Xử lý ngay lập tức)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Người phụ trách chính (Owner) *
              </label>
              <input
                type="text"
                required
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="VD: Trần Trưởng Phòng Kỹ Thuật"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Cấp trên giám sát & Nghiệm thu *
              </label>
              <input
                type="text"
                required
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                placeholder="VD: Nguyễn Văn Giám Đốc"
                className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-300 font-medium outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Người phối hợp thực hiện
              </label>
              <input
                type="text"
                value={coAssignees}
                onChange={(e) => setCoAssignees(e.target.value)}
                placeholder="Danh sách người phối hợp..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 3. CHI TIẾT CÔNG VIỆC & MỤC TIÊU NGHIỆM THU */}
        <div className="space-y-3">
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
            3. Thông tin công việc & Mục tiêu kết quả
          </span>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Mã công việc
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Tên công việc / Nhiệm vụ *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tên công việc cụ thể..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Mục tiêu nghiệm thu (Target / Deliverable) *
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="VD: Biên bản nghiệm thu bàn giao đạt chuẩn ISO 9001, tỷ lệ lỗi dưới 0.5%..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Mô tả chi tiết & Hướng dẫn thực hiện
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú quy trình, tài liệu tham khảo, yêu cầu an toàn lao động..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Thời gian & Giờ làm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Ngày bắt đầu
              </label>
              <ClickUpDatePicker
                mode="input"
                tabLabel="Ngày bắt đầu"
                value={startDate}
                placeholder="Chọn ngày bắt đầu..."
                onChange={(val) => setStartDate(val)}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Hạn chót hoàn thành (Deadline) *
              </label>
              <ClickUpDatePicker
                mode="input"
                tabLabel="Hạn chót"
                value={dueDate}
                placeholder="Chọn hạn chót..."
                onChange={(val) => setDueDate(val)}
              />
            </div>
          </div>
        </div>

        {/* 4. HẠNG MỤC CÔNG VIỆC CON (CHECKLIST BAN ĐẦU) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              4. Các hạng mục công việc con (Checklist thực hiện)
            </span>
            <span className="text-[11px] text-slate-400">
              {checklistItems.length} hạng mục ban đầu
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {checklistItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveChecklist(idx)}
                  className="text-slate-400 hover:text-rose-600 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              placeholder="Thêm hạng mục con cần làm..."
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddChecklist}
              className="text-xs"
            >
              + Thêm mục
            </Button>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <input
              type="checkbox"
              id="reqApproval"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="rounded text-emerald-600"
            />
            <label htmlFor="reqApproval" className="cursor-pointer">
              Bắt buộc Cấp trên kiểm tra & nghiệm thu trước khi Hoàn thành (Done)
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {submitting ? 'Đang giao việc...' : 'Xác nhận giao việc'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

