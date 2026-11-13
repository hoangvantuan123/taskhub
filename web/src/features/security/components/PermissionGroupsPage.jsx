import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, RotateCcw, Plus, UserPlus, Trash2 } from 'lucide-react';
import { membershipRows } from '../memberships';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Modal from '../../../shared/ui/Modal';
import Tabs from '../../../shared/ui/Tabs';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import { peopleService } from '../../../services/security/people.service';
import { securityService } from '../../../services/security/security.service';
import { useAuth } from '../../../shared/hooks/useAuth';
import { normalizeOptionSearch } from '../../../shared/lib/searchOptions';
import PermissionGroupDetailPage from './PermissionGroupDetailPage';
import { createPermissionGroupDraft } from '../permissionTree';
import { notify } from '../../../shared/lib/notify';

const groupColumns = [
  { id: 'name', label: 'Tên nhóm quyền', width: 280, minWidth: 200 },
  { id: 'member_count', label: 'Thành viên', width: 180, minWidth: 140 },
  { id: 'summary', label: 'Phạm vi chức năng', width: 440, minWidth: 250 },
  { id: 'enabled', label: 'Trạng thái', width: 160, minWidth: 120 },
];

const memberColumns = [
  { id: 'username', label: 'Tài khoản', width: 200, minWidth: 150 },
  { id: 'name', label: 'Họ và tên', width: 240, minWidth: 180 },
  { id: 'groupNames', label: 'Nhóm quyền', width: 320, minWidth: 200 },
  { id: 'origin', label: 'Nguồn gán quyền', width: 360, minWidth: 220 },
  { id: 'status', label: 'Trạng thái', width: 140, minWidth: 120 },
];

