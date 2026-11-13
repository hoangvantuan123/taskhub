import React, { useState, useMemo } from 'react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Tabs from '../../../shared/ui/Tabs';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import { notify } from '../../../shared/lib/notify';
import {
  RotateCcw,
  Search,
  Download,
} from 'lucide-react';

const TASK_REPORT_COLUMNS = [
  { id: 'code', label: 'Mã CV', width: 120 },
  { id: 'title', label: 'Tên công việc / Nhiệm vụ', width: 340 },
  { id: 'assignee', label: 'Người thực hiện', width: 180 },
  { id: 'department', label: 'Phòng ban', width: 170 },
  { id: 'progress', label: 'Tiến độ', width: 110 },
  { id: 'statusText', label: 'Trạng thái', width: 140 },
  { id: 'deadline', label: 'Hạn hoàn thành', width: 140 },
];

const TASK_REPORT_ROWS = [
  { id: '1', code: 'TSK-001', title: 'Thử nghiệm kéo đứt màng BOPP tráng ghép nhiệt', assignee: 'Trần Kỹ Sư', department: 'Kỹ thuật', progress: '100%', statusText: 'Đã hoàn thành', deadline: '2026-11-06' },
  { id: '2', code: 'TSK-002', title: 'Hiệu chỉnh máy in ống đồng 8 màu lô 4200 cuộn', assignee: 'Vũ Thợ Cả', department: 'Sản xuất', progress: '85%', statusText: 'Đang thực hiện', deadline: '2026-11-08' },
  { id: '3', code: 'TSK-003', title: 'Báo cáo thử nghiệm độ bám dính mực in', assignee: 'Lê Quản Lý', department: 'Kỹ thuật', progress: '40%', statusText: 'Chậm tiến độ', deadline: '2026-11-05' },
  { id: '4', code: 'TSK-004', title: 'Khảo sát nhu cầu màng nhôm thực phẩm tiệt trùng', assignee: 'Nguyễn Thị Hoa', department: 'Kinh doanh', progress: '90%', statusText: 'Đang thực hiện', deadline: '2026-11-10' },
  { id: '5', code: 'TSK-005', title: 'Kiểm tra nồng độ dung môi hữu cơ xưởng in NM1', assignee: 'Bùi KCS', department: 'Quản lý chất lượng (QA/QC)', progress: '100%', statusText: 'Đã hoàn thành', deadline: '2026-11-04' },
];

export default function TaskReportsSubPage() {
  const [rows] = useState(TASK_REPORT_ROWS);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.assignee.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rows, search]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const renderCell = (column, row) => {
    if (column.id === 'code') {
      return (
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {row.code}
        </span>
      );
    }
    if (column.id === 'title') {
      return (
        <span className="font-medium text-slate-900 dark:text-white">
          {row.title}
        </span>
      );
    }
    return String(row[column.id] || '—');
  };

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'task-reports', label: 'Báo cáo công việc' }]}
            activeTab="task-reports"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => notify.info('Đã tải lại danh sách công việc')}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={() => notify.info('Đang xuất báo cáo tiến độ công việc...')}
            >
              Xuất báo cáo
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
              onChange={(e) => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
              onClear={() => {
                setSearchDraft('');
                setSearch('');
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplySearch();
                }
              }}
              placeholder="Tìm mã CV, tên công việc, người làm…"
            />
          </div>

          <button
            type="button"
            title="Tìm kiếm"
            aria-label="Tìm kiếm"
            onClick={handleApplySearch}
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Search size={15} />
          </button>

          {search && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Xóa bộ lọc"
              aria-label="Xóa bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      }
      status={
        <TableStatusFooter
          title="Báo cáo công việc"
          totalCount={total}
          unit="công việc"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <VirtualDataTable
        columns={TASK_REPORT_COLUMNS}
        rows={pageItems}
        renderCell={renderCell}
        emptyText="Không có dữ liệu báo cáo công việc."
      />
    </ManagementFrame>
  );
}

