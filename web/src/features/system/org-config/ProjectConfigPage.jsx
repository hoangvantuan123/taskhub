import React, { useState } from 'react';
import { Save, Layers } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';

export default function ProjectConfigPage() {
  const [config, setConfig] = useState({
    defaultWorkflow: 'TASK_STD (Quy trình tiêu chuẩn)',
    maxMembersPerProject: 50,
    enableMilestoneApproval: 'Bắt buộc',
    autoArchiveDays: 30,
    requireProjectBudget: 'Có',
    riskAlertThreshold: 80,
    projectPrefix: 'PRJ',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleChange = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setIsDirty(false);
      notify('Đã cập nhật cấu hình dự án thành công', 'success');
    }, 400);
  };

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Cấu hình chính sách dự án
            </h1>
            <p className="text-[11px] text-slate-400">
              Thiết lập quy định khởi tạo, phân bổ ngân sách, cột mốc và chu trình đóng dự án
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
              Lưu thay đổi
            </Button>
          </div>
        </div>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400">
          <div>
            <strong className="font-semibold text-slate-800 dark:text-slate-200">Chính sách dự án</strong> · Áp dụng cho: Toàn bộ dự án sản xuất & R&D
          </div>
          <div>Cập nhật: 05/11/2026 bởi admin · Phiên bản: v2.1</div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
        {/* CỘT TRÁI: THIẾT LẬP MÃ & QUY MÔ (360px) */}
        <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
          <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            Quy tắc tiền tố & Giới hạn
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tiền tố mã dự án tự động
            </label>
            <Input
              value={config.projectPrefix}
              onChange={e => handleChange('projectPrefix', e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Số thành viên tối đa / dự án
            </label>
            <Input
              type="number"
              value={config.maxMembersPerProject}
              onChange={e => handleChange('maxMembersPerProject', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tự động lưu trữ sau (ngày)
            </label>
            <Input
              type="number"
              value={config.autoArchiveDays}
              onChange={e => handleChange('autoArchiveDays', Number(e.target.value))}
            />
          </div>
        </div>

        {/* CỘT PHẢI: QUY TRÌNH & CỘT MỐC */}
        <div className="flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-950 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Quy trình làm việc & Kiểm soát rủi ro tiến độ
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Quy định cách thức các nhiệm vụ trong dự án liên kết với quy trình nghiệm thu
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quy trình mặc định cho nhiệm vụ mới
              </label>
              <Select
                value={config.defaultWorkflow}
                onChange={v => handleChange('defaultWorkflow', v)}
                options={[
                  { value: 'TASK_STD (Quy trình tiêu chuẩn)', label: 'TASK_STD (Quy trình tiêu chuẩn)' },
                  { value: 'TASK_PROD (Sản xuất bao bì KCS)', label: 'TASK_PROD (Sản xuất bao bì KCS)' },
                  { value: 'TASK_FAST (Khẩn cấp không duyệt)', label: 'TASK_FAST (Khẩn cấp không duyệt)' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nghiệm thu cột mốc quan trọng (Milestone)
              </label>
              <Select
                value={config.enableMilestoneApproval}
                onChange={v => handleChange('enableMilestoneApproval', v)}
                options={[
                  { value: 'Bắt buộc', label: 'Bắt buộc (Cần Trưởng phòng duyệt)' },
                  { value: 'Tùy chọn', label: 'Tùy chọn theo từng dự án' },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngưỡng cảnh báo trễ hạn (%)
              </label>
              <Input
                type="number"
                value={config.riskAlertThreshold}
                onChange={e => handleChange('riskAlertThreshold', Number(e.target.value))}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Cảnh báo vàng khi thời gian tiêu hao vượt 80% mà tiến độ chưa đạt 60%
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bắt buộc khai báo ngân sách dự án
              </label>
              <Select
                value={config.requireProjectBudget}
                onChange={v => handleChange('requireProjectBudget', v)}
                options={[
                  { value: 'Có', label: 'Có (Bắt buộc nhập số tiền hoặc định mức)' },
                  { value: 'Không', label: 'Không bắt buộc' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </ManagementFrame>
  );
}

