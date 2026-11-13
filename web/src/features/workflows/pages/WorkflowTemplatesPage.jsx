import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const INITIAL_TEMPLATES = [
  {
    id: 'TPL-01',
    code: 'TPL_MAINTENANCE_PRINTER',
    name: 'Mẫu bảo dưỡng máy in ống đồng định kỳ',
    department: 'Khối Kỹ thuật & Bảo trì',
    checklistCount: 6,
    defaultDuration: '4 giờ',
    usageCount: 142,
    status: 'Hoạt động',
    description: 'Bao gồm kiểm tra độ nhớt mực, áp lực dao gạt và hệ thống sấy khí nóng',
  },
  {
    id: 'TPL-02',
    code: 'TPL_QC_LAMINATE',
    name: 'Mẫu kiểm định chất lượng màng ghép đùn KCS',
    department: 'Phòng Quản lý Chất lượng (QC/KCS)',
    checklistCount: 8,
    defaultDuration: '2 giờ',
    usageCount: 230,
    status: 'Hoạt động',
    description: 'Kiểm tra độ bám dính, độ kín đường hàn và định lượng keo dán màng',
  },
  {
    id: 'TPL-03',
    code: 'TPL_ONBOARDING_OPERATOR',
    name: 'Mẫu tiếp nhận & đào tạo thợ vận hành máy mới',
    department: 'Phòng Nhân sự & Hành chính',
    checklistCount: 10,
    defaultDuration: '7 ngày',
    usageCount: 29,
    status: 'Hoạt động',
    description: 'Hướng dẫn an toàn lao động, trang bị BHLĐ và kèm cặp máy thực tế',
  },
  {
    id: 'TPL-04',
    code: 'TPL_DELIVERY_ACCEPTANCE',
    name: 'Mẫu nghiệm thu bàn giao bao bì cho đối tác',
    department: 'Phòng Kế hoạch & Dự án',
    checklistCount: 5,
    defaultDuration: '1 ngày',
    usageCount: 88,
    status: 'Hoạt động',
    description: 'Biên bản kiểm đếm số lượng kiện, niêm phong pallet và ký nhận KCS',
  },
  {
    id: 'TPL-05',
    code: 'TPL_EMERGENCY_FIX',
    name: 'Mẫu xử lý sự cố kẹt màng / rách film khẩn cấp',
    department: 'Khối Kỹ thuật & Bảo trì',
    checklistCount: 4,
    defaultDuration: '1 giờ',
    usageCount: 47,
    status: 'Hoạt động',
    description: 'Dừng máy khẩn cấp, căn chỉnh lực căng và kiểm tra trục dẫn hướng',
  },
];

