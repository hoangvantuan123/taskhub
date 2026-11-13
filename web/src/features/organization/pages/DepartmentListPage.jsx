import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, ArrowLeft, Search, Trash2 } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import Input from '../../../shared/ui/Input';
import Tabs from '../../../shared/ui/Tabs';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../../tasks/services/taskService';
import { useAuth } from '../../../shared/hooks/useAuth';

const INITIAL_DEPARTMENTS = [
  {
    id: 'DEPT-01',
    code: 'BGD',
    name: 'Ban Giám Đốc',
    head: 'Nguyễn Văn Giám Đốc',
    parent: 'Hội đồng quản trị',
    membersCount: 4,
    tasksCount: 18,
    status: 'Hoạt động',
    description: 'Chỉ đạo chiến lược sản xuất kinh doanh toàn diện của Goldsun',
  },
  {
    id: 'DEPT-02',
    code: 'TECH',
    name: 'Phòng Kỹ thuật & R&D',
    head: 'Trần Văn Kỹ Sư',
    parent: 'Ban Giám Đốc',
    membersCount: 22,
    tasksCount: 45,
    status: 'Hoạt động',
    description: 'Nghiên cứu công nghệ in ống đồng, màng ghép phức hợp và bao bì thân thiện',
  },
  {
    id: 'DEPT-03',
    code: 'PROD',
    name: 'Khối Sản xuất & Nhà máy Hưng Yên',
    head: 'Lê Văn Quản Lý',
    parent: 'Ban Giám Đốc',
    membersCount: 140,
    tasksCount: 68,
    status: 'Hoạt động',
    description: 'Vận hành 4 dây chuyền in ống đồng, ghép đùn và chia cuộn màng film',
  },
  {
    id: 'DEPT-04',
    code: 'SALES',
    name: 'Phòng Kinh doanh & Dự án',
    head: 'Phạm Thị Trưởng Phòng',
    parent: 'Ban Giám Đốc',
    membersCount: 16,
    tasksCount: 32,
    status: 'Hoạt động',
    description: 'Phát triển thị trường bao bì xuất khẩu và đối tác thực phẩm tiêu dùng',
  },
  {
    id: 'DEPT-05',
    code: 'QC',
    name: 'Phòng Quản lý chất lượng (QC / KCS)',
    head: 'Hoàng Văn KCS',
    parent: 'Khối Sản xuất & Nhà máy',
    membersCount: 15,
    tasksCount: 28,
    status: 'Hoạt động',
    description: 'Kiểm soát chất lượng nguyên liệu đầu vào và nghiệm thu thành phẩm xuất xưởng',
  },
  {
    id: 'DEPT-06',
    code: 'HR',
    name: 'Phòng Hành chính - Nhân sự',
    head: 'Đỗ Thị Nhân Sự',
    parent: 'Ban Giám Đốc',
    membersCount: 8,
    tasksCount: 19,
    status: 'Hoạt động',
    description: 'Tuyển dụng, đào tạo an toàn lao động và chế độ phúc lợi nhân viên',
  },
  {
    id: 'DEPT-07',
    code: 'MAINT',
    name: 'Phân xưởng Cơ điện & Bảo trì',
    head: 'Vũ Văn Cơ Điện',
    parent: 'Khối Sản xuất & Nhà máy',
    membersCount: 18,
    tasksCount: 24,
    status: 'Hoạt động',
    description: 'Bảo dưỡng định kỳ máy in ống đồng, máy sấy và hệ thống khí nén',
  },
  {
    id: 'DEPT-08',
    code: 'ERP-IT',
    name: 'Phòng ban Quản trị ERP & CNTT',
    head: 'Hoàng Văn Tuấn',
    parent: 'Ban Giám Đốc',
    membersCount: 12,
    tasksCount: 35,
    status: 'Hoạt động',
    description: 'Quản trị hệ thống ERP, hạ tầng CNTT, MES và chuyển đổi số doanh nghiệp',
  },
];

