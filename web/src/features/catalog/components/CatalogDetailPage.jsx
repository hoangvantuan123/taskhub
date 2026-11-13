import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  RotateCcw,
  Check,
} from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import SearchInput from '../../../shared/ui/SearchInput';
import { attributeCatalog } from '../services/attributeCatalog';
import { normalizeOptionSearch } from '../../../shared/lib/searchOptions';
import { notify } from '../../../shared/lib/notify';

/**
 * Deep comparison of catalog draft to detect unsaved changes
 */
function isCatalogDraftEqual(a, b) {
  if (!a || !b) return a === b;
  if ((a.label || '').trim() !== (b.label || '').trim()) return false;
  const optsA = a.options || [];
  const optsB = b.options || [];
  if (optsA.length !== optsB.length) return false;
  return optsA.every((opt, idx) => {
    const oB = optsB[idx];
    if (!oB) return false;
    if ((opt.value || '').trim() !== (oB.value || '').trim()) return false;
    if ((opt.label || '').trim() !== (oB.label || '').trim()) return false;
    if (Boolean(opt.active) !== Boolean(oB.active)) return false;
    if ((opt.parentId || '') !== (oB.parentId || '')) return false;
    return true;
  });
}

export default function CatalogDetailPage({
  catalogKey,
  onBack,
  canEdit = true,
}) {
  const [draft, setDraft] = useState(null);
  const [savedCodes, setSavedCodes] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Store snapshot for dirty checking
  const initialDraftRef = useRef(null);

  // Load catalog options
  useEffect(() => {
    let active = true;
    setDraft(null);
    setError('');
    initialDraftRef.current = null;

    Promise.all([
      attributeCatalog.get(catalogKey),
      ...(catalogKey === 'question_topic' ? [attributeCatalog.get('specialty')] : []),
    ])
      .then(([{ data }, parentData]) => {
        if (!active) return;
        const parents = parentData?.data.options || [];
        const firstActiveParent = parents.find(option => option.active);
        setParentOptions(parents);

        const loadedDraft = {
          ...data,
          options: (data.options || []).map(option => ({
            ...option,
            parentId: option.parentId || firstActiveParent?.id || '',
            active: option.active !== false,
          })),
        };
        setDraft(loadedDraft);
        setSavedCodes((data.options || []).map(option => option.value));
        initialDraftRef.current = JSON.parse(JSON.stringify(loadedDraft));
      })
      .catch(failure => {
        if (active) setError(failure.message);
      });

    return () => {
      active = false;
    };
  }, [catalogKey]);

  // Dirty state checking
  const isDirty = useMemo(() => {
    return !isCatalogDraftEqual(draft, initialDraftRef.current);
  }, [draft]);

  // Warn on browser reload if dirty
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

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && !showUnsavedModal) {
        handleAttemptBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, showUnsavedModal]);

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

  const updateOption = (index, patch) => {
    setDraft(previous => ({
      ...previous,
      options: previous.options.map((option, position) =>
        position === index ? { ...option, ...patch } : option
      ),
    }));
  };

  const handleAddOption = () => {
    const firstActiveParent = parentOptions.find(p => p.active);
    setDraft(previous => ({
      ...previous,
      options: [
        ...previous.options,
        {
          value: '',
          label: '',
          active: true,
          ...(catalogKey === 'question_topic' ? { parentId: firstActiveParent?.id || '' } : {}),
        },
      ],
    }));
  };

  const handleRemoveOption = index => {
    setDraft(previous => ({
      ...previous,
      options: previous.options.filter((_, position) => position !== index),
    }));
  };

  const handleSave = async () => {
    if (saving || !draft) return;
    setSaving(true);
    setError('');

    try {
      await attributeCatalog.save(catalogKey, draft);
      notify(`Đã lưu cấu hình danh mục "${draft.label}".`, 'success');
      initialDraftRef.current = JSON.parse(JSON.stringify(draft));
      setSavedCodes(draft.options.map(option => option.value));
    } catch (failure) {
      setError(failure.message || 'Lỗi khi lưu danh mục');
      notify(failure.message || 'Thao tác không thành công', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter options based on user search
  const filteredIndices = useMemo(() => {
    if (!draft?.options) return [];
    const q = normalizeOptionSearch(search);
    return draft.options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => {
        if (!q) return true;
        const parent = parentOptions.find(p => p.id === option.parentId);
        const parentLabel = parent?.label || '';
        return normalizeOptionSearch(
          [option.value, option.label, parentLabel, option.active ? 'sử dụng' : 'ngừng'].join(' ')
        ).includes(q);
      })
      .map(({ index }) => index);
  }, [draft?.options, search, parentOptions]);

  const activeCount = useMemo(() => {
    return (draft?.options || []).filter(o => o.active).length;
  }, [draft?.options]);

  const totalCount = draft?.options?.length || 0;

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
                disabled={saving}
                onClick={handleAttemptBack}
                title="Quay lại danh mục"
              >
                Quay lại
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {draft?.label ? `Cấu hình danh mục · ${draft.label}` : 'Cấu hình danh mục'}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    @{catalogKey}
                  </span>
                  <span>·</span>
                  <span>{totalCount} giá trị lựa chọn</span>
                  <span>·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    {activeCount} đang sử dụng
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
                disabled={saving}
                onClick={handleAttemptBack}
              >
                Hủy
              </Button>

              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  disabled={saving || !draft}
                  onClick={handleAddOption}
                >
                  Thêm giá trị
                </Button>
              )}

              {canEdit && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={saving || !draft || !isDirty}
                  onClick={handleSave}
                  title={!isDirty ? 'Không có thay đổi mới để lưu' : undefined}
                >
                  Lưu danh mục
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

        {/* Full Page Content: 2-Column Split Layout Edge-to-Edge */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950">
          {/* Left Column: Attribute Information (Seamless outline typography without boxed cards) */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Thông tin thuộc tính
              </h3>

              <div className="divide-y divide-slate-100 mt-4 dark:divide-slate-800">
                {/* 1. Mã thuộc tính */}
                <div className="py-2.5 first:pt-0">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mã thuộc tính
                  </label>
                  <div className="h-8 flex items-center font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                    @{catalogKey}
                  </div>
                </div>

                {/* 2. Tên thuộc tính */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên thuộc tính <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Tên thuộc tính"
                    required
                    maxLength={120}
                    disabled={saving || !canEdit || !draft}
                    value={draft?.label || ''}
                    onChange={e => setDraft(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="VD: Cấp bậc, Phòng ban..."
                    className="w-full h-8 px-0 border-0 bg-transparent font-sans text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* 3. Phạm vi sử dụng */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Quy định dữ liệu
                  </label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Mã danh mục là khóa duy nhất, không thể chỉnh sửa sau khi đã được lưu trên hệ thống để đảm bảo tính toàn vẹn dữ liệu.
                  </p>
                </div>
              </div>
            </div>

            {/* Tóm tắt cấu hình */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Tóm tắt cấu hình
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-500">Tổng số giá trị:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {totalCount} mục
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-500">Đang sử dụng:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {activeCount} mục
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-500">Ngừng sử dụng:</span>
                <span className="font-semibold text-slate-500">
                  {totalCount - activeCount} mục
                </span>
              </div>
            </div>
          </aside>

          {/* Right Column: Values Registry Table (Edge-to-Edge Canvas) */}
          <main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white dark:bg-slate-950">
            {/* Table Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Danh sách giá trị danh mục
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-xs text-slate-500">
                  Hiển thị {filteredIndices.length} / {totalCount} mục
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-64 max-w-full">
                  <SearchInput
                    size="sm"
                    value={search}
                    onChange={e => setSearch(typeof e === 'string' ? e : e?.target?.value ?? '')}
                    onClear={() => setSearch('')}
                    placeholder="Tìm mã hoặc tên giá trị…"
                  />
                </div>

                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Plus}
                    disabled={saving || !draft}
                    onClick={handleAddOption}
                  >
                    Thêm dòng
                  </Button>
                )}
              </div>
            </div>

            {/* Edge-to-Edge Values Table */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {!draft ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Đang tải cấu hình danh mục…
                </div>
              ) : (
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider select-none">
                    <tr>
                      <th scope="col" className="w-48 px-6 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        Mã giá trị
                      </th>
                      <th scope="col" className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        Tên hiển thị
                      </th>
                      {catalogKey === 'question_topic' && (
                        <th scope="col" className="w-64 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                          Chuyên môn liên kết
                        </th>
                      )}
                      <th scope="col" className="w-32 px-4 py-2.5 text-center bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        Sử dụng
                      </th>
                      {canEdit && (
                        <th scope="col" className="w-20 px-6 py-2.5 text-right bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                          Xóa
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                    {filteredIndices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={catalogKey === 'question_topic' ? 5 : 4}
                          className="py-12 text-center text-slate-500"
                        >
                          Không tìm thấy giá trị nào khớp với &ldquo;{search}&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      filteredIndices.map(index => {
                        const option = draft.options[index];
                        const isSaved = savedCodes.includes(option.value);

                        return (
                          <tr
                            key={index}
                            className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                          >
                            {/* Mã giá trị */}
                            <td className="px-6 py-2.5">
                              {isSaved ? (
                                <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {option.value}
                                </span>
                              ) : (
                                <input
                                  aria-label={`Mã giá trị dòng ${index + 1}`}
                                  required
                                  disabled={saving || !canEdit}
                                  value={option.value || ''}
                                  onChange={e =>
                                    updateOption(
                                      index,
                                      { value: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }
                                    )
                                  }
                                  placeholder="ma_gia_tri"
                                  className="w-full h-8 px-0 border-0 bg-transparent font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                                />
                              )}
                            </td>

                            {/* Tên hiển thị */}
                            <td className="px-4 py-2.5">
                              <input
                                aria-label={`Tên giá trị dòng ${index + 1}`}
                                required
                                disabled={saving || !canEdit}
                                value={option.label || ''}
                                onChange={e => updateOption(index, { label: e.target.value })}
                                placeholder="Nhập tên hiển thị..."
                                className="w-full h-8 px-0 border-0 bg-transparent font-sans text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                              />
                            </td>

                            {/* Chuyên môn liên kết (Cho question_topic) */}
                            {catalogKey === 'question_topic' && (
                              <td className="px-4 py-2.5">
                                <Select
                                  size="sm"
                                  searchable
                                  disabled={saving || !canEdit}
                                  value={option.parentId || ''}
                                  onChange={e => updateOption(index, { parentId: e?.target?.value ?? e })}
                                  options={[
                                    { value: '', label: 'Chọn chuyên môn' },
                                    ...parentOptions.map(p => ({
                                      value: p.id,
                                      label: p.label + (p.active ? '' : ' (Ngừng sử dụng)'),
                                    })),
                                  ]}
                                  className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                                />
                              </td>
                            )}

                            {/* Trạng thái sử dụng */}
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="checkbox"
                                aria-label={`Sử dụng ${option.label || option.value}`}
                                disabled={saving || !canEdit}
                                checked={option.active}
                                onChange={e => updateOption(index, { active: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* Nút xóa */}
                            {canEdit && (
                              <td className="px-6 py-2.5 text-right">
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleRemoveOption(index)}
                                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-40"
                                >
                                  Xóa
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
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
              disabled={saving}
              onClick={() => setShowUnsavedModal(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={saving}
              onClick={handleConfirmLeave}
            >
              Rời khỏi trang
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Bạn có những thay đổi danh mục chưa được lưu. Nếu quay lại danh sách bây giờ, toàn bộ chỉnh sửa sẽ bị mất. Bạn có chắc chắn muốn quay lại?
        </p>
      </Modal>
    </>
  );
}
