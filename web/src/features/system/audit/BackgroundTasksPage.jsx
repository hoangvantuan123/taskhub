import React, { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';

const INITIAL_BG_TASKS = [
  {
    id: 'CRON-01',
    code: 'TASK_OVERDUE_SCANNER',
    name: 'Quét và cảnh báo nhiệm vụ quá hạn',
    schedule: 'Mỗi 15 phút (* /15 * * * *)',
    lastRun: '07/11/2026 15:15:00',
    nextRun: '07/11/2026 15:30:00',
    duration: '1.2 giây',
    status: 'Hoàn tất thành công',
  },
  {
    id: 'CRON-02',
    code: 'TASK_DAILY_BACKUP',
    name: 'Sao lưu cơ sở dữ liệu PostgreSQL',
    schedule: 'Hàng ngày lúc 01:00 AM (0 1 * * *)',
    lastRun: '07/11/2026 01:00:00',
    nextRun: '08/11/2026 01:00:00',
    duration: '42.8 giây',
    status: 'Hoàn tất thành công',
  },
  {
    id: 'CRON-03',
    code: 'TASK_CLEANUP_SESSIONS',
    name: 'Dọn dẹp phiên làm việc hết hạn',
    schedule: 'Mỗi 60 phút (0 * * * *)',
    lastRun: '07/11/2026 15:00:00',
    nextRun: '07/11/2026 16:00:00',
    duration: '0.4 giây',
    status: 'Hoàn tất thành công',
  },
  {
    id: 'CRON-04',
    code: 'TASK_SYNC_HRM_SHIFTS',
    name: 'Đồng bộ danh sách phân ca từ máy chấm công',
    schedule: 'Mỗi 30 phút (* /30 6-22 * * *)',
    lastRun: '07/11/2026 15:00:00',
    nextRun: '07/11/2026 15:30:00',
    duration: '3.1 giây',
    status: 'Hoàn tất thành công',
  },
  {
    id: 'CRON-05',
    code: 'TASK_METRICS_AGGREGATOR',
    name: 'Tổng hợp chỉ số KPI công việc phòng ban',
    schedule: 'Hàng đêm lúc 23:45 (45 23 * * *)',
    lastRun: '06/11/2026 23:45:00',
    nextRun: '07/11/2026 23:45:00',
    duration: '8.4 giây',
    status: 'Hoàn tất thành công',
  },
];

export default function BackgroundTasksPage() {
  const [tasks] = useState(INITIAL_BG_TASKS);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Mã tác vụ', width: 200, sortable: true },
      { id: 'name', label: 'Tên tiến trình nền', width: 280, sortable: true },
      { id: 'schedule', label: 'Chu kỳ chạy (Cron)', width: 240 },
      { id: 'lastRun', label: 'Lần chạy gần nhất', width: 170 },
      { id: 'duration', label: 'Thời lượng', width: 130 },
      { id: 'nextRun', label: 'Lần chạy tiếp theo', width: 170 },
      { id: 'status', label: 'Trạng thái', width: 180 },
    ],
    []
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      return (
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [tasks, search]);

  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, page, pageSize]);

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Quản lý tác vụ nền & Cron Jobs
            </h1>
            <p className="text-[11px] text-slate-400">
              Giám sát tình trạng các tiến trình quét hạn tự động, sao lưu CSDL và tổng hợp KPI
            </p>
          </div>
        </div>
      }
      filters={
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <SearchInput
              size="sm"
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo tên tiến trình hoặc mã..."
              className="w-72"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <RotateCcw size={14} className="mr-1" />
                Xóa lọc
              </Button>
            )}
          </div>
        </div>
      }
      status={
        <TableStatusFooter
          title="Tác vụ nền"
          totalCount={filteredTasks.length}
          selectedCount={selectedIds.length}
          unit="tiến trình"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredTasks.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onExport={() => notify('Đang xuất danh sách tác vụ nền...', 'info')}
        />
      }
    >
      <VirtualDataTable
        columns={columns}
        rows={paginatedTasks}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        formatCell={(column, row) => {
          if (column.id === 'code') {
            return <span className="font-mono text-slate-700 dark:text-slate-300">@{row.code}</span>;
          }
          return String(row[column.id] ?? '—');
        }}
      />
    </ManagementFrame>
  );
}

