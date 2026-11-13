import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../../shared/ui/TableStatusFooter';
import Tabs from '../../../../shared/ui/Tabs';
import Button from '../../../../shared/ui/Button';
import SearchInput from '../../../../shared/ui/SearchInput';
import Select from '../../../../shared/ui/Select';
import ApprovalDetailPage from './ApprovalDetailPage';
import ApprovalWorkflowConfigModal from '../../components/ApprovalWorkflowConfigModal';
import { notify } from '../../../../shared/lib/notify';
import { taskService } from '../../services/taskService';
import { APPROVAL_COLUMNS, MOCK_APPROVALS } from './approvalsData';
import {
  RotateCcw,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  Workflow,
  ShieldCheck,
  Info,
} from 'lucide-react';

const APPROVAL_TABS = [
  { id: 'pending', label: 'Chờ tôi phê duyệt' },
  { id: 'my_requests', label: 'Yêu cầu tôi gửi' },
  { id: 'history', label: 'Lịch sử đã duyệt' },
];

export default function PendingApprovalsPage() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Checkbox selection state (Tích chọn nhiều dòng để phê duyệt hàng loạt)
  const [selectedIds, setSelectedIds] = useState([]);

  // In-Screen Workspace State (KHÔNG DÙNG MODAL NỔI)
  const [selectedReq, setSelectedReq] = useState(null);

  // Workflow Setup Modal & Guide banner state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const list = await taskService.listPendingApprovals();
      if (Array.isArray(list) && list.length > 0) {
        setApprovals(
          list.map((item, idx) => ({
            id: item.id,
            taskId: item.taskId,
            code: item.taskCode || `APR-2026-0${idx + 1}`,
            taskCode: item.taskCode || '',
            taskTitle: item.taskTitle || 'Nhiệm vụ thẩm định',
            requester: item.requesterName || 'Nhân sự thực hiện',
            approver: item.approverName || 'Nguyễn Văn Giám Đốc',
            department: item.department || 'Sản xuất',
            projectName: item.projectName || 'Dự án Goldsun',
            progress: item.progressWhenRequested ?? 100,
            priority: 'Cao',
            status: item.status || 'pending',
            requestedAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '07/03/2026',
            decisionAt: item.decidedAt ? new Date(item.decidedAt).toLocaleDateString('vi-VN') : '—',
            summary: item.requestNote || '',
            // 4 Cột mặc định hệ thống
            createdByName: item.createdByName || item.requesterName || 'Nhân sự thực hiện',
            createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '07/03/2026',
            updatedByName: item.updatedByName || item.approverName || 'Nguyễn Văn Giám Đốc',
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('vi-VN') : '07/03/2026',
            // RowVersion cho optimistic concurrency check (ẩn không render cột)
            rowVersion: item.rowVersion || item.RowVersion || 1,
          }))
        );
      } else {
        setApprovals(MOCK_APPROVALS.filter(a => a.status === 'pending'));
      }
    } catch {
      setApprovals(MOCK_APPROVALS.filter(a => a.status === 'pending'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setDeptFilter('');
    setPage(1);
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === 'pending') {
      navigate('/app/tasks/supervisor');
    } else if (nextTab === 'my_requests') {
      navigate('/app/tasks/supervisor?tab=my_requests');
    } else if (nextTab === 'history') {
      navigate('/app/tasks/supervisor?tab=history');
    }
  };

  // Phê duyệt nhanh ngay trên view (hàng loạt hoặc từng dòng)
  const handleBatchApprove = () => {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    setApprovals((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    notify.success(`Đã phê duyệt thành công ${count} yêu cầu được chọn!`);
  };

  const handleBatchReject = () => {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    setApprovals((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    notify.warning(`Đã từ chối ${count} yêu cầu được chọn.`);
  };

  const handleQuickApprove = (id, code) => {
    setApprovals((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    notify.success(`Đã phê duyệt hoàn thành yêu cầu: ${code || id}`);
  };

  const handleQuickReject = (id, code) => {
    setApprovals((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    notify.warning(`Đã từ chối yêu cầu: ${code || id}`);
  };

  // Mở In-Screen Workspace khi bấm thẩm định / phê duyệt
  if (selectedReq) {
    return (
      <ApprovalDetailPage
        approval={selectedReq}
        onBack={() => setSelectedReq(null)}
        onProcessed={(reqId, decision, note) => {
          setApprovals(prev => prev.filter(a => a.id !== reqId));
        }}
      />
    );
  }

  const filtered = approvals.filter((a) => {
    if (deptFilter && a.department !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.code.toLowerCase().includes(q) ||
        a.taskTitle.toLowerCase().includes(q) ||
        a.requester.toLowerCase().includes(q) ||
        (a.approver && a.approver.toLowerCase().includes(q)) ||
        a.projectName.toLowerCase().includes(q)
      );
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
        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
          {row.code}
        </span>
      );
    }
    if (column.id === 'status' || column.id === 'statusText') {
      const st = row.status || 'pending';
      if (st === 'approved') {
        return (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            Đã phê duyệt
          </span>
        );
      }
      if (st === 'rejected') {
        return (
          <span className="font-medium text-rose-600 dark:text-rose-400">
            Từ chối
          </span>
        );
      }
      if (st === 'revision_requested' || st === 'changes_requested') {
        return (
          <span className="font-medium text-blue-600 dark:text-blue-400">
            Yêu cầu bổ sung
          </span>
        );
      }
      return (
        <span className="font-medium text-amber-600 dark:text-amber-400">
          Chờ phê duyệt
        </span>
      );
    }
    if (column.id === 'approver' || column.id === 'approverName') {
      const name = row.approver || row.approverName || row.decisionBy || 'Ban Giám sát';
      const initial = name.trim().split(/\s+/).slice(-1)[0]?.[0] || 'A';
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] grid place-items-center shrink-0 border border-emerald-200 dark:border-emerald-800/50">
            {initial}
          </div>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={name}>
            {name}
          </span>
        </div>
      );
    }
    if (column.id === 'requester' || column.id === 'requesterName') {
      const name = row.requester || row.requesterName || 'Nhân sự';
      const initial = name.trim().split(/\s+/).slice(-1)[0]?.[0] || 'N';
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] grid place-items-center shrink-0 border border-slate-200 dark:border-slate-700">
            {initial}
          </div>
          <span className="text-slate-700 dark:text-slate-300 truncate" title={name}>
            {name}
          </span>
        </div>
      );
    }
    if (column.id === 'taskTitle') {
      return (
        <span className="font-medium text-slate-900 dark:text-white truncate" title={row.taskTitle}>
          {row.taskTitle}
        </span>
      );
    }
    if (column.id === 'progress') {
      const p = row.progress ?? 0;
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${p >= 100 ? 'bg-emerald-500' : p >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, Math.max(0, p))}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{p}%</span>
        </div>
      );
    }
    if (column.id === 'priority') {
      const pri = row.priority || 'Trung bình';
      const color =
        pri === 'Khẩn cấp'
          ? 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400'
          : pri === 'Cao'
          ? 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400'
          : 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400';
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${color}`}>
          {pri}
        </span>
      );
    }
    if (column.id === 'createdByName' || column.id === 'updatedByName') {
      const name = row[column.id] || (column.id === 'createdByName' ? (row.requester || 'Nhân sự') : (row.approver || 'Hệ thống'));
      return (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={name}>
          {name}
        </span>
      );
    }
    if (column.id === 'createdAt' || column.id === 'updatedAt') {
      const val = row[column.id] || (column.id === 'createdAt' ? row.requestedAt : row.decisionAt || row.requestedAt);
      return (
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {val || '—'}
        </span>
      );
    }
    return String(row[column.id] || '—');
  };

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'pending', label: 'Chờ tôi phê duyệt' }]}
            activeTab="pending"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {selectedIds.length > 0 ? (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 p-1 pl-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Đã chọn {selectedIds.length} mục
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={handleBatchApprove}
                >
                  Phê duyệt ({selectedIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={XCircle}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  onClick={handleBatchReject}
                >
                  Từ chối ({selectedIds.length})
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 cursor-pointer"
                  title="Bỏ chọn tất cả"
                >
                  Hủy
                </button>
              </div>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              icon={Workflow}
              className="border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40"
              onClick={() => setShowConfigModal(true)}
            >
              Cấu hình quy trình duyệt
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={loadApprovals}
            >
              Làm mới
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
              placeholder="Tìm mã yêu cầu, tên công việc, người duyệt…"
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
            className="w-44 font-medium text-xs"
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả phòng ban' },
              { value: 'Kỹ thuật', label: 'Kỹ thuật' },
              { value: 'Sản xuất', label: 'Sản xuất' },
              { value: 'Hành chính & Nhân sự', label: 'Hành chính & Nhân sự' },
            ]}
          />

          {(search || deptFilter) && (
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
          title="Yêu cầu chờ duyệt"
          totalCount={total}
          unit="yêu cầu"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <div className="flex flex-col h-full min-h-0">
        {showWorkflowGuide && (
          <div className="mx-4 mt-3 p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-xs flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 grid place-items-center shrink-0 border border-amber-200 dark:border-amber-800">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 flex-wrap">
                  <span>Quy trình duyệt: <strong>Mặc định khi xong việc là duyệt luôn</strong></span>
                  <span className="text-slate-400">|</span>
                  <span className="text-amber-800 dark:text-amber-300 font-medium">Chỉ theo dõi duyệt tại đây khi Dự án có tích chọn Yêu cầu kiểm duyệt</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                  Nhấn vào nút <strong>"Cấu hình quy trình duyệt"</strong> phía trên để bật/tắt yêu cầu duyệt cho từng Dự án hoặc chuyển đổi cấp độ duyệt (1 cấp / 2 cấp).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="px-2.5 py-1 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-white dark:bg-slate-900 rounded border border-amber-300 dark:border-amber-800 cursor-pointer shadow-2xs hover:shadow-xs transition-all"
              >
                Cấu hình dự án
              </button>
              <button
                type="button"
                onClick={() => setShowWorkflowGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 pt-2">
          <VirtualDataTable
            preferenceKey="etpms-pending-approvals"
            columns={APPROVAL_COLUMNS}
            rows={pageItems}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            onOpen={(row) => setSelectedReq(row)}
            onRowClick={(row) => setSelectedReq(row)}
            renderCell={renderCell}
            emptyText="Hiện không có yêu cầu nào chờ bạn phê duyệt. (Công việc các dự án không yêu cầu duyệt sẽ tự động hoàn thành)."
          />
        </div>
      </div>

      <ApprovalWorkflowConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onUpdated={loadApprovals}
      />
    </ManagementFrame>
  );
}
