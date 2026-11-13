import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import FilterToggleMenu from '../../../shared/ui/FilterToggleMenu';
import Button from '../../../shared/ui/Button';
import Modal from '../../../shared/ui/Modal';
import { notify } from '../../../shared/lib/notify';
import { normalizeOptionSearch } from '../../../shared/lib/searchOptions';
import {
  hydratePermissionHierarchy,
  flattenPermissionHierarchy,
  permissionTreeChildren,
  setBranchPermissions,
  toggleTreeAction,
  actionLabels,
} from '../permissionTree';
import { useMenuPreferences } from '../../../shared/lib/tablePreferences';

// Strict Plain Text Table Columns
const columns = [
  { id: 'name', label: 'Module / Nhóm menu / Chức năng', width: 240, minWidth: 180 },
  { id: 'kind', label: 'Loại', width: 95, minWidth: 80 },
  { id: 'route', label: 'Đường dẫn / Mã quyền', width: 140, minWidth: 110 },
  { id: 'permissions_summary', label: 'Quyền được cấp', width: 190, minWidth: 140 },
  { id: 'status', label: 'Trạng thái', width: 85, minWidth: 70 },
  { id: 'actions_col', label: 'Thao tác', width: 75, minWidth: 65 },
];

function Check({ partial, ...props }) {
  return (
    <input
      {...props}
      type="checkbox"
      className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
      ref={node => {
        if (node) node.indeterminate = !props.checked && !!partial;
      }}
    />
  );
}

/**
 * Standardized Detail Modal for Granular Permission Customization
 * Adheres 100% to SkillHub UI Design Standard (same design language as ModuleDetailModal):
 * Pure clean typography, zero tag badges, 2-column info grid, text-based action toggles.
 */
