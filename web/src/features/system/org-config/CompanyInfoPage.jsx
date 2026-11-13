import React, { useState } from 'react';
import { Save, Building2, CheckCircle2 } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';

export default function CompanyInfoPage() {
  const [formData, setFormData] = useState({
    name: 'Công ty Cổ phần Bao bì Goldsun (Goldsun Packaging)',
    shortName: 'GOLDSUN PACKAGING',
    taxCode: '0101234567',
    headquarters: 'Lô CN-08, KCN Tiên Sơn, Phường Đồng Nguyên, TP Từ Sơn, Bắc Ninh',
    factory1: 'Nhà máy Bao bì Carton & Offset Hưng Yên, KCN Phố Nối A',
    email: 'contact@goldsunpackaging.vn',
    phone: '024 3822 5588',
    hotline: '1900 6363 88',
    website: 'https://goldsunpackaging.vn',
    legalRepresentative: 'Nguyễn Văn Hoàng - Tổng Giám Đốc',
    timezone: 'Asia/Ho_Chi_Minh (UTC+07:00)',
    workingDays: 'Thứ 2 đến Thứ 7',
    workingHours: '08:00 - 17:30 (Nghỉ trưa 12:00 - 13:30)',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setIsDirty(false);
      notify('Đã cập nhật thông tin doanh nghiệp thành công', 'success');
    }, 400);
  };

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Thông tin doanh nghiệp & Cơ cấu tổ chức
            </h1>
            <p className="text-[11px] text-slate-400">
              Hồ sơ pháp lý, địa chỉ trụ sở nhà máy và thiết lập thời gian làm việc toàn hệ thống
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
            <strong className="font-semibold text-slate-800 dark:text-slate-200">Goldsun Packaging</strong> · Cập nhật lần cuối: 07/11/2026 14:15 bởi superadmin
          </div>
          <div>Mã định danh hệ thống: @ORG_GOLDSUN_VN · Trạng thái: Đã xác thực</div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] h-full overflow-hidden">
        {/* CỘT TRÁI: TỔNG QUAN PHÁP LÝ (360px) */}
        <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-5 overflow-y-auto space-y-4">
          <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            Hồ sơ định danh
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mã số thuế doanh nghiệp
            </label>
            <Input
              value={formData.taxCode}
              onChange={e => handleChange('taxCode', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tên viết tắt / Thương hiệu
            </label>
            <Input
              value={formData.shortName}
              onChange={e => handleChange('shortName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Người đại diện pháp luật
            </label>
            <Input
              value={formData.legalRepresentative}
              onChange={e => handleChange('legalRepresentative', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Hotline liên hệ nội bộ
            </label>
            <Input
              value={formData.hotline}
              onChange={e => handleChange('hotline', e.target.value)}
            />
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
            Thông tin trên được sử dụng để xuất hóa đơn, biên bản nghiệm thu KCS và tiêu đề báo cáo tự động.
          </div>
        </div>

        {/* CỘT PHẢI: ĐỊA CHỈ TRỤ SỞ & LỊCH LÀM VIỆC */}
        <div className="flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-950 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Tên chính thức & Địa chỉ cơ sở sản xuất
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cập nhật tên đầy đủ và hệ thống các phân xưởng, nhà máy bao bì trực thuộc
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tên doanh nghiệp đầy đủ <span className="text-rose-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trụ sở chính
              </label>
              <textarea
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={3}
                value={formData.headquarters}
                onChange={e => handleChange('headquarters', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nhà máy / Phân xưởng sản xuất
              </label>
              <textarea
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={3}
                value={formData.factory1}
                onChange={e => handleChange('factory1', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email liên hệ chung
              </label>
              <Input
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Điện thoại bàn
              </label>
              <Input
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Website chính thức
              </label>
              <Input
                value={formData.website}
                onChange={e => handleChange('website', e.target.value)}
              />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Quy định ca làm việc & Tính toán deadline tự động
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Múi giờ hệ thống
                </label>
                <Input value={formData.timezone} disabled />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ngày làm việc trong tuần
                </label>
                <Input
                  value={formData.workingDays}
                  onChange={e => handleChange('workingDays', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Khung giờ làm việc
                </label>
                <Input
                  value={formData.workingHours}
                  onChange={e => handleChange('workingHours', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ManagementFrame>
  );
}

