import React, { useState, useEffect } from 'react';
import Modal from '../../../../shared/ui/Modal';
import Button from '../../../../shared/ui/Button';
import Input from '../../../../shared/ui/Input';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export default function UserPasswordModal({
  open,
  onClose,
  user,
  busy,
  modalError,
  onSubmit,
}) {
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
    showPass: false,
    showConfirm: false,
  });

  useEffect(() => {
    if (open) {
      setForm({
        newPassword: '',
        confirmPassword: '',
        showPass: false,
        showConfirm: false,
      });
    }
  }, [open, user]);

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit(form.newPassword, form.confirmPassword);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Đổi mật khẩu người dùng"
      size="md"
      fitContent={true}
      maxWidth="520px"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button size="sm" type="submit" form="password-reset-form" disabled={busy}>
            Cập nhật mật khẩu
          </Button>
        </div>
      }
    >
      {modalError && <p role="alert" className="mb-4 text-sm text-red-600">{modalError}</p>}
      <form id="password-reset-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <KeyRound size={20} className="text-blue-600 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Tài khoản: <span className="font-mono">{user?.username}</span>
            </p>
            <p className="text-slate-500 mt-0.5">Họ và tên: {user?.name}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="relative">
            <Input
              density="comfortable"
              label="Mật khẩu mới (12–72 ký tự)"
              type={form.showPass ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
              value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Nhập mật khẩu mới…"
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              onClick={() => setForm({ ...form, showPass: !form.showPass })}
            >
              {form.showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="relative">
            <Input
              density="comfortable"
              label="Xác nhận mật khẩu mới"
              type={form.showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Nhập lại mật khẩu mới…"
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              onClick={() => setForm({ ...form, showConfirm: !form.showConfirm })}
            >
              {form.showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
          <p className="font-medium">Lưu ý bảo mật:</p>
          <p className="mt-1">
            Sau khi đổi mật khẩu, toàn bộ phiên đăng nhập hiện có của người dùng này sẽ tự động bị chấm dứt. Người dùng
            sẽ phải đăng nhập lại bằng mật khẩu mới.
          </p>
        </div>
      </form>
    </Modal>
  );
}
