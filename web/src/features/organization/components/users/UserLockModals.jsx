import React from 'react';
import Modal from '../../../../shared/ui/Modal';
import Button from '../../../../shared/ui/Button';

export function UserLockModal({ open, onClose, user, busy, onConfirm }) {
  const isLocking = user?.enabled;
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={isLocking ? 'Khóa tài khoản người dùng' : 'Mở khóa tài khoản người dùng'}
      size="md"
      fitContent={true}
      maxWidth="480px"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            variant={isLocking ? 'danger' : 'primary'}
            disabled={busy}
            onClick={onConfirm}
          >
            {isLocking ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-slate-600 dark:text-slate-300">
          {isLocking
            ? 'Xác nhận tạm ngưng quyền truy cập tài khoản này.'
            : 'Xác nhận kích hoạt lại quyền truy cập tài khoản này.'}
        </p>
        <dl className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3">
            <dt className="text-slate-500">Tài khoản</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{user?.username}</dd>
          </div>
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3">
            <dt className="text-slate-500">Họ và tên</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{user?.name}</dd>
          </div>
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3">
            <dt className="text-slate-500">Tác động</dt>
            <dd className="text-slate-600 dark:text-slate-300">
              {isLocking
                ? 'Thu hồi phiên đăng nhập hiện tại; không thể đăng nhập cho đến khi mở khóa.'
                : 'Tài khoản được phép đăng nhập trở lại.'}
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}

export function UserBulkLockModal({ open, onClose, ids = [], isLock, busy, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={isLock ? `Khóa ${ids.length} tài khoản` : `Mở khóa ${ids.length} tài khoản`}
      size="md"
      fitContent={true}
      maxWidth="480px"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            variant={isLock ? 'danger' : 'primary'}
            disabled={busy}
            onClick={onConfirm}
          >
            {isLock ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-slate-600 dark:text-slate-300">
          {isLock
            ? 'Xác nhận tạm ngưng các tài khoản đã chọn.'
            : 'Xác nhận kích hoạt lại các tài khoản đã chọn.'}
        </p>
        <dl className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3">
            <dt className="text-slate-500">Số tài khoản</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{ids.length}</dd>
          </div>
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3">
            <dt className="text-slate-500">Tác động</dt>
            <dd className="text-slate-600 dark:text-slate-300">
              {isLock
                ? 'Thu hồi các phiên đăng nhập hiện tại.'
                : 'Cho phép các tài khoản đăng nhập trở lại.'}
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
