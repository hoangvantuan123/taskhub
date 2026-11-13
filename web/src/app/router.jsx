import React, { lazy, Suspense } from 'react';
import LoadingPage from '../shared/ui/LoadingPage';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import WorkspaceLayout from '../layouts/WorkspaceLayout';
import AuthLayout from '../layouts/AuthLayout';

// Features - Auth
const LoginPage = lazy(() => import('../features/auth').then(module => ({ default: module.LoginPage })));
const AccessDeniedPage = lazy(() => import('../features/auth').then(module => ({ default: module.AccessDeniedPage })));

// Features - Tasks Management (ETPMS)
const TaskDashboardPage = lazy(() => import('../features/tasks').then(module => ({ default: module.TaskDashboardPage })));
const TaskListPage = lazy(() => import('../features/tasks').then(module => ({ default: module.TaskListPage })));
const CreateTaskPage = lazy(() => import('../features/tasks').then(module => ({ default: module.CreateTaskPage })));
const MyTasksPage = lazy(() => import('../features/tasks/pages/MyTasksPage'));
const DelegatedTasksPage = lazy(() => import('../features/tasks/pages/DelegatedTasksPage'));
const SupervisorPage = lazy(() => import('../features/tasks').then(module => ({ default: module.SupervisorPage })));
const PendingApprovalsPage = lazy(() => import('../features/tasks/pages/approvals/PendingApprovalsPage'));
const MyApprovalRequestsPage = lazy(() => import('../features/tasks/pages/approvals/MyApprovalRequestsPage'));
const ApprovalHistoryPage = lazy(() => import('../features/tasks/pages/approvals/ApprovalHistoryPage'));
const ProjectListPage = lazy(() => import('../features/tasks').then(module => ({ default: module.ProjectListPage })));
const TaskCalendarPage = lazy(() => import('../features/tasks/pages/TaskCalendarPage'));
const TaskTrashPage = lazy(() => import('../features/tasks/pages/TaskTrashPage'));
const TaskReportsPage = lazy(() => import('../features/tasks/pages/TaskReportsPage'));

// Documents (Tài liệu)
const DocumentsPage = lazy(() => import('../features/tasks/pages/DocumentsPage'));
const AllDocumentsPage = lazy(() => import('../features/tasks/pages/documents/AllDocumentsPage'));
const MyDocumentsPage = lazy(() => import('../features/tasks/pages/documents/MyDocumentsPage'));
const SharedDocumentsPage = lazy(() => import('../features/tasks/pages/documents/SharedDocumentsPage'));
const TrashDocumentsPage = lazy(() => import('../features/tasks/pages/documents/TrashDocumentsPage'));

// Features - Organization, Employees & Security
const EmployeeManagementPage = lazy(() => import('../features/organization/pages/EmployeeManagementPage'));
const DepartmentListPage = lazy(() => import('../features/organization/pages/DepartmentListPage'));
const OrgChartPage = lazy(() => import('../features/organization/pages/OrgChartPage'));
const DepartmentManagersPage = lazy(() => import('../features/organization/pages/DepartmentManagersPage'));
const UserManagementPage = lazy(() => import('../features/organization').then(module => ({ default: module.UserManagementPage })));
const GroupsPage = lazy(() => import('../features/organization/pages/GroupsPage'));
const TeamListPage = lazy(() => import('../features/organization/pages/teams/TeamListPage'));
const MyTeamsPage = lazy(() => import('../features/organization/pages/teams/MyTeamsPage'));
const TeamMembersPage = lazy(() => import('../features/organization/pages/teams/TeamMembersPage'));

// Features - Analytics & Reports
const OverviewReportsPage = lazy(() => import('../features/analytics/reports/OverviewReportsPage'));
const TaskReportsSubPage = lazy(() => import('../features/analytics/reports/TaskReportsSubPage'));
const ProjectReportsPage = lazy(() => import('../features/analytics/reports/ProjectReportsPage'));
const SharepointProgressReportsTab = lazy(() => import('../features/analytics/reports/SharepointProgressReportsTab'));

