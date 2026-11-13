/**
 * Tìm kiếm và xác định "Cấp bậc sếp phòng mình" (Trưởng phòng / Quản lý / Giám đốc phụ trách)
 * dựa trên danh sách nhân sự (employees) và phòng ban của người dùng (userDepartment).
 */
export function findDepartmentBoss(employees = [], userDepartment = '', currentUserId = null) {
  if (!Array.isArray(employees) || employees.length === 0) return null;

  const targetDept = (userDepartment || '').trim().toLowerCase();

  // Điểm ưu tiên cấp bậc quản lý / sếp phòng
  const getBossScore = (emp) => {
    const pos = (emp.position || '').toLowerCase();
    const name = (emp.fullName || emp.name || '').toLowerCase();
    const level = (emp.delegationLevel || '').toLowerCase();

    let score = 0;
    // Cấp bậc Trưởng phòng / Trưởng bộ phận / Quản đốc / Giám đốc
    if (pos.includes('trưởng phòng') || name.includes('trưởng phòng')) score += 100;
    if (pos.includes('trưởng bộ phận') || name.includes('trưởng bộ phận')) score += 95;
    if (pos.includes('kế toán trưởng')) score += 95;
    if (pos.includes('giám đốc') || name.includes('giám đốc')) score += 90;
    if (pos.includes('quản đốc')) score += 85;
    if (pos.includes('quản lý') || name.includes('quản lý')) score += 80;
    if (pos.includes('quản trị viên') || name.includes('admin')) score += 80;
    if (pos.includes('phó phòng') || name.includes('phó phòng')) score += 70;
    if (pos.includes('tổ trưởng') || name.includes('tổ trưởng')) score += 60;
    if (pos.includes('trưởng nhóm') || name.includes('lead')) score += 60;

    if (level === 'department') score += 30;
    if (level === 'company' || level === 'director' || level === 'executive') score += 20;

    return score;
  };

  // 1. Tìm trong đúng phòng ban của người dùng
  if (targetDept) {
    const deptEmployees = employees.filter((e) => {
      const eDept = (e.department || '').trim().toLowerCase();
      if (!eDept) return false;
      if (eDept === targetDept) return true;
      // Khớp theo các từ khóa đặc trưng của phòng ban
      if (targetDept.includes('erp') && (eDept.includes('erp') || eDept.includes('cntt'))) return true;
      if (targetDept.includes('cntt') && (eDept.includes('cntt') || eDept.includes('it'))) return true;
      if (targetDept.includes('kỹ thuật') && eDept.includes('kỹ thuật')) return true;
      if (targetDept.includes('sản xuất') && eDept.includes('sản xuất')) return true;
      if (targetDept.includes('chất lượng') && (eDept.includes('qa') || eDept.includes('qc') || eDept.includes('chất lượng'))) return true;
      if (targetDept.includes('r&d') && (eDept.includes('r&d') || eDept.includes('thiết kế'))) return true;
      if (targetDept.includes('cung ứng') && (eDept.includes('cung ứng') || eDept.includes('logistics') || eDept.includes('kho'))) return true;
      if (targetDept.includes('kinh doanh') && eDept.includes('kinh doanh')) return true;
      if (targetDept.includes('nhân sự') && (eDept.includes('nhân sự') || eDept.includes('hành chính'))) return true;
      if (targetDept.includes('kế toán') && (eDept.includes('kế toán') || eDept.includes('tài chính'))) return true;
      return false;
    });

    if (deptEmployees.length > 0) {
      // Sắp xếp theo cấp bậc quản lý giảm dần
      const sorted = [...deptEmployees].sort((a, b) => getBossScore(b) - getBossScore(a));

      // Nếu có người đạt điểm quản lý/sếp, trả về người đó
      if (getBossScore(sorted[0]) > 0) {
        return sorted[0];
      }
      return sorted[0];
    }
  }

  // 2. Dự phòng: Tìm cấp quản lý trong Ban Giám Đốc hoặc Trưởng phòng chung
  const generalBoss = employees
    .filter((e) => getBossScore(e) >= 80)
    .sort((a, b) => getBossScore(b) - getBossScore(a))[0];

  return generalBoss || employees[0] || null;
}

