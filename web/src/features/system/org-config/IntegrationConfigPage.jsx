import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw, ArrowLeft } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import Input from '../../../shared/ui/Input';
import { notify } from '../../../shared/lib/notify';

const INITIAL_INTEGRATIONS = [
  {
    id: 'INT-01',
    code: 'INT_ERP_SAP',
    name: 'Kết nối đồng bộ lệnh sản xuất SAP ERP',
    type: 'REST API / Webhook',
    targetSystem: 'SAP S/4HANA Enterprise',
    direction: 'Hai chiều (Bi-directional)',
    status: 'Hoạt động',
    lastSync: '07/11/2026 15:00',
    description: 'Tự động lấy mã lệnh đơn hàng đóng gói và cập nhật sản lượng hoàn thành',
  },
  {
    id: 'INT-02',
    code: 'INT_HRM_BIOMETRIC',
    name: 'Đồng bộ ca kíp & Chấm công vân tay',
    type: 'Database Link (PostgreSQL)',
    targetSystem: 'Hệ thống HRM Goldsun',
    direction: 'Nhận dữ liệu (Inbound)',
    status: 'Hoạt động',
    lastSync: '07/11/2026 14:45',
    description: 'Cập nhật danh sách thợ vận hành có mặt tại xưởng để giao việc tự động',
  },
  {
    id: 'INT-03',
    code: 'INT_MES_SCADA',
    name: 'Kết nối cảm biến IoT máy in ống đồng',
    type: 'MQTT Broker / Modbus TCP',
    targetSystem: 'SCADA Factory Tiên Sơn',
    direction: 'Nhận dữ liệu (Inbound)',
    status: 'Hoạt động',
    lastSync: '07/11/2026 15:05',
    description: 'Thu thập số mét màng đã in, tốc độ trục quay và phát hiện dừng máy',
  },
  {
    id: 'INT-04',
    code: 'INT_SSO_LDAP',
    name: 'Xác thực tài khoản tập trung Active Directory',
    type: 'LDAP / OAuth2',
    targetSystem: 'Windows Server AD',
    direction: 'Xác thực một chiều',
    status: 'Tạm ngưng',
    lastSync: '01/11/2026 09:00',
    description: 'Cho phép nhân viên văn phòng đăng nhập bằng tài khoản email công ty',
  },
];

