import { navigation } from '../../app/navigation';
import { navigationGroups } from '../../app/navigationGroups';

export const actionLabels = {
  view: 'Xem danh sách / chi tiết',
  create: 'Thêm mới',
  update: 'Chỉnh sửa',
  delete: 'Xóa',
  import: 'Nhập dữ liệu',
  export: 'Xuất dữ liệu',
  approve: 'Phê duyệt',
  reject: 'Từ chối',
  assign: 'Phân công',
  archive: 'Lưu trữ',
};

export const bindings = {
  // Công việc của tôi
  'tasks-my': ['tasks', 'Công việc của tôi'],
  'tasks-important': ['tasks', 'Công việc quan trọng'],
  'tasks-my-calendar': ['tasks', 'Lịch của tôi'],
  'tasks-notifications': ['tasks', 'Thông báo công việc'],

  // Không gian làm việc
  'tasks-all': ['tasks', 'Tất cả công việc'],
  'tasks-delegated': ['tasks', 'Việc tôi giao'],
  'tasks-kanban': ['tasks', 'Kanban Board'],
  'tasks-pending': ['approvals', 'Công việc chờ duyệt'],
  'tasks-overdue': ['tasks', 'Công việc quá hạn'],
  'tasks-recurring': ['tasks', 'Công việc định kỳ'],
  'tasks-archived': ['tasks', 'Công việc đã lưu trữ'],
  'projects-all': ['projects', 'Tất cả dự án'],
  'projects-my': ['projects', 'Dự án của tôi'],
  'projects-active': ['projects', 'Dự án đang triển khai'],
  'projects-completed': ['projects', 'Dự án đã hoàn thành'],
  'projects-archived': ['projects', 'Dự án lưu trữ'],
  'calendar-tasks': ['tasks', 'Lịch công việc'],
  'calendar-timeline': ['tasks', 'Timeline'],
  'calendar-gantt': ['tasks', 'Biểu đồ Gantt'],
  'calendar-workload': ['tasks', 'Khối lượng công việc'],
  'calendar-milestones': ['tasks', 'Cột mốc quan trọng'],
  'approvals-pending': ['approvals', 'Chờ tôi phê duyệt'],
  'approvals-my-requests': ['approvals', 'Yêu cầu của tôi'],
  'approvals-history': ['approvals', 'Đã xử lý'],
  'docs-all': ['tasks', 'Tất cả tài liệu'],
  'docs-my': ['tasks', 'Tài liệu của tôi'],
  'docs-shared': ['tasks', 'Tài liệu được chia sẻ'],
  'docs-trash': ['tasks', 'Thùng rác'],

  // Tổ chức & Nhân sự
  'employees-list': ['employees', 'Danh sách nhân viên'],
  'employees-profiles': ['employees', 'Hồ sơ nhân viên'],
  'employees-invites': ['employees', 'Lời mời tham gia'],
  'employees-inactive': ['employees', 'Nhân viên ngừng hoạt động'],
  'depts-list': ['employees', 'Danh sách phòng ban'],
  'depts-chart': ['employees', 'Sơ đồ tổ chức'],
  'depts-assignments': ['employees', 'Phân công quản lý'],
  'teams-list': ['employees', 'Danh sách nhóm'],
  'teams-my': ['employees', 'Nhóm của tôi'],
  'teams-members': ['employees', 'Thành viên nhóm'],

  // Phân tích & Báo cáo
  'reports-overview': ['reports', 'Tổng quan báo cáo'],
  'reports-system': ['reports', 'Báo cáo công việc hệ thống'],
  'reports-sharepoint': ['reports', 'Báo cáo tiến độ SharePoint'],
  'reports-sharepoint-webview': ['reports', 'Trình xem trực tiếp SharePoint'],
  'reports-tasks': ['reports', 'Báo cáo công việc'],
  'reports-projects': ['reports', 'Báo cáo dự án'],
  'reports-employees': ['reports', 'Báo cáo nhân viên'],
  'reports-departments': ['reports', 'Báo cáo phòng ban'],
  'reports-deadlines': ['reports', 'Tiến độ & deadline'],
  'reports-performance': ['reports', 'Hiệu suất & thời gian'],
  'reports-export': ['reports', 'Xuất báo cáo'],

  // Quản trị hệ thống
  'sec-roles': ['modules', 'Danh sách vai trò'],
  'sec-permissions': ['modules', 'Danh sách quyền'],
  'sec-users': ['users', 'Gán quyền người dùng'],
  'sec-matrix': ['modules', 'Ma trận phân quyền'],
  'wf-list': ['modules', 'Danh sách quy trình'],
  'wf-statuses': ['modules', 'Trạng thái công việc'],
  'wf-rules': ['modules', 'Quy tắc chuyển trạng thái'],
  'wf-templates': ['modules', 'Mẫu công việc'],
  'wf-automation': ['modules', 'Tự động hóa'],
  'cfg-org': ['modules', 'Thông tin doanh nghiệp'],
  'cfg-projects': ['modules', 'Cấu hình dự án'],
  'cfg-notifications': ['modules', 'Cấu hình thông báo'],
  'cfg-integrations': ['modules', 'Tích hợp hệ thống'],
  'cfg-data-policy': ['modules', 'Chính sách dữ liệu'],
  'cfg-task-columns': ['modules', 'Cấu hình cột công việc'],
  'audit-activity': ['modules', 'Nhật ký hoạt động'],
  'audit-logins': ['modules', 'Lịch sử đăng nhập'],
  'audit-tasks': ['modules', 'Tác vụ nền'],
  'audit-monitoring': ['modules', 'Giám sát hệ thống'],
};

