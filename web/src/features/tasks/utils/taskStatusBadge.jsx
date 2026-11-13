import React from 'react';

/**
 * Hiển thị chữ màu sắc mức độ ưu tiên theo đúng tiêu chuẩn bảng dữ liệu (không dùng tag/badge):
 * - Khẩn cấp: Đỏ đậm
 * - Cao: Vàng cam
 * - Trung bình: Xanh dương
 * - Thấp: Xám
 */
export function renderPriorityBadge(priority) {
  const pri = String(priority || 'medium').toLowerCase();
  if (pri === 'urgent' || pri === 'khẩn cấp') {
    return (
      <span className="font-bold text-rose-600 dark:text-rose-400">
        Khẩn cấp
      </span>
    );
  }
  if (pri === 'high' || pri === 'cao') {
    return (
      <span className="font-semibold text-amber-600 dark:text-amber-400">
        Cao
      </span>
    );
  }
  if (pri === 'low' || pri === 'thấp') {
    return (
      <span className="font-normal text-slate-400 dark:text-slate-500">
        Thấp
      </span>
    );
  }
  return (
    <span className="font-medium text-sky-600 dark:text-sky-400">
      Trung bình
    </span>
  );
}

/**
 * Hiển thị chữ màu sắc trạng thái quy trình theo đúng tiêu chuẩn bảng dữ liệu (không dùng tag/badge):
 * - Hoàn tất: Xanh lục
 * - Đang làm: Xanh dương
 * - Chờ duyệt: Vàng hổ phách
 * - Cần làm: Tím
 * - Chờ xử lý: Xám đậm
 * - Đã hủy: Đỏ gạch ngang
 * - Lưu trữ: Xám nhạt
 */
export function renderStatusBadge(status) {
  const st = String(status || 'todo').toLowerCase();
  if (st === 'done' || st === 'completed' || st === 'hoàn tất') {
    return (
      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
        Hoàn tất
      </span>
    );
  }
  if (st === 'in_progress' || st === 'đang làm' || st === 'đang thực hiện') {
    return (
      <span className="font-medium text-blue-600 dark:text-blue-400">
        Đang làm
      </span>
    );
  }
  if (st === 'in_review' || st === 'review' || st === 'chờ duyệt') {
    return (
      <span className="font-medium text-amber-600 dark:text-amber-400">
        Chờ duyệt
      </span>
    );
  }
  if (st === 'todo' || st === 'cần làm') {
    return (
      <span className="font-medium text-purple-600 dark:text-purple-400">
        Cần làm
      </span>
    );
  }
  if (st === 'backlog' || st === 'chờ xử lý') {
    return (
      <span className="font-normal text-slate-500 dark:text-slate-400">
        Chờ xử lý
      </span>
    );
  }
  if (st === 'cancelled' || st === 'đã hủy') {
    return (
      <span className="font-normal text-rose-500 dark:text-rose-400 line-through">
        Đã hủy
      </span>
    );
  }
  if (st === 'archived' || st === 'lưu trữ') {
    return (
      <span className="font-normal text-zinc-400 dark:text-zinc-500">
        Lưu trữ
      </span>
    );
  }
  return (
    <span className="font-normal text-slate-600 dark:text-slate-400">
      {status || '—'}
    </span>
  );
}

