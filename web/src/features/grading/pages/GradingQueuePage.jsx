import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Tabs from '../../../shared/ui/Tabs';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import { assessmentsApi } from '../../assessments/services/assessments.api';
import { formatDate, formatScore } from '../../../shared/lib/formatters';
import { Search, RotateCcw, RefreshCw } from 'lucide-react';

const gradingColumns = [
  { id: 'idShort', label: 'Mã bài nộp', width: 180, minWidth: 140 },
  { id: 'candidateName', label: 'Họ và tên thí sinh', width: 260, minWidth: 180 },
  { id: 'candidateEmail', label: 'Tài khoản Email', width: 240, minWidth: 180 },
  { id: 'examTitle', label: 'Kỳ thi / Ca thi', width: 280, minWidth: 200 },
  { id: 'submittedAtFormatted', label: 'Thời gian nộp', width: 170, minWidth: 140 },
  { id: 'statusText', label: 'Trạng thái chấm', width: 140, minWidth: 110 },
  { id: 'scoreDisplay', label: 'Điểm số đạt được', width: 150, minWidth: 120 },
];

export default function GradingQueuePage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await assessmentsApi.listGradingQueue();
      setSubmissions(res.data || []);
    } catch (e) {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions
      .map(s => ({
        ...s,
        idShort: String(s.id || '').slice(0, 12),
        submittedAtFormatted: formatDate(s.submittedAt),
        statusText: s.status === 'graded' ? 'Đã chốt điểm' : 'Chờ chấm',
        scoreDisplay: s.status === 'graded' ? formatScore(s.finalScore, s.maxScore || 10) : '—',
      }))
      .filter(s => {
        if (activeTab === 'pending' && s.status === 'graded') return false;
        if (activeTab === 'graded' && s.status !== 'graded') return false;

        if (!q) return true;
        return (
          (s.candidateName || '').toLowerCase().includes(q) ||
          (s.candidateEmail || '').toLowerCase().includes(q) ||
          (s.examTitle || '').toLowerCase().includes(q) ||
          (s.id || '').toLowerCase().includes(q)
        );
      });
  }, [submissions, activeTab, search]);

  const pagedSubmissions = useMemo(() => {
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

  // Strict Plain Text Cell Formatter
  const formatCell = (column, row) => {
    if (column.id === 'idShort') {
      return (
        <button
          type="button"
          onClick={() => navigate(`/manage/grading/${row.id}`)}
          className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer text-left truncate outline-none"
        >
          {row.idShort}…
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
            tabs={[
              { id: 'all', label: 'Tất cả bài thi' },
              { id: 'pending', label: 'Chờ chấm' },
              { id: 'graded', label: 'Đã hoàn tất' },
            ]}
            activeTab={activeTab}
            onChange={tab => {
              setActiveTab(tab);
              setPage(1);
            }}
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadQueue}
              disabled={loading}
            >
              Làm mới
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
              placeholder="Tìm thí sinh, mã bài nộp, kỳ thi…"
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
          title="Hàng đợi chấm thi"
          totalCount={filtered.length}
          unit="bài nộp"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setPageSize(size);
            setPage(1);
          }}
          columnMenuTargetId="manage-grading-column-menu"
        />
      }
    >
      <VirtualDataTable
        preferenceKey="manage-grading-table"
        columnMenuTargetId="manage-grading-column-menu"
        columns={gradingColumns}
        rows={pagedSubmissions}
        page={page}
        pageSize={pageSize}
        formatCell={formatCell}
        onOpen={row => navigate(`/manage/grading/${row.id}`)}
        rowHeight={44}
      />
    </ManagementFrame>
  );
}
