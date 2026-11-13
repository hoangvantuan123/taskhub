import React, { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';

const INITIAL_LOGINS = [
  {
    id: 'LGN-01',
    loginTime: '07/11/2026 15:10:02',
    username: 'admin',
    fullName: 'Nguyễn Văn Quản Trị',
    device: 'Chrome 156 on macOS Sonoma',
    ip: '127.0.0.1 (Localhost)',
    status: 'Thành công',
    sessionDuration: 'Đang hoạt động',
  },
  {
    id: 'LGN-02',
    loginTime: '07/11/2026 14:02:15',
    username: 'head_tech',
    fullName: 'Trần Văn Trưởng',
    device: 'Edge 130 on Windows 11',
    ip: '192.168.1.104',
    status: 'Thành công',
    sessionDuration: '1 giờ 12 phút',
  },
  {
    id: 'LGN-03',
    loginTime: '07/11/2026 13:45:30',
    username: 'dev_tech',
    fullName: 'Lê Văn Kỹ Thuật',
    device: 'Chrome 155 on Ubuntu 24.04',
    ip: '192.168.1.115',
    status: 'Thành công',
    sessionDuration: '1 giờ 30 phút',
  },
  {
    id: 'LGN-04',
    loginTime: '07/11/2026 11:20:10',
    username: 'user01',
    fullName: 'Nguyễn Thị Thử Nghiệm',
    device: 'Safari on iPadOS 18',
    ip: '192.168.1.189',
    status: 'Thành công',
    sessionDuration: '45 phút',
  },
  {
    id: 'LGN-05',
    loginTime: '07/11/2026 10:05:40',
    username: 'admin',
    fullName: 'Không xác định',
    device: 'Python-requests/2.31',
    ip: '14.238.10.22',
    status: 'Thất bại (Mật khẩu không đúng)',
    sessionDuration: '—',
  },
  {
    id: 'LGN-06',
    loginTime: '06/11/2026 18:30:00',
    username: 'superadmin',
    fullName: 'Quản Trị Viên Tối Cao',
    device: 'Firefox 132 on macOS',
    ip: '127.0.0.1',
    status: 'Thành công',
    sessionDuration: '3 giờ 15 phút',
  },
];

export default function LoginHistoryPage() {
  const [logins] = useState(INITIAL_LOGINS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const columns = useMemo(
    () => [
      { id: 'loginTime', label: 'Thời gian đăng nhập', width: 180, sortable: true },
      { id: 'username', label: 'Tài khoản', width: 140, sortable: true },
      { id: 'fullName', label: 'Họ và tên', width: 220 },
      { id: 'device', label: 'Thiết bị & Trình duyệt', width: 260 },
      { id: 'ip', label: 'Địa chỉ IP', width: 170 },
      { id: 'status', label: 'Trạng thái', width: 220 },
      { id: 'sessionDuration', label: 'Thời lượng phiên', width: 160 },
    ],
    []
  );

  const filteredLogins = useMemo(() => {
    return logins.filter(l => {
      const matchSearch =
        !search ||
        l.username.toLowerCase().includes(search.toLowerCase()) ||
        l.fullName.toLowerCase().includes(search.toLowerCase()) ||
        l.ip.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || l.status.includes(statusFilter);
      return matchSearch && matchStatus;
    });
  }, [logins, search, statusFilter]);

  const paginatedLogins = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogins.slice(start, start + pageSize);
  }, [filteredLogins, page, pageSize]);

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Lịch sử đăng nhập & Phiên làm việc
            </h1>
            <p className="text-[11px] text-slate-400">
              Giám sát địa chỉ IP, thiết bị kết nối và các lượt đăng nhập không thành công
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
              placeholder="Tìm theo tài khoản, tên hoặc địa chỉ IP..."
              className="w-72"
            />
            <div className="w-52">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'Thành công', label: 'Thành công' },
                  { value: 'Thất bại', label: 'Thất bại / Sai mật khẩu' },
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
          title="Lịch sử đăng nhập"
          totalCount={filteredLogins.length}
          selectedCount={selectedIds.length}
          unit="lượt"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredLogins.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onExport={() => notify('Đang xuất lịch sử đăng nhập...', 'info')}
        />
      }
    >
      <VirtualDataTable
        columns={columns}
        rows={paginatedLogins}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        formatCell={(column, row) => {
          if (column.id === 'username') {
            return <span className="font-mono text-slate-700 dark:text-slate-300">@{row.username}</span>;
          }
          return String(row[column.id] ?? '—');
        }}
      />
    </ManagementFrame>
  );
}

