const XLSX = require('xlsx');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ HẠNG MỤC 1: IMPORT & EXPORT EXCEL NATIVE (.XLSX)');
console.log('====================================================\n');

// 1. Dữ liệu cấu hình mẫu
const templateHeaders = ['username', 'name', 'password', 'department', 'position', 'job_role', 'phone', 'contact_email'];
const sampleRow = ['nguyenvana', 'Nguyễn Văn A', 'Admin@123456', 'IT', 'Kỹ sư phần mềm', 'Chuyên viên', '0912345678', 'nva@example.com'];

const DEFAULT_LOOKUP_ROWS = [
  ['Phòng ban (department)', 'IT', 'Công nghệ thông tin', 'Áp dụng cho kỹ sư, chuyên viên IT'],
  ['Phòng ban (department)', 'KY_THUAT', 'Phòng Kỹ thuật', 'Kỹ thuật cơ khí, tự động hóa, điện'],
  ['Phòng ban (department)', 'SAN_XUAT', 'Khối Sản xuất', 'Vận hành xưởng, dây chuyền MES'],
  ['Phòng ban (department)', 'CHAT_LUONG', 'Phòng Quản lý chất lượng (QA/QC)', 'Kiểm thử, thanh tra chất lượng'],
  ['Chức danh (job_role)', 'learner', 'Học viên / Nhân viên', 'Tham gia khóa học và làm bài kiểm tra'],
  ['Chức danh (job_role)', 'author', 'Tác giả ngân hàng câu hỏi', 'Soạn thảo câu hỏi, bộ đề'],
  ['Cấp bậc ISA-95 (level)', 'L0', 'Cấp L0 — Thiết bị trường & Cảm biến', 'Field sensors, Actuators'],
  ['Cấp bậc ISA-95 (level)', 'L1', 'Cấp L1 — PLC & Điều khiển máy', 'PLC, DCS, Máy CNC'],
  ['Cấp bậc ISA-95 (level)', 'L2', 'Cấp L2 — SCADA & Giao diện HMI', 'Supervisory control & HMI'],
  ['Cấp bậc ISA-95 (level)', 'L3', 'Cấp L3 — MES / MOM & ERP Liên vận', 'Manufacturing Operations'],
];

// Hàm parser mô phỏng logic trong ImportDataModal.jsx
function parseMatrixData(matrix, expectedHeaders) {
  if (!Array.isArray(matrix) || matrix.length < 2) return [];

  const rawHeaders = (matrix[0] || []).map(h => String(h || '').trim().toLowerCase());
  const headerMap = {};

  rawHeaders.forEach((h, index) => {
    if (h === 'tài khoản' || h === 'username' || h === 'user' || h === 'ma_nv') headerMap.username = index;
    else if (h === 'họ và tên' || h === 'họ tên' || h === 'name' || h === 'ten') headerMap.name = index;
    else if (h === 'mật khẩu' || h === 'password' || h === 'pass') headerMap.password = index;
    else if (h === 'phòng ban' || h === 'department') headerMap.department = index;
    else if (h === 'vị trí' || h === 'position') headerMap.position = index;
    else if (h === 'vai trò' || h === 'chức danh' || h === 'job_role' || h === 'role') headerMap.job_role = index;
    else if (h === 'số điện thoại' || h === 'sđt' || h === 'phone') headerMap.phone = index;
    else if (h === 'email' || h === 'contact_email') headerMap.contact_email = index;
    else {
      const matched = expectedHeaders.find(eh => eh.toLowerCase() === h);
      if (matched) headerMap[matched] = index;
      else headerMap[h] = index;
    }
  });

  const parsed = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || !row.length) continue;
    const obj = {};
    for (const [key, colIdx] of Object.entries(headerMap)) {
      const val = row[colIdx];
      obj[key] = val !== undefined && val !== null ? String(val).trim() : '';
    }
    if (obj.username || obj.name || obj.code || obj.title) {
      if (!obj.password && (Object.hasOwn(headerMap, 'password') || expectedHeaders.includes('password'))) {
        obj.password = 'Admin@123456';
      }
      parsed.push(obj);
    }
  }

  return parsed;
}

