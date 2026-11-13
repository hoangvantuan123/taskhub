import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../services/taskService';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  Building2,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Tag,
} from 'lucide-react';

export default function ExternalPartnersModal({ isOpen, onClose, onPartnerSelected }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    partnerCode: '',
    partnerName: 'Bravo',
    contactName: '',
    contactRole: 'Chuyên viên kỹ thuật',
    phone: '',
    email: '',
    partnerType: 'vendor',
    note: '',
  });

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await taskService.getPartners();
      setPartners(data || []);
    } catch (err) {
      console.error('Error loading partners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPartners();
      setIsAdding(false);
      setEditingId(null);
    }
  }, [isOpen]);

  const handleStartAdd = () => {
    setForm({
      partnerCode: '',
      partnerName: '',
      contactName: '',
      contactRole: '',
      phone: '',
      email: '',
      partnerType: 'vendor',
      note: '',
    });
    setEditingId(null);
    setIsAdding(true);
  };

  const handleStartEdit = (p) => {
    setForm({
      partnerCode: p.partnerCode || '',
      partnerName: p.partnerName || '',
      contactName: p.contactName || '',
      contactRole: p.contactRole || '',
      phone: p.phone || '',
      email: p.email || '',
      partnerType: p.partnerType || 'vendor',
      note: p.note || '',
    });
    setEditingId(p.id);
    setIsAdding(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.partnerName.trim()) {
      notify.error('Vui lòng nhập tên đối tác / tổ chức bên ngoài');
      return;
    }
    if (!form.contactName.trim()) {
      notify.error('Vui lòng nhập tên người liên hệ / tiếp nhận');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        partnerName: form.partnerName.trim(),
        contactName: form.contactName.trim(),
      };
      if (editingId) {
        payload.id = editingId;
      }
      await taskService.savePartner(payload);
      notify.success(editingId ? 'Đã cập nhật đối tác thành công' : 'Đã đăng ký đối tác mới thành công');
      setIsAdding(false);
      setEditingId(null);
      await loadPartners();
      if (onPartnerSelected) {
        onPartnerSelected({
          partnerName: payload.partnerName,
          contactName: payload.contactName,
        });
      }
    } catch (err) {
      notify.error('Lỗi khi lưu đối tác: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đối tác "${name}"?`)) return;
    try {
      await taskService.deletePartner(id);
      notify.success(`Đã xóa đối tác "${name}"`);
      loadPartners();
    } catch (err) {
      notify.error('Lỗi khi xóa đối tác: ' + (err.message || ''));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Danh sách User & Đối tác bên ngoài (Khách hàng / Nhà cung cấp)"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400">
            Quản lý các nhóm người dùng bên ngoài không thuộc bộ phận nội bộ công ty (ví dụ: đối tác <strong>Bravo - Mr Việt</strong>, đơn vị tư vấn, khách hàng).
          </p>
          {!isAdding && (
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={handleStartAdd}
            >
              Đăng ký đối tác mới
            </Button>
          )}
        </div>

        {/* Form Thêm / Sửa đối tác */}
        {isAdding && (
          <form
            onSubmit={handleSave}
            className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-emerald-700 dark:text-emerald-400">
                {editingId ? 'Chỉnh sửa thông tin đối tác' : 'Đăng ký đối tác / User bên ngoài mới'}
              </h4>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                Đóng form
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên tổ chức / Đối tác <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  value={form.partnerName}
                  onChange={(e) => setForm((p) => ({ ...p, partnerName: e.target.value }))}
                  placeholder="VD: Bravo, Viettel, Khách hàng Goldsun..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Người tiếp nhận / Liên hệ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  value={form.contactName}
                  onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                  placeholder="VD: Mr Việt, Mrs Lan..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nhóm đối tác
                </label>
                <select
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100"
                  value={form.partnerType}
                  onChange={(e) => setForm((p) => ({ ...p, partnerType: e.target.value }))}
                >
                  <option value="vendor">Đối tác phần mềm / Nhà cung cấp</option>
                  <option value="client">Khách hàng bên ngoài</option>
                  <option value="consultant">Đơn vị tư vấn / Chuyên gia</option>
                  <option value="partner">Đối tác hợp tác chung</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chức danh / Vai trò
                </label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  value={form.contactRole}
                  onChange={(e) => setForm((p) => ({ ...p, contactRole: e.target.value }))}
                  placeholder="VD: Chuyên viên triển khai ERP..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="098..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú / Phạm vi phụ trách
              </label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="VD: Tiếp nhận các yêu cầu module Sản xuất, Kho ETPMS..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsAdding(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                icon={Save}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu đối tác'}
              </Button>
            </div>
          </form>
        )}

        {/* Danh sách đối tác đã đăng ký */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 w-10 text-center">STT</th>
                <th className="px-3 py-2">Tổ chức / Nhóm đối tác</th>
                <th className="px-3 py-2">Người tiếp nhận / Liên hệ</th>
                <th className="px-3 py-2">Chức danh / Vai trò</th>
                <th className="px-3 py-2">Ghi chú</th>
                <th className="px-3 py-2 w-28 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    Đang tải danh sách đối tác...
                  </td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    Chưa có đối tác bên ngoài nào được đăng ký.
                  </td>
                </tr>
              ) : (
                partners.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition"
                  >
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {p.partnerName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {p.partnerType === 'vendor' ? 'Đối tác' : p.partnerType}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-blue-700 dark:text-blue-300">
                      {p.contactName}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {p.contactRole || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 truncate max-w-[200px]" title={p.note}>
                      {p.note || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right space-x-1">
                      {onPartnerSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            onPartnerSelected({
                              partnerName: p.partnerName,
                              contactName: p.contactName,
                            });
                            onClose();
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-pointer"
                          title="Chọn đối tác này vào công việc"
                        >
                          Chọn
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        title="Sửa thông tin"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.partnerName)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Xóa đối tác"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

