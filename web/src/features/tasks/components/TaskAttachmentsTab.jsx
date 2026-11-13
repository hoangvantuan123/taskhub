import React, { useState, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Upload,
  FolderUp,
  FileText,
  Trash2,
  Eye,
  FolderArchive,
  FileCode,
  FileSpreadsheet,
  File,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import Button from '../../../shared/ui/Button';
import { notify } from '../../../shared/lib/notify';
import {
  validateUploadFile,
  getUploadPolicy,
  getAcceptString,
} from '../../../shared/lib/uploadPolicy';
import TaskImagePreviewModal from './TaskImagePreviewModal';

/**
 * Format bytes into human-readable string (KB, MB)
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Detect file category (Chỉ cho phép: PDF, Word, Excel, Markdown)
 */
function getFileCategory(name = '', type = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return 'excel';
  }
  if (['doc', 'docx'].includes(ext)) {
    return 'word';
  }
  if (ext === 'pdf') {
    return 'pdf';
  }
  if (ext === 'md') {
    return 'md';
  }
  return 'other';
}

/**
 * Return appropriate Icon for file
 */
function FileTypeIcon({ category, ext }) {
  if (['xls', 'xlsx', 'csv'].includes(ext) || category === 'excel') {
    return <FileSpreadsheet size={16} className="text-emerald-600" />;
  }
  if (ext === 'pdf' || category === 'pdf') {
    return <FileText size={16} className="text-rose-500" />;
  }
  if (['doc', 'docx'].includes(ext) || category === 'word') {
    return <FileText size={16} className="text-blue-500" />;
  }
  if (ext === 'md' || category === 'md') {
    return <FileCode size={16} className="text-slate-600 dark:text-slate-300" />;
  }
  return <File size={16} className="text-slate-400" />;
}

