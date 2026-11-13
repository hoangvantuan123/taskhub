import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CopyPlus,
  ExternalLink,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  PlayCircle,
  Clock,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

export default function TaskContextMenu({
  task,
  x,
  y,
  onClose,
  onEdit,
  onDuplicate,
  onOpenDetail,
  onUpdateStatus,
  onUpdatePriority,
  onDelete,
  onCopyCode,
}) {
  const menuRef = useRef(null);

  // Close on outside click, window resize, or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!task) return null;

  // Clamping coordinates so menu is never clipped by viewport edges
  const menuWidth = 240;
  const menuHeight = 420;
  const adjustedX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 16));
  const adjustedY = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 16));

  const menuElement = (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        width: `${menuWidth}px`,
      }}
      className="z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xl py-1 text-xs text-slate-800 dark:text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Menu Header with Task Info */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px] truncate">
            {task.code || `CV-${task.id}`}
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
            {task.priority || 'medium'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 truncate mt-0.5" title={task.title}>
          {task.title}
        </div>
      </div>

      {/* Primary Actions */}
      <div className="py-1">
        {/* 0. Edit Task */}
        <button
          type="button"
          onClick={() => {
            onEdit?.(task);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-left transition cursor-pointer font-bold"
        >
          <Edit3 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="flex-1 truncate">Chỉnh sửa công việc</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Edit</span>
        </button>

        {/* 1. Duplicate / Clone Task */}
        <button
          type="button"
          onClick={() => {
            onDuplicate?.(task);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition cursor-pointer font-medium"
        >
          <CopyPlus size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="flex-1 truncate">Nhân bản công việc</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Copy</span>
        </button>

        {/* 2. Open Detail */}
        <button
          type="button"
          onClick={() => {
            onOpenDetail?.(task);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition cursor-pointer"
        >
          <ExternalLink size={14} className="text-blue-500 shrink-0" />
          <span className="flex-1 truncate">Xem chi tiết & nghiệm thu</span>
        </button>

        {/* 3. Copy Code */}
        <button
          type="button"
          onClick={() => {
            onCopyCode?.(task);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition cursor-pointer"
        >
          <Copy size={14} className="text-slate-400 shrink-0" />
          <span className="flex-1 truncate">Sao chép mã công việc</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

      {/* Change Status Submenu / Quick Actions */}
      <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
        Trạng thái thực hiện
      </div>
      <div className="py-0.5 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onUpdateStatus?.(task, 'in_progress');
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition cursor-pointer"
        >
          <PlayCircle size={14} className="text-blue-500 shrink-0" />
          <span className="truncate">Đang thực hiện (In Progress)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onUpdateStatus?.(task, 'completed');
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition cursor-pointer"
        >
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          <span className="truncate">Nghiệm thu hoàn thành (Done)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onUpdateStatus?.(task, 'pending');
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition cursor-pointer"
        >
          <Clock size={14} className="text-amber-500 shrink-0" />
          <span className="truncate">Chờ phê duyệt (Pending)</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:border-slate-800 my-1" />

      {/* Quick Priority */}
      <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
        Mức độ ưu tiên
      </div>
      <div className="py-0.5 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onUpdatePriority?.(task, 'urgent');
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 text-left transition cursor-pointer font-medium"
        >
          <Flame size={14} className="text-rose-500 shrink-0" />
          <span className="truncate">Khẩn cấp (Urgent)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onUpdatePriority?.(task, 'high');
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 text-left transition cursor-pointer"
        >
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span className="truncate">Quan trọng (High)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onUpdatePriority?.(task, 'medium');
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left transition cursor-pointer"
        >
          <ArrowUpRight size={14} className="text-slate-400 shrink-0" />
          <span className="truncate">Bình thường (Medium)</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

      {/* Delete Option */}
      <div className="py-0.5">
        <button
          type="button"
          onClick={() => {
            onDelete?.(task);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-left transition cursor-pointer font-medium"
        >
          <Trash2 size={14} className="shrink-0" />
          <span className="truncate">Xóa công việc này</span>
        </button>
      </div>
    </div>
  );

  return createPortal(menuElement, document.body);
}

