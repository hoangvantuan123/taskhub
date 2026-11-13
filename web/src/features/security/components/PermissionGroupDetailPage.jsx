import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Trash2, RotateCcw, ChevronDown } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import SearchInput from '../../../shared/ui/SearchInput';
import PermissionTree from './PermissionTree';
import { normalizeOptionSearch } from '../../../shared/lib/searchOptions';

/**
 * Normalizes group key: lowercase, no diacritics, no spaces (snake_case)
 */
export function normalizeGroupKey(val) {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[\s\t\n]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');
}

/**
 * Compares two permission group drafts for equality to detect unsaved changes
 */
function isDraftEqual(a, b) {
  if (!a || !b) return a === b;
  if ((a.key || '') !== (b.key || '')) return false;
  if ((a.label || '') !== (b.label || '')) return false;
  if (Boolean(a.enabled) !== Boolean(b.enabled)) return false;

  const permsA = Array.isArray(a.permissions) ? a.permissions : [];
  const permsB = Array.isArray(b.permissions) ? b.permissions : [];
  if (permsA.length !== permsB.length) return false;

  const mapA = new Map(permsA.map(p => [p.module, [...(p.actions || [])].sort().join(',')]));
  for (const pb of permsB) {
    const actB = [...(pb.actions || [])].sort().join(',');
    if (mapA.get(pb.module) !== actB) return false;
  }
  return true;
}

const memberColumns = [
  { id: 'username', label: 'Tài khoản', width: 170, minWidth: 130 },
  { id: 'name', label: 'Họ và tên', width: 220, minWidth: 160 },
  { id: 'department', label: 'Phòng ban', width: 180, minWidth: 140 },
  { id: 'position', label: 'Chức vụ / Vị trí', width: 180, minWidth: 140 },
  { id: 'groups_display', label: 'Nhóm quyền hiện có', width: 260, minWidth: 180 },
  { id: 'status', label: 'Trạng thái', width: 120, minWidth: 90 },
];

