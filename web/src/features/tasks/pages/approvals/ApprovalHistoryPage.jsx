import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../../shared/ui/TableStatusFooter';
import Tabs from '../../../../shared/ui/Tabs';
import Button from '../../../../shared/ui/Button';
import SearchInput from '../../../../shared/ui/SearchInput';
import Select from '../../../../shared/ui/Select';
import ApprovalDetailPage from './ApprovalDetailPage';
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
} from 'lucide-react';

const APPROVAL_TABS = [
  { id: 'pending', label: 'Chờ tôi phê duyệt' },
  { id: 'my_requests', label: 'Yêu cầu tôi gửi' },
  { id: 'history', label: 'Lịch sử đã duyệt' },
];

export default function ApprovalHistoryPage() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // In-Screen Workspace State (KHÔNG DÙNG MODAL)
  const [selectedReq, setSelectedReq] = useState(null);

  React.useEffect(() => {
    setLoading(true);
    taskService.listPendingApprovals().then((list) => {
      const nonPending = (list || []).filter(a => a.status && a.status !== 'pending');
      if (nonPending.length > 0) {
        setApprovals(nonPending.map((item, idx) => ({
          id: item.id,
          taskId: item.taskId,
          code: item.taskCode || `APR-2026-0${idx + 1}`,
          taskCode: item.taskCode || '',
          taskTitle: item.taskTitle || 'Nhiệm vụ',
          requester: item.requesterName || 'Nhân sự',
          approver: item.approverName || 'Ban Giám sát',
          department: item.department || '',
          projectName: item.projectName || '',
          progress: item.progress ?? 100,
          priority: item.priority || 'Cao',
          status: item.status || 'approved',
          requestedAt: item.requestedAt ? new Date(item.requestedAt).toLocaleDateString('vi-VN') : '—',
          decisionAt: item.decidedAt ? new Date(item.decidedAt).toLocaleDateString('vi-VN') : '—',
          summary: item.requestNote || '',
          approvalNote: item.approvalNote || '',
        })));
      } else {
        setApprovals(MOCK_APPROVALS.filter(a => a.status !== 'pending'));
      }
    }).catch(() => {
      setApprovals(MOCK_APPROVALS.filter(a => a.status !== 'pending'));
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('');
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

  if (selectedReq) {
    return (
      <ApprovalDetailPage
        approval={selectedReq}
        onBack={() => setSelectedReq(null)}
      />
    );
  }

  const filtered = approvals.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
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
            tabs={[{ id: 'history', label: 'Lịch sử đã duyệt' }]}
            activeTab="history"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => notify.info('Đã tải lại lịch sử phê duyệt')}
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
              placeholder="Tìm mã yêu cầu, tên công việc, người gửi…"
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'approved', label: 'Đã phê duyệt' },
              { value: 'rejected', label: 'Đã từ chối' },
              { value: 'revision_requested', label: 'Yêu cầu bổ sung' },
            ]}
          />

          {(search || statusFilter) && (
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
          title="Lịch sử đã duyệt"
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
      <VirtualDataTable
        preferenceKey="etpms-approval-history"
        columns={APPROVAL_COLUMNS}
        rows={pageItems}
        onOpen={(row) => setSelectedReq(row)}
        onRowClick={(row) => setSelectedReq(row)}
        renderCell={renderCell}
        emptyText="Chưa có lịch sử phê duyệt nào."
      />
    </ManagementFrame>
  );
}
