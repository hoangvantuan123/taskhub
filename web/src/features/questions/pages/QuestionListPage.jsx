import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Folder,
  ArrowLeft,
  Plus,
  Upload,
  Download,
  FolderPlus,
  Settings,
  Database,
} from 'lucide-react';
import { questionsApi } from '../services/questions.api';
import { useAuth } from '../../../shared/hooks/useAuth';
import useQuestionCatalogs from '../hooks/useQuestionCatalogs';
import { useToast } from '../../../shared/hooks/useToast';

// Unified UI Library Components
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import FilterToggleMenu from '../../../shared/ui/FilterToggleMenu';
import { useMenuPreferences } from '../../../shared/lib/tablePreferences';
import useAttributeCatalog from '../../../shared/hooks/useAttributeCatalog';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import QuestionTable, { getFieldText } from '../components/QuestionTable';
import QuestionCard from '../components/QuestionCard';
import SearchInput from '../../../shared/ui/SearchInput';
import Modal from '../../../shared/ui/Modal';
import ExportDataModal from '../../../shared/ui/ExportDataModal';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import InteractiveHmiSimulation from '../components/InteractiveHmiSimulation';
import BatchImportQuestionsModal from '../components/BatchImportQuestionsModal';
import FolderDetailPage from '../components/FolderDetailPage';

// Configurable Columns definition
const ALL_COLUMNS = [
  { id: 'content', label: 'Tên / Nội dung câu hỏi', defaultVisible: true, width: '450px', fixed: true },
  { id: 'level', label: 'Cấp độ (Level)', defaultVisible: true, width: '110px' },
  { id: 'format', label: 'Dạng bài', defaultVisible: true, width: '130px' },
  { id: 'isCritical', label: 'Điểm liệt', defaultVisible: true, width: '100px' },
  { id: 'topic', label: 'Chủ đề', defaultVisible: true, width: '170px' },
  { id: 'targetGroup', label: 'Nhóm áp dụng', defaultVisible: false, width: '160px' },
  { id: 'difficulty', label: 'Độ khó', defaultVisible: false, width: '110px' },
  { id: 'version', label: 'Phiên bản', defaultVisible: false, width: '90px' },
  { id: 'author', label: 'Tác giả', defaultVisible: false, width: '140px' },
  { id: 'status', label: 'Trạng thái', defaultVisible: true, width: '120px' },
  { id: 'updatedAt', label: 'Ngày cập nhật', defaultVisible: true, width: '120px' },
];

const FOLDER_COLUMNS = [
  { id: 'name', label: 'Tên thư mục', width: 360 },
  { id: 'description', label: 'Mô tả', width: 400 },
  { id: 'level', label: 'Cấp độ', width: 140 },
  { id: 'questionCount', label: 'Số câu hỏi', width: 130 },
  { id: 'criticalCount', label: 'Điểm liệt', width: 140 },
  { id: 'updatedAt', label: 'Cập nhật', width: 150 },
];
const normalizeFilter = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();

