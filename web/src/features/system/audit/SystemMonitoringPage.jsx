import React, { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import { notify } from '../../../shared/lib/notify';

const INITIAL_SERVICES = [
  {
    id: 'SVC-01',
    name: 'API Gateway (Node.js / Express)',
    hostPort: 'localhost:9643 (HTTP)',
    uptime: '1 ngày 6 giờ 22 phút',
    latency: '2.4 ms',
    memoryUsage: '68 MB',
    status: 'Hoạt động bình thường',
  },
  {
    id: 'SVC-02',
    name: 'Server Core (Go Microservice)',
    hostPort: '127.0.0.1:8081 (HTTP) / 60052 (gRPC)',
    uptime: '1 ngày 6 giờ 18 phút',
    latency: '0.8 ms',
    memoryUsage: '34 MB',
    status: 'Hoạt động bình thường',
  },
  {
    id: 'SVC-03',
    name: 'Server Task (Go Microservice)',
    hostPort: '127.0.0.1:8083 (HTTP) / 60053 (gRPC)',
    uptime: '4 giờ 45 phút',
    latency: '1.1 ms',
    memoryUsage: '28 MB',
    status: 'Hoạt động bình thường',
  },
  {
    id: 'SVC-04',
    name: 'PostgreSQL Database Engine',
    hostPort: 'localhost:5432 (TCP / taskgs)',
    uptime: '5 ngày 12 giờ',
    latency: '0.4 ms',
    memoryUsage: '210 MB (13 connections)',
    status: 'Hoạt động bình thường',
  },
];

export default function SystemMonitoringPage() {
  const [services] = useState(INITIAL_SERVICES);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Tên dịch vụ hệ thống', width: 280, sortable: true },
      { id: 'hostPort', label: 'Cổng & Giao thức lắng nghe', width: 260 },
      { id: 'uptime', label: 'Thời gian chạy liên tục (Uptime)', width: 210 },
      { id: 'latency', label: 'Độ trễ phản hồi (Latency)', width: 170 },
      { id: 'memoryUsage', label: 'Tài nguyên tiêu thụ', width: 200 },
      { id: 'status', label: 'Tình trạng dịch vụ', width: 180 },
    ],
    []
  );

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      return (
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.hostPort.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [services, search]);

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Giám sát hạ tầng & Sức khỏe hệ thống
            </h1>
            <p className="text-[11px] text-slate-400">
              Theo dõi thời gian thực các tiến trình API Gateway, Go Core, Task Service và PostgreSQL
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => notify('Đã làm mới dữ liệu giám sát', 'success')}
          >
            Làm mới ngay
          </Button>
        </div>
      }
      filters={
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <SearchInput
              size="sm"
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo tên dịch vụ hoặc cổng..."
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
          title="Giám sát hệ thống"
          totalCount={filteredServices.length}
          selectedCount={selectedIds.length}
          unit="dịch vụ"
          page={page}
          pageSize={pageSize}
          totalPages={1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onExport={() => notify('Đang xuất báo cáo sức khỏe hệ thống...', 'info')}
        />
      }
    >
      <VirtualDataTable
        columns={columns}
        rows={filteredServices}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        formatCell={(column, row) => {
          if (column.id === 'name') {
            return <span className="font-medium text-slate-800 dark:text-slate-200">{row.name}</span>;
          }
          if (column.id === 'hostPort') {
            return <span className="font-mono text-slate-600 dark:text-slate-400">@{row.hostPort}</span>;
          }
          return String(row[column.id] ?? '—');
        }}
      />
    </ManagementFrame>
  );
}

