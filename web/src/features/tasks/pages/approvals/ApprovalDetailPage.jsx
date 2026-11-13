import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Check,
} from 'lucide-react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import Button from '../../../../shared/ui/Button';
import { notify } from '../../../../shared/lib/notify';

export default function ApprovalDetailPage({
  approval,
  onBack,
  onProcessed,
}) {
  const [decisionType, setDecisionType] = useState('approved');
  const [decisionNote, setDecisionNote] = useState('Nghiệm thu đạt yêu cầu tiêu chuẩn kỹ thuật.');
  const [submitting, setSubmitting] = useState(false);

  const handleProcess = (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      if (decisionType === 'approved') {
        notify.success(`Đã phê duyệt hoàn thành yêu cầu: ${approval.code}`);
      } else {
        notify.warning(`Đã từ chối yêu cầu: ${approval.code}`);
      }
      if (onProcessed) onProcessed(approval.id, decisionType, decisionNote);
      onBack();
    } finally {
      setSubmitting(false);
    }
  };

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
              disabled={submitting}
              onClick={onBack}
              title="Quay lại danh sách yêu cầu"
            >
              Quay lại
            </Button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {approval.code}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  Thẩm định & Phê duyệt nghiệm thu công việc
                </h2>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Người đệ trình: <strong>{approval.requester}</strong> ({approval.department})</span>
                <span>·</span>
                <span>Dự án: {approval.projectName}</span>
                <span>·</span>
                <span className="font-mono uppercase font-bold text-emerald-600">
                  {approval.status === 'pending' ? 'Chờ duyệt' : approval.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={onBack}
            >
              Hủy
            </Button>
            {approval.status === 'pending' && (
              <Button
                variant={decisionType === 'approved' ? 'primary' : 'outline'}
                size="sm"
                icon={Check}
                disabled={submitting}
                className={decisionType === 'rejected' ? 'text-rose-600 border-rose-300' : ''}
                onClick={handleProcess}
              >
                {decisionType === 'approved' ? 'Xác nhận Phê duyệt' : 'Xác nhận Từ chối'}
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
              Thông tin đệ trình
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 first:pt-0">
                <span className="text-slate-400 block mb-1">Mã yêu cầu duyệt:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{approval.code}</span>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Trạng thái:</span>
                <span className="font-semibold text-emerald-600 uppercase">
                  {approval.status === 'pending' ? 'Chờ phê duyệt' : approval.status === 'approved' ? 'Đã phê duyệt' : 'Từ chối'}
                </span>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Người đệ trình:</span>
                <strong className="text-slate-900 dark:text-white text-sm">{approval.requester}</strong>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Phòng ban công tác:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{approval.department}</span>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Dự án liên quan:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{approval.projectName}</span>
              </div>

              <div className="py-2.5">
                <span className="text-slate-400 block mb-1">Thời gian gửi duyệt:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{approval.requestedAt}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Main Canvas */}
        <main className="flex flex-col min-w-0 min-h-0 overflow-y-auto p-4 lg:p-6 bg-white dark:bg-slate-950 space-y-6">
          {/* Tên nhiệm vụ */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Tên công việc / Nhiệm vụ nghiệm thu
            </label>
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
              {approval.taskTitle}
            </h3>
          </div>

          {/* Báo cáo kết quả của người làm */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Báo cáo kết quả nghiệm thu từ người thực hiện
            </label>
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
              {approval.note}
            </div>
          </div>

          {/* Quyết định phê duyệt */}
          {approval.status === 'pending' ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                Thẩm định & Quyết định của Cấp Quản lý
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-2">
                    Lựa chọn kết quả phê duyệt *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDecisionType('approved');
                        setDecisionNote('Nghiệm thu đạt yêu cầu tiêu chuẩn kỹ thuật.');
                      }}
                      className={`p-3 border rounded text-left transition-all cursor-pointer ${
                        decisionType === 'approved'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={16} />
                        Đạt chuẩn & Phê duyệt
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Xác nhận công việc hoàn thành đạt chất lượng kỹ thuật, chuyển trạng thái nhiệm vụ sang Done.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDecisionType('rejected');
                        setDecisionNote('Chưa đạt chỉ tiêu chất lượng, yêu cầu kiểm tra và thực hiện lại.');
                      }}
                      className={`p-3 border rounded text-left transition-all cursor-pointer ${
                        decisionType === 'rejected'
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
                        <XCircle size={16} />
                        Từ chối / Yêu cầu làm lại
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Yêu cầu nhân sự phụ trách hiệu chỉnh lại các sai sót kỹ thuật và đệ trình duyệt lại.
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">
                    Ý kiến nhận xét & Chỉ đạo bổ sung
                  </label>
                  <textarea
                    rows={3}
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Nhập ghi chú thẩm định, lưu ý cho các đợt kiểm tra tiếp theo..."
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                Kết quả thẩm định đã ghi nhận
              </h3>
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/50 text-xs space-y-2">
                <div>
                  Người phê duyệt: <strong>{approval.approver || 'Cấp Quản lý'}</strong>
                </div>
                <div>
                  Ngày xử lý: <strong>{approval.approvedAt || '—'}</strong>
                </div>
                <div>
                  Nội dung nhận xét: <p className="italic text-slate-700 dark:text-slate-300 mt-1">{approval.approvalNote || 'Đã xử lý'}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ManagementFrame>
  );
}
