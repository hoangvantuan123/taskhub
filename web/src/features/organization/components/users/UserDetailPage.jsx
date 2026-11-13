import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  KeyRound,
  Lock,
  Unlock,
  Shield,
  Clock,
  UserCheck,
  UserX,
  Search,
  RotateCcw,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  Trash2,
} from 'lucide-react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import Modal from '../../../../shared/ui/Modal';
import Button from '../../../../shared/ui/Button';
import Select from '../../../../shared/ui/Select';
import SearchInput from '../../../../shared/ui/SearchInput';
import { kindNames, formatDate } from '../../constants/userManagement.constants';
import { normalizeOptionSearch } from '../../../../shared/lib/searchOptions';
import { taskService } from '../../../tasks/services/taskService';

/**
 * Generate a cryptographically strong random password for new user account
 */
function generateStrongPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%!';
  const all = upper + lower + digits + symbols;
  let pass = '';
  pass += upper[Math.floor(Math.random() * upper.length)];
  pass += lower[Math.floor(Math.random() * lower.length)];
  pass += digits[Math.floor(Math.random() * digits.length)];
  pass += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 10; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }
  return pass;
}

/**
 * Compares two user drafts for equality to detect unsaved changes
 */
function isUserDraftEqual(a, b, isCreate) {
  if (!a || !b) return a === b;
  if ((a.username || '') !== (b.username || '')) return false;
  if ((a.name || '') !== (b.name || '')) return false;
  if ((a.contact_email || a.email || '') !== (b.contact_email || b.email || '')) return false;
  if ((a.phone || '') !== (b.phone || '')) return false;
  if ((a.department || '') !== (b.department || '')) return false;
  if ((a.position || '') !== (b.position || '')) return false;
  if ((a.job_role || '') !== (b.job_role || '')) return false;
  if (Boolean(a.enabled) !== Boolean(b.enabled)) return false;

  if (isCreate && (a.password || '') !== (b.password || '')) return false;

  const manA = Array.isArray(a.manual_groups) ? [...a.manual_groups].sort() : [];
  const manB = Array.isArray(b.manual_groups) ? [...b.manual_groups].sort() : [];
  if (manA.length !== manB.length) return false;
  return manA.every((g, idx) => g === manB[idx]);
}

