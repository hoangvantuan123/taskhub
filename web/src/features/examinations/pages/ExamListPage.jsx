import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Tabs from '../../../shared/ui/Tabs';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import FilterToggleMenu from '../../../shared/ui/FilterToggleMenu';
import ExamDetailPage from '../components/ExamDetailPage';
import { assessmentsApi } from '../../assessments/services/assessments.api';
import { formatDate } from '../../../shared/lib/formatters';
import { notify } from '../../../shared/lib/notify';
import { Plus, Search, RotateCcw } from 'lucide-react';

const examColumns = [
  { id: 'code', label: 'Mã ca thi', width: 170, minWidth: 130 },
  { id: 'title', label: 'Tên ca thi', width: 280, minWidth: 200 },
  { id: 'assessmentTitle', label: 'Bộ đề thi liên kết', width: 260, minWidth: 180 },
  { id: 'durationMinutesText', label: 'Thời lượng', width: 120, minWidth: 90 },
  { id: 'startTimeFormatted', label: 'Mở ca', width: 160, minWidth: 130 },
  { id: 'endTimeFormatted', label: 'Đóng ca', width: 160, minWidth: 130 },
  { id: 'location', label: 'Vị trí / Trạm', width: 180, minWidth: 130 },
  { id: 'statusText', label: 'Trạng thái', width: 130, minWidth: 100 },
  { id: 'attemptCountText', label: 'Lượt thi', width: 100, minWidth: 80 },
];

export default function ExamListPage() {
  const [params, setParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const isCreateMode = params.get('mode') === 'create';
  const selectedExamId = params.get('examId');
  const selectedExam = exams.find(e => e.id === selectedExamId);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sessionsRes, asmRes] = await Promise.all([
        assessmentsApi.listSessions().catch(() => ({ data: [] })),
        assessmentsApi.list().catch(() => ({ data: [] })),
      ]);
      setExams(sessionsRes.data || []);
      setAssessments((asmRes.data || []).filter(a => a.status === 'published'));
    } catch (err) {
      notify('Không tải được danh sách ca thi: ' + (err.message || 'Lỗi hệ thống'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const statusMap = {
      scheduled: 'Sắp diễn ra',
      in_progress: 'Đang mở ca',
      completed: 'Đã hoàn tất',
      cancelled: 'Đã hủy',
    };

    return exams
      .map(e => ({
        ...e,
        durationMinutesText: `${e.durationMinutes || 45} phút`,
        startTimeFormatted: formatDate(e.startTime),
        endTimeFormatted: formatDate(e.endTime),
        statusText: statusMap[e.status] || e.status || '—',
        attemptCountText: `${e.attemptCount || 0} bài`,
      }))
      .filter(e => {
        const matchesSearch =
          !q ||
          (e.code || '').toLowerCase().includes(q) ||
          (e.title || '').toLowerCase().includes(q) ||
          (e.assessmentTitle || '').toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q);

        const matchesFilters = Object.entries(filters).every(([key, filterVal]) => {
          if (!filterVal) return true;
          if (key === 'status') return e.status === filterVal;
          if (key === 'location') return (e.location || '').includes(filterVal);
          return true;
        });

        return matchesSearch && matchesFilters;
      });
  }, [exams, search, filters]);

  const pagedExams = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const applySearch = () => {
    setSearch(searchDraft);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setFilters({});
    setPage(1);
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

  // If in Create Mode or Viewing/Editing an Exam -> Render In-Screen Workspace!
  if (isCreateMode || selectedExam) {
    return (
      <ExamDetailPage
        exam={selectedExam}
        isCreate={isCreateMode}
        assessments={assessments}
        onBack={() => {
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('mode');
            next.delete('examId');
            return next;
          });
        }}
        onSaved={() => {
          loadAll();
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('mode');
            next.delete('examId');
            return next;
          });
        }}
      />
    );
  }

  // Strict Plain Text Cell Formatter
  const formatCell = (column, row) => {
    if (column.id === 'code') {
      return (
        <button
          type="button"
          onClick={() => setParams({ examId: row.id, mode: 'edit' })}
          className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer text-left truncate outline-none"
        >
          {row.code || row.id}
        </button>
      );
    }
    return row[column.id] || '—';
  };

  const hasActiveFilters = Boolean(search) || Object.values(filters).some(val => val !== '');

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'exams', label: 'Tổ chức ca thi' }]}
            activeTab="exams"
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setParams({ mode: 'create' })}
            >
              Tổ chức ca thi mới
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
              placeholder="Tìm mã ca thi, tên kỳ thi, đề thi…"
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

          {/* Dynamic Filter Controls */}
          {Object.entries(filters).map(([key, value]) =>
            key === 'status' ? (
              <Select
                key={key}
                size="sm"
                className="w-44 text-xs font-medium"
                aria-label="Lọc trạng thái"
                searchable={false}
                value={value}
                onChange={e => {
                  setFilters(prev => ({ ...prev, [key]: e?.target?.value ?? e }));
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'scheduled', label: 'Sắp diễn ra' },
                  { value: 'in_progress', label: 'Đang mở ca' },
                  { value: 'completed', label: 'Đã hoàn tất' },
                  { value: 'cancelled', label: 'Đã hủy' },
                ]}
              />
            ) : null
          )}

          <FilterToggleMenu
            columns={[
              { id: 'status', label: 'Trạng thái ca thi' },
            ]}
            filters={filters}
            preferenceKey="manage-exams"
            onRestore={setFilters}
            onToggle={toggleFilter}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              title="Xóa tất cả bộ lọc"
              aria-label="Xóa tất cả bộ lọc"
              className="h-8 w-8 shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer rounded-lg"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      }
      status={
        <TableStatusFooter
          title="Tổ chức ca thi"
          totalCount={filtered.length}
          unit="ca thi"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setPageSize(size);
            setPage(1);
          }}
          columnMenuTargetId="manage-exams-column-menu"
        />
      }
    >
      <VirtualDataTable
        preferenceKey="manage-exams-table"
        columnMenuTargetId="manage-exams-column-menu"
        columns={examColumns}
        rows={pagedExams}
        page={page}
        pageSize={pageSize}
        formatCell={formatCell}
        onOpen={row => setParams({ examId: row.id, mode: 'edit' })}
        rowHeight={44}
      />
    </ManagementFrame>
  );
}