function AdjustPermissionModal({
  open,
  onClose,
  row,
  value = [],
  onChange,
  disabled = false,
}) {
  const targets = useMemo(() => {
    if (!row) return [];
    return (row.targets || []).filter(
      module => module.enabled && module.registered !== false && !module.personal
    );
  }, [row]);

  // Local draft state: { [moduleKey]: Set of selected action keys }
  const [draftActionsMap, setDraftActionsMap] = useState({});

  useEffect(() => {
    if (!open || !row) return;
    const initialMap = {};
    for (const t of targets) {
      const current = value.find(p => p.module === t.key)?.actions || [];
      initialMap[t.key] = new Set(current);
    }
    setDraftActionsMap(initialMap);
  }, [open, row, targets, value]);

  if (!open || !row) return null;

  const primaryTarget = targets[0];

  const handleToggleAction = (moduleKey, action, checked) => {
    setDraftActionsMap(prev => {
      const nextMap = { ...prev };
      const currentSet = new Set(nextMap[moduleKey] || []);
      if (checked) {
        currentSet.add(action);
      } else {
        currentSet.delete(action);
      }
      nextMap[moduleKey] = currentSet;
      return nextMap;
    });
  };

  // Quick action: Grant only 'view'
  const handleOnlyView = () => {
    const nextMap = {};
    for (const t of targets) {
      if (t.actions.includes('view')) {
        nextMap[t.key] = new Set(['view']);
      } else {
        nextMap[t.key] = new Set();
      }
    }
    setDraftActionsMap(nextMap);
  };

  // Quick action: Reset to pre-registered default actions
  const handleResetToDefault = () => {
    const nextMap = {};
    for (const t of targets) {
      nextMap[t.key] = new Set(t.actions);
    }
    setDraftActionsMap(nextMap);
  };

  // Quick action: Clear all
  const handleClearAll = () => {
    const nextMap = {};
    for (const t of targets) {
      nextMap[t.key] = new Set();
    }
    setDraftActionsMap(nextMap);
  };

  const handleApply = () => {
    if (disabled || !onChange) return;

    let nextValue = (value || []).map(p => ({
      ...p,
      actions: [...(p.actions || [])],
    }));

    for (const t of targets) {
      const actions = Array.from(draftActionsMap[t.key] || []);
      nextValue = nextValue.filter(p => p.module !== t.key);
      if (actions.length > 0) {
        nextValue.push({
          module: t.key,
          actions,
        });
      }
    }

    onChange(nextValue);
    notify(`Đã cập nhật quyền cho "${row.name}".`, 'success');
    onClose();
  };

  const totalPossibleActions = targets.reduce((acc, t) => acc + t.actions.length, 0);
  const totalSelectedActions = Object.values(draftActionsMap).reduce(
    (acc, set) => acc + (set?.size || 0),
    0
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tùy chỉnh phân quyền chức năng"
      size="2xl"
      fitContent={true}
      maxWidth="960px"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" disabled={disabled} onClick={handleApply}>
              Áp dụng quyền
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Module Header - Pure Clean Typography, Zero Tag Badges, Zero Icon Boxes */}
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {row.name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono text-slate-700 dark:text-slate-300">
                @{primaryTarget?.key || 'chuc_nang'}
              </span>
              <span>·</span>
              <span>{row.kind}</span>
              {row.route && (
                <>
                  <span>·</span>
                  <span className="font-mono">{row.route}</span>
                </>
              )}
              <span>·</span>
              <span className={row.status === 'Hoạt động' ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                {row.status || 'Hoạt động'}
              </span>
              <span>·</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Đã cấp {totalSelectedActions} / {totalPossibleActions} quyền
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left Column: Basic Information */}
          <section className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Thông tin chức năng
            </h3>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                <dt className="text-slate-500">Tên chức năng</dt>
                <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-200">
                  {row.name}
                </dd>
              </div>

              {primaryTarget?.key && (
                <div className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                  <dt className="text-slate-500">Mã phạm vi</dt>
                  <dd className="min-w-0 font-mono font-medium text-slate-800 dark:text-slate-200">
                    @{primaryTarget.key}
                  </dd>
                </div>
              )}

              <div className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                <dt className="text-slate-500">Loại phân cấp</dt>
                <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-200">
                  {row.kind}
                </dd>
              </div>

              {row.route && (
                <div className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                  <dt className="text-slate-500">Đường dẫn</dt>
                  <dd className="min-w-0 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {row.route}
                  </dd>
                </div>
              )}

              <div className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-2 text-sm">
                <dt className="text-slate-500">Trạng thái</dt>
                <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-200">
                  {row.status || 'Hoạt động'}
                </dd>
              </div>
            </dl>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              Mặc định nhóm quyền sẽ tự động thừa hưởng toàn bộ các thao tác đã đăng ký trong danh mục chức năng. Bạn có thể chủ động chọn hoặc bỏ các quyền cụ thể (như quyền Xem, Thêm, Sửa, Xóa) cho nhóm này.
            </p>
          </section>

          {/* Right Column: Thao tác & Phân quyền */}
          <div className="min-w-0 space-y-5">
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Thao tác được cấp phép
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleOnlyView}
                    className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    Chỉ chọn Xem
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:underline font-medium cursor-pointer"
                  >
                    Mặc định gợi ý
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-rose-600 hover:underline font-medium cursor-pointer"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {targets.map(target => {
                  const currentSelected = draftActionsMap[target.key] || new Set();

                  return (
                    <div key={target.key} className="py-2 space-y-1">
                      {targets.length > 1 && (
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1">
                          <span>{target.label}</span>
                          <span className="font-mono text-slate-400">@{target.key}</span>
                        </div>
                      )}

                      <div className="space-y-0.5">
                        {target.actions.map(action => {
                          const isChecked = currentSelected.has(action);
                          const label = actionLabels[action] || action;
                          const isView = action === 'view';

                          return (
                            <label
                              key={action}
                              className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer select-none transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => handleToggleAction(target.key, action, e.target.checked)}
                                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {label}
                                  </span>
                                  {isView && (
                                    <span className="text-xs text-emerald-700 dark:text-emerald-400 block">
                                      Quyền xem màn hình & truy cập menu
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono text-xs text-slate-400 shrink-0 ml-2">
                                ({action})
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function PermissionTree({
  modules,
  value = [],
  onChange,
  disabled = false,
  fill = false,
  hierarchy,
}) {
  value = Array.isArray(value) ? value : [];
  const container = useRef(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const compact = width < 720;
  const visibleColumns = useMemo(() => {
    if (compact) {
      return columns
        .filter(column => column.id === 'name')
        .map(column => ({ ...column, width: Math.max(160, width - 8) }));
    }
    return columns;
  }, [compact, width]);

  const [path, setPath] = useState([]);
  const [preferences, setPreferences] = useMenuPreferences('security-permission-tree', {
    search: '',
    filters: {},
    size: 25,
    sort: { id: 'name', asc: true },
  });

  const search = preferences.search || '';
  const filters = preferences.filters || {};
  const size = preferences.size || 25;
  const sort = preferences.sort || { id: 'name', asc: true };
  const [page, setPage] = useState(1);

  const setSearch = val => setPreferences(prev => ({ ...prev, search: val }));
  const setFilters = val =>
    setPreferences(prev => ({
      ...prev,
      filters: typeof val === 'function' ? val(prev.filters || {}) : val,
    }));
  const setSize = val => setPreferences(prev => ({ ...prev, size: val }));
  const setSort = val =>
    setPreferences(prev => ({
      ...prev,
      sort: typeof val === 'function' ? val(prev.sort || { id: 'name', asc: true }) : val,
    }));

  // Modal State for granular customization
  const [adjustingRow, setAdjustingRow] = useState(null);

  const roots = useMemo(() => hydratePermissionHierarchy(modules, hierarchy), [modules, hierarchy]);
  const flat = useMemo(() => flattenPermissionHierarchy(roots), [roots]);
  const ancestors = path.map(id => flat.find(node => node.id === id)).filter(Boolean);
  const current = ancestors.at(-1);

  const nodes = search.trim()
    ? flat.filter(node => !current || node.path.includes(current.id))
    : permissionTreeChildren(flat, current?.id);

  const source = nodes.map(node => ({
    ...node,
    folder: node.children.length > 0,
    next: node.children.length ? node.path : null,
    count: node.children.length,
    description: search.trim()
      ? node.path
          .slice(0, -1)
          .map(id => flat.find(parent => parent.id === id)?.name)
          .join(' / ') +
        ' · ' +
        node.description
      : node.description,
  }));

  const filtered = source
    .filter(
      row =>
        normalizeOptionSearch([row.name, row.route, row.description, row.kind].join(' ')).includes(
          normalizeOptionSearch(search)
        ) && Object.entries(filters).every(([key, val]) => !val || String(row[key]) === val)
    )
    .sort((a, b) => {
      if (a.folder !== b.folder) return a.folder ? -1 : 1;
      return (
        String(a[sort.id] ?? '').localeCompare(String(b[sort.id] ?? ''), 'vi', { numeric: true }) *
        (sort.asc ? 1 : -1)
      );
    });

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * size, currentPage * size);

  const go = next => {
    setPath(next);
    setSearch('');
    setFilters({});
    setPage(1);
  };

  const selected = (moduleKey, action) =>
    !!value.find(p => p.module === moduleKey)?.actions?.includes(action);

  const selectableTargets = row =>
    (row.targets || []).filter(
      module => module.enabled && module.registered !== false && !module.personal
    );

  const selectionState = row => {
    if (row.action) return { checked: selected(row.module.key, row.action), partial: false };
    const targets = selectableTargets(row);
    const all = targets.reduce((n, module) => n + module.actions.length, 0);
    const chosen = targets.reduce(
      (n, module) => n + module.actions.filter(action => selected(module.key, action)).length,
      0
    );
    return {
      checked: all > 0 && chosen === all,
      partial: chosen > 0 && chosen < all,
    };
  };

  const toggleFilter = key => {
    setPage(1);
    setFilters(prev => {
      const next = { ...prev };
      if (Object.hasOwn(next, key)) delete next[key];
      else next[key] = '';
      return next;
    });
  };

  return (
    <div
      ref={container}
      className="flex flex-col min-h-0 min-w-0 w-full bg-white dark:bg-slate-950"
      style={{ height: fill ? '100%' : 480 }}
    >
      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto whitespace-nowrap border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs">
        <Button size="sm" variant="ghost" icon={ArrowLeft} disabled={!path.length} onClick={() => go(path.slice(0, -1))}>
          Quay lại
        </Button>
        <button
          type="button"
          className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline cursor-pointer"
          onClick={() => go([])}
        >
          Tất cả module
        </button>
        {ancestors.map((node, index) => (
          <React.Fragment key={node.id}>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <button
              type="button"
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:underline cursor-pointer"
              onClick={() => go(path.slice(0, index + 1))}
            >
              {node.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Toolbar: Search, Filters */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <SearchInput
          size="sm"
          className="min-w-0 flex-1 sm:max-w-72"
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm module, nhóm menu, chức năng, quyền…"
        />
        {Object.entries(filters).map(([key, currentVal]) => (
          <Select
            key={key}
            size="sm"
            className="w-48"
            value={currentVal}
            onChange={event => {
              setFilters(prev => ({ ...prev, [key]: event.target.value }));
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả ' + (key === 'kind' ? 'loại' : 'trạng thái') },
              ...[...new Set(source.map(row => row[key]).filter(Boolean))].map(val => ({
                value: val,
                label: val,
              })),
            ]}
          />
        ))}
        <FilterToggleMenu
          columns={columns.filter(column => ['kind', 'status'].includes(column.id))}
          filters={filters}
          preferenceKey="security-permission-tree"
          onRestore={setFilters}
          onToggle={toggleFilter}
        />
      </div>

      {/* Main Hierarchy Table: STRICT PLAIN TEXT */}
      <div className="flex-1 min-h-0">
        <VirtualDataTable
          preferenceKey="security-permission-tree-editor"
          columns={visibleColumns}
          rows={rows}
          rowHeight={compact ? 100 : undefined}
          onOpen={row => {
            if (row.next) {
              go(row.next);
            } else if (selectableTargets(row).length > 0) {
              setAdjustingRow(row);
            }
          }}
          onSort={id => setSort(prev => ({ id, asc: prev.id === id ? !prev.asc : true }))}
          renderCell={(column, row) => {
            const targets = selectableTargets(row);
            const state = selectionState(row);

            if (column.id === 'name') {
              return (
                <div className="flex gap-2 items-center min-w-0">
                  {onChange && (row.action || targets.length > 0) && (
                    <Check
                      aria-label={'Chọn ' + row.name}
                      {...state}
                      disabled={
                        disabled ||
                        (row.action
                          ? !row.module.enabled || row.module.registered === false
                          : !targets.length)
                      }
                      onChange={event =>
                        onChange(
                          row.action
                            ? toggleTreeAction(value, row.module.key, row.action, event.target.checked)
                            : setBranchPermissions(value, targets, event.target.checked)
                        )
                      }
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {row.folder ? (
                      <button
                        type="button"
                        className="truncate text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline outline-none focus:outline-none focus:ring-0 cursor-pointer"
                        onClick={() => go(row.next)}
                      >
                        {row.name}
                      </button>
                    ) : targets.length > 0 ? (
                      <button
                        type="button"
                        className="truncate text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline outline-none cursor-pointer"
                        onClick={() => setAdjustingRow(row)}
                        title="Bấm để tùy chỉnh quyền chi tiết trong modal"
                      >
                        {row.name}
                      </button>
                    ) : (
                      <span className="truncate">{row.name}</span>
                    )}
                  </div>
                </div>
              );
            }

            if (column.id === 'kind') {
              return <span className="text-slate-500">{row.kind || '—'}</span>;
            }

            if (column.id === 'route') {
              return row.route ? <span className="font-mono text-xs text-slate-500">{row.route}</span> : '—';
            }

            if (column.id === 'permissions_summary') {
              if (row.id?.startsWith('personal') || row.status === 'Mọi tài khoản') {
                return <span className="text-slate-400 italic">Mặc định mọi tài khoản</span>;
              }
              if (!targets.length) {
                return <span className="text-slate-400">—</span>;
              }

              const allActions = targets.flatMap(t => t.actions);
              const chosenActions = targets.flatMap(t => {
                const p = value.find(item => item.module === t.key);
                return (p?.actions || []).filter(a => t.actions.includes(a));
              });

              if (chosenActions.length === 0) {
                return <span className="text-slate-400">Chưa cấp quyền</span>;
              }
              if (chosenActions.length === allActions.length) {
                return (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Đầy đủ ({allActions.length} quyền)
                  </span>
                );
              }
              const names = chosenActions.map(a => actionLabels[a] || a).join(', ');
              return (
                <span className="text-amber-700 dark:text-amber-400 font-medium truncate block" title={names}>
                  Tùy chỉnh ({chosenActions.length}/{allActions.length}): {names}
                </span>
              );
            }

            // PURE PLAIN TEXT LINK - ZERO TAGS / BADGES / BUTTON BOXES
            if (column.id === 'actions_col') {
              if (!targets.length || disabled || row.kind === 'Module' || row.kind === 'Nhóm menu') {
                return <span className="text-slate-300 dark:text-slate-700">—</span>;
              }
              return (
                <button
                  type="button"
                  onClick={() => setAdjustingRow(row)}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer outline-none focus:outline-none"
                  title={`Bấm để điều chỉnh quyền riêng cho ${row.name}`}
                >
                  Tùy chỉnh
                </button>
              );
            }

            if (column.id === 'status') {
              return (
                <span className={row.status === 'Hoạt động' ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                  {row.status || '—'}
                </span>
              );
            }

            return (
              <span title={String(row[column.id] ?? '')} className="truncate block">
                {row[column.id] || '—'}
              </span>
            );
          }}
        />
      </div>

      {!rows.length && <p role="status" className="p-3 text-xs text-slate-500">Không có mục phù hợp.</p>}

      {/* Footer Info & Pagination */}
      <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs shrink-0">
        <span>
          {compact
            ? filtered.length + ' mục'
            : roots.length +
              ' module · ' +
              flat.filter(node => node.kind === 'Nhóm menu').length +
              ' nhóm menu · ' +
              filtered.length +
              ' mục'}
        </span>
        <div className="flex gap-2 items-center">
          <Select
            size="sm"
            className="w-28"
            aria-label="Số dòng mỗi trang"
            value={size}
            onChange={event => {
              setSize(Number(event.target.value));
              setPage(1);
            }}
            options={[25, 50, 100].map(val => ({ value: val, label: val + ' dòng' }))}
          />
          <Button size="sm" variant="ghost" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            Trước
          </Button>
          <span>
            {currentPage}/{pages}
          </span>
          <Button size="sm" variant="ghost" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>
            Sau
          </Button>
        </div>
      </div>

      {/* Standardized Granular Action Adjustment Modal */}
      <AdjustPermissionModal
        open={Boolean(adjustingRow)}
        onClose={() => setAdjustingRow(null)}
        row={adjustingRow}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
