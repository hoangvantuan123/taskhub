import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw, ArrowLeft, Search } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import Input from '../../../shared/ui/Input';
import Tabs from '../../../shared/ui/Tabs';
import { notify } from '../../../shared/lib/notify';

const INITIAL_MANAGERS = [
  {
    id: 'MGR-01',
    deptName: 'Phòng Kỹ thuật & R&D',
    headName: 'Trần Văn Kỹ Sư',
    deputyName: 'Lê Văn Phó Phòng',
    approvalScope: 'Nghiệm thu bản vẽ, kiểm tra mẫu vật liệu mới',
    decisionNo: 'QĐ-2024/08-BGD',
    appointedDate: '01/01/2024',
    status: 'Hoạt động',
  },
  {
    id: 'MGR-02',
    deptName: 'Khối Sản xuất & Nhà máy Hưng Yên',
    headName: 'Lê Văn Quản Lý',
    deputyName: 'Bùi Văn Quản Đốc',
    approvalScope: 'Lập lệnh sản xuất, phân ca thợ, duyệt sửa chữa máy',
    decisionNo: 'QĐ-2023/15-BGD',
    appointedDate: '15/06/2023',
    status: 'Hoạt động',
  },
  {
    id: 'MGR-03',
    deptName: 'Phòng Quản lý chất lượng (QC/KCS)',
    headName: 'Hoàng Văn KCS',
    deputyName: 'Nguyễn Thị Kiểm Định',
    approvalScope: 'Ký biên bản nghiệm thu KCS, phát hành phiếu lỗi',
    decisionNo: 'QĐ-2024/02-BGD',
    appointedDate: '10/02/2024',
    status: 'Hoạt động',
  },
  {
    id: 'MGR-04',
    deptName: 'Phòng Kinh doanh & Dự án',
    headName: 'Phạm Thị Trưởng Phòng',
    deputyName: 'Vũ Văn Phó Kinh Doanh',
    approvalScope: 'Duyệt hạn tiến độ đơn hàng, nghiệm thu bàn giao',
    decisionNo: 'QĐ-2023/40-BGD',
    appointedDate: '01/11/2023',
    status: 'Hoạt động',
  },
  {
    id: 'MGR-05',
    deptName: 'Phòng Hành chính - Nhân sự',
    headName: 'Đỗ Thị Nhân Sự',
    deputyName: 'Trần Văn Tuyển Dụng',
    approvalScope: 'Duyệt tuyển dụng, điều chuyển nhân viên, phê duyệt KPI',
    decisionNo: 'QĐ-2022/19-BGD',
    appointedDate: '01/05/2022',
    status: 'Hoạt động',
  },
];

