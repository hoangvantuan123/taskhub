import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import { Pencil, Trash2 } from 'lucide-react';

/**
 * Normalizes a module key: lowercase, no Vietnamese accents/diacritics, no spaces.
 * Example: "Báo cáo Đào tạo" -> "bao_cao_dao_tao"
 */
const normalizeModuleKey = value => {
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
};

export default function ModuleDetailModal({
  open,
  onClose,
  module,
  isCreate = false,
  groups = [],
  hierarchy = [],
  availableActions = [],
  labels = {},
  required = ['view'],
  canUpdate = false,
  canDelete = false,
  busy = false,
  modalError = '',
  onSave,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    if (open && module) {
      setDraft({
        ...module,
        actions: [...(module.actions || [])],
        required_actions: module.required_actions || required,
      });
      setEditing(isCreate);
    }
  }, [open, module, isCreate]);

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

  // Find groups that currently have permissions on this module
  const usingGroups = useMemo(() => {
    if (!draft.key || !groups?.length) return [];
    return groups.filter(g => g.permissions?.some(p => p.module === draft.key));
  }, [draft.key, groups]);

  const handleSave = async () => {
    const cleanKey = normalizeModuleKey(draft.key);
    if (!cleanKey || !draft.label?.trim()) return;

    const cleanActions = [...new Set(draft.actions || [])];
    await onSave({
      ...draft,
      key: cleanKey,
      label: draft.label.trim(),
      actions: cleanActions,
    });
    if (!isCreate) {
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    if (isCreate) {
      onClose();
    } else {
      setDraft({
        ...module,
        actions: [...(module.actions || [])],
      });
      setEditing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={isCreate ? 'Đăng ký chức năng mới' : 'Chi tiết chức năng & phân quyền'}
      size="2xl"
      fitContent={true}
      maxWidth="960px"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>
            {isCreate ? 'Hủy' : 'Đóng'}
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {editing && (
              <>
                {!isCreate && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={handleCancelEdit}>
                    Hủy sửa
                  </Button>
                )}
                <Button size="sm" loading={busy} onClick={handleSave}>
                  {isCreate ? 'Đăng ký chức năng' : 'Lưu thay đổi'}
                </Button>
              </>
            )}

            {!editing && !isCreate && !draft.system && canDelete && (
              <Button
                size="sm"
                variant="outline"
                className="text-rose-600 dark:text-rose-400"
                disabled={busy}
                onClick={() => onDelete(draft)}
              >
                <Trash2 size={14} className="mr-1 inline" /> Xóa chức năng
              </Button>
            )}

            {canUpdate && !editing && (
              <Button size="sm" onClick={() => setEditing(true)}>
                Chỉnh sửa
              </Button>
            )}
          </div>
        </div>
      }
    >
      {modalError && <p role="alert" className="mb-3 text-sm text-red-600">{modalError}</p>}

      <div className="space-y-5">
        {/* Module Header - Pure Clean Typography, Zero Tag Badges, Zero Icon Boxes */}
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {draft.label || (isCreate ? 'Đăng ký chức năng mới' : '—')}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono text-slate-700 dark:text-slate-300">@{draft.key || 'mã_chức_năng'}</span>
              <span>·</span>
              <span>{(draft.actions || []).length} thao tác</span>
              <span>·</span>
              <span>Phân hệ: {parentCategoryName}</span>
              <span>·</span>
              <span>{draft.system ? 'Chức năng hệ thống' : 'Chức năng tùy chỉnh'}</span>
              <span>·</span>
              <span className={draft.enabled ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                {draft.enabled ? 'Hoạt động' : 'Tạm ngưng'}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left Column: Basic Information */}
          <section className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Thông tin cơ bản
            </h3>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Module Key */}
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                <dt className="text-slate-500">Mã chức năng</dt>
                <dd className="min-w-0">
                  {isCreate ? (
                    <div className="flex items-center gap-2">
                      <input
                        aria-label="Mã chức năng"
                        required
                        disabled={busy}
                        value={draft.key || ''}
                        onChange={e =>
                          setDraft({
                            ...draft,
                            key: normalizeModuleKey(e.target.value),
                          })
                        }
                        placeholder="vd: reports, exam_levels..."
                        className="h-8.5 w-full min-w-0 border-0 bg-transparent px-0 font-mono text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                      />
                      <Pencil size={13} className="shrink-0 text-slate-400" />
                    </div>
                  ) : (
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 wrap-break-word">
                      {draft.key}
                    </span>
                  )}
                </dd>
              </div>

              {/* Module Label */}
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                <dt className="text-slate-500">Tên hiển thị</dt>
                <dd className="min-w-0">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        aria-label="Tên chức năng"
                        required
                        maxLength={120}
                        disabled={busy}
                        value={draft.label || ''}
                        onChange={e => setDraft({ ...draft, label: e.target.value })}
                        placeholder="VD: Báo cáo đào tạo"
                        className="h-8.5 w-full min-w-0 border-0 bg-transparent px-0 text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                      />
                      <Pencil size={13} className="shrink-0 text-slate-400" />
                    </div>
                  ) : (
                    <span className="font-medium text-slate-800 dark:text-slate-200 wrap-break-word">
                      {draft.label || '—'}
                    </span>
                  )}
                </dd>
              </div>

              {/* Phân hệ trực thuộc */}
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                <dt className="text-slate-500">Phân hệ trực thuộc</dt>
                <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-200">
                  {parentCategoryName}
                </dd>
              </div>

              {/* Phân loại */}
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                <dt className="text-slate-500">Phân loại</dt>
                <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-200">
                  {draft.system ? 'Chức năng hệ thống' : 'Chức năng tùy chỉnh'}
                </dd>
              </div>

              {/* Trạng thái hoạt động */}
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                <dt className="text-slate-500">Trạng thái</dt>
                <dd className="min-w-0">
                  {editing && !draft.system ? (
                    <div className="flex items-center gap-2">
                      <Select
                        size="sm"
                        className="w-full [&>button]:min-h-0! [&>button]:rounded-none! [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:py-1! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:hover:border-0! [&>button]:hover:bg-transparent!"
                        aria-label="Trạng thái chức năng"
                        disabled={busy}
                        value={String(draft.enabled)}
                        onChange={e =>
                          setDraft({
                            ...draft,
                            enabled: (e?.target?.value ?? e) === 'true',
                          })
                        }
                        options={[
                          { value: 'true', label: 'Hoạt động' },
                          { value: 'false', label: 'Tạm ngưng' },
                        ]}
                      />
                      <Pencil size={13} className="shrink-0 text-slate-400" />
                    </div>
                  ) : (
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {draft.enabled ? 'Hoạt động' : 'Tạm ngưng'}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* Right Column: Thao tác & Nhóm quyền */}
          <div className="min-w-0 space-y-5">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Thao tác có trong danh mục
              </h3>

              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                {editing ? (
                  <div className="py-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {availableActions.map(a => {
                        const isRequired = (draft.required_actions || required).includes(a);
                        const isChecked = Boolean(draft.actions?.includes(a));
                        return (
                          <label
                            key={a}
                            className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:text-emerald-600 select-none py-0.5"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                              disabled={isRequired || busy}
                              checked={isChecked}
                              onChange={e => {
                                const next = e.target.checked
                                  ? [...(draft.actions || []), a]
                                  : (draft.actions || []).filter(v => v !== a);
                                setDraft({ ...draft, actions: next });
                              }}
                            />
                            <span className="truncate">{labels[a] || a}</span>
                            {isRequired && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 italic shrink-0">
                                [Bắt buộc]
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  (draft.actions || []).length ? (
                    (draft.actions || []).map(a => (
                      <div
                        key={a}
                        className="grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm"
                      >
                        <dt className="text-slate-700 dark:text-slate-300 font-medium">{labels[a] || a}</dt>
                        <dd className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                          {(draft.required_actions || required).includes(a) ? (
                            <span className="text-amber-700 dark:text-amber-400 font-medium">
                              [Bắt buộc]
                            </span>
                          ) : (
                            'Đã kích hoạt'
                          )}
                        </dd>
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-sm text-slate-500">Chưa cấu hình thao tác nào.</div>
                  )
                )}
              </dl>
            </section>

            {/* Nhóm quyền có hiệu lực */}
            <section className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Nhóm quyền có hiệu lực
                </h3>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {usingGroups.length ? (
                  usingGroups.map(g => (
                    <span key={g.key} className="text-sm text-slate-800 dark:text-slate-200">
                      <span className="text-emerald-600 mr-1">•</span>
                      {g.label}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Chưa thuộc nhóm quyền nào.</span>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Modal>
  );
}