export const canonicalScopes = {
  tasks: {
    key: 'tasks',
    label: 'Quản lý công việc',
    route: '/app/tasks',
    description: 'Quản lý danh sách công việc, phân công và tiến độ',
    actions: ['view', 'create', 'update', 'delete', 'export'],
  },
  approvals: {
    key: 'approvals',
    label: 'Quy trình & Phê duyệt',
    route: '/app/tasks/supervisor',
    description: 'Quy trình kiểm tra, phê duyệt và nghiệm thu công việc',
    actions: ['view', 'approve', 'reject', 'update'],
  },
  projects: {
    key: 'projects',
    label: 'Quản lý dự án',
    route: '/app/tasks/projects',
    description: 'Quản lý danh mục dự án, kế hoạch và phân bổ nguồn lực',
    actions: ['view', 'create', 'update', 'delete', 'export'],
  },
  reports: {
    key: 'reports',
    label: 'Báo cáo & Thống kê KPI',
    route: '/app',
    description: 'Theo dõi tiến độ, hiệu suất và báo cáo KPI',
    actions: ['view', 'export', 'config', 'sharepoint'],
  },
  employees: {
    key: 'employees',
    label: 'Hồ sơ nhân sự',
    route: '/admin/employees',
    description: 'Quản lý hồ sơ nhân sự, cấp bậc và cơ cấu tổ chức',
    actions: ['view', 'create', 'update', 'delete', 'export'],
  },
  users: {
    key: 'users',
    label: 'Quản lý tài khoản',
    route: '/admin/users',
    description: 'Quản lý danh sách tài khoản đăng nhập, trạng thái tài khoản',
    actions: ['view', 'create', 'update', 'delete'],
  },
  modules: {
    key: 'modules',
    label: 'Module & Phân quyền',
    route: '/admin/modules',
    description: 'Đăng ký module và chức năng',
    actions: ['view', 'create', 'update', 'delete', 'import', 'export'],
  },
  permissions: {
    key: 'permissions',
    label: 'Nhóm quyền & Thành viên',
    route: '/admin/modules',
    description: 'Tạo nhóm quyền, gán thành viên và cấp quyền trực tiếp',
    actions: ['view', 'update'],
  },
  catalog: {
    key: 'catalog',
    label: 'Danh mục hệ thống',
    route: '/admin/catalog',
    description: 'Đăng ký danh mục nghiệp vụ dùng chung',
    actions: ['view', 'create', 'update'],
  },
  settings: {
    key: 'settings',
    label: 'Cài đặt cá nhân',
    route: '/app/settings',
    description: 'Hồ sơ cá nhân và tùy chọn hệ thống',
    actions: ['view', 'update'],
  },
};

