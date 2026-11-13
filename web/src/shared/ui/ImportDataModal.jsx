import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Modal from './Modal';
import Button from './Button';
import { Play, Upload, Download, FileText, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

const DEFAULT_LOOKUP_ROWS = [
  ['Phòng ban (department)', 'IT', 'Công nghệ thông tin', 'Áp dụng cho kỹ sư, chuyên viên IT'],
  ['Phòng ban (department)', 'KY_THUAT', 'Phòng Kỹ thuật', 'Kỹ thuật cơ khí, tự động hóa, điện'],
  ['Phòng ban (department)', 'SAN_XUAT', 'Khối Sản xuất', 'Vận hành xưởng, dây chuyền MES'],
  ['Phòng ban (department)', 'CHAT_LUONG', 'Phòng Quản lý chất lượng (QA/QC)', 'Kiểm thử, thanh tra chất lượng'],
  ['Phòng ban (department)', 'KHO_VAN', 'Phòng Kho vận & Logistics', 'Quản lý tồn kho, xuất nhập vật tư'],
  ['Phòng ban (department)', 'BAO_TRI', 'Phòng Bảo trì thiết bị', 'Bảo dưỡng định kỳ máy móc'],
  ['Chức danh (job_role)', 'learner', 'Học viên / Nhân viên', 'Tham gia khóa học và làm bài kiểm tra'],
  ['Chức danh (job_role)', 'author', 'Tác giả ngân hàng câu hỏi', 'Soạn thảo câu hỏi, bộ đề'],
  ['Chức danh (job_role)', 'reviewer', 'Người phản biện / Duyệt đề', 'Thẩm định và phê duyệt câu hỏi'],
  ['Chức danh (job_role)', 'exam_manager', 'Cán bộ tổ chức thi', 'Lên lịch, tạo ca thi, giám sát thi'],
  ['Chức danh (job_role)', 'grader', 'Giám khảo chấm thi', 'Chấm bài thi tự luận, thực hành'],
  ['Cấp bậc ISA-95 (level)', 'L0', 'Cấp L0 — Thiết bị trường & Cảm biến', 'Field sensors, Actuators'],
  ['Cấp bậc ISA-95 (level)', 'L1', 'Cấp L1 — PLC & Điều khiển máy', 'PLC, DCS, Máy CNC'],
  ['Cấp bậc ISA-95 (level)', 'L2', 'Cấp L2 — SCADA & Giao diện HMI', 'Supervisory control & HMI'],
  ['Cấp bậc ISA-95 (level)', 'L3', 'Cấp L3 — MES / MOM & ERP Liên vận', 'Manufacturing Operations'],
];

/**
 * Standardized ImportDataModal matching SkillHub enterprise specifications.
 * Supports:
 * - Native Excel template download (.xlsx with 2 sheets: Data entry + CodeHelp Lookup)
 * - Drag and drop file upload (.xlsx, .xls, .csv)
 * - In-browser XLSX parsing & validation
 * - Options: Skip errors, update duplicates
 * - Preview of parsed rows before committing
 */
export default function ImportDataModal({
  open,
  onClose,
  title = 'Nhập dữ liệu từ file Excel',
  templateHeaders = ['username', 'name', 'password', 'department', 'position', 'job_role', 'phone', 'contact_email'],
  sampleRow = ['nguyenvana', 'Nguyễn Văn A', 'Admin@123456', 'IT', 'Kỹ sư phần mềm', 'Chuyên viên', '0912345678', 'nva@example.com'],
  lookupRows,
  onImport,
  onSuccess,
}) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [skipErrors, setSkipErrors] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Data Entry Form
    const wsData = [
      templateHeaders,
      sampleRow,
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(wsData);
    ws1['!cols'] = templateHeaders.map(h => ({ wch: Math.max(16, h.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws1, 'Du_Lieu_Nhap');

    // Sheet 2: CodeHelp / Reference Catalog
    const lookupHeaders = ['Nhóm danh mục', 'Mã giá trị (Code)', 'Tên hiển thị (Label)', 'Ghi chú / Hướng dẫn'];
    const lookupContent = [
      lookupHeaders,
      ...(lookupRows || DEFAULT_LOOKUP_ROWS),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(lookupContent);
    ws2['!cols'] = [{ wch: 26 }, { wch: 20 }, { wch: 36 }, { wch: 38 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Danh_Muc_Tra_Cuu');

    // Generate binary XLSX buffer and trigger download
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mau_Nhap_DuLieu.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  };

  const handleFileChange = e => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = selectedFile => {
    setError('');
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const buffer = event.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        // Prefer sheet named 'Du_Lieu_Nhap' or default to the first sheet
        const sheetName = workbook.SheetNames.includes('Du_Lieu_Nhap')
          ? 'Du_Lieu_Nhap'
          : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error('Không tìm thấy bảng tính dữ liệu trong file Excel.');
        }

        const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const rows = parseMatrixData(rawMatrix, templateHeaders);
        if (!rows.length) {
          throw new Error('File Excel không chứa dòng dữ liệu hợp lệ.');
        }
        setParsedRows(rows);
      } catch (err) {
        setError(err.message || 'Không thể đọc nội dung file Excel.');
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      setError('Đã xảy ra lỗi khi đọc file từ ổ đĩa.');
      setParsedRows([]);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = e => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleExecute = async () => {
    if (!parsedRows.length) {
      setError('Vui lòng chọn file dữ liệu hợp lệ trước khi thực hiện.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      if (onImport) {
        await onImport(parsedRows, { skipErrors, updateExisting });
      }
      onSuccess?.(parsedRows.length);
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi nhập dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={title}
      size="md"
      fitContent={true}
      maxWidth="620px"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            size="sm"
            variant="primary"
            icon={Play}
            disabled={loading || !parsedRows.length}
            onClick={handleExecute}
            className="!h-9 !px-4 !text-xs font-semibold"
          >
            Bắt đầu thực hiện
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={onClose}
            className="!h-9 !px-4 !text-xs font-medium"
          >
            Thoát ra
          </Button>
        </div>
      }
    >
      <div className="space-y-5 select-none">
        {error && (
          <div role="alert" className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* SECTION 1: TẢI BIỂU MẪU MẪU */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              FILE MẪU CHUẨN (EXCEL NATIVE .XLSX)
            </h4>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <div>
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Tải file Excel mẫu (.xlsx đa Sheet)
              </div>
              <div className="text-[11px] text-slate-500">
                Bao gồm Sheet 'Du_Lieu_Nhap' và Sheet 'Danh_Muc_Tra_Cuu' (CodeHelp)
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Tải file Excel mẫu</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: CHỌN FILE DỮ LIỆU */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            CHỌN FILE DỮ LIỆU EXCEL (.XLSX, .XLS)
          </h4>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                : file
                ? 'border-emerald-400 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-sky-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <Upload size={24} className="mx-auto mb-2 text-slate-400 dark:text-slate-500" />
            {file ? (
              <div>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>{file.name}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB · Đã tìm thấy {parsedRows.length} dòng dữ liệu
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Kéo thả file vào đây hoặc <span className="text-sky-600 dark:text-sky-400 underline font-semibold">chọn từ máy tính</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">Hỗ trợ định dạng .csv, .txt (mã hóa UTF-8)</div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: TÙY CHỌN NHẬP DỮ LIỆU */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 pb-1 mb-2 border-b border-slate-100 dark:border-slate-800">
            TÙY CHỌN NHẬP DỮ LIỆU
          </h4>

          <div className="space-y-3">
            <div
              onClick={() => setSkipErrors(v => !v)}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer"
            >
              <ToggleSwitch checked={skipErrors} onChange={() => setSkipErrors(v => !v)} />
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Bỏ qua các dòng lỗi
                </div>
                <div className="text-xs text-slate-500">
                  Tiếp tục nhập các dòng hợp lệ nếu gặp dòng thiếu thông tin bắt buộc
                </div>
              </div>
            </div>

            <div
              onClick={() => setUpdateExisting(v => !v)}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer"
            >
              <ToggleSwitch checked={updateExisting} onChange={() => setUpdateExisting(v => !v)} />
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Cập nhật nếu tài khoản đã tồn tại
                </div>
                <div className="text-xs text-slate-500">
                  Ghi đè họ tên, phòng ban, vị trí nếu trùng tên đăng nhập
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW OF PARSED ROWS */}
        {parsedRows.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Xem trước 5 dòng đầu tiên:
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto text-xs max-h-36">
              <table className="w-full border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2 text-left border-b border-slate-200 dark:border-slate-700">#</th>
                    <th className="p-2 text-left border-b border-slate-200 dark:border-slate-700">Tài khoản</th>
                    <th className="p-2 text-left border-b border-slate-200 dark:border-slate-700">Họ và tên</th>
                    <th className="p-2 text-left border-b border-slate-200 dark:border-slate-700">Phòng ban</th>
                    <th className="p-2 text-left border-b border-slate-200 dark:border-slate-700">Vị trí</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="p-2 text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{row.username || '—'}</td>
                      <td className="p-2 text-slate-700 dark:text-slate-300">{row.name || '—'}</td>
                      <td className="p-2 text-slate-500">{row.department || '—'}</td>
                      <td className="p-2 text-slate-500">{row.position || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={e => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-sky-600 dark:bg-sky-500 cursor-pointer' : 'bg-slate-300 dark:bg-slate-700 cursor-pointer'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function parseMatrixData(matrix, expectedHeaders) {
  if (!Array.isArray(matrix) || matrix.length < 2) return [];

  // Parse header row
  const rawHeaders = (matrix[0] || []).map(h => String(h || '').trim().toLowerCase());
  const headerMap = {};

  rawHeaders.forEach((h, index) => {
    // Map common aliases
    if (h === 'tài khoản' || h === 'username' || h === 'user' || h === 'ma_nv') headerMap.username = index;
    else if (h === 'họ và tên' || h === 'họ tên' || h === 'name' || h === 'ten') headerMap.name = index;
    else if (h === 'mật khẩu' || h === 'password' || h === 'pass') headerMap.password = index;
    else if (h === 'phòng ban' || h === 'department') headerMap.department = index;
    else if (h === 'vị trí' || h === 'position') headerMap.position = index;
    else if (h === 'vai trò' || h === 'chức danh' || h === 'job_role' || h === 'role') headerMap.job_role = index;
    else if (h === 'số điện thoại' || h === 'sđt' || h === 'phone') headerMap.phone = index;
    else if (h === 'email' || h === 'contact_email') headerMap.contact_email = index;
    else {
      // Find direct matching header or partial match
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
    // Only accept rows that have at least one meaningful identifier
    if (obj.username || obj.name || obj.code || obj.title) {
      if (!obj.password && (Object.hasOwn(headerMap, 'password') || expectedHeaders.includes('password'))) {
        obj.password = 'Admin@123456';
      }
      parsed.push(obj);
    }
  }

  return parsed;
}