export default function DepartmentListPage() {
  const { currentUser, hasPermission } = useAuth();
  const isAdminOrManager = ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager'].includes((currentUser?.role || '').toLowerCase()) ||
                           currentUser?.username === 'admin';
  const canEdit = isAdminOrManager || hasPermission('departments:create') || hasPermission('departments:update');
  const canDelete = isAdminOrManager || hasPermission('departments:delete');

  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // Backward compatibility: If accessed with ?tab=chart or ?tab=assignments, redirect to clean routes
  useEffect(() => {
    const tab = params.get('tab');
    if (tab === 'chart') {
      navigate('/app/organization/departments/chart', { replace: true });
    } else if (tab === 'assignments' || tab === 'managers') {
      navigate('/app/organization/departments/managers', { replace: true });
    }
  }, [params, navigate]);

  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [search, setSearch] = useState('');
  const [parentFilter, setParentFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const activeId = params.get('item');
  const isCreating = activeId === 'new';
  const activeDept = useMemo(() => {
    if (isCreating) {
      return {
        id: `DEPT-${String(departments.length + 1).padStart(2, '0')}`,
        code: '',
        name: '',
        head: '',
        parent: 'Ban Giám Đốc',
        membersCount: 0,
        tasksCount: 0,
        status: 'Hoạt động',
        description: '',
      };
    }
    return departments.find(d => d.id === activeId) || null;
  }, [activeId, isCreating, departments]);

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (activeDept) {
      setDraft({ ...activeDept });
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsDirty(false);
    }
  }, [activeDept]);

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Mã phòng ban', width: 140, sortable: true },
      { id: 'name', label: 'Tên phòng ban / Đơn vị', width: 280, sortable: true },
      { id: 'head', label: 'Trưởng đơn vị', width: 200 },
      { id: 'parent', label: 'Thuộc cấp trên', width: 220 },
      { id: 'membersCount', label: 'Số nhân sự', width: 120 },
      { id: 'tasksCount', label: 'Việc đang chạy', width: 130 },
      { id: 'status', label: 'Trạng thái', width: 120 },
    ],
    []
  );

  const filteredDepartments = useMemo(() => {
    return departments.filter(d => {
      const matchSearch =
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase()) ||
        d.head.toLowerCase().includes(search.toLowerCase());
      const matchParent = !parentFilter || d.parent.includes(parentFilter);
      return matchSearch && matchParent;
    });
  }, [departments, search, parentFilter]);

  const paginatedDepartments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDepartments.slice(start, start + pageSize);
  }, [filteredDepartments, page, pageSize]);

  const handleOpenDetail = row => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  const handleDeleteDepartment = async (deptToDelete, e) => {
    if (e) e.stopPropagation();
    if (!deptToDelete) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa phòng ban [${deptToDelete.code}] "${deptToDelete.name}" khỏi hệ thống không?`
    );
    if (!confirmed) return;

    try {
      await taskService.deleteDepartment(deptToDelete.id || deptToDelete.code);
      setDepartments(prev => prev.filter(d => d.id !== deptToDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== deptToDelete.id));
      notify(`Đã xóa phòng ban "${deptToDelete.name}"`, 'success');
      if (activeId === deptToDelete.id) {
        handleCloseWorkspace();
      }
    } catch (err) {
      notify(err?.message || 'Không thể xóa phòng ban', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} phòng ban đã chọn không?`
    );
    if (!confirmed) return;
    try {
      for (const id of selectedIds) {
        await taskService.deleteDepartment(id);
      }
      setDepartments(prev => prev.filter(d => !selectedIds.includes(d.id)));
      setSelectedIds([]);
      notify(`Đã xóa ${selectedIds.length} phòng ban thành công`, 'success');
    } catch (err) {
      notify(err?.message || 'Không thể xóa các phòng ban đã chọn', 'error');
    }
  };

  const handleSaveDraft = e => {
    e.preventDefault();
    if (!draft.name.trim()) {
      notify('Tên phòng ban không được để trống', 'error');
      return;
    }
    if (isCreating) {
      const newDept = {
        ...draft,
        code: draft.code || `DEPT_${Date.now().toString(36).toUpperCase()}`,
      };
      setDepartments(prev => [...prev, newDept]);
      notify(`Đã tạo phòng ban "${newDept.name}"`, 'success');
    } else {
      setDepartments(prev => prev.map(d => (d.id === draft.id ? draft : d)));
      notify(`Đã cập nhật phòng ban "${draft.name}"`, 'success');
    }
    handleCloseWorkspace();
  };

  // In-Screen Workspace: 2-Column Split Layout
  if (activeDept && draft) {
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
                  {isCreating ? 'Tạo phòng ban / đơn vị mới' : draft.name}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Mã: @{draft.code || 'chưa đặt'} · Cấp cha: {draft.parent} · Nhân sự: {draft.membersCount}
                  {isDirty && <span className="ml-2 text-amber-600 dark:text-amber-400 italic">(Có thay đổi chưa lưu)</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCloseWorkspace}>
                Hủy
              </Button>
              {!isCreating && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  onClick={() => handleDeleteDepartment(activeDept)}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Xóa phòng ban
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleSaveDraft} disabled={!isDirty}>
                {isCreating ? 'Tạo phòng ban' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          {/* CỘT TRÁI: FORM CƠ BẢN (360px) */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông tin phòng ban
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên phòng ban / Phân xưởng <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.name}
                onChange={e => {
                  setDraft(d => ({ ...d, name: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Phòng Kế hoạch..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mã viết tắt (Code)
              </label>
              <Input
                value={draft.code}
                onChange={e => {
                  setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }));
                  setIsDirty(true);
                }}
                placeholder="PLAN"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trưởng đơn vị (Chỉ định)
              </label>
              <Input
                value={draft.head}
                onChange={e => {
                  setDraft(d => ({ ...d, head: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Họ và tên trưởng phòng..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phòng ban cấp cha
              </label>
              <Select
                value={draft.parent}
                onChange={v => {
                  setDraft(d => ({ ...d, parent: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Ban Giám Đốc', label: 'Ban Giám Đốc' },
                  { value: 'Khối Sản xuất & Nhà máy', label: 'Khối Sản xuất & Nhà máy' },
                  { value: 'Hội đồng quản trị', label: 'Hội đồng quản trị' },
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

          {/* CỘT PHẢI: CHỨC NĂNG NHIỆM VỤ & QUY MÔ */}
          <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Chức năng, quyền hạn & Phân bổ nhân sự
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quy định phạm vi phụ trách nghiệp vụ và thẩm quyền duyệt công việc của đơn vị
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả chức năng nhiệm vụ
              </label>
              <textarea
                className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={4}
                value={draft.description}
                onChange={e => {
                  setDraft(d => ({ ...d, description: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Nhiệm vụ trọng tâm và trách nhiệm báo cáo của phòng ban..."
              />
            </div>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Chỉ số hoạt động thực tế
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Số lượng nhân viên:</span>{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{draft.membersCount} người</strong>
                </div>
                <div>
                  <span className="text-slate-400">Công việc đang thực hiện:</span>{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{draft.tasksCount} nhiệm vụ</strong>
                </div>
              </div>
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
              { id: 'depts', label: 'Danh sách phòng ban' }
            ]}
            activeTab="depts"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                {canDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Trash2}
                    className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    onClick={handleBulkDelete}
                  >
                    Xóa ({selectedIds.length})
                  </Button>
                )}
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
            {canEdit && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setParams({ item: 'new' })}
              >
                Thêm phòng ban mới
              </Button>
            )}
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
              placeholder="Tìm theo tên phòng ban, mã hoặc trưởng phòng…"
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
            className="w-52 text-xs font-medium"
            value={parentFilter}
            onChange={setParentFilter}
            options={[
              { value: '', label: 'Tất cả cấp trên' },
              { value: 'Ban Giám Đốc', label: 'Ban Giám Đốc' },
              { value: 'Khối Sản xuất', label: 'Khối Sản xuất' },
              { value: 'Hội đồng quản trị', label: 'Hội đồng quản trị' },
            ]}
          />

          {(search || parentFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setParentFilter('');
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
          title="Danh sách phòng ban"
          totalCount={filteredDepartments.length}
          selectedCount={selectedIds.length}
          unit="đơn vị"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredDepartments.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-depts-column-menu"
          onExport={() => notify('Đang xuất danh sách phòng ban...', 'info')}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="admin-depts:table"
        columnMenuTargetId="admin-depts-column-menu"
        columns={columns}
        rows={paginatedDepartments}
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

