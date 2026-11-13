import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  Check,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import Button from '../../../../shared/ui/Button';
import Select from '../../../../shared/ui/Select';
import Modal from '../../../../shared/ui/Modal';
import { notify } from '../../../../shared/lib/notify';
import { taskService } from '../../../tasks/services/taskService';

const DEPARTMENTS = [
  'Phòng ban Quản trị ERP & CNTT',
  'Ban Giám Đốc',
  'Kỹ thuật',
  'Sản xuất',
  'Kinh doanh',
  'Marketing',
  'CNTT',
  'Quản lý chất lượng (QA/QC)',
  'Hành chính & Nhân sự',
  'Kế toán & Tài chính',
  'Kho vận & Logistics',
];

const DELEGATION_LEVELS = [
  { value: 'company', label: 'Cấp Ban Giám Đốc (Toàn doanh nghiệp)' },
  { value: 'department', label: 'Cấp Phòng Ban (Trưởng phòng / Đơn vị)' },
  { value: 'project', label: 'Cấp Dự Án (Quản lý dự án)' },
  { value: 'team', label: 'Cấp Tổ / Nhóm (Tổ trưởng / Kỹ sư)' },
];

export default function EmployeeDetailPage({
  employee,
  isCreate = false,
  onBack,
  onSaved,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/admin/employees');
    }
  };

  const initialSnapshotRef = useRef(null);
  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = {
      code: employee?.code || (isCreate ? `NV-${Math.floor(100 + Math.random() * 900)}` : ''),
      fullName: employee?.fullName || '',
      department: employee?.department || 'Kỹ thuật',
      position: employee?.position || 'Kỹ sư kỹ thuật',
      delegationLevel: employee?.delegationLevel || 'department',
      phone: employee?.phone || '',
      email: employee?.email || '',
      status: employee?.status || 'active',
      address: employee?.address || 'Nhà máy Bao bì Goldsun - Hưng Yên',
      notes: employee?.notes || '',
    };
  }

  const [code, setCode] = useState(initialSnapshotRef.current.code);
  const [fullName, setFullName] = useState(initialSnapshotRef.current.fullName);
  const [department, setDepartment] = useState(initialSnapshotRef.current.department);
  const [position, setPosition] = useState(initialSnapshotRef.current.position);
  const [delegationLevel, setDelegationLevel] = useState(initialSnapshotRef.current.delegationLevel);
  const [phone, setPhone] = useState(initialSnapshotRef.current.phone);
  const [email, setEmail] = useState(initialSnapshotRef.current.email);
  const [status, setStatus] = useState(initialSnapshotRef.current.status);
  const [address, setAddress] = useState(initialSnapshotRef.current.address);
  const [notes, setNotes] = useState(initialSnapshotRef.current.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Dirty checking
  const isDirty = useMemo(() => {
    if (saving) return false;
    const init = initialSnapshotRef.current;
    if (code.trim() !== (init.code || '').trim()) return true;
    if (fullName.trim() !== (init.fullName || '').trim()) return true;
    if (department !== init.department) return true;
    if (position.trim() !== (init.position || '').trim()) return true;
    if (delegationLevel !== init.delegationLevel) return true;
    if (phone.trim() !== (init.phone || '').trim()) return true;
    if (email.trim() !== (init.email || '').trim()) return true;
    if (status !== init.status) return true;
    if (address.trim() !== (init.address || '').trim()) return true;
    if (notes.trim() !== (init.notes || '').trim()) return true;
    return false;
  }, [
    code,
    fullName,
    department,
    position,
    delegationLevel,
    phone,
    email,
    status,
    address,
    notes,
    saving,
  ]);

  const allowLeaveRef = useRef(false);

  // React Router blocker for dirty state
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (allowLeaveRef.current) return false;
      return (
        isDirty &&
        !saving &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search)
      );
    }
  );

  const isBlocked = (blocker.state === 'blocked' || showExitConfirm) && !allowLeaveRef.current;

  const handleAttemptBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      allowLeaveRef.current = true;
      handleBack();
    }
  };

  const handleCancelLeave = () => {
    setShowExitConfirm(false);
    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
  };

  const handleConfirmLeave = () => {
    setShowExitConfirm(false);
    allowLeaveRef.current = true;
    if (blocker.state === 'blocked') {
      blocker.proceed?.();
    } else {
      handleBack();
    }
  };

  // Browser reload / tab close protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saving]);

  // Escape key protection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isBlocked) {
        handleAttemptBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isBlocked]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên nhân sự.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const payload = {
        code: code.trim(),
        fullName: fullName.trim(),
        department,
        position: position.trim(),
        delegationLevel,
        phone: phone.trim(),
        email: email.trim(),
        status,
        address: address.trim(),
        notes: notes.trim(),
      };

      if (isCreate) {
        await taskService.createEmployee(payload);
        notify.success(`Đã thêm mới nhân sự ${fullName}`);
      } else {
        await taskService.updateEmployee(employee.id, payload);
        notify.success(`Đã cập nhật hồ sơ nhân sự ${fullName}`);
      }

      if (onSaved) onSaved();
      handleBack();
    } catch (err) {
      setError(err?.message || 'Không thể lưu hồ sơ nhân sự.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async () => {
    const empId = employee?.id || employee?.IdSeq || employee?.code || code;
    if (!empId) return;
    setDeleteBusy(true);
    try {
      await taskService.deleteEmployee(empId);
      notify.success(`Đã xóa nhân sự "${fullName || code}" thành công.`);
      setShowDeleteModal(false);
      allowLeaveRef.current = true;
      if (onSaved) onSaved();
      handleBack();
    } catch (err) {
      notify.error('Lỗi khi xóa nhân sự: ' + (err.message || ''));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <ManagementFrame
        className="h-full"
        scrollableContent={false}
        header={
          <div className="flex flex-wrap items-center justify-between w-full gap-3 py-2">
            {/* Left: Back button & Employee Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                icon={ArrowLeft}
                disabled={saving}
                onClick={handleAttemptBack}
                title="Quay lại danh sách nhân sự"
              >
                Quay lại
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {isCreate ? 'Thêm hồ sơ nhân sự mới' : fullName || code}
                  </h2>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {code}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{department}</span>
                  <span>·</span>
                  <span>{position}</span>
                  <span>·</span>
                  <span className={status === 'active' ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {status === 'active' ? 'Đang làm việc' : 'Nghỉ việc'}
                  </span>
                  {isDirty && (
                    <>
                      <span>·</span>
                      <span className="text-amber-600 dark:text-amber-400 italic font-medium">
                        (Có thay đổi chưa lưu)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {!isCreate && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  disabled={saving || deleteBusy}
                  onClick={() => setShowDeleteModal(true)}
                  className="text-rose-600 hover:text-rose-700 border-rose-300 dark:border-rose-800"
                  title="Xóa nhân sự này khỏi hệ thống"
                >
                  Xóa nhân sự
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={saving || deleteBusy}
                onClick={handleAttemptBack}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                disabled={saving || deleteBusy || !fullName.trim()}
                onClick={handleSubmit}
              >
                {saving ? 'Đang lưu...' : isCreate ? 'Lưu hồ sơ' : 'Cập nhật hồ sơ'}
              </Button>
            </div>
          </div>
        }
      >
        {error && (
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* 2-Column Split Layout Edge-to-Edge */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950 overflow-hidden">
          {/* Left Column: Basic Information */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Thông tin nhân sự
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {/* Mã nhân sự */}
                <div className="py-2.5 first:pt-0">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mã nhân sự <span className="text-rose-500">*</span>
                  </label>
                  {isCreate ? (
                    <input
                      type="text"
                      required
                      disabled={saving}
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="VD: NV-001..."
                      className="w-full h-8 px-0 border-0 bg-transparent font-mono text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                    />
                  ) : (
                    <div className="h-8 flex items-center font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {code}
                    </div>
                  )}
                </div>

                {/* Họ và tên */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Họ và tên nhân sự <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={saving}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn An..."
                    className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* Phòng ban / Khối */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phòng ban / Đơn vị <span className="text-rose-500">*</span>
                  </label>
                  <div className="h-8 flex items-center">
                    <Select
                      size="sm"
                      disabled={saving}
                      value={department}
                      onChange={e => {
                        const val = typeof e === 'object' && e?.target ? e.target.value : e;
                        setDepartment(val);
                      }}
                      options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
                      className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                    />
                  </div>
                </div>

                {/* Chức danh / Vị trí */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Chức danh / Vị trí đảm nhiệm
                  </label>
                  <input
                    type="text"
                    disabled={saving}
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    placeholder="VD: Kỹ sư Thiết kế Cấu trúc Bao bì..."
                    className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none focus:ring-0 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* Cấp bậc quản lý */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phân cấp thẩm quyền
                  </label>
                  <div className="h-8 flex items-center">
                    <Select
                      size="sm"
                      disabled={saving}
                      value={delegationLevel}
                      onChange={e => {
                        const val = typeof e === 'object' && e?.target ? e.target.value : e;
                        setDelegationLevel(val);
                      }}
                      options={DELEGATION_LEVELS}
                      className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                    />
                  </div>
                </div>

                {/* Trạng thái làm việc */}
                <div className="py-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Trạng thái nhân sự
                  </label>
                  <div className="h-8 flex items-center">
                    <Select
                      size="sm"
                      disabled={saving}
                      value={status}
                      onChange={e => {
                        const val = typeof e === 'object' && e?.target ? e.target.value : e;
                        setStatus(val);
                      }}
                      options={[
                        { value: 'active', label: 'Đang làm việc' },
                        { value: 'inactive', label: 'Đã nghỉ việc / Tạm hoãn' },
                      ]}
                      className="w-full text-sm [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-0! [&>button]:h-8! [&>button]:shadow-none! [&>button]:ring-0! [&>button]:text-sm! [&>button]:font-medium! [&>button]:rounded-none!"
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Details Canvas */}
          <main className="flex flex-col min-w-0 min-h-0 overflow-y-auto p-4 lg:p-6 bg-white dark:bg-slate-950 space-y-6">
            {/* Thông tin liên lạc & Địa điểm làm việc */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Thông tin liên lạc & Địa điểm công tác
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="text"
                    disabled={saving}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="VD: 0988 123 456"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Hòm thư điện tử (Email)
                  </label>
                  <input
                    type="email"
                    disabled={saving}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="VD: nv.kythuat@goldsunpackaging.vn"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Địa điểm làm việc / Trụ sở nhà máy
                  </label>
                  <input
                    type="text"
                    disabled={saving}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="VD: Nhà máy Hưng Yên, KCN Phố Nối A"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Ghi chú & Phân công nhiệm vụ */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Ghi chú hồ sơ & Phân định trách nhiệm
              </h3>
              <textarea
                rows={4}
                disabled={saving}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Nhập ghi chú về kinh nghiệm, chứng chỉ chuyên môn, phụ trách máy móc thiết bị..."
                className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-none bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </main>
        </div>
      </ManagementFrame>

      {/* Unsaved Changes Confirmation Modal */}
      <Modal
        open={isBlocked}
        onClose={handleCancelLeave}
        title="Thay đổi chưa được lưu"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelLeave}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleConfirmLeave}
            >
              Rời khỏi trang
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Bạn đang có các nội dung thông tin nhân sự chưa được lưu. Nếu rời khỏi trang bây giờ, toàn bộ chỉnh sửa vừa nhập sẽ bị mất. Bạn có chắc chắn muốn rời đi?
        </p>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => !deleteBusy && setShowDeleteModal(false)}
        title="Xác nhận xóa nhân sự"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={deleteBusy}
              onClick={() => setShowDeleteModal(false)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              disabled={deleteBusy}
              onClick={handleDeleteEmployee}
            >
              {deleteBusy ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
              Bạn có chắc chắn muốn xóa hồ sơ nhân sự <strong>"{fullName || code}"</strong>?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Thao tác này sẽ xóa vĩnh viễn nhân sự khỏi danh bạ nội bộ và các liên kết công việc. Dữ liệu sau khi xóa sẽ không thể khôi phục.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
