import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../services/taskService';
import { useAuth } from '../../../shared/hooks/useAuth';
import TaskDetailModal from '../components/TaskDetailModal';
import TaskGanttTimelineView from '../components/TaskGanttTimelineView';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Filter,
  Layers,
  CalendarDays,
  Table as TableIcon,
  CalendarRange,
  ListOrdered,
  ZoomIn,
  Building2,
  Check,
  GanttChart,
} from 'lucide-react';

const WEEKDAYS = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

const WEEKDAYS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

const PRIORITY_LABELS = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const STATUS_LABELS = {
  backlog: 'Backlog (Mới)',
  todo: 'To Do (Đã giao)',
  in_progress: 'In Progress (Đang làm)',
  in_review: 'In Review (Chờ duyệt)',
  done: 'Đã hoàn tất',
  completed: 'Đã hoàn tất',
  cancelled: 'Đã hủy',
};

export default function TaskCalendarPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter'); // 'my' hoặc null
  const urlView = searchParams.get('view'); // 'timeline' hoặc null

  // Chế độ xem: 'month' (Tháng) | 'week' (Tuần) | 'day' (Ngày) | 'timeline' (Gantt) | 'agenda' (Lịch trình) | 'table' (Bảng)
  const [calendarView, setCalendarView] = useState(() => (urlView === 'timeline' ? 'timeline' : 'month'));

  useEffect(() => {
    if (urlView === 'timeline' && calendarView !== 'timeline') {
      setCalendarView('timeline');
    }
  }, [urlView]);

  const handleViewChange = (newView) => {
    setCalendarView(newView);
    const next = new URLSearchParams(searchParams);
    if (newView === 'timeline') {
      next.set('view', 'timeline');
    } else {
      next.delete('view');
    }
    setSearchParams(next, { replace: true });
  };

  // Ngày neo hiện tại (Anchor date)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Đồng hồ thời gian thực (Real-time clock for current time red line)
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Xác định thẩm quyền phân quyền người dùng
  const userRole = currentUser?.role || '';
  const isGlobalManager =
    userRole === 'admin' ||
    userRole === 'director' ||
    userRole === 'manager' ||
    userRole === 'giam_doc' ||
    currentUser?.isSuperAdmin;

  const userDepartment = currentUser?.department || 'Sản xuất';

  // Dữ liệu tasks và projects
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '');
  const [departmentFilter, setDepartmentFilter] = useState(() => {
    if (urlFilter === 'my') return '';
    return isGlobalManager ? (searchParams.get('dept') || '') : userDepartment;
  });

  // Chi tiết công việc
  const [detailModalTaskId, setDetailModalTaskId] = useState(null);

  // Ref cuộn trục thời gian cho Week và Day view
  const timeGridRef = useRef(null);

  // Load danh sách tasks và projects
  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        taskService.listTasks(),
        taskService.listProjects().catch(() => []),
      ]);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setProjects(Array.isArray(projectsRes) ? projectsRes : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map dự án theo IdSeq hoặc Code
  const projectMap = useMemo(() => {
    const map = {};
    (projects || []).forEach((p) => {
      if (p.id) map[p.id] = p;
      if (p.code) map[p.code] = p;
    });
    return map;
  }, [projects]);

  // Tự động cuộn tới 08:00 sáng khi chuyển sang chế độ xem Tuần hoặc Ngày
  useEffect(() => {
    if (calendarView === 'week' || calendarView === 'day') {
      const timer = setTimeout(() => {
        if (timeGridRef.current) {
          timeGridRef.current.scrollTop = 416;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [calendarView]);

  const todayStr = nowTime.toISOString().slice(0, 10);

  // Chuẩn hóa và làm giàu dữ liệu tasks với thông tin dự án
  const enrichedTasks = useMemo(() => {
    return tasks.map((t) => {
      let isOverdue = false;
      let isToday = false;
      let dateStr = '';
      let hour = 9;

      if (t.dueDate) {
        const d = new Date(t.dueDate);
        dateStr = d.toISOString().slice(0, 10);
        if (!isNaN(d.getHours()) && d.getHours() > 0) {
          hour = d.getHours();
        }
        if (t.status !== 'done' && t.status !== 'completed' && d < nowTime) {
          isOverdue = true;
        }
        if (dateStr === todayStr) {
          isToday = true;
        }
      }

      // Gắn thông tin Dự án
      const prj = projectMap[t.projectId] || projectMap[t.projectCode];
      const projectName = t.projectName || prj?.name || '';
      const projectCode = t.projectCode || prj?.code || '';

      return {
        ...t,
        dateStr,
        hour,
        isOverdue,
        isToday,
        projectName,
        projectCode,
      };
    });
  }, [tasks, todayStr, nowTime, projectMap]);

  // Lọc dữ liệu theo phân quyền phòng ban, dự án, trạng thái, ưu tiên và từ khóa
  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter((t) => {
      // 1. Phân quyền và Lọc cá nhân
      if (urlFilter === 'my') {
        const myName = (currentUser?.name || currentUser?.username || '').toLowerCase();
        const match =
          (t.assigneeName || '').toLowerCase().includes(myName) ||
          (t.supervisorName || '').toLowerCase().includes(myName) ||
          (t.assigneeName || '').toLowerCase().includes('user 01');
        if (!isGlobalManager && !match) return false;
      } else {
        // Lịch toàn tổng dự án theo phân quyền phòng ban:
        // Nếu không phải Ban Giám Đốc/Admin, chỉ xem được công việc của phòng ban mình
        if (!isGlobalManager) {
          if (t.department && t.department.toLowerCase() !== userDepartment.toLowerCase()) {
            return false;
          }
        } else if (departmentFilter) {
          if (t.department && t.department.toLowerCase() !== departmentFilter.toLowerCase()) {
            return false;
          }
        }
      }

      // 2. Lọc theo Dự án được chọn
      if (projectFilter) {
        const pVal = projectFilter.toLowerCase();
        const matchPrj =
          String(t.projectId || '').toLowerCase() === pVal ||
          String(t.projectCode || '').toLowerCase() === pVal ||
          (t.projectName && t.projectName.toLowerCase().includes(pVal));
        if (!matchPrj) return false;
      }

      // 3. Lọc trạng thái
      if (statusFilter === 'overdue' && !t.isOverdue) return false;
      if (statusFilter === 'today' && !t.isToday) return false;
      if (statusFilter === 'in_progress' && t.status !== 'in_progress') return false;
      if (statusFilter === 'done' && t.status !== 'done' && t.status !== 'completed') return false;

      // 4. Lọc mức ưu tiên
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      // 5. Tìm kiếm từ khóa
      if (search) {
        const q = search.toLowerCase();
        const match =
          (t.title || '').toLowerCase().includes(q) ||
          (t.code || '').toLowerCase().includes(q) ||
          (t.assigneeName || '').toLowerCase().includes(q) ||
          (t.department || '').toLowerCase().includes(q) ||
          (t.projectName || '').toLowerCase().includes(q) ||
          (t.projectCode || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    enrichedTasks,
    urlFilter,
    isGlobalManager,
    userDepartment,
    departmentFilter,
    projectFilter,
    statusFilter,
    priorityFilter,
    search,
    currentUser,
  ]);

  // Nhóm tasks theo ngày (Map YYYY-MM-DD -> Array of tasks)
  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach((t) => {
      if (!t.dateStr) return;
      if (!map[t.dateStr]) map[t.dateStr] = [];
      map[t.dateStr].push(t);
    });
    return map;
  }, [filteredTasks]);

  // Điều hướng lịch
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (calendarView === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (calendarView === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (calendarView === 'day') {
      next.setDate(next.getDate() - 1);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (calendarView === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (calendarView === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (calendarView === 'day') {
      next.setDate(next.getDate() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Tiêu đề ngày tháng theo chuẩn Google Calendar
  const calendarTitle = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    if (calendarView === 'month') {
      return `Tháng ${month} năm ${year}`;
    }
    if (calendarView === 'week') {
      const d = new Date(currentDate);
      let dayOfWeek = d.getDay() - 1;
      if (dayOfWeek === -1) dayOfWeek = 6;
      const start = new Date(d);
      start.setDate(d.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startMonth = start.getMonth() + 1;
      const endMonth = end.getMonth() + 1;
      if (startMonth === endMonth) {
        return `${start.getDate()} – ${end.getDate()} tháng ${startMonth}, ${year}`;
      }
      return `${start.getDate()} thg ${startMonth} – ${end.getDate()} thg ${endMonth}, ${year}`;
    }
    if (calendarView === 'day') {
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = dayNames[currentDate.getDay()];
      return `${dayName}, ngày ${currentDate.getDate()} tháng ${month}, ${year}`;
    }
    if (calendarView === 'timeline') {
      const prj = projects.find((p) => p.id === projectFilter || p.code === projectFilter);
      return prj ? `Tiến độ Gantt: [${prj.code}] ${prj.name}` : `Tiến độ Gantt dự án – Tháng ${month}/${year}`;
    }
    return `Lịch trình công việc – Tháng ${month}, ${year}`;
  }, [currentDate, calendarView, projects, projectFilter]);

  // Tính toán ma trận các ngày trong tháng (Month Matrix)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    let dayOfWeek = firstDay.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6; // T2: 0 ... CN: 6

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Tháng trước
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, d);
      days.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: false,
        dateString: dateObj.toISOString().slice(0, 10),
      });
    }

    // Tháng này
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      days.push({
        date: dateObj,
        dayNumber: i,
        isCurrentMonth: true,
        dateString: dateObj.toISOString().slice(0, 10),
      });
    }

    // Tháng sau
    const targetCount = days.length <= 35 ? 35 : 42;
    const needNext = targetCount - days.length;
    for (let i = 1; i <= needNext; i++) {
      const dateObj = new Date(year, month + 1, i);
      days.push({
        date: dateObj,
        dayNumber: i,
        isCurrentMonth: false,
        dateString: dateObj.toISOString().slice(0, 10),
      });
    }

    return days;
  }, [currentDate]);

  // Tính toán 7 ngày trong tuần (Week Days)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    let dayOfWeek = d.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayOfWeek);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push({
        date: day,
        dayNumber: day.getDate(),
        dateString: day.toISOString().slice(0, 10),
        dayName: WEEKDAYS[i],
        dayShort: WEEKDAYS_SHORT[i],
      });
    }
    return week;
  }, [currentDate]);

  // Vị trí vạch chỉ thời gian hiện tại (Current time red line: 52px / 1 giờ)
  const currentTimeTop = (nowTime.getHours() + nowTime.getMinutes() / 60) * 52;

  // Điều hướng sang trang Tạo công việc Full Layout với ngày được chọn
  const handleOpenCreateWithDate = (dateStr) => {
    const targetDate = dateStr || todayStr;
    const isMy = urlFilter === 'my';
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    if (isMy) {
      navigate(`/app/tasks/my/new?dueDate=${encodeURIComponent(targetDate)}`);
    } else {
      navigate(`/app/tasks/new?dueDate=${encodeURIComponent(targetDate)}&returnUrl=${returnUrl}`);
    }
  };

  // Màu sắc Event Chip
  const getTaskChipStyle = (task) => {
    const isDone = task.status === 'done' || task.status === 'completed';
    if (isDone) {
      return 'bg-emerald-50 text-emerald-800 border-l-3 border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500 line-through opacity-85';
    }
    if (task.isOverdue) {
      return 'bg-rose-50 text-rose-800 border-l-3 border-rose-600 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-500 font-medium';
    }
    if (task.priority === 'urgent') {
      return 'bg-rose-50 text-rose-800 border-l-3 border-rose-500 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-400 font-medium';
    }
    if (task.priority === 'high') {
      return 'bg-amber-50 text-amber-900 border-l-3 border-amber-500 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-400';
    }
    if (task.status === 'in_progress') {
      return 'bg-blue-50 text-blue-900 border-l-3 border-blue-500 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-400';
    }
    return 'bg-slate-100 text-slate-800 border-l-3 border-slate-400 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-500';
  };

  return (
    <ManagementFrame
      header={
        <div className="flex items-center justify-between gap-4 w-full flex-wrap py-1">
          {/* Cụm trái: Tiêu đề nghiệp vụ & Thông tin phân quyền */}
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {urlFilter === 'my'
                    ? 'Lịch làm việc của tôi'
                    : 'Lịch tiến độ toàn tổng Dự án & Kế hoạch'}
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800">
                  {urlFilter === 'my'
                    ? 'Cá nhân'
                    : isGlobalManager
                    ? (departmentFilter || 'Toàn nhà máy')
                    : `${userDepartment} (Phân quyền)`}
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                  {filteredTasks.length} công việc
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                {urlFilter === 'my'
                  ? 'Theo dõi tiến độ và hạn chót các công việc được phân công cho bạn'
                  : 'Theo dõi tiến độ tổng thể, hạn chót và phân bổ công việc theo khối/phòng ban được phân quyền'}
              </p>
            </div>
          </div>

          {/* Cụm phải: Điều hướng thời gian + View Modes + Action */}
          <div className="management-actions flex items-center gap-2 shrink-0 flex-wrap">
            {/* Bộ điều hướng thời gian */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Hôm nay
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Trước"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-xs text-slate-900 dark:text-white px-2 min-w-[150px] text-center">
                {calendarTitle}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* View Mode Segmented Control */}
            <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-medium">
              {[
                { id: 'month', label: 'Tháng', icon: CalendarDays },
                { id: 'week', label: 'Tuần', icon: CalendarRange },
                { id: 'day', label: 'Ngày', icon: Clock },
                { id: 'timeline', label: 'Gantt', icon: GanttChart },
                { id: 'agenda', label: 'Lịch trình', icon: ListOrdered },
                { id: 'table', label: 'Bảng', icon: TableIcon },
              ].map((m) => {
                const Icon = m.icon;
                const active = calendarView === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleViewChange(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon size={12} />
                    <span className="hidden md:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={loadData}
              title="Làm mới dữ liệu"
            />

            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => handleOpenCreateWithDate(todayStr)}
            >
              Tạo việc
            </Button>
          </div>
        </div>
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-56 max-w-full">
            <SearchInput
              size="sm"
              value={searchDraft}
              onChange={(e) => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
              onClear={() => {
                setSearchDraft('');
                setSearch('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setSearch(searchDraft.trim());
                }
              }}
              placeholder="Tìm mã CV, tên việc, người làm..."
            />
          </div>

          <button
            type="button"
            onClick={() => setSearch(searchDraft.trim())}
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
            title="Tìm kiếm"
          >
            <Search size={14} />
          </button>

          {/* Lọc Dự án / Kế hoạch */}
          <Select
            size="sm"
            className="w-52 font-medium text-xs"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e?.target?.value ?? e)}
            options={[
              { value: '', label: 'Tất cả dự án & kế hoạch' },
              ...(projects || []).map((p) => ({
                value: p.id || p.code,
                label: `[${p.code}] ${p.name}`,
              })),
            ]}
          />

          {/* Lọc Khối / Phòng ban theo thẩm quyền phân quyền */}
          {urlFilter !== 'my' && (
            <Select
              size="sm"
              className="w-48 font-medium text-xs"
              value={departmentFilter}
              disabled={!isGlobalManager}
              onChange={(e) => setDepartmentFilter(e?.target?.value ?? e)}
              options={
                isGlobalManager
                  ? [
                      { value: '', label: 'Toàn nhà máy (Tất cả PB)' },
                      { value: 'Phòng ban Quản trị ERP & CNTT', label: 'Phòng Quản trị ERP & CNTT' },
                      { value: 'Sản xuất', label: 'Khối Sản xuất' },
                      { value: 'Kỹ thuật & Bảo trì', label: 'Khối Kỹ thuật & Bảo trì' },
                      { value: 'Quản lý chất lượng (QA/QC)', label: 'Phòng Quản lý chất lượng' },
                      { value: 'Công nghệ thông tin', label: 'Phòng CNTT & MES' },
                      { value: 'R&D & Thiết kế Bao bì', label: 'Phòng R&D Bao bì' },
                      { value: 'Kho vận & Chuỗi cung ứng', label: 'Kho vận & Cung ứng' },
                    ]
                  : [
                      {
                        value: userDepartment,
                        label: `Phòng: ${userDepartment} (Phân quyền)`,
                      },
                    ]
              }
            />
          )}

          {/* Lọc Trạng thái */}
          <Select
            size="sm"
            className="w-40 font-medium text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e?.target?.value ?? e)}
            options={[
              { value: 'all', label: `Tất cả trạng thái (${enrichedTasks.length})` },
              { value: 'overdue', label: `Quá hạn (${enrichedTasks.filter((t) => t.isOverdue).length})` },
              { value: 'today', label: `Hạn hôm nay (${enrichedTasks.filter((t) => t.isToday).length})` },
              { value: 'in_progress', label: 'Đang làm' },
              { value: 'done', label: 'Đã hoàn tất' },
            ]}
          />

          {/* Lọc Mức ưu tiên */}
          <Select
            size="sm"
            className="w-36 font-medium text-xs"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e?.target?.value ?? e)}
            options={[
              { value: 'all', label: 'Tất cả mức ưu tiên' },
              { value: 'urgent', label: 'Khẩn cấp' },
              { value: 'high', label: 'Cao' },
              { value: 'medium', label: 'Trung bình' },
              { value: 'low', label: 'Thấp' },
            ]}
          />

          {(search ||
            projectFilter ||
            (isGlobalManager && departmentFilter) ||
            statusFilter !== 'all' ||
            priorityFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchDraft('');
                setSearch('');
                setProjectFilter('');
                if (isGlobalManager) setDepartmentFilter('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
              title="Xóa bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}

          {/* Legend Màu sắc */}
          <div className="ml-auto hidden xl:flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Quá hạn
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ưu tiên cao
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Đang làm
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Hoàn thành
            </span>
          </div>
        </div>
      }
      status={
        <TableStatusFooter
          title={
            urlFilter === 'my'
              ? `Lịch cá nhân: ${currentUser?.name || currentUser?.username || 'Của tôi'}`
              : `Lịch tiến độ: ${
                  isGlobalManager
                    ? (departmentFilter || 'Toàn nhà máy')
                    : `${userDepartment} (Phân quyền)`
                }`
          }
          totalCount={filteredTasks.length}
          unit="công việc trên lịch"
        />
      }
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. MONTH VIEW (LỊCH THÁNG FULL 100% LAYOUT)                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {calendarView === 'month' && (
        <div className="flex flex-col h-full w-full min-h-0 bg-white dark:bg-slate-950 overflow-hidden select-none">
          {/* Header 7 ngày */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 text-xs font-semibold text-center shrink-0">
            {WEEKDAYS.map((day, idx) => (
              <div key={day} className="py-2.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
                <span className="hidden md:inline">{day}</span>
                <span className="md:hidden">{WEEKDAYS_SHORT[idx]}</span>
              </div>
            ))}
          </div>

          {/* Lưới 7 cột x 5-6 hàng Full Layout */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-5 divide-x divide-y divide-slate-200/80 dark:divide-slate-800/80 overflow-y-auto">
            {monthDays.map((dObj, idx) => {
              const dayTasks = tasksByDate[dObj.dateString] || [];
              const isToday = dObj.dateString === todayStr;
              const maxDisplay = 3;
              const hasMore = dayTasks.length > maxDisplay;

              return (
                <div
                  key={`${dObj.dateString}-${idx}`}
                  onClick={() => handleOpenCreateWithDate(dObj.dateString)}
                  className={`group relative flex flex-col p-1.5 min-h-[95px] transition-colors cursor-pointer overflow-hidden ${
                    dObj.isCurrentMonth
                      ? 'bg-white dark:bg-slate-950 hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                      : 'bg-slate-50/40 dark:bg-slate-900/20 text-slate-400 dark:text-slate-600'
                  } ${isToday ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold inline-flex items-center justify-center ${
                        isToday
                          ? 'w-6 h-6 rounded-full bg-emerald-600 text-white font-bold shadow-2xs'
                          : dObj.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200 pl-1'
                          : 'text-slate-400 dark:text-slate-600 pl-1'
                      }`}
                    >
                      {dObj.dayNumber}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateWithDate(dObj.dateString);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 transition cursor-pointer"
                      title="Thêm công việc vào ngày này"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-0.5">
                    {dayTasks.slice(0, maxDisplay).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailModalTaskId(task.id);
                        }}
                        className={`px-2 py-1 rounded text-[11px] leading-tight truncate shadow-2xs hover:shadow-xs transition cursor-pointer flex items-center justify-between gap-1 ${getTaskChipStyle(
                          task
                        )}`}
                        title={`[${task.code || 'CV'}] ${task.projectCode ? `(${task.projectCode}) ` : ''}${task.title} - ${task.assigneeName || 'Chưa giao'}`}
                      >
                        <span className="truncate flex-1 font-medium">
                          {task.projectCode ? (
                            <span className="font-mono font-bold mr-1 opacity-85">[{task.projectCode}]</span>
                          ) : task.code ? (
                            <span className="font-mono font-bold mr-1 opacity-85">{task.code}</span>
                          ) : null}
                          {task.title}
                        </span>
                        {task.progress !== undefined && task.progress > 0 && (
                          <span className="text-[10px] opacity-75 font-mono shrink-0">
                            {task.progress}%
                          </span>
                        )}
                      </div>
                    ))}

                    {hasMore && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Click +X việc sẽ mở ngày đó
                          setCurrentDate(new Date(dObj.dateString));
                          setCalendarView('day');
                        }}
                        className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline text-left pt-0.5 px-1 cursor-pointer"
                      >
                        + {dayTasks.length - maxDisplay} việc khác →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. WEEK VIEW (LƯỚI THỜI GIAN 24 GIỜ CHUẨN GOOGLE CALENDAR)   */}
      {/* ──────────────────────────────────────────────────────────── */}
      {calendarView === 'week' && (
        <div className="flex flex-col h-full w-full min-h-0 bg-white dark:bg-slate-950 overflow-hidden select-none">
          {/* Header 7 cột ngày cố định trên đỉnh */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs shrink-0">
            {/* Cột trống trục thời gian */}
            <div className="w-16 shrink-0 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center font-mono text-[10px] text-slate-400">
              GMT+7
            </div>

            {/* 7 cột ngày */}
            <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800">
              {weekDays.map((d) => {
                const isToday = d.dateString === todayStr;
                return (
                  <div
                    key={d.dateString}
                    className={`py-2 text-center flex flex-col items-center justify-center gap-0.5 ${
                      isToday ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {d.dayName}
                    </span>
                    <span
                      className={`text-base font-bold inline-flex items-center justify-center ${
                        isToday
                          ? 'w-7 h-7 rounded-full bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {d.dayNumber}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hàng Cả ngày / Deadline (All-Day Row) */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs shrink-0 max-h-24 overflow-y-auto">
            <div className="w-16 shrink-0 border-r border-slate-200 dark:border-slate-800 p-2 text-[10.5px] font-semibold text-slate-400 flex items-center justify-center">
              Hạn chót
            </div>
            <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800 p-1">
              {weekDays.map((d) => {
                const dayTasks = tasksByDate[d.dateString] || [];
                return (
                  <div key={d.dateString} className="space-y-1 px-1">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setDetailModalTaskId(task.id)}
                        className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium truncate cursor-pointer shadow-2xs ${getTaskChipStyle(
                          task
                        )}`}
                        title={task.title}
                      >
                        {task.code ? `${task.code} ` : ''}{task.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vùng cuộn trục thời gian 24 giờ */}
          <div
            ref={timeGridRef}
            className="flex-1 overflow-y-auto overflow-x-hidden relative flex"
          >
            {/* Cột trục giờ (00:00 - 23:00) */}
            <div className="w-16 shrink-0 border-r border-slate-200 dark:border-slate-800 select-none bg-slate-50/30 dark:bg-slate-900/20">
              {HOURS_24.map((hour) => (
                <div
                  key={hour}
                  className="h-[52px] border-b border-slate-100 dark:border-slate-800/80 pr-2 pt-1 text-right text-[11px] font-mono text-slate-400"
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Lưới 7 cột ngày với các rãnh giờ */}
            <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800 relative">
              {/* Vạch đỏ chỉ giờ thực tế (Current Time Red Line) */}
              <div
                style={{ top: `${currentTimeTop}px` }}
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-2xs" />
                <div className="flex-1 border-t-2 border-red-500" />
              </div>

              {weekDays.map((d) => {
                const dayTasks = tasksByDate[d.dateString] || [];
                return (
                  <div key={d.dateString} className="relative">
                    {/* 24 rãnh giờ để click tạo việc */}
                    {HOURS_24.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => handleOpenCreateWithDate(d.dateString)}
                        className="h-[52px] border-b border-slate-100 dark:border-slate-800/80 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-colors cursor-pointer"
                      />
                    ))}

                    {/* Định vị các task vào khung giờ */}
                    {dayTasks.map((task) => {
                      const top = (task.hour || 9) * 52 + 2;
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModalTaskId(task.id);
                          }}
                          style={{ top: `${top}px` }}
                          className={`absolute left-1 right-1 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition z-10 cursor-pointer ${getTaskChipStyle(
                            task
                          )}`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold">
                              {task.projectCode ? `[${task.projectCode}] ` : ''}{task.code || 'CV'}
                            </span>
                            <span className="font-semibold">{PRIORITY_LABELS[task.priority] || task.priority}</span>
                          </div>
                          <h4 className="text-xs font-semibold line-clamp-2 leading-snug">
                            {task.title}
                          </h4>
                          {task.projectName && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium">
                              {task.projectName}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                            <span className="truncate max-w-[90px]">{task.assigneeName || 'Chưa giao'}</span>
                            <span className="font-bold text-emerald-600">{task.progress ?? 0}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. DAY VIEW (LƯỚI THỜI GIAN 1 NGÀY CHUẨN GOOGLE CALENDAR)    */}
      {/* ──────────────────────────────────────────────────────────── */}
      {calendarView === 'day' && (
        <div className="flex flex-col h-full w-full min-h-0 bg-white dark:bg-slate-950 overflow-hidden select-none">
          {/* Header ngày chi tiết */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                {currentDate.getDate()}
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {calendarTitle}
                </h3>
                <span className="text-xs text-slate-500">
                  Có {tasksByDate[currentDate.toISOString().slice(0, 10)]?.length || 0} công việc trong ngày
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenCreateWithDate(currentDate.toISOString().slice(0, 10))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus size={14} /> Thêm việc ngày này
            </button>
          </div>

          {/* Trục thời gian 24 giờ của 1 ngày (Full 100% width) */}
          <div
            ref={timeGridRef}
            className="flex-1 overflow-y-auto relative flex w-full"
          >
            {/* Cột trục giờ */}
            <div className="w-20 shrink-0 border-r border-slate-200 dark:border-slate-800 select-none bg-slate-50/40 dark:bg-slate-900/30">
              {HOURS_24.map((hour) => (
                <div
                  key={hour}
                  className="h-[52px] border-b border-slate-100 dark:border-slate-800/80 pr-3 pt-1 text-right text-xs font-mono text-slate-400"
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Vùng lưới nội dung ngày */}
            <div className="flex-1 relative">
              {/* Vạch đỏ thời gian thực */}
              <div
                style={{ top: `${currentTimeTop}px` }}
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-2xs" />
                <div className="flex-1 border-t-2 border-red-500" />
              </div>

              {/* 24 rãnh giờ */}
              {HOURS_24.map((hour) => (
                <div
                  key={hour}
                  onClick={() => handleOpenCreateWithDate(currentDate.toISOString().slice(0, 10))}
                  className="h-[52px] border-b border-slate-100 dark:border-slate-800/80 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-colors cursor-pointer"
                />
              ))}

              {/* Các thẻ công việc trong ngày */}
              {(tasksByDate[currentDate.toISOString().slice(0, 10)] || []).map((task, idx) => {
                const top = (task.hour || 9) * 52 + 2;
                return (
                  <div
                    key={task.id}
                    onClick={() => setDetailModalTaskId(task.id)}
                    style={{ top: `${top}px`, left: '16px', right: '16px' }}
                    className={`absolute p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition z-10 cursor-pointer flex items-center justify-between gap-4 ${getTaskChipStyle(
                      task
                    )}`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {task.code || 'CV'}
                        </span>
                        {task.projectName && (
                          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            {task.projectCode ? `[${task.projectCode}] ` : ''}{task.projectName}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">{task.department}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/60 dark:bg-slate-900/60">
                          {STATUS_LABELS[task.status] || task.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold">{task.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Phụ trách: <strong>{task.assigneeName || 'Chưa giao'}</strong></span>
                        <span>Ưu tiên: <strong>{PRIORITY_LABELS[task.priority] || task.priority}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold font-mono text-emerald-600">{task.progress ?? 0}%</span>
                      <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-emerald-500" style={{ width: `${task.progress ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. AGENDA VIEW (LỊCH TRÌNH FULL 100% WIDTH TABLE LAYOUT)     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {calendarView === 'agenda' && (
        <div className="flex-1 w-full h-full overflow-y-auto bg-white dark:bg-slate-950 p-4 sm:p-6 space-y-6">
          {Object.keys(tasksByDate).sort().length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 space-y-2">
              <CalendarIcon size={40} className="text-slate-300 dark:text-slate-600 mb-1" />
              <p className="text-sm font-semibold">Không có lịch trình công việc</p>
              <p className="text-xs text-slate-400">Không có công việc nào phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            Object.keys(tasksByDate).sort().map((dStr) => {
              const dTasks = tasksByDate[dStr] || [];
              const dateObj = new Date(dStr);
              const isToday = dStr === todayStr;

              return (
                <div
                  key={dStr}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden w-full"
                >
                  {/* Header ngày trong Lịch trình */}
                  <div
                    className={`px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 ${
                      isToday
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                          isToday
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {dateObj.toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                      {isToday && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          (Hôm nay)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {dTasks.length} nhiệm vụ
                    </span>
                  </div>

                  {/* Bảng danh sách công việc của ngày */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {dTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setDetailModalTaskId(task.id)}
                        className="p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-850 transition cursor-pointer flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                            {task.code || 'CV'}
                          </span>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              {task.projectName && (
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {task.projectCode ? `[${task.projectCode}] ` : ''}{task.projectName} ·
                                </span>
                              )}
                              <span>
                                Phòng ban: <strong>{task.department || 'Kỹ thuật'}</strong>
                              </span>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded text-[11px] font-semibold shrink-0 ${getTaskChipStyle(task)}`}>
                            {STATUS_LABELS[task.status] || task.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 text-slate-500">
                          <div className="hidden sm:block text-right">
                            <span className="text-[11px] text-slate-400 block">Người thực hiện</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {task.assigneeName || 'Chưa giao'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold font-mono text-emerald-600 block">
                              {task.progress ?? 0}%
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {PRIORITY_LABELS[task.priority] || task.priority}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailModalTaskId(task.id);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                            title="Mở chi tiết công việc"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. GANTT TIMELINE VIEW (DÒNG THỜI GIAN GANTT TIẾN ĐỘ DỰ ÁN)  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {calendarView === 'timeline' && (
        <TaskGanttTimelineView
          tasks={filteredTasks}
          projects={projects}
          selectedProjectId={projectFilter}
          onSelectProject={(pId) => {
            setProjectFilter(pId);
            const next = new URLSearchParams(searchParams);
            if (pId) next.set('projectId', pId);
            else next.delete('projectId');
            setSearchParams(next, { replace: true });
          }}
          onOpenTask={(taskId) => setDetailModalTaskId(taskId)}
          currentDate={currentDate}
          onNavigateDate={setCurrentDate}
        />
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. TABLE VIEW (BẢNG QUẢN TRỊ VIRTUALDATATABLE FULL LAYOUT)   */}
      {/* ──────────────────────────────────────────────────────────── */}
      {calendarView === 'table' && (
        <VirtualDataTable
          columns={[
            { id: 'code', label: 'Mã CV', width: 115 },
            { id: 'title', label: 'Tên công việc / Hạng mục', width: 280 },
            { id: 'projectName', label: 'Thuộc Dự án / Kế hoạch', width: 220 },
            { id: 'dueDate', label: 'Hạn chót', width: 130 },
            { id: 'assigneeName', label: 'Người thực hiện', width: 160 },
            { id: 'department', label: 'Phòng ban', width: 160 },
            { id: 'priority', label: 'Mức ưu tiên', width: 120 },
            { id: 'status', label: 'Trạng thái', width: 140 },
            { id: 'progress', label: 'Tiến độ', width: 110 },
          ]}
          rows={filteredTasks}
          loading={loading}
          onOpen={(row) => setDetailModalTaskId(row.id)}
          preferenceKey="etpms-task-calendar-grid"
          renderCell={(col, row) => {
            if (col.id === 'projectName') {
              const prj = row.projectName || row.projectCode;
              return prj ? (
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate" title={row.projectName}>
                  {row.projectCode ? `[${row.projectCode}] ` : ''}{row.projectName || row.projectCode}
                </span>
              ) : (
                <span className="text-slate-400 text-xs italic">Việc độc lập</span>
              );
            }
            if (col.id === 'dueDate') {
              return row.dueDate ? new Date(row.dueDate).toLocaleDateString('vi-VN') : '—';
            }
            if (col.id === 'progress') {
              return <span className="font-mono font-bold text-emerald-600">{row.progress ?? 0}%</span>;
            }
            if (col.id === 'priority') {
              return PRIORITY_LABELS[row.priority] || row.priority;
            }
            if (col.id === 'status') {
              return STATUS_LABELS[row.status] || row.status;
            }
            return String(row[col.id] ?? '—');
          }}
          emptyMessage="Không có công việc nào trên lịch."
        />
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL CHI TIẾT CÔNG VIỆC CHUẨN HỆ THỐNG (SIZE XL TO RỘNG RÃI) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {detailModalTaskId && (
        <TaskDetailModal
          taskId={detailModalTaskId}
          open={Boolean(detailModalTaskId)}
          onClose={() => setDetailModalTaskId(null)}
          onTaskUpdated={loadData}
        />
      )}
    </ManagementFrame>
  );
}
