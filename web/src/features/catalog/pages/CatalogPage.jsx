import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Settings, Search, RotateCcw, BookOpen } from 'lucide-react';
import CatalogDetailPage from '../components/CatalogDetailPage';
import { systemCatalogs, questionCatalogs } from '../services/attributeCatalog';
import { useAuth } from '../../../shared/hooks/useAuth';
import useAttributeCatalog from '../../../shared/hooks/useAttributeCatalog';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import Tabs from '../../../shared/ui/Tabs';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import Input from '../../../shared/ui/Input';
import FilterToggleMenu from '../../../shared/ui/FilterToggleMenu';
import { useMenuPreferences } from '../../../shared/lib/tablePreferences';
import { notify } from '../../../shared/lib/notify';

const baseColumns = [
  { id: 'value', label: 'Mã danh mục', width: 220, minWidth: 160 },
  { id: 'name', label: 'Tên hiển thị', width: 360, minWidth: 220 },
  { id: 'active', label: 'Trạng thái', width: 180, minWidth: 140 },
  { id: 'id', label: 'UUIDv7', width: 300, minWidth: 200, optional: true, defaultHidden: true },
];

const normalize = value =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim();

// STRICT PLAIN TEXT: Zero tags, zero badges, zero icons, zero action columns
const formatCell = (column, row) => {
  if (column.id === 'active') {
    return row.active ? 'Đang sử dụng' : 'Ngừng sử dụng';
  }
  return row[column.id] ?? '—';
};