export const expectedActions = {
  tasks: ['view', 'create', 'update', 'delete', 'export'],
  approvals: ['view', 'approve', 'reject', 'update'],
  projects: ['view', 'create', 'update', 'delete', 'export'],
  reports: ['view', 'export', 'config', 'sharepoint'],
  employees: ['view', 'create', 'update', 'delete', 'export'],
  users: ['view', 'create', 'update', 'delete'],
  modules: ['view', 'create', 'update', 'delete', 'import', 'export'],
  permissions: ['view', 'update'],
  catalog: ['view', 'create', 'update'],
  settings: ['view', 'update'],
};

export const moduleScreens = {
  tasks: [
    ['Công việc của tôi', '/app/tasks/my', 'Xem và cập nhật tiến độ công việc cá nhân'],
    ['Cấp bậc & Giao việc', '/app/tasks/delegated', 'Phân cấp giao việc và theo dõi cấp dưới'],
    ['Bảng công việc toàn diện', '/app/tasks', 'Quản lý công việc dạng bảng và Kanban'],
  ],
  approvals: [
    ['Hàng đợi phê duyệt', '/app/tasks/supervisor', 'Danh sách công việc chờ duyệt nghiệm thu'],
    ['Phê duyệt & Nghiệm thu', '/app/tasks/supervisor', 'Duyệt hoàn thành hoặc yêu cầu làm lại'],
  ],
  projects: [
    ['Danh sách dự án', '/app/tasks/projects', 'Quản lý dự án, tiến độ tổng thể và mục tiêu'],
  ],
  employees: [
    ['Hồ sơ nhân sự', '/admin/employees', 'Quản lý nhân viên, cấp bậc và liên kết tài khoản'],
    ['Cơ cấu đội nhóm', '/app/organization/teams', 'Quản lý sơ đồ cơ cấu tổ chức và nhóm'],
  ],
  users: [
    ['Tài khoản người dùng', '/admin/users', 'Quản lý tài khoản đăng nhập, trạng thái tài khoản'],
  ],
  modules: [
    ['Menu & Chức năng', '/admin/modules', 'Bảng phân cấp chức năng'],
    ['Đăng ký module', '/admin/modules', 'Tab đăng ký module và quyền'],
    ['Nhóm quyền & Thành viên', '/admin/modules', 'Tab nhóm quyền, mẫu và gán hàng loạt'],
  ],
  catalog: [
    ['Danh mục hệ thống', '/admin/catalog', 'Cấp bậc, phòng ban, vị trí và tham số'],
  ],
};

export function permissionBranches(modules) {
  modules = (Array.isArray(modules) ? modules : []).map(module => ({
    ...module,
    actions: Array.isArray(module.actions) ? module.actions : [],
  }));
  const usedIds = new Set();
  const usedKeys = new Set();
  const branches = navigationGroups.map(group => ({
    ...group,
    children: group.items
      .map(id => {
        const item = navigation.find(item => item.id === id);
        const binding = bindings[id];
        if (!item || !binding) return null;
        const key = binding[0];
        if (usedIds.has(id)) return null;
        const module = modules.find(module => module.key === key);

        usedIds.add(id);
        usedKeys.add(key);
        return {
          id,
          key,
          label: item.label,
          actions: expectedActions[key] || ['view'],
          enabled: false,
          ...module,
          registered: !!module,
          route: item.path,
          description: binding[1],
        };
      })
      .filter(Boolean),
  }));
  branches.push({
    id: 'personal',
    label: 'Chung & Cá nhân',
    children: [
      {
        id: 'dashboard',
        key: 'dashboard',
        label: 'Tổng quan công việc',
        route: '/app',
        description: 'Trang tổng quan công việc và KPI',
        actions: [],
        enabled: true,
        personal: true,
      },
      {
        id: 'settings',
        key: 'settings',
        label: 'Cài đặt cá nhân',
        route: '/app/settings',
        description: 'Hồ sơ cá nhân · Hiển thị & Múi giờ · Nhật ký hoạt động',
        actions: [],
        enabled: true,
        personal: true,
      },
      {
        id: 'notifications',
        key: 'notifications',
        label: 'Thông báo',
        route: '/notifications',
        description: 'Trung tâm thông báo công việc',
        actions: [],
        enabled: true,
        personal: true,
      },
    ],
  });
  const extras = modules
    .filter(module => !usedKeys.has(module.key))
    .map(module => ({
      ...module,
      route: module.key === 'permissions' ? '/admin/modules' : '',
      description:
        module.key === 'permissions'
          ? 'Tạo nhóm quyền, gán thành viên và cấp quyền trực tiếp'
          : 'Chức năng được đăng ký trong hệ thống',
    }));
  if (extras.length) branches.push({ id: 'other', label: 'Chức năng bổ sung', children: extras });
  return branches.filter(branch => branch.children.length);
}

