import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Columns3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Database,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Pin,
  PinOff,
  EyeOff,
  Search,
  MoreVertical,
  Plus,
  Download,
  CheckSquare,
  Square,
  X,
  Filter,
  GripVertical,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { loadMenuPreferences, saveMenuPreferences, useTablePreferences } from '../lib/tablePreferences';
import { notify } from '../lib/notify';

/**
 * Standardized High-Performance VirtualDataTable
 * - 100% Pure IndexedDB Persistence (No localStorage dependency)
 * - Native Header Drag-and-Drop Column Reordering with live drop indicators
 * - Instant 1-click UI state updates (zero lag, no double-click bugs)
 * - Strict pixel-aligned CSS Grid tracks (zero column misalignment between header and rows)
 * - First column (#) permanently pinned on the left by default (sticky left-0) with custom action menu
 * - Column Header Menu with Sort, Filter/Search, Pinning to left, and Visibility Toggles
 * - Resizable columns with live 60fps RAF feedback and persistent preferences in IndexedDB
 * - Pinned columns support with cumulative sticky left offsets and dynamic shadow on scroll
 * - Hardware-accelerated virtual scrolling with CSS contain: strict for huge dataset performance
 */
export default function VirtualDataTable({
  columns: rawColumns = [],
  rows: rowsProp,
  data,
  selectedIds = [],
  onSelectedIdsChange,
  onOpen: onOpenProp,
  onRowClick,
  onRowContextMenu,
  onSort,
  sort,
  onScroll,
  onAddRow,
  onExport,
  renderCell,
  keyField = 'id',
  rowHeight: overrideRowHeight,
  preferenceKey: preferenceKeyProp,
  tableId,
  columnMenuTargetId,
  loading = false,
  disabled = false,
  emptyMessage = 'Không có dữ liệu phù hợp.',
  emptyText,
  formatCell: customFormatCell,
  showRowIndex = true,
  page,
  pageSize,
  startIndex: startIndexProp,
}) {
  const defaultFormatCell = useCallback((column, row) => {
    const val = row[column.id];
    if (val === null || val === undefined || val === '') return '—';
    if (column.id === 'createdAt' || column.id === 'updatedAt') {
      if (typeof val === 'string' && (val.includes('T') || val.includes('-') || val.includes('/'))) {
        try {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('vi-VN');
          }
        } catch {}
      }
    }
    return String(val);
  }, []);
  const formatCell = customFormatCell || defaultFormatCell;

  // Tự động ẩn cột rowVersion / RowVersion (chỉ lưu trữ trong dữ liệu hàng để kiểm soát xung đột phiên bản)
  const columns = useMemo(
    () =>
      (rawColumns || [])
        .map(c => ({ ...c, id: c.id || c.key }))
        .filter(c => c && c.id !== 'rowVersion' && c.id !== 'RowVersion'),
    [rawColumns]
  );
  const rows = rowsProp || data || [];
  const onOpen = onOpenProp || onRowClick;
  const preferenceKey = preferenceKeyProp || tableId;
  const { rowHeight: defaultRowHeight } = useTablePreferences();
  const rowHeight = overrideRowHeight ?? defaultRowHeight ?? 42;
  const initialColumnIds = useMemo(() => columns.map(c => c.id), [columns]);

  // Automatic Row Number (STT) calculation based on pagination
  const getRowNumber = useCallback(
    idx => {
      if (typeof startIndexProp === 'number') {
        return startIndexProp + idx;
      }
      if (typeof page === 'number' && typeof pageSize === 'number') {
        return (page - 1) * pageSize + idx + 1;
      }
      return idx + 1;
    },
    [startIndexProp, page, pageSize]
  );

  // Distinct table preference key for IndexedDB
  const prefKey = preferenceKey
    ? (preferenceKey.includes(':table') ? preferenceKey : `${preferenceKey}:table`)
    : (typeof window === 'undefined' ? 'table:default' : `table:${window.location.pathname}`);

  // =========================================================================
  // REACT LOCAL STATES (100% INSTANT UI FEEDBACK - ZERO DELAY)
  // =========================================================================
  // Column Order State
  const [columnOrder, setColumnOrder] = useState(initialColumnIds);

  // Column Widths State
  const [activeWidths, setActiveWidths] = useState({});

  // Pinned Columns State
  const [pinnedList, setPinnedList] = useState([]);
  const pinnedSet = useMemo(() => new Set(pinnedList), [pinnedList]);

  // Hidden Columns State
  const [hiddenList, setHiddenList] = useState(() => {
    return columns.filter(c => c.defaultHidden).map(c => c.id);
  });
  const hiddenColumns = useMemo(() => new Set(hiddenList), [hiddenList]);

  // Sync columns schema if columns prop changed
  useEffect(() => {
    setColumnOrder(prev => {
      const currentIds = columns.map(c => c.id);
      const existing = prev.filter(id => currentIds.includes(id));
      const newlyAdded = currentIds.filter(id => !prev.includes(id));
      return [...existing, ...newlyAdded];
    });
  }, [columns]);

  // =========================================================================
  // 100% PURE INDEXEDDB PERSISTENCE (SAVE & LOAD)
  // =========================================================================
  const isLoadedFromIndexedDB = useRef(false);

  // Load configuration from IndexedDB on mount
  useEffect(() => {
    let active = true;
    loadMenuPreferences(prefKey)
      .then(stored => {
        if (!active || !stored) return;
        isLoadedFromIndexedDB.current = true;

        if (Array.isArray(stored.columnOrder) && stored.columnOrder.length > 0) {
          const currentIds = columns.map(c => c.id);
          const validOrder = stored.columnOrder.filter(id => currentIds.includes(id));
          const missing = currentIds.filter(id => !stored.columnOrder.includes(id));
          setColumnOrder([...validOrder, ...missing]);
        }
        if (stored.columnWidths && typeof stored.columnWidths === 'object') {
          setActiveWidths(prev => ({ ...stored.columnWidths, ...prev }));
        }
        if (Array.isArray(stored.pinnedColumns)) {
          setPinnedList(stored.pinnedColumns);
        }
        if (Array.isArray(stored.hiddenColumns)) {
          setHiddenList(stored.hiddenColumns);
        }
      })
      .catch(err => {
        console.warn('Lưu ý: Chưa đọc được cấu hình từ IndexedDB:', err);
      });

    return () => {
      active = false;
    };
  }, [prefKey, columns]);

  // Helper để lưu tức thì vào IndexedDB
  const saveToIndexedDB = useCallback(
    patch => {
      saveMenuPreferences(prefKey, patch).catch(err => {
        console.error('Lỗi khi lưu cấu hình bảng vào IndexedDB:', err);
      });
    },
    [prefKey]
  );

  const viewportRef = useRef(null);
  const headerRef = useRef(null);
  const selectable = typeof onSelectedIdsChange === 'function';
  const rowKey = useCallback(row => row[keyField], [keyField]);

  // Virtualization & Smooth Scroll States
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [scrollbarGutter, setScrollbarGutter] = useState(0);
  const [isScrolledLeft, setIsScrolledLeft] = useState(false);

  // Column Filters state
  const [columnFilters, setColumnFilters] = useState({});

  // Column Sorting state (internal fallback if onSort not provided)
  const [internalSort, setInternalSort] = useState(null); // { key: string, direction: 1 | -1 }
  const currentSort = sort !== undefined ? sort : internalSort;

  const optionalColumns = useMemo(() => columns.filter(c => c.optional), [columns]);

  // =========================================================================
  // STABLE COLUMN ORDERING (PINNED COLUMNS FIRST + ORDER PRESERVED)
  // =========================================================================
  const orderedColumns = useMemo(() => {
    const byId = new Map(columns.map(c => [c.id, c]));

    // Sắp xếp các cột theo thứ tự trong columnOrder
    const sortedCols = columnOrder.filter(id => byId.has(id)).map(id => byId.get(id));

    // Phân chia: Cột ghim lên đầu, tiếp theo là cột chưa ghim, cuối cùng là actions
    const pinnedCols = [];
    const unpinnedCols = [];
    let actionsCol = null;

    for (const c of sortedCols) {
      if (c.id === 'actions') {
        actionsCol = c;
      } else if (pinnedSet.has(c.id)) {
        pinnedCols.push(c);
      } else {
        unpinnedCols.push(c);
      }
    }

    const result = [...pinnedCols, ...unpinnedCols];
    if (actionsCol) result.push(actionsCol);
    return result;
  }, [columns, columnOrder, pinnedSet]);

  const visibleColumns = useMemo(() => {
    return orderedColumns.filter(c => !hiddenColumns.has(c.id));
  }, [orderedColumns, hiddenColumns]);

  // =========================================================================
  // INSTANT 1-CLICK ACTIONS (FIX LỖI BẤM 2 LẦN)
  // =========================================================================
  // 1-Click Di chuyển cột (Move Column Up / Down)
  const moveColumn = (colId, direction) => {
    setColumnOrder(prevOrder => {
      const ids = [...prevOrder];
      const index = ids.indexOf(colId);
      if (index < 0) return prevOrder;

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= ids.length) return prevOrder;

      // Swap tức thì
      const [moved] = ids.splice(index, 1);
      ids.splice(targetIndex, 0, moved);

      // Lưu ngay vào IndexedDB
      saveToIndexedDB({ columnOrder: ids });
      return ids;
    });
  };

  // 1-Click Ghim / Bỏ ghim cột
  const togglePinColumn = useCallback(
    colId => {
      setPinnedList(prev => {
        const nextPinned = prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId];
        saveToIndexedDB({ pinnedColumns: nextPinned });
        return nextPinned;
      });
    },
    [saveToIndexedDB]
  );

  // 1-Click Ẩn / Hiện cột
  const toggleColumnVisibility = useCallback(
    colId => {
      setHiddenList(prev => {
        const nextHidden = prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId];
        saveToIndexedDB({ hiddenColumns: nextHidden });
        return nextHidden;
      });
    },
    [saveToIndexedDB]
  );

  // Khôi phục mặc định (Reset all preferences to IndexedDB)
  const handleResetPreferences = () => {
    const defaultOrder = columns.map(c => c.id);
    const defaultHidden = columns.filter(c => c.defaultHidden).map(c => c.id);
    setColumnOrder(defaultOrder);
    setActiveWidths({});
    setPinnedList([]);
    setHiddenList(defaultHidden);
    setColumnFilters({});
    setInternalSort(null);

    saveToIndexedDB({
      columnWidths: {},
      columnOrder: defaultOrder,
      hiddenColumns: defaultHidden,
      pinnedColumns: [],
    });
    notify.success('Đã khôi phục thiết lập bảng mặc định vào IndexedDB.');
  };

  // Sorting handler
  const handleColumnSort = useCallback(
    (colId, explicitDirection) => {
      if (colId === 'actions') return;
      if (typeof onSort === 'function') {
        onSort(colId, explicitDirection);
        return;
      }
      setInternalSort(prev => {
        if (explicitDirection !== undefined) {
          return { key: colId, direction: explicitDirection };
        }
        if (prev?.key === colId) {
          if (prev.direction === 1) return { key: colId, direction: -1 };
          return null; // clear sort
        }
        return { key: colId, direction: 1 };
      });
    },
    [onSort]
  );

  // Client-side sorting when no onSort is provided (memoized)
  const sortedRows = useMemo(() => {
    if (typeof onSort === 'function' || !currentSort?.key) return rows;
    const { key, direction } = currentSort;
    const dir = direction === -1 || currentSort.ascending === false || currentSort.asc === false ? -1 : 1;
    return [...rows].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir;
      }
      return String(valA).localeCompare(String(valB), 'vi', { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [rows, currentSort, onSort]);

  // Client-side column filtering
  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(
      ([_, val]) => typeof val === 'string' && val.trim().length > 0
    );
    if (activeFilters.length === 0) return sortedRows;

    return sortedRows.filter(row => {
      return activeFilters.every(([colId, filterText]) => {
        const col = columns.find(c => c.id === colId);
        let cellText = '';
        if (col && typeof formatCell === 'function') {
          try {
            cellText = formatCell(col, row);
          } catch {}
        }
        if (!cellText) {
          const val = row[colId];
          cellText = val === null || val === undefined ? '' : String(val);
        }
        return String(cellText).toLowerCase().includes(filterText.toLowerCase().trim());
      });
    });
  }, [sortedRows, columnFilters, columns, formatCell]);

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => typeof v === 'string' && v.trim().length > 0).length;
  }, [columnFilters]);

  // =========================================================================
  // NATIVE DRAG & DROP COLUMN REORDERING (KÉO CỘT DI DỜI VÀ LƯU INDEXEDDB)
  // =========================================================================
  const [draggedColId, setDraggedColId] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null); // { colId: string, position: 'before' | 'after' }
  const isDraggingRef = useRef(false);

  const handleDragStart = (e, colId) => {
    if (colId === 'actions') return;
    isDraggingRef.current = true;
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);

    // Semi-transparent drag preview
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  const handleDragOver = (e, targetColId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedColId || draggedColId === targetColId || targetColId === 'actions') return;

    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'before' : 'after';

    setDropIndicator({ colId: targetColId, position: pos });
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, targetColId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColId || draggedColId === targetColId || targetColId === 'actions') {
      setDraggedColId(null);
      setDropIndicator(null);
      return;
    }

    setColumnOrder(prevOrder => {
      const order = [...prevOrder];
      const fromIdx = order.indexOf(draggedColId);
      if (fromIdx < 0) return prevOrder;

      // Xóa phần tử cũ
      order.splice(fromIdx, 1);

      // Tìm vị trí mới
      let toIdx = order.indexOf(targetColId);
      if (toIdx < 0) toIdx = order.length;
      if (dropIndicator?.position === 'after') {
        toIdx += 1;
      }

      order.splice(toIdx, 0, draggedColId);

      // Lưu vĩnh viễn vào IndexedDB
      saveToIndexedDB({ columnOrder: order });
      return order;
    });

    setDraggedColId(null);
    setDropIndicator(null);
    notify.success('Đã di dời vị trí cột và ghi nhớ vào IndexedDB.');
  };

  const handleDragEnd = e => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '';
    }
    isDraggingRef.current = false;
    setDraggedColId(null);
    setDropIndicator(null);
  };

  // ResizeObserver for viewport dimensions and scrollbar gutter
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const checkDimensions = () => {
      if (el.clientHeight > 0) {
        setViewportHeight(el.clientHeight);
      }
      if (el.clientWidth > 0) {
        setViewportWidth(el.clientWidth);
      }
      const gutter = el.offsetWidth - el.clientWidth;
      setScrollbarGutter(gutter > 0 ? gutter : 0);
    };

    checkDimensions();
    const observer = new ResizeObserver(checkDimensions);
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredRows.length]);

  // Reset scroll top when rows identity changes completely
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
      setScrollTop(0);
      setIsScrolledLeft(false);
    }
  }, [filteredRows.length === 0]);

  // 2-Way Synchronized Scroll (RAF Throttled for 60-120 FPS)
  const isSyncingScrollRef = useRef(false);
  const scrollRafRef = useRef(null);

  const handleBodyScroll = useCallback(
    event => {
      const { scrollTop: st, scrollLeft: sl } = event.currentTarget;

      if (!isSyncingScrollRef.current && headerRef.current) {
        isSyncingScrollRef.current = true;
        headerRef.current.scrollLeft = sl;
        requestAnimationFrame(() => {
          isSyncingScrollRef.current = false;
        });
      }

      if (!scrollRafRef.current) {
        scrollRafRef.current = requestAnimationFrame(() => {
          setScrollTop(st);
          setIsScrolledLeft(sl > 2);
          scrollRafRef.current = null;
        });
      }

      onScroll?.(event);
    },
    [onScroll]
  );

  const handleHeaderScroll = useCallback(event => {
    const sl = event.currentTarget.scrollLeft;
    if (!isSyncingScrollRef.current && viewportRef.current) {
      isSyncingScrollRef.current = true;
      viewportRef.current.scrollLeft = sl;
      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    }
    setIsScrolledLeft(sl > 2);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  // Column Resizing (RAF Driven + IndexedDB Persistence)
  const [resizingColId, setResizingColId] = useState(null);
  const resizeCleanupRef = useRef(null);
  const rafResizeRef = useRef(null);

  const startResize = (event, column, initialColWidth) => {
    event.preventDefault();
    event.stopPropagation();
    resizeCleanupRef.current?.();

    const startX = event.clientX;
    const startW = initialColWidth;
    let finalW = startW;
    setResizingColId(column.id);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = e => {
      const delta = e.clientX - startX;
      finalW = Math.max(column.minWidth || 70, startW + delta);
      if (!rafResizeRef.current) {
        rafResizeRef.current = requestAnimationFrame(() => {
          setActiveWidths(prev => ({ ...prev, [column.id]: finalW }));
          rafResizeRef.current = null;
        });
      }
    };

    const onPointerUp = () => {
      if (rafResizeRef.current) {
        cancelAnimationFrame(rafResizeRef.current);
        rafResizeRef.current = null;
      }
      setResizingColId(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      // Lưu độ rộng cột trực tiếp vào IndexedDB
      saveToIndexedDB({
        columnWidths: {
          ...activeWidths,
          [column.id]: finalW,
        },
      });
    };

    resizeCleanupRef.current = onPointerUp;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  // Virtualization Window: 6 rows above, 12 rows below
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const endIndex = Math.min(filteredRows.length, startIndex + Math.ceil(viewportHeight / rowHeight) + 12);
  const visibleRows = filteredRows.slice(startIndex, endIndex);

  // Strict Pixel-Aligned Grid Calculation
  const hasIndexCol = selectable || showRowIndex;
  const selectColWidth = hasIndexCol ? 48 : 0;
  const flexColIndex = visibleColumns.findIndex(c => c.flex || c.id === 'name');

  const computedSizes = useMemo(() => {
    const baseWidths = visibleColumns.map(col => {
      return activeWidths[col.id] || parseInt(col.width, 10) || col.minWidth || 140;
    });

    if (flexColIndex >= 0 && viewportWidth > 0) {
      const fixedSum = baseWidths.reduce(
        (sum, w, idx) => (idx === flexColIndex ? sum : sum + w),
        selectColWidth
      );
      const availableForFlex = viewportWidth - fixedSum - 18;
      const minFlexW = visibleColumns[flexColIndex].minWidth || visibleColumns[flexColIndex].width || 180;
      baseWidths[flexColIndex] = Math.max(minFlexW, availableForFlex);
    }

    return baseWidths;
  }, [visibleColumns, activeWidths, flexColIndex, viewportWidth, selectColWidth]);

  const totalGridMinWidth = computedSizes.reduce((sum, w) => sum + w, selectColWidth);

  // Cumulative sticky left offsets for pinned columns
  const pinnedOffsets = useMemo(() => {
    const offsets = {};
    let current = selectColWidth;
    for (let i = 0; i < visibleColumns.length; i++) {
      const col = visibleColumns[i];
      if (pinnedSet.has(col.id)) {
        offsets[col.id] = current;
        current += computedSizes[i] || 140;
      }
    }
    return offsets;
  }, [visibleColumns, pinnedSet, selectColWidth, computedSizes]);

  const gridTemplate = `${hasIndexCol ? '48px ' : ''}${computedSizes.map(w => `${w}px`).join(' ')}`;

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: gridTemplate,
    minWidth: `${totalGridMinWidth}px`,
    width: '100%',
  };

  const handleSelectAll = e => {
    if (!onSelectedIdsChange || disabled) return;
    if (e.target.checked) {
      const allIds = Array.from(new Set([...selectedIds, ...filteredRows.map(rowKey)]));
      onSelectedIdsChange(allIds);
    } else {
      const rowIdSet = new Set(filteredRows.map(rowKey));
      onSelectedIdsChange(selectedIds.filter(id => !rowIdSet.has(id)));
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    if (!onSelectedIdsChange || disabled) return;
    if (selectedSet.has(id)) {
      onSelectedIdsChange(selectedIds.filter(v => v !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  };

  const handleRowClick = (e, row) => {
    if (!onOpen || e.defaultPrevented || window.getSelection()?.toString()) return;
    if (e.target.closest('button, a, input, select, textarea, label, [role="button"], [role="checkbox"], [data-row-control]')) {
      return;
    }
    onOpen(row);
  };

  const handleExportData = () => {
    if (typeof onExport === 'function') {
      onExport();
      return;
    }
    try {
      const exportCols = visibleColumns.filter(c => c.id !== 'actions');
      const headers = exportCols.map(c => `"${(c.label || c.id).replace(/"/g, '""')}"`).join(',');
      const csvRows = filteredRows.map(row => {
        return exportCols
          .map(c => {
            let val = '';
            if (typeof formatCell === 'function') {
              val = formatCell(c, row);
            } else {
              val = row[c.id] ?? '';
            }
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',');
      });
      const csvContent = '\uFEFF' + [headers, ...csvRows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export_${prefKey.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // # Column Actions Menu State
  const [indexMenuOpen, setIndexMenuOpen] = useState(false);
  const [indexMenuPos, setIndexMenuPos] = useState({ top: 0, left: 0 });

  const openIndexMenu = e => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setIndexMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: Math.max(8, rect.left + window.scrollX),
    });
    setIndexMenuOpen(v => !v);
  };

  // Individual Column Menu State
  const [activeColMenu, setActiveColMenu] = useState(null);
  const [colMenuPos, setColMenuPos] = useState({ top: 0, left: 0 });

  const openColMenu = (e, column) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const left = Math.min(rect.left + window.scrollX, window.innerWidth - menuWidth - 12);
    setColMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: Math.max(8, left),
    });
    setActiveColMenu(column);
  };

  // Column visibility modal / panel state
  const [columnMenuTarget, setColumnMenuTarget] = useState(null);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);

  useEffect(() => {
    if (!columnMenuTargetId) {
      setColumnMenuTarget(null);
      return;
    }
    const updateTarget = () => {
      const el = document.getElementById(columnMenuTargetId);
      if (el) setColumnMenuTarget(el);
      return el;
    };
    if (!updateTarget()) {
      const timer = setTimeout(updateTarget, 100);
      return () => clearTimeout(timer);
    }
  }, [columnMenuTargetId]);

  // Column Visibility & Settings Popover Component
  const columnMenuNode = (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        title="Cài đặt cột hiển thị, di chuyển & ghim cột"
        aria-label="Cài đặt cột hiển thị, di chuyển & ghim cột"
        className={
          columnMenuTarget
            ? `flex items-center gap-1 text-xs cursor-pointer transition-colors bg-transparent hover:bg-transparent border-0 p-0 font-normal ${
                columnsMenuOpen
                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400'
              }`
            : `w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                columnsMenuOpen
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`
        }
        aria-expanded={columnsMenuOpen}
        onClick={() => setColumnsMenuOpen(v => !v)}
      >
        <Columns3 size={columnMenuTarget ? 13 : 15} />
        {columnMenuTarget && <span>Cài đặt cột</span>}
      </button>

      {columnsMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setColumnsMenuOpen(false)} />
          <div
            className={`absolute right-0 ${columnMenuTarget ? 'bottom-full mb-1.5' : 'top-full mt-1'} z-50 max-h-92 w-76 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900`}
            role="group"
            aria-label="Tùy chỉnh cột"
          >
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Thứ tự & ghim cột (IndexedDB)
              </span>
              {pinnedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPinnedList([]);
                    saveToIndexedDB({ pinnedColumns: [] });
                  }}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Bỏ ghim tất cả
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {orderedColumns.map((column, idx) => {
                const isHidden = hiddenColumns.has(column.id);
                const isPinned = pinnedSet.has(column.id);
                return (
                  <div
                    key={column.id}
                    className="flex items-center justify-between gap-1.5 rounded px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        disabled={column.optional === false}
                        onChange={() => toggleColumnVisibility(column.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                      />
                      <span className={`truncate ${column.optional === false ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        {column.label}
                      </span>
                    </label>

                    {/* Direct 1-Click Pin / Unpin button */}
                    <button
                      type="button"
                      onClick={() => togglePinColumn(column.id)}
                      title={isPinned ? 'Bỏ ghim cột sang trái' : 'Ghim cột cố định sang trái'}
                      className={`p-1 rounded transition cursor-pointer shrink-0 ${
                        isPinned
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      {isPinned ? <Pin size={12} className="fill-emerald-600/30" /> : <Pin size={12} />}
                    </button>

                    {/* 1-Click Instant Order Up / Down buttons */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveColumn(column.id, -1)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Di chuyển lên trước (1-Click)"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === orderedColumns.length - 1}
                        onClick={() => moveColumn(column.id, 1)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Di chuyển xuống sau (1-Click)"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reset to Default Button */}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetPreferences}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors cursor-pointer"
              >
                <RotateCcw size={11} /> Khôi phục bố cục mặc định (IndexedDB)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div
      className="relative flex flex-col h-full w-full overflow-hidden bg-white dark:bg-slate-950 text-xs select-text focus:outline-none"
      role="table"
      aria-rowcount={filteredRows.length + 1}
    >
      {/* Loading bar indicator */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 z-50 h-0.5 w-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-emerald-500 animate-[pulse_1s_ease-in-out_infinite] w-full" />
        </div>
      )}

      {/* Render Column Menu Portal if target exists, else fallback */}
      {columnMenuTarget && createPortal(columnMenuNode, columnMenuTarget)}
      {!columnMenuTarget && optionalColumns.length > 0 && (
        <div className="shrink-0 flex h-8 items-center justify-end border-b border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-950">
          {columnMenuNode}
        </div>
      )}

      {/* FIXED HEADER: Synchronized horizontally with body; impervious to vertical scroll */}
      <div
        ref={headerRef}
        onScroll={handleHeaderScroll}
        style={{ paddingRight: `${scrollbarGutter}px` }}
        className="shrink-0 w-full overflow-x-scroll overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold select-none z-20"
      >
        <div
          role="row"
          style={gridStyle}
          className="h-9 items-center"
        >
          {/* FIRST COLUMN (#) - PINNED (sticky left-0) */}
          {hasIndexCol && (
            <div
              role="columnheader"
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 50,
                width: '48px',
                minWidth: '48px',
                maxWidth: '48px',
                boxSizing: 'border-box',
              }}
              className={`h-full flex items-center justify-between px-1.5 bg-slate-100 dark:bg-slate-900 select-none group/index-hdr ${
                isScrolledLeft && pinnedSet.size === 0
                  ? 'border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                  : 'border-r border-slate-200 dark:border-slate-800'
              }`}
              title={selectable ? 'Chọn tất cả dòng hoặc mở menu bảng' : 'Thao tác bảng & hiển thị'}
            >
              <div className="flex items-center justify-center min-w-0">
                {selectable ? (
                  <input
                    aria-label="Chọn tất cả dòng"
                    type="checkbox"
                    disabled={disabled || filteredRows.length === 0}
                    onClick={e => e.stopPropagation()}
                    checked={filteredRows.length > 0 && filteredRows.every(row => selectedSet.has(rowKey(row)))}
                    onChange={handleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-3.5 h-3.5"
                  />
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
                    #
                  </span>
                )}
              </div>

              {/* Menu trigger on # header */}
              <button
                type="button"
                onClick={openIndexMenu}
                title="Tùy chọn bảng và thao tác dữ liệu"
                className={`p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  indexMenuOpen ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' : ''
                }`}
              >
                <MoreVertical size={12} />
              </button>
            </div>
          )}

          {/* DATA COLUMNS HEADERS (DRAGGABLE TO REORDER) */}
          {visibleColumns.map((column, index) => {
            const colWidth = computedSizes[index];
            const isSorted = currentSort?.key === column.id;
            const sortDir = currentSort?.direction ?? (currentSort?.ascending === false || currentSort?.asc === false ? -1 : 1);
            const isActions = column.id === 'actions';
            const isPinned = pinnedSet.has(column.id);
            const isLastPinned = isPinned && (index === visibleColumns.length - 1 || !pinnedSet.has(visibleColumns[index + 1]?.id));
            const isFiltered = Boolean(columnFilters[column.id]?.trim());

            // Drag over indicators
            const isDropTarget = dropIndicator?.colId === column.id;
            const dropPos = isDropTarget ? dropIndicator.position : null;

            return (
              <div
                key={column.id}
                role="columnheader"
                draggable={!resizingColId && !isActions}
                onDragStart={e => handleDragStart(e, column.id)}
                onDragOver={e => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, column.id)}
                onDragEnd={handleDragEnd}
                style={{
                  width: `${colWidth}px`,
                  minWidth: `${colWidth}px`,
                  maxWidth: `${colWidth}px`,
                  boxSizing: 'border-box',
                  cursor: isActions ? 'default' : 'grab',
                  ...(isPinned
                    ? {
                        position: 'sticky',
                        left: `${pinnedOffsets[column.id]}px`,
                        zIndex: 45,
                      }
                    : {}),
                  ...(isActions
                    ? {
                        position: 'sticky',
                        right: 0,
                        zIndex: 48,
                      }
                    : {}),
                }}
                className={`relative h-full flex items-center justify-between px-2.5 min-w-0 max-w-full overflow-hidden transition-all group/col-hdr ${
                  isPinned
                    ? `bg-slate-100 dark:bg-slate-900 ${
                        isLastPinned && isScrolledLeft
                          ? 'border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                          : 'border-r border-slate-200 dark:border-slate-800'
                      }`
                    : isActions
                    ? 'bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800'
                    : 'border-r border-slate-200 dark:border-slate-800'
                } ${
                  dropPos === 'before'
                    ? 'border-l-3 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                    : dropPos === 'after'
                    ? 'border-r-3 border-r-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                    : ''
                }`}
              >
                {/* Drag Handle Indicator */}
                {!isActions && (
                  <span
                    className="opacity-0 group-hover/col-hdr:opacity-50 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing mr-1 shrink-0"
                    title="Kéo thả để di chuyển vị trí cột"
                  >
                    <GripVertical size={11} />
                  </span>
                )}

                {/* Sort Button */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 min-w-0 truncate text-left font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 focus:outline-none cursor-pointer flex-1"
                  onClick={() => {
                    if (isDraggingRef.current) return;
                    handleColumnSort(column.id);
                  }}
                  title={`Kéo để di chuyển hoặc nhấn để sắp xếp theo ${column.label}`}
                >
                  <span className="truncate">{column.label}</span>
                  {isSorted ? (
                    sortDir === 1 ? (
                      <ArrowUp size={12} className="text-emerald-600 shrink-0" />
                    ) : (
                      <ArrowDown size={12} className="text-emerald-600 shrink-0" />
                    )
                  ) : (
                    !isActions && <ArrowUpDown size={10} className="opacity-0 group-hover/col-hdr:opacity-30 shrink-0" />
                  )}
                  {isFiltered && (
                    <span title={`Đang lọc: "${columnFilters[column.id]}"`} className="inline-flex items-center text-emerald-600 shrink-0">
                      <Filter size={11} className="fill-emerald-600/20 text-emerald-600" />
                    </span>
                  )}
                  {isPinned && (
                    <span title="Cột được ghim sang trái" className="inline-flex items-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Pin size={10} className="fill-emerald-600/30" />
                    </span>
                  )}
                </button>

                {/* Column Menu Trigger Button */}
                {!isActions && (
                  <button
                    type="button"
                    title={`Tùy chọn cột ${column.label}`}
                    onClick={e => openColMenu(e, column)}
                    className={`p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-opacity cursor-pointer shrink-0 ${
                      activeColMenu?.id === column.id
                        ? 'opacity-100 bg-slate-200/60 dark:bg-slate-800 text-slate-700'
                        : 'opacity-0 group-hover/col-hdr:opacity-100'
                    }`}
                  >
                    <MoreVertical size={11} />
                  </button>
                )}

                {/* Resizer Handle */}
                {!isActions && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Đổi độ rộng cột ${column.label}`}
                    onPointerDown={e => startResize(e, column, colWidth)}
                    onMouseDown={e => e.stopPropagation()}
                    className={`absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none hover:bg-emerald-400/40 z-10 ${
                      resizingColId === column.id ? 'bg-emerald-500 w-1' : ''
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SCROLLABLE VIEWPORT (VIRTUALIZED ROWS WITH HARDWARE ACCELERATION) */}
      <div
        ref={viewportRef}
        className="relative flex-1 min-h-0 w-full overflow-auto bg-white dark:bg-slate-950 text-xs select-text focus:outline-none"
        onScroll={handleBodyScroll}
      >
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 dark:text-slate-500">
            <Database size={32} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">{emptyText || emptyMessage}</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setColumnFilters({})}
                className="mt-2 text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                <RotateCcw size={11} /> Xóa các bộ lọc cột đang áp dụng
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${filteredRows.length * rowHeight}px`,
              position: 'relative',
              minWidth: `${totalGridMinWidth}px`,
              width: '100%',
              contain: 'strict',
            }}
          >
            {visibleRows.map((row, offset) => {
              const rowIndex = startIndex + offset;
              const rowNum = getRowNumber(rowIndex);
              const isSelected = selectedSet.has(rowKey(row));
              const isEven = rowIndex % 2 === 0;

              return (
                <div
                  key={rowKey(row)}
                  role="row"
                  aria-rowindex={rowIndex + 2}
                  tabIndex={onOpen ? 0 : undefined}
                  onClick={e => handleRowClick(e, row)}
                  onContextMenu={e => {
                    if (onRowContextMenu) {
                      e.preventDefault();
                      onRowContextMenu(e, row);
                    }
                  }}
                  onKeyDown={e => {
                    if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onOpen(row);
                    }
                  }}
                  style={{
                    ...gridStyle,
                    position: 'absolute',
                    top: `${rowIndex * rowHeight}px`,
                    left: 0,
                    height: `${rowHeight}px`,
                    outline: 'none',
                  }}
                  className={`group items-center border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-colors outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ${
                    onOpen ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''
                  } ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 font-medium'
                      : isEven
                      ? 'bg-white dark:bg-slate-950'
                      : 'bg-slate-50 dark:bg-slate-900/60'
                  }`}
                >
                  {/* FIRST COLUMN (#) - PINNED (sticky left-0) */}
                  {hasIndexCol && (
                    <div
                      role="cell"
                      data-row-control
                      onClick={
                        selectable
                          ? e => {
                              e.stopPropagation();
                              handleSelectRow(e, rowKey(row));
                            }
                          : undefined
                      }
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 30,
                        width: '48px',
                        minWidth: '48px',
                        maxWidth: '48px',
                        boxSizing: 'border-box',
                      }}
                      className={`h-full flex items-center justify-center px-1 relative select-none ${
                        selectable ? 'cursor-pointer' : ''
                      } ${
                        isScrolledLeft && pinnedSet.size === 0
                          ? 'border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                          : 'border-r border-slate-200 dark:border-slate-800'
                      } ${
                        isSelected
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-100'
                          : isEven
                          ? 'bg-white dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                          : 'bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                      }`}
                      title={
                        selectable
                          ? isSelected
                            ? `STT: ${rowNum} (Đã chọn - Nhấn để bỏ chọn)`
                            : `STT: ${rowNum} (Nhấn để chọn)`
                          : `STT: ${rowNum}`
                      }
                    >
                      {selectable ? (
                        <>
                          <span
                            className={`text-[11.5px] font-mono text-slate-400 dark:text-slate-500 tabular-nums transition-opacity duration-100 ${
                              isSelected ? 'hidden' : 'group-hover:hidden group-focus-within:hidden'
                            }`}
                          >
                            {rowNum}
                          </span>
                          <input
                            type="checkbox"
                            disabled={disabled}
                            aria-label={`Chọn dòng ${rowNum}`}
                            checked={isSelected}
                            onClick={e => e.stopPropagation()}
                            onChange={e => handleSelectRow(e, rowKey(row))}
                            className={`rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isSelected ? 'block' : 'hidden group-hover:block group-focus-within:block'
                            }`}
                          />
                        </>
                      ) : (
                        <span className="text-[11.5px] font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                          {rowNum}
                        </span>
                      )}
                    </div>
                  )}

                  {/* DATA CELLS */}
                  {visibleColumns.map((column, colIdx) => {
                    const colWidth = computedSizes[colIdx];
                    const isActions = column.id === 'actions';
                    const isPinned = pinnedSet.has(column.id);
                    const isLastPinned = isPinned && (colIdx === visibleColumns.length - 1 || !pinnedSet.has(visibleColumns[colIdx + 1]?.id));

                    return (
                      <div
                        key={column.id}
                        role="cell"
                        style={{
                          width: `${colWidth}px`,
                          minWidth: `${colWidth}px`,
                          maxWidth: `${colWidth}px`,
                          boxSizing: 'border-box',
                          backgroundClip: 'padding-box',
                          ...(isPinned
                            ? {
                                position: 'sticky',
                                left: `${pinnedOffsets[column.id]}px`,
                                zIndex: 25,
                              }
                            : {}),
                          ...(isActions
                            ? {
                                position: 'sticky',
                                right: 0,
                                zIndex: 28,
                              }
                            : {}),
                        }}
                        className={`min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-3 h-full flex items-center ${
                          isPinned
                            ? `${
                                isLastPinned && isScrolledLeft
                                  ? 'border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                                  : 'border-r border-slate-200 dark:border-slate-800'
                              } ${
                                isSelected
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-100'
                                  : isEven
                                  ? 'bg-white dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                                  : 'bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                              }`
                            : isActions
                            ? `border-l border-slate-200 dark:border-slate-800 ${
                                isSelected
                                  ? 'bg-emerald-100 dark:bg-emerald-950'
                                  : isEven
                                  ? 'bg-white dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                                  : 'bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                              }`
                            : 'border-r border-slate-100 dark:border-slate-800/80'
                        }`}
                      >
                        {(() => {
                          try {
                            if (typeof column.renderCell === 'function') {
                              return column.renderCell(row[column.id], row, rowIndex);
                            }
                            if (typeof renderCell === 'function') {
                              return renderCell(column, row, rowIndex);
                            }
                            return (
                              <span className="truncate block" title={formatCell(column, row)}>
                                {formatCell(column, row)}
                              </span>
                            );
                          } catch (err) {
                            console.error('Cell render error:', err);
                            return <span className="text-slate-400 italic">Lỗi hiển thị</span>;
                          }
                        })()}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* # COLUMN HEADER DROPDOWN MENU (PORTAL)                    */}
      {/* ========================================================= */}
      {indexMenuOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-50 cursor-default"
              onClick={() => setIndexMenuOpen(false)}
            />
            <div
              style={{ top: `${indexMenuPos.top}px`, left: `${indexMenuPos.left}px` }}
              className="fixed z-50 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Thao tác bảng & dữ liệu
              </div>

              {typeof onAddRow === 'function' && (
                <button
                  type="button"
                  onClick={() => {
                    setIndexMenuOpen(false);
                    onAddRow();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Plus size={13} className="text-emerald-600" />
                  <span>Thêm bản ghi mới</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIndexMenuOpen(false);
                  handleExportData();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Download size={13} className="text-slate-500" />
                <span>Xuất bảng dữ liệu (CSV)</span>
              </button>

              {selectable && (
                <>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    onClick={() => {
                      setIndexMenuOpen(false);
                      const allIds = Array.from(new Set([...selectedIds, ...filteredRows.map(rowKey)]));
                      onSelectedIdsChange(allIds);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <CheckSquare size={13} className="text-slate-500" />
                    <span>Chọn tất cả ({filteredRows.length})</span>
                  </button>
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIndexMenuOpen(false);
                        const rowIdSet = new Set(filteredRows.map(rowKey));
                        onSelectedIdsChange(selectedIds.filter(id => !rowIdSet.has(id)));
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Square size={13} className="text-slate-500" />
                      <span>Bỏ chọn các dòng này</span>
                    </button>
                  )}
                </>
              )}

              {activeFilterCount > 0 && (
                <>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    onClick={() => {
                      setIndexMenuOpen(false);
                      setColumnFilters({});
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Xóa {activeFilterCount} bộ lọc cột</span>
                  </button>
                </>
              )}
            </div>
          </>,
          document.body
        )}

      {/* ========================================================= */}
      {/* INDIVIDUAL COLUMN HEADER MENU (PORTAL)                    */}
      {/* ========================================================= */}
      {activeColMenu &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-50 cursor-default"
              onClick={() => setActiveColMenu(null)}
            />
            <div
              style={{ top: `${colMenuPos.top}px`, left: `${colMenuPos.left}px` }}
              className="fixed z-50 w-56 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">
                  {activeColMenu.label}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Cột</span>
              </div>

              {/* Real-time Column Search Filter */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="relative flex items-center">
                  <Search size={12} className="absolute left-2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={columnFilters[activeColMenu.id] || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setColumnFilters(prev => ({ ...prev, [activeColMenu.id]: val }));
                    }}
                    placeholder={`Lọc ${activeColMenu.label}...`}
                    className="w-full pl-7 pr-6 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                    autoFocus
                  />
                  {columnFilters[activeColMenu.id] && (
                    <button
                      type="button"
                      onClick={() => setColumnFilters(prev => ({ ...prev, [activeColMenu.id]: '' }))}
                      className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                      title="Xóa lọc"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sắp xếp (Sorting) */}
              <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleColumnSort(activeColMenu.id, 1);
                    setActiveColMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowUp size={13} className="text-slate-500" />
                  <span>Sắp xếp tăng dần (A → Z)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleColumnSort(activeColMenu.id, -1);
                    setActiveColMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowDown size={13} className="text-slate-500" />
                  <span>Sắp xếp giảm dần (Z → A)</span>
                </button>
                {currentSort?.key === activeColMenu.id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onSort === 'function') {
                        onSort(activeColMenu.id);
                      } else {
                        setInternalSort(null);
                      }
                      setActiveColMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Hủy sắp xếp cột này</span>
                  </button>
                )}
              </div>

              {/* Ghim cột (Pin to left - 1-Click) */}
              <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    togglePinColumn(activeColMenu.id);
                    setActiveColMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {pinnedSet.has(activeColMenu.id) ? (
                    <>
                      <PinOff size={13} className="text-amber-500" />
                      <span>Bỏ ghim cột</span>
                    </>
                  ) : (
                    <>
                      <Pin size={13} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Ghim cột sang trái</span>
                    </>
                  )}
                </button>
              </div>

              {/* Ẩn cột & Cài đặt cột */}
              <div className="py-1">
                {activeColMenu.optional !== false && (
                  <button
                    type="button"
                    onClick={() => {
                      toggleColumnVisibility(activeColMenu.id);
                      setActiveColMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <EyeOff size={13} className="text-slate-500" />
                    <span>Ẩn cột này</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveColMenu(null);
                    setColumnsMenuOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Columns3 size={13} className="text-slate-500" />
                  <span>Tùy biến hiển thị cột...</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
