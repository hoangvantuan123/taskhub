import React, { useState, useEffect } from 'react';
import {
  Save,
  ShieldCheck,
  FileCheck,
  Plus,
  X,
  AlertTriangle,
  RotateCcw,
  Lock,
  FileText,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';
import {
  getUploadPolicy,
  saveUploadPolicy,
  DEFAULT_ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  EXTENSION_METADATA,
} from '../../../shared/lib/uploadPolicy';

export default function DataPolicyPage() {
  const [policy, setPolicy] = useState({
    auditRetentionDays: '365 ngày (1 năm)',
    backupSchedule: 'Hàng ngày lúc 01:00 sáng',
    maxFileSizeMb: 50,
    trashRetentionDays: 30,
    enableEndToEndEncryption: 'Bật',
    autoPurgeInactiveAccounts: 'Sau 180 ngày',
  });

  // Upload Security Policy state
  const [uploadPolicyState, setUploadPolicyState] = useState(() => getUploadPolicy());
  const [newExtInput, setNewExtInput] = useState('');
  const [extError, setExtError] = useState('');

  const [isDirty, setIsDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleChange = (key, val) => {
    setPolicy(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  // Add new file extension to whitelist
  const handleAddExtension = (e) => {
    if (e) e.preventDefault();
    const clean = newExtInput.trim().toLowerCase().replace(/^\./, '');
    if (!clean) return;

    if (DANGEROUS_EXTENSIONS.includes(clean)) {
      setExtError(`Định dạng .${clean} thuộc danh mục nguy cơ bảo mật cao (CAD/Mã thực thi), không được phép thêm.`);
      return;
    }

    if (uploadPolicyState.allowedExtensions.includes(clean)) {
      setExtError(`Định dạng .${clean} đã tồn tại trong danh sách cho phép.`);
      return;
    }

    setUploadPolicyState(prev => ({
      ...prev,
      allowedExtensions: [...prev.allowedExtensions, clean],
    }));
    setNewExtInput('');
    setExtError('');
    setIsDirty(true);
  };

  // Remove extension from whitelist
  const handleRemoveExtension = (extToRemove) => {
    setUploadPolicyState(prev => ({
      ...prev,
      allowedExtensions: prev.allowedExtensions.filter(ext => ext !== extToRemove),
    }));
    setIsDirty(true);
  };

  // Reset to default safe extensions
  const handleResetExtensions = () => {
    setUploadPolicyState(prev => ({
      ...prev,
      allowedExtensions: [...DEFAULT_ALLOWED_EXTENSIONS],
      maxFileSizeMb: 50,
      checkMimeType: true,
      blockExecutableFiles: true,
    }));
    setIsDirty(true);
    notify.info('Đã khôi phục danh mục định dạng chuẩn an toàn (PDF, DOCX, XLSX, MD).');
  };

  const handleSave = (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      // Save upload security policy to storage and broadcast
      saveUploadPolicy({
        ...uploadPolicyState,
        maxFileSizeMb: policy.maxFileSizeMb,
      });

      setTimeout(() => {
        setBusy(false);
        setIsDirty(false);
        notify.success('Đã cập nhật chính sách an toàn & điều kiện tải tệp tin thành công.');
      }, 350);
    } catch (err) {
      setBusy(false);
      notify.error('Lỗi khi lưu chính sách: ' + err.message);
    }
  };

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>Chính sách an toàn dữ liệu & Kiểm soát tệp tin tải lên</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Quy định điều kiện kiểm duyệt định dạng tệp tin, whitelist file đính kèm, sao lưu CSDL và mã hóa dữ liệu
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || busy}
            >
              <Save size={15} className="mr-1.5" />
              {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      }
      status={
        <div className="h-8 min-h-[32px] px-3 flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <strong className="font-semibold text-slate-800 dark:text-slate-200">Chính sách dữ liệu</strong>
            <span>·</span>
            <span>Định dạng cho phép: {uploadPolicyState.allowedExtensions.map(e => `.${e}`).join(', ')}</span>
            <span>·</span>
            <span>Giới hạn tệp: {policy.maxFileSizeMb} MB</span>
          </div>
          <div>Bản sao lưu gần nhất: Hôm nay 01:00 AM</div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] h-full overflow-hidden">
        {/* CỘT TRÁI: DUNG LƯỢNG & SAO LƯU (380px) */}
        <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
          <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
            <Lock size={13} className="text-blue-500" />
            <span>Sao lưu & Giới hạn tải lên</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lịch sao lưu tự động (Backup CSDL)
            </label>
            <Select
              value={policy.backupSchedule}
              onChange={v => handleChange('backupSchedule', v)}
              options={[
                { value: 'Hàng ngày lúc 01:00 sáng', label: 'Hàng ngày lúc 01:00 sáng' },
                { value: 'Mỗi 12 giờ một lần', label: 'Mỗi 12 giờ một lần' },
                { value: 'Hàng tuần vào Chủ Nhật', label: 'Hàng tuần vào Chủ Nhật' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dung lượng tệp đính kèm tối đa (MB)
            </label>
            <Input
              type="number"
              min={1}
              max={500}
              value={policy.maxFileSizeMb}
              onChange={e => {
                const val = Number(e.target.value) || 10;
                handleChange('maxFileSizeMb', val);
                setUploadPolicyState(prev => ({ ...prev, maxFileSizeMb: val }));
              }}
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Áp dụng cho mọi tệp tải lên qua form công việc, thư mục tài liệu hoặc checklist.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Thời gian giữ trong Thùng rác (ngày)
            </label>
            <Input
              type="number"
              value={policy.trashRetentionDays}
              onChange={e => handleChange('trashRetentionDays', Number(e.target.value))}
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Dữ liệu tài liệu trong thùng rác sẽ bị hủy vĩnh viễn sau số ngày này.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mã hóa dữ liệu lưu trữ (At-Rest Encryption)
            </label>
            <Select
              value={policy.enableEndToEndEncryption}
              onChange={v => handleChange('enableEndToEndEncryption', v)}
              options={[
                { value: 'Bật', label: 'Bật (Thuật toán AES-256 GCM)' },
                { value: 'Tắt', label: 'Tắt' },
              ]}
            />
          </div>
        </div>

        {/* CỘT PHẢI: QUẢN TRỊ ĐIỀU KIỆN IMPORT & WHITELIST ĐỊNH DẠNG TỆP TIN */}
        <div className="flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-950 p-6 space-y-6">
          {/* Section: Upload Format Security Policy */}
          <div className="space-y-3 p-4 rounded-none border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <FileCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Điều kiện định dạng tệp tin tải lên & Import hệ thống (Security Whitelist)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chỉ cho phép các định dạng an toàn được khai báo dưới đây. Ngăn chặn tuyệt đối mã thực thi và tệp không rõ nguồn gốc.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={RotateCcw}
                onClick={handleResetExtensions}
                className="h-7 text-xs"
              >
                Khôi phục chuẩn
              </Button>
            </div>

            {/* Current Allowed Extensions Tags */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Định dạng hiện đang được cấp phép tải lên ({uploadPolicyState.allowedExtensions.length}):
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {uploadPolicyState.allowedExtensions.map((ext) => {
                  const meta = EXTENSION_METADATA[ext];
                  return (
                    <span
                      key={ext}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded-none border ${
                        meta?.color || 'text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <span>.{ext.toUpperCase()}</span>
                      {meta?.label && <span className="font-sans font-normal text-[10px] opacity-75">({meta.label})</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveExtension(ext)}
                        className="hover:opacity-75 text-slate-400 hover:text-rose-600 transition cursor-pointer ml-0.5"
                        title={`Gỡ bỏ định dạng .${ext}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Add New Extension Form */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Thêm định dạng tệp tin cho phép mới:
              </label>
              <form onSubmit={handleAddExtension} className="flex items-center gap-2 max-w-md">
                <Input
                  placeholder="VD: csv, txt, json..."
                  value={newExtInput}
                  onChange={e => {
                    setNewExtInput(e.target.value);
                    setExtError('');
                  }}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  className="h-8 shrink-0"
                >
                  Thêm định dạng
                </Button>
              </form>
              {extError && (
                <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>{extError}</span>
                </p>
              )}
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>Quy định an ninh tệp tin:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-700 dark:text-amber-400">
                <li>Hệ thống từ chối tất cả tệp bản vẽ CAD (.dwg, .dxf) vì không thuộc phạm vi xử lý của hệ thống.</li>
                <li>Chặn tuyệt đối các file mã thực thi hoặc kịch bản lệnh (.exe, .bat, .cmd, .sh, .vbs, .js, .msi, .dll).</li>
                <li>Mọi tệp tải lên đều được kiểm tra phần mở rộng lẫn kiểm tra MIME Type thực tế trước khi lưu vào CSDL.</li>
              </ul>
            </div>
          </div>

          {/* Section: Data Retention Lifecycle */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-1">
              Chính sách vòng đời dữ liệu (Data Retention Lifecycle)
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Quy định thời hạn lưu trữ nhật ký truy cập và hồ sơ công việc sau khi hoàn tất
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Thời gian lưu nhật ký bảo mật (Audit Log)
                </label>
                <Select
                  value={policy.auditRetentionDays}
                  onChange={v => handleChange('auditRetentionDays', v)}
                  options={[
                    { value: '90 ngày', label: '90 ngày' },
                    { value: '180 ngày', label: '180 ngày' },
                    { value: '365 ngày (1 năm)', label: '365 ngày (1 năm)' },
                    { value: 'Vĩnh viễn', label: 'Vĩnh viễn (Không xóa)' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tự động thanh lọc tài khoản ngừng hoạt động
                </label>
                <Select
                  value={policy.autoPurgeInactiveAccounts}
                  onChange={v => handleChange('autoPurgeInactiveAccounts', v)}
                  options={[
                    { value: 'Sau 90 ngày', label: 'Sau 90 ngày' },
                    { value: 'Sau 180 ngày', label: 'Sau 180 ngày' },
                    { value: 'Sau 365 ngày', label: 'Sau 365 ngày' },
                    { value: 'Không bao giờ', label: 'Không bao giờ' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ManagementFrame>
  );
}
