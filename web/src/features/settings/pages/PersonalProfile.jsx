import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Camera,
  Mail,
  Phone,
  Sparkles,
  Trash2,
  Calendar,
  Save,
  Building2,
  ShieldCheck,
  Briefcase,
  Check,
  ExternalLink,
} from 'lucide-react';
import Button from '../../../shared/ui/Button';
import Modal from '../../../shared/ui/Modal';
import { useAuth } from '../../../shared/hooks/useAuth';
import { authService } from '../../../services/auth/auth.service';
import { SYSTEM_AVATARS, svgToJpegBase64 } from '../constants/systemAvatars';

const getFields = user => ({
  RowVersion: user?.RowVersion,
  name: user?.name || '',
  email: user?.email?.includes('@') ? user.email : '',
  phone: user?.phone || '',
  birthDate: user?.birthDate || '',
  avatarUrl: user?.avatarUrl || '',
});

export default function PersonalProfile() {
  const { currentUser: user, refreshUser } = useAuth();
  const [draft, setDraft] = useState(() => getFields(user));
  const initialRef = useRef(getFields(user));
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [avatarCategory, setAvatarCategory] = useState('Chân dung tối giản');
  const uploadInputRef = useRef(null);

  useEffect(() => {
    const f = getFields(user);
    setDraft(f);
    initialRef.current = f;
  }, [user.name, user.email, user.phone, user.birthDate, user.avatarUrl]);

  // Synchronize avatar immediately if saved from Avatar Studio in another tab
  useEffect(() => {
    const handleStorage = async e => {
      if (e.key === 'skillhub_avatar_updated') {
        try {
          if (refreshUser) await refreshUser();
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshUser]);

  const isDirty = useMemo(() => {
    const init = initialRef.current;
    return (
      draft.name !== init.name ||
      draft.email !== init.email ||
      draft.phone !== init.phone ||
      draft.birthDate !== init.birthDate ||
      draft.avatarUrl !== init.avatarUrl
    );
  }, [draft]);

  const update = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setMessage('');
    setError('');
  };

  // Upload local image & convert to compact base64 JPEG (128x128 px, <= 45KB for Go backend)
  const handleAvatarFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Vui lòng chọn ảnh định dạng JPG, PNG hoặc WebP tối đa 5MB.');
      return;
    }

    setReading(true);
    let url;
    try {
      url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const side = Math.min(img.width, img.height);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 128, 128);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);

      const result = canvas.toDataURL('image/jpeg', 0.85);
      if (result.length > 44000) throw new Error();
      update('avatarUrl', result);
    } catch {
      setError('Không thể xử lý ảnh này. Vui lòng chọn ảnh khác.');
    } finally {
      if (url) URL.revokeObjectURL(url);
      setReading(false);
    }
  };

  // Handle selection of a predefined system avatar (convert local SVG to compact JPEG Base64)
  const handleSelectSystemAvatar = async avatarItem => {
    try {
      setConverting(true);
      setError('');
      const base64Jpeg = await svgToJpegBase64(avatarItem.svg, 128);
      update('avatarUrl', base64Jpeg);
      setShowSystemModal(false);
    } catch (err) {
      setError('Không thể xử lý avatar hệ thống. Vui lòng thử lại.');
    } finally {
      setConverting(false);
    }
  };

  const handleSave = async event => {
    if (event?.preventDefault) event.preventDefault();
    if (busy || reading || converting) return;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await authService.updateProfile(draft);
      const nextRowVersion = result?.RowVersion || draft.RowVersion;
      setDraft(prev => ({ ...prev, RowVersion: nextRowVersion }));
      initialRef.current = { ...draft, RowVersion: nextRowVersion };
      setMessage('Đã lưu hồ sơ cá nhân và ảnh đại diện lên hệ thống thành công.');
      try {
        await refreshUser();
      } catch {}
    } catch (err) {
      setError(err.message || 'Không thể cập nhật hồ sơ cá nhân.');
    } finally {
      setBusy(false);
    }
  };

  const initials = (draft.name || user.username || 'U')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(p => p[0])
    .join('')
    .toLocaleUpperCase('vi');

  const categories = ['Tất cả', 'Chân dung tối giản', 'Biểu cảm hài', 'Robot thông minh', 'Kỹ thuật', 'Cá tính', 'Động vật'];
  const filteredAvatars = avatarCategory === 'Tất cả'
    ? SYSTEM_AVATARS
    : SYSTEM_AVATARS.filter(a => a.category === avatarCategory);

  const assignedGroups = user.assignedGroups || [];

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-950">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Hồ sơ cá nhân
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản lý thông tin định danh, liên hệ và tài khoản người dùng của bạn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={Save}
            disabled={!isDirty || busy || reading || converting}
            loading={busy}
            onClick={handleSave}
          >
            Lưu thay đổi
          </Button>
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
        <form onSubmit={handleSave} className="max-w-4xl space-y-0">
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

          {/* 1. HÀNG ẢNH ĐẠI DIỆN */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Ảnh đại diện
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Ảnh đại diện lưu trên hồ sơ tài khoản đào tạo & khảo thí.
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-14 h-14 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {draft.avatarUrl ? (
                  <img src={draft.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base font-bold text-slate-600 dark:text-slate-300">
                    {initials}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
                <Button
                  size="sm"
                  variant="outline"
                  icon={Camera}
                  type="button"
                  disabled={reading || busy || converting}
                  onClick={() => uploadInputRef.current?.click()}
                >
                  {reading ? 'Đang xử lý…' : 'Tải ảnh lên'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Sparkles}
                  type="button"
                  disabled={busy || converting}
                  onClick={() => {
                    setAvatarCategory('Chân dung tối giản');
                    setShowSystemModal(true);
                  }}
                >
                  Avatar hệ thống
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={ExternalLink}
                  type="button"
                  onClick={() => window.open('/app/settings/avatar-studio', '_blank')}
                  title="Mở trình tùy chỉnh avatar độc quyền trên tab mới"
                >
                  Tự tạo avatar (Tab mới) ↗
                </Button>
                {draft.avatarUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    type="button"
                    disabled={busy || converting}
                    onClick={() => update('avatarUrl', '')}
                    className="text-slate-400 hover:text-rose-600"
                    title="Gỡ ảnh về chữ cái mặc định"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 2. HÀNG TÊN ĐĂNG NHẬP */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Tên đăng nhập
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mã định danh tài khoản duy nhất của bạn.
              </span>
            </div>
            <div>
              <span className="inline-block px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                @{user.username}
              </span>
            </div>
          </div>

          {/* 3. HÀNG HỌ VÀ TÊN */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <label htmlFor="user-fullname" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tên đầy đủ hiển thị trên báo cáo và kết quả đánh giá.
              </span>
            </div>
            <div className="max-w-md w-full">
              <input
                id="user-fullname"
                required
                maxLength={120}
                disabled={busy}
                value={draft.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 4. HÀNG EMAIL */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <label htmlFor="user-email" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Email liên hệ <span className="text-rose-500">*</span>
              </label>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Địa chỉ nhận thông báo và thông tin học tập.
              </span>
            </div>
            <div className="max-w-md w-full">
              <input
                id="user-email"
                type="email"
                required
                maxLength={254}
                disabled={busy}
                value={draft.email}
                onChange={e => update('email', e.target.value)}
                placeholder="ten@congty.com"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 5. HÀNG SỐ ĐIỆN THOẠI */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <label htmlFor="user-phone" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Số điện thoại
              </label>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Số điện thoại di động để trao đổi nội bộ.
              </span>
            </div>
            <div className="max-w-md w-full">
              <input
                id="user-phone"
                type="tel"
                maxLength={30}
                disabled={busy}
                value={draft.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="0912 345 678"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 6. HÀNG NGÀY SINH */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <label htmlFor="user-birthdate" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Ngày sinh
              </label>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Thông tin ngày tháng năm sinh của nhân sự.
              </span>
            </div>
            <div className="max-w-md w-full">
              <input
                id="user-birthdate"
                type="date"
                min="1900-01-01"
                max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })}
                disabled={busy}
                value={draft.birthDate}
                onChange={e => update('birthDate', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 7. HÀNG CÔNG TÁC & VỊ TRÍ (Chỉ đọc) */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-start gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Vị trí công tác
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Thông tin phân công bởi Quản trị viên hệ thống.
              </span>
            </div>
            <div className="max-w-md w-full grid grid-cols-2 gap-4 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                <span className="text-slate-400 block mb-1">Phòng ban</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {user.department || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                <span className="text-slate-400 block mb-1">Vị trí</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {user.position || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                <span className="text-slate-400 block mb-1">Chức danh</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {user.jobRole || user.job_role || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                <span className="text-slate-400 block mb-1">Vai trò hệ thống</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                  {user.roleName || user.role || 'Nhân viên'}
                </span>
              </div>
            </div>
          </div>

          {/* 8. HÀNG NHÓM QUYỀN HỆ THỐNG */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-start gap-6 py-5">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Nhóm quyền phân bổ
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Các quyền hạn được kích hoạt cho tài khoản này.
              </span>
            </div>
            <div className="max-w-md w-full">
              <div className="flex flex-wrap gap-2">
                {assignedGroups.length > 0 ? (
                  assignedGroups.map(group => (
                    <span
                      key={group.key || group}
                      className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      {group.label || group}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Chưa được gán nhóm quyền riêng.</span>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Chọn Avatar Hệ Thống (Local SVG, 0ms latency, converts to lightweight JPEG Base64) */}
      <Modal
        open={showSystemModal}
        onClose={() => setShowSystemModal(false)}
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                Bộ sưu tập Avatar hệ thống
              </span>
              <span className="font-normal text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                Avatar vector tải tức thì, tự động nén siêu nhẹ (~3KB) và lưu vĩnh viễn trên cơ sở dữ liệu.
              </span>
            </div>
          </div>
        }
        size="lg"
        density="comfortable"
        footer={
          <div className="w-full flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {filteredAvatars.length} mẫu hiển thị · Định dạng JPEG Base64 tối ưu
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowSystemModal(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-3">
            {categories.map(cat => {
              const count = cat === 'Tất cả'
                ? SYSTEM_AVATARS.length
                : SYSTEM_AVATARS.filter(a => a.category === cat).length;
              const isSelected = avatarCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAvatarCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid of Avatars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredAvatars.map(avatar => {
              return (
                <button
                  key={avatar.id}
                  type="button"
                  disabled={converting}
                  onClick={() => handleSelectSystemAvatar(avatar)}
                  className="group relative flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer text-center"
                >
                  <div
                    className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center p-0.5 shadow-2xs transition-transform duration-200 group-hover:scale-105"
                    dangerouslySetInnerHTML={{ __html: avatar.svg }}
                  />
                  <div className="w-full">
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {avatar.name}
                    </span>
                    <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                      {avatar.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