// ==========================================
// TEST CASE 1: TẠO FILE EXCEL MẪU (.XLSX) ĐA SHEET
// ==========================================
console.log('🔹 Test Case 1: Tạo Workbook mẫu .xlsx 2 Sheet (Du_Lieu_Nhap + Danh_Muc_Tra_Cuu)...');
const wb = XLSX.utils.book_new();

// Sheet 1: Du_Lieu_Nhap
const ws1Data = [templateHeaders, sampleRow];
const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
ws1['!cols'] = templateHeaders.map(h => ({ wch: Math.max(16, h.length + 4) }));
XLSX.utils.book_append_sheet(wb, ws1, 'Du_Lieu_Nhap');

// Sheet 2: Danh_Muc_Tra_Cuu
const lookupHeaders = ['Nhóm danh mục', 'Mã giá trị (Code)', 'Tên hiển thị (Label)', 'Ghi chú / Hướng dẫn'];
const lookupContent = [lookupHeaders, ...DEFAULT_LOOKUP_ROWS];
const ws2 = XLSX.utils.aoa_to_sheet(lookupContent);
ws2['!cols'] = [{ wch: 26 }, { wch: 20 }, { wch: 36 }, { wch: 38 }];
XLSX.utils.book_append_sheet(wb, ws2, 'Danh_Muc_Tra_Cuu');

// Xuất ra binary buffer
const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
assert(buffer && buffer.length > 0, 'Buffer xuất ra phải có dữ liệu nhị phân');
console.log(`   ✅ Tạo thành công file binary .xlsx, kích thước: ${buffer.length} bytes.`);
console.log(`   ✅ Danh sách Sheets trong Workbook: ${wb.SheetNames.join(', ')}`);
assert.deepStrictEqual(wb.SheetNames, ['Du_Lieu_Nhap', 'Danh_Muc_Tra_Cuu']);

// ==========================================
// TEST CASE 2: ĐỌC & PARSE FILE EXCEL TỪ BUFFER NHỊ PHÂN
// ==========================================
console.log('\n🔹 Test Case 2: Đọc lại file Excel từ binary buffer...');
const readWb = XLSX.read(buffer, { type: 'buffer' });
assert(readWb.SheetNames.includes('Du_Lieu_Nhap'), 'Workbook phải có sheet Du_Lieu_Nhap');
assert(readWb.SheetNames.includes('Danh_Muc_Tra_Cuu'), 'Workbook phải có sheet Danh_Muc_Tra_Cuu');

const sheet1 = readWb.Sheets['Du_Lieu_Nhap'];
const rawMatrix = XLSX.utils.sheet_to_json(sheet1, { header: 1, defval: '' });
console.log(`   ✅ Sheet 'Du_Lieu_Nhap' có ${rawMatrix.length} dòng.`);

const parsedRows = parseMatrixData(rawMatrix, templateHeaders);
console.log(`   ✅ Đã phân tích thành công ${parsedRows.length} dòng dữ liệu:`, parsedRows[0]);
assert.strictEqual(parsedRows.length, 1);
assert.strictEqual(parsedRows[0].username, 'nguyenvana');
assert.strictEqual(parsedRows[0].name, 'Nguyễn Văn A');
assert.strictEqual(parsedRows[0].department, 'IT');