const TaskAttachmentsTab = forwardRef(function TaskAttachmentsTab({
  attachments = [],
  onChange,
  disabled = false,
  hideActions = false,
}, ref) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'pdf' | 'word' | 'excel' | 'md'
  const [previewMedia, setPreviewMedia] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [policy, setPolicy] = useState(() => getUploadPolicy());

  useImperativeHandle(ref, () => ({
    chooseFiles: () => fileInputRef.current?.click(),
    chooseFolder: () => folderInputRef.current?.click(),
  }));

  // Listen for security policy changes
  useEffect(() => {
    const handlePolicyChange = (e) => {
      if (e.detail) setPolicy(e.detail);
    };
    window.addEventListener('upload-policy-updated', handlePolicyChange);
    return () => window.removeEventListener('upload-policy-updated', handlePolicyChange);
  }, []);

  // Add files to attachments with strict security validation
  const handleAddFiles = (fileList, isFromFolder = false) => {
    if (!fileList || fileList.length === 0) return;

    const validItems = [];
    const rejectedFiles = [];

    Array.from(fileList).forEach((file, idx) => {
      // 1. Kiểm tra chính sách bảo mật định dạng
      const validation = validateUploadFile(file, policy);
      if (!validation.valid) {
        rejectedFiles.push({ name: file.name, error: validation.error });
        return;
      }

      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const category = getFileCategory(file.name, file.type);
      const folderPath = file.webkitRelativePath
        ? file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf('/'))
        : '';

      validItems.push({
        id: `att-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: ext,
        category,
        folderPath,
        fileObj: file,
        uploadedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      });
    });

    if (rejectedFiles.length > 0) {
      notify.error(
        `Từ chối ${rejectedFiles.length} tệp không đúng định dạng cho phép (${rejectedFiles[0].name}: chỉ cho phép .pdf, .docx, .xlsx, .xls, .csv, .md)`
      );
    }

    if (validItems.length > 0) {
      const next = [...attachments, ...validItems];
      onChange?.(next);
      notify.success(`Đã nạp thành công ${validItems.length} tài liệu hợp lệ vào danh sách.`);
    }
  };

  const handleFileSelect = (e) => {
    handleAddFiles(e.target.files);
    e.target.value = '';
  };

  const handleFolderSelect = (e) => {
    handleAddFiles(e.target.files, true);
    e.target.value = '';
  };

  const handleDelete = (id) => {
    const next = attachments.filter((item) => item.id !== id);
    onChange?.(next);
    notify.info('Đã gỡ tệp tin khỏi danh sách đính kèm.');
  };

  const handleClearAll = () => {
    if (attachments.length === 0) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả các tệp đính kèm?')) {
      onChange?.([]);
      notify.info('Đã xóa toàn bộ tệp đính kèm.');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer?.files?.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Filtered files
  const filtered = useMemo(() => {
    if (filterType === 'all') return attachments;
    return attachments.filter((item) => item.category === filterType);
  }, [attachments, filterType]);

  const totalSize = useMemo(() => {
    const sum = attachments.reduce((acc, curr) => acc + (curr.size || 0), 0);
    return formatFileSize(sum);
  }, [attachments]);

  const countPdf = useMemo(() => attachments.filter((a) => a.category === 'pdf').length, [attachments]);
  const countWord = useMemo(() => attachments.filter((a) => a.category === 'word').length, [attachments]);
  const countExcel = useMemo(() => attachments.filter((a) => a.category === 'excel').length, [attachments]);
  const countMd = useMemo(() => attachments.filter((a) => a.category === 'md').length, [attachments]);

  return (
    <div
      className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white dark:bg-slate-950 overflow-hidden text-xs rounded-none select-text"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file & folder inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept={getAcceptString(policy)}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={handleFolderSelect}
      />

      {/* 1. Header Toolbar (Flat Edge-to-Edge) */}
      <div className="h-10 min-h-[40px] px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-500 font-medium text-xs shrink-0">
            {attachments.length} tệp ({totalSize})
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2 py-1 rounded-none text-[11px] font-medium transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tất cả ({attachments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pdf')}
            className={`px-2 py-1 rounded-none text-[11px] font-medium transition cursor-pointer ${
              filterType === 'pdf'
                ? 'bg-rose-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            PDF ({countPdf})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('word')}
            className={`px-2 py-1 rounded-none text-[11px] font-medium transition cursor-pointer ${
              filterType === 'word'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Word ({countWord})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('excel')}
            className={`px-2 py-1 rounded-none text-[11px] font-medium transition cursor-pointer ${
              filterType === 'excel'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Excel ({countExcel})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('md')}
            className={`px-2 py-1 rounded-none text-[11px] font-medium transition cursor-pointer ${
              filterType === 'md'
                ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Markdown ({countMd})
          </button>
        </div>
      </div>

      {/* 2. Top Drag & Drop Action Banner */}
      <div
        className={`px-4 py-3 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0 ${
          isDragging
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500'
            : 'bg-slate-50/50 dark:bg-slate-900/30'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-none border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
              <Upload size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                Kéo thả tệp tin hoặc chọn thư mục từ máy tính
              </p>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                <span>Chỉ cho phép tài liệu an toàn: PDF (.pdf), Word (.docx, .doc), Excel (.xlsx, .xls, .csv), Markdown (.md). Tối đa {policy.maxFileSizeMb}MB.</span>
              </p>
            </div>
          </div>

          {!hideActions && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={FolderUp}
                disabled={disabled}
                onClick={() => folderInputRef.current?.click()}
                title="Chọn tải lên nguyên một thư mục tài liệu từ máy tính"
              >
                Tải cả thư mục
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={Plus}
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                title="Chọn tệp tin tài liệu (PDF, Word, Excel, MD)"
              >
                Chọn tệp tin
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Data Table of Attachments */}
      <div className="flex-1 min-h-0 w-full overflow-auto bg-white dark:bg-slate-950 no-scrollbar-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar:vertical]:hidden [&::-webkit-scrollbar]:w-0">
        <table className="w-full min-w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold select-none shadow-2xs">
            <tr>
              <th className="w-12 px-3 py-2.5 text-center font-mono text-slate-400">STT</th>
              <th className="w-14 px-2 py-2.5 text-center">Biểu tượng</th>
              <th className="px-3 py-2.5 min-w-[220px]">Tên tệp tin</th>
              <th className="w-48 px-3 py-2.5 min-w-[140px]">Thư mục nguồn</th>
              <th className="w-28 px-3 py-2.5">Định dạng</th>
              <th className="w-28 px-3 py-2.5">Dung lượng</th>
              <th className="w-36 px-3 py-2.5">Thời điểm</th>
              <th className="w-20 px-3 py-2.5 text-center">Tác vụ</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-0 border-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-20 px-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                      <FolderArchive size={30} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">
                      Chưa có tài liệu hay tệp tin nào được đính kèm
                    </p>
                    <p className="text-slate-400 text-xs max-w-md mb-4">
                      Kéo thả tệp tin hoặc thư mục trực tiếp vào đây, hoặc bấm vào vùng này để chọn tệp từ máy tính.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={Plus}
                        disabled={disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Chọn tệp tin từ máy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={FolderUp}
                        disabled={disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          folderInputRef.current?.click();
                        }}
                      >
                        Tải cả thư mục
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  {/* STT */}
                  <td className="w-12 px-2 py-2 text-center font-mono text-[11px] text-slate-400">
                    {idx + 1}
                  </td>

                  {/* Thumbnail / Icon */}
                  <td className="w-14 px-2 py-1.5 text-center">
                    <div className="w-10 h-10 mx-auto rounded-none border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                      <FileTypeIcon category={item.category} ext={item.type.toLowerCase()} />
                    </div>
                  </td>

                  {/* File Name */}
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-900 dark:text-white truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.category === 'pdf'
                        ? 'Tài liệu PDF'
                        : item.category === 'word'
                        ? 'Văn bản Word'
                        : item.category === 'excel'
                        ? 'Bảng tính Excel / CSV'
                        : item.category === 'md'
                        ? 'Tài liệu Markdown'
                        : 'Tài liệu hồ sơ'}
                    </div>
                  </td>

                  {/* Folder Path */}
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate font-mono text-[11px]">
                    {item.folderPath ? (
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <FolderArchive size={12} className="text-amber-500 shrink-0" />
                        <span className="truncate">{item.folderPath}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Thư mục gốc</span>
                    )}
                  </td>

                  {/* Format / Type */}
                  <td className="px-3 py-2">
                    <span className="inline-block px-1.5 py-0.5 rounded-none font-mono text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.type}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                    {item.sizeFormatted}
                  </td>

                  {/* Uploaded Time */}
                  <td className="px-3 py-2 font-mono text-slate-400 text-[11px]">
                    {item.uploadedAt}
                  </td>

                  {/* Actions */}
                  <td className="w-16 px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Gỡ tệp này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Bottom Status Footer (Flat Edge-to-Edge) */}
      <div className="h-8 min-h-[32px] px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Hồ sơ tài liệu
          </span>
          <span>·</span>
          <span>{attachments.length} tệp tin</span>
          <span>·</span>
          <span>Tổng dung lượng: {totalSize}</span>
        </div>

        <div className="flex items-center gap-3">
          {attachments.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClearAll}
              className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 transition cursor-pointer"
            >
              Xóa tất cả
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal if needed */}
      <TaskImagePreviewModal
        isOpen={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        media={previewMedia}
      />
    </div>
  );
});

export default TaskAttachmentsTab;
