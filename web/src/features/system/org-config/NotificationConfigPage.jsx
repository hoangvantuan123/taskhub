import React, { useState } from 'react';
import { Save, Bell } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';

export default function NotificationConfigPage() {
  const [config, setConfig] = useState({
    emailChannel: 'Bật',
    inAppChannel: 'Bật',
    telegramChannel: 'Bật',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpSender: 'no-reply@goldsunpackaging.vn',
    telegramBotToken: '••••••••••••••••••••••••••••••••••••••••',
    telegramGroupChatId: '-100192837482',
    notifyOnTaskAssigned: 'Tức thì',
    notifyOnProgressUpdate: 'Khi hoàn thành mốc',
    notifyOnApprovalRequest: 'Tức thì',
    notifyOnOverdue: 'Hàng ngày lúc 08:00',
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
      notify('Đã cập nhật cấu hình kênh thông báo thành công', 'success');
    }, 400);
  };

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Cấu hình kênh & Tần suất thông báo
            </h1>
            <p className="text-[11px] text-slate-400">
              Thiết lập máy chủ gửi mail SMTP, Webhook Telegram và các sự kiện nhắc việc tự động
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
            <strong className="font-semibold text-slate-800 dark:text-slate-200">Kênh thông báo</strong> · Trạng thái SMTP: Kết nối tốt (200 OK) · Telegram Bot: Đang hoạt động
          </div>
          <div>Lần test gửi gần nhất: Hôm nay 12:40</div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
        {/* CỘT TRÁI: BẬT / TẮT KÊNH (360px) */}
        <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
          <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            Kênh truyền thông tin
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Thông báo nội bộ trên Web (In-App)
            </label>
            <Select
              value={config.inAppChannel}
              onChange={v => handleChange('inAppChannel', v)}
              options={[
                { value: 'Bật', label: 'Bật (Chuông thông báo)' },
                { value: 'Tắt', label: 'Tắt' },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Gửi Email thông báo (SMTP)
            </label>
            <Select
              value={config.emailChannel}
              onChange={v => handleChange('emailChannel', v)}
              options={[
                { value: 'Bật', label: 'Bật' },
                { value: 'Tắt', label: 'Tắt' },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nhóm Telegram / Zalo ZNS
            </label>
            <Select
              value={config.telegramChannel}
              onChange={v => handleChange('telegramChannel', v)}
              options={[
                { value: 'Bật', label: 'Bật' },
                { value: 'Tắt', label: 'Tắt' },
              ]}
            />
          </div>
        </div>

        {/* CỘT PHẢI: KẾT NỐI MÁY CHỦ & SỰ KIỆN */}
        <div className="flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-950 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Thông số máy chủ Email & Telegram Webhook
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cấu hình bảo mật để ứng dụng có thể gửi thư xác nhận và cảnh báo quá hạn
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                SMTP Host
              </label>
              <Input
                value={config.smtpHost}
                onChange={e => handleChange('smtpHost', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Port
              </label>
              <Input
                value={config.smtpPort}
                onChange={e => handleChange('smtpPort', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Địa chỉ Email gửi (Sender)
              </label>
              <Input
                value={config.smtpSender}
                onChange={e => handleChange('smtpSender', e.target.value)}
              />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Tần suất gửi theo loại sự kiện
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Khi được giao công việc mới
                </label>
                <Select
                  value={config.notifyOnTaskAssigned}
                  onChange={v => handleChange('notifyOnTaskAssigned', v)}
                  options={[
                    { value: 'Tức thì', label: 'Gửi tức thì ngay khi tạo' },
                    { value: 'Tổng hợp theo ca', label: 'Tổng hợp gửi đầu ca làm việc' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Khi có yêu cầu phê duyệt / nghiệm thu
                </label>
                <Select
                  value={config.notifyOnApprovalRequest}
                  onChange={v => handleChange('notifyOnApprovalRequest', v)}
                  options={[
                    { value: 'Tức thì', label: 'Gửi tức thì cho Quản lý / Trưởng phòng' },
                    { value: 'Cuối ngày', label: 'Cuối ngày' },
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

