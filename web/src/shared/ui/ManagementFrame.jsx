import React from 'react';

/** Standard management screen: tabs/actions, filters, scrolling table, status. */
export default function ManagementFrame({ children, header, filters, status, className = '', scrollableContent = false }) {
  return (
    <div className={`flex flex-col h-full min-h-0 w-full overflow-hidden bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 select-text ${className}`}>
      {header && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 min-h-[38px] border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
          {header}
        </div>
      )}
      {filters && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 min-h-[42px] border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-900/40">
          {filters}
        </div>
      )}
      {header || filters || status ? (
        <div className={`flex flex-col flex-1 min-h-0 relative ${scrollableContent ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          {children}
        </div>
      ) : children}
      {status && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 h-8 min-h-[32px] py-0 text-xs bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0 text-slate-600 dark:text-slate-400 select-none">
          {status}
        </div>
      )}
    </div>
  );
}
