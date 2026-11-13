import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Trash2, Search, RotateCcw, Plus, Check } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import SearchInput from '../../../shared/ui/SearchInput';
import { normalizeOptionSearch } from '../../../shared/lib/searchOptions';

/**
 * Standard metadata dictionary for known module operations
 */
export const ACTION_METADATA = {
  view: {
    label: 'Xem dữ liệu',
    group: 'Dữ liệu cơ bản',
    description: 'Xem thông tin, tra cứu danh sách và xem chi tiết dữ liệu',
  },
  create: {
    label: 'Thêm mới',
    group: 'Dữ liệu cơ bản',
    description: 'Tạo mới bản ghi, biểu mẫu hoặc đăng ký dữ liệu mới',
  },
  update: {
    label: 'Chỉnh sửa',
    group: 'Dữ liệu cơ bản',
    description: 'Chỉnh sửa, cập nhật nội dung hoặc thay đổi trạng thái',
  },
  delete: {
    label: 'Xóa',
    group: 'Dữ liệu cơ bản',
    description: 'Xóa bỏ bản ghi hoặc loại bỏ dữ liệu khỏi hệ thống',
  },
  import: {
    label: 'Nhập dữ liệu',
    group: 'Vào / Ra dữ liệu',
    description: 'Nhập dữ liệu hàng loạt từ file Excel, CSV hoặc JSON',
  },
  export: {
    label: 'Xuất dữ liệu',
    group: 'Vào / Ra dữ liệu',
    description: 'Xuất danh sách và báo cáo dữ liệu ra file Excel hoặc JSON',
  },
  approve: {
    label: 'Phê duyệt',
    group: 'Quy trình & Quản trị',
    description: 'Duyệt hoặc từ chối đề xuất, bài nộp, nội dung hoặc yêu cầu',
  },
  publish: {
    label: 'Xuất bản',
    group: 'Quy trình & Quản trị',
    description: 'Công khai, phát hành nội dung cho học viên hoặc người dùng',
  },
  assign: {
    label: 'Phân công',
    group: 'Quy trình & Quản trị',
    description: 'Giao bài tập, phân bổ quyền hạn hoặc chỉ định người phụ trách',
  },
  archive: {
    label: 'Lưu trữ',
    group: 'Quy trình & Quản trị',
    description: 'Đóng băng, chuyển dữ liệu vào kho lưu trữ lịch sử',
  },
  take: {
    label: 'Làm bài thi',
    group: 'Nghiệp vụ đào tạo',
    description: 'Truy cập phòng thi, thực hiện bài kiểm tra hoặc khảo sát',
  },
  run: {
    label: 'Luyện tập',
    group: 'Nghiệp vụ đào tạo',
    description: 'Chạy thử nghiệm mô phỏng, ôn luyện hoặc thi thử',
  },
};

/**
 * Normalizes a module key: lowercase, no Vietnamese accents/diacritics, no spaces.
 * Example: "Báo cáo Đào tạo" -> "bao_cao_dao_tao"
 */