export function mergePermissionTargets(targets) {
  const result = new Map();
  for (const target of targets) {
    const previous = result.get(target.key);
    result.set(target.key, {
      ...target,
      actions: [...new Set([...(previous?.actions || []), ...target.actions])],
    });
  }
  return [...result.values()];
}

export function setBranchPermissions(current, modules, checked) {
  let result = current.map(permission => ({ ...permission, actions: [...permission.actions] }));
  for (const module of mergePermissionTargets(modules).filter(
    module => module.enabled && module.registered !== false && !module.personal
  )) {
    const previous = result.find(permission => permission.module === module.key)?.actions || [];
    let actions = checked
      ? [
          ...new Set([
            ...previous,
            ...module.actions,
            ...(module.actions.some(action => action !== 'view') ? ['view'] : []),
          ]),
        ]
      : previous.filter(action => !module.actions.includes(action));
    if (!checked && module.actions.includes('view')) actions = [];
    result = result.filter(permission => permission.module !== module.key);
    if (actions.length) result.push({ module: module.key, actions });
  }
  return result;
}

export function toggleTreeAction(current, module, action, checked) {
  const prior = current.find(permission => permission.module === module)?.actions || [];
  let actions = checked
    ? [...new Set([...prior, action, ...(action !== 'view' ? ['view'] : [])])]
    : action === 'view'
    ? []
    : prior.filter(value => value !== action);
  return [
    ...current.filter(permission => permission.module !== module),
    ...(actions.length ? [{ module, actions }] : []),
  ];
}

export function employeePreset(modules) {
  const allowed = {
    tasks: ['view', 'create', 'update'],
    approvals: ['view'],
    projects: ['view'],
  };
  return modules
    .filter(module => module.enabled && allowed[module.key])
    .map(module => ({
      module: module.key,
      actions: module.actions.filter(action => allowed[module.key].includes(action)),
    }))
    .filter(permission => permission.actions.length);
}
export const learnerPreset = employeePreset;

export function copyGroupPermissions(group) {
  return (group?.permissions || []).map(permission => ({
    ...permission,
    actions: [...(permission.actions || [])],
  }));
}

export function createPermissionGroupDraft() {
  return { key: '', label: '', enabled: true, permissions: [] };
}

