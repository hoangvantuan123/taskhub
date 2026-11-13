import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, FileText, LayoutGrid, List, Plus } from 'lucide-react';
import { assessmentsApi } from '../services/assessments.api';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useToast } from '../../../shared/hooks/useToast';
import { formatDate } from '../../../shared/lib/formatters';
import { useMenuPreferences } from '../../../shared/lib/tablePreferences';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import FilterToggleMenu from '../../../shared/ui/FilterToggleMenu';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import ExportDataModal from '../../../shared/ui/ExportDataModal';
import ImportDataModal from '../../../shared/ui/ImportDataModal';

const COLUMNS = [
  { id: 'code', label: 'Mã bộ đề', width: 160 }, { id: 'title', label: 'Tên bộ đề thi', width: 360 },
  { id: 'subjectName', label: 'Chuyên môn', width: 180 }, { id: 'targetGroupName', label: 'Nhóm đối tượng', width: 190 },
  { id: 'targetRank', label: 'Cấp áp dụng', width: 140 }, { id: 'questionCount', label: 'Số câu', width: 100 },
  { id: 'durationMinutes', label: 'Thời lượng', width: 110 }, { id: 'passingScore', label: 'Điểm đạt', width: 110 },
  { id: 'status', label: 'Trạng thái', width: 130 }, { id: 'updatedAt', label: 'Ngày cập nhật', width: 150 },
];
const FILTER_COLUMNS = COLUMNS.filter(column => !['questionCount', 'durationMinutes', 'passingScore'].includes(column.id));
const CATEGORICAL = new Set(['subjectName', 'targetGroupName', 'targetRank', 'status']);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();