export default function UserDetailPage({
  user,
  isCreate = false,
  onChange,
  onSave,
  onToggleLock,
  onOpenPassword,
  onDelete,
  onBack,
  directory = [],
  groups = [],
  busy = false,
  canUpdate = true,
}) {
  // Store initial snapshot for dirty checking
  const initialDraftRef = useRef(null);
  if (!initialDraftRef.current && user) {
    initialDraftRef.current = {
      ...user,
      manual_groups: [...(user.manual_groups || [])],
      groups: [...(user.groups || [])],
    };
  }

  const [groupSearch, setGroupSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    taskService.getEmployees().then(list => setEmployees(list || []));
  }, []);

  // Check if draft has unsaved changes
  const isDirty = useMemo(() => {
    return !isUserDraftEqual(user, initialDraftRef.current, isCreate);
  }, [user, isCreate]);

  // Warn on browser tab reload/close if dirty
  useEffect(() => {
    const handleBeforeUnload = e => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && !showUnsavedModal) {
        handleAttemptBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, showUnsavedModal]);

  const handleAttemptBack = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    onBack();
  };

  const update = (key, value) => {
    onChange({ ...user, [key]: value });
  };

  const options = kind =>
    directory.filter(d => d.kind === kind).map(d => ({ value: d.key, label: d.label }));

  const orgName = (kind, key) =>
    directory.find(d => d.kind === kind && d.key === key)?.label || key || '—';

  // Compute organizational groups (groups that match user's department, position, or job_role)
  const orgGroupKeys = useMemo(() => {
    const matched = new Set();
    groups.forEach(g => {
      if (
        (user.department && g.department === user.department) ||
        (user.position && g.position === user.position) ||
        (user.job_role && g.job_role === user.job_role)
      ) {
        matched.add(g.key);
      }
    });
    return matched;
  }, [groups, user.department, user.position, user.job_role]);

  // Compute all effective groups for this user
  const effectiveGroupKeys = useMemo(() => {
    return new Set([...orgGroupKeys, ...(user.manual_groups || [])]);
  }, [orgGroupKeys, user.manual_groups]);

  // Filtered group list for the permission group table
  const filteredGroups = useMemo(() => {
    const q = normalizeOptionSearch(groupSearch);
    return groups.filter(g => {
      if (!q) return true;
      return normalizeOptionSearch([g.key, g.label, g.department, g.position, g.job_role].join(' ')).includes(q);
    });
  }, [groups, groupSearch]);

  const toggleManualGroup = groupKey => {
    if (!canUpdate || busy) return;
    const current = user.manual_groups || [];
    const next = current.includes(groupKey)
      ? current.filter(k => k !== groupKey)
      : [...current, groupKey];
    update('manual_groups', next);
  };

  const handleSaveClick = async () => {
    setError('');
    const cleanUsername = (user.username || '').trim().toLowerCase();
    const cleanName = (user.name || '').trim();
    const cleanEmail = (user.contact_email || user.email || '').trim();

    if (!cleanUsername) {
      setError('Tên đăng nhập không được để trống.');
      return;
    }
    if (!/^[a-z0-9][a-z0-9._@+-]{2,63}$/.test(cleanUsername)) {
      setError('Tên đăng nhập cần 3–64 ký tự: chữ thường, số, hoặc . _ @ + -');
      return;
    }
    if (!cleanName || cleanName.length < 2) {
      setError('Họ và tên cần tối thiểu 2 ký tự.');
      return;
    }
    if (isCreate) {
      if (!user.password || user.password.length < 12) {
        setError('Mật khẩu khởi tạo cần tối thiểu 12 ký tự.');
        return;
      }
    }

    try {
      const payload = {
        ...user,
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
        contact_email: cleanEmail,
        phone: (user.phone || '').trim(),
      };
      await onSave(payload, {
        initialSnapshot: initialDraftRef.current,
        isCreate,
      });
      initialDraftRef.current = {
        ...payload,
        manual_groups: [...(payload.manual_groups || [])],
      };
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu thông tin tài khoản');
    }
  };

  return (
    <>
      <ManagementFrame
        className="h-full"
        scrollableContent={false}
        header={
          <div className="flex flex-wrap items-center justify-between w-full gap-3 py-2">
            {/* Left: Back button & Header Info */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                icon={ArrowLeft}
                disabled={busy}
                onClick={handleAttemptBack}
                title="Quay lại danh sách tài khoản"
              >
                Quay lại
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {user.name || (isCreate ? 'Thêm tài khoản mới' : user.username)}
                  </h2>
                  {!isCreate && (
                    user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Shield size={11} /> Quản trị viên
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Người dùng
                      </span>
                    )
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    @{user.username || 'tên_đăng_nhập'}
                  </span>
                  <span>·</span>
                  <span>{user.contact_email || user.email || 'Chưa có email'}</span>
                  <span>·</span>
                  <span
                    className={
                      user.enabled
                        ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                        : 'text-rose-600 dark:text-rose-400 font-medium'
                    }
                  >
                    {user.enabled ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                  {!isCreate && user.created_at && (
                    <>
                      <span>·</span>
                      <span>Tạo: {formatDate(user.created_at)}</span>
                    </>
                  )}
                  {isDirty && (
                    <>
                      <span>·</span>
                      <span className="text-amber-600 dark:text-amber-400 italic">
                        (Có thay đổi chưa lưu)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={handleAttemptBack}
              >
                Hủy
              </Button>

              {!isCreate && canUpdate && onOpenPassword && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  disabled={busy}
                  onClick={() => onOpenPassword(user)}
                >
                  <KeyRound size={14} className="mr-1 inline" /> Đổi mật khẩu
                </Button>
              )}

              {!isCreate && canUpdate && onToggleLock && (
                <Button
                  size="sm"
                  variant="outline"
                  className={
                    user.enabled
                      ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }
                  disabled={busy || (user.role === 'admin' && user.enabled)}
                  onClick={() => onToggleLock(user)}
                  title={user.role === 'admin' && user.enabled ? 'Không thể khóa tài khoản quản trị viên' : undefined}
                >
                  {user.enabled ? (
                    <>
                      <Lock size={14} className="mr-1 inline" /> Khóa tài khoản
                    </>
                  ) : (
                    <>
                      <Unlock size={14} className="mr-1 inline" /> Mở khóa
                    </>
                  )}
                </Button>
              )}

              {!isCreate && canUpdate && onDelete && user.role !== 'admin' && user.username !== 'admin' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  disabled={busy}
                  onClick={() => onDelete(user)}
                >
                  <Trash2 size={14} className="mr-1 inline" /> Xóa tài khoản
                </Button>
              )}

              {canUpdate && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy || (!isCreate && !isDirty)}
                  onClick={handleSaveClick}
                  title={!isCreate && !isDirty ? 'Không có thay đổi mới để lưu' : undefined}
                >
                  {isCreate ? 'Tạo tài khoản' : 'Lưu thay đổi'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        {error && (
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Full Page Content: 2-Column Split Layout Edge-to-Edge */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950">
          {/* Left Column: Basic Information (Seamless outline typography without boxed cards) */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Thông tin cơ bản
              </h3>

              <div className="divide-y divide-slate-100 mt-4 dark:divide-slate-800">
                {/* 0. Gắn với Hồ sơ Nhân sự */}
                <div className="py-2.5 first:pt-0 bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 mb-2">
                  <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    Gắn với Hồ sơ Nhân sự (Employee Profile)
                  </label>
                  <select
                    className="w-full h-8 px-2 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none"
                    value={employees.find(e => e.fullName === user.name || e.email === (user.contact_email || user.email))?.code || ''}
                    onChange={e => {
                      const emp = employees.find(em => em.code === e.target.value);
                      if (emp) {
                        update('name', emp.fullName);
                        update('contact_email', emp.email || '');
                        update('phone', emp.phone || '');
                        update('department', emp.department || '');
                        update('position', emp.position || '');
                        if (isCreate && (!user.username || user.username.startsWith('nv-')) && emp.email) {
                          const autoU = emp.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '');
                          update('username', autoU);
                        }
                      }
                    }}
                  >
                    <option value="">-- Chọn hồ sơ nhân sự để liên kết tài khoản --</option>
                    {employees.map(emp => (
                      <option key={emp.id || emp.code} value={emp.code}>
                        [{emp.code}] {emp.fullName} - {emp.position} ({emp.department})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                    Khi chọn nhân sự, thông tin Tên, Email, Điện thoại, Phòng ban và Vị trí sẽ tự động đồng bộ.
                  </p>
                </div>

                {/* 1. Tên đăng nhập */}
                <div className="py-2.5 first:pt-0">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  {isCreate ? (
                    <input
                      aria-label="Tên đăng nhập"
                      required
                      minLength={3}
                      maxLength={64}
                      disabled={!canUpdate || busy}
                      value={user.username || ''}
                      onChange={e =>
                        update('username', e.target.value.toLowerCase().replace(/[^a-z0-9._@+-]/g, ''))
                      }
                      placeholder="VD: nguyen_van_a"
                      className="w-full h-8 px-0 border-0 bg-transparent font-mono text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                    />
                  ) : (
                    <div className="h-8 flex items-center font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                      @{user.username}
                    </div>
                  )}
                  {isCreate && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      3–64 ký tự chữ thường, số, dấu chấm hoặc gạch dưới
                    </p>
                  )}
                </div>

                {/* 2. Họ và tên */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Họ và tên"
                    required
                    maxLength={120}
                    disabled={!canUpdate || busy}
                    value={user.name || ''}
                    onChange={e => update('name', e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full h-8 px-0 border-0 bg-transparent font-sans text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* 3. Email liên hệ */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Email liên hệ"
                    type="email"
                    required
                    maxLength={254}
                    disabled={!canUpdate || busy}
                    value={user.contact_email || user.email || ''}
                    onChange={e => update('contact_email', e.target.value)}
                    placeholder="ten@gmail.com"
                    className="w-full h-8 px-0 border-0 bg-transparent font-sans text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* 4. Mật khẩu khởi tạo (Chỉ khi tạo mới) */}
                {isCreate && (
                  <div className="py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => update('password', generateStrongPassword())}
                        className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} /> Tạo ngẫu nhiên
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        aria-label="Mật khẩu khởi tạo"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={12}
                        maxLength={72}
                        disabled={!canUpdate || busy}
                        value={user.password || ''}
                        onChange={e => update('password', e.target.value)}
                        placeholder="Tối thiểu 12 ký tự"
                        className="w-full h-8 pl-0 pr-8 border-0 bg-transparent font-mono text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Số điện thoại */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    aria-label="Số điện thoại"
                    type="tel"
                    maxLength={32}
                    disabled={!canUpdate || busy}
                    value={user.phone || ''}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full h-8 px-0 border-0 bg-transparent font-sans text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* 6. Trạng thái */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Trạng thái
                  </label>
                  <div className="h-8 flex items-center">
                    <Select
                      size="sm"
                      searchable={false}
                      disabled={!canUpdate || busy || (user.role === 'admin' && user.enabled)}
                      value={String(user.enabled)}
                      onChange={e => {
                        const val = typeof e === 'object' && e?.target ? e.target.value : e;
                        update('enabled', val === 'true');
                      }}
                      options={[
                        { value: 'true', label: 'Hoạt động' },
                        { value: 'false', label: 'Tạm khóa' },
                      ]}
                      className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Organization Structure & Permission Groups Canvas (Edge-to-Edge) */}
          <main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white dark:bg-slate-950">
            {/* Top Section: Cơ cấu tổ chức & Vị trí công tác */}
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 bg-white dark:bg-slate-950">
              <div className="mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Cơ cấu tổ chức & Vị trí công tác
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {kindNames.department}
                  </label>
                  <Select
                    size="sm"
                    searchable
                    disabled={!canUpdate || busy}
                    value={user.department || ''}
                    onChange={e => update('department', e?.target?.value ?? e)}
                    options={[{ value: '', label: 'Chưa phân bổ phòng ban' }, ...options('department')]}
                    className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                  />
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {kindNames.position}
                  </label>
                  <Select
                    size="sm"
                    searchable
                    disabled={!canUpdate || busy}
                    value={user.position || ''}
                    onChange={e => update('position', e?.target?.value ?? e)}
                    options={[{ value: '', label: 'Chưa phân bổ vị trí' }, ...options('position')]}
                    className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                  />
                </div>

                {/* Job Role */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {kindNames.job_role}
                  </label>
                  <Select
                    size="sm"
                    searchable
                    disabled={!canUpdate || busy}
                    value={user.job_role || ''}
                    onChange={e => update('job_role', e?.target?.value ?? e)}
                    options={[{ value: '', label: 'Chưa phân bổ vai trò' }, ...options('job_role')]}
                    className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Section: Permission Groups Table */}
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              {/* Table Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Phân bổ nhóm quyền
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-xs text-slate-500">
                    Đang thuộc <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{effectiveGroupKeys.size}</strong> nhóm quyền (
                    {(user.manual_groups || []).length} gán trực tiếp
                    {orgGroupKeys.size > 0 && `, ${orgGroupKeys.size} theo tổ chức`})
                  </span>
                </div>

                <div className="w-64 max-w-full">
                  <SearchInput
                    size="sm"
                    value={groupSearch}
                    onChange={e => setGroupSearch(typeof e === 'string' ? e : e?.target?.value ?? '')}
                    onClear={() => setGroupSearch('')}
                    placeholder="Tìm nhóm quyền…"
                  />
                </div>
              </div>

              {/* Fixed Header: Structurally outside the scrollable viewport, never shifts or jitters */}
              <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider select-none">
                <div className="grid grid-cols-[56px_240px_160px_minmax(0,1fr)_120px] items-center">
                  <div className="px-4 py-2.5 text-center">Gán</div>
                  <div className="px-3 py-2.5">Tên nhóm quyền</div>
                  <div className="px-3 py-2.5">Mã kỹ thuật</div>
                  <div className="px-3 py-2.5">Cơ chế cấp quyền</div>
                  <div className="px-6 py-2.5 text-right">Trạng thái</div>
                </div>
              </div>

              {/* Scrollable Body: Only the rows scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredGroups.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    Không tìm thấy nhóm quyền nào.
                  </div>
                ) : (
                  filteredGroups.map(group => {
                    const isManual = (user.manual_groups || []).includes(group.key);
                    const isOrg = orgGroupKeys.has(group.key);
                    const isEffective = isManual || isOrg;

                    return (
                      <div
                        key={group.key}
                        onClick={() => toggleManualGroup(group.key)}
                        className={`grid grid-cols-[56px_240px_160px_minmax(0,1fr)_120px] items-center transition-colors cursor-pointer select-none ${
                          isEffective
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                        } ${!canUpdate ? 'cursor-default' : ''}`}
                      >
                        {/* Checkbox */}
                        <div
                          className="px-4 py-3 text-center flex items-center justify-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            disabled={!canUpdate || busy}
                            checked={isManual}
                            onChange={() => toggleManualGroup(group.key)}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Tên nhóm quyền */}
                        <div className="px-3 py-3 min-w-0">
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">
                            {group.label}
                          </span>
                        </div>

                        {/* Mã kỹ thuật (@key) */}
                        <div className="px-3 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 truncate">
                          @{group.key}
                        </div>

                        {/* Cơ chế cấp quyền */}
                        <div className="px-3 py-3 text-xs min-w-0">
                          {isOrg && isManual ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              ✓ Theo tổ chức & Gán trực tiếp
                            </span>
                          ) : isOrg ? (
                            <span className="text-blue-700 dark:text-blue-400 font-medium">
                              Theo tổ chức ({[
                                group.department && orgName('department', group.department),
                                group.position && orgName('position', group.position),
                                group.job_role && orgName('job_role', group.job_role),
                              ].filter(Boolean).join(' · ')})
                            </span>
                          ) : isManual ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Gán thủ công trực tiếp
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>

                        {/* Trạng thái nhóm quyền */}
                        <div className="px-6 py-3 text-right text-xs">
                          {group.enabled ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="text-slate-400">Tạm ngưng</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </main>
        </div>
      </ManagementFrame>

      {/* Unsaved Changes Confirmation Modal */}
      <Modal
        open={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        title="Thay đổi chưa được lưu"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setShowUnsavedModal(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={handleConfirmLeave}
            >
              Rời khỏi trang
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Bạn có những thay đổi thông tin tài khoản chưa được lưu. Nếu quay lại danh sách bây giờ, toàn bộ chỉnh sửa sẽ bị mất. Bạn có chắc chắn muốn quay lại?
        </p>
      </Modal>
    </>
  );
}
