import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Button from '../../../shared/ui/Button';
import { useAuth } from '../../../shared/hooks/useAuth';
import { authService } from '../../../services/auth/auth.service';

function passwordStrength(value) {
  if (!value) return { score: 0, label: '' };
  let score = 0;
  const length = Array.from(value).length;
  if (length >= 12) score++;
  if (length >= 16) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  score = Math.min(4, score);
  return { score, label: ['Yếu', 'Yếu', 'Trung bình', 'Tốt', 'Rất mạnh'][score] };
}

function PasswordInput({ id, value, onChange, autoComplete, required = true }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative w-full">
      <input
        id={id}
        required={required}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="w-full h-9 pl-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function SecuritySettings() {
  const { currentUser: user, refreshUser } = useAuth();
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const strength = passwordStrength(values.next);
  const passwordLengthValid = Array.from(values.next).length >= 12 && new TextEncoder().encode(values.next).length <= 72;
  const passwordsMatch = Boolean(values.confirm) && values.next === values.confirm;
  const canSubmit = Boolean(values.current && values.next && values.confirm) && passwordLengthValid && passwordsMatch && values.current !== values.next;
  const strengthColors = ['bg-slate-200 dark:bg-slate-700', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-600'];

  const handleSubmit = async event => {
    if (event?.preventDefault) event.preventDefault();
    if (busy) return;
    setError('');
    setMessage('');

    const chars = Array.from(values.next).length;
    if (chars < 12) {
      setError('Mật khẩu mới cần tối thiểu 12 ký tự.');
      return;
    }
    if (new TextEncoder().encode(values.next).length > 72) {
      setError('Mật khẩu quá dài (vượt quá 72 bytes). Vui lòng chọn mật khẩu ngắn hơn.');
      return;
    }
    if (values.next !== values.confirm) {
      setError('Mật khẩu xác nhận chưa khớp với mật khẩu mới.');
      return;
    }
    if (values.current === values.next) {
      setError('Mật khẩu mới phải khác với mật khẩu hiện tại.');
      return;
    }

    setBusy(true);
    try {
      await authService.changePassword({
        current_password: values.current,
        new_password: values.next,
        RowVersion: user?.RowVersion,
      });
      try {
        await refreshUser();
      } catch {}
      setMessage('Đã cập nhật mật khẩu thành công. Các phiên đăng nhập khác đã được đăng xuất.');
      setValues({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(err.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-950">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Mật khẩu & Bảo mật
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản lý mật khẩu và các tiêu chuẩn bảo mật cho tài khoản của bạn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={KeyRound}
            disabled={!canSubmit || busy}
            loading={busy}
            onClick={handleSubmit}
          >
            Cập nhật mật khẩu
          </Button>
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-0">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
              {message}
            </div>
          )}

          {/* 1. MẬT KHẨU HIỆN TẠI */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <label htmlFor="current-pw" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Mật khẩu hiện tại <span className="text-rose-500">*</span>
              </label>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Nhập mật khẩu đang sử dụng để xác thực tài khoản.
              </span>
            </div>
            <div className="max-w-md w-full">
              <PasswordInput
                id="current-pw"
                value={values.current}
                onChange={e => setValues({ ...values, current: e.target.value })}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* 2. MẬT KHẨU MỚI */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-start gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <label htmlFor="new-pw" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Từ 12 đến 72 ký tự, kết hợp chữ, số và ký tự đặc biệt.
              </span>
            </div>
            <div className="max-w-md w-full space-y-2">
              <PasswordInput
                id="new-pw"
                value={values.next}
                onChange={e => setValues({ ...values, next: e.target.value })}
                autoComplete="new-password"
              />

              {values.next && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    {[0, 1, 2, 3].map(step => (
                      <div
                        key={step}
                        className={`flex-1 transition-all duration-300 ${
                          step < strength.score ? strengthColors[strength.score] : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Độ mạnh: <strong className="text-slate-700 dark:text-slate-300">{strength.label}</strong></span>
                    <span>{Array.from(values.next).length} ký tự</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. XÁC NHẬN MẬT KHẨU MỚI */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <label htmlFor="confirm-pw" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Nhập lại mật khẩu mới để đảm bảo tính chính xác.
              </span>
            </div>
            <div className="max-w-md w-full">
              <PasswordInput
                id="confirm-pw"
                value={values.confirm}
                onChange={e => setValues({ ...values, confirm: e.target.value })}
                autoComplete="new-password"
              />
              {values.confirm && !passwordsMatch && (
                <p className="text-xs text-rose-500 mt-1.5">Mật khẩu xác nhận chưa khớp.</p>
              )}
            </div>
          </div>

          {/* 4. TIÊU CHUẨN AN TOÀN THÔNG TIN */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-start gap-6 py-5">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Chính sách an toàn
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Các tiêu chuẩn bảo vệ tài khoản người dùng hệ thống SkillHub.
              </span>
            </div>
            <div className="max-w-md w-full space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Thuật toán băm BCrypt 2a bảo mật cao</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Tự động kết thúc phiên đăng nhập khác khi đổi mật khẩu</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Kiểm soát xung đột phiên bản dữ liệu (RowVersion OCC)</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
