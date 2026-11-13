import ManagementFrame from '../../../shared/ui/ManagementFrame';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  FilePlus2,
  CalendarDays,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  TrendingUp,
  UserCheck,
  Layers,
  Send,
  Building2,
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import Tabs from '../../../shared/ui/Tabs';
import { taskService } from '../services/taskService';

export default function TaskDashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('enterprise');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  const dashboardTabs = [
    { id: 'personal', label: 'Tổng quan cá nhân' },
    { id: 'team', label: 'Tổng quan nhóm' },
    { id: 'enterprise', label: 'Tổng quan doanh nghiệp' },
  ];
  const [stats, setStats] = useState({
    totalTasks: 128,
    completedTasks: 72,
    inProgressTasks: 41,
    overdueTasks: 15,
    onTimeRate: 88.5,
    avgProgress: 68,
    departmentStats: [
      { department: 'Kỹ thuật', total: 42, completed: 26, inProgress: 12, overdue: 4 },
      { department: 'Kinh doanh', total: 32, completed: 18, inProgress: 10, overdue: 4 },
      { department: 'Marketing', total: 28, completed: 16, inProgress: 9, overdue: 3 },
      { department: 'Nhân sự', total: 26, completed: 12, inProgress: 10, overdue: 4 },
    ],
  });

  useEffect(() => {
    Promise.all([
      taskService.getTasks(),
      taskService.getProjects(),
      taskService.getStats(),
    ]).then(([tasksData, projectsData, statsData]) => {
      if (tasksData?.length) setTasks(tasksData);
      if (projectsData?.length) setProjects(projectsData);
      if (statsData) setStats(statsData);
    });
  }, []);

  const getActionCards = () => {
    const isSupervisorOrAdmin =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'reviewer' ||
      currentUser?.role === 'exam_mgr';

    if (isSupervisorOrAdmin) {
      return [
        {
          icon: UserCheck,
          label: 'Quy trình & Phê duyệt',
          path: '/app/tasks/supervisor',
        },
        {
          icon: FilePlus2,
          label: 'Phân công công việc mới',
          path: '/app/tasks/new',
        },
        {
          icon: ClipboardCheck,
          label: 'Bảng theo dõi Kanban',
          path: '/app/tasks',
        },
        {
          icon: Layers,
          label: 'Quản lý dự án & Milestones',
          path: '/app/tasks/projects',
        },
      ];
    }

    return [
      {
        icon: ClipboardCheck,
        label: 'Công việc của tôi',
        path: '/app/tasks',
      },
      {
        icon: Send,
        label: 'Gửi yêu cầu phê duyệt',
        path: '/app/tasks',
      },
      {
        icon: FilePlus2,
        label: 'Tạo công việc mới',
        path: '/app/tasks/new',
      },
      {
        icon: Layers,
        label: 'Kế hoạch & Dự án',
        path: '/app/tasks/projects',
      },
    ];
  };

  const urgentTasks = tasks.filter(
    (t) => t.status !== 'done' && t.status !== 'completed' && (t.priority === 'urgent' || t.priority === 'high' || t.status === 'in_review')
  );

  return (
    <ManagementFrame
      className="management-screen"
      header={<span className="management-tab-active">Tổng quan</span>}
      status={<strong>Hệ thống Quản lý công việc Doanh nghiệp (ETPMS)</strong>}
    >
      <div className="management-body-scroll">
        {/* Welcome Banner - Đúng chuẩn thiết kế của bạn */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Xin chào, {currentUser?.name || currentUser?.username}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {currentUser?.unit || 'Goldsun Packaging'} · {currentUser?.department || 'Khối Kỹ thuật & Sản xuất'}
            </p>
          </div>
          <Tabs
            tabs={dashboardTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Dashboard Mẫu Chỉ số KPI Chuẩn ETPMS */}
        <section>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '14px',
            }}
          >
            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--navy)', lineHeight: '1.2' }}>
                #{stats.totalTasks}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--navy-muted)', marginTop: '4px' }}>
                Tổng công việc
              </div>
            </Card>

            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-primary-600)', lineHeight: '1.2' }}>
                #{stats.completedTasks}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--navy-muted)', marginTop: '4px' }}>
                Hoàn thành
              </div>
            </Card>

            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', lineHeight: '1.2' }}>
                #{stats.inProgressTasks}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--navy-muted)', marginTop: '4px' }}>
                Đang thực hiện
              </div>
            </Card>

            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626', lineHeight: '1.2' }}>
                #{stats.overdueTasks}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--navy-muted)', marginTop: '4px' }}>
                Quá hạn
              </div>
            </Card>
          </div>
        </section>

        {/* Quick Start Actions */}
        <section>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: '700',
              marginBottom: '14px',
              color: 'var(--navy)',
            }}
          >
            Thao tác nhanh
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '14px',
            }}
          >
            {getActionCards().map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card
                  key={idx}
                  hoverable
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'var(--color-primary-50)',
                      color: 'var(--color-primary-600)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--navy)',
                      lineHeight: '1.4',
                    }}
                  >
                    {item.label}
                  </span>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Main Dashboard Grid: Việc cần làm & Tiến độ theo phòng ban */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: '20px',
          }}
        >
          {/* Việc cần làm & Chờ phê duyệt (To-Do List) */}
          <Card style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--color-primary-600)" />
                <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Việc cần làm & Chờ phê duyệt</h3>
              </div>
              <Badge variant="warning" size="sm">
                {urgentTasks.length} việc ưu tiên
              </Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {urgentTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'var(--surface-canvas)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ maxWidth: '65%' }}>
                    <strong
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: 'var(--navy)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.title}
                    </strong>
                    <span
                      style={{
                        fontSize: '11px',
                        color: task.status === 'in_review' ? '#7c3aed' : '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                      }}
                    >
                      {task.status === 'in_review' ? (
                        <>
                          <UserCheck size={12} /> Cấp trên đang kiểm tra duyệt · {task.progress}%
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} /> Hạn chót:{' '}
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'Trong tuần'} · {task.priority === 'urgent' ? 'Gấp' : 'Ưu tiên cao'}
                        </>
                      )}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={task.status === 'in_review' ? 'secondary' : 'primary'}
                    onClick={() =>
                      task.status === 'in_review'
                        ? navigate('/app/tasks/supervisor')
                        : navigate(`/app/tasks?taskId=${task.id}`)
                    }
                  >
                    {task.status === 'in_review' ? 'Kiểm tra' : 'Thực hiện'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Thống kê tiến độ theo Phòng ban (Department Breakdown) */}
          <Card style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="var(--color-primary-600)" />
                <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Tiến độ theo Phòng ban</h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--navy-muted)' }}>
                Tỷ lệ đúng hạn: <strong style={{ color: 'var(--color-primary-600)' }}>{stats.onTimeRate}%</strong>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(stats.departmentStats || []).map((dept, idx) => {
                const percent = dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--navy)' }}>
                        {dept.department}
                      </strong>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary-600)' }}>
                        {dept.completed}/{dept.total} việc ({percent}%)
                      </span>
                    </div>

                    <div
                      style={{
                        height: '6px',
                        background: 'var(--surface-subtle)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: 'var(--color-primary-600)',
                          borderRadius: '999px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--navy-muted)' }}>
                      <span>Đang làm: {dept.inProgress}</span>
                      <span style={{ color: dept.overdue > 0 ? '#dc2626' : 'var(--navy-muted)' }}>
                        Quá hạn: {dept.overdue}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Danh sách nhiệm vụ được phân công */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--navy)' }}>
              Nhiệm vụ được phân công & Theo dõi tiến độ
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/tasks')}
            >
              Tất cả công việc ({tasks.length}) →
            </Button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: '16px',
            }}
          >
            {tasks.slice(0, 4).map((task) => (
              <Card
                key={task.id}
                hoverable
                style={{ padding: '18px' }}
                onClick={() => navigate(`/app/tasks?taskId=${task.id}`)}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                  }}
                >
                  {task.status === 'done' || task.status === 'completed' ? (
                    <Badge variant="success" size="sm">
                      Hoàn thành
                    </Badge>
                  ) : task.status === 'in_review' ? (
                    <Badge variant="purple" size="sm">
                      Chờ kiểm tra
                    </Badge>
                  ) : task.status === 'in_progress' ? (
                    <Badge variant="info" size="sm">
                      Đang thực hiện ({task.progress}%)
                    </Badge>
                  ) : task.status === 'todo' ? (
                    <Badge variant="secondary" size="sm">
                      Đã lên kế hoạch
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Backlog
                    </Badge>
                  )}
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--navy-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Clock size={13} />{' '}
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </div>

                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--navy)',
                    marginBottom: '8px',
                  }}
                >
                  {task.title}
                </h4>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--navy-muted)',
                    lineHeight: '1.5',
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {task.description || 'Chưa có mô tả chi tiết.'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--line-subtle)',
                    paddingTop: '12px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--navy-muted)' }}>
                    {task.department} · <strong>{task.assigneeName}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={ArrowRight}
                    iconPosition="right"
                  >
                    Tiến độ & Chi tiết
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </ManagementFrame>
  );
}