export default function WorkflowTemplatesPage() {
  const { currentUser, hasPermission } = useAuth();
  const isAdminOrManager = ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager'].includes((currentUser?.role || '').toLowerCase()) ||
                           currentUser?.username === 'admin';
  const canEdit = isAdminOrManager || hasPermission('workflows:create') || hasPermission('workflows:update');
  const canDelete = isAdminOrManager || hasPermission('workflows:delete');

  const [params, setParams] = useSearchParams();
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const activeId = params.get('item');
  const isCreating = activeId === 'new';
  const activeTemplate = useMemo(() => {
    if (isCreating) {
      return {
        id: `TPL-${String(templates.length + 1).padStart(2, '0')}`,
        code: '',
        name: '',
        department: 'Khối Kỹ thuật & Bảo trì',
        checklistCount: 3,
        defaultDuration: '1 ngày',
        usageCount: 0,
        status: 'Hoạt động',
        description: '',
      };
    }
    return templates.find(t => t.id === activeId) || null;
  }, [activeId, isCreating, templates]);

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  React.useEffect(() => {
    if (activeTemplate) {
      setDraft({ ...activeTemplate });
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsDirty(false);
    }
  }, [activeTemplate]);

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Mã mẫu', width: 200, sortable: true },
      { id: 'name', label: 'Tên mẫu công việc', width: 280, sortable: true },
      { id: 'department', label: 'Phòng ban áp dụng', width: 220 },
      { id: 'checklistCount', label: 'Số đầu việc', width: 120 },
      { id: 'defaultDuration', label: 'Thời gian ước tính', width: 150 },
      { id: 'usageCount', label: 'Lượt áp dụng', width: 130 },
      { id: 'status', label: 'Trạng thái', width: 120 },
    ],
    []
  );

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchDept = !deptFilter || t.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [templates, search, deptFilter]);

  const paginatedTemplates = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, page, pageSize]);

  const handleOpenDetail = row => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  const handleDeleteTemplate = async (tmplToDelete, e) => {
    if (e) e.stopPropagation();
    if (!tmplToDelete) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa mẫu công việc [${tmplToDelete.code}] "${tmplToDelete.name}" không?`
    );
    if (!confirmed) return;

    try {
      await taskService.deleteWorkflowTemplate(tmplToDelete.id || tmplToDelete.code);
      setTemplates(prev => prev.filter(t => t.id !== tmplToDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== tmplToDelete.id));
      notify(`Đã xóa mẫu công việc "${tmplToDelete.name}"`, 'success');
      if (activeId === tmplToDelete.id) {
        handleCloseWorkspace();
      }
    } catch (err) {
      notify(err?.message || 'Không thể xóa mẫu công việc', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} mẫu công việc đã chọn không?`
    );
    if (!confirmed) return;
    try {
      for (const id of selectedIds) {
        await taskService.deleteWorkflowTemplate(id);
      }
      setTemplates(prev => prev.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
      notify(`Đã xóa ${selectedIds.length} mẫu công việc thành công`, 'success');
    } catch (err) {
      notify(err?.message || 'Không thể xóa các mẫu công việc đã chọn', 'error');
    }
  };

  const handleSaveDraft = e => {
    e.preventDefault();
    if (!draft.name.trim()) {
      notify('Tên mẫu không được để trống', 'error');
      return;
    }
    if (isCreating) {
      const newTpl = {
        ...draft,
        code: draft.code || `TPL_${Date.now().toString(36).toUpperCase()}`,
      };
      setTemplates(prev => [newTpl, ...prev]);
      notify(`Đã tạo mẫu "${newTpl.name}"`, 'success');
    } else {
      setTemplates(prev => prev.map(t => (t.id === draft.id ? draft : t)));
      notify(`Đã cập nhật mẫu "${draft.name}"`, 'success');
    }
    handleCloseWorkspace();
  };

  // In-Screen Workspace
  if (activeTemplate && draft) {
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
                  {isCreating ? 'Tạo mẫu công việc chuẩn mới' : draft.name}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Mã: @{draft.code || 'chưa đặt'} · Phòng ban: {draft.department}
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
                  onClick={() => handleDeleteTemplate(activeTemplate)}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Xóa mẫu
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleSaveDraft} disabled={!isDirty}>
                {isCreating ? 'Tạo mẫu' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          {/* CỘT TRÁI: FORM CƠ BẢN (360px) */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông tin mẫu
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên mẫu công việc <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.name}
                onChange={e => {
                  setDraft(d => ({ ...d, name: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Mẫu bảo trì máy in..."
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
                placeholder="TPL_MAINTENANCE"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phòng ban áp dụng
              </label>
              <Select
                value={draft.department}
                onChange={v => {
                  setDraft(d => ({ ...d, department: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Khối Kỹ thuật & Bảo trì', label: 'Khối Kỹ thuật & Bảo trì' },
                  { value: 'Phòng Quản lý Chất lượng (QC/KCS)', label: 'Phòng Quản lý Chất lượng (QC/KCS)' },
                  { value: 'Phòng Nhân sự & Hành chính', label: 'Phòng Nhân sự & Hành chính' },
                  { value: 'Phòng Kế hoạch & Dự án', label: 'Phòng Kế hoạch & Dự án' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Thời lượng ước tính mặc định
              </label>
              <Input
                value={draft.defaultDuration}
                onChange={e => {
                  setDraft(d => ({ ...d, defaultDuration: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="4 giờ hoặc 2 ngày"
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

          {/* CỘT PHẢI: MÔ TẢ & CHECKLIST MẶC ĐỊNH */}
          <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Chi tiết mô tả & Danh sách công việc con (Checklist)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Khi người dùng chọn mẫu này lúc tạo công việc, toàn bộ checklist sẽ được tự động điền sẵn
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả quy cách mẫu
              </label>
              <textarea
                className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={3}
                value={draft.description}
                onChange={e => {
                  setDraft(d => ({ ...d, description: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Nhập tiêu chuẩn nghiệm thu và chỉ dẫn thực hiện cho mẫu này..."
              />
            </div>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Danh sách checklist chuẩn được kích hoạt tự động ({draft.checklistCount} đầu việc)
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">1</span>
                  <span>Kiểm tra sơ bộ hiện trạng và đọc kỹ chỉ số an toàn</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">2</span>
                  <span>Thực thi quy trình kỹ thuật theo tài liệu hướng dẫn nhà sản xuất</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">3</span>
                  <span>Chụp ảnh nghiệm thu hiện trường và tải lên tài liệu đính kèm</span>
                </li>
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
              { id: 'templates', label: 'Mẫu công việc chuẩn' }
            ]}
            activeTab="templates"
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
                Tạo mẫu mới
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
              placeholder="Tìm theo tên mẫu, mã hoặc mô tả…"
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
            className="w-48 text-xs font-medium"
            value={deptFilter}
            onChange={setDeptFilter}
            options={[
              { value: '', label: 'Tất cả phòng ban' },
              { value: 'Khối Kỹ thuật & Bảo trì', label: 'Khối Kỹ thuật & Bảo trì' },
              { value: 'Phòng Quản lý Chất lượng (QC/KCS)', label: 'Phòng Quản lý Chất lượng (QC/KCS)' },
              { value: 'Phòng Nhân sự & Hành chính', label: 'Phòng Nhân sự & Hành chính' },
              { value: 'Phòng Kế hoạch & Dự án', label: 'Phòng Kế hoạch & Dự án' },
            ]}
          />

          {(search || deptFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDeptFilter('');
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
          title="Mẫu công việc"
          totalCount={filteredTemplates.length}
          selectedCount={selectedIds.length}
          unit="mẫu"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredTemplates.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-wf-templates-column-menu"
          onExport={() => notify('Đang xuất danh sách mẫu...', 'info')}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="admin-wf-templates:table"
        columnMenuTargetId="admin-wf-templates-column-menu"
        columns={columns}
        rows={paginatedTemplates}
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

