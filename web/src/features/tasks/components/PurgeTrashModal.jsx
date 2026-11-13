import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import { Trash2, AlertOctagon } from 'lucide-react';

export default function PurgeTrashModal({
  open,
  onClose,
  onConfirm,
  count = 1,
  tasks = [],
  busy = false,
}) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Dọn dẹp thùng rác (Xóa vĩnh viễn)"
      size="md"
      fitContent={true}
      maxWidth="500px"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={!confirmed || busy}
            onClick={onConfirm}
            icon={Trash2}
          >
            {busy ? 'Đang dọn dẹp...' : `Xóa vĩnh viễn (${count})`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300">
          <AlertOctagon className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-xs text-rose-900 dark:text-rose-200">
              Hành động không thể hoàn tác!
            </p>
            <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
              Bạn đang yêu cầu dọn dẹp vĩnh viễn <strong>{count} công việc</strong> khỏi hệ thống. Sau khi thực hiện, toàn bộ dữ liệu tiến độ, checklist và hồ sơ liên quan sẽ bị xóa hoàn toàn và <strong>không thể khôi phục lại</strong>.
            </p>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Danh sách công việc sẽ xóa vĩnh viễn:
            </span>
            <ul className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md p-2 bg-slate-50/50 dark:bg-slate-900/50">
              {tasks.slice(0, 10).map((t) => (
                <li key={t.id} className="py-1 text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2">
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-[11px] shrink-0">
                    {t.code || t.id}
                  </span>
                  <span className="truncate flex-1 text-[11px]">{t.title}</span>
                </li>
              ))}
              {tasks.length > 10 && (
                <li className="py-1 text-slate-400 text-[11px] italic text-center">
                  ... và {tasks.length - 10} công việc khác
                </li>
              )}
            </ul>
          </div>
        )}

        <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
            Tôi đã kiểm tra kỹ danh sách và xác nhận muốn xóa vĩnh viễn {count} công việc này khỏi thùng rác.
          </span>
        </label>
      </div>
    </Modal>
  );
}

