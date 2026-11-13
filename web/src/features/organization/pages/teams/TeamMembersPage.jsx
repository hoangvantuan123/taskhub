import React, { useState, useMemo } from 'react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../../shared/ui/TableStatusFooter';
import Tabs from '../../../../shared/ui/Tabs';
import Button from '../../../../shared/ui/Button';
import SearchInput from '../../../../shared/ui/SearchInput';
import Select from '../../../../shared/ui/Select';
import { notify } from '../../../../shared/lib/notify';
import { INITIAL_TEAMS, MEMBER_COLUMNS } from './teamsData';
import { useAuth } from '../../../../shared/hooks/useAuth';
import {
  UserPlus,
  Search,
  RotateCcw,
  ArrowLeft,
  Users,
  Building2,
  Shield,
  Briefcase,
  Trash2,
} from 'lucide-react';

export default function TeamMembersPage() {
  const { currentUser, hasPermission } = useAuth();
  const isAdminOrManager = ['admin', 'system_admin', 'director', 'general_director', 'manager', 'dept_manager'].includes((currentUser?.role || '').toLowerCase()) ||
                           currentUser?.username === 'admin';
  const canEdit = isAdminOrManager || hasPermission('teams:create') || hasPermission('teams:update');
  const canDelete = isAdminOrManager || hasPermission('teams:delete');

  const allMembers = useMemo(() => {
    const list = [];
    INITIAL_TEAMS.forEach(t => {
      (t.members || []).forEach(m => {
        list.push({
          ...m,
          teamId: t.id,
          teamName: t.name,
          department: t.department,
        });
      });
    });
    return list;
  }, []);

  const [members, setMembers] = useState(allMembers);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setTeamFilter('');
    setPage(1);
  };

  const handleRemoveMember = (member, e) => {
    if (e) e.stopPropagation();
    if (!member) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn gỡ nhân sự [${member.code}] "${member.name}" khỏi ${member.teamName} không?`
    );
    if (!confirmed) return;

    setMembers(prev => prev.filter(m => !(m.id === member.id && m.teamId === member.teamId)));
    setSelectedIds(prev => prev.filter(id => id !== member.id));
    notify.success(`Đã gỡ nhân sự ${member.name} khỏi nhóm`);
    if (selectedMember?.id === member.id && selectedMember?.teamId === member.teamId) {
      setSelectedMember(null);
    }
  };

  const handleBulkRemove = () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn gỡ ${selectedIds.length} nhân sự đã chọn khỏi các nhóm tương ứng không?`
    );
    if (!confirmed) return;
    setMembers(prev => prev.filter(m => !selectedIds.includes(m.id)));
    setSelectedIds([]);
    notify.success(`Đã gỡ ${selectedIds.length} nhân sự khỏi nhóm`);
  };

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (teamFilter && m.teamId !== teamFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.position.toLowerCase().includes(q) ||
          m.teamName.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, search, teamFilter]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const renderCell = (column, row) => {
    if (column.id === 'code') {
      return (
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {row.code}
        </span>
      );
    }
    if (column.id === 'name') {
      return (
        <span className="font-medium text-slate-900 dark:text-white hover:underline cursor-pointer">
          {row.name}
        </span>
      );
    }
    return String(row[column.id] || '—');
  };

  if (selectedMember) {
    return (
      <ManagementFrame
        className="h-full"
        scrollableContent={false}
        header={
          <div className="flex flex-wrap items-center justify-between w-full gap-3 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => setSelectedMember(null)}
                title="Quay lại danh sách thành viên"
              >
                Quay lại
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedMember.code}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {selectedMember.name}
                  </h2>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{selectedMember.position}</span>
                  <span>·</span>
                  <span>{selectedMember.department}</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-medium">{selectedMember.teamName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={() => handleRemoveMember(selectedMember)}
              >
                <Trash2 size={14} className="mr-1 inline" /> Gỡ khỏi nhóm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMember(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        {/* 2-Column Split Layout Edge-to-Edge */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950">
          {/* Left Column: Basic Information */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Thông tin thành viên
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-2.5 first:pt-0">
                  <span className="text-slate-400 block mb-1">Mã nhân sự:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{selectedMember.code}</span>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Họ và tên:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedMember.name}</strong>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Chức danh / Chuyên môn:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedMember.position}</span>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Phòng ban công tác:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedMember.department}</span>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Nhóm làm việc:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{selectedMember.teamName}</strong>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Vai trò trong nhóm:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedMember.role}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Main Canvas */}
          <main className="flex flex-col min-w-0 min-h-0 overflow-y-auto p-4 lg:p-6 bg-white dark:bg-slate-950 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Quyền hạn & Nhiệm vụ nhóm
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800 rounded">
                Thành viên được phân công tham gia các dự án trọng điểm của nhóm, nhận nhiệm vụ công việc trực tiếp từ Trưởng nhóm hoặc Trưởng phòng ban. Có thẩm quyền báo cáo tiến độ, tải lên tài liệu kỹ thuật và tham gia quy trình nghiệm thu công việc.
              </p>
            </div>
          </main>
        </div>
      </ManagementFrame>
    );
  }

  if (selectedMember) {
    return (
      <ManagementFrame
        scrollableContent={false}
        header={
          <div className="flex flex-wrap items-center justify-between w-full gap-3 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => setSelectedMember(null)}
                title="Quay lại danh sách thành viên"
              >
                Quay lại
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedMember.code}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {selectedMember.name}
                  </h2>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{selectedMember.position}</span>
                  <span>·</span>
                  <span>{selectedMember.department}</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-medium">{selectedMember.teamName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={() => handleRemoveMember(selectedMember)}
              >
                <Trash2 size={14} className="mr-1 inline" /> Gỡ khỏi nhóm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMember(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        {/* 2-Column Split Layout Edge-to-Edge */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950">
          {/* Left Column: Basic Information */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Thông tin thành viên
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-2.5 first:pt-0">
                  <span className="text-slate-400 block mb-1">Mã nhân sự:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{selectedMember.code}</span>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Họ và tên:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedMember.name}</strong>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Chức danh / Chuyên môn:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedMember.position}</span>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Phòng ban công tác:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedMember.department}</span>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Nhóm làm việc:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{selectedMember.teamName}</strong>
                </div>

                <div className="py-2.5">
                  <span className="text-slate-400 block mb-1">Vai trò trong nhóm:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedMember.role}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Main Canvas */}
          <main className="flex flex-col min-w-0 min-h-0 overflow-y-auto p-4 lg:p-6 bg-white dark:bg-slate-950 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Quyền hạn & Nhiệm vụ nhóm
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800 rounded">
                Thành viên được phân công tham gia các dự án trọng điểm của nhóm, nhận nhiệm vụ công việc trực tiếp từ Trưởng nhóm hoặc Trưởng phòng ban. Có thẩm quyền báo cáo tiến độ, tải lên tài liệu kỹ thuật và tham gia quy trình nghiệm thu công việc.
              </p>
            </div>
          </main>
        </div>
      </ManagementFrame>
    );
  }

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'team-members', label: 'Thành viên các nhóm làm việc' }]}
            activeTab="team-members"
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
                    onClick={handleBulkRemove}
                  >
                    Gỡ khỏi nhóm ({selectedIds.length})
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
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => notify.info('Đã tải lại danh sách thành viên')}
            >
              Làm mới
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                icon={UserPlus}
                onClick={() => notify.info('Mở hộp thoại điều phối / gán nhân viên vào nhóm')}
              >
                Gán thành viên vào nhóm
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
              placeholder="Tìm mã NV, tên nhân sự, vai trò…"
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
            className="w-56 font-medium text-xs"
            value={teamFilter}
            onChange={(e) => {
              setTeamFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả các nhóm' },
              ...INITIAL_TEAMS.map(t => ({ value: t.id, label: t.name })),
            ]}
          />

          {(search || teamFilter) && (
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
          title="Thành viên nhóm"
          totalCount={total}
          selectedCount={selectedIds.length}
          unit="nhân sự"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <VirtualDataTable
        columns={MEMBER_COLUMNS}
        rows={pageItems}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={(row) => setSelectedMember(row)}
        onRowClick={(row) => setSelectedMember(row)}
        renderCell={renderCell}
        emptyText="Không tìm thấy thành viên nhóm nào."
      />
    </ManagementFrame>
  );
}