export default function QuestionListPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const catalogData = useQuestionCatalogs();
  const levelOptions = catalogData.data.level?.options || [];
  const levelCatalog = { loading: catalogData.loading, error: catalogData.error, options: levelOptions,
    labelFor: value => levelOptions.find(option => option.value === value)?.label || value || '—',
    optionsFor: () => levelOptions.filter(option => option.active).map(option => ({ value: option.value, label: option.label })) };
  const [loadError, setLoadError] = useState('');
  const requestSequence = useRef(0);
  const formatField = (column, row) => column.id === 'level' ? levelCatalog.labelFor(row.level) : getFieldText(column, row);

  // Navigation & Hierarchy
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null = Root directory
  const [viewMode, setViewMode] = useState('all'); // 'folder' | 'all'

  // Questions & Data State
  const [allQuestions, setAllQuestions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [globalTotalCount, setGlobalTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    questionsApi.getQuestions({ pageSize: 1 })
      .then(res => setGlobalTotalCount(res.meta?.total || 0))
      .catch(() => {});
  }, []);

  // Filters (Controlled via unified components)
  const [listPreferences, setListPreferences] = useMenuPreferences('question-list', { search: '' });
  const search = listPreferences.search || '';
  const setSearch = value => setListPreferences(previous => ({ ...previous, search: value }));
  const [fieldFilters, setFieldFilters] = useState({ folders: { level: '' }, questions: { level: '', format: '', isCritical: '' } });
  const isFolderRoot = viewMode === 'folder' && !currentFolder;
  const filterScope = isFolderRoot ? 'folders' : 'questions';
  const filters = fieldFilters[filterScope] || {};
  const filterColumns = (isFolderRoot ? FOLDER_COLUMNS : ALL_COLUMNS).filter(column => column.id !== 'actions');
  const activeFilterCount = Object.values(filters).filter(value => String(value).trim()).length;
  const matchesFilters = row => Object.entries(filters).every(([field, query]) => {
    if (!String(query).trim()) return true;
    const value = formatField({ id: field }, row);
    return ['level', 'format', 'status', 'isCritical'].includes(field)
      ? value === query
      : normalizeFilter(value).includes(normalizeFilter(query));
  });
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selection
  const [selectedItems, setSelectedItems] = useState([]);

  // Column Visibility Configuration
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('skillhub_qb_columns');
      if (saved) return JSON.parse(saved).filter(id => id !== 'id');
    } catch (e) {}
    return ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
  });

  // Modals
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [columnSettingsModalOpen, setColumnSettingsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLevel, setNewFolderLevel] = useState('All');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // Column toggling
  const handleToggleColumn = (colId) => {
    if (colId === 'content' || colId === 'actions') return;
    setVisibleColumns((prev) => {
      const next = prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId];
      try {
        localStorage.setItem('skillhub_qb_columns', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleResetColumns = () => {
    const defaults = ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
    setVisibleColumns(defaults);
    try {
      localStorage.setItem('skillhub_qb_columns', JSON.stringify(defaults));
    } catch (e) {}
    addToast('Đã khôi phục cài đặt cột mặc định', 'info');
  };

  const handleSelectAllColumns = () => {
    const all = ALL_COLUMNS.map((c) => c.id);
    setVisibleColumns(all);
    try {
      localStorage.setItem('skillhub_qb_columns', JSON.stringify(all));
    } catch (e) {}
  };

  useEffect(() => {
    loadFolders().catch(failure => setLoadError(failure.message));
  }, [search, selectedLevel]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedLevel, selectedFormat, onlyCritical, currentFolder, viewMode, fieldFilters, sortField, sortAsc, pageSize]);

  useEffect(() => {
    loadQuestions();
  }, [search, selectedLevel, selectedFormat, onlyCritical, currentFolder, viewMode, page, pageSize, fieldFilters, sortField, sortAsc]);

  const loadFolders = async () => {
    const res = await questionsApi.getQuestionFolders({
      search,
      level: selectedLevel,
    });
    setFolders(res.data || []);
  };

  const loadQuestions = async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    const filterFolderId = viewMode === 'folder' && currentFolder ? currentFolder.id : '';
    setLoadError('');
    try {
      const res = await questionsApi.getQuestions({
        search,
        level: selectedLevel,
        format: selectedFormat,
        isCritical: onlyCritical ? 'true' : '',
        folderId: filterFolderId,
        page,
        pageSize,
        filters: fieldFilters.questions,
        sortField,
        sortAsc,
      });
      const items = res.data || [];
      if (sequence !== requestSequence.current) return;
      setAllQuestions(items);
      setTotalCount(res.meta?.total || 0);
      if (!filterFolderId && !search) {
        setGlobalTotalCount(res.meta?.total || 0);
      }
    } catch (failure) {
      if (sequence === requestSequence.current) {
        setLoadError(failure.message);
        setAllQuestions([]);
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      addToast('Vui lòng nhập tên thư mục!', 'warning');
      return;
    }
    if (levelCatalog.loading || levelCatalog.error || !levelCatalog.options.some(option => option.value === newFolderLevel && option.active)) {
      addToast('Vui lòng chọn cấp độ đang sử dụng trong danh mục.', 'warning');
      return;
    }
    try {
    await questionsApi.createQuestionFolder({
      name: newFolderName.trim(),
      levelId: levelOptions.find(option => option.value === newFolderLevel)?.id,
      description: newFolderDesc.trim(),
    });
    addToast(`Đã tạo thư mục "${newFolderName}" thành công!`, 'success');
    setNewFolderName('');
    setNewFolderDesc('');
    setCreateFolderModalOpen(false);
    await loadFolders();
    } catch (failure) { addToast(failure.message, 'error'); }
  };

  const handleImportSuccess = async (batch) => {
    await questionsApi.createQuestionsBatch(batch);
    addToast(`Nhập thành công ${batch.length} câu hỏi vào Ngân hàng!`, 'success');
    await loadQuestions();
    await loadFolders();
  };

  // Sorting & Pagination
  const sortedFolders = useMemo(() => {
    return folders.filter(row => isFolderRoot ? matchesFilters(row) : true).sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'vi');
      return sortAsc ? cmp : -cmp;
    });
  }, [folders, sortAsc, fieldFilters, filterScope, levelCatalog.options]);

  const totalRecords = isFolderRoot ? sortedFolders.length : totalCount;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const pagedFolders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedFolders.slice(start, start + pageSize);
  }, [sortedFolders, page, pageSize]);

  // Active columns for questions
  const activeQuestionColumns = useMemo(() => {
    return ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id));
  }, [visibleColumns]);

  // Selection & Active List
  const activeList = isFolderRoot ? pagedFolders : allQuestions;

  const isCreateFolderMode = params.get('folderMode') === 'create' || createFolderModalOpen;
  if (isCreateFolderMode) {
    return (
      <FolderDetailPage
        levelCatalog={levelCatalog}
        onBack={() => {
          setCreateFolderModalOpen(false);
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('folderMode');
            return next;
          });
        }}
        onSaved={() => {
          setCreateFolderModalOpen(false);
          loadFolders();
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('folderMode');
            return next;
          });
        }}
      />
    );
  }

  return (
    <ManagementFrame className="management-screen">
      {/* 1. ENTERPRISE UNDERLINE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
        <div className="flex items-center gap-6 -mb-px shrink-0">
          {/* Tab 1: Folders */}
          <button
            type="button"
            onClick={() => {
              setViewMode('folder');
              setCurrentFolder(null);
            }}
            className={`pb-2.5 font-medium text-xs sm:text-sm transition-all border-b-2 cursor-pointer ${
              viewMode === 'folder'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Theo thư mục phân loại
          </button>

          {/* Tab 2: All Questions */}
          <button
            type="button"
            onClick={() => {
              setViewMode('all');
              setCurrentFolder(null);
            }}
            className={`pb-2.5 font-medium text-xs sm:text-sm transition-all border-b-2 cursor-pointer ${
              viewMode === 'all'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Tất cả câu hỏi
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 pb-2.5 shrink-0">
          {hasPermission('questions:create') && isFolderRoot && (
            <Button
              variant="secondary"
              size="sm"
              icon={FolderPlus}
              onClick={() => setParams({ folderMode: 'create' })}
              className="!h-8 !text-xs whitespace-nowrap"
            >
              Tạo thư mục
            </Button>
          )}

          {hasPermission('questions:create') && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/manage/questions/new' + (currentFolder ? '?folderId=' + currentFolder.id : ''))}
              className="!h-8 !text-xs whitespace-nowrap"
            >
              Soạn câu hỏi
            </Button>
          )}
        </div>
      </div>

      {/* 2. UNIFIED WORKSTATION TOOLBAR */}
      <div className="flex flex-col gap-2.5 p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
        {/* Current folder navigation & details banner */}
        {currentFolder && viewMode === 'folder' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-start gap-3 min-w-0">
              <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => setCurrentFolder(null)} className="shrink-0 !h-8 !text-xs">
                Tất cả thư mục
              </Button>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{currentFolder.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    {levelCatalog.labelFor(currentFolder.level)}
                  </span>
                  {currentFolder.isSample && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Thư mục mẫu
                    </span>
                  )}
                </div>
                {currentFolder.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {currentFolder.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>Đang có: <strong className="text-emerald-700 dark:text-emerald-400">{allQuestions.length}</strong> câu hỏi trong thư mục này</span>
                  <span>•</span>
                  <span>Điểm liệt: <strong className="text-rose-600">{allQuestions.filter(q => q.isCritical).length}</strong> câu</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasPermission('questions:create') && <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => navigate(`/manage/questions/new?folderId=${currentFolder.id}`)}
                className="!h-8 !text-xs"
              >
                Thêm câu hỏi vào thư mục này
              </Button>}
            </div>
          </div>
        )}

        {/* Row 2: Unified Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 w-full flex-wrap">
            {/* Unified Search Input */}
            <div className="w-full sm:w-72 md:w-80">
              <SearchInput
                size="sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder={
                  viewMode === 'folder' && !currentFolder
                    ? 'Tìm kiếm thư mục nhóm câu hỏi...'
                    : 'Tìm mã, nội dung câu hỏi...'
                }
              />
            </div>

            {filterColumns.filter(column => Object.hasOwn(filters, column.id)).map(column => {
              const categorical = !['id', 'content', 'name', 'description'].includes(column.id);
              const catalogKey = ({ level: 'level', format: 'question_format', topic: 'question_topic', targetGroup: 'target_group', difficulty: 'cognitive_level' })[column.id];
              const values = catalogKey ? (catalogData.data[catalogKey]?.options || []).map(option => option.label)
                : column.id === 'status' ? ['Bản nháp', 'Chờ duyệt', 'Đã xuất bản']
                : column.id === 'isCritical' ? ['Điểm liệt', '—']
                : (isFolderRoot ? folders : allQuestions).map(row => formatField(column, row));
              const options = categorical ? [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')).map(value => ({ value, label: value })) : [];
              const update = value => setFieldFilters(previous => ({ ...previous, [filterScope]: { ...previous[filterScope], [column.id]: value } }));
              return <div key={column.id} className="flex items-center gap-1 w-full sm:w-auto">
                {categorical ? <Select className="w-full sm:w-52" size="sm" placeholder={`Tất cả ${column.label}`} value={filters[column.id] || ''} options={options} onChange={event => update(event.target.value)} /> : <input aria-label={`Lọc ${column.label}`} className="h-8 w-full sm:w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs focus:border-emerald-500" value={filters[column.id] || ''} onChange={event => update(event.target.value)} placeholder={`Lọc ${column.label.toLocaleLowerCase('vi')}…`} />}
              </div>;
            })}
            <FilterToggleMenu
              columns={filterColumns}
              filters={filters}
              preferenceKey={`questions:${filterScope}`}
              onRestore={restored => setFieldFilters(previous => ({ ...previous, [filterScope]: restored }))}
              onToggle={field => setFieldFilters(previous => {
                const next = { ...previous[filterScope] };
                if (Object.hasOwn(next, field)) delete next[field];
                else next[field] = '';
                return { ...previous, [filterScope]: next };
              })}
            />
            {activeFilterCount > 0 && <button type="button" className="text-xs text-slate-500 hover:text-emerald-700" onClick={() => setFieldFilters(previous => ({ ...previous, [filterScope]: Object.fromEntries(Object.keys(filters).map(field => [field, ''])) }))}>Xóa điều kiện ({activeFilterCount})</button>}
          </div>

        </div>
      </div>

      {(loadError || catalogData.error) && <p role="alert" className="px-4 py-2 text-sm text-rose-600">{loadError || catalogData.error}</p>}
      <div className="flex-1 min-h-0 w-full overflow-hidden bg-white dark:bg-slate-950 flex flex-col">
        {activeList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3" role="status">
            {loading ? (
              <p>Đang tải dữ liệu...</p>
            ) : viewMode === 'folder' && currentFolder ? (
              <>
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Folder size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Thư mục "{currentFolder.name}" chưa có câu hỏi nào.
                </p>
                <p className="text-xs text-slate-500 max-w-sm text-center">
                  Hãy thêm câu hỏi mới trực tiếp vào thư mục này để xây dựng ngân hàng đề thi.
                </p>
                {hasPermission('questions:create') && <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => navigate(`/manage/questions/new?folderId=${currentFolder.id}`)}
                  className="mt-2"
                >
                  Soạn câu hỏi cho thư mục này
                </Button>}
              </>
            ) : (
              <p>Không có dữ liệu phù hợp với bộ lọc.</p>
            )}
          </div>
        ) : (
          <>
          {/* Mobile question cards; desktop table uses the same API rows below. */}
          <div className="flex-1 min-h-0 w-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 p-4 sm:hidden">
            <div className="w-full max-w-[1800px] mx-auto border-t border-slate-200 dark:border-slate-800">
              {activeList.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onPreview={setPreviewQuestion}
                />
              ))}
            </div>
          </div>
          <div className="hidden sm:flex flex-1 min-h-full w-full">
          <QuestionTable
            columns={isFolderRoot ? FOLDER_COLUMNS : activeQuestionColumns}
            rows={activeList}
            page={page}
            pageSize={pageSize}
            formatCell={formatField}
            onOpen={viewMode === 'folder' && !currentFolder ? setCurrentFolder : setPreviewQuestion}
            selectedIds={selectedItems}
            onSelectedIdsChange={setSelectedItems}
            preferenceKey={isFolderRoot ? 'table:questions:folders' : 'table:questions:list'}
            onSort={(field) => {
              if (!field || field === 'actions') return;
              setSortField(field);
              setSortAsc(sortField === field ? !sortAsc : true);
            }}
          />
          </div>
          </>
        )}
      </div>

      {/* 3. WORKSTATION STATUS & PAGINATION FOOTER */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-3 h-8 min-h-[32px] flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 shrink-0 select-none">
        <TableStatusFooter
          title="Ngân hàng câu hỏi"
          leftExtra={
            isFolderRoot ? (
              <span className="text-slate-500 dark:text-slate-400 shrink-0">
                · {sortedFolders.length} thư mục
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 shrink-0">
                {currentFolder && (
                  <>
                    · Thư mục: <strong className="text-blue-700 dark:text-blue-400 font-medium">{currentFolder.name}</strong>{' '}
                  </>
                )}
                · {totalCount.toLocaleString('vi-VN')} câu hỏi
              </span>
            )
          }
          selectedCount={selectedItems.length}
          loading={loading}
          onExport={hasPermission('questions:view') ? () => setExportModalOpen(true) : null}
          onImport={hasPermission('questions:import') ? () => setImportModalOpen(true) : null}
          importLabel="Nhập câu hỏi"
          onColumnSettings={!isFolderRoot && hasPermission('questions:view') ? () => setColumnSettingsModalOpen(true) : null}
          pageSize={pageSize}
          onPageSizeChange={size => {
            setPageSize(size);
            setPage(1);
          }}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* 4. MODALS */}
      {/* Modal: Column Settings */}
      <Modal
        open={columnSettingsModalOpen}
        onClose={() => setColumnSettingsModalOpen(false)}
        title="Tùy chỉnh cột hiển thị trong bảng câu hỏi"
        size="lg"
        footer={<div className="flex flex-wrap w-full justify-between items-center gap-3">
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllColumns}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={handleResetColumns}
                className="text-slate-600 dark:text-slate-400 hover:underline"
              >
                Mặc định
              </button>
            </div>

            <Button variant="primary" size="sm" onClick={() => setColumnSettingsModalOpen(false)}>
              Xong
            </Button>
          </div>}
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tích chọn các trường thông tin bạn muốn hiển thị trên trạm làm việc. Cài đặt được lưu tự động.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-slate-200/80 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 text-xs">
            {ALL_COLUMNS.map((col) => {
              const isChecked = visibleColumns.includes(col.id);
              const isLocked = col.id === 'content' || col.id === 'actions';
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 select-none ${
                    isLocked ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-800 dark:text-slate-200 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isLocked}
                    onChange={() => handleToggleColumn(col.id)}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{col.label}</span>
                  {isLocked && <span className="text-[10px] text-slate-400">(Bắt buộc)</span>}
                </label>
              );
            })}
          </div>


        </div>
      </Modal>



      {/* Modal: Export Data */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title={isFolderRoot ? "Kết xuất danh sách Thư mục câu hỏi" : "Kết xuất Ngân hàng câu hỏi"}
        defaultFilename={isFolderRoot ? "ThuMuc_CauHoi" : "NganHang_CauHoi"}
        columns={isFolderRoot ? FOLDER_COLUMNS : ALL_COLUMNS}
        selectedRows={isFolderRoot ? sortedFolders.filter(f => selectedItems.includes(f.id || f.name)) : allQuestions.filter(q => selectedItems.includes(q.id))}
        currentPageRows={activeList}
        totalCount={isFolderRoot ? sortedFolders.length : totalCount}
        onFetchAllRows={async () => {
          if (isFolderRoot) return sortedFolders;
          const filterFolderId = viewMode === 'folder' && currentFolder ? currentFolder.id : '';
          const res = await questionsApi.getQuestions({
            search,
            level: selectedLevel,
            format: selectedFormat,
            isCritical: onlyCritical ? 'true' : '',
            folderId: filterFolderId,
            page: 1,
            pageSize: 10000,
            filters: fieldFilters.questions,
            sortField,
            sortAsc,
          });
          return res.data || [];
        }}
      />

      {/* Modal: Batch Import Questions */}
      <BatchImportQuestionsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        folderId={currentFolder?.id || ''}
        onImportSuccess={handleImportSuccess}
      />

      {/* Modal: Question Detail Preview & Simulation */}
      {previewQuestion && (
        <Modal
          open={!!previewQuestion}
          onClose={() => setPreviewQuestion(null)}
          title={`Chi tiết câu hỏi #${previewQuestion.id}`}
          size="xl"
          footer={<div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setPreviewQuestion(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const id = previewQuestion.id;
                  setPreviewQuestion(null);
                  navigate(`/manage/questions/${id}/edit`);
                }}
              >
                Chỉnh sửa câu hỏi này
              </Button>
            </div>}
        >
          <div className="flex flex-col gap-3 text-xs text-slate-800 dark:text-slate-200">
            {/* Meta info header */}
            <div className="flex items-center gap-3 flex-wrap p-3 rounded-md bg-slate-50/60 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div>
                Cấp độ:{' '}
                <strong className="text-blue-700 dark:text-blue-400">
                  {levelCatalog.labelFor(previewQuestion.level)}
                </strong>
              </div>
              <div>
                Dạng bài: <strong>{previewQuestion.formatLabel || previewQuestion.format}</strong>
              </div>
              <div>
                Điểm liệt:{' '}
                {previewQuestion.isCritical ? (
                  <strong className="text-rose-600 dark:text-rose-400">Có (Bắt buộc đúng 100%)</strong>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">Không</span>
                )}
              </div>
              <div>
                Trạng thái:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {previewQuestion.status === 'published' ? 'Đã xuất bản' : previewQuestion.status}
                </strong>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[["Chuyên môn", previewQuestion.subjectName], ["Chủ đề", previewQuestion.topicName], ["Nhóm đối tượng", previewQuestion.targetGroupName], ["Mức độ nhận thức", previewQuestion.difficultyLabel]].map(([label,value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold mt-1">{value || '—'}</dd></div>)}
            </dl>
            {/* Question Content */}
            <div className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap break-words select-text">
              {previewQuestion.content}
            </div>

            {/* Technical Diagram / Simulation Image */}
            {previewQuestion.imageUrl && (
              <div className="my-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 flex flex-col items-center justify-center">
                <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-1 font-mono">
                  <span>SƠ ĐỒ / HÌNH ẢNH MÔ PHỎNG KỸ THUẬT</span>
                  <span className="text-emerald-400 font-semibold">Chuẩn tỷ lệ hiển thị</span>
                </div>
                <img
                  src={previewQuestion.imageUrl}
                  alt="Sơ đồ kỹ thuật mô phỏng câu hỏi"
                  className="max-h-72 max-w-full rounded object-contain shadow-xs"
                />
              </div>
            )}

            {/* Critical Question Reason Banner */}
            {previewQuestion.isCritical && previewQuestion.criticalReason && (
              <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300 mb-1">
                  <span>⚡ QUY CHUẨN ĐIỂM LIỆT (BẮT BUỘC ĐÚNG 100%):</span>
                </div>
                <p className="leading-relaxed">{previewQuestion.criticalReason}</p>
              </div>
            )}

            {/* If question has interactive HMI simulation */}
            {previewQuestion.format === 'simulation_hmi' && (
              <div className="mt-1">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Bảng Điều Khiển Mô Phỏng HMI / SCADA Trực Quan:
                </div>
                <InteractiveHmiSimulation
                  question={previewQuestion}
                  onComplete={() => addToast('Mô phỏng thành công! Đã ghi nhận thao tác đúng.', 'success')}
                />
              </div>
            )}

            {/* Options display */}
            {previewQuestion.format !== 'simulation_hmi' && previewQuestion.options?.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300">Các lựa chọn trắc nghiệm:</div>
                {previewQuestion.options.map((opt, oIdx) => (
                  <div
                    key={opt.id || oIdx}
                    className={`p-2.5 rounded-md border flex items-center justify-between text-xs transition-colors ${
                      opt.isCorrect
                        ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-700 text-slate-900 dark:text-slate-100'
                        : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span><strong className="font-mono text-slate-500 mr-1">{String.fromCharCode(65 + oIdx)}.</strong>{opt.text}</span>
                    {opt.isCorrect && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] shrink-0 ml-2">
                        ✓ Đáp án đúng
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Essay / Numerical Calculation Rubrics */}
            {previewQuestion.type === 'essay' && (
              <div className="space-y-2 mt-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Thang điểm chấm & Tiêu chí giải bài toán tự luận / nhập số:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    Tổng: {previewQuestion.rubrics?.reduce((acc, r) => acc + (Number(r.maxScore) || 0), 0) || 10} điểm
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/60">
                  {previewQuestion.rubrics?.map((rubric, rIdx) => (
                    <div key={rubric.id || rIdx} className="p-2.5 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{rubric.title}</div>
                        {rubric.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{rubric.description}</div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                        {rubric.maxScore} điểm
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewQuestion.explanation && (
              <div className="p-3 rounded-md bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 text-slate-700 dark:text-slate-200 leading-relaxed text-xs">
                <strong className="text-emerald-700 dark:text-emerald-400">Đáp án chi tiết & Hướng dẫn tính toán: </strong>
                {previewQuestion.explanation}
              </div>
            )}

            {/* Actions in Modal */}

          </div>
        </Modal>
      )}
    </ManagementFrame>
  );
}
