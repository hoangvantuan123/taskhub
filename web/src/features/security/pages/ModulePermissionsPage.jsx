import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Search, RotateCcw, Download, Upload, Plus, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import Textarea from '../../../shared/ui/Textarea';
import Tabs from '../../../shared/ui/Tabs';
import SearchInput from '../../../shared/ui/SearchInput';
import PermissionGroupsPage from '../components/PermissionGroupsPage';
import ModuleDetailPage from '../components/ModuleDetailPage';
import { useAuth } from '../../../shared/hooks/useAuth';
import { securityService } from '../../../services/security/security.service';
import { peopleService } from '../../../services/security/people.service';
import { useMenuPreferences } from '../../../shared/lib/tablePreferences';
import { normalizeOptionSearch } from '../../../shared/lib/searchOptions';
import {
  hydratePermissionHierarchy,
  flattenPermissionHierarchy,
  permissionTreeChildren,
} from '../permissionTree';
import { notify } from '../../../shared/lib/notify';

const defaults = ['view', 'create', 'update', 'delete', 'import', 'export'];
const labels = {
  view: 'Xem',
  create: 'Thêm',
  update: 'Sửa',
  delete: 'Xóa',
  import: 'Nhập dữ liệu',
  export: 'Xuất dữ liệu',
  approve: 'Duyệt',
  publish: 'Xuất bản',
  assign: 'Phân công',
  archive: 'Lưu trữ',
  take: 'Làm bài thi',
  run: 'Luyện tập',
};

// Pure plain text columns for Tree view
const treeColumns = [
  { id: 'name', label: 'Tên module / Chức năng', width: 320, minWidth: 200 },
  { id: 'kind', label: 'Loại phân cấp', width: 160, minWidth: 120 },
  { id: 'route', label: 'Đường dẫn / Mã quyền', width: 260, minWidth: 160 },
  { id: 'description', label: 'Mô tả', width: 360, minWidth: 200 },
  { id: 'status', label: 'Trạng thái', width: 140, minWidth: 120 },
  { id: 'count', label: 'Mục con', width: 120, minWidth: 80 },
];

// Pure plain text columns for Registry view
const moduleColumns = [
  { id: 'key', label: 'Mã phạm vi quyền', width: 200, minWidth: 150 },
  { id: 'name', label: 'Tên phạm vi quyền', width: 280, minWidth: 200 },
  { id: 'actions', label: 'Quyền chức năng', width: 440, minWidth: 250 },
  { id: 'enabled', label: 'Trạng thái', width: 160, minWidth: 120 },
];

export default function ModulePermissionsPage({ forcedTab } = {}) {
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const location = useLocation();

  const requested = forcedTab || params.get('tab');
  const tab =
    requested === 'groups' && hasPermission('permissions:view')
      ? 'groups'
      : requested === 'modules'
      ? 'modules'
      : 'tree';

  const getTabLabel = (tabId) => {
    switch (tabId) {
      case 'modules':
        return 'Danh mục quyền chức năng';
      case 'groups':
        return 'Danh sách vai trò & Nhóm quyền';
      case 'tree':
      default:
        return 'Phân cấp chức năng & Ma trận quyền';
    }
  };

  const tabs = [{ id: tab, label: getTabLabel(tab) }];

  if (tab === 'groups') {
    return (
      <PermissionGroupsPage
        tabs={tabs}
        onTabChange={() => {}}
        initialMemberIds={location.state?.memberIds || []}
        initialView={params.get('view') === 'members' ? 'members' : 'groups'}
      />
    );
  }

  return <ModuleRegistry tab={tab} tabs={tabs} onTabChange={() => {}} />;
}

