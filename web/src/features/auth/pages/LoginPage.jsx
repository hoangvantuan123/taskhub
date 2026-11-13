import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useToast } from '../../../shared/hooks/useToast';
import { authService } from '../../../services/auth/auth.service';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, verifyLoginOtp, register } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [otpUsername, setOtpUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpMode, setOtpMode] = useState('registration');
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Submit standard login form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập tên tài khoản!');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập Mật khẩu!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (registering) {
        const result = await register(name.trim(), email.trim(), password, rememberMe, contactEmail.trim());
        setRegistering(false);
        setOtpUsername('');
        setOtpCode('');
        setEmail(email.trim());
        setName('');
        setContactEmail('');
        setPassword('');
        setSuccessMsg(result.message || 'Đăng ký thành công. Tài khoản đang chờ Admin duyệt.');
      } else {
        const result = await login(email.trim(), password, rememberMe);
        if (result.otp_required) { setOtpUsername(email.trim()); setOtpMode('login'); setSuccessMsg(result.message || 'Đã gửi mã OTP đăng nhập.'); }
        else navigate('/app', { replace: true });
      }
    } catch (error) {
      setErrorMsg(error.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistrationEmail = async event => {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      if (otpMode === 'login') {
        await verifyLoginOtp(otpUsername, otpCode, rememberMe);
        navigate('/app', { replace: true });
      } else {
        const result = await authService.verifyApprovalOtp(otpUsername, otpCode);
        setEmail(otpUsername); setRegistering(false); setOtpUsername('');
        setSuccessMsg(result.message || 'Email đã xác nhận. Đang chờ Admin duyệt.');
      }
      setOtpCode('');
    } catch (error) { setErrorMsg(error.message || 'Không xác nhận được email.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-0 transition-colors" aria-busy={loading}>
      <div className="mb-7 text-center lg:hidden">
        <img src="/assets/goldsun/goldsun-logo-col.png" alt="Goldsun Packaging" className="mx-auto mb-4 h-auto w-20 object-contain" />
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Quản lý công việc</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Goldsun Packaging · Quản lý công việc</p>
      </div>
      <div className="mb-6 sm:mb-8 text-left">
        <p className="hidden lg:block mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">CHÀO MỪNG TRỞ LẠI</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{registering ? "Đăng ký tài khoản" : "Đăng nhập"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Đăng nhập hoặc tạo tài khoản để vào hệ thống.</p>
      </div>
      {/* Main Single Login Form - Comfortable Form Density (40px inputs, 14px font) */}
      {!otpUsername && (
        <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <button
            type="button"
            disabled={loading}
            className="text-emerald-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onClick={() => { setRegistering(!registering); setErrorMsg(''); setSuccessMsg(''); }}
          >
            {registering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </button>
          {!registering && (
            <button
              type="button"
              disabled={loading}
              className="text-emerald-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              onClick={() => { setOtpUsername(email.trim()); setOtpMode('registration'); setOtpCode(''); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Nhập OTP xác nhận đăng ký
            </button>
          )}
        </div>
      )}

      {otpUsername ? (
        <form onSubmit={verifyRegistrationEmail} className={`space-y-4 ${loading ? 'pointer-events-none opacity-80' : ''}`}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {otpMode === 'login' ? 'Nhập mã 6 chữ số đã gửi tới email liên hệ để hoàn tất đăng nhập.' : 'Nhập tài khoản và mã 6 chữ số do Admin gửi tới email liên hệ.'}
          </p>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Tên tài khoản
            <input
              required
              disabled={loading}
              autoComplete="username"
              value={otpUsername}
              onChange={e => setOtpUsername(e.target.value)}
              className="mt-2 w-full h-11 px-3 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Mã OTP
            <input
              required
              disabled={loading}
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              autoComplete="one-time-code"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-2 w-full h-11 px-3 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
            />
          </label>
          {successMsg && <p role="status" className="text-sm text-emerald-700">{successMsg}</p>}
          {errorMsg && <p role="alert" className="text-sm text-rose-600">{errorMsg}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full h-11 rounded-md bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors ${loading ? 'cursor-not-allowed opacity-75' : 'hover:bg-emerald-700 active:bg-emerald-800 cursor-pointer'}`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>{otpMode === 'login' ? 'Đang xác thực OTP...' : 'Đang xác nhận...'}</span>
              </>
            ) : (
              <span>{otpMode === 'login' ? 'Xác nhận và đăng nhập' : 'Xác nhận email'}</span>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className={`space-y-5 ${loading ? 'cursor-not-allowed' : ''}`}>
          <fieldset disabled={loading} className="space-y-5">
            {registering && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Họ và tên
                <input
                  required
                  disabled={loading}
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ"
                  className="mt-1.5 w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed transition-colors"
                />
              </label>
            )}
            {registering && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email liên hệ
                <input
                  required
                  disabled={loading}
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="ten@gmail.com"
                  className="mt-1.5 w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed transition-colors"
                />
              </label>
            )}
            {/* Username / Email field */}
            <div>
              <label htmlFor="login-account" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Tên tài khoản
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  id="login-account"
                  type="text"
                  required
                  disabled={loading}
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập tên tài khoản, ví dụ: tuanhoang"
                  className="w-full h-11 sm:h-10 pl-9 pr-3 text-base sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed transition-colors"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  minLength={registering ? 12 : undefined}
                  maxLength={72}
                  autoComplete={registering ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full h-11 sm:h-10 pl-9 pr-10 text-base sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed transition-colors"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:cursor-not-allowed transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs pt-0.5">
              <label className={`min-h-11 flex items-center gap-2 text-slate-600 dark:text-slate-300 select-none ${loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  disabled={loading}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 disabled:cursor-not-allowed"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <button
                type="button"
                disabled={loading}
                onClick={() => addToast('Vui lòng liên hệ Quản trị viên Khối CNTT Goldsun Packaging để cấp lại mật khẩu.', 'info', 4500)}
                className="min-h-11 flex items-center text-emerald-700 dark:text-emerald-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>
          </fieldset>

          {/* Error notification banner */}
          {errorMsg && (
            <div role="alert" className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <p role="status" className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successMsg}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full h-11 sm:h-10 mt-1 px-4 rounded-md bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
              loading
                ? 'opacity-75 cursor-not-allowed select-none'
                : 'hover:bg-emerald-700 active:bg-emerald-800 cursor-pointer'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>{registering ? "Đang tạo tài khoản..." : "Đang xác thực..."}</span>
              </>
            ) : (
              <>
                <span>{registering ? "Tạo tài khoản học viên" : "Đăng nhập hệ thống"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}


    </div>
  );
}


