import React, { useEffect, useRef, useState, useMemo } from 'react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import Select from '../../../shared/ui/Select';
import Button from '../../../shared/ui/Button';
import Tabs from '../../../shared/ui/Tabs';
import SearchInput from '../../../shared/ui/SearchInput';
import FilterToggleMenu from '../../../shared/ui/FilterToggleMenu';
import ExportDataModal from '../../../shared/ui/ExportDataModal';
import ImportDataModal from '../../../shared/ui/ImportDataModal';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';

import { useSearchParams } from 'react-router-dom';
import UserDetailPage from '../components/users/UserDetailPage';
import UserPasswordModal from '../components/users/UserPasswordModal';
import { UserLockModal, UserBulkLockModal } from '../components/users/UserLockModals';

import {
  userColumns,
  filterColumns,
  formatDate,
} from '../constants/userManagement.constants';
import { useMenuPreferences } from '../../../shared/lib/tablePreferences';
import { useAuth } from '../../../shared/hooks/useAuth';
import { notify } from '../../../shared/lib/notify';
import { peopleService } from '../../../services/security/people.service';
import {
  Search,
  Lock,
  Unlock,
  UserPlus,
  RotateCcw,
  Download,
  Upload,
  Trash2,
} from 'lucide-react';

export default function UserManagementPage({ service = peopleService } = {}) {
  const { hasPermission } = useAuth();

  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [groups, setGroups] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [selected, setSelected] = useState([]);

  const [menuPreferences, setMenuPreferences, preferencesReady] = useMenuPreferences('admin-users:query', {
    search: '',
    filters: { department: '' },
    pageSize: 20,
    sort: { key: 'username', direction: 1 },
  });

  const search = menuPreferences.search || '';
  const [searchDraft, setSearchDraft] = useState(search);
  const filters = menuPreferences.filters || { department: '' };
  const pageSize = menuPreferences.pageSize || 20;
  const sort = menuPreferences.sort || { key: 'username', direction: 1 };

  const setSearch = value => setMenuPreferences(prev => ({ ...prev, search: value }));
  const setFilters = value =>
    setMenuPreferences(prev => ({
      ...prev,
      filters: typeof value === 'function' ? value(prev.filters || {}) : value,
    }));
  const setPageSize = value => setMenuPreferences(prev => ({ ...prev, pageSize: value }));
  const setSort = value =>
    setMenuPreferences(prev => ({
      ...prev,
      sort: typeof value === 'function' ? value(prev.sort || { key: 'username', direction: 1 }) : value,
    }));

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const loadSequence = useRef(0);

  // In-Screen Workspace State for User Registration & Detail
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeUserDraft, setActiveUserDraft] = useState(null);
  const [isCreateUser, setIsCreateUser] = useState(false);
  const isClosingRef = useRef(false);

  // Dialog types: 'detail' | 'password' | 'lock' | 'bulk_lock' | 'bulk_unlock' | 'create' | null
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState({});

  const canUpdate = hasPermission('users:update');
  const canSeeGroups = hasPermission('permissions:view');

  const load = async (query = search, requestedPage = page) => {
    const sequence = ++loadSequence.current;
    try {
      const data = await service.list(query, requestedPage, pageSize, filters, 'users', sort);
      if (sequence !== loadSequence.current) return;
      setUsers(data.users || []);
      setTotalUsers(data.total ?? (data.users || []).length);
      setDirectory(data.directory || []);
      if (canSeeGroups) {
        const gData = await service.groups();
        if (sequence !== loadSequence.current) return;
        setGroups(gData.groups || []);
      }
    } catch (e) {
      notify(e.message || 'Không thể tải danh sách tài khoản', 'error');
    }
  };

  useEffect(() => setSearchDraft(search), [search]);

  // Synchronize URL query parameter ?user=...
  useEffect(() => {
    const userParam = searchParams.get('user');
    if (!userParam) {
      isClosingRef.current = false;
      return;
    }
    if (activeUserDraft || isClosingRef.current) return;

    if (userParam === 'new') {
      const empName = searchParams.get('employee_name') || '';
      const empEmail = searchParams.get('email') || '';
      const empDept = searchParams.get('department') || '';
      const empPos = searchParams.get('position') || '';
      const empCode = searchParams.get('employee_code') || '';
      let autoUsername = '';
      if (empEmail && empEmail.includes('@')) {
        autoUsername = empEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '');
      } else if (empCode) {
        autoUsername = empCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      setIsCreateUser(true);
      setActiveUserDraft({
        username: autoUsername,
        name: empName,
        email: empEmail,
        contact_email: empEmail,
        password: '',
        phone: '',
        department: empDept,
        position: empPos,
        job_role: '',
        enabled: true,
        manual_groups: [],
        groups: [],
      });
    } else if (users.length > 0) {
      const target = users.find(u => u.id === userParam || u.username === userParam);
      if (target) {
        setIsCreateUser(false);
        setActiveUserDraft({
          ...target,
          manual_groups: [...(target.manual_groups || target.groups || [])],
          groups: [...(target.groups || [])],
        });
      }
    }
  }, [searchParams, users, activeUserDraft]);

  useEffect(() => {
    if (!preferencesReady || activeUserDraft) return;
    let current = true;
    setLoading(true);
    load(search, page)
      .catch(e => {
        if (current) notify(e.message || 'Lỗi khi tải dữ liệu', 'error');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [preferencesReady, search, filters, pageSize, sort, page, activeUserDraft]);

  const run = async (operation, successMsg = 'Đã lưu thay đổi trên hệ thống.') => {
    if (busy) return;
    setBusy(true);
    setModalError('');
    try {
      await operation();
      await load();
      setDialog(null);
      setSelected([]);
      notify(successMsg, 'success');
    } catch (e) {
      setModalError(e.message);
      notify(e.message || 'Thao tác không thành công', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveInlineUser = async updatedDraft => {
    await run(async () => {
      await service.update({
        ids: updatedDraft.ids || [updatedDraft.id],
        name: updatedDraft.name,
        department: updatedDraft.department,
        position: updatedDraft.position,
        job_role: updatedDraft.job_role,
        phone: updatedDraft.phone,
        contact_email: updatedDraft.contact_email,
        enabled: updatedDraft.enabled,
      });
    }, 'Đã cập nhật thông tin tài khoản.');
  };

  const options = kind => directory.filter(d => d.kind === kind).map(d => ({ value: d.key, label: d.label }));
  const orgName = (kind, key) => directory.find(d => d.kind === kind && d.key === key)?.label || key || '—';
  const groupName = key => groups.find(g => g.key === key)?.label || key;

  const open = (type, value) => {
    setModalError('');
    setDraft(value || {});
    setDialog(type);
  };

  const openCreateUser = () => {
    isClosingRef.current = false;
    setIsCreateUser(true);
    setActiveUserDraft({
      username: '',
      name: '',
      email: '',
      contact_email: '',
      password: '',
      phone: '',
      department: '',
      position: '',
      job_role: '',
      enabled: true,
      manual_groups: [],
      groups: [],
    });
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('user', 'new');
      return next;
    }, { replace: true });
  };

  const openUserDetail = targetUser => {
    isClosingRef.current = false;
    setIsCreateUser(false);
    setActiveUserDraft({
      ...targetUser,
      manual_groups: [...(targetUser.manual_groups || targetUser.groups || [])],
      groups: [...(targetUser.groups || [])],
    });
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('user', targetUser.id || targetUser.username);
      return next;
    }, { replace: true });
  };

  const handleBackFromUserDetail = () => {
    isClosingRef.current = true;
    setActiveUserDraft(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('user');
      return next;
    }, { replace: true });
  };

  const handleSaveUserDetail = async (userData, { isCreate, initialSnapshot }) => {
    if (busy) return;
    setBusy(true);
    try {
      if (isCreate) {
        await service.create({
          username: userData.username,
          name: userData.name,
          email: userData.contact_email || userData.email,
          password: userData.password,
        });
        notify(`Đã tạo tài khoản "${userData.username}" thành công.`, 'success');

        const data = await service.list(search, 1, pageSize, filters, 'users', sort);
        const refreshedUsers = data.users || [];
        setUsers(refreshedUsers);
        setTotalUsers(data.total ?? refreshedUsers.length);

        const created = refreshedUsers.find(u => u.username === userData.username);
        if (created) {
          if (userData.department || userData.position || userData.job_role || userData.phone) {
            await service.update({
              ids: [created.id],
              department: userData.department,
              position: userData.position,
              job_role: userData.job_role,
              phone: userData.phone,
            });
          }
          if (userData.manual_groups?.length > 0) {
            await service.membersMany(userData.manual_groups, [created.id], false);
          }
          const finalData = await service.list(search, 1, pageSize, filters, 'users', sort);
          setUsers(finalData.users || []);
          const finalUser = (finalData.users || []).find(u => u.username === userData.username) || created;

          setIsCreateUser(false);
          setActiveUserDraft({
            ...finalUser,
            manual_groups: [...(finalUser.manual_groups || finalUser.groups || [])],
          });
          setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('user', finalUser.id);
            return next;
          }, { replace: true });
        }
      } else {
        await service.update({
          ids: [userData.id],
          name: userData.name,
          department: userData.department,
          position: userData.position,
          job_role: userData.job_role,
          phone: userData.phone,
          contact_email: userData.contact_email,
          enabled: userData.enabled,
          RowVersion: userData.RowVersion,
        });

        const oldGroups = initialSnapshot?.manual_groups || initialSnapshot?.groups || [];
        const newGroups = userData.manual_groups || [];
        const added = newGroups.filter(g => !oldGroups.includes(g));
        const removed = oldGroups.filter(g => !newGroups.includes(g));

        if (added.length > 0) {
          await service.membersMany(added, [userData.id], false);
        }
        if (removed.length > 0) {
          await service.membersMany(removed, [userData.id], true);
        }

        notify(`Đã cập nhật thông tin tài khoản "${userData.name}".`, 'success');

        const data = await service.list(search, page, pageSize, filters, 'users', sort);
        const refreshedUsers = data.users || [];
        setUsers(refreshedUsers);
        const freshUser = refreshedUsers.find(u => u.id === userData.id) || userData;
        setActiveUserDraft({
          ...freshUser,
          manual_groups: [...(freshUser.manual_groups || freshUser.groups || newGroups)],
        });
      }
    } catch (e) {
      notify(e.message || 'Lỗi khi lưu tài khoản', 'error');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const openPassword = user => open('password', user);
  const openToggleLock = user => open('lock', user);
  const openBulkLock = isLock => open(isLock ? 'bulk_lock' : 'bulk_unlock', { ids: selected });

  const pages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const currentPage = Math.min(page, pages);

  useEffect(() => setPage(1), [search, filters, pageSize]);

  const applySearch = queryOverride => {
    const raw = typeof queryOverride === 'string' ? queryOverride : searchDraft;
    const query = raw.trim();
    setSearch(query);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchDraft('');
    setSearch('');
    setPage(1);
  };

  const toggleFilter = key =>
    setFilters(current => {
      const next = { ...current };
      if (Object.hasOwn(next, key)) delete next[key];
      else next[key] = '';
      return next;
    });

  const handleClearAllFilters = () => {
    setSearchDraft('');
    setSearch('');
    setFilters({});
    setPage(1);
    notify('Đã xóa tất cả bộ lọc.', 'info');
  };

  const hasActiveFilters = useMemo(() => {
    return Boolean(search) || Object.values(filters).some(val => val !== '');
  }, [search, filters]);

  const filterOptions = key =>
    key === 'enabled'
      ? [
          { value: 'true', label: 'Hoạt động' },
          { value: 'false', label: 'Đã khóa' },
        ]
      : key === 'groups'
      ? groups.map(g => ({ value: g.key, label: g.label }))
      : options(key);

  const handlePasswordSubmit = (newPassword, confirmPassword) => {
    if (newPassword.length < 12) {
      setModalError('Mật khẩu mới cần tối thiểu 12 ký tự.');
      notify('Mật khẩu mới cần tối thiểu 12 ký tự.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError('Mật khẩu xác nhận không khớp.');
      notify('Mật khẩu xác nhận không khớp.', 'warning');
      return;
    }
    run(async () => {
      if (service.resetPassword) {
        await service.resetPassword(draft.id, newPassword, draft.RowVersion);
      } else {
        await service.update({ ids: [draft.id], password: newPassword, RowVersion: draft.RowVersion });
      }
    }, `Đã cập nhật mật khẩu cho tài khoản ${draft.username}.`);
  };

  const handleLockSubmit = () => {
    const nextEnabled = !draft.enabled;
    run(async () => {
      if (service.toggleLock) {
        await service.toggleLock(draft.id, nextEnabled, draft.RowVersion);
      } else {
        await service.update({ ids: [draft.id], enabled: nextEnabled, RowVersion: draft.RowVersion });
      }
      if (activeUserDraft && activeUserDraft.id === draft.id) {
        setActiveUserDraft(prev => ({ ...prev, enabled: nextEnabled }));
      }
    }, nextEnabled ? `Đã mở khóa tài khoản ${draft.username}.` : `Đã khóa tài khoản ${draft.username}.`);
  };

  const handleBulkLockSubmit = lock => {
    run(async () => {
      if (service.bulkLock) {
        await service.bulkLock(draft.ids, !lock);
      } else {
        await service.update({ ids: draft.ids, enabled: !lock });
      }
    }, lock ? `Đã khóa ${draft.ids.length} tài khoản đã chọn.` : `Đã mở khóa ${draft.ids.length} tài khoản đã chọn.`);
  };

  const handleDeleteUser = async (userToDelete, e) => {
    if (e) e.stopPropagation();
    if (!userToDelete) return;
    if (userToDelete.username === 'admin' || userToDelete.role === 'admin') {
      notify('Không thể xóa tài khoản Quản trị viên tối cao (admin)', 'error');
      return;
    }
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn XÓA tài khoản [@${userToDelete.username}] "${userToDelete.name}" khỏi hệ thống không?\n\nThao tác này sẽ giải phóng toàn bộ liên kết dữ liệu.`
    );
    if (!confirmed) return;

    try {
      setBusy(true);
      await service.deleteUser(userToDelete.id || userToDelete.username);
      notify(`Đã xóa tài khoản [@${userToDelete.username}] "${userToDelete.name}" thành công.`, 'success');
      if (activeUserDraft?.id === userToDelete.id) {
        handleBackFromUserDetail();
      }
      load(search, page);
      setSelected(prev => prev.filter(id => id !== userToDelete.id));
    } catch (err) {
      notify(err.message || 'Không thể xóa tài khoản người dùng', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDeleteUsers = async () => {
    const validTargets = users.filter(u => selected.includes(u.id) && u.username !== 'admin' && u.role !== 'admin');
    if (validTargets.length === 0) {
      notify('Không có tài khoản hợp lệ để xóa (tài khoản admin không thể bị xóa).', 'warning');
      return;
    }
    const confirmed = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn xóa ${validTargets.length} tài khoản người dùng đã chọn không?`
    );
    if (!confirmed) return;

    try {
      setBusy(true);
      await service.bulkDeleteUsers(validTargets.map(u => u.id));
      notify(`Đã xóa thành công ${validTargets.length} tài khoản người dùng.`, 'success');
      load(search, page);
      setSelected([]);
    } catch (err) {
      notify(err.message || 'Không thể xóa các tài khoản đã chọn', 'error');
    } finally {
      setBusy(false);
    }
  };

  // If in User Detail/Create Page mode, render In-Screen Workspace!
  if (activeUserDraft) {
    return (
      <>
        <UserDetailPage
          key={activeUserDraft.id || (isCreateUser ? 'new' : 'edit')}
          user={activeUserDraft}
          isCreate={isCreateUser}
          onChange={setActiveUserDraft}
          onSave={handleSaveUserDetail}
          onToggleLock={u => open('lock', u)}
          onOpenPassword={u => open('password', u)}
          onDelete={handleDeleteUser}
          onBack={handleBackFromUserDetail}
          directory={directory}
          groups={groups}
          busy={busy}
          canUpdate={canUpdate}
        />

        {/* PASSWORD RESET MODAL */}
        <UserPasswordModal
          open={dialog === 'password'}
          onClose={() => setDialog(null)}
          user={draft}
          busy={busy}
          modalError={modalError}
          onSubmit={handlePasswordSubmit}
        />

        {/* SINGLE LOCK MODAL */}
        <UserLockModal
          open={dialog === 'lock'}
          onClose={() => setDialog(null)}
          user={draft}
          busy={busy}
          onConfirm={handleLockSubmit}
        />
      </>
    );
  }

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[
              { id: 'users', label: 'Tài khoản người dùng' }
            ]}
            activeTab="users"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {selected.length > 0 && canUpdate && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Lock}
                  className="!h-8 !text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  onClick={() => openBulkLock(true)}
                >
                  Khóa ({selected.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Unlock}
                  className="!h-8 !text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  onClick={() => openBulkLock(false)}
                >
                  Mở khóa ({selected.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Trash2}
                  className="!h-8 !text-xs text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  onClick={handleBulkDeleteUsers}
                >
                  Xóa ({selected.length})
                </Button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline px-1 cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </>
            )}

            {hasPermission('users:create') && (
              <Button
                size="sm"
                variant="primary"
                onClick={openCreateUser}
              >
                Thêm tài khoản
              </Button>
            )}
          </div>
        </>
      }
      filters={
        <>
          {/* Left: Search & Filter Toolbar */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="w-64 max-w-full">
              <SearchInput
                size="sm"
                value={searchDraft}
                onChange={e => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
                onClear={handleClearSearch}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applySearch();
                  }
                }}
                placeholder="Tìm tài khoản, tên, email, vị trí…"
              />
            </div>

            <button
              type="button"
              title="Tìm kiếm"
              aria-label="Tìm kiếm"
              onClick={() => applySearch()}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Search size={15} />
            </button>

            {filterColumns
              .filter(column => Object.hasOwn(filters, column.id))
              .map(column => (
                <Select
                  key={column.id}
                  size="sm"
                  className="w-44 text-xs font-medium"
                  aria-label={`Lọc ${column.label}`}
                  searchable
                  value={filters[column.id] || ''}
                  onChange={e => {
                    const val = e?.target?.value ?? e;
                    setFilters(prev => ({ ...prev, [column.id]: val }));
                  }}
                  options={[{ value: '', label: `Tất cả ${column.label.toLowerCase()}` }, ...filterOptions(column.id)]}
                />
              ))}

            <FilterToggleMenu
              columns={filterColumns}
              filters={filters}
              preferenceKey="admin-users"
              onRestore={setFilters}
              onToggle={toggleFilter}
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
          title="Quản lý người dùng"
          totalCount={totalUsers}
          unit="tài khoản"
          selectedCount={selected.length}
          page={currentPage}
          totalPages={pages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onExport={() => setExportModalOpen(true)}
          onImport={hasPermission('users:create') ? () => setImportModalOpen(true) : null}
          columnMenuTargetId="admin-users-column-menu"
          loading={loading}
        />
      }
    >
      <VirtualDataTable
        preferenceKey="admin-users:table"
        columnMenuTargetId="admin-users-column-menu"
        columns={userColumns}
        rows={users}
        loading={loading}
        page={currentPage}
        pageSize={pageSize}
        sort={sort}
        onSort={key => {
          if (key === 'actions') return;
          setSort(current => ({ key, direction: current.key === key ? -current.direction : 1 }));
        }}
        onOpen={openUserDetail}
        onAddRow={hasPermission('users:create') ? openCreateUser : undefined}
        onExport={() => setExportModalOpen(true)}
        selectedIds={selected}
        onSelectedIdsChange={ids => {
          if (ids.length > 200) {
            notify('Chỉ chọn tối đa 200 tài khoản cho một thao tác hàng loạt.', 'warning');
            return;
          }
          setSelected(ids);
        }}
        renderCell={(column, row) => {
          if (column.id === 'username') {
            return (
              <button
                type="button"
                className="text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
                onClick={() => openUserDetail(row)}
              >
                {row.username}
              </button>
            );
          }
          if (column.id === 'name') {
            return (
              <button
                type="button"
                className="text-left text-slate-800 dark:text-slate-200 hover:text-emerald-600 hover:underline truncate cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
                onClick={() => openUserDetail(row)}
              >
                {row.name}
              </button>
            );
          }
          if (column.id === 'enabled') {
            if (!row.approved) return 'Chờ duyệt';
            return row.enabled ? 'Hoạt động' : 'Đã khóa';
          }
          if (column.id === 'groups') {
            return row.groups?.length ? row.groups.map(groupName).join(', ') : 'Chưa gán';
          }
          if (column.id === 'CreatedAt' || column.id === 'UpdatedAt') return row[column.id] ? formatDate(row[column.id]) : '—';
          if (column.id === 'CreatedByName' || column.id === 'UpdatedByName') return row[column.id] || 'Hệ thống';
          if (['department', 'position', 'job_role'].includes(column.id)) {
            return <span className="text-xs truncate block">{orgName(column.id, row[column.id])}</span>;
          }
          return row[column.id] ?? '—';
        }}
      />

      {/* PASSWORD RESET MODAL */}
      <UserPasswordModal
        open={dialog === 'password'}
        onClose={() => setDialog(null)}
        user={draft}
        busy={busy}
        modalError={modalError}
        onSubmit={handlePasswordSubmit}
      />

      {/* SINGLE LOCK MODAL */}
      <UserLockModal
        open={dialog === 'lock'}
        onClose={() => setDialog(null)}
        user={draft}
        busy={busy}
        onConfirm={handleLockSubmit}
      />

      {/* BULK LOCK MODAL */}
      <UserBulkLockModal
        open={dialog === 'bulk_lock' || dialog === 'bulk_unlock'}
        onClose={() => setDialog(null)}
        ids={draft.ids || []}
        isLock={dialog === 'bulk_lock'}
        busy={busy}
        onConfirm={() => handleBulkLockSubmit(dialog === 'bulk_lock')}
      />

      {/* EXPORT DATA MODAL */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Kết xuất / Báo cáo Quản lý người dùng"
        defaultFilename="TaiKhoan_NguoiDung"
        columns={userColumns}
        selectedRows={users.filter(u => selected.includes(u.id))}
        currentPageRows={users}
        totalCount={totalUsers}
        onFetchAllRows={async () => {
          const allData = await service.list(search, 1, 10000, filters, 'users', sort);
          return allData.users || [];
        }}
      />

      {/* IMPORT DATA MODAL */}
      <ImportDataModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Nhập dữ liệu tài khoản từ file"
        onImport={async (rows, options) => {
          let count = 0;
          for (const row of rows) {
            try {
              await service.create({
                username: row.username,
                name: row.name || row.username,
                email: row.contact_email || `${row.username}@company.local`,
                password: row.password || 'Admin@123456',
                department: row.department || '',
                position: row.position || '',
                job_role: row.job_role || '',
                phone: row.phone || '',
              });
              count++;
            } catch (err) {
              if (!options.skipErrors) {
                throw new Error(`Lỗi tại tài khoản "${row.username}": ${err.message}`);
              }
            }
          }
          await load();
          return count;
        }}
        onSuccess={count => {
          notify(`Đã nhập thành công ${count} tài khoản vào hệ thống.`, 'success');
        }}
      />
    </ManagementFrame>
  );
}
