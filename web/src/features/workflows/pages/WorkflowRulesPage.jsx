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

const INITIAL_RULES = [
  {
    id: 'RL-01',
    code: 'RULE_SUBMIT_REVIEW',
    name: 'Điều kiện gửi nghiệm thu công việc',
    fromStatus: 'In Progress (Đang làm)',
    toStatus: 'In Review (Chờ nghiệm thu)',
    condition: 'Checklist đạt 100% & Có đính kèm file/ảnh kết quả',
    actor: 'Người thực hiện nhiệm vụ',
    status: 'Hoạt động',
    description: 'Ngăn nhân viên gửi nghiệm thu khống khi chưa xong các đầu việc nhỏ',
  },
  {
    id: 'RL-02',
    code: 'RULE_APPROVE_DONE',
    name: 'Phê duyệt nghiệm thu đạt yêu cầu',
    fromStatus: 'In Review (Chờ nghiệm thu)',
    toStatus: 'Done (Hoàn thành)',
    condition: 'Chữ ký số hoặc xác nhận đánh giá chất lượng đạt chuẩn',
    actor: 'Trưởng phòng / Quản lý dự án',
    status: 'Hoạt động',
    description: 'Chỉ cấp quản lý hoặc người giao việc mới có quyền hoàn tất',
  },
  {
    id: 'RL-03',
    code: 'RULE_REJECT_REWORK',
    name: 'Từ chối nghiệm thu & Yêu cầu làm lại',
    fromStatus: 'In Review (Chờ nghiệm thu)',
    toStatus: 'Rejected (Cần sửa đổi)',
    condition: 'Bắt buộc nhập lý do lỗi / sai lệch và hạn làm lại mới',
    actor: 'Trưởng phòng / Ban Giám đốc',
    status: 'Hoạt động',
    description: 'Tự động trừ điểm KPI chất lượng và mở lại task cho nhân viên',
  },
  {
    id: 'RL-04',
    code: 'RULE_AUTO_OVERDUE',
    name: 'Tự động cảnh báo quá hạn hoàn thành',
    fromStatus: 'To Do / In Progress',
    toStatus: 'Overdue (Quá hạn)',
    condition: 'Thời gian hiện tại vượt mốc Deadline và chưa được nghiệm thu',
    actor: 'Hệ thống tự động',
    status: 'Hoạt động',
    description: 'Gửi email và cảnh báo đỏ lên màn hình người giám sát',
  },
  {
    id: 'RL-05',
    code: 'RULE_REOPEN_TASK',
    name: 'Mở lại công việc đã hoàn thành',
    fromStatus: 'Done (Hoàn thành)',
    toStatus: 'In Progress (Đang làm)',
    condition: 'Có phê duyệt đặc biệt từ Organization Admin hoặc Ban Giám đốc',
    actor: 'Ban Giám đốc',
    status: 'Hoạt động',
    description: 'Áp dụng khi khách hàng phát sinh khiếu nại chất lượng sau khi giao nhận',
  },
];