function ModuleRegistry({ tab, tabs, onTabChange }) {
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const [hierarchy, setHierarchy] = useState([]);
  const [modules, setModules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Module In-Screen Workspace State (replaces centered popup modal)
  const [activeModuleDraft, setActiveModuleDraft] = useState(null);
  const [isCreateModule, setIsCreateModule] = useState(false);
  const isClosingRef = useRef(false);

  // Dialog types for auxiliary tools: 'delete' | 'import' | null
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState(null);
  const [importText, setImportText] = useState('');
  const [availableActions, setAvailableActions] = useState(Object.keys(labels));

  // Tree Navigation State (for tab === 'tree')
  const [treePath, setTreePath] = useState([]);
  const [treeKindFilter, setTreeKindFilter] = useState('');
  const [treeStatusFilter, setTreeStatusFilter] = useState('');
  const [treePage, setTreePage] = useState(1);
  const [treePageSize, setTreePageSize] = useState(20);
  const [treeSort, setTreeSort] = useState({ key: 'name', direction: 1 });

  // Registry Preferences State (for tab === 'modules')
  const [menuPreferences, setMenuPreferences] = useMenuPreferences(`security-modules:${tab}`, {
    search: '',
    status: '',
    pageSize: 20,
    sort: { key: 'name', direction: 1 },
  });

  const search = menuPreferences.search || '';
  const [searchDraft, setSearchDraft] = useState(search);
  const status = menuPreferences.status || '';
  const pageSize = menuPreferences.pageSize || 20;
  const sort = menuPreferences.sort || { key: 'name', direction: 1 };

  const setSearch = value => setMenuPreferences(prev => ({ ...prev, search: value }));
  const setStatus = value => setMenuPreferences(prev => ({ ...prev, status: value }));
  const setPageSize = value => setMenuPreferences(prev => ({ ...prev, pageSize: value }));
  const setSort = value =>
    setMenuPreferences(prev => ({
      ...prev,
      sort: typeof value === 'function' ? value(prev.sort || { key: 'name', direction: 1 }) : value,
    }));

  const [modulesPage, setModulesPage] = useState(1);

  const load = async () => {
    try {
      const [moduleData, groupList] = await Promise.all([
        securityService.modules(),
        peopleService.groups().catch(() => []),
      ]);
      setModules(moduleData.modules || []);
      setHierarchy(moduleData.hierarchy || []);
      setGroups(groupList || []);
    } catch (e) {
      setError(e.message || 'Lỗi khi tải danh sách module');
      notify(e.message || 'Lỗi khi tải danh sách module', 'error');
    }
  };

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  // Synchronize URL query param ?module=... for In-Screen Workspace
  useEffect(() => {
    if (tab !== 'modules') {
      setActiveModuleDraft(null);
      return;
    }
    const moduleParam = params.get('module');
    if (!moduleParam) {
      isClosingRef.current = false;
      setActiveModuleDraft(null);
      return;
    }
    if (activeModuleDraft || isClosingRef.current) return;

    if (moduleParam === 'new') {
      setIsCreateModule(true);
      setActiveModuleDraft({
        key: '',
        label: '',
        actions: defaults,
        enabled: true,
        required_actions: ['view'],
      });
    } else if (modules.length > 0) {
      const target = modules.find(m => m.key === moduleParam);
      if (target) {
        setIsCreateModule(false);
        setActiveModuleDraft({
          ...target,
          actions: [...(target.actions || [])],
          required_actions: target.required_actions || ['view'],
        });
      }
    }
  }, [params, tab, modules, activeModuleDraft]);

  const openModuleDetail = moduleData => {
    isClosingRef.current = false;
    setError('');
    const isCreate = !moduleData;
    setIsCreateModule(isCreate);
    const draftData = moduleData
      ? {
          ...moduleData,
          actions: [...(moduleData.actions || [])],
          required_actions: moduleData.required_actions || ['view'],
        }
      : {
          key: '',
          label: '',
          actions: defaults,
          enabled: true,
          required_actions: ['view'],
        };
    setActiveModuleDraft(draftData);

    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'modules');
      next.set('module', isCreate ? 'new' : moduleData.key);
      return next;
    }, { replace: true });
  };

  const handleBackFromModuleDetail = () => {
    isClosingRef.current = true;
    setActiveModuleDraft(null);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'modules');
      next.delete('module');
      return next;
    }, { replace: true });
  };

  const handleSaveModuleDetail = async moduleData => {
    if (busy || !moduleData) return;
    setError('');
    setBusy(true);
    try {
      if (moduleData.actions.some(action => !/^[a-z][a-z0-9_]{1,31}$/.test(action))) {
        throw new Error('Mã thao tác cần 2–32 ký tự: chữ thường, số hoặc dấu gạch dưới; bắt đầu bằng chữ.');
      }
      if (isCreateModule && moduleData.key && modules.some(m => m.key === moduleData.key)) {
        throw new Error('Mã chức năng này đã tồn tại. Vui lòng chọn mã khác.');
      }

      if (isCreateModule) {
        await securityService.create(moduleData);
      } else {
        await securityService.update(moduleData);
      }

      notify(
        isCreateModule
          ? `Đã đăng ký chức năng "${moduleData.label}".`
          : `Đã cập nhật chức năng "${moduleData.label}".`,
        'success'
      );

      const refreshed = await securityService.modules();
      const freshModules = refreshed?.modules || [];
      setModules(freshModules);
      setHierarchy(refreshed?.hierarchy || []);

      const freshModule = freshModules.find(m => m.key === moduleData.key);

      if (isCreateModule) {
        setIsCreateModule(false);
        setParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'modules');
          next.set('module', moduleData.key);
          return next;
        }, { replace: true });
      }

      if (freshModule) {
        setActiveModuleDraft({
          ...freshModule,
          actions: [...(freshModule.actions || [])],
          required_actions: freshModule.required_actions || ['view'],
        });
      } else {
        setActiveModuleDraft({
          ...moduleData,
          actions: [...(moduleData.actions || [])],
          required_actions: moduleData.required_actions || ['view'],
        });
      }
    } catch (e) {
      setError(e.message || 'Lỗi khi lưu chức năng');
      notify(e.message || 'Thao tác không thành công', 'error');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteModuleDetail = async moduleToDelete => {
    if (busy || !moduleToDelete) return;
    setError('');
    setBusy(true);
    try {
      await securityService.remove(moduleToDelete.key, moduleToDelete.RowVersion);
      notify(`Đã xóa chức năng "${moduleToDelete.label}".`, 'success');
      isClosingRef.current = true;
      setActiveModuleDraft(null);
      setParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'modules');
        next.delete('module');
        return next;
      }, { replace: true });
      const refreshed = await securityService.modules();
      setModules(refreshed?.modules || []);
      setHierarchy(refreshed?.hierarchy || []);
    } catch (e) {
      setError(e.message || 'Lỗi khi xóa chức năng');
      notify(e.message || 'Thao tác không thành công', 'error');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const run = async (operation, successMsg = 'Đã lưu thay đổi trên hệ thống.') => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await operation();
      await load();
      setDialog(null);
      notify(successMsg, 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message || 'Thao tác không thành công', 'error');
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    if (!busy) {
      setDialog(null);
      setError('');
    }
  };

  const handleImportSubmit = e => {
    e.preventDefault();
    try {
      const data = JSON.parse(importText);
      if (!Array.isArray(data.modules)) throw new Error('JSON cần có mảng modules.');
      run(() => securityService.import(data.modules), `Đã nhập thành công ${data.modules.length} module.`);
    } catch (err) {
      setError(err.message);
      notify(err.message, 'error');
    }
  };

  const exportModules = async () => {
    try {
      const data = await securityService.export();
      const exportList = (data.modules || []).filter(m => !m.system);
      const blob = new Blob([JSON.stringify({ modules: exportList }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'skillhub-modules.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
      notify(e.message || 'Lỗi xuất file JSON', 'error');
    }
  };

  // --- TREE LOGIC ---
  const roots = useMemo(() => hydratePermissionHierarchy(modules, hierarchy), [modules, hierarchy]);
  const flat = useMemo(() => flattenPermissionHierarchy(roots), [roots]);
  const treeAncestors = treePath.map(id => flat.find(node => node.id === id)).filter(Boolean);
  const currentTreeNode = treeAncestors.at(-1);

  const treeNodes = useMemo(() => {
    const q = search.trim();
    if (q) {
      return flat.filter(node => !currentTreeNode || node.path.includes(currentTreeNode.id));
    }
    return permissionTreeChildren(flat, currentTreeNode?.id);
  }, [search, flat, currentTreeNode]);

  const treeSource = useMemo(() => {
    const q = search.trim();
    return treeNodes.map(node => ({
      ...node,
      folder: (node.children || []).length > 0,
      next: (node.children || []).length ? node.path : null,
      count: (node.children || []).length,
      description: q
        ? node.path
            .slice(0, -1)
            .map(id => flat.find(parent => parent.id === id)?.name)
            .filter(Boolean)
            .join(' / ') + (node.description ? ' · ' + node.description : '')
        : node.description,
    }));
  }, [treeNodes, search, flat]);

  const treeFiltered = useMemo(() => {
    const q = search.trim();
    return treeSource
      .filter(row => {
        const matchesQuery =
          !q ||
          normalizeOptionSearch([row.name, row.route, row.description, row.kind].join(' ')).includes(
            normalizeOptionSearch(q)
          );
        const matchesKind = !treeKindFilter || row.kind === treeKindFilter;
        const matchesStatus = !treeStatusFilter || String(row.status) === treeStatusFilter;
        return matchesQuery && matchesKind && matchesStatus;
      })
      .sort((a, b) => {
        // Folders always first when exploring
        if (a.folder !== b.folder) return a.folder ? -1 : 1;
        const key = treeSort.key || 'name';
        const dir = treeSort.direction || 1;
        const valA = String(a[key] ?? '');
        const valB = String(b[key] ?? '');
        return valA.localeCompare(valB, 'vi', { numeric: true }) * dir;
      });
  }, [treeSource, search, treeKindFilter, treeStatusFilter, treeSort]);

  const treePages = Math.max(1, Math.ceil(treeFiltered.length / treePageSize));
  const currentTreePage = Math.min(treePage, treePages);
  const treeRows = treeFiltered.slice((currentTreePage - 1) * treePageSize, currentTreePage * treePageSize);

  const goTree = next => {
    setTreePath(next || []);
    setSearch('');
    setSearchDraft('');
    setTreeKindFilter('');
    setTreeStatusFilter('');
    setTreePage(1);
  };

  // --- REGISTRY TABLE LOGIC ---
  const filteredModules = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('vi');
    return modules
      .filter(m => {
        const matchesQuery = !q || `${m.key} ${m.label}`.toLocaleLowerCase('vi').includes(q);
        const matchesStatus = !status || String(m.enabled) === status;
        return matchesQuery && matchesStatus;
      })
      .map(m => ({ ...m, id: m.key, name: m.label }))
      .sort((a, b) => {
        const key = sort.key || 'name';
        const dir = sort.direction || 1;
        const valA = String(a[key] ?? '');
        const valB = String(b[key] ?? '');
        return valA.localeCompare(valB, 'vi', { numeric: true }) * dir;
      });
  }, [modules, search, status, sort]);

  const modulePages = Math.max(1, Math.ceil(filteredModules.length / pageSize));
  const currentModulePage = Math.min(modulesPage, modulePages);
  const moduleRows = filteredModules.slice((currentModulePage - 1) * pageSize, currentModulePage * pageSize);

  const applySearch = () => {
    setSearch(searchDraft.trim());
    if (tab === 'tree') setTreePage(1);
    else setModulesPage(1);
  };

  const handleClearAllFilters = () => {
    setSearchDraft('');
    setSearch('');
    if (tab === 'tree') {
      setTreeKindFilter('');
      setTreeStatusFilter('');
      setTreePage(1);
    } else {
      setStatus('');
      setModulesPage(1);
    }
    notify('Đã xóa tất cả bộ lọc.', 'info');
  };

  const hasActiveTreeFilters = Boolean(search) || Boolean(treeKindFilter) || Boolean(treeStatusFilter);
  const hasActiveModuleFilters = Boolean(search) || Boolean(status);
  const required = draft?.system ? draft.required_actions || ['view'] : ['view'];

  // If in Module Detail/Create Page mode, render the full page with Back button and unsaved check!
  if (tab === 'modules' && activeModuleDraft) {
    return (
      <ModuleDetailPage
        key={activeModuleDraft.key || (isCreateModule ? 'new' : 'edit')}
        draft={activeModuleDraft}
        isCreate={isCreateModule}
        onChange={setActiveModuleDraft}
        onSave={handleSaveModuleDetail}
        onDelete={handleDeleteModuleDetail}
        onBack={handleBackFromModuleDetail}
        groups={groups}
        hierarchy={hierarchy}
        availableActions={availableActions}
        labels={labels}
        required={['view']}
        busy={busy}
        canEdit={hasPermission('modules:update')}
        canDelete={hasPermission('modules:delete')}
      />
    );
  }

  return (
    <ManagementFrame
      header={
        <>
          <Tabs tabs={tabs} activeTab={tab} onChange={onTabChange} />

          {/* Right Header: Actions or Breadcrumbs */}
          <div className="management-actions flex items-center gap-2">
            {tab === 'tree' ? (
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                {treePath.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={ArrowLeft}
                    onClick={() => goTree(treePath.slice(0, -1))}
                    className="mr-2 !h-8 !text-xs"
                  >
                    Quay lại
                  </Button>
                )}
                <button
                  type="button"
                  className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  onClick={() => goTree([])}
                >
                  Tất cả module
                </button>
                {treeAncestors.map((node, index) => (
                  <React.Fragment key={node.id}>
                    <ChevronRight size={13} className="text-slate-400 shrink-0" />
                    <button
                      type="button"
                      className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:underline cursor-pointer truncate max-w-[160px]"
                      onClick={() => goTree(treePath.slice(0, index + 1))}
                    >
                      {node.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              hasPermission('modules:create') && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  disabled={busy}
                  onClick={() => openModuleDetail(null)}
                >
                  Đăng ký chức năng
                </Button>
              )
            )}
          </div>
        </>
      }
      filters={
        tab === 'tree' ? (
          <>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="w-64 max-w-full">
                <SearchInput
                  size="sm"
                  value={searchDraft}
                  onChange={e => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
                  onClear={() => {
                    setSearchDraft('');
                    setSearch('');
                    setTreePage(1);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                  placeholder="Tìm module, chức năng, quyền…"
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
                aria-label="Lọc theo loại"
                searchable
                value={treeKindFilter}
                onChange={e => {
                  setTreeKindFilter(e?.target?.value ?? e);
                  setTreePage(1);
                }}
                options={[
                  { value: '', label: 'Tất cả loại phân cấp' },
                  ...Array.from(new Set(treeSource.map(r => r.kind).filter(Boolean))).map(k => ({
                    value: k,
                    label: k,
                  })),
                ]}
              />

              <Select
                size="sm"
                className="w-44 text-xs font-medium"
                aria-label="Lọc theo trạng thái"
                searchable
                value={treeStatusFilter}
                onChange={e => {
                  setTreeStatusFilter(e?.target?.value ?? e);
                  setTreePage(1);
                }}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  ...Array.from(new Set(treeSource.map(r => r.status).filter(Boolean))).map(s => ({
                    value: s,
                    label: s,
                  })),
                ]}
              />

              {hasActiveTreeFilters && (
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
        ) : (
          <>
            {/* Left: Search & Filter Toolbar for Modules Tab */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="w-64 max-w-full">
                <SearchInput
                  size="sm"
                  value={searchDraft}
                  onChange={e => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
                  onClear={() => {
                    setSearchDraft('');
                    setSearch('');
                    setModulesPage(1);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                  placeholder="Tìm mã hoặc tên module…"
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
                  setModulesPage(1);
                }}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'true', label: 'Hoạt động' },
                  { value: 'false', label: 'Tạm ngưng' },
                ]}
              />

              {hasActiveModuleFilters && (
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
        )
      }
      status={
        tab === 'tree' ? (
          <TableStatusFooter
            title="Module & Chức năng"
            leftExtra={
              <span className="text-slate-500 shrink-0">
                · {roots.length} phân hệ cấp cao · {treeFiltered.length} mục hiển thị
              </span>
            }
            page={currentTreePage}
            totalPages={treePages}
            pageSize={treePageSize}
            onPageChange={setTreePage}
            onPageSizeChange={size => {
              setTreePageSize(size);
              setTreePage(1);
            }}
            onExport={hasPermission('modules:export') ? exportModules : null}
            onImport={hasPermission('modules:import') ? () => { setError(''); setDialog('import'); } : null}
            columnMenuTargetId="admin-tree-column-menu"
            loading={loading}
          />
        ) : (
          <TableStatusFooter
            title="Danh mục quyền chức năng"
            leftExtra={
              <span className="text-slate-500 shrink-0">
                · {filteredModules.length} / {modules.length} module đã đăng ký API
              </span>
            }
            page={currentModulePage}
            totalPages={modulePages}
            pageSize={pageSize}
            onPageChange={setModulesPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setModulesPage(1);
            }}
            onExport={hasPermission('modules:export') ? exportModules : null}
            onImport={hasPermission('modules:import') ? () => { setError(''); setDialog('import'); } : null}
            columnMenuTargetId="admin-modules-column-menu"
            loading={loading}
          />
        )
      }
    >
      {tab === 'tree' ? (
        <VirtualDataTable
          preferenceKey="security-permission-tree"
          columnMenuTargetId="admin-tree-column-menu"
          columns={treeColumns}
          rows={treeRows}
          loading={loading}
          sort={treeSort}
          onSort={key => {
            setTreeSort(current => ({ key, direction: current.key === key ? -current.direction : 1 }));
          }}
          onOpen={row => {
            if (row.next) goTree(row.next);
          }}
          renderCell={(column, row) => {
            // STRICT PLAIN TEXT: Zero tags, zero badges, zero icons, zero action columns
            if (column.id === 'name') {
              if (row.folder) {
                return (
                  <button
                    type="button"
                    className="text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
                    onClick={() => goTree(row.next)}
                  >
                    {row.name}
                  </button>
                );
              }
              return <span className="truncate">{row.name}</span>;
            }
            if (column.id === 'route') {
              return row.route ? <span className="font-mono text-xs">{row.route}</span> : '—';
            }
            if (column.id === 'count') {
              return row.folder ? `${row.count} mục` : '—';
            }
            return row[column.id] || '—';
          }}
        />
      ) : (
        <VirtualDataTable
          preferenceKey={`security-modules:${tab}`}
          columnMenuTargetId="admin-modules-column-menu"
          columns={moduleColumns}
          rows={moduleRows}
          loading={loading}
          sort={sort}
          onSort={key => {
            setSort(current => ({ key, direction: current.key === key ? -current.direction : 1 }));
          }}
          onOpen={openModuleDetail}
          renderCell={(column, row) => {
            // STRICT PLAIN TEXT: Zero tags, zero badges, zero icons, zero action columns
            if (column.id === 'key') {
              return (
                <button
                  type="button"
                  className="text-left font-mono text-xs text-slate-800 dark:text-slate-200 hover:text-emerald-600 hover:underline truncate cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
                  onClick={() => openModuleDetail(row)}
                >
                  {row.key}
                </button>
              );
            }
            if (column.id === 'name') {
              return (
                <button
                  type="button"
                  className="text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
                  onClick={() => openModuleDetail(row)}
                >
                  {row.name}
                  {row.system && <span className="text-slate-400 text-xs ml-2 font-normal">(Hệ thống)</span>}
                </button>
              );
            }
            if (column.id === 'actions') {
              return row.actions?.length
                ? row.actions.map(a => labels[a] || a).join(', ')
                : 'Chưa có thao tác';
            }
            if (column.id === 'enabled') {
              return row.enabled ? 'Hoạt động' : 'Tạm ngưng';
            }
            return row[column.id] ?? '—';
          }}
        />
      )}

      {/* IMPORT JSON MODAL */}
      <Modal
        open={dialog === 'import'}
        onClose={closeDialog}
        title="Nhập danh mục module từ file JSON"
        size="lg"
        fitContent
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={closeDialog}>
              Hủy
            </Button>
            <Button size="sm" form="import-modules-form" type="submit" disabled={busy}>
              Nhập dữ liệu
            </Button>
          </div>
        }
      >
        {error && <p role="alert" className="mb-4 text-sm text-rose-600">{error}</p>}
        <form id="import-modules-form" className="space-y-4" onSubmit={handleImportSubmit}>
          <Textarea
            label="Dữ liệu JSON (tối đa 50 module)"
            required
            rows={10}
            disabled={busy}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={'{\n  "modules": [\n    {\n      "key": "training",\n      "label": "Đào tạo",\n      "actions": ["view", "create"],\n      "enabled": true\n    }\n  ]\n}'}
          />
        </form>
      </Modal>
    </ManagementFrame>
  );
}