export function normalizeModuleKey(value) {
  if (!value) return '';
  return value
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
 * Compares two module drafts for equality to detect unsaved changes
 */
function isModuleDraftEqual(a, b) {
  if (!a || !b) return a === b;
  if ((a.key || '') !== (b.key || '')) return false;
  if ((a.label || '') !== (b.label || '')) return false;
  if (Boolean(a.enabled) !== Boolean(b.enabled)) return false;

  const actsA = Array.isArray(a.actions) ? [...a.actions].sort() : [];
  const actsB = Array.isArray(b.actions) ? [...b.actions].sort() : [];
  if (actsA.length !== actsB.length) return false;
  return actsA.every((act, idx) => act === actsB[idx]);
}

export default function ModuleDetailPage({
  draft,
  onChange,
  onSave,
  onDelete,
  onBack,
  isCreate = false,
  hierarchy = [],
  availableActions = [],
  labels = {},
  required = ['view'],
  busy = false,
  canEdit = true,
  canDelete = false,
}) {
  // Store initial snapshot for dirty checking
  const initialDraftRef = useRef(null);
  if (!initialDraftRef.current && draft) {
    initialDraftRef.current = {
      ...draft,
      actions: [...(draft.actions || [])],
      required_actions: draft.required_actions || required,
    };
  }

  const [actionSearch, setActionSearch] = useState('');
  const [customActionInput, setCustomActionInput] = useState('');
  const [customActionError, setCustomActionError] = useState('');
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState('');

  // Check if draft has unsaved changes
  const isDirty = useMemo(() => {
    return !isModuleDraftEqual(draft, initialDraftRef.current);
  }, [draft]);

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
      if (e.key === 'Escape' && !showUnsavedModal && !showDeleteModal) {
        handleAttemptBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, showUnsavedModal, showDeleteModal]);

  const handleAttemptBack = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    onBack();
  };

  const handleSaveClick = async () => {
    setError('');
    if (!draft.label?.trim()) {
      setError('Tên hiển thị chức năng không được để trống.');
      return;
    }
    const cleanKey = isCreate
      ? normalizeModuleKey(draft.key || draft.label)
      : draft.key;

    if (!cleanKey || cleanKey.length < 2) {
      setError('Mã chức năng cần tối thiểu 2 ký tự hợp lệ.');
      return;
    }

    const cleanActions = Array.from(new Set(draft.actions || [])).filter(Boolean);
    const req = draft.required_actions || required;
    for (const r of req) {
      if (!cleanActions.includes(r)) {
        cleanActions.push(r);
      }
    }

    try {
      const payload = {
        ...draft,
        key: cleanKey,
        label: draft.label.trim(),
        actions: cleanActions,
      };
      await onSave(payload);
      initialDraftRef.current = {
        ...payload,
        actions: [...payload.actions],
      };
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu chức năng');
    }
  };

  const update = (key, value) => {
    onChange({ ...draft, [key]: value });
  };

  // Determine parent category from hierarchy data
  const parentCategoryName = useMemo(() => {
    if (!draft.key || !hierarchy?.length) return '—';
    for (const parent of hierarchy) {
      if (parent.children?.some(c => c.key === draft.key || c.id === draft.key)) {
        return parent.name || parent.label || parent.key;
      }
    }
    return 'Phân hệ cấp cao';
  }, [draft.key, hierarchy]);

  // Combine available actions and any custom actions present in draft
  const allActionKeys = useMemo(() => {
    const set = new Set([...availableActions, ...(draft.actions || [])]);
    return Array.from(set);
  }, [availableActions, draft.actions]);

  // Filtered action list based on user search
  const filteredActionList = useMemo(() => {
    const q = normalizeOptionSearch(actionSearch);
    return allActionKeys.filter(action => {
      if (!q) return true;
      const meta = ACTION_METADATA[action] || {};
      const actionLabel = labels[action] || meta.label || action;
      const group = meta.group || 'Khác';
      const desc = meta.description || '';
      return normalizeOptionSearch([action, actionLabel, group, desc].join(' ')).includes(q);
    });
  }, [allActionKeys, actionSearch, labels]);

  // Action quick handlers
  const handleOnlyView = () => {
    const req = draft.required_actions || required;
    update('actions', [...req]);
  };

  const handleDefaultCrud = () => {
    const defaultActions = ['view', 'create', 'update', 'delete', 'import', 'export'].filter(a =>
      allActionKeys.includes(a)
    );
    update('actions', defaultActions);
  };

  const handleSelectAllFiltered = () => {
    const current = new Set(draft.actions || []);
    filteredActionList.forEach(a => current.add(a));
    update('actions', Array.from(current));
  };

  const handleDeselectAllFiltered = () => {
    const req = new Set(draft.required_actions || required);
    const toRemove = new Set(filteredActionList.filter(a => !req.has(a)));
    const next = (draft.actions || []).filter(a => !toRemove.has(a));
    update('actions', next);
  };

  const toggleAction = action => {
    const isRequired = (draft.required_actions || required).includes(action);
    if (isRequired || !canEdit || busy) return;
    const current = draft.actions || [];
    const next = current.includes(action)
      ? current.filter(a => a !== action)
      : [...current, action];
    update('actions', next);
  };

  const handleAddCustomAction = () => {
    const clean = customActionInput.trim().toLowerCase();
    if (!clean) return;
    if (!/^[a-z][a-z0-9_]{1,31}$/.test(clean)) {
      setCustomActionError('Mã thao tác cần 2–32 ký tự: chữ thường, số hoặc _, bắt đầu bằng chữ.');
      return;
    }
    if (allActionKeys.includes(clean)) {
      setCustomActionError('Mã thao tác này đã có trong danh mục.');
      return;
    }
    const next = [...(draft.actions || []), clean];
    update('actions', next);
    setCustomActionInput('');
    setCustomActionError('');
  };

  // Check if all filtered are selected
  const isAllFilteredSelected = useMemo(() => {
    if (!filteredActionList.length) return false;
    const currentSet = new Set(draft.actions || []);
    return filteredActionList.every(a => currentSet.has(a));
  }, [filteredActionList, draft.actions]);

  const reqCount = (draft.required_actions || required).length;
  const activeCount = (draft.actions || []).length;

  return (
    <>
      <ManagementFrame
        className="h-full"
        scrollableContent={false}
        header={
          <div className="flex flex-wrap items-center justify-between w-full gap-3 py-2">
            {/* Left: Back button & Header Info */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                icon={ArrowLeft}
                disabled={busy}
                onClick={handleAttemptBack}
                title="Quay lại danh mục chức năng"
              >
                Quay lại
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {draft.label || (isCreate ? 'Đăng ký chức năng mới' : 'Chi tiết chức năng')}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    @{draft.key || 'mã_chức_năng'}
                  </span>
                  <span>·</span>
                  <span>{activeCount} thao tác kích hoạt</span>
                  <span>·</span>
                  <span>Phân hệ: {parentCategoryName}</span>
                  <span>·</span>
                  <span>{draft.system ? 'Chức năng hệ thống' : 'Chức năng tùy chỉnh'}</span>
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
                  <Trash2 size={14} className="mr-1 inline" /> Xóa chức năng
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
                  {isCreate ? 'Đăng ký chức năng' : 'Lưu thay đổi'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="flex h-full w-full min-h-0 min-w-0 overflow-hidden">
          {/* Left Column: Module Information Panel (Fixed 360px) */}
          <aside className="w-80 lg:w-[360px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col min-h-0 overflow-y-auto">
            <div className="p-4 lg:p-5 space-y-5">
              {error && (
                <div role="alert" className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                  Thông tin chức năng
                </h3>

                <div className="space-y-4">
                  {/* Module Label */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tên hiển thị <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      disabled={!canEdit || busy}
                      value={draft.label || ''}
                      onChange={e => {
                        const newLabel = e.target.value;
                        if (isCreate && (!draft.key || draft.key === normalizeModuleKey(draft.label))) {
                          onChange({
                            ...draft,
                            label: newLabel,
                            key: normalizeModuleKey(newLabel),
                          });
                        } else {
                          update('label', newLabel);
                        }
                      }}
                      placeholder="VD: Báo cáo đào tạo"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
                    />
                  </div>

                  {/* Module Key */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Mã chức năng (Key) <span className="text-rose-500">*</span>
                    </label>
                    {isCreate ? (
                      <input
                        type="text"
                        required
                        disabled={!canEdit || busy}
                        value={draft.key || ''}
                        onChange={e => update('key', normalizeModuleKey(e.target.value))}
                        placeholder="vd: reports, exam_levels..."
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-sm text-slate-800 dark:text-slate-200 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
                      />
                    ) : (
                      <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm font-medium text-slate-800 dark:text-slate-200 break-all select-all">
                        {draft.key}
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-slate-500">
                      {isCreate
                        ? 'Tự động tạo từ tên hiển thị, viết thường, ngăn cách bằng dấu _'
                        : 'Mã định danh duy nhất của chức năng trên hệ thống'}
                    </p>
                  </div>

                  {/* Phân hệ trực thuộc */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Phân hệ trực thuộc
                    </label>
                    <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {parentCategoryName}
                    </div>
                  </div>

                  {/* Phân loại */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Phân loại chức năng
                    </label>
                    <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300">
                      {draft.system ? 'Chức năng cốt lõi hệ thống' : 'Chức năng tùy chỉnh / Nghiệp vụ'}
                    </div>
                  </div>

                  {/* Trạng thái hoạt động */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Trạng thái hoạt động
                    </label>
                    <Select
                      size="sm"
                      className="w-full text-xs font-medium"
                      aria-label="Trạng thái chức năng"
                      disabled={!canEdit || busy || draft.system}
                      value={String(draft.enabled)}
                      onChange={e => update('enabled', (e?.target?.value ?? e) === 'true')}
                      options={[
                        { value: 'true', label: 'Hoạt động' },
                        { value: 'false', label: 'Tạm ngưng' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Action Summary Card */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Tóm tắt cấu hình
                </div>
                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-slate-500">Thao tác kích hoạt:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {activeCount} / {allActionKeys.length} thao tác
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-slate-500">Thao tác bắt buộc:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {(draft.required_actions || required).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-slate-500">Thao tác tùy chọn:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {Math.max(0, activeCount - reqCount)} thao tác
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Actions Registry Table (Full Height Canvas) */}
          <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-slate-950 overflow-hidden">
            {/* Toolbar Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-64 max-w-full">
                  <SearchInput
                    size="sm"
                    value={actionSearch}
                    onChange={e => setActionSearch(typeof e === 'string' ? e : e?.target?.value ?? '')}
                    onClear={() => setActionSearch('')}
                    placeholder="Tìm thao tác, mã @action, nhóm…"
                  />
                </div>
                <span className="text-xs text-slate-500">
                  Hiển thị {filteredActionList.length} / {allActionKeys.length} thao tác
                </span>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleOnlyView}
                    className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:underline font-medium cursor-pointer"
                  >
                    Chỉ chọn Xem
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={handleDefaultCrud}
                    className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:underline font-medium cursor-pointer"
                  >
                    Mặc định (CRUD)
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="text-rose-600 hover:underline font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>

            {/* Table Container */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider select-none">
                  <tr>
                    <th scope="col" className="w-12 px-4 py-2.5 text-center bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      <input
                        type="checkbox"
                        disabled={!canEdit || busy}
                        checked={isAllFilteredSelected}
                        onChange={e => {
                          if (e.target.checked) {
                            handleSelectAllFiltered();
                          } else {
                            handleDeselectAllFiltered();
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                        title={isAllFilteredSelected ? 'Bỏ chọn toàn bộ' : 'Chọn toàn bộ thao tác đang lọc'}
                      />
                    </th>
                    <th scope="col" className="w-48 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      Tên thao tác
                    </th>
                    <th scope="col" className="w-36 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      Mã kỹ thuật
                    </th>
                    <th scope="col" className="w-44 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      Phân nhóm
                    </th>
                    <th scope="col" className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      Mô tả quyền hạn
                    </th>
                    <th scope="col" className="w-28 px-4 py-2.5 text-right bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      Ràng buộc
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {filteredActionList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Không tìm thấy thao tác nào khớp với từ khóa &ldquo;{actionSearch}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredActionList.map(action => {
                      const isRequired = (draft.required_actions || required).includes(action);
                      const isChecked = Boolean((draft.actions || []).includes(action));
                      const meta = ACTION_METADATA[action] || {};
                      const actionLabel = labels[action] || meta.label || action;
                      const actionGroup = meta.group || 'Thao tác mở rộng';
                      const actionDesc = meta.description || 'Thao tác nghiệp vụ riêng của module';

                      return (
                        <tr
                          key={action}
                          onClick={() => toggleAction(action)}
                          className={`transition-colors cursor-pointer select-none ${
                            isChecked
                              ? 'bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                          } ${!canEdit || isRequired ? 'cursor-default' : ''}`}
                        >
                          {/* Checkbox */}
                          <td
                            className="px-4 py-3 text-center"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              disabled={!canEdit || isRequired || busy}
                              checked={isChecked}
                              onChange={() => toggleAction(action)}
                              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Tên thao tác */}
                          <td className="px-3 py-3">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {actionLabel}
                            </span>
                          </td>

                          {/* Mã kỹ thuật (@action) */}
                          <td className="px-3 py-3 font-mono text-xs">
                            <span className="text-slate-700 dark:text-slate-300">
                              @{action}
                            </span>
                          </td>

                          {/* Phân nhóm */}
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400">
                            {actionGroup}
                          </td>

                          {/* Mô tả quyền hạn */}
                          <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                            {actionDesc}
                          </td>

                          {/* Ràng buộc */}
                          <td className="px-4 py-3 text-right">
                            {isRequired ? (
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                [Bắt buộc]
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Tùy chọn
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Custom Action Adder at bottom */}
            {canEdit && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                    <input
                      type="text"
                      disabled={busy}
                      value={customActionInput}
                      onChange={e => {
                        setCustomActionInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                        setCustomActionError('');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomAction();
                        }
                      }}
                      placeholder="Thêm mã thao tác mở rộng mới (vd: sync, lock, audit, reset)..."
                      className="h-8 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 font-mono text-xs text-slate-800 dark:text-slate-200 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !customActionInput.trim()}
                      onClick={handleAddCustomAction}
                    >
                      <Plus size={14} className="mr-1 inline" /> Thêm thao tác
                    </Button>
                  </div>
                  {customActionError && (
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {customActionError}
                    </span>
                  )}
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
        title="Thay đổi chưa được lưu"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setShowUnsavedModal(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={handleConfirmLeave}
            >
              Rời khỏi trang
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Bạn có những thay đổi chức năng chưa được lưu. Nếu quay lại danh sách bây giờ, toàn bộ chỉnh sửa sẽ bị mất. Bạn có chắc chắn muốn quay lại?
        </p>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Xác nhận xóa chức năng"
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
          Bạn có chắc chắn muốn xóa chức năng <strong>{draft.label}</strong> (<code>{draft.key}</code>) và toàn bộ các quyền đã cấp cho chức năng này không? Thao tác này không thể hoàn tác.
        </p>
      </Modal>
    </>
  );
}
