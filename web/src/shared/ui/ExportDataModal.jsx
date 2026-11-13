import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Modal from './Modal';
import Button from './Button';
import { Play, Download, FileSpreadsheet, Check } from 'lucide-react';

/**
 * Standardized ExportDataModal matching MES / SkillHub enterprise specifications.
 * Supports:
 * - Selected rows export
 * - Current page view export
 * - Full filtered dataset export
 * - Custom file naming
 * - Excel (.xlsx / HTML spreadsheet) and CSV (.csv with UTF-8 BOM) formats
 */
export default function ExportDataModal({
  open,
  onClose,
  title = 'Kết xuất / Báo cáo dữ liệu',
  defaultFilename = 'BaoCao_DuLieu',
  columns = [],
  selectedRows = [],
  currentPageRows = [],
  onFetchAllRows,
  totalCount = 0,
  onExportSuccess,
}) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [filename, setFilename] = useState(`${defaultFilename}_${todayStr}`);
  const [format, setFormat] = useState('excel'); // 'excel' | 'csv'
  const [exportScope, setExportScope] = useState(() => (selectedRows.length > 0 ? 'selected' : 'all'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exportableColumns = useMemo(
    () => columns.filter(col => col.id !== 'actions' && col.id !== 'selection' && !col.skipExport),
    [columns]
  );

  const selectedCount = selectedRows.length;
  const pageCount = currentPageRows.length;

  const handleExecute = async () => {
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      let rowsToExport = [];
      if (exportScope === 'selected') {
        if (!selectedCount) throw new Error('Chưa có dòng nào được chọn để kết xuất.');
        rowsToExport = selectedRows;
      } else if (exportScope === 'page') {
        rowsToExport = currentPageRows;
      } else {
        // Fetch all matching rows
        if (onFetchAllRows) {
          rowsToExport = await onFetchAllRows();
        } else {
          rowsToExport = currentPageRows;
        }
      }

      if (!rowsToExport || !rowsToExport.length) {
        throw new Error('Không có dữ liệu phù hợp để kết xuất.');
      }

      const cleanFilename = (filename.trim() || defaultFilename).replace(/[\\/:*?"<>|]/g, '_');

      if (format === 'csv') {
        exportToCsv(exportableColumns, rowsToExport, cleanFilename);
      } else {
        exportToExcel(exportableColumns, rowsToExport, cleanFilename, title);
      }

      onExportSuccess?.(rowsToExport.length, cleanFilename);
      onClose();
    } catch (e) {
      setError(e.message || 'Lỗi khi kết xuất file dữ liệu.');
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
      maxWidth="580px"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            disabled={loading}
            onClick={handleExecute}
            className="h-8.5 px-4 text-xs font-semibold rounded-md border border-sky-600 dark:border-sky-500 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {loading ? (
              <span className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play size={12} className="fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
            )}
            <span>Bắt đầu thực hiện</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="h-8.5 px-4 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Thoát ra
          </button>
        </div>
      }
    >
      <div className="space-y-4.5 select-none py-0.5">
        {error && (
          <div role="alert" className="p-2.5 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        {/* SECTION 1: ĐƯỜNG DẪN KẾT XUẤT */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            ĐƯỜNG DẪN KẾT XUẤT
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
            Trình duyệt Web » Tải về mặc định (Downloads)
          </p>
          <div className="relative flex items-center">
            <input
              type="text"
              value={filename}
              onChange={e => setFilename(e.target.value)}
              className="w-full h-10 px-3.5 text-sm font-medium rounded-lg border border-sky-500/80 dark:border-sky-500/70 focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors pr-28 shadow-xs"
              placeholder="Nhập tên file kết xuất..."
            />
            <div className="absolute right-1.5 flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                  format === 'excel'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Định dạng Microsoft Excel"
              >
                .xlsx
              </button>
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                  format === 'csv'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Định dạng CSV UTF-8"
              >
                .csv
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: TÙY CHỌN KẾT XUẤT */}
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              TÙY CHỌN KẾT XUẤT
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {exportableColumns.length} cột dữ liệu
            </span>
          </div>

          <div className="space-y-4">
            {/* Option 1: Selected rows */}
            <div
              onClick={() => selectedCount > 0 && setExportScope('selected')}
              className={`flex items-center gap-3.5 transition-colors ${
                selectedCount === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <ToggleSwitch
                checked={exportScope === 'selected'}
                disabled={selectedCount === 0}
                onChange={() => selectedCount > 0 && setExportScope('selected')}
              />
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Kết xuất các dòng đã chọn
                </div>
                {selectedCount > 0 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    ({selectedCount} dòng đã chọn)
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    (Chưa có dòng nào được chọn trên bảng)
                  </div>
                )}
              </div>
            </div>

            {/* Option 2: Current page */}
            <div
              onClick={() => setExportScope('page')}
              className="flex items-center gap-3.5 cursor-pointer"
            >
              <ToggleSwitch checked={exportScope === 'page'} onChange={() => setExportScope('page')} />
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Kết xuất dữ liệu đang xem
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  ({pageCount} dòng đang hiển thị trên bảng)
                </div>
              </div>
            </div>

            {/* Option 3: All data */}
            <div
              onClick={() => setExportScope('all')}
              className="flex items-center gap-3.5 cursor-pointer"
            >
              <ToggleSwitch checked={exportScope === 'all'} onChange={() => setExportScope('all')} />
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Kết xuất toàn bộ dữ liệu báo cáo
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  ({totalCount || pageCount} dòng theo điều kiện tìm kiếm)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ToggleSwitch({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={e => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
        disabled
          ? 'bg-slate-200 dark:bg-slate-800 opacity-60 cursor-not-allowed'
          : checked
          ? 'bg-sky-600 dark:bg-sky-500 cursor-pointer'
          : 'bg-slate-300 dark:bg-slate-700 cursor-pointer'
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

/** Formatter for cell value in export */
function formatCellForExport(column, row) {
  const val = row[column.id];
  if (val === undefined || val === null || val === '') return '';
  if (column.id === 'enabled') return val ? 'Hoạt động' : 'Đã khóa';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'boolean') return val ? 'Có' : 'Không';
  if (column.id.includes('At') && typeof val === 'string') {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toLocaleString('vi-VN');
    } catch {}
  }
  return String(val);
}

/** Pure client-side CSV generator with UTF-8 BOM */
function exportToCsv(columns, rows, filename) {
  const headers = columns.map(c => `"${String(c.label || c.id).replace(/"/g, '""')}"`).join(',');
  const lines = rows.map(row => {
    return columns
      .map(col => {
        const text = formatCellForExport(col, row);
        return `"${text.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers, ...lines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

/** Native XLSX Spreadsheet Export using SheetJS */
function exportToExcel(columns, rows, filename, title) {
  const wb = XLSX.utils.book_new();
  const headerLabels = columns.map(col => col.label || col.id);
  const dataRows = rows.map(row => columns.map(col => formatCellForExport(col, row)));

  const wsData = [
    [title],
    [`Ngày kết xuất: ${new Date().toLocaleString('vi-VN')} · Tổng số: ${rows.length} dòng`],
    [],
    headerLabels,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-fit column widths based on content
  ws['!cols'] = columns.map((col, idx) => {
    let maxLen = (col.label || col.id).length;
    for (let r = 0; r < Math.min(rows.length, 50); r++) {
      const valLen = String(dataRows[r]?.[idx] || '').length;
      if (valLen > maxLen) maxLen = valLen;
    }
    return { wch: Math.min(50, Math.max(14, maxLen + 3)) };
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Du_Lieu');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `${filename}.xlsx`);
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
