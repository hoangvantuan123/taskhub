import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import Modal from '../../../shared/ui/Modal';
import { questionsApi } from '../services/questions.api';
import { notify } from '../../../shared/lib/notify';

export default function FolderDetailPage({ levelCatalog, onBack, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    level: 'L1',
    description: '',
  });

  const initialRef = useRef(JSON.stringify(form));
  const [saving, setSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== initialRef.current;
  }, [form]);

  const handleBackAttempt = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      notify('Vui lòng nhập tên thư mục phân loại!', 'warning');
      return;
    }

    setSaving(true);
    try {
      await questionsApi.createFolder({
        name: form.name.trim(),
        level: form.level,
        description: form.description.trim(),
      });
      notify('Tạo thư mục câu hỏi mới thành công!', 'success');
      initialRef.current = JSON.stringify(form);
      if (onSaved) onSaved();
    } catch (err) {
      notify('Lỗi khi tạo thư mục: ' + (err.message || 'Lỗi hệ thống'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <>
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBackAttempt}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Quay lại danh sách câu hỏi"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-5 w-px bg-slate-200 dark:border-slate-800" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Tạo thư mục câu hỏi mới
                </h1>
                {form.level && (
                  <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {levelCatalog?.labelFor?.(form.level) || form.level}
                  </span>
                )}
                {hasChanges && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic">
                    (Có thay đổi chưa lưu)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="management-actions flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBackAttempt}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving ? 'Đang tạo...' : 'Tạo thư mục'}
            </Button>
          </div>
        </>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <span>Phân loại thư mục ngân hàng câu hỏi</span>
          <span>{hasChanges ? 'Bản nháp có thay đổi' : 'Đã đồng bộ với máy chủ'}</span>
        </div>
      }
    >
      {/* 2-Column Split Workspace (100% Flat Edge-to-Edge) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950 overflow-hidden">
        {/* Left Column: Form */}
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Thông tin thư mục
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              <div className="py-2.5 first:pt-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên thư mục phân loại <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Kỹ thuật Điều khiển Máy In Offset, Cảm biến..."
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {levelCatalog?.label || 'Cấp độ ISA-95 áp dụng'}
                </label>
                <Select
                  size="sm"
                  value={form.level}
                  onChange={e => setForm(prev => ({ ...prev, level: e?.target?.value ?? e }))}
                  options={levelCatalog?.optionsFor?.(form.level) || []}
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả ngắn & Ghi chú nghiệp vụ
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ghi chú quy trình sản xuất, công đoạn hoặc đối tượng học tập..."
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Flat Guidance & Standards (NO boxed cards!) */}
        <main className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Quy chuẩn cấu trúc thư mục ngân hàng câu hỏi
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Thư mục giúp phân loại hệ thống câu hỏi sát hạch theo từng cụm công nghệ, dây chuyền sản xuất và nhóm kỹ năng chuyên môn:
            </p>

            <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-5">
              <li><strong>Cấp độ L1:</strong> Vận hành trực tiếp tại máy, thao tác cơ bản và nhận biết an toàn thiết bị.</li>
              <li><strong>Cấp độ L2:</strong> Điều khiển quy trình, xử lý lỗi kỹ thuật thường gặp trên công đoạn.</li>
              <li><strong>Cấp độ L3:</strong> Quản trị vận hành sản xuất MES/SCADA, tối ưu năng suất và kiểm soát chất lượng.</li>
            </ul>

            <div className="pt-4 text-xs text-slate-500">
              💡 Sau khi tạo thư mục, bạn có thể tạo câu hỏi trực tiếp trong thư mục này hoặc nhập hàng loạt từ Excel/CSV.
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal when Leaving with Unsaved Changes */}
      <Modal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Xác nhận rời khỏi màn hình"
        size="sm"
        density="compact"
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setShowExitConfirm(false)}>
              Ở lại chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setShowExitConfirm(false);
                onBack();
              }}
            >
              Rời khỏi & Hủy thay đổi
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Bạn có thay đổi chưa lưu cho thư mục này. Nếu quay lại bây giờ, các thông tin vừa nhập sẽ bị mất.
        </p>
      </Modal>
    </ManagementFrame>
  );
}