function CatalogTable({ catalogKey, onTabChange, catalogs, training, canEdit, onOpenEdit }) {
  const navigate = useNavigate();
  const columns = useMemo(
    () =>
      catalogKey === 'question_topic'
        ? [...baseColumns, { id: 'parentName', label: 'Chuyên môn liên kết', width: 300, minWidth: 200 }]
        : baseColumns,
    [catalogKey]
  );

  const catalog = useAttributeCatalog(catalogKey);

  const [menuPreferences, setMenuPreferences] = useMenuPreferences(`admin-catalog:${catalogKey}`, {
    search: '',
    filters: {},
    sort: { key: 'value', direction: 1 },
    pageSize: 20,
  });

  const search = menuPreferences.search || '';
  const [searchDraft, setSearchDraft] = useState(search);
  const filters = menuPreferences.filters || {};
  const sort = menuPreferences.sort || { key: 'value', direction: 1 };
  const pageSize = menuPreferences.pageSize || 20;

  const setSearch = value => setMenuPreferences(prev => ({ ...prev, search: value }));
  const setFilters = value =>
    setMenuPreferences(prev => ({
      ...prev,
      filters: typeof value === 'function' ? value(prev.filters || {}) : value,
    }));
  const setSort = value =>
    setMenuPreferences(prev => ({
      ...prev,
      sort: typeof value === 'function' ? value(prev.sort || { key: 'value', direction: 1 }) : value,
    }));
  const setPageSize = value => setMenuPreferences(prev => ({ ...prev, pageSize: value }));

  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState([]);

  const filtered = useMemo(() => {
    const rawOptions = catalog.options || [];
    const q = normalize(search);

    return rawOptions
      .map(option => ({ ...option, name: option.label }))
      .filter(row => {
        const matchesSearch =
          !q || columns.some(col => normalize(formatCell(col, row)).includes(q));

        const matchesFilters = Object.entries(filters).every(([key, filterVal]) => {
          if (!filterVal) return true;
          if (key === 'active') return String(row.active) === filterVal;
          return normalize(formatCell({ id: key }, row)).includes(normalize(filterVal));
        });

        return matchesSearch && matchesFilters;
      })
      .sort((a, b) => {
        const sortKey = sort.key || 'value';
        const sortDir = sort.direction || 1;
        const valA = formatCell({ id: sortKey }, a);
        const valB = formatCell({ id: sortKey }, b);
        return String(valA).localeCompare(String(valB), 'vi', { numeric: true }) * sortDir;
      });
  }, [catalog.options, search, filters, sort, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const applySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setSearchDraft('');
    setSearch('');
    setFilters({});
    setPage(1);
    notify('Đã xóa tất cả bộ lọc.', 'info');
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

  const hasActiveFilters = Boolean(search) || Object.values(filters).some(val => val !== '');

  return (
    <>
      <ManagementFrame
        header={
          <>
            <Tabs
              tabs={catalogs.map(item => ({ id: item.key, label: item.label }))}
              activeTab={catalogKey}
              onChange={onTabChange}
            />

            <div className="management-actions flex items-center gap-2">
              {training && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={BookOpen}
                  onClick={() => navigate('/manage/questions')}
                >
                  Ngân hàng câu hỏi
                </Button>
              )}
              {canEdit && (
                <Button size="sm" variant="primary" icon={Settings} onClick={onOpenEdit}>
                  Đăng ký / Chỉnh sửa
                </Button>
              )}
            </div>
          </>
        }
        filters={
          <>
            {/* Left Toolbar */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="w-64 max-w-full">
                <SearchInput
                  size="sm"
                  value={searchDraft}
                  placeholder="Tìm mã, tên danh mục…"
                  onChange={e => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
                  onClear={() => {
                    setSearchDraft('');
                    setSearch('');
                    setPage(1);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                title="Tìm kiếm"
                aria-label="Tìm kiếm"
                onClick={applySearch}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <Search size={15} />
              </button>

              {/* Dynamic filter controls */}
              {Object.entries(filters).map(([key, value]) =>
                key === 'active' ? (
                  <Select
                    key={key}
                    size="sm"
                    className="w-44 text-xs font-medium"
                    aria-label="Lọc trạng thái"
                    searchable
                    value={value}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, [key]: e?.target?.value ?? e }));
                      setPage(1);
                    }}
                    options={[
                      { value: '', label: 'Tất cả trạng thái' },
                      { value: 'true', label: 'Đang sử dụng' },
                      { value: 'false', label: 'Ngừng sử dụng' },
                    ]}
                  />
                ) : (
                  <Input
                    key={key}
                    size="sm"
                    className="w-44"
                    aria-label={columns.find(col => col.id === key)?.label || key}
                    placeholder={columns.find(col => col.id === key)?.label || key}
                    value={value}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, [key]: e.target.value }));
                      setPage(1);
                    }}
                  />
                )
              )}

              <FilterToggleMenu
                columns={columns}
                filters={filters}
                preferenceKey={`admin-catalog:${catalogKey}`}
                onRestore={setFilters}
                onToggle={toggleFilter}
              />

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Xóa tất cả bộ lọc"
                  aria-label="Xóa tất cả bộ lọc"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

        </>
      }
      status={
        <TableStatusFooter
          title={training ? 'Thiết lập câu hỏi' : 'Danh mục hệ thống'}
          leftExtra={
            <span className="text-slate-500 shrink-0">
              · {catalog.label || ''} · {filtered.length} / {(catalog.options || []).length} bản ghi
            </span>
          }
          selectedCount={selection.length}
          page={currentPage}
          totalPages={pages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-catalog-column-menu"
        />
      }
      >
        {catalog.error ? (
          <p role="alert" className="p-4 text-sm text-rose-600">{catalog.error}</p>
        ) : catalog.loading ? (
          <p role="status" className="p-4 text-sm text-slate-500">Đang tải danh mục…</p>
        ) : (
          <VirtualDataTable
            preferenceKey={`admin-catalog:${catalogKey}`}
            columnMenuTargetId="admin-catalog-column-menu"
            columns={columns}
            rows={rows}
            keyField="value"
            formatCell={formatCell}
            selectedIds={selection}
            onSelectedIdsChange={setSelection}
            onSort={key => {
              setSort(prev => ({
                key,
                direction: prev.key === key ? -prev.direction : 1,
              }));
            }}
            onOpen={() => {
              if (canEdit) onOpenEdit();
            }}
            renderCell={(column, row) => {
              // STRICT PLAIN TEXT: Zero tags, zero badges, zero icons, zero action columns
              if (column.id === 'value') {
                return (
                  <button
                    type="button"
                    className="text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
                    onClick={() => {
                      if (canEdit) onOpenEdit();
                    }}
                  >
                    {row.value}
                  </button>
                );
              }
              if (column.id === 'active') {
                return row.active ? 'Đang sử dụng' : 'Ngừng sử dụng';
              }
              return formatCell(column, row);
            }}
          />
        )}
      </ManagementFrame>
    </>
  );
}

export default function CatalogPage({ scope = 'system' }) {
  const training = scope === 'questions';
  const catalogs = training ? questionCatalogs : systemCatalogs;
  const [params, setParams] = useSearchParams();
  const { hasPermission } = useAuth();

  const requestedKey = params.get('catalog');
  const catalogKey = catalogs.some(item => item.key === requestedKey)
    ? requestedKey
    : catalogs[0].key;

  const isEditMode = params.get('mode') === 'edit';

  const canEdit = training
    ? hasPermission('questions:create') || hasPermission('questions:update')
    : hasPermission('catalog:update');

  if (isEditMode) {
    return (
      <CatalogDetailPage
        key={`${scope}:${catalogKey}:edit`}
        catalogKey={catalogKey}
        onBack={() => {
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('mode');
            return next;
          });
        }}
        canEdit={canEdit}
      />
    );
  }

  return (
    <CatalogTable
      key={`${scope}:${catalogKey}`}
      catalogKey={catalogKey}
      catalogs={catalogs}
      training={training}
      canEdit={canEdit}
      onTabChange={key => setParams({ catalog: key })}
      onOpenEdit={() => {
        setParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('catalog', catalogKey);
          next.set('mode', 'edit');
          return next;
        });
      }}
    />
  );
}
