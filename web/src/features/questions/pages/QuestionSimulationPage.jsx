import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import SearchInput from '../../../shared/ui/SearchInput';
import Tabs from '../../../shared/ui/Tabs';
import Button from '../../../shared/ui/Button';
import { questionsApi } from '../services/questions.api';
import { notify } from '../../../shared/lib/notify';
import QuestionSimulationDetailPage from '../components/QuestionSimulationDetailPage';
import { Plus, Search, RotateCcw } from 'lucide-react';

const workflowOptions = [
  { value: 'complete_operation', label: 'Hoàn thành thao tác sản xuất' },
  { value: 'receive_material', label: 'Nhận vật liệu cho lệnh' },
  { value: 'return_material', label: 'Hoàn trả nguyên vật liệu' },
];

const workflowLabel = key => workflowOptions.find(option => option.value === key)?.label || 'Màn hình MES sản xuất';

const simulationColumns = [
  { id: 'name', label: 'Tên màn hình', width: 260, minWidth: 180 },
  { id: 'workflowText', label: 'Nghiệp vụ mô phỏng', width: 240, minWidth: 180 },
  { id: 'workOrder', label: 'Lệnh sản xuất', width: 220, minWidth: 160 },
  { id: 'mission', label: 'Yêu cầu thao tác (Mission)', width: 380, minWidth: 240 },
  { id: 'description', label: 'Mô tả bối cảnh', width: 280, minWidth: 180 },
];

export default function QuestionSimulationPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const isCreateMode = params.get('mode') === 'create';
  const selectedSimId = params.get('simId');
  const selectedItem = items.find(item => item.id === selectedSimId);

  const load = async () => {
    setLoading(true);
    try {
      const result = await questionsApi.getQuestionSimulations();
      setItems(result.data || []);
    } catch (error) {
      notify(error.message || 'Không tải được danh sách màn hình mô phỏng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .map(item => ({
        ...item,
        workflowText: workflowLabel(item.config?.workflow),
        workOrder: item.config?.workOrder || '—',
        mission: item.config?.mission || '—',
      }))
      .filter(item => {
        if (!q) return true;
        return (
          (item.name || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          (item.mission || '').toLowerCase().includes(q) ||
          (item.workOrder || '').toLowerCase().includes(q)
        );
      });
  }, [items, search]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const applySearch = () => {
    setSearch(searchDraft);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchDraft('');
    setSearch('');
    setPage(1);
  };

  // If in Create Mode or Viewing/Editing a Simulation -> Render In-Screen Workspace!
  if (isCreateMode || selectedItem) {
    return (
      <QuestionSimulationDetailPage
        item={selectedItem}
        isCreate={isCreateMode}
        onBack={() => {
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('mode');
            next.delete('simId');
            return next;
          });
        }}
        onSaved={() => {
          load();
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('mode');
            next.delete('simId');
            return next;
          });
        }}
      />
    );
  }

  // Strict Plain Text Cell Formatter
  const formatCell = (column, row) => {
    if (column.id === 'name') {
      return (
        <button
          type="button"
          onClick={() => setParams({ simId: row.id, mode: 'edit' })}
          className="font-medium text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer text-left truncate outline-none"
        >
          {row.name}
        </button>
      );
    }
    return row[column.id] || '—';
  };

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'simulations', label: 'Màn hình mô phỏng MES' }]}
            activeTab="simulations"
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setParams({ mode: 'create' })}
            >
              Tạo màn hình mô phỏng
            </Button>
          </div>
        </>
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-64 max-w-full">
            <SearchInput
              size="sm"
              value={searchDraft}
              placeholder="Tìm màn hình, lệnh sản xuất, mission…"
              onChange={e => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
              onClear={handleClearSearch}
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

          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              title="Xóa bộ lọc tìm kiếm"
              aria-label="Xóa bộ lọc tìm kiếm"
              className="h-8 w-8 shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer rounded-lg"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      }
      status={
        <TableStatusFooter
          title="Màn hình mô phỏng MES"
          totalCount={filtered.length}
          unit="cấu hình"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setPageSize(size);
            setPage(1);
          }}
          columnMenuTargetId="questions-simulations-column-menu"
        />
      }
    >
      <VirtualDataTable
        preferenceKey="questions-simulations-table"
        columnMenuTargetId="questions-simulations-column-menu"
        columns={simulationColumns}
        rows={pagedItems}
        page={page}
        pageSize={pageSize}
        formatCell={formatCell}
        onOpen={row => setParams({ simId: row.id, mode: 'edit' })}
        rowHeight={44}
      />
    </ManagementFrame>
  );
}
