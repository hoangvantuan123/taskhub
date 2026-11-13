import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import Tabs from '../../../shared/ui/Tabs';
import Select from '../../../shared/ui/Select';
import SearchInput from '../../../shared/ui/SearchInput';
import ExportDataModal from '../../../shared/ui/ExportDataModal';
import ImportDataModal from '../../../shared/ui/ImportDataModal';
import Modal from '../../../shared/ui/Modal';
import EmployeeDetailPage from '../components/employees/EmployeeDetailPage';
import { taskService } from '../../tasks/services/taskService';
import { notify } from '../../../shared/lib/notify';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  Users,
  UserPlus,
  RotateCcw,
  Search,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const COLUMNS = [
  { id: 'code', label: 'Mã nhân sự', width: 130 },
  { id: 'fullName', label: 'Họ và tên', width: 220 },
  { id: 'department', label: 'Phòng ban / Đơn vị', width: 180 },
  { id: 'position', label: 'Chức danh / Vị trí', width: 200 },
  { id: 'delegationLevel', label: 'Cấp bậc quản lý', width: 170 },
  { id: 'phone', label: 'Điện thoại', width: 130 },
  { id: 'email', label: 'Email công vụ', width: 220 },
  { id: 'username', label: 'Tài khoản hệ thống', width: 170 },
  { id: 'status', label: 'Trạng thái', width: 130 },
];

const DEPARTMENTS = [
  'Phòng ban Quản trị ERP & CNTT',
  'Ban Giám Đốc',
  'Kỹ thuật',
  'Sản xuất',
  'Kinh doanh',
  'Marketing',
  'CNTT',
  'Quản lý chất lượng (QA/QC)',
  'Hành chính & Nhân sự',
  'Kế toán & Tài chính',
  'Kho vận & Logistics',
];

const EMPLOYEE_TABS = [
  { id: 'all', label: 'Tất cả nhân sự' },
  { id: 'profiles', label: 'Hồ sơ nhân viên' },
  { id: 'invitations', label: 'Lời mời & Kích hoạt' },
  { id: 'inactive', label: 'Nhân sự nghỉ việc' },
];

