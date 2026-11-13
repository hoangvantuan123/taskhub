import React from 'react';
import { X, Download, ExternalLink, Box, FileText, CheckCircle2 } from 'lucide-react';
import Button from '../../../shared/ui/Button';

export default function TaskImagePreviewModal({ media, onClose }) {
  if (!media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Box size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {media.title || 'Ảnh mẫu & Bản vẽ kỹ thuật bao bì'}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {media.category || 'Mẫu thiết kế bao bì Goldsun'} · {media.spec || 'Quy cách chuẩn'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-500 transition"
            >
              <ExternalLink size={13} />
              Mở tab mới
            </a>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Image Body */}
        <div className="flex-1 min-h-0 bg-slate-950/90 flex items-center justify-center p-4 overflow-auto">
          <img
            src={media.url}
            alt={media.title || 'Packaging sample'}
            className="max-h-[65vh] w-auto max-w-full object-contain rounded-md shadow-lg"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Quy cách: {media.spec || 'Tiêu chuẩn ISO 9001:2015 & BRCGS Packaging'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