export default function IntegrationConfigPage() {
  const [params, setParams] = useSearchParams();
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const activeId = params.get('item');
  const isCreating = activeId === 'new';
  const activeInt = useMemo(() => {
    if (isCreating) {
      return {
        id: `INT-${String(integrations.length + 1).padStart(2, '0')}`,
        code: '',
        name: '',
        type: 'REST API / Webhook',
        targetSystem: '',
        direction: 'Hai chiều (Bi-directional)',
        status: 'Hoạt động',
        lastSync: 'Chưa đồng bộ',
        description: '',
      };
    }
    return integrations.find(i => i.id === activeId) || null;
  }, [activeId, isCreating, integrations]);

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  React.useEffect(() => {
    if (activeInt) {
      setDraft({ ...activeInt });
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsDirty(false);
    }
  }, [activeInt]);

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Mã kết nối', width: 170, sortable: true },
      { id: 'name', label: 'Tên hệ thống tích hợp', width: 280, sortable: true },
      { id: 'type', label: 'Giao thức kết nối', width: 190 },
      { id: 'targetSystem', label: 'Hệ thống đích', width: 200 },
      { id: 'direction', label: 'Chiều dữ liệu', width: 190 },
      { id: 'status', label: 'Trạng thái', width: 120 },
      { id: 'lastSync', label: 'Đồng bộ lần cuối', width: 160 },
    ],
    []
  );

  const filteredIntegrations = useMemo(() => {
    return integrations.filter(i => {
      const matchSearch =
        !search ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code.toLowerCase().includes(search.toLowerCase()) ||
        i.targetSystem.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || i.type.includes(typeFilter);
      return matchSearch && matchType;
    });
  }, [integrations, search, typeFilter]);

  const paginatedIntegrations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredIntegrations.slice(start, start + pageSize);
  }, [filteredIntegrations, page, pageSize]);

  const handleOpenDetail = row => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  const handleSaveDraft = e => {
    e.preventDefault();
    if (!draft.name.trim()) {
      notify('Tên kết nối không được để trống', 'error');
      return;
    }
    if (isCreating) {
      const newInt = {
        ...draft,
        code: draft.code || `INT_${Date.now().toString(36).toUpperCase()}`,
      };
      setIntegrations(prev => [...prev, newInt]);
      notify(`Đã kích hoạt kết nối "${newInt.name}"`, 'success');
    } else {
      setIntegrations(prev => prev.map(i => (i.id === draft.id ? draft : i)));
      notify(`Đã cập nhật kết nối "${draft.name}"`, 'success');
    }
    handleCloseWorkspace();
  };

  // In-Screen Workspace
  if (activeInt && draft) {
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
                  {isCreating ? 'Thiết lập kết nối tích hợp mới' : draft.name}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Mã: @{draft.code || 'chưa đặt'} · Đích: {draft.targetSystem || 'Chưa gán'}
                  {isDirty && <span className="ml-2 text-amber-600 dark:text-amber-400 italic">(Có thay đổi chưa lưu)</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCloseWorkspace}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveDraft} disabled={!isDirty}>
                {isCreating ? 'Lưu kết nối' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          {/* CỘT TRÁI: FORM CƠ BẢN (360px) */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông số kết nối
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên hệ thống tích hợp <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.name}
                onChange={e => {
                  setDraft(d => ({ ...d, name: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: SAP ERP Gateway..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mã kỹ thuật (Code)
              </label>
              <Input
                value={draft.code}
                onChange={e => {
                  setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }));
                  setIsDirty(true);
                }}
                placeholder="INT_SAP"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Giao thức tích hợp
              </label>
              <Select
                value={draft.type}
                onChange={v => {
                  setDraft(d => ({ ...d, type: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'REST API / Webhook', label: 'REST API / Webhook' },
                  { value: 'Database Link (PostgreSQL)', label: 'Database Link (PostgreSQL)' },
                  { value: 'MQTT Broker / Modbus TCP', label: 'MQTT Broker / Modbus TCP' },
                  { value: 'LDAP / OAuth2', label: 'LDAP / OAuth2' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái
              </label>
              <Select
                value={draft.status}
                onChange={v => {
                  setDraft(d => ({ ...d, status: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Hoạt động', label: 'Hoạt động' },
                  { value: 'Tạm ngưng', label: 'Tạm ngưng' },
                ]}
              />
            </div>
          </div>

          {/* CỘT PHẢI: ENDPOINT & BẢO MẬT */}
          <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Endpoint API & Chứng thực bảo mật (Credentials)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Thiết lập URL dịch vụ, khóa API hoặc token xác thực định danh
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên hệ thống đích
              </label>
              <Input
                value={draft.targetSystem}
                onChange={e => {
                  setDraft(d => ({ ...d, targetSystem: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="SAP S/4HANA hoặc MES Gateway..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả nghiệp vụ tích hợp
              </label>
              <textarea
                className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={4}
                value={draft.description}
                onChange={e => {
                  setDraft(d => ({ ...d, description: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Dữ liệu truyền nhận bao gồm những trường thông tin nào..."
              />
            </div>
          </div>
        </div>
      </ManagementFrame>
    );
  }

  // 4-Layer Standard Architecture
  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Tích hợp hệ thống bên ngoài (Integrations)
            </h1>
            <p className="text-[11px] text-slate-400">
              Quản lý các kết nối API, Webhook, ERP và SCADA trao đổi dữ liệu với doanh nghiệp
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setParams({ item: 'new' })}>
              <Plus size={16} className="mr-1.5" />
              Thêm kết nối mới
            </Button>
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
              placeholder="Tìm theo tên kết nối, mã hoặc hệ thống đích..."
              className="w-72"
            />
            <div className="w-56">
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="Tất cả giao thức"
                options={[
                  { value: '', label: 'Tất cả giao thức' },
                  { value: 'REST API', label: 'REST API / Webhook' },
                  { value: 'Database', label: 'Database Link' },
                  { value: 'MQTT', label: 'MQTT / SCADA' },
                  { value: 'LDAP', label: 'LDAP / SSO' },
                ]}
              />
            </div>
            {(search || typeFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
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
          title="Tích hợp hệ thống"
          totalCount={filteredIntegrations.length}
          selectedCount={selectedIds.length}
          unit="kết nối"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredIntegrations.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onExport={() => notify('Đang xuất danh sách tích hợp...', 'info')}
        />
      }
    >
      <VirtualDataTable
        columns={columns}
        rows={paginatedIntegrations}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={handleOpenDetail}
        formatCell={(column, row) => {
          if (column.id === 'name') {
            return (
              <span className="font-medium text-slate-800 dark:text-slate-200 hover:underline cursor-pointer">
                {row.name}
              </span>
            );
          }
          if (column.id === 'code') {
            return <span className="font-mono text-slate-600 dark:text-slate-400">@{row.code}</span>;
          }
          return String(row[column.id] ?? '—');
        }}
      />
    </ManagementFrame>
  );
}