export default function AssessmentListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('assessments:create');
  const canUpdate = hasPermission('assessments:update');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState({ field: 'code', asc: false });
  const [filters, setFilters] = useState({ status: '', subjectName: '', targetGroupName: '' });
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [preferences, setPreferences] = useMenuPreferences('assessment-list', { search: '' });
  const search = preferences.search || '';

  const text = (column, row) => {
    if (column.id === 'status') return row.statusLabel || ({ published: 'Đã xuất bản', draft: 'Bản nháp' })[row.status] || row.status || '—';
    if (column.id === 'durationMinutes') return `${row.durationMinutes || 0} phút`;
    if (column.id === 'questionCount') return String(row.questionCount ?? row.questions?.length ?? 0);
    if (column.id === 'updatedAt') return row.updatedAt ? formatDate(row.updatedAt, false) : '—';
    if (column.id === 'actions') return 'Xem';
    return String(row[column.id] ?? '—');
  };
  const setSearch = value => { setPreferences(previous => ({ ...previous, search: value })); setPage(1); };
  const fetchItems = async () => {
    setLoading(true); setLoadError('');
    try { const response = await assessmentsApi.list(); setItems(response.data || []); }
    catch (failure) { const message = failure.message || 'Không tải được danh sách bộ đề.'; setLoadError(message); addToast(message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchItems(); }, []);

  const activeFilterCount = Object.values(filters).filter(value => String(value).trim()).length;
  const filtered = useMemo(() => items.filter(row => {
    const matchesSearch = !normalize(search) || [row.code, row.title, row.subjectName, row.targetGroupName, row.targetRank].some(value => normalize(value).includes(normalize(search)));
    return matchesSearch && Object.entries(filters).every(([field, query]) => !String(query).trim() || (CATEGORICAL.has(field) ? normalize(text({ id: field }, row)) === normalize(query) : normalize(text({ id: field }, row)).includes(normalize(query))));
  }), [items, search, filters]);
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = a[sort.field]; const bv = b[sort.field];
    const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : text({ id: sort.field }, a).localeCompare(text({ id: sort.field }, b), 'vi', { numeric: true });
    return sort.asc ? result : -result;
  }), [filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);
  const hasConditions = Boolean(search.trim()) || activeFilterCount > 0;
  const clearConditions = () => { setSearch(''); setFilters(previous => Object.fromEntries(Object.keys(previous).map(key => [key, '']))); setPage(1); };
  const openItem = item => { if (canUpdate || item.status === 'published') navigate(`/manage/assessments/${item.id}`); };

  return <ManagementFrame className="management-screen">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
      <div className="flex items-center gap-6 -mb-px shrink-0">
        {[['table', 'Danh sách bộ đề', List], ['cards', 'Dạng thẻ', LayoutGrid]].map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setViewMode(id)} className={`flex items-center gap-2 pb-2.5 text-xs sm:text-sm transition-all border-b-2 ${viewMode === id ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          <Icon size={16} /><span>{label}</span><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${viewMode === id ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{items.length} đề</span>
        </button>)}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap pb-2.5 shrink-0">
        {canCreate && <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/manage/assessments/new')} className="!h-8 !text-xs whitespace-nowrap">Tạo bộ đề mới</Button>}
      </div>
    </div>

    <div className="flex flex-col gap-2.5 p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
        <div className="w-full sm:w-72 md:w-80"><SearchInput size="sm" value={search} onChange={event => setSearch(event.target.value)} onClear={() => setSearch('')} placeholder="Tìm mã, tên bộ đề, chuyên môn, nhóm..." /></div>
        {FILTER_COLUMNS.filter(column => Object.hasOwn(filters, column.id)).map(column => {
          const values = column.id === 'status' ? ['Bản nháp', 'Đã xuất bản'] : items.map(row => text(column, row));
          const options = [...new Set(values)].filter(value => value && value !== '—').sort((a, b) => a.localeCompare(b, 'vi')).map(value => ({ value, label: value }));
          const update = value => { setFilters(previous => ({ ...previous, [column.id]: value })); setPage(1); };
          return <div key={column.id} className="w-full sm:w-52">{CATEGORICAL.has(column.id)
            ? <Select className="w-full" size="sm" placeholder={`Tất cả ${column.label}`} value={filters[column.id] || ''} options={options} onChange={event => update(event.target.value)} />
            : <input aria-label={`Lọc ${column.label}`} className="h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs focus:border-emerald-500 focus:outline-none" value={filters[column.id] || ''} onChange={event => update(event.target.value)} placeholder={`Lọc ${column.label.toLocaleLowerCase('vi')}…`} />}
          </div>;
        })}
        <FilterToggleMenu columns={FILTER_COLUMNS} filters={filters} preferenceKey="assessments:list" onRestore={setFilters} onToggle={field => setFilters(previous => { const next = { ...previous }; if (Object.hasOwn(next, field)) delete next[field]; else next[field] = ''; setPage(1); return next; })} />
        {hasConditions && <button type="button" onClick={clearConditions} className="h-8 px-2.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400">Xóa điều kiện{activeFilterCount ? ` (${activeFilterCount})` : ''}</button>}
      </div>
    </div>

    <div className="flex-1 min-h-0 w-full overflow-hidden bg-white dark:bg-slate-950 flex flex-col">
      {loading ? <StateMessage message="Đang tải danh sách bộ đề..." />
        : loadError ? <StateMessage icon message={loadError} action={<Button variant="outline" size="sm" onClick={fetchItems}>Tải lại danh sách</Button>} />
        : !visible.length ? <StateMessage icon message={hasConditions ? 'Không tìm thấy bộ đề phù hợp' : 'Chưa có bộ đề nào trong hệ thống'} detail={hasConditions ? 'Hãy thay đổi từ khóa hoặc điều kiện lọc.' : 'Tạo bộ đề đầu tiên từ ngân hàng câu hỏi và quy chuẩn đề đã đăng ký.'} action={hasConditions ? <Button variant="outline" size="sm" onClick={clearConditions}>Xóa điều kiện lọc</Button> : canCreate ? <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/manage/assessments/new')}>Tạo bộ đề mới</Button> : null} />
        : viewMode === 'table' ? <VirtualDataTable columns={COLUMNS} rows={visible} formatCell={text} onSort={field => field !== 'actions' && setSort(previous => ({ field, asc: previous.field === field ? !previous.asc : true }))} onOpen={openItem} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} />
        : <div className="flex-1 overflow-y-auto p-4 sm:p-5"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{visible.map(item => <AssessmentCard key={item.id} item={item} canOpen={canUpdate || item.status === 'published'} onOpen={() => openItem(item)} statusLabel={text({ id: 'status' }, item)} />)}</div></div>}
    </div>

    <TableStatusFooter
      title="Quản lý bộ đề thi"
      leftExtra={
        <span className="text-slate-500 shrink-0">
          · {sorted.length} bộ đề
        </span>
      }
      selectedCount={selectedIds.length}
      page={safePage}
      totalPages={totalPages}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onExport={() => setExportModalOpen(true)}
      onImport={() => setImportModalOpen(true)}
      columnMenuTargetId="manage-assessments-column-menu"
      loading={loading}
    />

    {/* EXPORT DATA MODAL */}
    <ExportDataModal
      open={exportModalOpen}
      onClose={() => setExportModalOpen(false)}
      title="Kết xuất danh sách bộ đề thi"
      defaultFilename="SkillHub_Bo_De_Thi"
      columns={COLUMNS}
      selectedRows={items.filter(item => selectedIds.includes(item.id))}
      currentPageRows={visible}
      onFetchAllRows={() => sorted}
      totalCount={sorted.length}
    />

    {/* IMPORT DATA MODAL */}
    <ImportDataModal
      open={importModalOpen}
      onClose={() => setImportModalOpen(false)}
      title="Nhập dữ liệu bộ đề thi từ file Excel"
      templateHeaders={['code', 'title', 'subjectName', 'durationMinutes', 'passingScore', 'status']}
      sampleRow={['DE_PLC_01', 'Đề kiểm tra kỹ năng lập trình PLC L1', 'PLC Mitsubishi', '45', '7', 'draft']}
      lookupRows={[
        ['Chuyên môn', 'PLC', 'Lập trình PLC & Máy', 'Hệ điều khiển tự động'],
        ['Chuyên môn', 'SCADA', 'Vận hành SCADA & HMI', 'Giám sát điều khiển'],
        ['Cấp áp dụng', 'L0', 'Cấp L0 — Thiết bị trường & Cảm biến', 'Field Level'],
        ['Cấp áp dụng', 'L1', 'Cấp L1 — PLC & Điều khiển máy', 'Control Level'],
        ['Trạng thái', 'draft', 'Bản nháp', 'Chưa xuất bản'],
        ['Trạng thái', 'published', 'Đã xuất bản', 'Sẵn sàng tổ chức thi'],
      ]}
      onImport={async (rows) => {
        let count = 0;
        for (const row of rows) {
          try {
            await assessmentsApi.create({
              code: row.code,
              title: row.title,
              subjectName: row.subjectName || '',
              durationMinutes: Number(row.durationMinutes) || 45,
              passingScore: Number(row.passingScore) || 5,
              status: row.status || 'draft',
              questionIds: [],
            });
            count++;
          } catch (err) {
            console.error('Import assessment row error', err);
          }
        }
        await fetchItems();
        addToast?.(`Đã nhập thành công ${count} bộ đề thi.`, 'success');
      }}
    />
  </ManagementFrame>;
}

function StateMessage({ icon, message, detail, action }) { return <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">{icon && <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><FileText size={24} /></div>}<p role="status" className="text-sm font-semibold text-slate-700 dark:text-slate-300">{message}</p>{detail && <p className="text-xs text-slate-400 max-w-sm">{detail}</p>}{action}</div>; }
function Metric({ label, value, icon: Icon, color }) { return <div><div className="text-[10px] text-slate-400">{label}</div><div className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200"><Icon size={12} className={color} />{value}</div></div>; }
function AssessmentCard({ item, canOpen, onOpen, statusLabel }) { return <article onClick={onOpen} className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between transition-colors ${canOpen ? 'cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-700' : 'cursor-default'}`}><div><div className="flex items-center justify-between gap-2 mb-2.5"><div className="flex items-center gap-2 min-w-0"><span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 truncate">{item.code}</span><span className="text-[11px] text-slate-400">v{item.version || 1}</span></div><Badge variant={item.status === 'published' ? 'success' : 'warning'} size="sm">{statusLabel}</Badge></div><h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-2">{item.title}</h2><div className="flex items-center gap-2 flex-wrap text-[11px] mb-3"><span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{item.subjectName || 'Chưa phân loại chuyên môn'}</span><span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold">{item.targetGroupName || 'Tất cả nhóm'} · {item.targetRank || 'Tất cả cấp'}</span></div><div className="grid grid-cols-3 gap-2 p-2.5 rounded-md bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-center"><Metric label="Số câu" value={item.questionCount || 0} icon={FileText} color="text-blue-500" /><Metric label="Thời gian" value={`${item.durationMinutes || 0}'`} icon={Clock} color="text-purple-500" /><Metric label="Điểm đạt" value={`${item.passingScore ?? 0}đ`} icon={CheckCircle} color="text-emerald-500" /></div></div><div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"><span className="text-[11px] text-slate-400 truncate">{item.updatedAt ? `Cập nhật: ${formatDate(item.updatedAt, false)}` : item.publishedAt ? `Xuất bản: ${formatDate(item.publishedAt, false)}` : 'Chưa xuất bản'}</span>{canOpen && <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">Xem chi tiết</span>}</div></article>; }
function PageButton({ label, icon, disabled, onClick }) { return <Button variant="outline" size="sm" icon={icon} aria-label={label} title={label} disabled={disabled} onClick={onClick} className="!h-8 !w-8 !p-0" />; }
