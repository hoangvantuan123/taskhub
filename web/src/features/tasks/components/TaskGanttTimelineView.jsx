import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Layers,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  FolderOpen,
} from 'lucide-react';
import Button from '../../../shared/ui/Button';
import { renderStatusBadge, renderPriorityBadge } from '../utils/taskStatusBadge';

const ROW_HEIGHT = 42; // px per task row
const HEADER_HEIGHT = 56; // px for timeline header

export default function TaskGanttTimelineView({
  tasks = [],
  projects = [],
  selectedProjectId = '',
  onSelectProject,
  onOpenTask,
  currentDate = new Date(),
  onNavigateDate,
}) {
  // Zoom mode: 'day' (40px/day), 'week' (18px/day), 'month' (7px/day)
  const [zoomMode, setZoomMode] = useState('day');
  const [hoveredTaskId, setHoveredTaskId] = useState(null);

  // References for synchronized scrolling
  const leftTableBodyRef = useRef(null);
  const rightCanvasRef = useRef(null);
  const timelineScrollRef = useRef(null);

  // Active Project object (if selected)
  const activeProject = useMemo(() => {
    if (!selectedProjectId) return null;
    const pVal = String(selectedProjectId).toLowerCase();
    return projects.find(
      (p) =>
        String(p.id || '').toLowerCase() === pVal ||
        String(p.code || '').toLowerCase() === pVal
    );
  }, [projects, selectedProjectId]);

  // Tasks to display:
  // If selectedProjectId is chosen, filter strictly to that project;
  // otherwise, display all filtered tasks passed in props.
  const displayTasks = useMemo(() => {
    if (!selectedProjectId) return tasks;
    const pVal = String(selectedProjectId).toLowerCase();
    return tasks.filter(
      (t) =>
        String(t.projectId || '').toLowerCase() === pVal ||
        String(t.projectCode || '').toLowerCase() === pVal ||
        (t.projectName && t.projectName.toLowerCase().includes(pVal))
    );
  }, [tasks, selectedProjectId]);

  // Group tasks by project if no single project is selected
  const groupedTasks = useMemo(() => {
    if (selectedProjectId) {
      return [{ project: activeProject || { code: selectedProjectId, name: 'Dự án đã chọn' }, items: displayTasks }];
    }

    const map = new Map();
    displayTasks.forEach((t) => {
      const pKey = t.projectId || t.projectCode || 'no_project';
      if (!map.has(pKey)) {
        const prj = projects.find((p) => p.id === t.projectId || p.code === t.projectCode);
        map.set(pKey, {
          project: prj || (pKey === 'no_project' ? { code: 'OTHER', name: 'Công việc độc lập (Không theo dự án)' } : { code: t.projectCode || 'PRJ', name: t.projectName || 'Dự án' }),
          items: [],
        });
      }
      map.get(pKey).items.push(t);
    });

    return Array.from(map.values());
  }, [displayTasks, selectedProjectId, activeProject, projects]);

  // Flat list of rows for rendering aligned left-table and right-canvas
  // Each entry is either a { type: 'project', project } or { type: 'task', task }
  const flatRows = useMemo(() => {
    const rows = [];
    groupedTasks.forEach((g) => {
      // If showing all projects, render project header row
      if (!selectedProjectId) {
        rows.push({
          type: 'project',
          id: `prj-${g.project.id || g.project.code}`,
          project: g.project,
          taskCount: g.items.length,
        });
      }
      g.items.forEach((task) => {
        rows.push({
          type: 'task',
          id: task.id || task.code,
          task,
        });
      });
    });
    return rows;
  }, [groupedTasks, selectedProjectId]);

  // Compute Gantt timeline date range (Start date & End date)
  const { startDate, endDate, totalDays, dayWidth, daysList } = useMemo(() => {
    let minD = new Date(currentDate);
    minD.setDate(1); // 1st of current month
    let maxD = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0); // end of next month

    // Expand to cover all tasks
    displayTasks.forEach((t) => {
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (!isNaN(d) && d < minD) minD = new Date(d);
      }
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        if (!isNaN(d) && d > maxD) maxD = new Date(d);
      }
    });

    // Also consider activeProject start/end dates
    if (activeProject) {
      if (activeProject.startDate) {
        const d = new Date(activeProject.startDate);
        if (!isNaN(d) && d < minD) minD = new Date(d);
      }
      if (activeProject.endDate) {
        const d = new Date(activeProject.endDate);
        if (!isNaN(d) && d > maxD) maxD = new Date(d);
      }
    }

    // Add padding days around range: 7 days before, 14 days after
    const start = new Date(minD);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(maxD);
    end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 999);

    const diffMs = end - start;
    const daysCount = Math.max(14, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Pixel width per day based on zoom mode
    let pxPerDay = 38;
    if (zoomMode === 'week') pxPerDay = 18;
    if (zoomMode === 'month') pxPerDay = 8;

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isToday = d.getTime() === todayTime;
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        index: i,
        date: d,
        dateStr,
        dayNumber: d.getDate(),
        dayOfWeek: d.getDay(),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        isWeekend,
        isToday,
      });
    }

    return {
      startDate: start,
      endDate: end,
      totalDays: daysCount,
      dayWidth: pxPerDay,
      daysList: days,
    };
  }, [currentDate, displayTasks, activeProject, zoomMode]);

  // Group days by month for the top header row of the timeline
  const monthHeaders = useMemo(() => {
    const list = [];
    let currentM = null;
    daysList.forEach((d) => {
      const key = `${d.month}/${d.year}`;
      if (!currentM || currentM.key !== key) {
        currentM = {
          key,
          label: `Tháng ${d.month}/${d.year}`,
          startIndex: d.index,
          count: 1,
        };
        list.push(currentM);
      } else {
        currentM.count += 1;
      }
    });
    return list;
  }, [daysList]);

  // Today marker pixel offset
  const todayPixelOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const found = daysList.find((d) => d.dateStr === todayStr);
    if (!found) return null;
    return found.index * dayWidth + dayWidth / 2;
  }, [daysList, dayWidth]);

  // Scroll to Today button
  const handleScrollToToday = () => {
    if (todayPixelOffset !== null && timelineScrollRef.current) {
      const containerWidth = timelineScrollRef.current.clientWidth;
      timelineScrollRef.current.scrollTo({
        left: Math.max(0, todayPixelOffset - containerWidth / 3),
        behavior: 'smooth',
      });
    }
  };

  // Center timeline on today initially
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScrollToToday();
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedProjectId, zoomMode]);

  // Synchronize vertical scroll between left table and right timeline canvas
  const handleLeftScroll = (e) => {
    if (rightCanvasRef.current && e.target) {
      rightCanvasRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleRightScroll = (e) => {
    if (leftTableBodyRef.current && e.target) {
      leftTableBodyRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Calculate project statistics for KPI banner
  const projectStats = useMemo(() => {
    const total = displayTasks.length;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let totalProgress = 0;

    displayTasks.forEach((t) => {
      if (t.status === 'done' || t.status === 'completed') {
        completed += 1;
      } else if (t.status === 'in_progress') {
        inProgress += 1;
      }
      if (t.isOverdue) {
        overdue += 1;
      }
      totalProgress += t.progress || 0;
    });

    const avgProgress = total > 0 ? Math.round(totalProgress / total) : (activeProject?.progress || 0);

    return {
      total,
      completed,
      inProgress,
      overdue,
      avgProgress,
    };
  }, [displayTasks, activeProject]);

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-white dark:bg-slate-950 overflow-hidden select-none">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. GANTT CONTROL & PROJECT KPI HEADER STRIP                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Project Context & KPI Summary */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              Dự án Gantt:
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject && onSelectProject(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-xs truncate cursor-pointer shadow-2xs focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">-- Tất cả dự án & Kế hoạch ({projects.length}) --</option>
              {projects.map((p) => (
                <option key={p.id || p.code} value={p.id || p.code}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {activeProject ? (
            <div className="hidden lg:flex items-center gap-2 text-slate-600 dark:text-slate-400 pl-3 border-l border-slate-200 dark:border-slate-800">
              <span>PM: <strong className="text-slate-800 dark:text-slate-200">{activeProject.managerName || '—'}</strong></span>
              <span>·</span>
              <span>Phòng: <strong className="text-slate-800 dark:text-slate-200">{activeProject.department || '—'}</strong></span>
              {activeProject.startDate && activeProject.endDate && (
                <>
                  <span>·</span>
                  <span className="font-mono">{activeProject.startDate} → {activeProject.endDate}</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-slate-500 hidden sm:inline">
              Đang xem tổng quan Gantt toàn bộ các dự án & đầu mục việc
            </span>
          )}
        </div>

        {/* Action Controls & Zoom Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* KPI Chips */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-2xs font-medium">
            <span className="text-slate-500">Tổng việc: <strong className="text-slate-800 dark:text-slate-200">{projectStats.total}</strong></span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Xong: {projectStats.completed}</span>
            <span>·</span>
            <span className="text-blue-600 dark:text-blue-400">Đang làm: {projectStats.inProgress}</span>
            {projectStats.overdue > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">Trễ: {projectStats.overdue}</span>
              </>
            )}
            <span>·</span>
            <span>Tiến độ: <strong className="text-emerald-600">{projectStats.avgProgress}%</strong></span>
          </div>

          {/* Jump to Today */}
          <Button
            size="sm"
            variant="outline"
            icon={Clock}
            onClick={handleScrollToToday}
            title="Cuộn nhanh đến ngày Hôm nay"
          >
            Hôm nay
          </Button>

          {/* Zoom Toggle */}
          <div className="flex items-center p-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-2xs">
            {[
              { id: 'day', label: 'Ngày' },
              { id: 'week', label: 'Tuần' },
              { id: 'month', label: 'Tháng' },
            ].map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZoomMode(z.id)}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  zoomMode === z.id
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. MAIN SPLIT PANE: LEFT TABLE & RIGHT GANTT TIMELINE        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        {/* LEFT PANE: WBS TASK BREAKDOWN TABLE (Width: 460px) */}
        <div className="w-[440px] xl:w-[480px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-0 bg-white dark:bg-slate-950">
          {/* Left Table Header */}
          <div
            style={{ height: HEADER_HEIGHT }}
            className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 shrink-0"
          >
            <div className="w-24 shrink-0 font-mono">Mã CV</div>
            <div className="flex-1 min-w-0 pr-2">Tên đầu việc & Dự án</div>
            <div className="w-28 shrink-0">Người làm</div>
            <div className="w-16 shrink-0 text-center">Tiến độ</div>
            <div className="w-20 shrink-0 text-center">Trạng thái</div>
          </div>

          {/* Left Table Body (Synchronized Scroll) */}
          <div
            ref={leftTableBodyRef}
            onScroll={handleLeftScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 dark:divide-slate-800/60"
          >
            {flatRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Không có đầu việc nào trong dự án này.
              </div>
            ) : (
              flatRows.map((row) => {
                if (row.type === 'project') {
                  return (
                    <div
                      key={row.id}
                      style={{ height: ROW_HEIGHT }}
                      className="flex items-center px-3 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 font-bold text-xs border-y border-emerald-200/60 dark:border-emerald-800/40"
                    >
                      <Layers size={14} className="mr-2 text-emerald-600 shrink-0" />
                      <span className="font-mono text-2xs mr-2 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                        {row.project.code}
                      </span>
                      <span className="truncate flex-1" title={row.project.name}>
                        {row.project.name}
                      </span>
                      <span className="text-2xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0 ml-2">
                        {row.taskCount} việc
                      </span>
                    </div>
                  );
                }

                const task = row.task;
                const isHovered = hoveredTaskId === task.id;

                return (
                  <div
                    key={row.id}
                    style={{ height: ROW_HEIGHT }}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    onClick={() => onOpenTask && onOpenTask(task.id)}
                    className={`flex items-center px-3 text-xs transition-colors cursor-pointer group ${
                      isHovered
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="w-24 shrink-0 font-mono text-2xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                      {task.code || '—'}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p className="text-2xs text-slate-400 truncate font-mono">
                          Hạn: {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                    <div className="w-28 shrink-0 text-slate-600 dark:text-slate-400 text-2xs truncate">
                      {task.assigneeName || 'Chưa giao'}
                    </div>
                    <div className="w-16 shrink-0 text-center font-mono font-bold text-2xs text-emerald-600">
                      {task.progress ?? 0}%
                    </div>
                    <div className="w-20 shrink-0 flex justify-center">
                      {renderStatusBadge(task.status)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: INTERACTIVE GANTT TIMELINE CANVAS */}
        <div
          ref={timelineScrollRef}
          className="flex-1 flex flex-col min-h-0 overflow-x-auto overflow-y-hidden bg-slate-50/20 dark:bg-slate-950/20"
        >
          {/* Timeline Header (Months top + Days bottom) */}
          <div
            style={{ width: totalDays * dayWidth, height: HEADER_HEIGHT }}
            className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 shrink-0 flex flex-col select-none"
          >
            {/* Top row: Month blocks */}
            <div className="h-7 flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              {monthHeaders.map((m) => (
                <div
                  key={m.key}
                  style={{ width: m.count * dayWidth }}
                  className="px-2 flex items-center border-r border-slate-200 dark:border-slate-800 truncate"
                >
                  <Calendar size={12} className="mr-1.5 text-slate-400 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Bottom row: Individual day columns */}
            <div className="h-7 flex text-2xs font-mono text-slate-600 dark:text-slate-400">
              {daysList.map((d) => (
                <div
                  key={d.dateStr}
                  style={{ width: dayWidth }}
                  className={`flex flex-col items-center justify-center border-r border-slate-200/70 dark:border-slate-800/70 shrink-0 ${
                    d.isToday
                      ? 'bg-rose-500 text-white font-bold'
                      : d.isWeekend
                      ? 'bg-slate-200/50 dark:bg-slate-800/40 text-slate-400 font-semibold'
                      : ''
                  }`}
                  title={`${d.dateStr} (${d.dayOfWeek === 0 ? 'Chủ nhật' : `Thứ ${d.dayOfWeek + 1}`})`}
                >
                  <span>{d.dayNumber}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Body (Canvas rows matching left table) */}
          <div
            ref={rightCanvasRef}
            onScroll={handleRightScroll}
            style={{ width: totalDays * dayWidth }}
            className="flex-1 overflow-y-auto relative divide-y divide-slate-100 dark:divide-slate-800/50"
          >
            {/* Background Grid Columns for all days */}
            <div className="absolute inset-0 pointer-events-none flex">
              {daysList.map((d) => (
                <div
                  key={`grid-${d.dateStr}`}
                  style={{ width: dayWidth }}
                  className={`h-full border-r border-slate-200/40 dark:border-slate-800/40 shrink-0 ${
                    d.isWeekend ? 'bg-slate-100/40 dark:bg-slate-900/30' : ''
                  }`}
                />
              ))}
            </div>

            {/* Today Marker Red Vertical Line */}
            {todayPixelOffset !== null && (
              <div
                style={{ left: todayPixelOffset }}
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none shadow-sm"
              >
                <div className="sticky top-1 -ml-6 px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-3xs uppercase tracking-wider shadow">
                  Hôm nay
                </div>
              </div>
            )}

            {/* Gantt Rows */}
            {flatRows.map((row) => {
              if (row.type === 'project') {
                return (
                  <div
                    key={`canvas-${row.id}`}
                    style={{ height: ROW_HEIGHT }}
                    className="relative bg-emerald-50/40 dark:bg-emerald-950/10 border-y border-emerald-200/40 dark:border-emerald-800/20"
                  />
                );
              }

              const task = row.task;
              const isHovered = hoveredTaskId === task.id;

              // Compute Gantt Bar Start and End index
              let startIdx = 0;
              let endIdx = 0;

              const taskStartStr = task.startDate
                ? new Date(task.startDate).toISOString().slice(0, 10)
                : task.dueDate
                ? new Date(new Date(task.dueDate).getTime() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10)
                : daysList[0]?.dateStr;

              const taskDueStr = task.dueDate
                ? new Date(task.dueDate).toISOString().slice(0, 10)
                : taskStartStr;

              const foundStart = daysList.findIndex((d) => d.dateStr === taskStartStr);
              const foundEnd = daysList.findIndex((d) => d.dateStr === taskDueStr);

              startIdx = foundStart >= 0 ? foundStart : 0;
              endIdx = foundEnd >= 0 ? foundEnd : Math.min(daysList.length - 1, startIdx + 2);
              if (endIdx < startIdx) endIdx = startIdx;

              const barLeft = startIdx * dayWidth + 2;
              const barWidth = Math.max(dayWidth - 4, (endIdx - startIdx + 1) * dayWidth - 4);

              // Bar colors according to task status
              let barBg = 'bg-blue-600 border-blue-500';
              let fillBg = 'bg-blue-700';

              if (task.status === 'done' || task.status === 'completed') {
                barBg = 'bg-emerald-600 border-emerald-500';
                fillBg = 'bg-emerald-700';
              } else if (task.isOverdue) {
                barBg = 'bg-rose-600 border-rose-500';
                fillBg = 'bg-rose-700';
              } else if (task.status === 'in_review') {
                barBg = 'bg-amber-600 border-amber-500';
                fillBg = 'bg-amber-700';
              } else if (task.status === 'pending') {
                barBg = 'bg-slate-500 border-slate-400';
                fillBg = 'bg-slate-600';
              }

              return (
                <div
                  key={`canvas-${row.id}`}
                  style={{ height: ROW_HEIGHT }}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                  className={`relative flex items-center transition-colors ${
                    isHovered ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  {/* The Gantt Bar */}
                  <div
                    style={{
                      left: barLeft,
                      width: barWidth,
                      height: 26,
                    }}
                    onClick={() => onOpenTask && onOpenTask(task.id)}
                    title={`[${task.code}] ${task.title}\nPhụ trách: ${task.assigneeName || '—'}\nTiến độ: ${task.progress || 0}%\nBắt đầu: ${taskStartStr} → Hạn: ${taskDueStr}`}
                    className={`absolute z-10 rounded-md border text-white text-xs font-semibold shadow-2xs overflow-hidden flex items-center px-2 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${barBg}`}
                  >
                    {/* Inner Progress Fill */}
                    <div
                      style={{ width: `${Math.min(100, task.progress || 0)}%` }}
                      className={`absolute left-0 top-0 bottom-0 ${fillBg} opacity-60 pointer-events-none`}
                    />

                    {/* Bar Label */}
                    <span className="relative z-10 truncate text-2xs font-mono drop-shadow-xs">
                      {task.code ? `${task.code} · ` : ''}{task.title} ({task.progress ?? 0}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
