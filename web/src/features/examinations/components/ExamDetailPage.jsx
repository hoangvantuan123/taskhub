import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Calendar, ShieldCheck } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import Modal from '../../../shared/ui/Modal';
import useAttributeCatalog from '../../../shared/hooks/useAttributeCatalog';
import { assessmentsApi } from '../../assessments/services/assessments.api';
import { notify } from '../../../shared/lib/notify';

export default function ExamDetailPage({ exam, isCreate = false, assessments = [], onBack, onSaved }) {
  const deptCatalog = useAttributeCatalog('department');
  const posCatalog = useAttributeCatalog('position');

  const [form, setForm] = useState({
    id: exam?.id || '',
    code: exam?.code || (isCreate ? 'EXAM-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900) : ''),
    title: exam?.title || '',
    assessmentId: exam?.assessmentId || '',
    startTime: exam?.startTime ? exam.startTime.substring(0, 16) : '',
    endTime: exam?.endTime ? exam.endTime.substring(0, 16) : '',
    location: exam?.location || 'Trực tuyến — Trạm sát hạch',
    maxAttempts: exam?.maxAttempts || 1,
    targetDepartment: exam?.targetDepartment || '',
    targetPosition: exam?.targetPosition || '',
    preventTabSwitch: exam?.preventTabSwitch ?? true,
    maxViolations: exam?.maxViolations || 3,
  });

  const initialFormRef = useRef(JSON.stringify(form));
  const [saving, setSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const selectedAssessment = useMemo(() => {
    return assessments.find(a => a.id === form.assessmentId) || null;
  }, [assessments, form.assessmentId]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== initialFormRef.current;
  }, [form]);

  const handleBackAttempt = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleAssessmentSelect = (e) => {
    const asmId = e?.target?.value ?? e;
    const asm = assessments.find(a => a.id === asmId);
    setForm(prev => ({
      ...prev,
      assessmentId: asmId,
      title: prev.title || (asm ? `Kỳ sát hạch: ${asm.title}` : ''),
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.code.trim()) {
      notify('Vui lòng nhập mã ca thi!', 'warning');
      return;
    }
    if (!form.assessmentId) {
      notify('Vui lòng chọn bộ đề thi xuất bản!', 'warning');
      return;
    }
    if (!form.title.trim()) {
      notify('Vui lòng nhập tên ca thi!', 'warning');
      return;
    }
    if (!form.startTime || !form.endTime) {
      notify('Vui lòng thiết lập thời gian mở và đóng ca thi!', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id || undefined,
        code: form.code.trim(),
        title: form.title.trim(),
        assessmentId: form.assessmentId,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        location: form.location.trim(),
        maxAttempts: Number(form.maxAttempts) || 1,
        targetDepartment: form.targetDepartment || null,
        targetPosition: form.targetPosition || null,
        preventTabSwitch: Boolean(form.preventTabSwitch),
        maxViolations: Number(form.maxViolations) || 3,
      };

      await assessmentsApi.saveSession(payload);
      notify(isCreate ? 'Đã tổ chức ca thi mới thành công!' : 'Đã cập nhật ca thi thành công!', 'success');
      initialFormRef.current = JSON.stringify(form);
      if (onSaved) onSaved();
    } catch (err) {
      notify('Lỗi khi lưu ca thi: ' + (err.message || 'Lỗi hệ thống'), 'error');
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
              title="Quay lại danh sách ca thi"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-5 w-px bg-slate-200 dark:border-slate-800" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {isCreate ? 'Đăng ký & Tổ chức ca thi mới' : `Chi tiết ca thi · ${form.title || 'Chưa đặt tên'}`}
                </h1>
                {form.code && (
                  <span className="font-mono text-xs text-slate-500 font-medium">
                    @{form.code}
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
              disabled={saving || (!hasChanges && !isCreate)}
            >
              {isCreate ? 'Xác nhận tổ chức ca thi' : 'Lưu ca thi'}
            </Button>
          </div>
        </>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <span>
            Cấu hình ca thi sát hạch · {form.code || 'Bản nháp'}
          </span>
          <span>{hasChanges ? 'Bản nháp có thay đổi' : 'Đã đồng bộ với máy chủ'}</span>
        </div>
      }
    >
      {/* 2-Column Split Workspace (100% Flat Edge-to-Edge) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950 overflow-hidden">
        {/* Left Column: Form Configuration */}
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Thông số định danh ca thi
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              <div className="py-2.5 first:pt-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã ca thi <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="VD: EXAM-2026-001"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-mono font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Bộ đề thi xuất bản <span className="text-rose-500">*</span>
                </label>
                <Select
                  size="sm"
                  value={form.assessmentId}
                  onChange={handleAssessmentSelect}
                  placeholder="-- Chọn bộ đề thi chuẩn --"
                  options={assessments.map((a) => ({
                    value: a.id,
                    label: `[${a.code}] ${a.title} (${a.durationMinutes}' - ${a.questionCount} câu)`,
                  }))}
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên kỳ thi / Ca thi <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="VD: Sát hạch tay nghề Kỹ sư Quý 4"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Địa điểm / Trạm thi
                </label>
                <input
                  value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="VD: Phòng Đào tạo Tầng 3 hoặc Trực tuyến"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số lần làm bài tối đa
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxAttempts}
                  onChange={e => setForm(prev => ({ ...prev, maxAttempts: e.target.value }))}
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Flat Sections divided by 1px slate borders */}
        <main className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
          {/* Section 1: Time Window */}
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Khung thời gian mở ca thi
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thời gian mở ca <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={e => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full h-9 border border-slate-200 dark:border-slate-800 rounded px-3 text-xs text-slate-900 dark:text-white bg-transparent focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thời gian đóng ca (Hạn chót) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={e => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full h-9 border border-slate-200 dark:border-slate-800 rounded px-3 text-xs text-slate-900 dark:text-white bg-transparent focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Audience Allocation */}
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Phân bổ đối tượng dự thi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phòng ban áp dụng
                </label>
                <Select
                  size="sm"
                  value={form.targetDepartment}
                  onChange={e => setForm(prev => ({ ...prev, targetDepartment: e?.target?.value ?? e }))}
                  placeholder="-- Tất cả các phòng ban --"
                  options={(deptCatalog.options || []).filter(o => o.active).map(d => ({ value: d.id, label: d.label }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chức danh / Vị trí áp dụng
                </label>
                <Select
                  size="sm"
                  value={form.targetPosition}
                  onChange={e => setForm(prev => ({ ...prev, targetPosition: e?.target?.value ?? e }))}
                  placeholder="-- Tất cả các vị trí --"
                  options={(posCatalog.options || []).filter(o => o.active).map(p => ({ value: p.id, label: p.label }))}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Anti-cheat Security */}
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              An ninh phòng thi & Chống gian lận
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.preventTabSwitch}
                  onChange={e => setForm(prev => ({ ...prev, preventTabSwitch: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Cảnh báo & Ghi nhận vi phạm khi chuyển Tab / rời màn hình</span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-400">Giới hạn vi phạm:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxViolations}
                  onChange={e => setForm(prev => ({ ...prev, maxViolations: e.target.value }))}
                  className="w-16 h-8 border border-slate-200 dark:border-slate-800 rounded bg-transparent px-2 text-center text-xs font-bold text-slate-800 dark:text-slate-200"
                />
                <span className="text-slate-400">lần (tự động khóa bài thi)</span>
              </div>
            </div>
          </div>

          {/* Section 4: Linked Assessment Overview (Flat statistics strip) */}
          {selectedAssessment && (
            <div className="p-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Cấu trúc bộ đề thi: [{selectedAssessment.code}] {selectedAssessment.title}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="py-2">
                  <span className="text-slate-400 block text-[11px]">Thời lượng</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedAssessment.durationMinutes || 45} phút</span>
                </div>
                <div className="py-2">
                  <span className="text-slate-400 block text-[11px]">Số lượng câu hỏi</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedAssessment.questionCount || 0} câu</span>
                </div>
                <div className="py-2">
                  <span className="text-slate-400 block text-[11px]">Điểm đạt chuẩn</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedAssessment.passingScore || 5} / {selectedAssessment.totalPoints || 10}đ</span>
                </div>
                <div className="py-2">
                  <span className="text-slate-400 block text-[11px]">Câu điểm liệt</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedAssessment.hasCriticalRule ? 'Bắt buộc đúng' : 'Không'}
                  </span>
                </div>
              </div>
            </div>
          )}
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
          Bạn có thay đổi chưa lưu cho ca thi này. Nếu quay lại bây giờ, các thông số vừa nhập sẽ bị mất.
        </p>
      </Modal>
    </ManagementFrame>
  );
}
