import React from 'react';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function DeleteTaskModal({
  open,
  onClose,
  onConfirm,
  onArchive,
  task,
  count = 1,
  busy = false,
}) {
  const isMultiple = count > 1;
  const hasProgress = task?.progress > 0;
  const isAssignedByOther = Boolean(task?.supervisorName && task?.supervisorName !== 'Tôi');

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Xử lý công việc (Xóa hoặc Lưu trữ)"
      size="md"
      fitContent={true}
      maxWidth="480px"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <div>
            {onArchive && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  onArchive();
                  onClose();
                }}
                className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
              >
                Lưu trữ / Ẩn việc
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>
              Hủy
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={onConfirm}
              icon={Trash2}
            >
              {busy ? 'Đang chuyển...' : isMultiple ? `Xóa ${count} công việc` : 'Chuyển vào thùng rác'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {isMultiple
                ? `Bạn có chắc muốn chuyển ${count} công việc đã chọn vào thùng rác?`
                : 'Bạn có chắc chắn muốn chuyển công việc này vào thùng rác?'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Công việc sẽ được chuyển vào <strong className="text-slate-700 dark:text-slate-200 font-medium">Thùng rác cá nhân</strong> để bảo toàn lịch sử dữ liệu. Bạn có thể mở Thùng rác để xem lại và bấm <strong className="text-slate-700 dark:text-slate-200 font-medium">Khôi phục</strong> bất cứ lúc nào.
            </p>
          </div>
        </div>

        {(hasProgress || isAssignedByOther) && (
          <div className="pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-5 py-0.5">
            {hasProgress && (
              <p>• Công việc này đã phát sinh tiến độ làm việc ({task?.progress}%). Tiến độ vẫn được lưu trong thùng rác nhưng không tính vào KPI hiện tại.</p>
            )}
            {isAssignedByOther && (
              <p>• Công việc do <strong>{task?.supervisorName}</strong> giao. Nếu muốn cấp trên vẫn theo dõi kết quả, bạn có thể chọn <strong>Lưu trữ / Ẩn việc</strong> thay vì xóa.</p>
            )}
          </div>
        )}

        {task && !isMultiple && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs">
            {task.code && (
              <div className="flex items-center gap-2">
                <span className="w-28 text-slate-400 shrink-0">Mã công việc:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{task.code}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-28 text-slate-400 shrink-0">Tên công việc:</span>
              <span className="font-medium text-slate-900 dark:text-white truncate">{task.title}</span>
            </div>
            {task.department && (
              <div className="flex items-center gap-2">
                <span className="w-28 text-slate-400 shrink-0">Phòng ban:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate">{task.department}</span>
              </div>
            )}
            {task.assigneeName && (
              <div className="flex items-center gap-2">
                <span className="w-28 text-slate-400 shrink-0">Người thực hiện:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate">{task.assigneeName}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

