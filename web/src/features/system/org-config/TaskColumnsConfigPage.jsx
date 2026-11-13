import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Sparkles,
  Info,
} from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';

const CUSTOM_COLUMNS_KEY = 'taskgs_checklist_custom_columns';
const HIDDEN_COLS_KEY = 'taskgs_checklist_hidden_cols';
const COL_WIDTHS_KEY = 'taskgs_checklist_col_widths';

const DEFAULT_STANDARD_COLUMNS = [
  { id: 'title', label: 'Tên công việc', required: true, type: 'text', defaultWidth: 340, desc: 'Bắt buộc - Tiêu đề hạng mục / tiêu chí kiểm tra' },
  { id: 'executor', label: 'Người thực hiện', required: false, type: 'select', defaultWidth: 170, desc: 'Nhân sự đảm nhận thực hiện công việc' },
  { id: 'inspector', label: 'Người duyệt', required: false, type: 'select', defaultWidth: 170, desc: 'Cán bộ KCS / Quản lý nghiệm thu kết quả' },
  { id: 'dueDate', label: 'Hạn chót', required: false, type: 'date', defaultWidth: 130, desc: 'Thời hạn hoàn thành công việc' },
  { id: 'priority', label: 'Ưu tiên', required: false, type: 'select', defaultWidth: 120, desc: 'Mức độ ưu tiên: Khẩn cấp, Cao, Bình thường, Thấp' },
];

