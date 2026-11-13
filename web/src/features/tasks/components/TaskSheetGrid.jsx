import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DataEditor, { GridCellKind } from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import {
  Save,
  Plus,
  RotateCcw,
  Download,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import { notify } from '../../../shared/lib/notify';
import { taskService } from '../services/taskService';
import { PACKAGING_MEDIA_SAMPLES, getTaskMedia } from '../utils/taskMedia';

const COLUMNS = [
  { id: 'image', title: 'Tài liệu đính kèm', width: 110 },
  { id: 'code', title: 'Mã CV *', width: 115 },
  { id: 'title', title: 'Tên công việc / Hạng mục dự án *', width: 340 },
  { id: 'department', title: 'Phòng ban / Khối *', width: 180 },
  { id: 'assigneeName', title: 'Người thực hiện', width: 160 },
  { id: 'priority', title: 'Mức ưu tiên (urgent/high/medium/low)', width: 140 },
  { id: 'status', title: 'Trạng thái (backlog/todo/in_progress/in_review/done)', width: 160 },
  { id: 'progress', title: 'Tiến độ (%)', width: 100 },
  { id: 'dueDate', title: 'Hạn chót (YYYY-MM-DD)', width: 130 },
  { id: 'projectName', title: 'Dự án liên kết', width: 220 },
];

export default function TaskSheetGrid({
  tasks: initialTasks = [],
  onTasksUpdated,
  projectId = '',
}) {
  const [rows, setRows] = useState([]);
  const [modifiedIds, setModifiedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const gridContainerRef = useRef(null);

  // Initialize and synchronize rows from task props
  useEffect(() => {
    if (initialTasks && initialTasks.length > 0) {
      setRows(
        initialTasks.map((t, idx) => ({
          ...t,
          imageUrl: t.imageUrl || t.attachmentUrl || getTaskMedia(t, idx).thumbUrl,
          progress: t.progress ?? 0,
          priority: t.priority || 'medium',
          status: t.status || 'todo',
          dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : '',
        }))
      );
    }
  }, [initialTasks]);

  // Filter rows by search term
  const displayRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.code || '').toLowerCase().includes(q) ||
      (r.title || '').toLowerCase().includes(q) ||
      (r.assigneeName || '').toLowerCase().includes(q) ||
      (r.department || '').toLowerCase().includes(q) ||
      (r.projectName || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Handle cell edit
  const onCellEdited = useCallback(
    ([colIndex, rowIndex], newValue) => {
      const colId = COLUMNS[colIndex]?.id;
      if (!colId || colId === 'image') return; // Image is read-only in inline cell

      setRows((prevRows) => {
        const next = [...prevRows];
        const targetRow = displayRows[rowIndex];
        const actualIndex = next.findIndex((r) => r.id === targetRow.id || r.code === targetRow.code);
        if (actualIndex === -1) return prevRows;

        let val = newValue.data;
        if (colId === 'progress') {
          val = Math.max(0, Math.min(100, Number(val) || 0));
        }

        const updatedRow = {
          ...next[actualIndex],
          [colId]: val,
          _isDirty: true,
        };
        next[actualIndex] = updatedRow;
        return next;
      });

      const rowId = displayRows[rowIndex]?.id;
      if (rowId) {
        setModifiedIds((prev) => new Set(prev).add(rowId));
      }
    },
    [displayRows]
  );

  // Provide cell content to Glide Data Grid
  const getCellContent = useCallback(
    ([colIndex, rowIndex]) => {
      const row = displayRows[rowIndex];
      if (!row) {
        return {
          kind: GridCellKind.Loading,
          allowOverlay: false,
        };
      }

      const col = COLUMNS[colIndex];
      const colId = col?.id;

      if (colId === 'image') {
        const url = row.imageUrl || getTaskMedia(row, rowIndex).thumbUrl;
        return {
          kind: GridCellKind.Image,
          data: [url],
          displayData: [url],
          allowOverlay: true,
          readonly: true,
        };
      }

      if (colId === 'progress') {
        const p = Number(row.progress) || 0;
        return {
          kind: GridCellKind.Number,
          data: p,
          displayData: `${p}%`,
          allowOverlay: true,
        };
      }

      const textValue = String(row[colId] ?? '');
      return {
        kind: GridCellKind.Text,
        data: textValue,
        displayData: textValue,
        allowOverlay: true,
      };
    },
    [displayRows]
  );

  // Quick Add Row
  const handleAddRow = () => {
    const nextNum = rows.length + 1;
    const newCode = `TSK-2604-${String(nextNum).padStart(3, '0')}`;
    const newRow = {
      id: `temp-${Date.now()}`,
      code: newCode,
      title: 'Hạng mục gia công / Sản xuất mới',
      department: 'Khối Sản xuất In Offset & Flexo',
      assigneeName: 'Trần Quốc Hưng',
      priority: 'high',
      status: 'todo',
      progress: 0,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      projectName: projectId ? 'Dự án chỉ định' : 'Chưa phân bổ',
      imageUrl: PACKAGING_MEDIA_SAMPLES[rows.length % PACKAGING_MEDIA_SAMPLES.length].thumbUrl,
      _isNew: true,
    };
    setRows((prev) => [newRow, ...prev]);
    setModifiedIds((prev) => new Set(prev).add(newRow.id));
    notify.info(`Đã thêm dòng mới (${newCode}). Hãy gõ chỉnh sửa nội dung và bấm Lưu.`);
  };

  // Bulk Save all modified rows to backend
  const handleBulkSave = async () => {
    const dirtyRows = rows.filter((r) => modifiedIds.has(r.id) || r._isNew || r._isDirty);
    if (dirtyRows.length === 0) {
      notify.info('Không có thay đổi nào cần lưu.');
      return;
    }

    setSaving(true);
    let successCount = 0;
    try {
      for (const r of dirtyRows) {
        if (r._isNew || String(r.id).startsWith('temp-')) {
          await taskService.createTask({
            code: r.code,
            title: r.title,
            department: r.department,
            priority: r.priority,
            status: r.status,
            progress: Number(r.progress) || 0,
            dueDate: r.dueDate,
            projectId: projectId || undefined,
          });
        } else {
          await taskService.updateTask({
            id: r.id,
            title: r.title,
            department: r.department,
            priority: r.priority,
            status: r.status,
            progress: Number(r.progress) || 0,
            dueDate: r.dueDate,
          });
        }
        successCount++;
      }
      setModifiedIds(new Set());
      notify.success(`Đã lưu thành công ${successCount} hạng mục công việc vào cơ sở dữ liệu!`);
      onTasksUpdated?.();
    } catch (err) {
      notify.error(err?.message || 'Có lỗi khi lưu bảng tính');
    } finally {
      setSaving(false);
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const exportData = rows.map((r, i) => ({
        STT: i + 1,
        'Mã CV': r.code,
        'Tên công việc / Hạng mục': r.title,
        'Phòng ban': r.department,
        'Người thực hiện': r.assigneeName || '—',
        'Mức ưu tiên': r.priority,
        'Trạng thái': r.status,
        'Tiến độ (%)': `${r.progress || 0}%`,
        'Hạn hoàn thành': r.dueDate || '—',
        'Dự án': r.projectName || '—',
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CongViec_Goldsun');
      XLSX.writeFile(wb, `Bang_Cong_Viec_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      notify.error('Lỗi khi xuất file Excel');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* TOOLBAR */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>Bảng tính nhập liệu nhanh (Spreadsheet Grid)</span>
          </div>

          <div className="w-56 max-w-full">
            <SearchInput
              size="sm"
              value={search}
              onChange={(e) => setSearch(typeof e === 'string' ? e : e?.target?.value ?? '')}
              onClear={() => setSearch('')}
              placeholder="Tìm nhanh trong sheet…"
            />
          </div>

          {modifiedIds.size > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1 animate-pulse">
              <AlertCircle size={13} />
              Đã chỉnh sửa {modifiedIds.size} dòng (Chưa lưu)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={Plus}
            onClick={handleAddRow}
            title="Thêm một dòng công việc mới để gõ luôn"
          >
            Thêm dòng mới
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={handleExportExcel}
            title="Xuất dữ liệu bảng tính ra Excel (.xlsx)"
          >
            Xuất Excel
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={Save}
            disabled={saving || modifiedIds.size === 0}
            onClick={handleBulkSave}
            title="Lưu tất cả các dòng đã chỉnh sửa vào PostgreSQL"
          >
            {saving ? 'Đang lưu...' : `Lưu tất cả (${modifiedIds.size})`}
          </Button>
        </div>
      </div>

      {/* SPREADSHEET CANVAS GRID */}
      <div ref={gridContainerRef} className="flex-1 min-h-0 relative w-full h-full">
        <DataEditor
          width="100%"
          height="100%"
          columns={COLUMNS}
          rows={displayRows.length}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          smoothScrollX
          smoothScrollY
          rowMarkers="both"
          rowHeight={36}
          headerHeight={38}
          getCellsForSelection
          theme={{
            accentColor: '#059669',
            accentLight: '#ecfdf5',
            baseFontStyle: '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            headerFontStyle: '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            editorFontSize: '12px',
            bgCell: '#ffffff',
            bgHeader: '#f8fafc',
            borderColor: '#e2e8f0',
            textDark: '#0f172a',
            textMedium: '#334155',
            textLight: '#64748b',
          }}
        />
      </div>

      {/* SHEET FOOTER HELPER */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>Tổng số: <strong>{displayRows.length}</strong> hạng mục</span>
          <span>·</span>
          <span>Nhấp đúp hoặc gõ phím để sửa ô</span>
          <span>·</span>
          <span>Dùng phím mũi tên / Tab / Enter để di chuyển ô</span>
          <span>·</span>
          <span>Hỗ trợ Ctrl+C / Ctrl+V từ Excel sang</span>
        </div>
        <div>Goldsun Packaging · Glide Data Grid Engine</div>
      </div>
    </div>
  );
}
