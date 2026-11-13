import React from 'react';
import { Download, Upload, Columns3 } from 'lucide-react';

/**
 * Standard Status & Pagination Footer for Management Tables.
 * Adheres strictly to UI_DESIGN_STANDARD.md:
 * - Reduced height (h-8 / min-h-[32px])
 * - Displays Page Title, Total Records, Selected Count
 * - Hosts default 3 actions: Export, Import, Column Settings
 * - Text-only hover effects (no background color change)
 * - Page size select, Previous / Next navigation, Page indicator (Trang X/Y)
 */
export default function TableStatusFooter({
  title,
  totalCount,
  unit = 'bản ghi',
  selectedCount = 0,
  page = 1,
  totalPages = 1,
  pageSize = 20,
  pageSizeOptions = [20, 50, 100],
  onPageChange,
  onPageSizeChange,
  onExport,
  exportLabel = 'Xuất dữ liệu',
  onImport,
  importLabel = 'Nhập dữ liệu',
  columnMenuTargetId,
  onColumnSettings,
  columnSettingsLabel = 'Cài đặt cột',
  loading = false,
  leftExtra,
  actionsExtra,
  className = '',
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.max(1, Math.min(page || 1, safeTotalPages));

  return (
    <div className={`flex items-center justify-between gap-3 w-full h-full text-xs select-none ${className}`}>
      {/* Left: Title + Counts + Selection */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {title && (
          <strong className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
            {title}
          </strong>
        )}
        {leftExtra}
        {totalCount !== undefined && totalCount !== null && (
          <span className="text-slate-500 dark:text-slate-400 shrink-0">
            {title ? '· ' : ''}{Number(totalCount).toLocaleString('vi-VN')} {unit}
          </span>
        )}
        {selectedCount > 0 && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
            · Đã chọn {selectedCount}
          </span>
        )}
        {loading && (
          <span className="text-slate-400 dark:text-slate-500 text-[11px] shrink-0">
            Đang tải…
          </span>
        )}
      </div>

      {/* Right: Actions + Pagination */}
      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {/* Table actions: Export, Import, Column Settings */}
        {(onExport || onImport || columnMenuTargetId || onColumnSettings || actionsExtra) && (
          <div className="flex items-center gap-3">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-transparent hover:bg-transparent border-0 cursor-pointer transition-colors p-0 text-xs font-normal"
                title={`${exportLabel} ra file`}
              >
                <Download size={13} />
                <span>{exportLabel}</span>
              </button>
            )}

            {onImport && (
              <button
                type="button"
                onClick={onImport}
                className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-transparent hover:bg-transparent border-0 cursor-pointer transition-colors p-0 text-xs font-normal"
                title={`${importLabel} từ file`}
              >
                <Upload size={13} />
                <span>{importLabel}</span>
              </button>
            )}

            {columnMenuTargetId && (
              <div id={columnMenuTargetId} className="relative inline-flex items-center" />
            )}

            {!columnMenuTargetId && onColumnSettings && (
              <button
                type="button"
                onClick={onColumnSettings}
                className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-transparent hover:bg-transparent border-0 cursor-pointer transition-colors p-0 text-xs font-normal"
                title={columnSettingsLabel}
              >
                <Columns3 size={13} />
                <span>{columnSettingsLabel}</span>
              </button>
            )}

            {actionsExtra}
          </div>
        )}

        {/* Divider between Actions and Pagination */}
        {(onExport || onImport || columnMenuTargetId || onColumnSettings || actionsExtra) && (
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
        )}

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          {onPageSizeChange && (
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              aria-label="Số dòng mỗi trang"
              className="h-6 text-xs bg-transparent border-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer focus:outline-none p-0 pr-1 transition-colors"
            >
              {pageSizeOptions.map(val => (
                <option key={val} value={val} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  {val} dòng
                </option>
              ))}
            </select>
          )}

          {onPageChange && (
            <>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => onPageChange(safePage - 1)}
                className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-transparent hover:bg-transparent border-0 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors px-1 py-0"
              >
                Trước
              </button>

              <span className="text-slate-600 dark:text-slate-400 text-xs font-normal">
                Trang {safePage}/{safeTotalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= safeTotalPages}
                onClick={() => onPageChange(safePage + 1)}
                className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-transparent hover:bg-transparent border-0 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors px-1 py-0"
              >
                Sau
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