export default function DepartmentManagersPage() {
  const [params, setParams] = useSearchParams();
  const [managers, setManagers] = useState(INITIAL_MANAGERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const activeId = params.get('item');
  const isCreating = activeId === 'new';
  const activeManager = useMemo(() => {
    if (isCreating) {
      return {
        id: `MGR-${String(managers.length + 1).padStart(2, '0')}`,
        deptName: '',
        headName: '',
        deputyName: '',
        approvalScope: '',
        decisionNo: '',
        appointedDate: '07/11/2026',
        status: 'Hoạt động',
      };
    }
    return managers.find(m => m.id === activeId) || null;
  }, [activeId, isCreating, managers]);

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  React.useEffect(() => {
    if (activeManager) {
      setDraft({ ...activeManager });
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsDirty(false);
    }
  }, [activeManager]);

  const columns = useMemo(
    () => [
      { id: 'deptName', label: 'Phòng ban / Đơn vị', width: 260, sortable: true },
      { id: 'headName', label: 'Trưởng đơn vị', width: 200, sortable: true },
      { id: 'deputyName', label: 'Phó phòng / Phụ trách', width: 200 },
      { id: 'approvalScope', label: 'Thẩm quyền phê duyệt', width: 320 },
      { id: 'decisionNo', label: 'Số quyết định bổ nhiệm', width: 180 },
      { id: 'appointedDate', label: 'Ngày hiệu lực', width: 140 },
      { id: 'status', label: 'Trạng thái', width: 120 },
    ],
    []
  );

  const filteredManagers = useMemo(() => {
    return managers.filter(m => {
      const matchSearch =
        !search ||
        m.deptName.toLowerCase().includes(search.toLowerCase()) ||
        m.headName.toLowerCase().includes(search.toLowerCase()) ||
        m.deputyName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [managers, search, statusFilter]);

  const paginatedManagers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredManagers.slice(start, start + pageSize);
  }, [filteredManagers, page, pageSize]);

  const handleOpenDetail = row => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  const handleSaveDraft = e => {
    e.preventDefault();
    if (!draft.deptName.trim() || !draft.headName.trim()) {
      notify('Phòng ban và Trưởng đơn vị không được để trống', 'error');
      return;
    }
    if (isCreating) {
      setManagers(prev => [draft, ...prev]);
      notify(`Đã phân công lãnh đạo cho "${draft.deptName}"`, 'success');
    } else {
      setManagers(prev => prev.map(m => (m.id === draft.id ? draft : m)));
      notify(`Đã cập nhật phân công lãnh đạo cho "${draft.deptName}"`, 'success');
    }
    handleCloseWorkspace();
  };

  // In-Screen Workspace
  if (activeManager && draft) {
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
                  {isCreating ? 'Bổ nhiệm lãnh đạo phòng ban mới' : `Phân công: ${draft.deptName}`}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Trưởng phòng: {draft.headName || 'Chưa gán'} · Số QĐ: {draft.decisionNo || 'Chưa có'}
                  {isDirty && <span className="ml-2 text-amber-600 dark:text-amber-400 italic">(Có thay đổi chưa lưu)</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCloseWorkspace}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveDraft} disabled={!isDirty}>
                {isCreating ? 'Xác nhận bổ nhiệm' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          {/* CỘT TRÁI: FORM CƠ BẢN (360px) */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông tin bổ nhiệm
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phòng ban / Đơn vị <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.deptName}
                onChange={e => {
                  setDraft(d => ({ ...d, deptName: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Phòng Kế hoạch..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên Trưởng đơn vị <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.headName}
                onChange={e => {
                  setDraft(d => ({ ...d, headName: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="VD: Nguyễn Văn Trưởng"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên Phó phòng / Người ủy quyền
              </label>
              <Input
                value={draft.deputyName}
                onChange={e => {
                  setDraft(d => ({ ...d, deputyName: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="VD: Lê Văn Phó"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Số quyết định bổ nhiệm
              </label>
              <Input
                value={draft.decisionNo}
                onChange={e => {
                  setDraft(d => ({ ...d, decisionNo: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="QĐ-2026/01-BGD"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngày có hiệu lực
              </label>
              <Input
                value={draft.appointedDate}
                onChange={e => {
                  setDraft(d => ({ ...d, appointedDate: e.target.value }));
                  setIsDirty(true);
                }}
              />
            </div>
          </div>

          {/* CỘT PHẢI: THẨM QUYỀN PHÊ DUYỆT */}
          <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Phạm vi thẩm quyền & Quyền hạn phê duyệt
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quy định các loại công việc, ngân sách và biên bản mà lãnh đạo phòng có quyền ký duyệt
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả thẩm quyền phê duyệt
              </label>
              <textarea
                className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={4}
                value={draft.approvalScope}
                onChange={e => {
                  setDraft(d => ({ ...d, approvalScope: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Nghiệm thu kỹ thuật, duyệt chi dưới 50 triệu..."
              />
            </div>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Quyền hạn hệ thống tự động gán
              </div>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Quyền giao việc và chỉ định người chịu trách nhiệm trong phòng ban</li>
                <li>Quyền phê duyệt hoặc từ chối nghiệm thu công việc của cấp dưới</li>
                <li>Quyền đánh giá KPI và xác nhận báo cáo tiến độ tuần/tháng</li>
              </ul>
            </div>
          </div>
        </div>
      </ManagementFrame>
    );
  }

  // 4-Layer Standard Architecture (Identical to UserManagementPage)
  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <>
          <Tabs
            tabs={[
              { id: 'managers', label: 'Phân công quản lý phòng ban' }
            ]}
            activeTab="managers"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setParams({ item: 'new' })}
            >
              Bổ nhiệm lãnh đạo
            </Button>
          </div>
        </>
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-64 max-w-full">
            <SearchInput
              size="sm"
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo phòng ban, trưởng phòng…"
            />
          </div>

          <button
            type="button"
            title="Tìm kiếm"
            aria-label="Tìm kiếm"
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Search size={15} />
          </button>

          <Select
            size="sm"
            className="w-44 text-xs font-medium"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'Hoạt động', label: 'Hoạt động' },
              { value: 'Tạm ngưng', label: 'Tạm ngưng' },
            ]}
          />

          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Xóa tất cả bộ lọc"
              aria-label="Xóa tất cả bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      }
      status={
        <TableStatusFooter
          title="Phân công quản lý"
          totalCount={filteredManagers.length}
          selectedCount={selectedIds.length}
          unit="đơn vị"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredManagers.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-depts-managers-column-menu"
          onExport={() => notify('Đang xuất danh sách phân công quản lý...', 'info')}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="admin-depts-managers:table"
        columnMenuTargetId="admin-depts-managers-column-menu"
        columns={columns}
        rows={paginatedManagers}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={handleOpenDetail}
        formatCell={(column, row) => {
          if (column.id === 'deptName') {
            return (
              <span className="font-medium text-slate-800 dark:text-slate-200 hover:underline cursor-pointer">
                {row.deptName}
              </span>
            );
          }
          if (column.id === 'headName') {
            return <strong className="text-slate-800 dark:text-slate-200">{row.headName}</strong>;
          }
          return String(row[column.id] ?? '—');
        }}
      />
    </ManagementFrame>
  );
}

