import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Download,
  Search,
  ExternalLink,
  TrendingUp,
  Layers,
  Building2,
  Users,
  Calendar,
  Filter,
  CheckSquare,
} from 'lucide-react';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../../tasks/services/taskService';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function SystemTaskReportsTab({ reportMode = 'system' }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filters
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(() => (reportMode === 'deadlines' ? 'overdue' : 'all'));
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    if (reportMode === 'deadlines') {
      setStatusFilter('overdue');
    }
  }, [reportMode]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskList, statData] = await Promise.all([
        taskService.listTasks(),
        taskService.getStats(),
      ]);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setStats(statData);
    } catch (err) {
      console.error('Error loading reports from DB:', err);
      notify.error('Lỗi khi tải dữ liệu công việc từ Database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute departments list from DB
  const departmentOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.department?.trim()) set.add(t.department.trim());
    });
    return [
      { value: 'all', label: 'Tất cả phòng ban' },
      ...Array.from(set).map((d) => ({ value: d, label: `Phòng ${d}` })),
    ];
  }, [tasks]);

  // Aggregate metrics from real DB tasks
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const inReview = tasks.filter((t) => t.status === 'in_review').length;
    const todo = tasks.filter((t) => t.status === 'todo' || !t.status).length;

    const overdue = tasks.filter((t) => {
      if (t.status === 'done') return false;
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const now = new Date();
      return due < now;
    }).length;

    const totalProgress = tasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0);
    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      inReview,
      todo,
      overdue,
      avgProgress,
      completionRate,
    };
  }, [tasks]);

  // Department breakdown
  const departmentStats = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      const dept = t.department?.trim() || 'Chung / Khác';
      if (!map[dept]) {
        map[dept] = { dept, total: 0, completed: 0, inProgress: 0, overdue: 0, progressSum: 0 };
      }
      map[dept].total += 1;
      if (t.status === 'done') map[dept].completed += 1;
      if (t.status === 'in_progress') map[dept].inProgress += 1;
      if (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done') {
        map[dept].overdue += 1;
      }
      map[dept].progressSum += Number(t.progress) || 0;
    });

    return Object.values(map)
      .map((d) => ({
        ...d,
        avgProgress: d.total > 0 ? Math.round(d.progressSum / d.total) : 0,
        completionRate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (departmentFilter !== 'all' && t.department?.trim() !== departmentFilter) {
        return false;
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const code = (t.code || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        const assignee = (t.assigneeName || '').toLowerCase();
        const project = (t.projectName || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !assignee.includes(q) && !project.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, departmentFilter, statusFilter, priorityFilter, search]);

  const totalFiltered = filteredTasks.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const pagedTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredTasks.length === 0) {
      notify.warning('Không có dữ liệu công việc để xuất Excel.');
      return;
    }

    const exportRows = filteredTasks.map((t, idx) => ({
      'STT': idx + 1,
      'Mã công việc': t.code || t.id,
      'Tên công việc & Nhiệm vụ': t.title || '',
      'Dự án liên kết': t.projectName || 'Nhiệm vụ độc lập',
      'Phòng ban': t.department || 'Chung',
      'Người phụ trách': t.assigneeName || 'Chưa phân công',
      'Người giao việc / Người duyệt': t.supervisorName || t.assignerName || '',
      'Mức ưu tiên': t.priority || 'medium',
      'Trạng thái': t.status === 'done' ? 'Đã hoàn thành' : t.status === 'in_progress' ? 'Đang thực hiện' : t.status === 'in_review' ? 'Chờ duyệt' : 'Mới tạo',
      'Tiến độ (%)': `${t.progress || 0}%`,
      'Hạn hoàn thành': t.dueDate ? String(t.dueDate).slice(0, 10) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoCongViec');
    XLSX.writeFile(wb, `Bao_Cao_Cong_Viec_He_Thong_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify.success(`Đã xuất ${filteredTasks.length} dòng báo cáo công việc hệ thống ra file Excel.`);
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-slate-50/50 dark:bg-slate-950 overflow-hidden text-xs">
      {/* 1. Header Metrics Cards */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Báo cáo tiến độ công việc hệ thống (Dữ liệu thực DB)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tổng hợp thời gian thực từ cơ sở dữ liệu công việc, phòng ban và tiến độ toàn công ty
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={loadData}
              disabled={loading}
              title="Tải lại số liệu mới nhất từ Database"
            >
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportExcel}
              title="Xuất bảng dữ liệu ra file Excel (.xlsx)"
            >
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* 6 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Tổng công việc</span>
              <BarChart3 size={15} className="text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {metrics.total}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Toàn bộ nhiệm vụ DB</div>
          </div>

          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg shadow-2xs">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-[11px] font-medium">Đang thực hiện</span>
              <Clock size={15} className="text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono">
              {metrics.inProgress}
            </div>
            <div className="text-[10px] text-blue-600/80 mt-0.5">Chiếm {metrics.total > 0 ? Math.round((metrics.inProgress / metrics.total) * 100) : 0}% tổng việc</div>
          </div>

          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg shadow-2xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-[11px] font-medium">Đã hoàn thành</span>
              <CheckCircle2 size={15} className="text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
              {metrics.completed}
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">Tỷ lệ đạt {metrics.completionRate}%</div>
          </div>

          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg shadow-2xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-[11px] font-medium">Chờ duyệt / KCS</span>
              <CheckSquare size={15} className="text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300 font-mono">
              {metrics.inReview}
            </div>
            <div className="text-[10px] text-amber-600/80 mt-0.5">Chờ quản lý nghiệm thu</div>
          </div>

          <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg shadow-2xs">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
              <span className="text-[11px] font-medium">Quá hạn tiến độ</span>
              <AlertTriangle size={15} className="text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-300 font-mono">
              {metrics.overdue}
            </div>
            <div className="text-[10px] text-rose-600/80 mt-0.5">Cần đôn đốc chỉ đạo</div>
          </div>

          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 rounded-lg shadow-2xs">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-1">
              <span className="text-[11px] font-medium">Tiến độ trung bình</span>
              <TrendingUp size={15} className="text-teal-600" />
            </div>
            <div className="text-xl font-bold text-teal-700 dark:text-teal-300 font-mono">
              {metrics.avgProgress}%
            </div>
            <div className="text-[10px] text-teal-600/80 mt-0.5">Toàn công ty</div>
          </div>
        </div>
      </div>

      {/* 2. Visual Analytics Section: Department progress breakdown */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={14} className="text-emerald-600" />
            <span>Phân tích tiến độ theo phòng ban & khối nhà máy</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {departmentStats.length} phòng ban / đơn vị
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {departmentStats.map((dept) => (
            <div
              key={dept.dept}
              className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-lg"
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {dept.dept}
                </span>
                <span className="font-mono font-bold text-emerald-600 text-xs">
                  {dept.avgProgress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, dept.avgProgress)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Tổng: <strong>{dept.total}</strong></span>
                <span className="text-emerald-600">Xong: <strong>{dept.completed}</strong></span>
                <span className="text-blue-600">Đang làm: <strong>{dept.inProgress}</strong></span>
                {dept.overdue > 0 ? (
                  <span className="text-rose-600 font-bold">Trễ: {dept.overdue}</span>
                ) : (
                  <span className="text-slate-400">Đúng hạn</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="w-56 sm:w-64">
            <SearchInput
              value={searchDraft}
              onChange={setSearchDraft}
              onSearch={() => {
                setSearch(searchDraft.trim());
                setPage(1);
              }}
              placeholder="Tìm mã CV, tên việc, nhân sự..."
            />
          </div>

          {/* Department Filter */}
          <div className="w-48 sm:w-52">
            <Select
              value={departmentFilter}
              onChange={(val) => {
                setDepartmentFilter(val);
                setPage(1);
              }}
              options={departmentOptions}
            />
          </div>

          {/* Status Filter */}
          <div className="w-40 sm:w-44">
            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'in_progress', label: 'Đang thực hiện' },
                { value: 'done', label: 'Đã hoàn thành' },
                { value: 'in_review', label: 'Chờ duyệt' },
                { value: 'todo', label: 'Mới giao / Todo' },
              ]}
            />
          </div>

          {/* Priority Filter */}
          <div className="w-36">
            <Select
              value={priorityFilter}
              onChange={(val) => {
                setPriorityFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Mức ưu tiên' },
                { value: 'urgent', label: 'Khẩn cấp' },
                { value: 'high', label: 'Cao' },
                { value: 'medium', label: 'Bình thường' },
                { value: 'low', label: 'Thấp' },
              ]}
            />
          </div>

          {(search || departmentFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchDraft('');
                setSearch('');
                setDepartmentFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
                setPage(1);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Hiển thị <strong>{pagedTasks.length}</strong> / <strong>{totalFiltered}</strong> công việc
        </div>
      </div>

      {/* 4. Detailed Tasks Table (Flat Excel-style ERP Grid) */}
      <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-slate-950 scrollbar-thin">
        <table className="min-w-[1400px] w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold select-none shadow-2xs">
            <tr className="h-8">
              <th className="w-12 min-w-[48px] px-2 py-0 h-8 text-center font-mono text-[11px] border-r border-slate-200 dark:border-slate-800">
                STT
              </th>
              <th className="w-32 min-w-[120px] px-2 py-0 h-8 font-mono border-r border-slate-200 dark:border-slate-800">
                Mã CV
              </th>
              <th className="w-[360px] min-w-[280px] px-3 py-0 h-8 border-r border-slate-200 dark:border-slate-800">
                Tên công việc & Nhiệm vụ
              </th>
              <th className="w-48 min-w-[160px] px-3 py-0 h-8 border-r border-slate-200 dark:border-slate-800">
                Dự án liên kết
              </th>
              <th className="w-40 min-w-[140px] px-3 py-0 h-8 border-r border-slate-200 dark:border-slate-800">
                Phòng ban
              </th>
              <th className="w-44 min-w-[150px] px-3 py-0 h-8 border-r border-slate-200 dark:border-slate-800">
                Người thực hiện
              </th>
              <th className="w-44 min-w-[150px] px-3 py-0 h-8 border-r border-slate-200 dark:border-slate-800">
                Người duyệt
              </th>
              <th className="w-28 min-w-[100px] px-2 py-0 h-8 text-center border-r border-slate-200 dark:border-slate-800">
                Tiến độ
              </th>
              <th className="w-32 min-w-[120px] px-2 py-0 h-8 text-center border-r border-slate-200 dark:border-slate-800">
                Trạng thái
              </th>
              <th className="w-28 min-w-[110px] px-2 py-0 h-8 text-center border-r border-slate-200 dark:border-slate-800">
                Mức ưu tiên
              </th>
              <th className="w-32 min-w-[120px] px-3 py-0 h-8 border-r border-slate-200 dark:border-slate-800">
                Hạn hoàn thành
              </th>
              <th className="w-20 min-w-[70px] px-2 py-0 h-8 text-center">
                Chi tiết
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {pagedTasks.map((task, idx) => {
              const isEven = idx % 2 === 0;
              const progress = Number(task.progress || 0);
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

              return (
                <tr
                  key={task.id || idx}
                  className={`group transition-colors border-b border-slate-200/70 dark:border-slate-800 h-8 ${
                    isEven
                      ? 'bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      : 'bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <td className="w-12 min-w-[48px] p-0 h-8 text-center font-mono text-[11px] text-slate-500 border-r border-slate-100 dark:border-slate-800/80">
                    {(page - 1) * pageSize + idx + 1}
                  </td>

                  <td className="w-32 min-w-[120px] px-2 h-8 font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/80 truncate">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/tasks/my/${task.code || task.id}`)}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      title="Xem chi tiết công việc"
                    >
                      {task.code || task.id}
                    </button>
                  </td>

                  <td className="w-[360px] min-w-[280px] px-3 h-8 border-r border-slate-100 dark:border-slate-800/80">
                    <div
                      onClick={() => navigate(`/app/tasks/my/${task.code || task.id}`)}
                      className="font-medium text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-emerald-600 transition"
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  </td>

                  <td className="w-48 min-w-[160px] px-3 h-8 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80 truncate">
                    {task.projectName || '—'}
                  </td>

                  <td className="w-40 min-w-[140px] px-3 h-8 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/80 truncate">
                    {task.department ? `Phòng ${task.department}` : 'Chung'}
                  </td>

                  <td className="w-44 min-w-[150px] px-3 h-8 font-medium text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/80 truncate">
                    {task.assigneeName || 'Chưa giao'}
                  </td>

                  <td className="w-44 min-w-[150px] px-3 h-8 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80 truncate">
                    {task.supervisorName || task.assignerName || '—'}
                  </td>

                  {/* Tiến độ (%) */}
                  <td className="w-28 min-w-[100px] px-2 h-8 border-r border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            progress === 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 w-8 text-right">
                        {progress}%
                      </span>
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td className="w-32 min-w-[120px] px-2 h-8 text-center border-r border-slate-100 dark:border-slate-800/80">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        task.status === 'done'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : task.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          : task.status === 'in_review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {task.status === 'done'
                        ? 'Đã hoàn thành'
                        : task.status === 'in_progress'
                        ? 'Đang thực hiện'
                        : task.status === 'in_review'
                        ? 'Chờ duyệt'
                        : 'Mới giao'}
                    </span>
                  </td>

                  {/* Mức ưu tiên */}
                  <td className="w-28 min-w-[110px] px-2 h-8 text-center border-r border-slate-100 dark:border-slate-800/80">
                    <span
                      className={`text-[11px] font-semibold ${
                        task.priority === 'urgent'
                          ? 'text-rose-600 font-bold'
                          : task.priority === 'high'
                          ? 'text-amber-600'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {task.priority === 'urgent'
                        ? 'Khẩn cấp'
                        : task.priority === 'high'
                        ? 'Cao'
                        : task.priority === 'low'
                        ? 'Thấp'
                        : 'Bình thường'}
                    </span>
                  </td>

                  {/* Hạn hoàn thành */}
                  <td className="w-32 min-w-[120px] px-3 h-8 font-mono text-[11px] border-r border-slate-100 dark:border-slate-800/80">
                    <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                      {task.dueDate ? String(task.dueDate).slice(0, 10) : '—'}
                    </span>
                  </td>

                  {/* Nút Xem chi tiết */}
                  <td className="w-20 min-w-[70px] p-0 h-8 text-center">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/tasks/my/${task.code || task.id}`)}
                      className="p-1 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                      title="Mở chi tiết công việc"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={12} className="p-12 text-center text-slate-400 italic">
                  Không tìm thấy công việc nào phù hợp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Footer */}
      <TableStatusFooter
        title="Báo cáo công việc hệ thống"
        totalCount={totalFiltered}
        unit="nhiệm vụ"
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

