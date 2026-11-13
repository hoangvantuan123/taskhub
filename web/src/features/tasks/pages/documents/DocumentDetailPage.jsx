import React from 'react';
import {
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  RotateCcw,
  Share2,
} from 'lucide-react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import Button from '../../../../shared/ui/Button';
import { notify } from '../../../../shared/lib/notify';

export default function DocumentDetailPage({
  doc,
  onBack,
  onDeleted,
  onRestored,
}) {
  return (
    <ManagementFrame
      className="h-full"
      scrollableContent={false}
      header={
        <div className="flex flex-wrap items-center justify-between w-full gap-3 py-2">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              size="sm"
              variant="ghost"
              icon={ArrowLeft}
              onClick={onBack}
              title="Quay lại danh sách tài liệu"
            >
              Quay lại
            </Button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {doc.code || doc.id}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {doc.name}
                </h2>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Định dạng: {doc.type}</span>
                <span>·</span>
                <span>Dung lượng: {doc.size}</span>
                <span>·</span>
                <span>Dự án: {doc.project}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
            >
              Đóng
            </Button>
            {doc.status !== 'trash' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => {
                    notify.success(`Đã chuyển ${doc.name} vào thùng rác`);
                    if (onDeleted) onDeleted(doc.id);
                    onBack();
                  }}
                >
                  Xóa tài liệu
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={() => notify.info(`Đang tải tệp tin: ${doc.name}`)}
                >
                  Tải về tệp tin
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  notify.success(`Đã khôi phục tài liệu: ${doc.name}`);
                  if (onRestored) onRestored(doc.id);
                  onBack();
                }}
              >
                Khôi phục tài liệu
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* 2-Column Split Layout Edge-to-Edge */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950">
        {/* Left Column: Basic Information */}
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Thuộc tính hồ sơ tài liệu
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 first:pt-0">
                <span className="text-slate-400 block mb-1">Mã tài liệu:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{doc.code || doc.id}</span>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Định dạng & Dung lượng:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{doc.type} · {doc.size}</span>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Dự án liên kết:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{doc.project}</span>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Người tải lên / Sở hữu:</span>
                <strong className="text-slate-900 dark:text-white">{doc.owner}</strong>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Phạm vi chia sẻ:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{doc.sharedWith}</span>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Cập nhật lần cuối:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{doc.updatedAt}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Main Canvas */}
        <main className="flex flex-col min-w-0 min-h-0 overflow-y-auto p-4 lg:p-6 bg-white dark:bg-slate-950 space-y-6">
          {/* Tên tệp tin */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Tên tệp tin đính kèm
            </label>
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />
              {doc.name}
            </h3>
          </div>

          {/* Quy định phân quyền & Hướng dẫn sử dụng */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Quy định phân quyền & Hướng dẫn sử dụng
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800 rounded">
              Tài liệu này thuộc kho lưu trữ tiêu chuẩn kỹ thuật số hóa của Goldsun Packaging. Cán bộ công nhân viên được cấp quyền truy cập để tham chiếu quy trình sản xuất, công thức vật liệu màng ghép và báo cáo kiểm định chất lượng phòng Lab.
            </p>
          </div>
        </main>
      </div>
    </ManagementFrame>
  );
}
