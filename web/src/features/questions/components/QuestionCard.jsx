import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';

export default function QuestionCard({ question, onPreview }) {
  const status = question.status === 'published'
    ? { label: 'Đã xuất bản', icon: CheckCircle2, tone: 'text-emerald-700 dark:text-emerald-400' }
    : question.status === 'pending_review'
      ? { label: 'Chờ duyệt', icon: Clock, tone: 'text-amber-700 dark:text-amber-400' }
      : { label: 'Bản nháp', icon: null, tone: 'text-slate-500 dark:text-slate-400' };
  const StatusIcon = status.icon;

  return (
    <article
      role={onPreview ? 'button' : undefined}
      tabIndex={onPreview ? 0 : undefined}
      onClick={() => onPreview?.(question)}
      onKeyDown={(event) => {
        if (onPreview && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onPreview(question);
        }
      }}
      className="flex min-w-0 items-center gap-3 border-y border-slate-200 dark:border-slate-800 -mt-px py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className={`inline-flex items-center gap-1 ${status.tone}`}>
            {StatusIcon && <StatusIcon size={12} />}{status.label}
          </span>
          <span className="inline-flex items-center gap-1"><Layers size={12} />{question.levelName || question.level || 'Cấp độ'}</span>
          <span>{question.formatLabel || (question.type === 'single_choice' ? 'Trắc nghiệm' : 'Tự luận')}</span>
          {question.isCritical && <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold"><AlertTriangle size={12} />Điểm liệt</span>}
          {question.imageUrl && <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">🖼️ Có hình ảnh</span>}
          {question.type === 'essay' && <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">🔢 Nhập số / Tự luận</span>}
          {question.subjectName && <span>{question.subjectName}</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
          {question.content || 'Chưa có nội dung câu hỏi'}
        </p>
      </div>
    </article>
  );
}
