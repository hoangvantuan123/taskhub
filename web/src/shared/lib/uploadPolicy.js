/**
 * Upload Security Policy & File Validation Standard
 * Quy chuẩn an toàn thông tin & kiểm soát định dạng tệp tin tải lên hệ thống.
 * Mặc định chỉ cho phép các tệp văn phòng và kỹ thuật an toàn:
 * - PDF (.pdf)
 * - Microsoft Word (.docx, .doc)
 * - Bảng tính Excel (.xlsx, .xls, .csv)
 * - Markdown (.md)
 * Tuyệt đối không cho phép bản vẽ CAD (.dwg, .dxf) hoặc mã thực thi (.exe, .bat, .sh, .vbs).
 */

export const STORAGE_KEY = 'app_upload_security_policy';

export const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'vbs', 'js', 'ps1', 'dll', 'bin', 'com', 'scr',
  'msi', 'jar', 'reg', 'pif', 'hta', 'cpl', 'msc', 'wsf', 'dwg', 'dxf', 'cad',
];

export const DEFAULT_ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'md'];

export const EXTENSION_METADATA = {
  pdf: { label: 'Tài liệu PDF', mime: 'application/pdf', category: 'pdf', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  docx: { label: 'Word (DOCX)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'word', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  doc: { label: 'Word (DOC)', mime: 'application/msword', category: 'word', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  xlsx: { label: 'Excel (XLSX)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'excel', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  xls: { label: 'Excel (XLS)', mime: 'application/vnd.ms-excel', category: 'excel', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  csv: { label: 'Dữ liệu CSV', mime: 'text/csv', category: 'excel', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  md: { label: 'Markdown (MD)', mime: 'text/markdown', category: 'md', color: 'text-slate-700 bg-slate-100 border-slate-300' },
};

export const DEFAULT_UPLOAD_POLICY = {
  allowedExtensions: [...DEFAULT_ALLOWED_EXTENSIONS],
  maxFileSizeMb: 50,
  checkMimeType: true,
  blockExecutableFiles: true,
  updatedAt: new Date().toISOString(),
};

/**
 * Lấy cấu hình chính sách tải lên hiện tại từ localStorage hoặc mặc định
 */
export function getUploadPolicy() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UPLOAD_POLICY };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_UPLOAD_POLICY,
      ...parsed,
      allowedExtensions: Array.isArray(parsed.allowedExtensions) && parsed.allowedExtensions.length > 0
        ? parsed.allowedExtensions.map(e => e.toLowerCase().replace(/^\./, ''))
        : [...DEFAULT_ALLOWED_EXTENSIONS],
    };
  } catch (e) {
    console.error('Error reading upload policy from storage:', e);
    return { ...DEFAULT_UPLOAD_POLICY };
  }
}

/**
 * Lưu cấu hình chính sách tải lên mới vào localStorage
 */
export function saveUploadPolicy(policy) {
  try {
    const cleanExtensions = Array.isArray(policy.allowedExtensions)
      ? policy.allowedExtensions
          .map(e => String(e).toLowerCase().replace(/^\./, '').trim())
          .filter(e => e && !DANGEROUS_EXTENSIONS.includes(e))
      : [...DEFAULT_ALLOWED_EXTENSIONS];

    const toSave = {
      allowedExtensions: cleanExtensions,
      maxFileSizeMb: Number(policy.maxFileSizeMb) || 50,
      checkMimeType: Boolean(policy.checkMimeType !== false),
      blockExecutableFiles: true,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    window.dispatchEvent(new CustomEvent('upload-policy-updated', { detail: toSave }));
    return toSave;
  } catch (e) {
    console.error('Error saving upload policy:', e);
    return { ...DEFAULT_UPLOAD_POLICY };
  }
}

/**
 * Trả về chuỗi accept cho thẻ <input type="file" accept="...">
 */
export function getAcceptString(policy = getUploadPolicy()) {
  const exts = policy.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;
  return exts.map(e => `.${e}`).join(',');
}

/**
 * Kiểm tra tính hợp lệ và an toàn của tệp tin trước khi tải lên
 */
export function validateUploadFile(file, policy = getUploadPolicy()) {
  if (!file || !file.name) {
    return { valid: false, error: 'Tệp tin không hợp lệ hoặc không xác định.', ext: '' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Kiểm tra phần mở rộng nguy hiểm
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Tệp "${file.name}" bị từ chối: Định dạng .${ext} không được phép tải lên hệ thống vì lý do bảo mật.`,
      ext,
    };
  }

  // 2. Kiểm tra danh sách Whitelist
  const allowed = policy.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;
  if (!allowed.includes(ext)) {
    return {
      valid: false,
      error: `Tệp "${file.name}" bị từ chối: Định dạng .${ext} chưa được cấu hình cho phép. Hệ thống chỉ chấp nhận: ${allowed.map(e => `.${e}`).join(', ')}.`,
      ext,
    };
  }

  // 3. Kiểm tra dung lượng tệp tin
  const maxBytes = (policy.maxFileSizeMb || 50) * 1024 * 1024;
  if (file.size > maxBytes) {
    const currentMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Tệp "${file.name}" vượt quá dung lượng cho phép (${currentMb} MB > tối đa ${policy.maxFileSizeMb} MB).`,
      ext,
    };
  }

  return { valid: true, ext };
}