// Features - Security & Roles
const ModulePermissionsPage = lazy(() => import('../features/security/pages/ModulePermissionsPage'));
const RoleListPage = lazy(() => import('../features/security/pages/roles/RoleListPage'));
const PermissionListPage = lazy(() => import('../features/security/pages/roles/PermissionListPage'));
const PermissionMatrixPage = lazy(() => import('../features/security/pages/roles/PermissionMatrixPage'));
const CatalogPage = lazy(() => import('../features/catalog').then(module => ({ default: module.CatalogPage })));

// Features - Workflows
const WorkflowListPage = lazy(() => import('../features/workflows/pages/WorkflowListPage'));
const WorkflowStatusesPage = lazy(() => import('../features/workflows/pages/WorkflowStatusesPage'));
const WorkflowRulesPage = lazy(() => import('../features/workflows/pages/WorkflowRulesPage'));
const WorkflowTemplatesPage = lazy(() => import('../features/workflows/pages/WorkflowTemplatesPage'));
const WorkflowAutomationPage = lazy(() => import('../features/workflows/pages/WorkflowAutomationPage'));

// Features - Org Config
const CompanyInfoPage = lazy(() => import('../features/system/org-config/CompanyInfoPage'));
const ProjectConfigPage = lazy(() => import('../features/system/org-config/ProjectConfigPage'));
const NotificationConfigPage = lazy(() => import('../features/system/org-config/NotificationConfigPage'));
const IntegrationConfigPage = lazy(() => import('../features/system/org-config/IntegrationConfigPage'));
const DataPolicyPage = lazy(() => import('../features/system/org-config/DataPolicyPage'));
const TaskColumnsConfigPage = lazy(() => import('../features/system/org-config/TaskColumnsConfigPage'));

// Features - Audit & Monitoring
const ActivityLogPage = lazy(() => import('../features/system/audit/ActivityLogPage'));
const LoginHistoryPage = lazy(() => import('../features/system/audit/LoginHistoryPage'));
const BackgroundTasksPage = lazy(() => import('../features/system/audit/BackgroundTasksPage'));
const SystemMonitoringPage = lazy(() => import('../features/system/audit/SystemMonitoringPage'));

const SettingsPage = lazy(() => import('../features/settings').then(module => ({ default: module.SettingsPage })));
const NotificationsPage = lazy(() => import('../features/notifications').then(module => ({ default: module.NotificationsPage })));