// ==========================================
// TEST CASE 3: PARSE FILE EXCEL THỰC TẾ TIẾNG VIỆT & TỰ ĐỘNG GÁN PASSWORD
// ==========================================
console.log('\n🔹 Test Case 3: Thử nghiệm nạp file Excel có Header Tiếng Việt & thiếu mật khẩu...');
const realUserExcel = XLSX.utils.book_new();
const viHeaders = ['Tài khoản', 'Họ và tên', 'Phòng ban', 'Vị trí', 'Vai trò', 'Số điện thoại', 'Email'];
const viData = [
  viHeaders,
  ['tranvanb', 'Trần Văn B', 'KY_THUAT', 'Kỹ sư tự động hóa', 'author', '0988776655', 'b.tran@example.com'],
  ['lethic', 'Lê Thị C', 'SAN_XUAT', 'Vận hành máy MES', 'learner', '0911223344', 'c.le@example.com'],
  ['', '', '', '', '', '', ''], // Dòng trống giả lập người dùng cách dòng
  ['hoangd', 'Hoàng D', 'CHAT_LUONG', 'Thanh tra QA', 'reviewer', '0933445566', 'd.hoang@example.com'],
];
const viWs = XLSX.utils.aoa_to_sheet(viData);
XLSX.utils.book_append_sheet(realUserExcel, viWs, 'Du_Lieu_Nhap');
const viBuffer = XLSX.write(realUserExcel, { bookType: 'xlsx', type: 'buffer' });

// Parse thử nghiệm
const viReadWb = XLSX.read(viBuffer, { type: 'buffer' });
const viMatrix = XLSX.utils.sheet_to_json(viReadWb.Sheets['Du_Lieu_Nhap'], { header: 1, defval: '' });
const viParsedRows = parseMatrixData(viMatrix, templateHeaders);

console.log(`   ✅ Kết quả phân tích (Đã tự động loại bỏ dòng trống, còn lại ${viParsedRows.length} tài khoản):`);
viParsedRows.forEach((r, idx) => {
  console.log(`      ${idx + 1}. [${r.username}] - ${r.name} (${r.department} / ${r.job_role}) - Pass mặc định: ${r.password}`);
});

assert.strictEqual(viParsedRows.length, 3);
assert.strictEqual(viParsedRows[0].username, 'tranvanb');
assert.strictEqual(viParsedRows[0].password, 'Admin@123456', 'Phải tự động gán password mặc định');
assert.strictEqual(viParsedRows[1].username, 'lethic');
assert.strictEqual(viParsedRows[2].username, 'hoangd');

// ==========================================
// TEST CASE 4: XUẤT FILE BÁO CÁO EXCEL NATIVE (.XLSX)
// ==========================================
console.log('\n🔹 Test Case 4: Kiểm thử ExportDataModal xuất file .xlsx...');
const exportColumns = [
  { id: 'username', label: 'Tài khoản' },
  { id: 'name', label: 'Họ và tên' },
  { id: 'department', label: 'Phòng ban' },
  { id: 'job_role', label: 'Chức danh' },
];
const exportRows = viParsedRows;
const exportWb = XLSX.utils.book_new();
const headerLabels = exportColumns.map(col => col.label || col.id);
const exportDataRows = exportRows.map(row => exportColumns.map(col => row[col.id] || ''));

const wsExportData = [
  ['BÁO CÁO DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG'],
  [`Ngày kết xuất: ${new Date().toLocaleString('vi-VN')} · Tổng số: ${exportRows.length} dòng`],
  [],
  headerLabels,
  ...exportDataRows,
];

const wsExport = XLSX.utils.aoa_to_sheet(wsExportData);
wsExport['!cols'] = exportColumns.map(col => ({ wch: 25 }));
XLSX.utils.book_append_sheet(exportWb, wsExport, 'Du_Lieu');

const exportBuffer = XLSX.write(exportWb, { bookType: 'xlsx', type: 'buffer' });
assert(exportBuffer && exportBuffer.length > 0, 'Export buffer phải hợp lệ');
console.log(`   ✅ Kết xuất thành công file Excel báo cáo .xlsx, kích thước: ${exportBuffer.length} bytes.`);

console.log('\n====================================================');
console.log('🎉 TẤT CẢ 4/4 TEST CASES CHO HẠNG MỤC 1 ĐỀU ĐẠT CHUẨN 100%!');
console.log('====================================================');