export default function PermissionGroupDetailPage({
  draft,
  onChange,
  onSave,
  onDelete,
  onBack,
  isCreate = false,
  groups = [],
  modules = [],
  hierarchy = [],
  users = [],
  busy = false,
  canEdit = true,
  canDelete = false,
}) {
  // Store initial snapshot for dirty checking
  const initialDraftRef = useRef(null);
  if (!initialDraftRef.current && draft) {
    initialDraftRef.current = {
      ...draft,
      permissions: (draft.permissions || []).map(p => ({
        ...p,
        actions: [...(p.actions || [])],
      })),
    };
  }

  // Calculate initial member user IDs for this group
  const initialMemberIds = useMemo(() => {
    if (isCreate || !draft?.key || !users.length) return [];
    return users
      .filter(
        u =>
          (u.groups || []).includes(draft.key) ||
          (u.manual_groups || []).includes(draft.key)
      )
      .map(u => u.id);
  }, [isCreate, draft?.key, users]);

  const initialMemberIdsRef = useRef(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState(initialMemberIds);
  const initializedMembersRef = useRef(false);

  useEffect(() => {
    if (!initializedMembersRef.current && (isCreate || users.length > 0)) {
      initializedMembersRef.current = true;
      initialMemberIdsRef.current = [...initialMemberIds];
      setSelectedMemberIds([...initialMemberIds]);
    }
  }, [isCreate, users.length, initialMemberIds]);
  // State for canvas tabs: 'permissions' | 'members'
  const [activeCanvasTab, setActiveCanvasTab] = useState('permissions');
  const [userSearch, setUserSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState('');

  // Check if draft or member selection has unsaved changes
  const isDirty = useMemo(() => {
    if (!isDraftEqual(draft, initialDraftRef.current)) return true;
    const initSet = new Set(initialMemberIdsRef.current || []);
    const currSet = new Set(selectedMemberIds || []);
    if (initSet.size !== currSet.size) return true;
    for (const id of currSet) {
      if (!initSet.has(id)) return true;
    }
    return false;
  }, [draft, selectedMemberIds]);

  // Warn on browser tab reload/close if dirty
  useEffect(() => {
    const handleBeforeUnload = e => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (showUnsavedModal) {
          setShowUnsavedModal(false);
        } else if (showDeleteModal) {
          setShowDeleteModal(false);
        } else if (isDirty) {
          setShowUnsavedModal(true);
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, showUnsavedModal, showDeleteModal, onBack]);

  const handleAttemptBack = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const handleConfirmDiscard = () => {
    setShowUnsavedModal(false);
    onBack();
  };

  const handleSaveClick = async e => {
    if (e) e.preventDefault();
    if (busy || (!isCreate && !isDirty)) return;
    setError('');

    if (!draft.label?.trim()) {
      setError('Vui lòng nhập tên nhóm quyền.');
      return;
    }

    if (isCreate && !draft.key?.trim()) {
      setError('Vui lòng nhập mã nhóm quyền.');
      return;
    }

    try {
      console.log('[handleSaveClick]', { draft, selectedMemberIds });
      await onSave(draft, selectedMemberIds);
      initialDraftRef.current = {
        ...draft,
        permissions: (draft.permissions || []).map(p => ({
          ...p,
          actions: [...(p.actions || [])],
        })),
      };
      initialMemberIdsRef.current = [...selectedMemberIds];
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu nhóm quyền');
    }
  };

  const update = (key, value) => {
    onChange({ ...draft, [key]: value });
  };

  // Permission stats
  const totalPermittedModules = (draft.permissions || []).length;
  const totalPermittedActions = (draft.permissions || []).reduce(
    (sum, p) => sum + (p.actions?.length || 0),
    0
  );

  // Departments for user filtering
  const departments = useMemo(() => {
    return [...new Set(users.map(u => u.department).filter(Boolean))].sort();
  }, [users]);

  // Filtered users for "Thành viên nhóm" tab
  const filteredUsers = useMemo(() => {
    const q = normalizeOptionSearch(userSearch);
    return users.filter(u => {
      const matchesSearch =
        !q ||
        normalizeOptionSearch(
          [u.username, u.name, u.email, u.department, u.position].join(' ')
        ).includes(q);
      const matchesDept = !deptFilter || u.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [users, userSearch, deptFilter]);

  // User rows with formatted display fields
  const userRows = useMemo(() => {
    const groupNameMap = new Map((groups || []).map(g => [g.key, g.label]));
    return filteredUsers.map(u => {
      const allGroupKeys = Array.from(new Set([...(u.groups || []), ...(u.manual_groups || [])]));
      const groupLabels = allGroupKeys.map(k => groupNameMap.get(k) || k).filter(Boolean);
      return {
        ...u,
        groups_display: groupLabels.length > 0 ? groupLabels.join(', ') : 'Chưa có nhóm',
        status: u.enabled ? 'Hoạt động' : 'Đã khóa',
      };
    });
  }, [filteredUsers, groups]);

  return (
    <>
      <ManagementFrame
        className="h-full"
        scrollableContent={false}
        header={
          <div className="flex flex-wrap items-center justify-between w-full gap-3 py-2">
            {/* Left: Back button & Clean Typography Header */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                icon={ArrowLeft}
                disabled={busy}
                onClick={handleAttemptBack}
                title="Quay lại danh sách nhóm quyền"
              >
                Quay lại
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {draft.label || (isCreate ? 'Tạo nhóm quyền mới' : 'Chi tiết nhóm quyền')}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    @{draft.key || 'mã_nhóm'}
                  </span>
                  <span>·</span>
                  <span>{totalPermittedModules} chức năng được cấp</span>
                  <span>·</span>
                  <span>{totalPermittedActions} thao tác</span>
                  <span>·</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {selectedMemberIds.length} thành viên
                  </span>
                  <span>·</span>
                  <span>{draft.system ? 'Nhóm hệ thống' : 'Nhóm tùy chỉnh'}</span>
                  <span>·</span>
                  <span
                    className={
                      draft.enabled
                        ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                        : 'text-slate-400'
                    }
                  >
                    {draft.enabled ? 'Hoạt động' : 'Tạm ngưng'}
                  </span>
                  {isDirty && (
                    <>
                      <span>·</span>
                      <span className="text-amber-600 dark:text-amber-400 italic">
                        (Có thay đổi chưa lưu)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={handleAttemptBack}
              >
                Hủy
              </Button>

              {!isCreate && !draft.system && canDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  disabled={busy}
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 size={14} className="mr-1 inline" /> Xóa nhóm
                </Button>
              )}

              {canEdit && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy || (!isCreate && !isDirty)}
                  onClick={handleSaveClick}
                  title={!isCreate && !isDirty ? 'Không có thay đổi mới để lưu' : undefined}
                >
                  {isCreate ? 'Tạo nhóm quyền' : 'Lưu thay đổi'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        {error && (
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Full Page Content: 2-Column Split Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950">
          {/* Left Column: Basic Information (Tiêu đề ở trên - Input ở dưới, kiểu outline không bo viền) */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Thông tin cơ bản
              </h3>

              <div className="divide-y divide-slate-100 mt-4 dark:divide-slate-800">
                {/* 1. Mã nhóm quyền */}
                <div className="py-2.5 first:pt-0">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mã nhóm quyền <span className="text-rose-500">*</span>
                  </label>
                  {isCreate ? (
                    <input
                      aria-label="Mã nhóm quyền"
                      required
                      disabled={busy}
                      value={draft.key || ''}
                      onChange={e => update('key', normalizeGroupKey(e.target.value))}
                      placeholder="vd: quan_ly_dao_tao..."
                      className="w-full h-8 px-0 border-0 bg-transparent font-sans text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                    />
                  ) : (
                    <div className="h-8 flex items-center font-sans text-sm font-semibold text-slate-800 dark:text-slate-200">
                      @{draft.key}
                    </div>
                  )}
                </div>

                {/* 2. Tên nhóm quyền */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên nhóm quyền <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Tên nhóm quyền"
                    required
                    maxLength={120}
                    disabled={busy || !canEdit}
                    value={draft.label || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (isCreate && (!draft.key || draft.key === normalizeGroupKey(draft.label))) {
                        onChange({
                          ...draft,
                          label: val,
                          key: normalizeGroupKey(val),
                        });
                      } else {
                        update('label', val);
                      }
                    }}
                    placeholder="VD: Quản lý đào tạo & khảo thí"
                    className="w-full h-8 px-0 border-0 bg-transparent font-sans text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* 3. Phân loại */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phân loại
                  </label>
                  <div className="h-8 flex items-center font-sans text-sm font-medium text-slate-800 dark:text-slate-200">
                    Nhóm tùy chỉnh
                  </div>
                </div>

                {/* 4. Trạng thái */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Trạng thái
                  </label>
                  <div className="h-8 flex items-center">
                    <Select
                      size="sm"
                      searchable={false}
                      disabled={busy || !canEdit}
                      value={String(draft.enabled)}
                      onChange={e => {
                        const val = typeof e === 'object' && e?.target ? e.target.value : e;
                        update('enabled', val === 'true');
                      }}
                      options={[
                        { value: 'true', label: 'Hoạt động' },
                        { value: 'false', label: 'Tạm ngưng' },
                      ]}
                      className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                    />
                  </div>
                </div>
              </div>

                {/* Tóm tắt cấu hình */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Tóm tắt cấu hình
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-slate-500">Chức năng được cấp:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {totalPermittedModules} chức năng
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-slate-500">Tổng quyền thao tác:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {totalPermittedActions} thao tác
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-slate-500">Thành viên áp dụng:</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {selectedMemberIds.length} tài khoản
                    </span>
                  </div>
                </div>
              </div>
          </aside>

          {/* Right Column: Tab Switcher (Phân quyền chức năng | Thành viên nhóm) */}
          <main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white dark:bg-slate-950">
            {/* Tab Header - Clean Seamless Background (Matches canvas bg-white dark:bg-slate-950) */}
            <div className="flex items-center justify-between px-4 min-h-10 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
              <div className="flex items-center gap-6 -mb-px">
                <button
                  type="button"
                  onClick={() => setActiveCanvasTab('permissions')}
                  className={`py-2 text-xs border-b-2 transition-colors cursor-pointer bg-transparent ${
                    activeCanvasTab === 'permissions'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  Phân quyền chức năng ({totalPermittedModules})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCanvasTab('members')}
                  className={`py-2 text-xs border-b-2 transition-colors cursor-pointer bg-transparent ${
                    activeCanvasTab === 'members'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  Thành viên nhóm ({selectedMemberIds.length})
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                {activeCanvasTab === 'permissions'
                  ? 'Phân cấp theo module & bấm vào chức năng để tùy chỉnh quyền'
                  : `Đã chọn ${selectedMemberIds.length} / ${users.length} tài khoản`}
              </div>
            </div>

            {/* Tab 1 Content: Permission Tree with Granular Customization Modal */}
            {activeCanvasTab === 'permissions' && (
              <div className="flex-1 min-h-0 min-w-0">
                <PermissionTree
                  fill
                  hierarchy={hierarchy}
                  modules={modules}
                  value={draft.permissions}
                  disabled={busy || !canEdit}
                  onChange={permissions => update('permissions', permissions)}
                />
              </div>
            )}

            {/* Tab 2 Content: Select Users into Group */}
            {activeCanvasTab === 'members' && (
              <div className="flex flex-col flex-1 min-h-0 min-w-0">
                {/* Toolbar for User Selection */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <div className="w-64 max-w-full">
                      <SearchInput
                        size="sm"
                        placeholder="Tìm tài khoản, họ tên, vị trí…"
                        value={userSearch}
                        onChange={e => setUserSearch(typeof e === 'string' ? e : e?.target?.value ?? '')}
                        onClear={() => setUserSearch('')}
                      />
                    </div>

                    {departments.length > 0 && (
                      <Select
                        size="sm"
                        className="w-48 text-xs font-medium"
                        aria-label="Lọc theo phòng ban"
                        searchable
                        value={deptFilter}
                        onChange={e => setDeptFilter(e?.target?.value ?? e)}
                        options={[
                          { value: '', label: 'Tất cả phòng ban' },
                          ...departments.map(d => ({ value: d, label: d })),
                        ]}
                      />
                    )}

                    {(userSearch || deptFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearch('');
                          setDeptFilter('');
                        }}
                        className="h-8 w-8 shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                        title="Xóa bộ lọc tìm kiếm"
                        aria-label="Xóa bộ lọc tìm kiếm"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                    Đã chọn <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{selectedMemberIds.length}</strong> / {users.length} tài khoản
                  </div>
                </div>

                {/* Virtualized User List with Checkboxes */}
                <div className="flex-1 min-h-0 min-w-0">
                  <VirtualDataTable
                    preferenceKey="security-group-members-select"
                    columns={memberColumns}
                    rows={userRows}
                    disabled={busy || !canEdit}
                    selectedIds={selectedMemberIds}
                    onSelectedIdsChange={canEdit ? setSelectedMemberIds : undefined}
                    emptyMessage="Không có tài khoản nào phù hợp với bộ lọc."
                    renderCell={(column, row) => {
                      if (column.id === 'username') {
                        return <span className="font-mono text-xs">{row.username}</span>;
                      }
                      if (column.id === 'name') {
                        return <span className="font-medium text-slate-800 dark:text-slate-200">{row.name}</span>;
                      }
                      if (column.id === 'department') {
                        return <span className="truncate block">{row.department || '—'}</span>;
                      }
                      if (column.id === 'position') {
                        return <span className="truncate block">{row.position || '—'}</span>;
                      }
                      if (column.id === 'status') {
                        return row.enabled ? 'Hoạt động' : 'Đã khóa';
                      }
                      return row[column.id] ?? '—';
                    }}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </ManagementFrame>

      {/* Unsaved Changes Confirmation Modal */}
      <Modal
        open={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        title="Dữ liệu chưa được lưu"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowUnsavedModal(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleConfirmDiscard}
            >
              Rời khỏi không lưu
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Bạn có những thay đổi chưa được lưu. Nếu quay lại danh sách bây giờ, toàn bộ chỉnh sửa sẽ bị mất. Bạn có chắc chắn muốn quay lại?
        </p>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Xóa nhóm quyền"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setShowDeleteModal(false)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setShowDeleteModal(false);
                await onDelete(draft);
              }}
            >
              Xác nhận xóa
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Xóa nhóm <strong>{draft.label}</strong> (@{draft.key}) và thu hồi các quyền do nhóm này cấp? Các tài khoản vẫn được giữ lại.
        </p>
      </Modal>
    </>
  );
}