// 404 Component
function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--navy)' }}>404</h1>
      <p style={{ color: 'var(--navy-muted)', margin: '8px 0 20px' }}>
        Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
      </p>
      <a
        href="/app"
        style={{
          display: 'inline-block',
          background: 'var(--color-primary-600)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '8px',
          fontWeight: '600',
        }}
      >
        Về bàn làm việc
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  // Root redirect
  {
    path: '/',
    element: <Navigate to="/app" replace />,
  },

  // Auth Layout routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Suspense fallback={<LoadingPage />}><LoginPage /></Suspense> },
      { path: '/access-denied', element: <Suspense fallback={<LoadingPage />}><AccessDeniedPage /></Suspense> },
    ],
  },

  // Main Workspace Layout
  {
    element: <WorkspaceLayout />,
    children: [
      // 1. Dashboard
      { path: '/app', element: <Suspense fallback={<LoadingPage />}><TaskDashboardPage /></Suspense> },
      { path: '/app/overview', element: <Suspense fallback={<LoadingPage />}><TaskDashboardPage /></Suspense> },
      { path: '/app/overview/personal', element: <Suspense fallback={<LoadingPage />}><TaskDashboardPage /></Suspense> },
      { path: '/app/overview/team', element: <Suspense fallback={<LoadingPage />}><TaskDashboardPage /></Suspense> },
      { path: '/app/overview/enterprise', element: <Suspense fallback={<LoadingPage />}><TaskDashboardPage /></Suspense> },

      // 2. Task Management Routes (Không gian làm việc & Dự án)
      { path: '/app/tasks', element: <Suspense fallback={<LoadingPage />}><TaskListPage /></Suspense> },
      { path: '/app/tasks/new', element: <Suspense fallback={<LoadingPage />}><CreateTaskPage /></Suspense> },
      { path: '/app/tasks/:seq/edit', element: <Suspense fallback={<LoadingPage />}><CreateTaskPage mode="edit" /></Suspense> },
      { path: '/app/tasks/edit/:seq', element: <Suspense fallback={<LoadingPage />}><CreateTaskPage mode="edit" /></Suspense> },
      { path: '/app/tasks/my', element: <Suspense fallback={<LoadingPage />}><MyTasksPage /></Suspense> },
      { path: '/app/tasks/my/new', element: <Suspense fallback={<LoadingPage />}><CreateTaskPage /></Suspense> },
      { path: '/app/tasks/my/:seq', element: <Suspense fallback={<LoadingPage />}><MyTasksPage /></Suspense> },
      { path: '/app/tasks/trash', element: <Suspense fallback={<LoadingPage />}><TaskTrashPage /></Suspense> },
      { path: '/app/tasks/delegated', element: <Suspense fallback={<LoadingPage />}><DelegatedTasksPage /></Suspense> },
      { path: '/app/tasks/delegated/new', element: <Suspense fallback={<LoadingPage />}><CreateTaskPage /></Suspense> },
      { path: '/app/tasks/delegated/:seq', element: <Suspense fallback={<LoadingPage />}><DelegatedTasksPage /></Suspense> },

      // Phê duyệt
      { path: '/app/tasks/supervisor', element: <Suspense fallback={<LoadingPage />}><SupervisorPage /></Suspense> },
      { path: '/app/approvals', element: <Suspense fallback={<LoadingPage />}><PendingApprovalsPage /></Suspense> },
      { path: '/app/approvals/pending', element: <Suspense fallback={<LoadingPage />}><PendingApprovalsPage /></Suspense> },
      { path: '/app/approvals/my-requests', element: <Suspense fallback={<LoadingPage />}><MyApprovalRequestsPage /></Suspense> },
      { path: '/app/approvals/history', element: <Suspense fallback={<LoadingPage />}><ApprovalHistoryPage /></Suspense> },

      // Dự án & Lịch
      { path: '/app/tasks/projects', element: <Suspense fallback={<LoadingPage />}><ProjectListPage /></Suspense> },
      { path: '/app/tasks/calendar', element: <Suspense fallback={<LoadingPage />}><TaskCalendarPage /></Suspense> },

      // Báo cáo & Phân tích
      { path: '/app/tasks/reports', element: <Suspense fallback={<LoadingPage />}><TaskReportsPage /></Suspense> },
      { path: '/app/reports', element: <Suspense fallback={<LoadingPage />}><OverviewReportsPage /></Suspense> },
      { path: '/app/reports/overview', element: <Suspense fallback={<LoadingPage />}><OverviewReportsPage /></Suspense> },
      { path: '/app/reports/sharepoint', element: <Suspense fallback={<LoadingPage />}><SharepointProgressReportsTab /></Suspense> },
      { path: '/app/reports/tasks', element: <Suspense fallback={<LoadingPage />}><TaskReportsSubPage /></Suspense> },
      { path: '/app/reports/projects', element: <Suspense fallback={<LoadingPage />}><ProjectReportsPage /></Suspense> },
      { path: '/app/reports/employees', element: <Suspense fallback={<LoadingPage />}><OverviewReportsPage /></Suspense> },
      { path: '/app/reports/departments', element: <Suspense fallback={<LoadingPage />}><OverviewReportsPage /></Suspense> },
      { path: '/app/reports/deadlines', element: <Suspense fallback={<LoadingPage />}><OverviewReportsPage /></Suspense> },
      { path: '/app/reports/performance', element: <Suspense fallback={<LoadingPage />}><OverviewReportsPage /></Suspense> },
      { path: '/app/reports/export', element: <Suspense fallback={<LoadingPage />}><OverviewReportsPage /></Suspense> },

      // Tài liệu
      { path: '/app/tasks/documents', element: <Suspense fallback={<LoadingPage />}><DocumentsPage /></Suspense> },
      { path: '/app/tasks/:seq', element: <Suspense fallback={<LoadingPage />}><TaskListPage /></Suspense> },
      { path: '/app/documents', element: <Suspense fallback={<LoadingPage />}><AllDocumentsPage /></Suspense> },
      { path: '/app/documents/all', element: <Suspense fallback={<LoadingPage />}><AllDocumentsPage /></Suspense> },
      { path: '/app/documents/my', element: <Suspense fallback={<LoadingPage />}><MyDocumentsPage /></Suspense> },
      { path: '/app/documents/shared', element: <Suspense fallback={<LoadingPage />}><SharedDocumentsPage /></Suspense> },
      { path: '/app/documents/trash', element: <Suspense fallback={<LoadingPage />}><TrashDocumentsPage /></Suspense> },

      // 3. Organization & Personnel (Tổ chức & Nhân sự)
      { path: '/admin/employees', element: <Suspense fallback={<LoadingPage />}><EmployeeManagementPage /></Suspense> },
      { path: '/admin/employees/new', element: <Suspense fallback={<LoadingPage />}><EmployeeManagementPage /></Suspense> },
      { path: '/admin/employees/profiles', element: <Suspense fallback={<LoadingPage />}><EmployeeManagementPage /></Suspense> },
      { path: '/admin/employees/invitations', element: <Suspense fallback={<LoadingPage />}><EmployeeManagementPage /></Suspense> },
      { path: '/admin/employees/inactive', element: <Suspense fallback={<LoadingPage />}><EmployeeManagementPage /></Suspense> },

      { path: '/app/organization/departments', element: <Suspense fallback={<LoadingPage />}><DepartmentListPage /></Suspense> },
      { path: '/app/organization/departments/list', element: <Suspense fallback={<LoadingPage />}><DepartmentListPage /></Suspense> },
      { path: '/app/organization/departments/chart', element: <Suspense fallback={<LoadingPage />}><OrgChartPage /></Suspense> },
      { path: '/app/organization/departments/managers', element: <Suspense fallback={<LoadingPage />}><DepartmentManagersPage /></Suspense> },

      { path: '/app/organization/teams', element: <Suspense fallback={<LoadingPage />}><TeamListPage /></Suspense> },
      { path: '/app/organization/teams/list', element: <Suspense fallback={<LoadingPage />}><TeamListPage /></Suspense> },
      { path: '/app/organization/teams/my', element: <Suspense fallback={<LoadingPage />}><MyTeamsPage /></Suspense> },
      { path: '/app/organization/teams/members', element: <Suspense fallback={<LoadingPage />}><TeamMembersPage /></Suspense> },

      // 4. System Administration (Quản trị hệ thống)
      { path: '/admin/users', element: <Suspense fallback={<LoadingPage />}><UserManagementPage /></Suspense> },
      { path: '/admin/modules', element: <Suspense fallback={<LoadingPage />}><ModulePermissionsPage /></Suspense> },
      { path: '/admin/roles', element: <Suspense fallback={<LoadingPage />}><RoleListPage /></Suspense> },
      { path: '/admin/roles/groups', element: <Suspense fallback={<LoadingPage />}><RoleListPage /></Suspense> },
      { path: '/admin/roles/permissions', element: <Suspense fallback={<LoadingPage />}><PermissionListPage /></Suspense> },
      { path: '/admin/roles/matrix', element: <Suspense fallback={<LoadingPage />}><PermissionMatrixPage /></Suspense> },
      { path: '/admin/catalog', element: <Suspense fallback={<LoadingPage />}><CatalogPage /></Suspense> },

      // 4. System Administration - Cấu hình quy trình (Từng trang riêng biệt)
      { path: '/admin/workflows', element: <Suspense fallback={<LoadingPage />}><WorkflowListPage /></Suspense> },
      { path: '/admin/workflows/list', element: <Suspense fallback={<LoadingPage />}><WorkflowListPage /></Suspense> },
      { path: '/admin/workflows/statuses', element: <Suspense fallback={<LoadingPage />}><WorkflowStatusesPage /></Suspense> },
      { path: '/admin/workflows/rules', element: <Suspense fallback={<LoadingPage />}><WorkflowRulesPage /></Suspense> },
      { path: '/admin/workflows/templates', element: <Suspense fallback={<LoadingPage />}><WorkflowTemplatesPage /></Suspense> },
      { path: '/admin/workflows/automation', element: <Suspense fallback={<LoadingPage />}><WorkflowAutomationPage /></Suspense> },

      // Cấu hình tổ chức (Từng trang riêng biệt)
      { path: '/admin/settings/org', element: <Suspense fallback={<LoadingPage />}><CompanyInfoPage /></Suspense> },
      { path: '/admin/config/company', element: <Suspense fallback={<LoadingPage />}><CompanyInfoPage /></Suspense> },
      { path: '/admin/config/projects', element: <Suspense fallback={<LoadingPage />}><ProjectConfigPage /></Suspense> },
      { path: '/admin/config/notifications', element: <Suspense fallback={<LoadingPage />}><NotificationConfigPage /></Suspense> },
      { path: '/admin/config/integrations', element: <Suspense fallback={<LoadingPage />}><IntegrationConfigPage /></Suspense> },
      { path: '/admin/config/data-policy', element: <Suspense fallback={<LoadingPage />}><DataPolicyPage /></Suspense> },
      { path: '/admin/config/task-columns', element: <Suspense fallback={<LoadingPage />}><TaskColumnsConfigPage /></Suspense> },
      { path: '/admin/config/columns', element: <Navigate to="/admin/config/task-columns" replace /> },

      // Nhật ký & Giám sát (Từng trang riêng biệt)
      { path: '/admin/audit-logs', element: <Suspense fallback={<LoadingPage />}><ActivityLogPage /></Suspense> },
      { path: '/admin/audit/activity', element: <Suspense fallback={<LoadingPage />}><ActivityLogPage /></Suspense> },
      { path: '/admin/audit/logins', element: <Suspense fallback={<LoadingPage />}><LoginHistoryPage /></Suspense> },
      { path: '/admin/audit/tasks', element: <Suspense fallback={<LoadingPage />}><BackgroundTasksPage /></Suspense> },
      { path: '/admin/audit/monitoring', element: <Suspense fallback={<LoadingPage />}><SystemMonitoringPage /></Suspense> },

      // 5. User Settings & Notifications
      { path: '/app/settings', element: <Suspense fallback={<LoadingPage />}><SettingsPage /></Suspense> },
      { path: '/app/settings/security', element: <Suspense fallback={<LoadingPage />}><SettingsPage /></Suspense> },
      { path: '/app/settings/notifications', element: <Suspense fallback={<LoadingPage />}><SettingsPage /></Suspense> },
      { path: '/app/settings/appearance', element: <Suspense fallback={<LoadingPage />}><SettingsPage /></Suspense> },
      { path: '/admin/settings', element: <Navigate to="/app/settings" replace /> },
      { path: '/notifications', element: <Suspense fallback={<LoadingPage />}><NotificationsPage /></Suspense> },
      { path: '/notifications/unread', element: <Suspense fallback={<LoadingPage />}><NotificationsPage /></Suspense> },

      // Legacy Route Redirects
      { path: '/manage', element: <Navigate to="/app/tasks" replace /> },
      { path: '/manage/*', element: <Navigate to="/app/tasks" replace /> },
      { path: '/app/learning', element: <Navigate to="/app/tasks" replace /> },
      { path: '/app/exams', element: <Navigate to="/app/tasks" replace /> },

      // 404 Catch-all inside Workspace
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // Fallback Catch-all
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
