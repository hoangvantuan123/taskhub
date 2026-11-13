import {
  Briefcase,
  Users,
  BarChart3,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const navigationGroups = [
  // ─── 1. CÔNG VIỆC CỦA TÔI (Cá nhân hóa cho từng người) ─────────
  {
    id: 'my-workspace',
    scopeId: 'work:my-tasks',
    label: 'Công việc của tôi',
    shortLabel: 'Của tôi',
    icon: UserCheck,
    defaultPath: '/app/tasks/my',
    items: [
      'tasks-my',
      'tasks-important',
      'tasks-my-archived',
      'tasks-my-trash',
      'tasks-my-calendar',
      'tasks-notifications',
    ],
  },

  // ─── 2. KHÔNG GIAN LÀM VIỆC ───────────────────────────────────
  {
    id: 'workspace',
    scopeId: 'work:tasks',
    label: 'Không gian làm việc',
    shortLabel: 'Làm việc',
    icon: Briefcase,
    defaultPath: '/app/tasks',
    items: [
      // 1. Công việc & Nhiệm vụ
      'tasks-all',
      'tasks-important-all',
      'tasks-overdue',
      'tasks-recurring',
      'tasks-delegated',
      'tasks-pending',
      'tasks-archived',
      'tasks-workspace-trash',

      // 2. Dự án & Kế hoạch
      'projects-all',
      'projects-my',
      'projects-active',
      'projects-cards',
      'projects-completed',
      'projects-archived',

      // 3. Lịch & Tiến độ
      'calendar-tasks',
      'calendar-timeline',
      'calendar-workload',
      'calendar-milestones',

      // 4. Phê duyệt & Nghiệm thu
      'approvals-pending',
      'approvals-my-requests',
      'approvals-history',

      // 5. Kho tài liệu & Tệp tin
      'docs-all',
      'docs-my',
      'docs-shared',
      'docs-trash',
    ],
  },

  // ─── 3. TỔ CHỨC & NHÂN SỰ ──────────────────────────────────────
  {
    id: 'organization',
    scopeId: 'work:organization',
    label: 'Tổ chức & Nhân sự',
    shortLabel: 'Tổ chức',
    icon: Users,
    defaultPath: '/admin/employees',
    items: [
      // Nhân viên
      'employees-list',
      'employees-profiles',
      'employees-invites',
      'employees-inactive',
      // Phòng ban
      'depts-list',
      'depts-chart',
      'depts-assignments',
      // Nhóm làm việc
      'teams-list',
      'teams-my',
      'teams-members',
    ],
  },

  // ─── 4. PHÂN TÍCH & BÁO CÁO ───────────────────────────────────
  {
    id: 'analytics',
    scopeId: 'reports:view',
    label: 'Phân tích & Báo cáo',
    shortLabel: 'Báo cáo',
    icon: BarChart3,
    defaultPath: '/app/reports',
    items: [
      // 1. Báo cáo công việc hệ thống
      'reports-system',
      'reports-tasks',
      'reports-deadlines',
      'reports-performance',

      // 2. Báo cáo tiến độ SharePoint
      'reports-sharepoint',
      'reports-sharepoint-webview',

      // 3. Báo cáo Quản trị & Dự án
      'reports-projects',
      'reports-departments',
      'reports-employees',

      // 4. Tổng hợp & Xuất dữ liệu
      'reports-overview',
      'reports-export',
    ],
  },

  // ─── 5. QUẢN TRỊ HỆ THỐNG ─────────────────────────────────────
  {
    id: 'system',
    scopeId: 'system:admin',
    label: 'Quản trị hệ thống',
    shortLabel: 'Hệ thống',
    icon: ShieldCheck,
    defaultPath: '/admin/users',
    isSystem: true,
    items: [
      // Vai trò & phân quyền
      'sec-roles',
      'sec-permissions',
      'sec-users',
      'sec-matrix',
      // Cấu hình quy trình
      'wf-list',
      'wf-statuses',
      'wf-rules',
      'wf-templates',
      'wf-automation',
      // Cấu hình tổ chức
      'cfg-org',
      'cfg-projects',
      'cfg-notifications',
      'cfg-integrations',
      'cfg-data-policy',
      'cfg-task-columns',
      // Nhật ký & giám sát
      'audit-activity',
      'audit-logins',
      'audit-tasks',
      'audit-monitoring',
    ],
  },
];

export function visibleNavigation(navigation, user, hasPermission) {
  // Tài khoản Admin, SuperAdmin, Director nhìn thấy toàn bộ hệ thống
  if (
    user?.role === 'admin' ||
    user?.username === 'admin' ||
    user?.username === 'superadmin' ||
    user?.username === 'director'
  ) {
    return navigation;
  }
  return navigation.filter((item) => {
    // Menu thuộc "Công việc của tôi" mặc định mở quyền cho tất cả người dùng
    if (item.section === 'Công việc của tôi' || item.isPersonal) {
      return true;
    }
    return item.permission
      ? hasPermission(item.permission)
      : !item.roles?.length || item.roles.includes(user?.role);
  });
}

export function groupedNavigation(items) {
  return navigationGroups
    .map((group) => ({
      ...group,
      entries: group.items
        .map((id) => items.find((item) => item.id === id))
        .filter(Boolean),
    }))
    .filter((group) => group.entries.length);
}
