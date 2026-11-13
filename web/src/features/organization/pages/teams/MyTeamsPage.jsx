import React, { useState, useMemo } from 'react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../../shared/ui/TableStatusFooter';
import Tabs from '../../../../shared/ui/Tabs';
import Button from '../../../../shared/ui/Button';
import SearchInput from '../../../../shared/ui/SearchInput';
import TeamDetailPage from './TeamDetailPage';
import { notify } from '../../../../shared/lib/notify';
import { INITIAL_TEAMS, TEAM_COLUMNS } from './teamsData';
import { taskService } from '../../../tasks/services/taskService';
import {
  Search,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export default function MyTeamsPage() {
  const [teams, setTeams] = useState(
    INITIAL_TEAMS.filter(t => t.leader === 'Trần Kỹ Sư' || t.members?.some(m => m.name === 'Trần Kỹ Sư'))
  );
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);

  // In-Screen Workspace State (KHÔNG DÙNG MODAL)
  const [selectedTeam, setSelectedTeam] = useState(null);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setPage(1);
  };

  const handleDeleteTeam = async (teamToDelete, e) => {
    if (e) e.stopPropagation();
    if (!teamToDelete) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa/rời khỏi nhóm làm việc [${teamToDelete.code}] "${teamToDelete.name}" không?`
    );
    if (!confirmed) return;

    try {
      await taskService.deleteTeam(teamToDelete.id || teamToDelete.code);
      setTeams(prev => prev.filter(t => t.id !== teamToDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== teamToDelete.id));
      notify.success(`Đã xóa nhóm làm việc "${teamToDelete.name}"`);
      if (selectedTeam?.id === teamToDelete.id) {
        setSelectedTeam(null);
      }
    } catch (err) {
      notify.error(err?.message || 'Không thể xóa nhóm');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa/rời khỏi ${selectedIds.length} nhóm đã chọn không?`
    );
    if (!confirmed) return;
    try {
      for (const id of selectedIds) {
        await taskService.deleteTeam(id);
      }
      setTeams(prev => prev.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
      notify.success(`Đã xóa/rời khỏi ${selectedIds.length} nhóm thành công`);
    } catch (err) {
      notify.error(err?.message || 'Không thể xóa các nhóm đã chọn');
    }
  };

  if (selectedTeam) {
    return (
      <TeamDetailPage
        team={selectedTeam}
        isCreate={false}
        onBack={() => setSelectedTeam(null)}
        onDelete={handleDeleteTeam}
        onSaved={(savedTeam) => {
          setTeams(prev => prev.map(t => t.id === savedTeam.id ? savedTeam : t));
        }}
      />
    );
  }

  const filtered = teams
    .map(t => ({
      ...t,
      memberCountText: `${t.memberCount || t.members?.length || 0} nhân sự`,
      activeProjectsText: `${t.activeProjects || 0} dự án`,
    }))
    .filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
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

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'my-teams', label: 'Nhóm của tôi' }]}
            activeTab="my-teams"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Trash2}
                  className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  onClick={handleBulkDelete}
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
              onClick={() => notify.info('Đã tải lại danh sách nhóm của tôi')}
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
              placeholder="Tìm mã nhóm, tên nhóm của tôi…"
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

          {search && (
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
          title="Nhóm của tôi"
          totalCount={total}
          selectedCount={selectedIds.length}
          unit="nhóm"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <VirtualDataTable
        columns={TEAM_COLUMNS}
        rows={pageItems}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onOpen={(row) => setSelectedTeam(row)}
        onRowClick={(row) => setSelectedTeam(row)}
        renderCell={renderCell}
        emptyText="Bạn chưa tham gia nhóm làm việc nào."
      />
    </ManagementFrame>
  );
}