export default function TaskColumnsConfigPage() {
  const [customColumns, setCustomColumns] = useState(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_COLUMNS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [hiddenCols, setHiddenCols] = useState(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_COLS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Form state
  const [editingId, setEditingId] = useState(null); // null = create new, string = edit
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState('text');
  const [optionsText, setOptionsText] = useState('');
  const [width, setWidth] = useState(140);
  const [isActive, setIsActive] = useState(true);

  // Sync to localStorage and broadcast system events
  const saveCustomColumns = (cols) => {
    setCustomColumns(cols);
    try {
      localStorage.setItem(CUSTOM_COLUMNS_KEY, JSON.stringify(cols));
      window.dispatchEvent(new Event('taskgs_custom_columns_updated'));
    } catch (e) {
      console.error('Failed to save custom columns:', e);
    }
  };

  const saveHiddenCols = (cols) => {
    setHiddenCols(cols);
    try {
      localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(cols));
      window.dispatchEvent(new Event('taskgs_custom_columns_updated'));
    } catch (e) {
      console.error('Failed to save hidden columns:', e);
    }
  };

  const handleResetForm = () => {
    setEditingId(null);
    setLabel('');
    setKey('');
    setType('text');
    setOptionsText('');
    setWidth(140);
    setIsActive(true);
  };

  const handleEditColumn = (col) => {
    setEditingId(col.id);
    setLabel(col.label || '');
    setKey(col.key || col.id);
    setType(col.type || 'text');
    setOptionsText(Array.isArray(col.options) ? col.options.join(', ') : '');
    setWidth(col.width || 140);
    setIsActive(!hiddenCols.includes(col.id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      notify.error('Vui lòng nhập tên cột hiển thị.');
      return;
    }

    const options =
      type === 'select'
        ? optionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    if (editingId) {
      // Update existing
      const updated = customColumns.map((c) =>
        c.id === editingId
          ? {
              ...c,
              label: label.trim(),
              type,
              options,
              width: Number(width) || 140,
            }
          : c
      );
      saveCustomColumns(updated);

      // Handle active state
      if (!isActive && !hiddenCols.includes(editingId)) {
        saveHiddenCols([...hiddenCols, editingId]);
      } else if (isActive && hiddenCols.includes(editingId)) {
        saveHiddenCols(hiddenCols.filter((id) => id !== editingId));
      }

      notify.success(`Đã cập nhật cấu hình cột "${label.trim()}".`);
      handleResetForm();
    } else {
      // Create new column
      const newId = 'col_' + Date.now();
      const newCol = {
        id: newId,
        key: key.trim() || newId,
        label: label.trim(),
        type,
        options,
        width: Number(width) || 140,
      };
      saveCustomColumns([...customColumns, newCol]);

      if (!isActive) {
        saveHiddenCols([...hiddenCols, newId]);
      }

      notify.success(`Đã thêm cột mới "${label.trim()}" vào hệ thống.`);
      handleResetForm();
    }
  };

  const handleDeleteColumn = (colId, colLabel) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa cột "${colLabel}" khỏi toàn bộ hệ thống không?`)) {
      const updated = customColumns.filter((c) => c.id !== colId);
      saveCustomColumns(updated);
      saveHiddenCols(hiddenCols.filter((id) => id !== colId));
      if (editingId === colId) {
        handleResetForm();
      }
      notify.success(`Đã xóa cột "${colLabel}" khỏi hệ thống.`);
    }
  };

  const handleToggleHide = (colId) => {
    const isHidden = hiddenCols.includes(colId);
    let updated;
    if (isHidden) {
      updated = hiddenCols.filter((id) => id !== colId);
      notify.success('Đã kích hoạt hiển thị cột trên hệ thống.');
    } else {
      updated = [...hiddenCols, colId];
      notify.success('Đã tạm ẩn cột trên bảng công việc.');
    }
    saveHiddenCols(updated);
  };

  const handleResetDefault = () => {
    if (window.confirm('Khôi phục cấu hình cột về mặc định ban đầu của hệ thống?')) {
      saveCustomColumns([]);
      saveHiddenCols([]);
      try {
        localStorage.removeItem(COL_WIDTHS_KEY);
        window.dispatchEvent(new Event('taskgs_custom_columns_updated'));
      } catch (e) {}
      handleResetForm();
      notify.success('Đã khôi phục cài đặt cột mặc định.');
    }
  };

  const getTypeLabel = (t) => {
    switch (t) {
      case 'text':
        return { label: 'Văn bản (Text)', icon: Type, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50' };
      case 'number':
        return { label: 'Số liệu (Number)', icon: Hash, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50' };
      case 'date':
        return { label: 'Ngày tháng (Date)', icon: Calendar, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50' };
      case 'select':
        return { label: 'Danh sách (Select)', icon: List, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' };
      case 'checkbox':
        return { label: 'Hộp kiểm (Checkbox)', icon: CheckSquare, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50' };
      default:
        return { label: 'Văn bản', icon: Type, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' };
    }
  };

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full py-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Cấu hình cột công việc (Checklist)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  Toàn hệ thống
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Quản lý các cột hiển thị, định dạng dữ liệu và trường tùy biến cho bảng kiểm tra công việc
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetDefault}
            >
              Mặc định
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleResetForm}
            >
              Thêm cột mới
            </Button>
          </div>
        </div>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400">
          <div>
            <strong className="font-semibold text-slate-700 dark:text-slate-300">
              {DEFAULT_STANDARD_COLUMNS.length} cột tiêu chuẩn
            </strong>{' '}
            ·{' '}
            <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
              {customColumns.length} cột tùy biến
            </strong>{' '}
            · Áp dụng cho: Mọi bảng công việc & checklist
          </div>
          <div className="text-[11px]">
            Tự động đồng bộ thời gian thực qua Web Storage Event
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] h-full overflow-hidden">
        {/* CỘT TRÁI: FORM THIẾT LẬP CỘT (380px) */}
        <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {editingId ? 'Chỉnh sửa cấu hình cột' : 'Thêm cột tùy biến mới'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-emerald-600 hover:underline cursor-pointer"
              >
                + Tạo mới
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên cột hiển thị <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  if (!editingId && !key) {
                    setKey(
                      e.target.value
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd')
                        .replace(/[^a-z0-9]/g, '_')
                    );
                  }
                }}
                placeholder="Ví dụ: Ghi chú KCS, Mã khuôn, Số lượng..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mã cột (Field Key)
              </label>
              <input
                type="text"
                value={key}
                disabled={Boolean(editingId)}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Ví dụ: ghi_chu_kcs, so_luong..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 font-mono transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Khóa nhận diện dữ liệu khi tích hợp API / xuất Excel
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Định dạng dữ liệu
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="text">📝 Văn bản thuần (Text)</option>
                <option value="number">🔢 Số liệu / Định lượng (Number)</option>
                <option value="date">📅 Ngày tháng (Date Picker)</option>
                <option value="select">📋 Danh sách lựa chọn (Dropdown Select)</option>
                <option value="checkbox">☑️ Hộp kiểm đánh dấu (Checkbox)</option>
              </select>
            </div>

            {type === 'select' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Các lựa chọn (ngăn cách bởi dấu phẩy)
                </label>
                <textarea
                  rows={2}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Ví dụ: Đạt, Cần chỉnh, Loại bỏ, Chờ kiểm"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Độ rộng mặc định (px)
                </label>
                <input
                  type="number"
                  min={80}
                  max={600}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trạng thái
                </label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full h-[34px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>{isActive ? 'Đang kích hoạt' : 'Tạm ẩn'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                type="submit"
                className="w-full py-2.5 flex items-center justify-center gap-2 font-semibold"
              >
                <Save size={15} />
                <span>{editingId ? 'Cập nhật cấu hình cột' : 'Lưu cột vào hệ thống'}</span>
              </Button>
            </div>
          </form>

          {/* Quick Info Box */}
          <div className="mt-6 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Cơ chế hoạt động</span>
            </div>
            <p className="text-blue-700/90 dark:text-blue-300/90 leading-relaxed">
              Các cột tùy biến thiết lập tại đây được đồng bộ hóa tức thì cho tất cả nhân viên. Người dùng có thể kéo thả độ rộng cột và sắp xếp dữ liệu trên bảng công việc hàng ngày mà không làm thay đổi cấu hình gốc.
            </p>
          </div>
        </div>

        {/* CỘT PHẢI: DANH SÁCH & QUẢN TRỊ CỘT */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* PHẦN 1: CỘT TIÊU CHUẨN CỦA HỆ THỐNG */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Cột tiêu chuẩn của hệ thống ({DEFAULT_STANDARD_COLUMNS.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Các trường cốt lõi của quy trình giao việc và nghiệm thu
                </p>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Tên cột</th>
                    <th className="px-3 py-2.5">Định dạng</th>
                    <th className="px-3 py-2.5">Mô tả nghiệp vụ</th>
                    <th className="px-3 py-2.5 text-center">Độ rộng</th>
                    <th className="px-4 py-2.5 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {DEFAULT_STANDARD_COLUMNS.map((col) => {
                    const isHidden = hiddenCols.includes(col.id);
                    const typeInfo = getTypeLabel(col.type);
                    return (
                      <tr
                        key={col.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{col.label}</span>
                            {col.required && (
                              <span className="text-[10px] text-rose-500 font-bold">*</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${typeInfo.color}`}
                          >
                            <typeInfo.icon size={11} />
                            <span>{typeInfo.label}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          {col.desc}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-400">
                          {col.defaultWidth}px
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {col.required ? (
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                              Bắt buộc
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleHide(col.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                                isHidden
                                  ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                              <span>{isHidden ? 'Đang ẩn' : 'Hiển thị'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PHẦN 2: CỘT TÙY BIẾN TOÀN HỆ THỐNG */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Cột tùy biến đặc thù ({customColumns.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Các chỉ tiêu kỹ thuật, thông số bổ sung theo từng nhà máy & phân xưởng
                </p>
              </div>
            </div>

            {customColumns.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/40 dark:bg-slate-900/10">
                <SlidersHorizontal size={28} className="mx-auto text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Chưa có cột tùy biến nào
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Sử dụng biểu mẫu bên trái để tạo thêm các cột như Ghi chú KCS, Mã khuôn, Số lượng, Tài liệu đính kèm,...
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5">Tên cột</th>
                      <th className="px-3 py-2.5">Định dạng</th>
                      <th className="px-3 py-2.5">Tùy chọn / Chi tiết</th>
                      <th className="px-3 py-2.5 text-center">Độ rộng</th>
                      <th className="px-3 py-2.5 text-center">Trạng thái</th>
                      <th className="px-4 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {customColumns.map((col) => {
                      const isHidden = hiddenCols.includes(col.id);
                      const typeInfo = getTypeLabel(col.type);
                      const isBeingEdited = editingId === col.id;

                      return (
                        <tr
                          key={col.id}
                          className={`transition-colors ${
                            isBeingEdited
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                            <div>{col.label}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                              {col.key || col.id}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${typeInfo.color}`}
                            >
                              <typeInfo.icon size={11} />
                              <span>{typeInfo.label}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                            {col.type === 'select' ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(col.options || []).map((opt, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-medium"
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Nhập trực tiếp</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-400">
                            {col.width || 140}px
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleHide(col.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                                isHidden
                                  ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                              <span>{isHidden ? 'Ẩn' : 'Bật'}</span>
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditColumn(col)}
                                className="p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Chỉnh sửa cấu hình cột"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(col.id, col.label)}
                                className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                title="Xóa cột này khỏi toàn hệ thống"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ManagementFrame>
  );
}