export default function WorkflowRulesPage() {
  const { currentUser, hasPermission } = useAuth();
  const isAdminOrManager = ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager'].includes((currentUser?.role || '').toLowerCase()) ||
                           currentUser?.username === 'admin';
  const canEdit = isAdminOrManager || hasPermission('workflows:create') || hasPermission('workflows:update');
  const canDelete = isAdminOrManager || hasPermission('workflows:delete');

  const [params, setParams] = useSearchParams();
  const [rules, setRules] = useState(INITIAL_RULES);
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State
  const activeId = params.get('item');
  const isCreating = activeId === 'new';
  const activeRule = useMemo(() => {
    if (isCreating) {
      return {
        id: `RL-${String(rules.length + 1).padStart(2, '0')}`,
        code: '',
        name: '',
        fromStatus: 'In Progress (Đang làm)',
        toStatus: 'In Review (Chờ nghiệm thu)',
        condition: '',
        actor: 'Trưởng phòng / Quản lý dự án',
        status: 'Hoạt động',
        description: '',
      };
    }
    return rules.find(r => r.id === activeId) || null;
  }, [activeId, isCreating, rules]);

  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  React.useEffect(() => {
    if (activeRule) {
      setDraft({ ...activeRule });
      setIsDirty(false);
    } else {
      setDraft(null);
      setIsDirty(false);
    }
  }, [activeRule]);

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Mã quy tắc', width: 180, sortable: true },
      { id: 'name', label: 'Tên quy tắc chuyển bước', width: 260, sortable: true },
      { id: 'fromStatus', label: 'Từ trạng thái', width: 170 },
      { id: 'toStatus', label: 'Sang trạng thái', width: 180 },
      { id: 'condition', label: 'Điều kiện tiên quyết', width: 280 },
      { id: 'actor', label: 'Người có quyền chuyển', width: 180 },
      { id: 'status', label: 'Trạng thái', width: 120 },
    ],
    []
  );

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.code.toLowerCase().includes(search.toLowerCase()) ||
        r.condition.toLowerCase().includes(search.toLowerCase());
      const matchActor = !actorFilter || r.actor === actorFilter;
      return matchSearch && matchActor;
    });
  }, [rules, search, actorFilter]);

  const paginatedRules = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRules.slice(start, start + pageSize);
  }, [filteredRules, page, pageSize]);

  const handleOpenDetail = row => {
    setParams({ item: row.id });
  };

  const handleCloseWorkspace = () => {
    params.delete('item');
    setParams(params);
  };

  const handleDeleteRule = async (ruleToDelete, e) => {
    if (e) e.stopPropagation();
    if (!ruleToDelete) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa quy tắc [${ruleToDelete.code}] "${ruleToDelete.name}" không?`
    );
    if (!confirmed) return;

    try {
      await taskService.deleteWorkflowRule(ruleToDelete.id || ruleToDelete.code);
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== ruleToDelete.id));
      notify(`Đã xóa quy tắc "${ruleToDelete.name}"`, 'success');
      if (activeId === ruleToDelete.id) {
        handleCloseWorkspace();
      }
    } catch (err) {
      notify(err?.message || 'Không thể xóa quy tắc', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} quy tắc đã chọn không?`
    );
    if (!confirmed) return;
    try {
      for (const id of selectedIds) {
        await taskService.deleteWorkflowRule(id);
      }
      setRules(prev => prev.filter(r => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      notify(`Đã xóa ${selectedIds.length} quy tắc thành công`, 'success');
    } catch (err) {
      notify(err?.message || 'Không thể xóa các quy tắc đã chọn', 'error');
    }
  };

  const handleSaveDraft = e => {
    e.preventDefault();
    if (!draft.name.trim()) {
      notify('Tên quy tắc không được để trống', 'error');
      return;
    }
    if (isCreating) {
      const newRule = {
        ...draft,
        code: draft.code || `RULE_${Date.now().toString(36).toUpperCase()}`,
      };
      setRules(prev => [...prev, newRule]);
      notify(`Đã thêm quy tắc "${newRule.name}"`, 'success');
    } else {
      setRules(prev => prev.map(r => (r.id === draft.id ? draft : r)));
      notify(`Đã cập nhật quy tắc "${draft.name}"`, 'success');
    }
    handleCloseWorkspace();
  };

  // In-Screen Workspace
  if (activeRule && draft) {
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
                  {isCreating ? 'Thiết lập quy tắc chuyển trạng thái mới' : draft.name}
                </h2>
                <div className="text-[11px] text-slate-400">
                  Mã: @{draft.code || 'chưa đặt'} · Luồng: {draft.fromStatus} → {draft.toStatus}
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
                  onClick={() => handleDeleteRule(activeRule)}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Xóa quy tắc
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleSaveDraft} disabled={!isDirty}>
                {isCreating ? 'Tạo quy tắc' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
          {/* CỘT TRÁI: FORM CƠ BẢN (360px) */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              Thông tin quy tắc
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên quy tắc <span className="text-rose-500">*</span>
              </label>
              <Input
                value={draft.name}
                onChange={e => {
                  setDraft(d => ({ ...d, name: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Kiểm tra checklist trước khi nghiệm thu..."
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
                placeholder="RULE_SUBMIT_REVIEW"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Người có thẩm quyền chuyển
              </label>
              <Select
                value={draft.actor}
                onChange={v => {
                  setDraft(d => ({ ...d, actor: v }));
                  setIsDirty(true);
                }}
                options={[
                  { value: 'Người thực hiện nhiệm vụ', label: 'Người thực hiện nhiệm vụ' },
                  { value: 'Trưởng phòng / Quản lý dự án', label: 'Trưởng phòng / Quản lý dự án' },
                  { value: 'Ban Giám đốc', label: 'Ban Giám đốc' },
                  { value: 'Hệ thống tự động', label: 'Hệ thống tự động' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái áp dụng
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

          {/* CỘT PHẢI: ĐIỀU KIỆN & HÀNH VI TỰ ĐỘNG */}
          <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Điều kiện tiên quyết & Ràng buộc chuyển bước
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Thiết lập các logic bắt buộc để tránh việc chuyển trạng thái tùy tiện hoặc sai quy trình
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trạng thái nguồn (Từ)
                </label>
                <Input
                  value={draft.fromStatus}
                  onChange={e => {
                    setDraft(d => ({ ...d, fromStatus: e.target.value }));
                    setIsDirty(true);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trạng thái đích (Sang)
                </label>
                <Input
                  value={draft.toStatus}
                  onChange={e => {
                    setDraft(d => ({ ...d, toStatus: e.target.value }));
                    setIsDirty(true);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Điều kiện kiểm tra bắt buộc (Validation Formula)
              </label>
              <Input
                value={draft.condition}
                onChange={e => {
                  setDraft(d => ({ ...d, condition: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Checklist.done == 100% && Attachments.length > 0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú giải thích cho người thực hiện
              </label>
              <textarea
                className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={4}
                value={draft.description}
                onChange={e => {
                  setDraft(d => ({ ...d, description: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Thông điệp thông báo nếu người dùng không thỏa mãn điều kiện..."
              />
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
              { id: 'rules', label: 'Quy tắc chuyển trạng thái' }
            ]}
            activeTab="rules"
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
                Thêm quy tắc
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
              placeholder="Tìm theo tên quy tắc, mã hoặc điều kiện…"
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
            className="w-56 text-xs font-medium"
            value={actorFilter}
            onChange={setActorFilter}
            options={[
              { value: '', label: 'Tất cả thẩm quyền' },
              { value: 'Người thực hiện nhiệm vụ', label: 'Người thực hiện nhiệm vụ' },
              { value: 'Trưởng phòng / Quản lý dự án', label: 'Trưởng phòng / Quản lý dự án' },
              { value: 'Ban Giám đốc', label: 'Ban Giám đốc' },
              { value: 'Hệ thống tự động', label: 'Hệ thống tự động' },
            ]}
          />

          {(search || actorFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActorFilter('');
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
          title="Quy tắc chuyển trạng thái"
          totalCount={filteredRules.length}
          selectedCount={selectedIds.length}
          unit="quy tắc"
          page={page}
          pageSize={pageSize}
          totalPages={Math.ceil(filteredRules.length / pageSize) || 1}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-wf-rules-column-menu"
          onExport={() => notify('Đang xuất danh sách quy tắc...', 'info')}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="admin-wf-rules:table"
        columnMenuTargetId="admin-wf-rules-column-menu"
        columns={columns}
        rows={paginatedRules}
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