// Business modules are presentation parents; scope keys remain stable API references.
export function permissionHierarchy(modules) {
  const inventory = permissionBranches(modules).flatMap(branch => branch.children);
  const scopes = new Map(inventory.map(scope => [scope.key, scope]));
  const mapped = new Set();
  const actionSets = {
    tasks: [
      ['view', 'create', 'delete', 'export'],
      ['view', 'update'],
    ],
    approvals: [['view'], ['approve', 'reject', 'update']],
    projects: [['view', 'create', 'delete', 'export'], ['view', 'update']],
    users: [['view', 'create', 'update', 'delete']],
    modules: [['view'], ['view', 'create', 'update', 'delete', 'import', 'export'], []],
    catalog: [['view', 'create', 'update']],
  };

  const leaf = (scope, actions, id) =>
    actions.map(action => ({
      id: id + ':' + action,
      name: actionLabels[action] || action,
      kind: 'Quyền thao tác',
      route: scope.key + ':' + action,
      description: 'Quyền của chức năng ' + scope.label,
      status: scope.personal
        ? 'Mọi tài khoản'
        : scope.registered === false
        ? 'Chưa đăng ký'
        : scope.enabled
        ? 'Hoạt động'
        : 'Tạm ngưng',
      module: scope,
      action,
      children: [],
      targets: [{ ...scope, actions: [action] }],
    }));

  const menu = (key, parent) => {
    let scope = scopes.get(key);
    if (!scope && canonicalScopes[key]) {
      const canonical = canonicalScopes[key];
      const module = modules.find(m => m.key === key);
      scope = { ...canonical, enabled: false, ...module, registered: !!module };
      scopes.set(key, scope);
    }
    if (!scope) return null;
    mapped.add(key);
    const id = parent + ':menu:' + key;
    const definitions = moduleScreens[key] || [
      ['Quản lý ' + scope.label, scope.route || '', scope.description],
    ];
    const children = definitions.map((definition, index) => {
      let target = scope;
      if (key === 'modules' && index === 2) {
        target = scopes.get('permissions') || {
          key: 'permissions',
          label: 'Nhóm quyền & Thành viên',
          actions: ['view', 'update'],
          registered: false,
          enabled: false,
        };
        mapped.add('permissions');
      }
      const wanted =
        target !== scope ? target.actions : actionSets[key]?.[index] || scope.actions;
      const actions = wanted.filter(action => target.actions.includes(action));
      const functionId = id + ':function:' + index;
      return {
        id: functionId,
        name: definition[0],
        kind: 'Chức năng',
        route: definition[1],
        description: definition[2],
        status: scope.personal
          ? 'Mọi tài khoản'
          : target.registered === false
          ? 'Chưa đăng ký'
          : target.enabled
          ? 'Hoạt động'
          : 'Tạm ngưng',
        children: [],
        targets: actions.length ? [{ ...target, actions }] : [],
      };
    });
    const represented = new Set(
      children
        .flatMap(child => child.targets.filter(target => target.key === key))
        .flatMap(target => target.actions)
    );
    const remaining = scope.actions.filter(action => !represented.has(action));
    if (remaining.length) {
      const functionId = id + ':function:management';
      children.push({
        id: functionId,
        name: 'Quản lý ' + scope.label,
        kind: 'Chức năng',
        route: scope.route || key,
        description: scope.description,
        status:
          scope.registered === false
            ? 'Chưa đăng ký'
            : scope.enabled
            ? 'Hoạt động'
            : 'Tạm ngưng',
        children: [],
        targets: [{ ...scope, actions: remaining }],
      });
    }
    return {
      id,
      name: scope.label,
      kind: 'Menu / Màn hình',
      route: scope.route || key,
      description: scope.description,
      status: scope.personal
        ? 'Mọi tài khoản'
        : scope.registered === false
        ? 'Chưa đăng ký'
        : scope.enabled
        ? 'Hoạt động'
        : 'Tạm ngưng',
      children,
      targets: mergePermissionTargets(children.flatMap(child => child.targets)),
    };
  };

  const group = (id, name, keys) => {
    const children = keys.map(key => menu(key, id)).filter(Boolean);
    return {
      id,
      name,
      kind: 'Nhóm menu',
      route: '',
      description: children.map(child => child.name).join(' · '),
      status: '',
      children,
      targets: mergePermissionTargets(children.flatMap(child => child.targets)),
    };
  };

  const root = (id, name, groups) => ({
    id,
    name,
    kind: 'Module',
    route: '',
    description: groups.map(group => group.name).join(' · '),
    status: '',
    children: groups,
    targets: mergePermissionTargets(groups.flatMap(group => group.targets)),
  });

  const roots = [
    root('work', 'Quản lý công việc', [
      group('work:tasks', 'Quản lý công việc', ['tasks', 'approvals', 'projects']),
    ]),
    root('system', 'Hệ thống & Phân quyền', [
      group('system:security', 'Tài khoản & Phân quyền', ['users', 'modules']),
      group('system:catalog', 'Danh mục nghiệp vụ', ['catalog']),
    ]),
    root('personal', 'Chung & Cá nhân', [
      group('personal:utilities', 'Tiện ích cá nhân', ['dashboard', 'settings', 'notifications']),
    ]),
  ];

  const extras = inventory.filter(scope => !mapped.has(scope.key));
  if (extras.length)
    roots.push(
      root('extensions', 'Mở rộng', [
        group(
          'extensions:registered',
          'Chức năng đã đăng ký',
          extras.map(scope => scope.key)
        ),
      ])
    );
  return roots;
}

