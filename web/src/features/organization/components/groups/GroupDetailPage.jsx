import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, UserPlus, Trash2, Search, RotateCcw } from 'lucide-react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../../shared/ui/VirtualDataTable';
import Modal from '../../../../shared/ui/Modal';
import Button from '../../../../shared/ui/Button';
import Input from '../../../../shared/ui/Input';
import Select from '../../../../shared/ui/Select';
import SearchInput from '../../../../shared/ui/SearchInput';
import { assessmentsApi } from '../../../assessments/services/assessments.api';
import { peopleService } from '../../../../services/security/people.service';
import { notify } from '../../../../shared/lib/notify';

const memberColumns = [
  { id: 'name', label: 'Họ và tên học viên', width: 260, minWidth: 180 },
  { id: 'email', label: 'Tài khoản Email', width: 280, minWidth: 200 },
  { id: 'department', label: 'Phòng ban / Bộ phận', width: 220, minWidth: 160 },
  { id: 'role', label: 'Vai trò / Chức danh', width: 180, minWidth: 140 },
  { id: 'status', label: 'Trạng thái', width: 140, minWidth: 110 },
];

export default function GroupDetailPage({ group, isCreate = false, onBack, onSaved }) {
  const [form, setForm] = useState({
    id: group?.id || '',
    name: group?.name || '',
    code: group?.code || (isCreate ? 'GRP-' + Math.floor(1000 + Math.random() * 9000) : ''),
    leader: group?.leader || 'Giảng viên phụ trách',
    description: group?.description || '',
    members: group?.members || [],
  });

  const initialFormRef = useRef(JSON.stringify(form));
  const [saving, setSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Users for assignment
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [assigningMember, setAssigningMember] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  useEffect(() => {
    let mounted = true;
    peopleService.list()
      .then(res => {
        if (mounted) setUsers(res.users || []);
      })
      .catch(() => {
        if (mounted) setUsers([]);
      })
      .finally(() => {
        if (mounted) setLoadingUsers(false);
      });
    return () => { mounted = false; };
  }, []);

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== initialFormRef.current;
  }, [form]);

  const handleBackAttempt = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      notify('Vui lòng nhập tên nhóm / lớp học!', 'warning');
      return;
    }
    if (!form.code.trim()) {
      notify('Vui lòng nhập mã định danh nhóm!', 'warning');
      return;
    }

    setSaving(true);
    try {
      const res = await assessmentsApi.saveGroup({
        id: form.id || undefined,
        name: form.name.trim(),
        code: form.code.trim(),
        leader: form.leader.trim(),
        description: form.description.trim(),
      });
      notify(isCreate ? 'Đã tạo nhóm học viên mới thành công!' : 'Đã cập nhật thông tin nhóm thành công!', 'success');
      initialFormRef.current = JSON.stringify({ ...form, id: res?.data?.id || form.id });
      if (onSaved) onSaved(res?.data || form);
    } catch (err) {
      notify('Lỗi khi lưu nhóm: ' + (err.message || 'Lỗi hệ thống'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add member
  const handleAddMember = async () => {
    if (!selectedUserId) {
      notify('Vui lòng chọn học viên để thêm!', 'warning');
      return;
    }
    if (form.members.some(m => (m.userId || m.id) === selectedUserId)) {
      notify('Học viên này đã có trong nhóm!', 'warning');
      return;
    }

    const u = users.find(x => x.id === selectedUserId);
    if (isCreate || !form.id) {
      setForm(prev => ({
        ...prev,
        members: [...prev.members, { id: selectedUserId, userId: selectedUserId, name: u?.name, email: u?.email, department: u?.department, role: u?.role, active: true }],
      }));
      setSelectedUserId('');
      notify('Đã thêm học viên vào danh sách dự thảo!', 'info');
      return;
    }

    setAssigningMember(true);
    try {
      await assessmentsApi.addGroupMember(form.id, selectedUserId);
      setForm(prev => ({
        ...prev,
        members: [...prev.members, { id: selectedUserId, userId: selectedUserId, name: u?.name, email: u?.email, department: u?.department, role: u?.role, active: true }],
      }));
      setSelectedUserId('');
      notify(`Đã thêm học viên vào nhóm thành công!`, 'success');
    } catch (err) {
      notify('Lỗi khi thêm học viên: ' + (err.message || 'Lỗi hệ thống'), 'error');
    } finally {
      setAssigningMember(false);
    }
  };

  // Remove selected members via bulk action
  const handleRemoveSelectedMembers = async () => {
    if (selectedMemberIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedMemberIds.length} học viên đã chọn khỏi nhóm?`)) return;

    if (isCreate || !form.id) {
      setForm(prev => ({
        ...prev,
        members: prev.members.filter(m => !selectedMemberIds.includes(m.userId || m.id)),
      }));
      setSelectedMemberIds([]);
      notify(`Đã xóa ${selectedMemberIds.length} học viên khỏi danh sách dự thảo.`, 'info');
      return;
    }

    try {
      await Promise.all(selectedMemberIds.map(uid => assessmentsApi.removeGroupMember(form.id, uid)));
      setForm(prev => ({
        ...prev,
        members: prev.members.filter(m => !selectedMemberIds.includes(m.userId || m.id)),
      }));
      setSelectedMemberIds([]);
      notify(`Đã xóa ${selectedMemberIds.length} học viên khỏi nhóm.`, 'success');
    } catch (err) {
      notify('Lỗi khi xóa học viên: ' + (err.message || 'Lỗi hệ thống'), 'error');
    }
  };

  // Available users not in group yet
  const availableUsers = useMemo(() => {
    const existingIds = new Set(form.members.map(m => m.userId || m.id));
    return users.filter(u => !existingIds.has(u.id));
  }, [users, form.members]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return form.members;
    return form.members.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.department || '').toLowerCase().includes(q)
    );
  }, [form.members, memberSearch]);

  const formatCell = (col, row) => {
    if (col.id === 'status') return row.active !== false ? 'Hoạt động' : 'Tạm ngưng';
    return row[col.id] || '—';
  };

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <>
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBackAttempt}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Quay lại danh sách nhóm"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-5 w-px bg-slate-200 dark:border-slate-800" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {isCreate ? 'Tạo lớp học / nhóm đào tạo mới' : `Chi tiết nhóm · ${form.name || 'Chưa đặt tên'}`}
                </h1>
                {form.code && (
                  <span className="font-mono text-xs text-slate-500 font-medium">
                    @{form.code}
                  </span>
                )}
                {hasChanges && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic">
                    (Có thay đổi chưa lưu)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="management-actions flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBackAttempt}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving || (!hasChanges && !isCreate)}
            >
              {isCreate ? 'Tạo nhóm & Lưu' : 'Lưu thông tin nhóm'}
            </Button>
          </div>
        </>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <span>
            Quản lý nhóm đào tạo · <strong className="text-slate-800 dark:text-slate-200">{form.members.length} học viên</strong>
            {selectedMemberIds.length > 0 && ` · Đã chọn ${selectedMemberIds.length} học viên`}
          </span>
          <span>{hasChanges ? 'Bản nháp có thay đổi' : 'Đã đồng bộ với máy chủ'}</span>
        </div>
      }
    >
      {/* 2-Column Split Workspace (100% Flat Edge-to-Edge) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950 overflow-hidden">
        {/* Left Column: Group Form Info */}
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Thông tin nhóm đào tạo
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              <div className="py-2.5 first:pt-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên lớp học / nhóm <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Lớp Kỹ thuật In Offset Khóa 1"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã định danh nhóm <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="VD: OFFSET-2026-01"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-mono font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Người phụ trách / Giảng viên
                </label>
                <input
                  value={form.leader}
                  onChange={e => setForm(prev => ({ ...prev, leader: e.target.value }))}
                  placeholder="Họ tên giảng viên hoặc quản lý phụ trách"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mục tiêu đào tạo & Mô tả
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ghi chú về nhóm đối tượng tham gia, nhiệm vụ ôn tập..."
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 mt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng thành viên:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{form.members.length} học viên</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phụ trách:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{form.leader || '—'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Flat Edge-to-Edge Canvas Table */}
        <main className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden bg-white dark:bg-slate-950">
          {/* Sub-toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="w-64 max-w-full">
                <SearchInput
                  size="sm"
                  placeholder="Tìm học viên trong nhóm..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(typeof e === 'string' ? e : e?.target?.value ?? '')}
                  onClear={() => setMemberSearch('')}
                />
              </div>

              {selectedMemberIds.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveSelectedMembers}
                  className="text-rose-600 hover:text-rose-700 text-xs"
                >
                  Xóa ({selectedMemberIds.length}) khỏi nhóm
                </Button>
              )}
            </div>

            {/* Quick Add Member Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                disabled={loadingUsers || assigningMember}
                className="text-xs h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-[260px] focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Chọn tài khoản học viên --</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.email})
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={UserPlus}
                onClick={handleAddMember}
                disabled={!selectedUserId || assigningMember}
              >
                Thêm vào nhóm
              </Button>
            </div>
          </div>

          {/* Canvas: Flat VirtualDataTable (Pure Plain Text, no boxed card container) */}
          <div className="flex-1 min-h-0">
            <VirtualDataTable
              preferenceKey="group-members-detail"
              columns={memberColumns}
              rows={filteredMembers}
              formatCell={formatCell}
              selectedRowIds={selectedMemberIds}
              onSelectRows={setSelectedMemberIds}
              rowHeight={40}
            />
          </div>
        </main>
      </div>

      {/* Confirmation Modal when Leaving with Unsaved Changes */}
      <Modal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Xác nhận rời khỏi màn hình"
        size="sm"
        density="compact"
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setShowExitConfirm(false)}>
              Ở lại chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setShowExitConfirm(false);
                onBack();
              }}
            >
              Rời khỏi & Hủy thay đổi
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Bạn có thay đổi chưa lưu cho nhóm này. Nếu quay lại bây giờ, các thay đổi sẽ bị mất.
        </p>
      </Modal>
    </ManagementFrame>
  );
}