export default function PermissionGroupsPage({
  tabs,
  onTabChange,
  initialMemberIds = [],
  initialView = 'groups',
}) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('permissions:update');
  const [params, setParams] = useSearchParams();

  const [view, setView] = useState(initialView);
  const [memberGroup, setMemberGroup] = useState('');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hierarchy, setHierarchy] = useState([]);

  const [groupPage, setGroupPage] = useState({ rows: [], total: 0 });
  const [queryLoading, setQueryLoading] = useState(false);

  const [memberKeys, setMemberKeys] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [status, setStatus] = useState('');

  // Batch members dialog
  const [dialog, setDialog] = useState(initialMemberIds.length ? 'members' : '');
  const [ids, setIds] = useState(initialMemberIds);
  const [memberSearch, setMemberSearch] = useState('');
  const [remove, setRemove] = useState(false);

  // Group Detail Page State
  const [activeGroupDraft, setActiveGroupDraft] = useState(null);
  const [isCreateGroup, setIsCreateGroup] = useState(false);
  const isClosingRef = useRef(false);

  const load = async (includeModules = false) => {
    try {
      const promises = [
        peopleService.groups(),
        includeModules || !modules.length ? securityService.modules() : Promise.resolve(null),
        hasPermission('users:view') ? peopleService.list() : Promise.resolve({ users: [] }),
      ];
      const [g, m, u] = await Promise.all(promises);
      const nextGroups = g.groups || [];
      const nextUsers = u.users || [];
      setGroups(nextGroups);
      setUsers(nextUsers);
      let nextModules = modules;
      let nextHierarchy = hierarchy;
      if (m) {
        nextModules = m.modules || [];
        nextHierarchy = m.hierarchy || [];
        setModules(nextModules);
        setHierarchy(nextHierarchy);
      }
      return { groups: nextGroups, modules: nextModules, hierarchy: nextHierarchy, users: nextUsers };
    } catch (e) {
      setError(e.message || 'Lỗi khi tải dữ liệu nhóm quyền');
      notify(e.message || 'Lỗi khi tải dữ liệu', 'error');
      return null;
    }
  };

  useEffect(() => {
    load(true).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  // Synchronize URL query param ?group=...
  useEffect(() => {
    const groupParam = params.get('group');
    if (!groupParam) {
      isClosingRef.current = false;
      return;
    }
    if (activeGroupDraft || isClosingRef.current) return;

    if (groupParam === 'new') {
      setIsCreateGroup(true);
      setActiveGroupDraft(createPermissionGroupDraft());
    } else if (groups.length > 0) {
      const target = groups.find(g => g.key === groupParam);
      if (target) {
        setIsCreateGroup(false);
        setActiveGroupDraft({
          ...target,
          permissions: (target.permissions || []).map(p => ({
            ...p,
            actions: [...(p.actions || [])],
          })),
        });
      }
    }
  }, [params, groups, activeGroupDraft]);

  useEffect(() => {
    if (view !== 'groups' || activeGroupDraft) return;
    let active = true;
    const timer = setTimeout(() => {
      setQueryLoading(true);
      peopleService
        .queryGroups({
          page,
          pageSize,
          search: search
            .split(/[;,]/)
            .map(value => value.trim())
            .filter(Boolean),
          searchColumns: ['key', 'label'],
          filters: status ? [{ column: 'enabled', op: 'eq', values: [status === 'true'] }] : [],
          sort: [{ column: 'label', direction: 'asc' }],
        })
        .then(result => {
          if (active) {
            setGroupPage(result);
            const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
            if (page > lastPage) setPage(lastPage);
          }
        })
        .catch(err => {
          if (active) {
            setError(err.message);
            setGroupPage({ rows: [], total: 0 });
          }
        })
        .finally(() => {
          if (active) setQueryLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [view, page, pageSize, search, status, activeGroupDraft]);

  const openGroup = group => {
    isClosingRef.current = false;
    setError('');
    const isCreate = !group;
    setIsCreateGroup(isCreate);
    const draftData = group
      ? {
          ...group,
          permissions: (group.permissions || []).map(p => ({
            ...p,
            actions: [...(p.actions || [])],
          })),
        }
      : createPermissionGroupDraft();
    setActiveGroupDraft(draftData);

    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'groups');
      next.set('group', isCreate ? 'new' : group.key);
      return next;
    }, { replace: true });
  };

  const handleBackFromDetail = () => {
    isClosingRef.current = true;
    setActiveGroupDraft(null);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'groups');
      next.delete('group');
      return next;
    }, { replace: true });
  };

  const handleSaveGroupDetail = async (savedDraft, memberIds = []) => {
    const targetDraft = savedDraft || activeGroupDraft;
    if (busy || !targetDraft) return;
    setError('');
    setBusy(true);
    try {
      if (isCreateGroup && targetDraft.key && groups.some(g => g.key === targetDraft.key)) {
        throw new Error('Mã nhóm quyền này đã tồn tại. Vui lòng chọn mã khác.');
      }
      // 1. Save group record and permissions
      await peopleService.saveGroup(targetDraft);

      // 2. Synchronize selected member accounts only if changed
      if (targetDraft.key) {
        const currentManualMembers = isCreateGroup
          ? []
          : users
              .filter(u => (u.manual_groups || []).includes(targetDraft.key))
              .map(u => u.id);

        const toAdd = memberIds.filter(id => !currentManualMembers.includes(id));
        const toRemove = currentManualMembers.filter(id => !memberIds.includes(id));

        if (toAdd.length > 0) {
          await peopleService.members(targetDraft.key, toAdd, false);
        }
        if (toRemove.length > 0) {
          await peopleService.members(targetDraft.key, toRemove, true);
        }

        // Locally synchronize user states without refetching entire directory database
        if (toAdd.length > 0 || toRemove.length > 0) {
          const addSet = new Set(toAdd);
          const removeSet = new Set(toRemove);
          setUsers(prevUsers =>
            prevUsers.map(u => {
              if (addSet.has(u.id)) {
                const manual = Array.from(new Set([...(u.manual_groups || []), targetDraft.key]));
                return { ...u, manual_groups: manual };
              }
              if (removeSet.has(u.id)) {
                const manual = (u.manual_groups || []).filter(k => k !== targetDraft.key);
                return { ...u, manual_groups: manual };
              }
              return u;
            })
          );
        }
      }

      notify(
        isCreateGroup
          ? `Đã tạo nhóm quyền "${targetDraft.label}".`
          : `Đã cập nhật nhóm quyền "${targetDraft.label}".`,
        'success'
      );

      // Only refresh group directory to get updated RowVersion and member count
      const res = await peopleService.groups();
      const freshGroups = res?.groups || [];
      setGroups(freshGroups);

      const freshGroup = freshGroups.find(g => g.key === targetDraft.key);

      if (isCreateGroup) {
        setIsCreateGroup(false);
        setParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'groups');
          next.set('group', targetDraft.key);
          return next;
        }, { replace: true });
      }

      if (freshGroup) {
        setActiveGroupDraft({
          ...freshGroup,
          permissions: (freshGroup.permissions || []).map(p => ({
            ...p,
            actions: [...(p.actions || [])],
          })),
        });
      } else {
        setActiveGroupDraft({
          ...targetDraft,
          permissions: (targetDraft.permissions || []).map(p => ({
            ...p,
            actions: [...(p.actions || [])],
          })),
        });
      }
    } catch (e) {
      setError(e.message || 'Lỗi khi lưu nhóm quyền');
      notify(e.message || 'Thao tác không thành công', 'error');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteGroupDetail = async groupToDelete => {
    if (busy || !groupToDelete) return;
    setError('');
    setBusy(true);
    try {
      await peopleService.deleteGroup(groupToDelete.IdSeq, groupToDelete.RowVersion, groupToDelete.key);
      notify(`Đã xóa nhóm quyền "${groupToDelete.label}".`, 'success');
      isClosingRef.current = true;
      setActiveGroupDraft(null);
      setParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'groups');
        next.delete('group');
        return next;
      }, { replace: true });
      const res = await peopleService.groups();
      setGroups(res?.groups || []);
    } catch (e) {
      setError(e.message || 'Lỗi khi xóa nhóm quyền');
      notify(e.message || 'Thao tác không thành công', 'error');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDeleteGroups = async () => {
    if (!selected.length || busy) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selected.length} nhóm quyền đã chọn không?`)) return;
    setBusy(true);
    try {
      const groupsToDelete = groupRows.filter(g => selected.includes(g.id));
      for (const g of groupsToDelete) {
        await peopleService.deleteGroup(g.IdSeq, g.RowVersion, g.key);
      }
      notify(`Đã xóa ${groupsToDelete.length} nhóm quyền thành công.`, 'success');
      setSelected([]);
      const res = await peopleService.groups();
      setGroups(res?.groups || []);
    } catch (e) {
      notify(e.message || 'Lỗi khi xóa nhóm quyền', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveBatchMembers = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (!memberKeys.length || !ids.length) {
        throw new Error('Chọn nhóm quyền và ít nhất một tài khoản.');
      }
      await peopleService.membersMany(
        memberKeys,
        ids,
        remove,
        Object.fromEntries(groups.map(g => [g.key, g.RowVersion]))
      );
      notify(
        remove
          ? `Đã gỡ nhóm cho ${ids.length} tài khoản thành công.`
          : `Đã gán nhóm cho ${ids.length} tài khoản thành công.`,
        'success'
      );
      await load();
      setSelected([]);
      setDialog('');
    } catch (e) {
      setError(e.message);
      notify(e.message || 'Thao tác không thành công', 'error');
    } finally {
      setBusy(false);
    }
  };

  // If in Group Detail/Create Page mode, render the full page with Back button and unsaved check!
  if (activeGroupDraft) {
    return (
      <PermissionGroupDetailPage
        key={activeGroupDraft.key || (isCreateGroup ? 'new' : 'edit')}
        draft={activeGroupDraft}
        isCreate={isCreateGroup}
        onChange={setActiveGroupDraft}
        onSave={handleSaveGroupDetail}
        onDelete={handleDeleteGroupDetail}
        onBack={handleBackFromDetail}
        groups={groups}
        modules={modules}
        hierarchy={hierarchy}
        users={users}
        busy={busy}
        canEdit={canEdit}
        canDelete={hasPermission('permissions:delete')}
      />
    );
  }

  const groupRows = groupPage.rows.map(group => ({
    ...group,
    id: group.IdSeq,
    name: group.label,
    summary:
      group.permissions
        .map(p => modules.find(m => m.key === p.module)?.label || p.module)
        .join(' · ') || 'Chưa cấp quyền',
    enabledLabel: group.enabled ? 'Hoạt động' : 'Tạm ngưng',
  }));

  const allMembers = membershipRows(users, groups, memberGroup).filter(row => {
    const q = normalizeOptionSearch(search);
    const matchesQuery =
      !q ||
      normalizeOptionSearch([row.username, row.name, row.groupNames, row.origin].join(' ')).includes(q);
    const matchesStatus = !status || String(row.enabled) === status;
    return matchesQuery && matchesStatus;
  });

  const rows = view === 'groups' ? groupRows : allMembers;
  const totalCount = view === 'groups' ? groupPage.total : allMembers.length;
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, pages);
  const pageRows =
    view === 'groups' ? rows : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const applySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const changeView = next => {
    setView(next);
    setSelected([]);
    setPage(1);
    setSearch('');
    setSearchDraft('');
    setStatus('');
    setMemberGroup('');
  };

  const handleClearAllFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatus('');
    if (view === 'members') setMemberGroup('');
    setPage(1);
    notify('Đã xóa tất cả bộ lọc.', 'info');
  };

  const hasActiveFilters = Boolean(search) || Boolean(status) || Boolean(memberGroup);

  return (
    <>
      <ManagementFrame
        header={
          <>
            <Tabs tabs={tabs} activeTab="groups" onChange={onTabChange} />

            <div className="management-actions flex items-center gap-2">
              {view === 'groups' && selected.length > 0 && (
                <>
                  {hasPermission('permissions:delete') && (
                    <Button
                      size="sm"
                      variant="danger"
                      icon={Trash2}
                      disabled={loading || busy}
                      onClick={handleBulkDeleteGroups}
                    >
                      Xóa ({selected.length})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected([])}
                  >
                    Bỏ chọn ({selected.length})
                  </Button>
                </>
              )}

              {view === 'members' && selected.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected([])}
                >
                  Bỏ chọn ({selected.length})
                </Button>
              )}

              {/* Toggle view button between groups and members */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => changeView(view === 'groups' ? 'members' : 'groups')}
              >
                {view === 'groups' ? 'Xem danh sách thành viên' : 'Xem danh mục nhóm quyền'}
              </Button>

              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={UserPlus}
                    disabled={loading || busy || !hasPermission('users:view')}
                    onClick={() => {
                      setMemberKeys(memberGroup ? [memberGroup] : []);
                      setGroupSearch('');
                      setIds(view === 'members' ? selected : []);
                      setMemberSearch('');
                      setRemove(false);
                      setError('');
                      setDialog('members');
                    }}
                  >
                    Gán nhóm hàng loạt
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Plus}
                    disabled={loading || busy}
                    onClick={() => openGroup(null)}
                  >
                    Tạo nhóm quyền
                  </Button>
                </>
              )}
            </div>
          </>
        }
        filters={
          <>
            {/* Left Toolbar */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {view === 'members' && (
                <Select
                  size="sm"
                  className="w-52 text-xs font-medium"
                  aria-label="Lọc theo nhóm quyền"
                  searchable
                  value={memberGroup}
                  onChange={e => {
                    setMemberGroup(e?.target?.value ?? e);
                    setPage(1);
                    setSelected([]);
                  }}
                  options={[
                    { value: '', label: 'Tất cả nhóm quyền' },
                    ...groups.map(g => ({ value: g.key, label: g.label })),
                  ]}
                />
              )}

              <div className="w-64 max-w-full">
                <SearchInput
                  size="sm"
                  placeholder={
                    view === 'groups'
                      ? 'Tìm tên nhóm (dùng ; để tìm nhiều)…'
                      : 'Tìm tài khoản, họ tên, nhóm…'
                  }
                  value={searchDraft}
                  onChange={e => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
                  onClear={() => {
                    setSearchDraft('');
                    setSearch('');
                    setPage(1);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                title="Tìm kiếm"
                aria-label="Tìm kiếm"
                onClick={applySearch}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <Search size={15} />
              </button>

              <Select
                size="sm"
                className="w-44 text-xs font-medium"
                aria-label="Lọc trạng thái"
                searchable
                value={status}
                onChange={e => {
                  setStatus(e?.target?.value ?? e);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'true', label: 'Hoạt động' },
                  { value: 'false', label: 'Tạm ngưng' },
                ]}
              />

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Xóa tất cả bộ lọc"
                  aria-label="Xóa tất cả bộ lọc"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

        </>
      }
      status={
        <TableStatusFooter
          title={view === 'groups' ? 'Nhóm quyền' : 'Thành viên'}
          totalCount={totalCount}
          unit="bản ghi"
          selectedCount={selected.length}
          page={currentPage}
          totalPages={pages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columnMenuTargetId="admin-groups-column-menu"
          loading={loading || queryLoading}
        />
      }
      >
        <VirtualDataTable
          preferenceKey={`security-groups:${view}`}
          columnMenuTargetId="admin-groups-column-menu"
          columns={view === 'groups' ? groupColumns : memberColumns}
          rows={pageRows}
          loading={loading || queryLoading}
          selectedIds={selected}
          onSelectedIdsChange={setSelected}
          onOpen={view === 'groups' ? group => openGroup(group) : undefined}
          renderCell={(column, row) => {
            // STRICT PLAIN TEXT: Zero tags, zero badges, zero icons, zero action columns
            if (view === 'groups') {
              if (column.id === 'name') {
                return (
                  <button
                    type="button"
                    className="text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
                    onClick={() => openGroup(row)}
                  >
                    {row.name}
                  </button>
                );
              }
              if (column.id === 'member_count') {
                const count = users.filter(u => (u.groups || []).includes(row.key)).length;
                return `${count} thành viên`;
              }
              if (column.id === 'summary') {
                return <span className="truncate block">{row.summary}</span>;
              }
              if (column.id === 'enabled') {
                return row.enabled ? 'Hoạt động' : 'Tạm ngưng';
              }
            } else {
              if (column.id === 'username') {
                return <span className="font-mono text-xs">{row.username}</span>;
              }
              if (column.id === 'groupNames') {
                return <span className="truncate block">{row.groupNames || '—'}</span>;
              }
              if (column.id === 'origin') {
                return <span className="truncate block">{row.origin || '—'}</span>;
              }
              if (column.id === 'status') {
                return row.enabled ? 'Hoạt động' : 'Đã khóa';
              }
            }
            return row[column.id] ?? '—';
          }}
        />
      </ManagementFrame>

      {/* MODAL BATCH MEMBERS ASSIGN ONLY */}
      <Modal
        open={dialog === 'members'}
        onClose={() => {
          if (!busy) setDialog('');
        }}
        title="Gán nhóm quyền cho tài khoản"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setDialog('')}>
              Hủy
            </Button>
            {canEdit && (
              <Button size="sm" form="permission-members-form" type="submit" loading={busy}>
                Lưu thay đổi
              </Button>
            )}
          </div>
        }
      >
        {error && <p role="alert" className="text-sm text-rose-600 mb-4">{error}</p>}
        <form
          id="permission-members-form"
          onSubmit={saveBatchMembers}
          className="space-y-5"
        >
          <fieldset disabled={busy || !canEdit} className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Chọn nhóm quyền cần thao tác
              </p>
              <SearchInput
                size="sm"
                placeholder="Tìm nhóm quyền…"
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1">
                {groups
                  .filter(g =>
                    normalizeOptionSearch(`${g.label} ${g.key}`).includes(
                      normalizeOptionSearch(groupSearch)
                    )
                  )
                  .map(g => (
                    <label
                      key={g.key}
                      className="flex gap-2 items-center p-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={memberKeys.includes(g.key)}
                        onChange={e =>
                          setMemberKeys(
                            e.target.checked
                              ? [...memberKeys, g.key]
                              : memberKeys.filter(k => k !== g.key)
                          )
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        {g.label}
                        {!g.enabled && <span className="text-slate-400 italic ml-1">(Tạm ngưng)</span>}
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            <Select
              size="md"
              label="Loại thao tác"
              value={String(remove)}
              onChange={e => setRemove(e.target.value === 'true')}
              options={[
                { value: 'false', label: 'Thêm nhóm, giữ các nhóm hiện có' },
                { value: 'true', label: 'Gỡ nhóm được gán trực tiếp' },
              ]}
            />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Danh sách tài khoản áp dụng
              </p>
              <SearchInput
                size="sm"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Tìm tài khoản hoặc họ tên…"
              />
              <div className="max-h-60 overflow-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 divide-y divide-slate-100 dark:divide-slate-800">
                {users
                  .filter(u =>
                    normalizeOptionSearch(`${u.username} ${u.name}`).includes(
                      normalizeOptionSearch(memberSearch)
                    )
                  )
                  .map(u => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 py-2 px-1 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={ids.includes(u.id)}
                        onChange={e =>
                          setIds(
                            e.target.checked ? [...ids, u.id] : ids.filter(id => id !== u.id)
                          )
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{u.name}</span>
                        <span className="font-mono text-slate-400 ml-2">@{u.username}</span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          Nhóm hiện có:{' '}
                          {(u.groups || [])
                            .map(k => groups.find(g => g.key === k)?.label || k)
                            .join(', ') || 'Chưa có'}
                        </span>
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-5">
              Đã chọn <strong>{memberKeys.length}</strong> nhóm cho <strong>{ids.length}</strong> tài khoản. Gỡ
              nhóm trực tiếp không loại bỏ quyền từ nhóm khác hoặc điều kiện theo tổ chức.
            </p>
          </fieldset>
        </form>
      </Modal>
    </>
  );
}