export function flattenPermissionHierarchy(nodes, path = []) {
  return (nodes || []).flatMap(node => [
    { ...node, path: [...path, node.id], breadcrumbs: [...path] },
    ...flattenPermissionHierarchy(node.children, [...path, node.id]),
  ]);
}

export function permissionTreeChildren(flat, parentId) {
  return flat.filter(node =>
    parentId ? node.breadcrumbs.at(-1) === parentId : node.breadcrumbs.length === 0
  );
}

export function hydratePermissionHierarchy(modules, nodes) {
  if (!nodes?.length) return permissionHierarchy(modules);
  const scopes = new Map(
    permissionBranches(modules)
      .flatMap(branch => branch.children)
      .map(scope => [scope.key, scope])
  );
  // The stored layout can predate new registry actions. Keep them selectable under their menu.
  nodes = [...nodes];
  for (const scope of scopes.values()) {
    if (scope.personal || scope.registered === false) continue;
    const records = nodes.filter(node => node.scope_key === scope.key);
    if (!records.length) continue;
    const missing = scope.actions.filter(
      action => !records.some(record => record.action === action)
    );
    if (!missing.length) continue;
    let parent = records[0];
    while (parent && parent.kind !== 'Menu / Màn hình')
      parent = nodes.find(node => node.id === parent.parent_id);
    if (!parent) continue;
    const id = parent.id + ':registry:' + scope.key;
    nodes.push({
      id,
      parent_id: parent.id,
      label: 'Thao tác bổ sung · ' + scope.label,
      kind: 'Chức năng',
      route: scope.route,
      description: 'Thao tác đã đăng ký trong danh mục chức năng',
    });
    for (const action of missing)
      nodes.push({
        id: id + ':' + action,
        parent_id: id,
        label: actionLabels[action] || action,
        kind: 'Quyền thao tác',
        route: scope.key + ':' + action,
        description: 'Quyền của chức năng ' + scope.label,
        scope_key: scope.key,
        action,
      });
  }

  const make = record => {
    let scope = record.scope_key ? scopes.get(record.scope_key) : null;
    if (!scope && record.scope_key && canonicalScopes[record.scope_key]) {
      const canonical = canonicalScopes[record.scope_key];
      const module = modules.find(m => m.key === record.scope_key);
      scope = { ...canonical, enabled: false, ...module, registered: !!module };
      scopes.set(record.scope_key, scope);
    }
    if (!scope && record.scope_key) {
      scope = {
        key: record.scope_key,
        label: record.scope_key,
        actions: [],
        enabled: false,
        registered: false,
      };
    }
    const supported = scope && scope.actions.includes(record.action);
    const children = nodes.filter(node => node.parent_id === record.id).map(make);
    const target = scope
      ? { ...scope, actions: supported ? [record.action] : [], enabled: scope.enabled && supported }
      : null;
    return {
      id: record.id,
      name: record.label,
      kind: record.kind,
      route: record.route,
      description: record.description,
      children,
      targets: target ? [target] : mergePermissionTargets(children.flatMap(child => child.targets)),
      ...(target ? { module: target, action: record.action } : {}),
      status: target
        ? scope.personal
          ? 'Mọi tài khoản'
          : !supported || scope.registered === false
          ? 'Chưa đăng ký'
          : scope.enabled
          ? 'Hoạt động'
          : 'Tạm ngưng'
        : record.id.startsWith('personal')
        ? 'Mọi tài khoản'
        : '',
    };
  };

  const roots = nodes.filter(node => !node.parent_id).map(make);
  const known = new Set(nodes.map(node => node.scope_key).filter(Boolean));
  const extra = permissionHierarchy(modules).find(root => root.id === 'extensions');
  if (extra) {
    extra.children = extra.children
      .map(group => ({
        ...group,
        children: group.children.filter(
          menu => !menu.targets.every(target => known.has(target.key))
        ),
      }))
      .filter(group => group.children.length);
    if (extra.children.length) roots.push(extra);
  }
  return roots;
}
