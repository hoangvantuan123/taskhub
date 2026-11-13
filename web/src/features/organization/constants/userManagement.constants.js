export const kindNames = {
  department: 'Phòng ban',
  position: 'Vị trí',
  job_role: 'Vai trò công việc',
};

export const userColumns = [
  { id: 'username', label: 'Tài khoản', width: 220, minWidth: 160 },
  { id: 'name', label: 'Họ và tên', width: 220, minWidth: 160 },
  { id: 'department', label: 'Phòng ban', width: 180, minWidth: 130 },
  { id: 'position', label: 'Vị trí', width: 160, minWidth: 120 },
  { id: 'job_role', label: 'Vai trò', width: 160, minWidth: 120 },
  { id: 'groups', label: 'Nhóm quyền', width: 240, minWidth: 160 },
  { id: 'enabled', label: 'Trạng thái', width: 140, minWidth: 120 },
  { id: 'CreatedByName', label: 'Người tạo', width: 180, minWidth: 120, optional: true, defaultHidden: true },
  { id: 'UpdatedByName', label: 'Người cập nhật', width: 180, minWidth: 120, optional: true, defaultHidden: true },
  { id: 'CreatedAt', label: 'Ngày tạo', width: 160, minWidth: 120, optional: true, defaultHidden: true },
  { id: 'UpdatedAt', label: 'Ngày cập nhật', width: 160, minWidth: 120, optional: true, defaultHidden: true },
];

export const filterColumns = [
  { id: 'department', label: 'Phòng ban' },
  { id: 'position', label: 'Vị trí' },
  { id: 'job_role', label: 'Vai trò công việc' },
  { id: 'groups', label: 'Nhóm quyền' },
  { id: 'enabled', label: 'Trạng thái' },
];

export const formatDate = str => {
  if (!str) return '—';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return str;
  }
};
