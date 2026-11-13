import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';

const INITIAL_LOGS = [
  {
    id: 'LOG-01',
    timestamp: '07/11/2026 15:12:45',
    actor: 'admin (Nguyễn Văn Quản Trị)',
    action: 'Cập nhật phân quyền vai trò',
    resource: 'Role: dept_manager',
    ip: '127.0.0.1 (Nội bộ)',
    status: 'Thành công',
    details: 'Cấp thêm quyền tasks:export và approvals:approve cho vai trò Trưởng phòng',
  },
  {
    id: 'LOG-02',
    timestamp: '07/11/2026 14:55:10',
    actor: 'head_tech (Trần Văn Trưởng)',
    action: 'Nghiệm thu công việc',
    resource: 'Task: TSK-008 (Bảo trì máy in số 3)',
    ip: '192.168.1.104',
    status: 'Thành công',
    details: 'Đã nghiệm thu đạt 100% chuẩn KCS, xác nhận hoàn thành công việc',
  },
  {
    id: 'LOG-03',
    timestamp: '07/11/2026 14:30:22',
    actor: 'dev_tech (Lê Văn Kỹ Thuật)',
    action: 'Cập nhật tiến độ nhiệm vụ',
    resource: 'Task: TSK-008',
    ip: '192.168.1.115',
    status: 'Thành công',
    details: 'Tăng tiến độ từ 60% lên 90%, đính kèm 2 ảnh chụp đồng hồ áp suất',
  },
  {
    id: 'LOG-04',
    timestamp: '07/11/2026 13:40:05',
    actor: 'superadmin (Hệ Thống)',
    action: 'Đồng bộ cơ sở dữ liệu',
    resource: 'Schema: taskgs',
    ip: '127.0.0.1',
    status: 'Thành công',
    details: 'Nạp thành công 374 node phân quyền và dọn dẹp các scope cũ',
  },
  {
    id: 'LOG-05',
    timestamp: '07/11/2026 11:20:18',
    actor: 'user01 (Nhân viên mới)',
    action: 'Đổi mật khẩu tài khoản',
    resource: 'User: user01',
    ip: '192.168.1.189',
    status: 'Thành công',
    details: 'Thay đổi mật khẩu mặc định sau lần đăng nhập đầu tiên',
  },
  {
    id: 'LOG-06',
    timestamp: '07/11/2026 10:05:40',
    actor: 'khach_hang_test',
    action: 'Đăng nhập thất bại',
    resource: 'Auth: /api/auth/login',
    ip: '14.238.10.22',
    status: 'Từ chối (Sai mật khẩu)',
    details: 'Nhập sai mật khẩu liên tiếp 3 lần, kích hoạt cơ chế khóa tạm 5 phút',
  },
];

export default function ActivityLogPage() {
  const [params, setParams] = useSearchParams();
  const [logs] = useState(INITIAL_LOGS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const activeId = params.get('item');
  const activeLog = useMemo(() => logs.find(l => l.id === activeId) || null, [activeId, logs]);

  const columns = useMemo(
    () => [
      { id: 'timestamp', label: 'Thời gian', width: 170, sortable: true },
      { id: 'actor', label: 'Người thực hiện', width: 240, sortable: true },
      { id: 'action', label: 'Hành động', width: 220 },
      { id: 'resource', label: 'Đối tượng tác động', width: 260 },
      { id: 'ip', label: 'Địa chỉ IP', width: 160 },
      { id: 'status', label: 'Kết quả', width: 170 },
    ],
    []
  );

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchSearch =
        !search ||
        l.actor.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.resource.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || l.status.includes(statusFilter);
      return matchSearch && matchStatus;
    });
  }, [logs, search, statusFilter]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  const handleOpenDetail = row => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  if (activeLog) {
    return (
      <ManagementFrame
        scrollableContent={false}
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleCloseWorkspace}>
                <ArrowLeft size={16} className="mr-1.5" />
                Quay lại
              </Button>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Chi tiết nhật ký: {activeLog.action}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Thời điểm: {activeLog.timestamp} · Thực hiện bởi: {activeLog.actor}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleCloseWorkspace}>
              Đóng
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông số định danh
            </div>
            <div>
              <span className="block text-xs text-slate-400">Mã nhật ký</span>
              <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                {activeLog.id}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Địa chỉ mạng IP</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                {activeLog.ip}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Kết quả thực thi</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {activeLog.status}
              </span>
            </div>
          </div>
          <div className="p-6 overflow-y-auto bg-white dark:bg-slate-950 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Nội dung chi tiết thao tác
            </h3>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {activeLog.details}
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400 mb-2">
                Dữ liệu Audit JSON Payload (Bất biến)
              </div>
              <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(activeLog, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </ManagementFrame>
    );
  }

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Nhật ký hoạt động hệ thống (Activity Audit Logs)
            </h1>
            <p className="text-[11px] text-slate-400">
              Truy vết toàn bộ các thao tác giao việc, sửa tiến độ, nghiệm thu và cấu hình quyền
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
              placeholder="Tìm theo người thực hiện, hành động hoặc đối tượng..."
              className="w-72"
            />
            <div className="w-48">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Tất cả kết quả"
                options={[
                  { value: '', label: 'Tất cả kết quả' },
                  { value: 'Thành công', label: 'Thành công' },
                  { value: 'Từ chối', label: 'Từ chối / Lỗi' },
                ]}
              />
            </div>
            {(search || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                }}
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
          title="Nhật ký hoạt động"
          totalCount={filteredLogs.length}
          selectedCount={selectedIds.length}
          unit="bản ghi"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredLogs.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onExport={() => notify('Đang xuất nhật ký hoạt động...', 'info')}
        />
      }
    >
      <VirtualDataTable
        columns={columns}
        rows={paginatedLogs}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={handleOpenDetail}
        formatCell={(column, row) => {
          if (column.id === 'actor') {
            return (
              <span className="font-medium text-slate-800 dark:text-slate-200 hover:underline cursor-pointer">
                {row.actor}
              </span>
            );
          }
          return String(row[column.id] ?? '—');
        }}
      />
    </ManagementFrame>
  );
}

