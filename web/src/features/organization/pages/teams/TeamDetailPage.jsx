import React, { useState } from 'react';
import {
  ArrowLeft,
  Users,
  Building2,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import Button from '../../../../shared/ui/Button';
import Select from '../../../../shared/ui/Select';
import { notify } from '../../../../shared/lib/notify';

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

export default function TeamDetailPage({
  team,
  isCreate = false,
  onBack,
  onSaved,
  onDelete,
}) {
  const [code, setCode] = useState(team?.code || `TEAM-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState(team?.name || '');
  const [department, setDepartment] = useState(team?.department || 'Kỹ thuật');
  const [leader, setLeader] = useState(team?.leader || '');
  const [description, setDescription] = useState(team?.description || '');
  const [members, setMembers] = useState(team?.members || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Vui lòng nhập đầy đủ mã và tên nhóm làm việc.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const savedTeam = {
        id: team?.id || `TEAM-${Date.now()}`,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        department,
        leader: leader.trim() || 'Chưa chỉ định',
        memberCount: members.length || 1,
        activeProjects: team?.activeProjects || 0,
        description: description.trim(),
        members: members,
      };
      notify.success(`Đã lưu thông tin nhóm: ${savedTeam.name}`);
      if (onSaved) onSaved(savedTeam);
      onBack();
    } catch (err) {
      setError(err?.message || 'Không thể lưu nhóm làm việc.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ManagementFrame
      className="h-full"
      scrollableContent={false}
      header={
        <div className="flex flex-wrap items-center justify-between w-full gap-3 py-2">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              size="sm"
              variant="ghost"
              icon={ArrowLeft}
              disabled={saving}
              onClick={onBack}
              title="Quay lại danh sách nhóm"
            >
              Quay lại
            </Button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {code}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {isCreate ? 'Thành lập nhóm làm việc mới' : name}
                </h2>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Phòng {department}</span>
                <span>·</span>
                <span>Phụ trách: <strong>{leader || 'Chưa chỉ định'}</strong></span>
                <span>·</span>
                <span>{team?.members?.length || 0} thành viên</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={onBack}
            >
              Hủy
            </Button>
            {!isCreate && onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                disabled={saving}
                onClick={() => {
                  if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm làm việc [${code}] "${name}" không?`)) {
                    onDelete(team);
                  }
                }}
              >
                <Trash2 size={14} className="mr-1 inline" /> Xóa nhóm
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Đang lưu...' : isCreate ? 'Lưu nhóm' : 'Cập nhật nhóm'}
            </Button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* 2-Column Split Layout Edge-to-Edge */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950">
        {/* Left Column: Basic Information */}
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Thông tin nhóm làm việc
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {/* Mã nhóm */}
              <div className="py-2.5 first:pt-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã nhóm <span className="text-rose-500">*</span>
                </label>
                {isCreate ? (
                  <input
                    type="text"
                    required
                    disabled={saving}
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="VD: TEAM-01..."
                    className="w-full h-8 px-0 border-0 bg-transparent font-mono text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                  />
                ) : (
                  <div className="h-8 flex items-center font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {code}
                  </div>
                )}
              </div>

              {/* Tên nhóm */}
              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên nhóm làm việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={saving}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="VD: Tổ Vận hành máy in ống đồng..."
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {/* Phòng ban */}
              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phòng ban trực thuộc
                </label>
                <div className="h-8 flex items-center">
                  <Select
                    size="sm"
                    searchable={false}
                    disabled={saving}
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

              {/* Trưởng nhóm */}
              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Trưởng nhóm / Người phụ trách
                </label>
                <input
                  type="text"
                  disabled={saving}
                  value={leader}
                  onChange={e => setLeader(e.target.value)}
                  placeholder="VD: Phạm Tổ Trưởng..."
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Main Canvas */}
        <main className="flex flex-col min-w-0 min-h-0 overflow-y-auto p-4 lg:p-6 bg-white dark:bg-slate-950 space-y-6">
          {/* Mục tiêu & Nhiệm vụ nhóm */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Mục tiêu & Phạm vi chuyên môn
            </h3>
            <textarea
              rows={4}
              disabled={saving}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả phạm vi chuyên môn, dây chuyền máy móc thiết bị phụ trách và các chỉ tiêu KPI nhóm..."
              className="w-full text-xs text-slate-800 dark:text-slate-200 p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/50 outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Danh sách thành viên */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Users size={14} className="text-emerald-600" />
                Danh sách thành viên ({members.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded">
              {members.map((m, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 dark:text-white block">{m.name}</strong>
                    <span className="text-slate-400">{m.code} · {m.position}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-emerald-600">{m.role}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMembers(prev => prev.filter((_, i) => i !== idx));
                        notify.info(`Đã gỡ thành viên ${m.name} khỏi nhóm`);
                      }}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Gỡ thành viên khỏi nhóm"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs">
                  Chưa có thành viên nào được gán vào nhóm.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ManagementFrame>
  );
}
