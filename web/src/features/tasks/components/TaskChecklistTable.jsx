import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  Save,
  CheckSquare,
  Square,
  CheckCheck,
  RotateCcw,
  Layers,
  Sparkles,
  Check,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  User,
  Search,
  AtSign,
  Flag,
  Circle,
  CheckCircle2,
  MoreHorizontal,
  Calendar,
  Filter,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import Button from '../../../shared/ui/Button';
import ClickUpDatePicker from '../../../shared/ui/ClickUpDatePicker';
import { notify } from '../../../shared/lib/notify';
import { useAuth } from '../../../shared/hooks/useAuth';
import { taskService } from '../services/taskService';

export const DEFAULT_ROW_COUNT = 2;

/**
 * Utility to pad or initialize items up to DEFAULT_ROW_COUNT (2 sample rows)
 */
export function padToDefaultRows(
  items = [],
  defaultAssignee = '',
  defaultExecutor = 'Người thực hiện',
  minCount = DEFAULT_ROW_COUNT
) {
  const result = [];

  // 1. Map existing items
  if (Array.isArray(items)) {
    items.forEach((item, idx) => {
      const rawTitle = item.title || '';
      const executorFromTag = rawTitle.includes('@Làm:') ? extractTag(rawTitle, '@Làm:') : '';
      const inspectorFromTag = rawTitle.includes('@Duyệt:') ? extractTag(rawTitle, '@Duyệt:') : '';
      const cleanedTitle = cleanChecklistTitle(rawTitle);

      const hasContent = Boolean(cleanedTitle || item.standard?.trim() || item.note?.trim());
      let tag = item.workingTag;
      if (!tag) {
        if (item._isNew && hasContent) {
          tag = 'A';
        } else if (hasContent) {
          tag = 'Q';
        } else {
          tag = '';
        }
      }

      result.push({
        id: item.id || `item-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        title: cleanedTitle,
        standard: item.standard || (rawTitle.includes('[') ? extractBracket(rawTitle) : ''),
        executor: item.executor || executorFromTag || defaultExecutor || '',
        inspector: item.inspector || item.assignee || inspectorFromTag || defaultAssignee || '',
        dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : '',
        priority: item.priority || 'medium',
        result: item.result || '',
        note: item.note || '',
        isCompleted: Boolean(item.isCompleted || item.completed),
        workingTag: tag || '',
        _isNew: Boolean(item._isNew),
        _origTag: item._origTag || tag || '',
      });
    });
  }

  // 2. Pad up to minCount (2 sample rows)
  const currentCount = result.length;
  const samplePlaceholders = [
    {
      title: 'Khảo sát và tiếp nhận yêu cầu / phân tích nghiệp vụ',
      standard: 'Làm rõ phạm vi và thống nhất phương án xử lý',
    },
    {
      title: 'Triển khai thực hiện và bàn giao kết quả nghiệm thu',
      standard: 'Chạy thử nghiệm đạt chuẩn và hoàn tất biên bản',
    },
  ];

  for (let i = currentCount; i < minCount; i++) {
    const sample = samplePlaceholders[i] || { title: '', standard: '' };
    result.push({
      id: `grid-row-${i + 1}-${Date.now()}`,
      title: sample.title,
      standard: sample.standard,
      executor: defaultExecutor || '',
      inspector: defaultAssignee || '',
      dueDate: '',
      priority: 'medium',
      result: '',
      note: '',
      isCompleted: false,
      workingTag: sample.title ? 'A' : '',
      _isNew: true,
      _origTag: sample.title ? 'A' : '',
    });
  }

  return result;
}

export function cleanChecklistTitle(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\s*\(@Làm:[^)]*\)/gi, '')
    .replace(/\s*\(@Duyệt:[^)]*\)/gi, '')
    .trim();
}

function extractTag(text, tagPrefix) {
  if (!text || typeof text !== 'string') return '';
  const idx = text.indexOf(tagPrefix);
  if (idx === -1) return '';
  const rest = text.slice(idx + tagPrefix.length);
  const closingIdx = rest.indexOf(')');
  return (closingIdx !== -1 ? rest.slice(0, closingIdx) : rest).trim();
}

function extractBracket(text) {
  const match = text.match(/\[(.*?)\]/);
  return match ? match[1] : '';
}

/**
 * WorkingTag Text Component (Chỉ hiển thị ký tự chữ thuần, không dùng box/khung badge)
 * A: Add (Thêm mới) -> Chữ xanh lá
 * U: Update (Cập nhật) -> Chữ vàng cam
 * D: Delete (Đánh dấu xóa) -> Chữ đỏ gạch ngang
 * Q: Query (Đã lưu) -> Chữ xám
 * -: Trống -> Dấu gạch mờ
 */
function WorkingTagBadge({ tag }) {
  if (tag === 'A') {
    return (
      <span
        className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 select-none"
        title="Tag A: Thêm mới (Chưa lưu)"
      >
        A
      </span>
    );
  }
  if (tag === 'U') {
    return (
      <span
        className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 select-none"
        title="Tag U: Cập nhật / Đã chỉnh sửa"
      >
        U
      </span>
    );
  }
  if (tag === 'D') {
    return (
      <span
        className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 line-through select-none"
        title="Tag D: Đánh dấu xóa"
      >
        D
      </span>
    );
  }
  if (tag === 'Q') {
    return (
      <span
        className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 select-none"
        title="Tag Q: Đã lưu trong hệ thống"
      >
        Q
      </span>
    );
  }
  return (
    <span
      className="font-mono text-xs text-slate-300 dark:text-slate-700 select-none"
      title="Dòng trống"
    >
      -
    </span>
  );
}

/**
 * Danh mục chuẩn đánh giá kết quả kiểm tra / nghiệm thu
 */
export const EVALUATION_CODES = [
  {
    code: 'NONE',
    value: '',
    label: 'Chưa đánh giá',
    textColor: 'text-slate-500 dark:text-slate-400',
    codeColor: 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    desc: 'Chưa tiến hành kiểm tra hoặc nghiệm thu',
    icon: Clock,
  },
  {
    code: 'PASS',
    value: 'Đạt chuẩn',
    label: 'Đạt chuẩn',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    codeColor: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800',
    desc: 'Đáp ứng đầy đủ quy chuẩn kỹ thuật & chất lượng',
    icon: Check,
  },
  {
    code: 'ADJ',
    value: 'Cần hiệu chỉnh',
    label: 'Cần hiệu chỉnh',
    textColor: 'text-amber-700 dark:text-amber-400',
    codeColor: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800',
    desc: 'Có sai lệch kỹ thuật, cần công nhân/kỹ thuật căn chỉnh',
    icon: AlertTriangle,
  },
  {
    code: 'FAIL',
    value: 'Không đạt',
    label: 'Không đạt',
    textColor: 'text-rose-700 dark:text-rose-400',
    codeColor: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800',
    desc: 'Lỗi hỏng nghiêm trọng, loại bỏ hoặc gia công lại',
    icon: XCircle,
  },
  {
    code: 'WAIT',
    value: 'Chờ nghiệm thu',
    label: 'Chờ nghiệm thu',
    textColor: 'text-slate-600 dark:text-slate-400',
    codeColor: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
    desc: 'Đã hoàn thành thi công, đang chờ kiểm tra nghiệm thu',
    icon: Clock,
  },
];

export const MASTER_INSPECTORS = [
  { id: 'usr-1', name: 'Ngô Tuyết Mai', department: 'Phòng Quản lý Chất lượng (QA/QC)', role: 'Chuyên viên KCS / QA' },
  { id: 'usr-2', name: 'Lê Thị Hương Lan', department: 'Phòng Quản lý Chất lượng (QA/QC)', role: 'Trưởng phòng QA/QC' },
  { id: 'usr-3', name: 'Đỗ Văn Hùng', department: 'Phòng R&D & Thiết kế Cấu trúc Bao bì', role: 'Kỹ sư R&D' },
  { id: 'usr-4', name: 'Hoàng Văn Tuấn', department: 'Phòng R&D & Thiết kế Cấu trúc Bao bì', role: 'Trưởng phòng Kỹ thuật' },
  { id: 'usr-5', name: 'Bùi Hải Nam', department: 'Khối Sản xuất In Offset', role: 'Tổ trưởng In Offset' },
  { id: 'usr-6', name: 'Trần Quốc Hưng', department: 'Khối Sản xuất In Offset', role: 'Trưởng phòng Sản xuất' },
  { id: 'usr-7', name: 'Nguyễn Đức Minh', department: 'Ban Giám Đốc', role: 'Giám đốc Nhà máy' },
  { id: 'usr-8', name: 'Đinh Tiến Đạt', department: 'Phòng CNTT & Chuyển đổi số', role: 'Kỹ sư MES' },
];

/**
 * Inspector Selection Component from Master Data with Clear (X) Button
 */
function InspectorSelectCell({
  value,
  disabled,
  onChange,
  employeeList = [],
  placeholder = 'Chưa chọn nhân sự',
  title = 'Nhân sự',
  icon: IconComponent = AtSign,
  iconColor = 'text-emerald-600',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 280 });
  const [search, setSearch] = useState('');
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const filteredList = useMemo(() => {
    const list = Array.isArray(employeeList) ? employeeList : [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((e) => {
      const name = e.name || e.fullName || '';
      const dept = e.department || '';
      const role = e.position || e.role || '';
      return name.toLowerCase().includes(q) || dept.toLowerCase().includes(q) || role.toLowerCase().includes(q);
    });
  }, [employeeList, search]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 260;
    const below = window.innerHeight - rect.bottom;
    const upward = below < dropdownHeight && rect.top > dropdownHeight;
    const width = 280;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));

    setDropdownPos({
      top: upward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left,
      width,
    });
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setSearch('');
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => updatePosition();
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <div className="relative group w-full h-full min-h-[28px] flex items-center p-0 m-0">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={`w-full h-7 px-2 flex items-center justify-between text-xs rounded-none border-0 outline-none hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer select-none m-0 ${
            disabled ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          title={value ? `${title}: ${value} (Bấm để đổi)` : `Bấm để ${placeholder}`}
        >
          {value ? (
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[9px] shrink-0 uppercase">
                {value.trim().slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate font-semibold text-slate-800 dark:text-slate-200 text-xs">
                {value}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
              <IconComponent size={13} className="opacity-40 group-hover:opacity-90 transition-opacity" />
              <span className="text-[11px] truncate opacity-50 group-hover:opacity-100 transition-opacity">
                {placeholder}
              </span>
            </div>
          )}

          <ChevronDown
            size={12}
            className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 ml-1"
          />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header with Search */}
            <div className="p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm nhân sự theo tên, mã..."
                  className="w-full pl-7 pr-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Clear option */}
            <div className="p-1 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 rounded transition cursor-pointer font-medium"
              >
                <X size={13} />
                <span>Bỏ chọn (Xóa trắng)</span>
              </button>
            </div>

            {/* Inspectors List from Master Data */}
            <div className="max-h-52 overflow-y-auto p-1 space-y-0.5">
              {filteredList.map((emp, idx) => {
                const name = emp.name || emp.fullName;
                const isSelected = value === name;
                return (
                  <button
                    key={emp.id || idx}
                    type="button"
                    onClick={() => {
                      onChange(name);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 flex items-start gap-2 text-left rounded transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <IconComponent size={13} className={`${iconColor} shrink-0 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {name}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400 mt-0.5">
                        {emp.department || emp.role || emp.position || 'Cán bộ kiểm tra'}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredList.length === 0 && (
                <div className="p-3 text-center text-slate-400 italic text-[11px]">
                  Không tìm thấy nhân sự phù hợp
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

const CLICKUP_PRIORITIES = [
  { id: 'urgent', label: 'Khẩn cấp', flagColor: 'text-rose-600 fill-rose-600' },
  { id: 'high', label: 'Ưu tiên cao', flagColor: 'text-amber-500 fill-amber-500' },
  { id: 'medium', label: 'Bình thường', flagColor: 'text-blue-500 fill-blue-500' },
  { id: 'low', label: 'Thấp', flagColor: 'text-slate-400' },
];

function ClickUpPriorityCell({ value = 'medium', disabled, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const current = CLICKUP_PRIORITIES.find(p => p.id === value) || CLICKUP_PRIORITIES[2];

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 150)),
    });
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-2 py-0.5 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
        title={`Mức ưu tiên: ${current.label} (Bấm để đổi)`}
      >
        <Flag size={13} className={current.flagColor} />
        <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
          {current.label}
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: '140px',
              zIndex: 99999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {CLICKUP_PRIORITIES.map((p) => {
              const isSelected = value === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Flag size={13} className={p.flagColor} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

const ClickUpDateCell = ClickUpDatePicker;

/**
 * Standard CodeHelp Selection Component for Table Cell
 * Bo góc mềm mại rounded-md / rounded-lg theo chuẩn giao diện taskgs
 */
function EvaluationCodeHelpCell({ value, disabled, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 290 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const currentOption = useMemo(() => {
    if (!value) return null;
    return EVALUATION_CODES.find((opt) => opt.value === value || opt.code === value) || null;
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 260;
    const below = window.innerHeight - rect.bottom;
    const upward = below < dropdownHeight && rect.top > dropdownHeight;
    const width = 290;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));

    setDropdownPos({
      top: upward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left,
      width,
    });
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full h-7 px-2 flex items-center justify-between text-xs rounded-none border-0 outline-none hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer select-none m-0 ${
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        title="Bấm để chọn đánh giá kết quả nghiệm thu"
      >
        {currentOption && currentOption.code !== 'NONE' ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${currentOption.codeColor}`}>
              {currentOption.code}
            </span>
            <span className={`truncate font-medium ${currentOption.textColor}`}>
              {currentOption.label}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
            Chưa đánh giá
          </span>
        )}
        <ChevronDown size={12} className="text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Đánh giá kết quả
              </span>
              <span className="text-[10px] text-slate-400 font-mono">ESC</span>
            </div>

            {/* List options */}
            <div className="p-1.5 space-y-1">
              {EVALUATION_CODES.map((opt) => {
                const isSelected = (opt.value === '' && (!value || value === 'NONE')) || opt.value === value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 flex items-start justify-between text-left transition-colors cursor-pointer rounded-md ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-slate-900 dark:text-slate-100'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0 pr-1">
                      <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border shrink-0 mt-0.5 ${opt.codeColor}`}>
                        {opt.code}
                      </span>
                      <div className="min-w-0">
                        <div className={`font-semibold text-xs flex items-center gap-1 ${opt.textColor}`}>
                          <OptIcon size={13} className="shrink-0" />
                          <span>{opt.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Storage helpers for dynamic custom columns (global workspace configuration)
 */
const CUSTOM_COLUMNS_KEY = 'taskgs_checklist_custom_columns';
const COL_WIDTHS_KEY = 'taskgs_checklist_col_widths';
const DENSITY_KEY = 'taskgs_checklist_density';
const HIDDEN_COLS_KEY = 'taskgs_checklist_hidden_cols';

export const DEFAULT_COL_WIDTHS = {
  checkbox: 40,
  title: 340,
  executor: 170,
  inspector: 170,
  dueDate: 130,
  priority: 120,
  actions: 44,
};

export function getCustomColumns() {
  try {
    const raw = localStorage.getItem(CUSTOM_COLUMNS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load custom columns:', e);
  }
  return [];
}

export function setGlobalCustomColumns(cols) {
  try {
    localStorage.setItem(CUSTOM_COLUMNS_KEY, JSON.stringify(cols));
    window.dispatchEvent(new Event('taskgs_custom_columns_updated'));
  } catch (e) {
    console.error('Failed to save custom columns:', e);
  }
}

export function getStoredColWidths() {
  try {
    const raw = localStorage.getItem(COL_WIDTHS_KEY);
    if (raw) return { ...DEFAULT_COL_WIDTHS, ...JSON.parse(raw) };
  } catch (e) {}
  return DEFAULT_COL_WIDTHS;
}

export function setStoredColWidths(widths) {
  try {
    localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths));
  } catch (e) {}
}

export function getStoredDensity() {
  try {
    const raw = localStorage.getItem(DENSITY_KEY);
    if (raw && ['compact', 'normal', 'comfortable'].includes(raw)) return raw;
  } catch (e) {}
  return 'normal';
}

export function setStoredDensity(d) {
  try {
    localStorage.setItem(DENSITY_KEY, d);
  } catch (e) {}
}

export function getStoredHiddenCols() {
  try {
    const raw = localStorage.getItem(HIDDEN_COLS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function setStoredHiddenCols(cols) {
  try {
    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(cols));
  } catch (e) {}
}

export default function TaskChecklistTable({
  taskId,
  initialItems = [],
  items: controlledItems,
  onChange: onControlledChange,
  onAddRow,
  onChecklistUpdated,
  defaultAssignee = '',
  defaultExecutor = '',
  department = '',
  isCreate = false,
  isPersonal = false,
  hideToolbar = false,
  selectedRowIds,
  onSelectRowIds,
  readOnly = false,
}) {
  const { currentUser } = useAuth();
  const effectiveDept = department || currentUser?.department || '';
  const effectiveExecutor = defaultExecutor || currentUser?.name || currentUser?.fullName || 'Tôi thực hiện';

  const isCreateMode = isCreate || !taskId;
  const isControlled = Boolean(onControlledChange);
  const [internalItems, setInternalItems] = useState(() =>
    padToDefaultRows(initialItems, defaultAssignee, effectiveExecutor, DEFAULT_ROW_COUNT)
  );
  const [internalSelectedIds, setInternalSelectedIds] = useState(new Set());
  const activeSelectedIds = selectedRowIds !== undefined ? selectedRowIds : internalSelectedIds;
  const setActiveSelectedIds = onSelectRowIds || setInternalSelectedIds;

  // Synchronize items
  useEffect(() => {
    if (isControlled && Array.isArray(controlledItems)) {
      setInternalItems(controlledItems);
    } else if (!isControlled && Array.isArray(initialItems)) {
      setInternalItems(padToDefaultRows(initialItems, defaultAssignee, effectiveExecutor, DEFAULT_ROW_COUNT));
    }
  }, [controlledItems, initialItems, isControlled, defaultAssignee, effectiveExecutor]);

  const currentItems = isControlled && Array.isArray(controlledItems) ? controlledItems : internalItems;

  const updateItems = (next) => {
    if (isControlled) {
      onControlledChange?.(next);
    } else {
      setInternalItems(next);
    }
  };

  const [saving, setSaving] = useState(false);
  const [masterEmployees, setMasterEmployees] = useState([]);
  const tableContainerRef = useRef(null);

  const [quickTitle, setQuickTitle] = useState('');
  const [quickAssignee, setQuickAssignee] = useState('');
  const [quickInspector, setQuickInspector] = useState('');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [quickCustomFields, setQuickCustomFields] = useState({});

  // Dynamic Custom Columns State & Synchronization (managed globally in System Settings)
  const [customColumns, setCustomColumns] = useState(() => getCustomColumns());

  // Table Preferences: Widths, Density & Visibility
  const [colWidths, setColWidths] = useState(() => getStoredColWidths());
  const [hiddenColumns, setHiddenColumns] = useState(() => getStoredHiddenCols());
  const [rowDensity, setRowDensity] = useState(() => getStoredDensity());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleDensityChange = (density) => {
    setRowDensity(density);
    setStoredDensity(density);
  };

  const handleToggleHideColumn = (colId) => {
    setHiddenColumns((prev) => {
      const next = prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId];
      setStoredHiddenCols(next);
      return next;
    });
  };

  const handleResetColWidths = () => {
    setColWidths(DEFAULT_COL_WIDTHS);
    setStoredColWidths(DEFAULT_COL_WIDTHS);
    notify.success('Đã khôi phục kích thước cột mặc định.');
  };

  const startColResize = (e, colId, initialWidth) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(70, initialWidth + delta);
      setColWidths((prev) => ({
        ...prev,
        [colId]: newWidth,
      }));
    };

    const onPointerUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setColWidths((latest) => {
        setStoredColWidths(latest);
        return latest;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        }
        return { key: null, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const isColVisible = (colId) => !hiddenColumns.includes(colId);

  // Sorted items based on active sortConfig
  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return currentItems;
    const { key, direction } = sortConfig;
    const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };

    return [...currentItems].sort((a, b) => {
      let valA = a[key] ?? a.customFields?.[key] ?? '';
      let valB = b[key] ?? b.customFields?.[key] ?? '';

      if (key === 'priority') {
        valA = priorityWeights[valA] || 0;
        valB = priorityWeights[valB] || 0;
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      if (key === 'isCompleted') {
        valA = valA ? 1 : 0;
        valB = valB ? 1 : 0;
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      if (
        typeof valA === 'number' ||
        (!isNaN(Number(valA)) && !isNaN(Number(valB)) && valA !== '' && valB !== '')
      ) {
        return direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }

      return direction === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [currentItems, sortConfig]);

  useEffect(() => {
    const handleUpdate = () => {
      setCustomColumns(getCustomColumns());
      setHiddenColumns(getStoredHiddenCols());
      setColWidths(getStoredColWidths());
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('taskgs_custom_columns_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('taskgs_custom_columns_updated', handleUpdate);
    };
  }, []);

  const handleCustomFieldChange = (id, fieldId, value) => {
    if (readOnly) return;
    const next = currentItems.map((item) => {
      if (item.id === id) {
        let nextTag = item.workingTag;
        if (item.workingTag === 'D') {
          nextTag = item._origTag || (item._isNew ? 'A' : 'U');
        } else if (item.workingTag === 'Q') {
          nextTag = 'U';
        } else if (!item.workingTag || item.workingTag === '') {
          nextTag = 'A';
        }
        return {
          ...item,
          [fieldId]: value,
          customFields: {
            ...(item.customFields || {}),
            [fieldId]: value,
          },
          workingTag: nextTag,
          _isDirty: true,
        };
      }
      return item;
    });
    updateItems(next);
  };

  const handleSaveQuickTask = () => {
    if (!quickTitle.trim()) return;
    const newRow = {
      id: `grid-row-${Date.now()}`,
      title: quickTitle.trim(),
      standard: '',
      executor: quickAssignee || effectiveExecutor || '',
      inspector: quickInspector || defaultAssignee || '',
      dueDate: quickDueDate || '',
      priority: quickPriority || 'medium',
      result: '',
      note: '',
      isCompleted: false,
      workingTag: 'A',
      _isNew: true,
      _origTag: 'A',
      ...quickCustomFields,
      customFields: { ...quickCustomFields },
    };
    updateItems([...currentItems, newRow]);
    setQuickTitle('');
    setQuickDueDate('');
    setQuickPriority('medium');
    setQuickCustomFields({});
    notify.success('Đã thêm 1 công việc mới.');
  };

  const handleToggleSelectRow = (id) => {
    if (readOnly) return;
    const next = new Set(activeSelectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setActiveSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (readOnly) return;
    if (activeSelectedIds.size === currentItems.length && currentItems.length > 0) {
      setActiveSelectedIds(new Set());
    } else {
      setActiveSelectedIds(new Set(currentItems.map((r) => r.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (readOnly || activeSelectedIds.size === 0) return;
    const count = activeSelectedIds.size;
    const next = currentItems.filter((item) => !activeSelectedIds.has(item.id));
    updateItems(next);
    setActiveSelectedIds(new Set());
    notify.success(`Đã xóa ${count} dòng khỏi bảng.`);
  };

  // Load employee master data filtered strictly by department
  useEffect(() => {
    const filter = effectiveDept ? { department: effectiveDept } : {};
    taskService.getEmployees(filter).then((res) => {
      if (Array.isArray(res)) {
        setMasterEmployees(res);
      }
    }).catch(() => {});
  }, [effectiveDept]);

  // Handle cell changes with automatic WorkingTag transitions:
  // - Blank -> 'A'
  // - 'Q' -> 'U'
  // - 'D' -> restores to 'U' or 'A'
  const handleCellChange = (id, field, value) => {
    if (readOnly) return;
    const next = currentItems.map((item) => {
      if (item.id === id) {
        let nextTag = item.workingTag;
        if (item.workingTag === 'D') {
          nextTag = item._origTag || (item._isNew ? 'A' : 'U');
        } else if (item.workingTag === 'Q') {
          nextTag = 'U';
        } else if (!item.workingTag || item.workingTag === '') {
          nextTag = 'A';
        }
        const updated = {
          ...item,
          [field]: value,
          workingTag: nextTag,
          _isDirty: true,
        };
        if (field === 'result') {
          updated.isCompleted = value === 'Đạt chuẩn';
        }
        return updated;
      }
      return item;
    });
    updateItems(next);
  };

  // Toggle single item completed
  const handleToggleRow = async (id, currentCompleted) => {
    if (readOnly) return;
    const nextCompleted = !currentCompleted;
    const next = currentItems.map((item) => {
      if (item.id === id) {
        let nextTag = item.workingTag;
        if (item.workingTag === 'D') {
          nextTag = item._origTag || (item._isNew ? 'A' : 'U');
        } else if (item.workingTag === 'Q') {
          nextTag = 'U';
        } else if (!item.workingTag || item.workingTag === '') {
          nextTag = 'A';
        }
        return {
          ...item,
          isCompleted: nextCompleted,
          // Người làm chỉ đánh dấu Đã làm xong, KHÔNG tự phong "Đạt chuẩn" (Chờ KCS nghiệm thu)!
          result: item.result || (nextCompleted ? 'Chờ nghiệm thu' : ''),
          workingTag: nextTag,
          _isDirty: true,
        };
      }
      return item;
    });
    updateItems(next);

    // If standalone with real backend taskId, trigger toggle immediately
    if (!isControlled && taskId && !String(id).startsWith('grid-row-') && !String(id).startsWith('item-')) {
      try {
        await taskService.toggleChecklistItem(id, nextCompleted);
        onChecklistUpdated?.();
      } catch (e) {
        console.error('Error toggling checklist item:', e);
      }
    }
  };

  // Delete row directly
  const handleDeleteRow = (id) => {
    if (readOnly) return;
    const next = currentItems.filter((item) => item.id !== id);
    updateItems(next);
    if (activeSelectedIds && activeSelectedIds.has(id)) {
      const nextSelected = new Set(activeSelectedIds);
      nextSelected.delete(id);
      setActiveSelectedIds(nextSelected);
    }
  };

  // Add more rows (mặc định thêm 1 dòng)
  const handleAddMoreRows = (count = 1) => {
    const startIndex = currentItems.length;
    const newRows = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: `grid-row-${startIndex + i + 1}-${Date.now()}`,
        title: '',
        standard: '',
        executor: effectiveExecutor || '',
        inspector: defaultAssignee || '',
        dueDate: '',
        priority: 'medium',
        result: '',
        note: '',
        isCompleted: false,
        workingTag: 'A',
        _isNew: true,
        _origTag: 'A',
      });
    }
    const next = [...currentItems, ...newRows];
    updateItems(next);
    notify.success(count === 1 ? 'Đã thêm 1 dòng mới vào bảng.' : `Đã thêm ${count} dòng mới vào bảng.`);

    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 60);
  };

  // Intercept paste event for Excel / TSV copy-paste
  const handlePaste = useCallback(
    (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      const text = clipboardData.getData('text');
      if (!text) return;

      const hasMultipleLines = text.includes('\n') || text.includes('\r');
      const hasTabs = text.includes('\t');

      if (hasMultipleLines || hasTabs) {
        e.preventDefault();
        const lines = text
          .split(/\r\n|\n|\r/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length === 0) return;

        // Find index of first blank row or append
        let firstBlankIdx = currentItems.findIndex((r) => !r.title?.trim() && !r.workingTag);
        if (firstBlankIdx === -1) {
          firstBlankIdx = currentItems.length;
        }

        const next = [...currentItems];

        lines.forEach((line, idx) => {
          const cells = line.split('\t').map((c) => c.trim());
          const title = cells[0] || `Hạng mục ${idx + 1}`;
          const standard = cells[1] || '';
          const inspector = cells[2] || defaultAssignee || '';
          const result = cells[3] || '';
          const note = cells[4] || '';
          const isCompleted = result.toLowerCase().includes('đạt');

          const targetIdx = firstBlankIdx + idx;
          const rowData = {
            id: `pasted-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            title,
            standard,
            executor: effectiveExecutor || '',
            inspector,
            dueDate: '',
            priority: 'medium',
            result,
            note,
            isCompleted,
            workingTag: 'A', // Tagged as Add
            _isNew: true,
            _isDirty: true,
          };

          if (targetIdx < next.length) {
            next[targetIdx] = rowData;
          } else {
            next.push(rowData);
          }
        });

        // Ensure at least DEFAULT_ROW_COUNT (2 sample) rows
        while (next.length < DEFAULT_ROW_COUNT) {
          next.push({
            id: `grid-row-${next.length + 1}-${Date.now()}`,
            title: '',
            standard: '',
            executor: effectiveExecutor || '',
            inspector: defaultAssignee || '',
            dueDate: '',
            priority: 'medium',
            result: '',
            note: '',
            isCompleted: false,
            workingTag: 'A',
            _isNew: true,
            _origTag: 'A',
          });
        }

        updateItems(next);
        notify.success(`Đã dán và ghi nhận ${lines.length} dòng dữ liệu.`);
      }
    },
    [currentItems, defaultAssignee, effectiveExecutor, isControlled]
  );

  // Toggle all items completed
  const handleToggleAll = (targetCompleted) => {
    const next = currentItems.map((r) => {
      // Only toggle rows that have content and are not deleted
      if (!r.title?.trim() || r.workingTag === 'D') return r;
      let nextTag = r.workingTag;
      if (r.workingTag === 'Q') nextTag = 'U';
      else if (!r.workingTag) nextTag = 'A';

      return {
        ...r,
        isCompleted: targetCompleted,
        // Báo xong công việc, KHÔNG tự phong "Đạt chuẩn" (Chờ KCS nghiệm thu)!
        result: r.result || (targetCompleted ? 'Chờ nghiệm thu' : ''),
        workingTag: nextTag,
        _isDirty: true,
      };
    });
    updateItems(next);

    notify.success(
      targetCompleted ? 'Đã đánh dấu nghiệm thu tất cả hạng mục.' : 'Đã bỏ chọn nghiệm thu tất cả.'
    );
  };

  // Bulk Save all new or modified rows to backend
  const handleSaveAll = async () => {
    if (!taskId) return;
    setSaving(true);
    try {
      const itemsToCreate = currentItems.filter((r) => r.workingTag === 'A' && r.title?.trim());
      const itemsToUpdate = currentItems.filter((r) => r.workingTag === 'U' && r.title?.trim());
      const itemsToDelete = currentItems.filter((r) => r.workingTag === 'D');

      // Create new items
      for (const item of itemsToCreate) {
        const formattedTitle = item.standard?.trim()
          ? `${item.title.trim()} [${item.standard.trim()}]`
          : item.title.trim();
        const created = await taskService.addChecklistItem(taskId, formattedTitle);
        if (created?.id && item.isCompleted) {
          await taskService.toggleChecklistItem(created.id, true);
        }
      }

      // Update toggle status for modified items
      for (const item of itemsToUpdate) {
        if (!String(item.id).startsWith('grid-row-') && !String(item.id).startsWith('pasted-')) {
          await taskService.toggleChecklistItem(item.id, item.isCompleted);
        }
      }

      // Mark all saved items to Q and remove D
      const next = currentItems
        .filter((r) => r.workingTag !== 'D')
        .map((r) => {
          if (r.title?.trim()) {
            return { ...r, workingTag: 'Q', _isDirty: false };
          }
          return r;
        });

      // Pad to DEFAULT_ROW_COUNT (2 sample rows)
      while (next.length < DEFAULT_ROW_COUNT) {
        next.push({
          id: `grid-row-${next.length + 1}-${Date.now()}`,
          title: '',
          standard: '',
          executor: effectiveExecutor || '',
          inspector: defaultAssignee || '',
          dueDate: '',
          priority: 'medium',
          result: '',
          note: '',
          isCompleted: false,
          workingTag: 'A',
          _isNew: true,
          _origTag: 'A',
        });
      }

      updateItems(next);
      notify.success('Đã lưu toàn bộ thay đổi vào hệ thống (WorkingTag -> Q).');
      onChecklistUpdated?.();
    } catch (e) {
      console.error('Error saving checklist:', e);
      notify.error('Lỗi khi lưu bảng kiểm tra: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // Compute metrics
  const totalRows = currentItems.length;
  const countA = useMemo(() => currentItems.filter((r) => r.workingTag === 'A').length, [currentItems]);
  const countU = useMemo(() => currentItems.filter((r) => r.workingTag === 'U').length, [currentItems]);
  const countD = useMemo(() => currentItems.filter((r) => r.workingTag === 'D').length, [currentItems]);
  const countQ = useMemo(() => currentItems.filter((r) => r.workingTag === 'Q').length, [currentItems]);

  const activeRows = useMemo(
    () => currentItems.filter((r) => r.title?.trim() && r.workingTag !== 'D'),
    [currentItems]
  );
  const activeCount = activeRows.length;
  const completedCount = activeRows.filter((r) => r.isCompleted).length;
  const percent = activeCount > 0 ? Math.round((completedCount / activeCount) * 100) : 0;
  const hasUnsavedChanges = countA > 0 || countU > 0 || countD > 0;

  const rowHeightClass = 'h-8 py-0';
  const quickRowHeightClass = 'h-8 py-0';

  const visibleColSpan =
    1 /* checkbox */ +
    (isColVisible('title') ? 1 : 0) +
    (isColVisible('executor') ? 1 : 0) +
    (isColVisible('inspector') ? 1 : 0) +
    (isColVisible('dueDate') ? 1 : 0) +
    (isColVisible('priority') ? 1 : 0) +
    customColumns.filter((c) => isColVisible(c.id)).length +
    1 /* actions */;

  const totalTableWidth = useMemo(() => {
    let w = colWidths.checkbox || 40;
    if (isColVisible('title')) w += colWidths.title || 340;
    if (isColVisible('executor')) w += colWidths.executor || 170;
    if (isColVisible('inspector')) w += colWidths.inspector || 170;
    if (isColVisible('dueDate')) w += colWidths.dueDate || 130;
    if (isColVisible('priority')) w += colWidths.priority || 120;
    customColumns.forEach((col) => {
      if (isColVisible(col.id)) w += colWidths[col.id] || 140;
    });
    w += colWidths.actions || 44;
    return w;
  }, [colWidths, hiddenColumns, customColumns]);

  return (
    <div
      className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white dark:bg-slate-950 overflow-hidden text-xs rounded-none"
      onPaste={handlePaste}
    >
      {/* ClickUp Modern Flat List View */}
      <div
        ref={tableContainerRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-auto bg-white dark:bg-slate-950"
      >
        <table
          style={{
            width: `${totalTableWidth}px`,
            minWidth: `${totalTableWidth}px`,
            tableLayout: 'fixed',
          }}
          className="text-left border-collapse text-xs select-text"
        >
          {/* Header Row */}
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-medium select-none text-[11px]">
            <tr className="h-8">
              <th
                style={{ width: `${colWidths.checkbox || 40}px` }}
                className="w-10 min-w-[40px] px-2 py-0 text-center h-8 align-middle"
              >
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  checked={currentItems.length > 0 && activeSelectedIds.size === currentItems.length}
                  onChange={handleToggleSelectAll}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                />
              </th>

              {/* Title column */}
              {isColVisible('title') && (
                <th
                  style={{ width: `${colWidths.title || 340}px` }}
                  className="px-3 py-0 h-8 align-middle font-medium relative group/th"
                >
                  <div
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <span>Tên công việc</span>
                    {sortConfig.key === 'title' ? (
                      sortConfig.direction === 'asc' ? (
                        <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="opacity-0 group-hover/th:opacity-50 transition-opacity shrink-0" />
                    )}
                  </div>
                  {/* Resizer */}
                  <div
                    onPointerDown={(e) => startColResize(e, 'title', colWidths.title || 340)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500/50 z-20"
                    title="Kéo để điều chỉnh độ rộng cột"
                  />
                </th>
              )}

              {/* Executor column */}
              {isColVisible('executor') && (
                <th
                  style={{ width: `${colWidths.executor || 170}px` }}
                  className="px-3 py-0 h-8 align-middle font-medium relative group/th"
                >
                  <div
                    onClick={() => handleSort('executor')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <span>Người thực hiện</span>
                    {sortConfig.key === 'executor' ? (
                      sortConfig.direction === 'asc' ? (
                        <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="opacity-0 group-hover/th:opacity-50 transition-opacity shrink-0" />
                    )}
                  </div>
                  <div
                    onPointerDown={(e) => startColResize(e, 'executor', colWidths.executor || 170)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500/50 z-20"
                    title="Kéo để điều chỉnh độ rộng cột"
                  />
                </th>
              )}

              {/* Inspector column */}
              {isColVisible('inspector') && (
                <th
                  style={{ width: `${colWidths.inspector || 170}px` }}
                  className="px-3 py-0 h-8 align-middle font-medium relative group/th"
                >
                  <div
                    onClick={() => handleSort('inspector')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <span>Người duyệt</span>
                    {sortConfig.key === 'inspector' ? (
                      sortConfig.direction === 'asc' ? (
                        <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="opacity-0 group-hover/th:opacity-50 transition-opacity shrink-0" />
                    )}
                  </div>
                  <div
                    onPointerDown={(e) => startColResize(e, 'inspector', colWidths.inspector || 170)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500/50 z-20"
                    title="Kéo để điều chỉnh độ rộng cột"
                  />
                </th>
              )}

              {/* Due Date column */}
              {isColVisible('dueDate') && (
                <th
                  style={{ width: `${colWidths.dueDate || 130}px` }}
                  className="px-3 py-0 h-8 align-middle font-medium relative group/th"
                >
                  <div
                    onClick={() => handleSort('dueDate')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <span>Hạn chót</span>
                    {sortConfig.key === 'dueDate' ? (
                      sortConfig.direction === 'asc' ? (
                        <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="opacity-0 group-hover/th:opacity-50 transition-opacity shrink-0" />
                    )}
                  </div>
                  <div
                    onPointerDown={(e) => startColResize(e, 'dueDate', colWidths.dueDate || 130)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500/50 z-20"
                    title="Kéo để điều chỉnh độ rộng cột"
                  />
                </th>
              )}

              {/* Priority column */}
              {isColVisible('priority') && (
                <th
                  style={{ width: `${colWidths.priority || 120}px` }}
                  className="px-3 py-0 h-8 align-middle font-medium relative group/th"
                >
                  <div
                    onClick={() => handleSort('priority')}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <span>Ưu tiên</span>
                    {sortConfig.key === 'priority' ? (
                      sortConfig.direction === 'asc' ? (
                        <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="opacity-0 group-hover/th:opacity-50 transition-opacity shrink-0" />
                    )}
                  </div>
                  <div
                    onPointerDown={(e) => startColResize(e, 'priority', colWidths.priority || 120)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500/50 z-20"
                    title="Kéo để điều chỉnh độ rộng cột"
                  />
                </th>
              )}

              {/* Dynamic Custom Column Headers */}
              {customColumns.filter((col) => isColVisible(col.id)).map((col) => (
                <th
                  key={col.id}
                  style={{ width: `${colWidths[col.id] || 140}px` }}
                  className="px-3 py-0 h-8 align-middle font-medium text-slate-500 dark:text-slate-400 relative group/th"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      onClick={() => handleSort(col.id)}
                      className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 truncate"
                    >
                      <span className="truncate">{col.label}</span>
                      {sortConfig.key === col.id ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown size={11} className="opacity-0 group-hover/th:opacity-50 transition-opacity shrink-0" />
                      )}
                    </div>
                  </div>
                  <div
                    onPointerDown={(e) => startColResize(e, col.id, colWidths[col.id] || 140)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500/50 z-20"
                    title="Kéo để điều chỉnh độ rộng cột"
                  />
                </th>
              ))}

              {/* Action Column */}
              <th
                style={{ width: `${colWidths.actions || 44}px` }}
                className="w-12 text-center px-1 py-0 h-8 align-middle"
              >
                {activeSelectedIds.size > 0 ? (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition cursor-pointer"
                    title={`Xóa ${activeSelectedIds.size} dòng đã chọn`}
                  >
                    <Trash2 size={13} />
                  </button>
                ) : (
                  <span className="sr-only">Thao tác</span>
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Task Rows (Sorted Items) */}
            {sortedItems.map((row, idx) => {
                const isDeleted = row.workingTag === 'D';
                const isRowDisabled = isDeleted || readOnly;
                const isSelected = activeSelectedIds.has(row.id);

                return (
                  <tr
                    key={row.id}
                    className={`group transition-colors border-b border-slate-100 dark:border-slate-800/60 ${rowHeightClass} ${
                      isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-950/30'
                        : isDeleted
                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-900/40 bg-white dark:bg-slate-950'
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      style={{ width: `${colWidths.checkbox || 40}px` }}
                      className="w-10 min-w-[40px] px-2 py-0 text-center"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={readOnly}
                        onChange={() => handleToggleSelectRow(row.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </td>

                    {/* Task Title + Status Bullet */}
                    {isColVisible('title') && (
                      <td
                        style={{ width: `${colWidths.title || 340}px` }}
                        className="px-3 py-0"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isRowDisabled}
                            onClick={() => handleToggleRow(row.id, row.isCompleted)}
                            className="shrink-0 text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                          >
                            {row.isCompleted ? (
                              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Circle size={15} className="text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                          <input
                            type="text"
                            disabled={isRowDisabled}
                            value={row.title}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (idx === sortedItems.length - 1) {
                                  handleAddMoreRows(1);
                                }
                              }
                            }}
                            onChange={(e) => handleCellChange(row.id, 'title', e.target.value)}
                            placeholder="Nhập tên công việc (hoặc gõ '/' để thêm)..."
                            className={`w-full h-7 bg-transparent border-0 outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-300 py-0 text-xs ${
                              row.isCompleted ? 'line-through text-slate-400' : 'font-medium'
                            }`}
                          />
                        </div>
                      </td>
                    )}

                    {/* Assignee */}
                    {isColVisible('executor') && (
                      <td
                        style={{ width: `${colWidths.executor || 170}px` }}
                        className="px-3 py-0"
                      >
                        <InspectorSelectCell
                          value={row.executor}
                          disabled={isRowDisabled}
                          employeeList={masterEmployees}
                          placeholder="Chọn người thực hiện..."
                          title="Người thực hiện"
                          icon={User}
                          onChange={(val) => handleCellChange(row.id, 'executor', val)}
                        />
                      </td>
                    )}

                    {/* Inspector */}
                    {isColVisible('inspector') && (
                      <td
                        style={{ width: `${colWidths.inspector || 170}px` }}
                        className="px-3 py-0"
                      >
                        <InspectorSelectCell
                          value={row.inspector}
                          disabled={isRowDisabled}
                          employeeList={masterEmployees}
                          placeholder="Chọn người duyệt..."
                          title="Người duyệt"
                          icon={User}
                          onChange={(val) => handleCellChange(row.id, 'inspector', val)}
                        />
                      </td>
                    )}

                    {/* Due Date */}
                    {isColVisible('dueDate') && (
                      <td
                        style={{ width: `${colWidths.dueDate || 130}px` }}
                        className="px-3 py-0"
                      >
                        <ClickUpDateCell
                          value={row.dueDate}
                          disabled={isRowDisabled}
                          onChange={(val) => handleCellChange(row.id, 'dueDate', val)}
                        />
                      </td>
                    )}

                    {/* Priority */}
                    {isColVisible('priority') && (
                      <td
                        style={{ width: `${colWidths.priority || 120}px` }}
                        className="px-3 py-0"
                      >
                        <ClickUpPriorityCell
                          value={row.priority}
                          disabled={isRowDisabled}
                          onChange={(val) => handleCellChange(row.id, 'priority', val)}
                        />
                      </td>
                    )}

                    {/* Dynamic Custom Column Cells */}
                    {customColumns.filter((col) => isColVisible(col.id)).map((col) => {
                      const cellVal = row.customFields?.[col.id] ?? row[col.id] ?? '';
                      return (
                        <td
                          key={col.id}
                          style={{ width: `${colWidths[col.id] || 140}px` }}
                          className="px-3 py-0"
                        >
                          {col.type === 'checkbox' ? (
                            <div className="flex items-center h-full">
                              <input
                                type="checkbox"
                                disabled={isRowDisabled}
                                checked={Boolean(cellVal)}
                                onChange={(e) =>
                                  handleCustomFieldChange(row.id, col.id, e.target.checked)
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                              />
                            </div>
                          ) : col.type === 'select' ? (
                            <select
                              disabled={isRowDisabled}
                              value={cellVal}
                              onChange={(e) =>
                                handleCustomFieldChange(row.id, col.id, e.target.value)
                              }
                              className="w-full bg-transparent border-0 outline-none text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer p-0 m-0"
                            >
                              <option value="">-- Chọn --</option>
                              {(col.options || []).map((opt, i) => (
                                <option key={i} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : col.type === 'number' ? (
                            <input
                              type="number"
                              disabled={isRowDisabled}
                              value={cellVal}
                              onChange={(e) =>
                                handleCustomFieldChange(row.id, col.id, e.target.value)
                              }
                              placeholder="0"
                              className="w-full h-7 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-200 py-0"
                            />
                          ) : col.type === 'date' ? (
                            <ClickUpDatePicker
                              value={cellVal}
                              disabled={isRowDisabled}
                              tabLabel={col.label || 'Ngày'}
                              onChange={(val) =>
                                handleCustomFieldChange(row.id, col.id, val)
                              }
                            />
                          ) : (
                            <input
                              type="text"
                              disabled={isRowDisabled}
                              value={cellVal}
                              onChange={(e) =>
                                handleCustomFieldChange(row.id, col.id, e.target.value)
                              }
                              placeholder="Nhập..."
                              className="w-full h-7 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-200 py-0 placeholder:text-slate-300"
                            />
                          )}
                        </td>
                      );
                    })}

                    {/* Action / Delete */}
                    <td
                      style={{ width: `${colWidths.actions || 44}px` }}
                      className="w-12 text-center px-1 py-0 h-8 align-middle"
                    >
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                          title="Xóa dòng này"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

            {/* Inline Quick Add Row */}
            {!readOnly && (
              <tr className="border-b border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors h-8">
                <td
                  style={{ width: `${colWidths.checkbox || 40}px` }}
                  className="w-10 px-2 py-0 text-center text-slate-300 h-8 align-middle"
                >
                  <Plus size={13} className="mx-auto text-slate-400" />
                </td>

                {isColVisible('title') && (
                  <td
                    style={{ width: `${colWidths.title || 340}px` }}
                    className="px-3 py-0 h-8 align-middle"
                  >
                    <div className="flex items-center gap-2 h-full">
                      <Circle size={14} className="text-slate-300 shrink-0" />
                      <input
                        type="text"
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveQuickTask();
                          }
                        }}
                        placeholder="Nhập tên công việc (hoặc gõ '/' để thêm)..."
                        className="w-full h-7 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 py-0 font-medium"
                      />
                    </div>
                  </td>
                )}

                {isColVisible('executor') && (
                  <td
                    style={{ width: `${colWidths.executor || 170}px` }}
                    className="px-3 py-0 h-8 align-middle"
                  >
                    <InspectorSelectCell
                      value={quickAssignee}
                      disabled={false}
                      employeeList={masterEmployees}
                      placeholder="Chọn người thực hiện..."
                      title="Người thực hiện"
                      icon={User}
                      onChange={setQuickAssignee}
                    />
                  </td>
                )}

                {isColVisible('inspector') && (
                  <td
                    style={{ width: `${colWidths.inspector || 170}px` }}
                    className="px-3 py-0 h-8 align-middle"
                  >
                    <InspectorSelectCell
                      value={quickInspector}
                      disabled={false}
                      employeeList={masterEmployees}
                      placeholder="Chọn người duyệt..."
                      title="Người duyệt"
                      icon={User}
                      onChange={setQuickInspector}
                    />
                  </td>
                )}

                {isColVisible('dueDate') && (
                  <td
                    style={{ width: `${colWidths.dueDate || 130}px` }}
                    className="px-3 py-0 h-8 align-middle"
                  >
                    <ClickUpDateCell
                      value={quickDueDate}
                      disabled={false}
                      onChange={setQuickDueDate}
                    />
                  </td>
                )}

                {isColVisible('priority') && (
                  <td
                    style={{ width: `${colWidths.priority || 120}px` }}
                    className="px-3 py-0 h-8 align-middle"
                  >
                    <ClickUpPriorityCell
                      value={quickPriority}
                      disabled={false}
                      onChange={setQuickPriority}
                    />
                  </td>
                )}

                {/* Quick Add Custom Columns Inputs */}
                {customColumns.filter((col) => isColVisible(col.id)).map((col) => {
                  const val = quickCustomFields[col.id] ?? '';
                  return (
                    <td
                      key={col.id}
                      style={{ width: `${colWidths[col.id] || 140}px` }}
                      className="px-3 py-0 h-8 align-middle"
                    >
                      {col.type === 'checkbox' ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) =>
                              setQuickCustomFields((prev) => ({
                                ...prev,
                                [col.id]: e.target.checked,
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                          />
                        </div>
                      ) : col.type === 'select' ? (
                        <select
                          value={val}
                          onChange={(e) =>
                            setQuickCustomFields((prev) => ({
                              ...prev,
                              [col.id]: e.target.value,
                            }))
                          }
                          className="w-full bg-transparent border-0 outline-none text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer p-0 m-0"
                        >
                          <option value="">-- Chọn --</option>
                          {(col.options || []).map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : col.type === 'number' ? (
                        <input
                          type="number"
                          value={val}
                          onChange={(e) =>
                            setQuickCustomFields((prev) => ({
                              ...prev,
                              [col.id]: e.target.value,
                            }))
                          }
                          placeholder="0"
                          className="w-full h-7 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-200 py-0"
                        />
                      ) : col.type === 'date' ? (
                        <ClickUpDatePicker
                          value={val}
                          disabled={readOnly}
                          tabLabel={col.label || 'Ngày'}
                          onChange={(v) =>
                            setQuickCustomFields((prev) => ({
                              ...prev,
                              [col.id]: v,
                            }))
                          }
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) =>
                            setQuickCustomFields((prev) => ({
                              ...prev,
                              [col.id]: e.target.value,
                            }))
                          }
                          placeholder="Nhập..."
                          className="w-full h-7 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-200 py-0 placeholder:text-slate-400"
                        />
                      )}
                    </td>
                  );
                })}

                <td
                  style={{ width: `${colWidths.actions || 44}px` }}
                  className="w-12 text-center px-1 py-0 h-8 align-middle"
                >
                  <div className="flex items-center justify-center gap-1">
                    {quickTitle && (
                      <button
                        type="button"
                        onClick={() => setQuickTitle('')}
                        className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Hủy"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveQuickTask}
                      disabled={!quickTitle.trim()}
                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                      title="Lưu dòng (Enter)"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Status Footer (ClickUp Style) */}
      <div className="h-8 min-h-[32px] px-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between text-xs text-slate-400 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Danh sách công việc
          </span>
          <span>·</span>
          <span>{activeCount} công việc</span>
          {completedCount > 0 && (
            <>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {completedCount} đã hoàn thành ({percent}%)
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {customColumns.length > 0 && (
            <span className="text-[11px] text-slate-400">
              {customColumns.length} cột tùy chỉnh
            </span>
          )}
          <span className="font-mono text-[11px] text-slate-400">
            {totalRows} dòng
          </span>
        </div>
      </div>
    </div>
  );
}
