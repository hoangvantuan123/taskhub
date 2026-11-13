import React, { useEffect, useState } from 'react';
import { Table2, Clock3, Save, RotateCcw, Monitor, Palette, Check } from 'lucide-react';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import { DEFAULT_TABLE_HEIGHT, saveTablePreferences, useTablePreferences } from '../../../shared/lib/tablePreferences';
import {
  SIDEBAR_THEMES,
  getSidebarThemeConfig,
  saveSidebarTheme,
  applySidebarTheme,
  isColorLight,
} from '../../../shared/lib/sidebarTheme';

export default function TableDisplaySettings() {
  const preferences = useTablePreferences();
  const [height, setHeight] = useState(preferences.rowHeight);
  const [timezone, setTimezone] = useState(preferences.timezone || 'Asia/Ho_Chi_Minh');
  const [sidebarTheme, setSidebarTheme] = useState(() => getSidebarThemeConfig().themeId);
  const [customColor, setCustomColor] = useState(() => getSidebarThemeConfig().customColor);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now] = useState(() => new Date());

  useEffect(() => {
    setHeight(preferences.rowHeight);
    setTimezone(preferences.timezone || 'Asia/Ho_Chi_Minh');
  }, [preferences.rowHeight, preferences.timezone]);

  const save = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveTablePreferences(Number(height), timezone);
      saveSidebarTheme(sidebarTheme, customColor);
      setMessage('Đã lưu cấu hình giao diện thành công.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setHeight(DEFAULT_TABLE_HEIGHT);
    setTimezone('Asia/Ho_Chi_Minh');
    setSidebarTheme('light-gray');
    setCustomColor('#ebf0f5');
    saveSidebarTheme('light-gray', '');
    setMessage('Đã khôi phục cài đặt mặc định (Thanh điều hướng xám trắng #ebf0f5).');
  };

  const previewHeight = Math.min(64, Math.max(36, Number(height) || 44));
  const date = now.toLocaleString('vi-VN', { timeZone: timezone });
  const activeThemeObj = SIDEBAR_THEMES.find((t) => t.id === sidebarTheme);
  const currentSidebarBg = sidebarTheme === 'custom' ? customColor : (activeThemeObj?.color || '#ebf0f5');

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-950">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Giao diện & Hiển thị
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tùy chỉnh màu sắc thanh điều hướng, mật độ hiển thị bảng dữ liệu và múi giờ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={RotateCcw}
            disabled={saving}
            onClick={handleReset}
          >
            Mặc định
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={Save}
            disabled={saving}
            loading={saving}
            onClick={save}
          >
            Lưu giao diện
          </Button>
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
        <form onSubmit={save} className="max-w-4xl space-y-0">
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

          {/* 1. MÀU THANH ĐIỀU HƯỚNG */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-start gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Thanh điều hướng (Sidebar)
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tông màu mặc định là xám trắng. Bạn có thể chọn bất kỳ màu nào.
              </span>
            </div>
            <div className="max-w-md w-full">
              <div className="flex flex-wrap items-center gap-2.5">
                {SIDEBAR_THEMES.map((theme) => {
                  const isSelected = sidebarTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      title={`${theme.label} (${theme.color})`}
                      onClick={() => {
                        setSidebarTheme(theme.id);
                        applySidebarTheme(theme.id, customColor);
                      }}
                      className={`h-9 w-9 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                          : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: theme.color }}
                    >
                      {isSelected && (
                        <Check
                          size={15}
                          strokeWidth={2.5}
                          className={theme.isLight ? 'text-slate-900' : 'text-white'}
                        />
                      )}
                    </button>
                  );
                })}

                {/* Custom Color Option */}
                <label
                  title={`Màu tùy chọn (${customColor})`}
                  className={`h-9 w-9 rounded-lg border flex items-center justify-center cursor-pointer relative overflow-hidden ${
                    sidebarTheme === 'custom'
                      ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                      : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: customColor }}
                >
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setSidebarTheme('custom');
                      applySidebarTheme('custom', e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  {sidebarTheme === 'custom' ? (
                    <Check
                      size={15}
                      strokeWidth={2.5}
                      className={isColorLight(customColor) ? 'text-slate-900' : 'text-white'}
                    />
                  ) : (
                    <Palette
                      size={14}
                      className={isColorLight(customColor) ? 'text-slate-700' : 'text-white'}
                    />
                  )}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                Tông màu: <strong className="text-slate-800 dark:text-slate-200">{sidebarTheme === 'custom' ? customColor : (activeThemeObj?.label || 'Xám trắng')}</strong>
              </p>
            </div>
          </div>

          {/* 2. MẬT ĐỘ BẢNG DỮ LIỆU */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Mật độ hiển thị bảng
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Khoảng cách giữa các dòng trên toàn bộ các bảng trong hệ thống.
              </span>
            </div>
            <div className="max-w-md w-full">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  [36, 'Gọn', '36px'],
                  [44, 'Tiêu chuẩn', '44px'],
                  [56, 'Thoáng', '56px'],
                ].map(([val, lbl, px]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setHeight(val)}
                    className={`py-2 px-2 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                      Number(height) === val
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-medium">{lbl}</span>
                    <span className="text-[11px] opacity-70 font-mono mt-0.5">{px}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. MÚI GIỜ */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-center gap-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Múi giờ hiển thị
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Định dạng giờ cho các sự kiện đăng nhập và lịch sử audit.
              </span>
            </div>
            <div className="max-w-md w-full">
              <Select
                size="sm"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={[
                  { value: 'Asia/Ho_Chi_Minh', label: 'Giờ Việt Nam (UTC+07:00)' },
                  { value: 'UTC', label: 'Giờ quốc tế (UTC)' },
                ]}
                className="w-full text-xs"
              />
            </div>
          </div>

          {/* 4. XEM TRƯỚC GIAO DIỆN */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] items-start gap-6 py-5">
            <div>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Xem trước giao diện
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mô phỏng màu thanh điều hướng và bảng dữ liệu theo cấu hình.
              </span>
            </div>
            <div className="max-w-md w-full space-y-3.5">
              {/* Mini Sidebar Preview */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                <div
                  className="w-9 h-16 rounded-md border border-slate-700/20 flex flex-col items-center justify-between py-1.5 shrink-0 shadow-2xs transition-colors"
                  style={{ backgroundColor: currentSidebarBg }}
                >
                  <div className="w-4 h-4 rounded bg-white text-[9px] font-bold text-slate-900 grid place-items-center">
                    S
                  </div>
                  <div className="w-3.5 h-3.5 rounded bg-white text-slate-900 text-[8px] font-bold grid place-items-center">
                    ●
                  </div>
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                    Thanh điều hướng Sidebar
                  </span>
                  <span>Màu: <strong className="text-slate-900 dark:text-white font-mono">{sidebarTheme === 'custom' ? customColor : (activeThemeObj?.label || 'Xám trắng')}</strong></span>
                </div>
              </div>

              {/* Table preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2 font-medium">Hoạt động mẫu</th>
                      <th className="px-3.5 py-2 font-medium">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Đăng nhập hệ thống', 'Lưu cấu hình giao diện'].map((action) => (
                      <tr
                        key={action}
                        style={{ height: previewHeight }}
                        className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <td className="px-3.5 font-medium text-slate-800 dark:text-slate-200">{action}</td>
                        <td className="px-3.5 font-mono text-slate-500">{date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