export default function EmployeeManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Detect active tab from pathname or query param
  const currentPathTab = location.pathname.includes('/profiles')
    ? 'profiles'
    : location.pathname.includes('/invitations')
    ? 'invitations'
    : location.pathname.includes('/inactive')
    ? 'inactive'
    : searchParams.get('tab') || 'all';

  const [activeTab, setActiveTab] = useState(currentPathTab);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Modals for Export and Import
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Delete modal state
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetEmp, setDeleteTargetEmp] = useState(null);
  const [deleteTargetIds, setDeleteTargetIds] = useState([]);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // In-Screen Workspace State
  const isCreateFromUrl = location.pathname.endsWith('/new') || searchParams.get('new') === 'true';
  const urlItem = searchParams.get('item');
  const [isCreate, setIsCreate] = useState(isCreateFromUrl);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setActiveTab(currentPathTab);
  }, [currentPathTab]);

  useEffect(() => {
    setIsCreate(isCreateFromUrl);
  }, [isCreateFromUrl]);

  const loadEmployees = () => {
    setLoading(true);
    taskService
      .getEmployees({ search, department: departmentFilter })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setEmployees(list);
        if (urlItem) {
          const found = list.find((e) => String(e.id) === String(urlItem) || e.code === urlItem);
          if (found) setSelectedEmp(found);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmployees();
  }, [search, departmentFilter]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (tabId === 'all') {
      next.delete('tab');
    } else {
      next.set('tab', tabId);
    }
    setSearchParams(next, { replace: true });
  };

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setDepartmentFilter('');
    setPage(1);
  };

  const handleDeleteSingle = (emp) => {
    setDeleteTargetEmp(emp);
    setDeleteTargetIds([emp.id || emp.IdSeq || emp.code]);
    setDeleteModalOpen(true);
  };

  const handleOpenBulkDelete = () => {
    if (!selectedIds.length) return;
    setDeleteTargetEmp(null);
    setDeleteTargetIds(selectedIds);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetIds.length) return;
    setDeleteBusy(true);
    try {
      if (deleteTargetIds.length === 1) {
        await taskService.deleteEmployee(deleteTargetIds[0]);
      } else {
        await taskService.deleteEmployees(deleteTargetIds);
      }
      notify.success(
        deleteTargetEmp
          ? `Đã xóa nhân sự "${deleteTargetEmp.fullName || deleteTargetEmp.code}" thành công.`
          : `Đã xóa thành công ${deleteTargetIds.length} nhân sự khỏi hệ thống.`
      );
      setSelectedIds((prev) => prev.filter((id) => !deleteTargetIds.includes(id)));
      setDeleteModalOpen(false);
      loadEmployees();
    } catch (err) {
      notify.error('Lỗi khi xóa nhân sự: ' + (err.message || ''));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleOpenDetail = (emp) => {
    setSelectedEmp(emp);
    const next = new URLSearchParams(searchParams);
    next.set('item', emp.id);
    setSearchParams(next, { replace: true });
  };

  const handleCloseDetail = () => {
    setSelectedEmp(null);
    setIsCreate(false);
    const next = new URLSearchParams(searchParams);
    next.delete('item');
    next.delete('new');
    setSearchParams(next, { replace: true });
    if (location.pathname.endsWith('/new')) {
      navigate('/admin/employees', { replace: true });
    }
  };

  // If viewing or creating employee, render In-Screen Workspace!
  if (isCreate || selectedEmp) {
    return (
      <EmployeeDetailPage
        employee={selectedEmp}
        isCreate={isCreate}
        onBack={handleCloseDetail}
        onSaved={loadEmployees}
      />
    );
  }

  // Filter employees according to tab and search
  const filtered = employees.filter((emp) => {
    // Tab filtering
    if (activeTab === 'inactive' && emp.status !== 'inactive') {
      return false;
    }
    if (activeTab === 'invitations') {
      // Employees without linked username or pending invite
      if (emp.username) return false;
    }
    if (activeTab === 'profiles') {
      // Must have code and full name
      if (!emp.code) return false;
    }

    // Search filtering
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText =
        emp.fullName?.toLowerCase().includes(q) ||
        emp.code?.toLowerCase().includes(q) ||
        emp.phone?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.username?.toLowerCase().includes(q) ||
        emp.position?.toLowerCase().includes(q);
      if (!matchText) return false;
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const renderCell = (column, row) => {
    if (column.id === 'code') {
      return (
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {row.code || '—'}
        </span>
      );
    }
    if (column.id === 'fullName') {
      return (
        <span
          className="font-medium text-slate-900 dark:text-white truncate hover:text-emerald-600 hover:underline cursor-pointer"
          onClick={() => handleOpenDetail(row)}
        >
          {row.fullName || '—'}
        </span>
      );
    }
    if (column.id === 'delegationLevel') {
      const map = {
        company: 'Cấp Ban Giám Đốc',
        department: 'Cấp Phòng Ban',
        project: 'Cấp Dự Án',
        team: 'Cấp Tổ / Nhóm',
      };
      return map[row.delegationLevel] || row.delegationLevel || 'Cấp Phòng Ban';
    }
    if (column.id === 'username') {
      if (row.username) {
        return <span className="font-mono text-emerald-600 dark:text-emerald-400">@{row.username}</span>;
      }
      return <span className="text-slate-400 italic">Chưa liên kết</span>;
    }
    if (column.id === 'status') {
      return row.status === 'active' ? 'Đang làm việc' : 'Nghỉ việc';
    }
    return String(row[column.id] || '—');
  };

  const currentTabInfo = EMPLOYEE_TABS.find(t => t.id === activeTab) || EMPLOYEE_TABS[0];
  const tabs = [{ id: currentTabInfo.id, label: currentTabInfo.label }];

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={handleOpenBulkDelete}
                >
                  Xóa ({selectedIds.length})
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline px-1 cursor-pointer"
                >
                  Bỏ chọn
                </button>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 my-auto" />
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={loadEmployees}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={() => {
                setSelectedEmp(null);
                setIsCreate(true);
                const next = new URLSearchParams(searchParams);
                next.set('new', 'true');
                setSearchParams(next, { replace: true });
              }}
            >
              Thêm nhân sự mới
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
              placeholder="Tìm mã NV, tên, email, vị trí…"
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

          <Select
            size="sm"
            className="w-48 font-medium text-xs"
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả phòng ban' },
              ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
            ]}
          />

          {(search || departmentFilter) && (
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
          title="Hồ sơ nhân sự"
          totalCount={total}
          selectedCount={selectedIds.length}
          unit="nhân sự"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onExport={() => setExportModalOpen(true)}
          onImport={() => setImportModalOpen(true)}
          columnMenuTargetId="admin-employees-column-menu"
          loading={loading}
        />
      }
    >
      <VirtualDataTable
        columns={COLUMNS}
        rows={pageItems}
        loading={loading}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={handleOpenDetail}
        onRowClick={handleOpenDetail}
        onAddRow={() => {
          setIsCreate(true);
          const next = new URLSearchParams(searchParams);
          next.set('new', 'true');
          setSearchParams(next, { replace: true });
        }}
        onExport={() => setExportModalOpen(true)}
        renderCell={renderCell}
        preferenceKey="admin-employees-table"
        columnMenuTargetId="admin-employees-column-menu"
        page={page}
        pageSize={pageSize}
        emptyText="Chưa có nhân sự nào trong danh sách."
      />

      {/* EXPORT DATA MODAL */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Xuất dữ liệu danh sách nhân sự"
        columns={COLUMNS.map((c) => ({ key: c.id, label: c.label }))}
        selectedRows={selectedIds}
        currentPageRows={pageItems}
        totalCount={total}
        onFetchAllRows={async () => filtered}
      />

      {/* IMPORT DATA MODAL */}
      <ImportDataModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Nhập dữ liệu nhân sự từ file Excel"
        onImport={async (rows, options) => {
          let count = 0;
          for (const row of rows) {
            try {
              await taskService.createEmployee({
                code: row.code || `NV-${Math.floor(100 + Math.random() * 900)}`,
                fullName: row.fullName || row.name || 'Nhân sự mới',
                department: row.department || 'Sản xuất',
                position: row.position || 'Nhân viên',
                delegationLevel: row.delegationLevel || 'team',
                phone: row.phone || '',
                email: row.email || '',
                status: row.status || 'active',
              });
              count++;
            } catch (err) {
              if (!options.skipErrors) {
                throw new Error(`Lỗi tại nhân sự "${row.fullName || row.code}": ${err.message}`);
              }
            }
          }
          await loadEmployees();
          return count;
        }}
        onSuccess={(count) => {
          notify.success(`Đã nhập thành công ${count} nhân sự vào hệ thống.`);
        }}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        open={deleteModalOpen}
        onClose={() => !deleteBusy && setDeleteModalOpen(false)}
        title="Xác nhận xóa nhân sự"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={deleteBusy}
              onClick={() => setDeleteModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              disabled={deleteBusy}
              onClick={handleConfirmDelete}
            >
              {deleteBusy ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
              {deleteTargetEmp ? (
                <>Bạn có chắc chắn muốn xóa nhân sự <strong>"{deleteTargetEmp.fullName || deleteTargetEmp.code}"</strong>?</>
              ) : (
                <>Bạn có chắc chắn muốn xóa <strong>{deleteTargetIds.length}</strong> nhân sự đã chọn?</>
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Dữ liệu nhân sự sẽ bị xóa khỏi danh bạ hệ thống. Thao tác này không thể hoàn tác.
            </p>
          </div>
        </div>
      </Modal>
    </ManagementFrame>
  );
}
