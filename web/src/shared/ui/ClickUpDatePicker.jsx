import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronUp, ChevronDown, ChevronRight, Trash2, X } from 'lucide-react';

function getDayOfWeekNameVN(d) {
  const day = d.getDay();
  return day === 0 ? 'CN' : `T${day + 1}`;
}

function formatVNShortMonth(d) {
  return `${d.getDate()} Th${d.getMonth() + 1}`;
}

export function formatDateString(d) {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplayVN(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function parseDateString(str) {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return null;
}

function getCalendarGridDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
  const days = [];

  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDate - i),
      isCurrentMonth: false,
    });
  }

  const currentDaysCount = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= currentDaysCount; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return days;
}

/**
 * ClickUp-Style Custom Date Picker Component
 * Chuẩn Tiếng Việt, hỗ trợ chọn nhanh presets & lịch tháng trực quan
 */
export default function ClickUpDatePicker({
  value,
  disabled = false,
  onChange,
  placeholder = 'dd/mm/yyyy',
  tabLabel = 'Hạn chót',
  mode = 'cell', // 'cell' hoặc 'input'
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [viewDate, setViewDate] = useState(() => parseDateString(value) || new Date());
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const quickPresets = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const currentDay = today.getDay();
    const daysUntilSat = (6 - currentDay + 7) % 7 || 7;
    const thisWeekend = new Date(today);
    thisWeekend.setDate(today.getDate() + (currentDay === 6 ? 0 : daysUntilSat));

    const daysUntilMon = (1 - currentDay + 7) % 7 || 7;
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + daysUntilMon);

    const nextWeekend = new Date(thisWeekend);
    nextWeekend.setDate(thisWeekend.getDate() + 7);

    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);

    const fourWeeks = new Date(today);
    fourWeeks.setDate(today.getDate() + 28);

    return [
      { label: 'Hôm nay', sub: getDayOfWeekNameVN(today), date: today },
      { label: 'Muộn hơn', sub: 'Tối nay', date: today },
      { label: 'Ngày mai', sub: getDayOfWeekNameVN(tomorrow), date: tomorrow },
      { label: 'Cuối tuần này', sub: getDayOfWeekNameVN(thisWeekend), date: thisWeekend },
      { label: 'Tuần tới', sub: getDayOfWeekNameVN(nextWeek), date: nextWeek },
      { label: 'Cuối tuần tới', sub: formatVNShortMonth(nextWeekend), date: nextWeekend },
      { label: '2 tuần nữa', sub: formatVNShortMonth(twoWeeks), date: twoWeeks },
      { label: '4 tuần nữa', sub: formatVNShortMonth(fourWeeks), date: fourWeeks },
    ];
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupWidth = 570;
    const popupHeight = 430;

    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popupWidth - 12);
    }

    let top = rect.bottom + 4;
    if (top + popupHeight > window.innerHeight - 12 && rect.top > popupHeight + 12) {
      top = rect.top - popupHeight - 4;
    }

    setDropdownPos({ top, left });
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setViewDate(parseDateString(value) || new Date());
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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    return getCalendarGridDays(viewDate.getFullYear(), viewDate.getMonth());
  }, [viewDate]);

  const todayStr = useMemo(() => formatDateString(new Date()), []);

  return (
    <>
      {mode === 'input' ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={`flex items-center justify-between w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer text-left group ${className}`}
        >
          <div className="flex items-center gap-2 truncate">
            <Calendar
              size={14}
              className={`shrink-0 ${
                value
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
              }`}
            />
            <span
              className={`text-xs truncate ${
                value
                  ? 'text-slate-800 dark:text-slate-200 font-medium'
                  : 'text-slate-400'
              }`}
            >
              {value ? formatDateDisplayVN(value) : placeholder}
            </span>
          </div>
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange?.('');
              }}
              className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition"
              title="Xóa ngày"
            >
              <X size={12} />
            </span>
          )}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={`flex items-center gap-1.5 px-2 py-0.5 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer w-full text-left group ${className}`}
          title={value ? `${tabLabel}: ${formatDateDisplayVN(value)} (Bấm để đổi)` : placeholder}
        >
          <Calendar
            size={13}
            className={`shrink-0 ${
              value
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            }`}
          />
          <span
            className={`text-xs truncate ${
              value
                ? 'text-slate-800 dark:text-slate-200 font-medium'
                : 'text-slate-400'
            }`}
          >
            {value ? formatDateDisplayVN(value) : placeholder}
          </span>
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange?.('');
              }}
              className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 rounded transition"
              title="Xóa ngày"
            >
              <X size={11} />
            </span>
          )}
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: '570px',
              zIndex: 99999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl text-xs overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Top Bar (Start date / Due date Tabs) - Viền thanh mảnh chuẩn mềm mại theo phong cách ClickUp */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              <div
                className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  tabLabel.toLowerCase().includes('bắt đầu')
                    ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-xs'
                    : 'border-transparent bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <Calendar
                  size={13}
                  className={`shrink-0 ${
                    tabLabel.toLowerCase().includes('bắt đầu')
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400'
                  }`}
                />
                <span className="truncate">
                  {tabLabel.toLowerCase().includes('bắt đầu') && value
                    ? `Ngày bắt đầu: ${formatDateDisplayVN(value)}`
                    : 'Ngày bắt đầu'}
                </span>
              </div>

              <div
                className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  !tabLabel.toLowerCase().includes('bắt đầu')
                    ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-xs'
                    : 'border-transparent bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <Calendar
                  size={13}
                  className={`shrink-0 ${
                    !tabLabel.toLowerCase().includes('bắt đầu')
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400'
                  }`}
                />
                <span className="truncate">
                  {!tabLabel.toLowerCase().includes('bắt đầu') && value
                    ? `${tabLabel}: ${formatDateDisplayVN(value)}`
                    : (tabLabel || 'Hạn chót')}
                </span>
              </div>
            </div>

            {/* 2-Column Body: Quick Presets (Left) & Calendar Grid (Right) */}
            <div className="flex">
              {/* Left Column: Quick Presets */}
              <div className="w-56 shrink-0 border-r border-slate-200/80 dark:border-slate-800 p-3 flex flex-col justify-between bg-white dark:bg-slate-900">
                <div className="space-y-1">
                  {quickPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onChange?.(formatDateString(p.date));
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-left transition cursor-pointer group"
                    >
                      <span className="text-[13px] text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white font-medium">
                        {p.label}
                      </span>
                      <span className="text-xs text-slate-400 font-mono pl-2 shrink-0">
                        {p.sub}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-2.5 mt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      // notify info or toggle
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition cursor-pointer"
                  >
                    <span>Lặp lại định kỳ</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>

                  {value && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange?.('');
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs text-rose-600 dark:text-rose-400 transition cursor-pointer font-semibold"
                    >
                      <Trash2 size={13} />
                      <span>Xóa {tabLabel.toLowerCase()}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Month Calendar */}
              <div className="flex-1 p-4 bg-white dark:bg-slate-900 flex flex-col justify-between">
                <div>
                  {/* Month Navigator Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Tháng {viewDate.getMonth() + 1} năm {viewDate.getFullYear()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewDate(new Date())}
                        className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Hôm nay
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setViewDate(
                            new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Tháng trước"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setViewDate(
                            new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Tháng sau"
                      >
                        <ChevronDown size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Day of Week Header Row (Su Mo Tu We Th Fr Sa -> CN T2 T3 T4 T5 T6 T7) */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2 py-1 border-b border-slate-100 dark:border-slate-800/60">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
                      <div key={d} className="py-0.5">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* 42-cell Days Grid */}
                  <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
                    {calendarDays.map((item, idx) => {
                      const dStr = formatDateString(item.date);
                      const isToday = dStr === todayStr;
                      const isSelected = value && dStr === value;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            onChange?.(dStr);
                            setIsOpen(false);
                          }}
                          className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs transition cursor-pointer ${
                            isToday
                              ? 'bg-rose-500 text-white font-bold shadow-sm hover:bg-rose-600'
                              : isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-sm'
                              : item.isCurrentMonth
                              ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                              : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          {item.date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

