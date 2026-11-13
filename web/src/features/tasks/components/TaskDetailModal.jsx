import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import Badge from '../../../shared/ui/Badge';
import {
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  Calendar,
  CheckSquare,
  Square,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Building2,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { taskService } from '../services/taskService';

const WORKFLOW_STEPS = [
  { id: 'backlog', label: '1. Backlog (Mới)', color: 'slate' },
  { id: 'todo', label: '2. To Do (Đã giao)', color: 'blue' },
  { id: 'in_progress', label: '3. In Progress (Đang làm)', color: 'amber' },
  { id: 'in_review', label: '4. In Review (Chờ duyệt)', color: 'purple' },
  { id: 'done', label: '5. Done (Hoàn tất)', color: 'emerald' },
];

export default function TaskDetailModal({ taskId, open, onClose, onTaskUpdated }) {
  const [taskDetail, setTaskDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' | 'checklist' | 'progress' | 'comments'

  // Progress report state
  const [progressVal, setProgressVal] = useState(50);
  const [progressNote, setProgressNote] = useState('');
  const [reportingProgress, setReportingProgress] = useState(false);

  // Approval state
  const [approvalDecisionNote, setApprovalDecisionNote] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);

  // Checklist state
  const [newChecklistText, setNewChecklistText] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');

  const loadDetail = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await taskService.getTaskDetail(id);
      setTaskDetail(data);
      if (data?.task) {
        setProgressVal(data.task.progress || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && taskId) {
      loadDetail(taskId);
    }
  }, [open, taskId]);

  if (!open || !taskId) return null;

  const task = taskDetail?.task;

  // Handle workflow step transition
  const handleTransition = async (newStatus) => {
    await taskService.updateTaskStatus(task.id, newStatus);
    await loadDetail(task.id);
    onTaskUpdated?.();
  };

  // Submit Progress Report
  const handleReportProgress = async (e) => {
    e.preventDefault();
    if (!progressNote.trim()) return;
    setReportingProgress(true);
    try {
      await taskService.reportProgress({
        taskId: task.id,
        progress: Number(progressVal),
        content: progressNote.trim(),
      });
      setProgressNote('');
      await loadDetail(task.id);
      onTaskUpdated?.();
    } finally {
      setReportingProgress(false);
    }
  };

  // Submit Checklist
  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    await taskService.addChecklistItem(task.id, newChecklistText.trim());
    setNewChecklistText('');
    await loadDetail(task.id);
    onTaskUpdated?.();
  };

  const handleToggleChecklist = async (item) => {
    await taskService.toggleChecklistItem(item.id, !item.isCompleted);
    await loadDetail(task.id);
    onTaskUpdated?.();
  };

  // Process Supervisor Approval
  const handleApprove = async () => {
    setProcessingApproval(true);
    try {
      const pendingReq = taskDetail?.approvalRequests?.find((r) => r.status === 'pending');
      if (pendingReq) {
        await taskService.processApproval({
          requestId: pendingReq.id,
          decision: 'approve',
          approvalNote: approvalDecisionNote || 'Đạt tiêu chuẩn nghiệm thu.',
        });
      } else {
        await taskService.updateTaskStatus(task.id, 'done');
      }
      setApprovalDecisionNote('');
      await loadDetail(task.id);
      onTaskUpdated?.();
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleReject = async () => {
    setProcessingApproval(true);
    try {
      const pendingReq = taskDetail?.approvalRequests?.find((r) => r.status === 'pending');
      if (pendingReq) {
        await taskService.processApproval({
          requestId: pendingReq.id,
          decision: 'reject',
          approvalNote: approvalDecisionNote || 'Chưa đạt yêu cầu, cần bổ sung chỉnh sửa.',
        });
      } else {
        await taskService.updateTaskStatus(task.id, 'in_progress');
      }
      setApprovalDecisionNote('');
      await loadDetail(task.id);
      onTaskUpdated?.();
    } finally {
      setProcessingApproval(false);
    }
  };

  const currentStepIdx = WORKFLOW_STEPS.findIndex(
    (s) => s.id === task?.status || (task?.status === 'completed' && s.id === 'done') || (task?.status === 'review' && s.id === 'in_review')
  );

  const completedChecklistCount = taskDetail?.checklist?.filter((c) => c.isCompleted).length || 0;
  const totalChecklistCount = taskDetail?.checklist?.length || 0;
  const checklistPercent = totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Chi tiết & Quy trình công việc: ${task?.code || ''}`}
      maxWidth="900px"
    >
      {loading || !task ? (
        <div className="p-8 text-center text-slate-500 text-xs">Đang tải chi tiết công việc...</div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* HEADER SUMMARY CARD */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    {task.code}
                  </span>
                  <Badge variant={task.delegationLevel === 'company' ? 'red' : 'primary'}>
                    {task.delegationLevel === 'company'
                      ? 'Cấp Ban Giám Đốc'
                      : task.delegationLevel === 'project'
                      ? 'Cấp Dự Án'
                      : task.delegationLevel === 'team'
                      ? 'Cấp Tổ / Nhóm'
                      : 'Cấp Phòng Ban'}
                  </Badge>
                  <span className="text-slate-400">·</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Phòng {task.department || 'Chung'}
                  </span>
                  {task.projectName && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        Dự án: {task.projectName}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{task.title}</h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    task.priority === 'urgent'
                      ? 'red'
                      : task.priority === 'high'
                      ? 'amber'
                      : 'info'
                  }
                  size="sm"
                >
                  Ưu tiên:{' '}
                  {task.priority === 'urgent'
                    ? 'Khẩn cấp'
                    : task.priority === 'high'
                    ? 'Cao'
                    : 'Bình thường'}
                </Badge>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400">Tiến độ hiện tại</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {task.progress}%
                  </span>
                </div>
              </div>
            </div>

            {/* Target Deliverable Banner */}
            {task.target && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2">
                <FileCheck2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Mục tiêu & Tiêu chuẩn nghiệm thu
                  </strong>
                  <span>{task.target}</span>
                </div>
              </div>
            )}

            {/* Responsibilities Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block">Người phụ trách chính:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {task.assigneeName || 'Chưa gán'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Cấp trên phê duyệt:</span>
                <strong className="text-purple-700 dark:text-purple-300">
                  {task.supervisorName || 'Quản lý phòng ban'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Thời hạn hoàn thành:</span>
                <strong className="text-rose-600 dark:text-rose-400">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Ước tính giờ công:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {task.estimatedHours || 0} giờ
                </strong>
              </div>
            </div>
          </div>

          {/* WORKFLOW STEPPER BAR (5 CỘT QUY TRÌNH DOANH NGHIỆP) */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Quy trình xử lý công việc (Workflow Lifecycle)
              </span>
              <span className="text-slate-400 text-[11px]">
                Bước {currentStepIdx + 1}/5: <strong>{WORKFLOW_STEPS[currentStepIdx]?.label || task.status}</strong>
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isCurrent = idx === currentStepIdx;
                const isPassed = idx < currentStepIdx;
                return (
                  <div
                    key={step.id}
                    className={`py-1.5 px-2 rounded-lg text-center text-[10px] font-bold border transition ${
                      isCurrent
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : isPassed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {step.label}
                  </div>
                );
              })}
            </div>

            {/* Quick Action Buttons for Transitions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 text-[11px]">Thao tác chuyển bước:</span>
              <div className="flex items-center gap-2">
                {task.status === 'backlog' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleTransition('todo')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Tiếp nhận & Lên kế hoạch (To Do) →
                  </Button>
                )}
                {task.status === 'todo' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleTransition('in_progress')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  >
                    Bắt đầu thực hiện (In Progress) →
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleTransition('in_review')}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
                  >
                    <Send size={13} className="mr-1" />
                    Gửi Cấp trên duyệt nghiệm thu (In Review) →
                  </Button>
                )}
                {(task.status === 'in_review' || task.status === 'review') && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReject}
                      disabled={processingApproval}
                      className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-800"
                    >
                      Từ chối / Yêu cầu làm lại
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleApprove}
                      disabled={processingApproval}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      Duyệt nghiệm thu hoàn thành (Done)
                    </Button>
                  </div>
                )}
                {(task.status === 'done' || task.status === 'completed') && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={16} /> Đã nghiệm thu & Hoàn tất
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* TAB NAVIGATION FOR INNER PROCEDURES */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <button
              onClick={() => setActiveTab('workflow')}
              className={`pb-2 font-bold text-xs border-b-2 transition ${
                activeTab === 'workflow'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              1. Báo cáo & Phản hồi tiến độ ({taskDetail.progressLogs?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`pb-2 font-bold text-xs border-b-2 transition ${
                activeTab === 'checklist'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              2. Hạng mục con (Checklist {completedChecklistCount}/{totalChecklistCount})
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`pb-2 font-bold text-xs border-b-2 transition ${
                activeTab === 'approval'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              3. Phê duyệt & Nghiệm thu ({taskDetail.approvalRequests?.length || 0})
            </button>
          </div>

          {/* TAB 1: BÁO CÁO TIẾN ĐỘ & PHẢN HỒI CẤP TRÊN */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              {/* Form submit progress */}
              <form
                onSubmit={handleReportProgress}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <TrendingUp size={15} className="text-emerald-600" />
                    Cập nhật tiến độ & Báo cáo kết quả
                  </span>
                  <span className="text-emerald-600 font-bold">{progressVal}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressVal}
                    onChange={(e) => setProgressVal(Number(e.target.value))}
                    className="flex-1 accent-emerald-600"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={progressVal}
                    onChange={(e) => setProgressVal(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold text-xs"
                  />
                  <span>%</span>
                </div>

                <textarea
                  rows={2}
                  required
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="Mô tả kết quả công việc đã thực hiện trong kỳ, số liệu nghiệm thu, khó khăn (nếu có)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:border-emerald-500"
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={reportingProgress}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    {reportingProgress ? 'Đang lưu...' : 'Gửi báo cáo tiến độ'}
                  </Button>
                </div>
              </form>

              {/* Timeline of progress reports */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                  Nhật ký tiến độ & Chỉ đạo của Cấp trên
                </span>

                {taskDetail.progressLogs?.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-4">
                    Chưa có báo cáo tiến độ nào được ghi nhận.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {taskDetail.progressLogs?.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {log.reporterName || 'Nhân sự thực hiện'}
                          </span>
                          <span className="text-slate-400">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                            Tiến độ: {log.previousProgress}% → {log.currentProgress}%
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-xs">{log.content}</p>

                        {/* Supervisor feedback display */}
                        {log.supervisorFeedback ? (
                          <div className="mt-2 p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300 text-[11px]">
                            <strong>Chỉ đạo của Cấp trên:</strong> {log.supervisorFeedback}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HẠNG MỤC CON (CHECKLIST) */}
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  Tiến độ hoàn thành checklist: <strong>{checklistPercent}%</strong>
                </span>
                <span className="text-slate-400 text-[11px]">
                  {completedChecklistCount} / {totalChecklistCount} hoàn tất
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {taskDetail.checklist?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      item.isCompleted
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-slate-500 line-through'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.isCompleted ? (
                        <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-400 shrink-0" />
                      )}
                      <span className="font-medium">{item.title}</span>
                    </div>
                    {item.isCompleted && (
                      <span className="text-[10px] text-emerald-600 font-medium">Hoàn thành</span>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Thêm hạng mục con kiểm tra..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                />
                <Button type="submit" size="sm" variant="outline">
                  <Plus size={14} className="mr-1" /> Thêm mục
                </Button>
              </form>
            </div>
          )}

          {/* TAB 3: PHÊ DUYỆT & NGHIỆM THU */}
          {activeTab === 'approval' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                    <ShieldCheck size={16} /> Quy trình nghiệm thu cấp trên
                  </h4>
                  <Badge variant="purple">Cấp có thẩm quyền</Badge>
                </div>
                <p className="text-purple-800 dark:text-purple-300 text-[11px]">
                  Cấp trên đánh giá kết quả công việc dựa trên tiêu chuẩn đã đề ra. Nếu đạt, công việc sẽ chuyển sang trạng thái <strong>Done</strong>. Nếu chưa đạt, trả về <strong>In Progress</strong> kèm hướng dẫn chỉnh sửa.
                </p>

                <textarea
                  rows={2}
                  value={approvalDecisionNote}
                  onChange={(e) => setApprovalDecisionNote(e.target.value)}
                  placeholder="Nhập nhận xét đánh giá nghiệm thu hoặc lý do yêu cầu làm lại..."
                  className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-purple-500"
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReject}
                    disabled={processingApproval}
                    className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-800 text-xs font-semibold"
                  >
                    Yêu cầu làm lại (Reject)
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleApprove}
                    disabled={processingApproval}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    <CheckCircle2 size={14} className="mr-1" />
                    Duyệt nghiệm thu (Approve)
                  </Button>
                </div>
              </div>

              {/* Approval history */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                  Lịch sử yêu cầu phê duyệt
                </span>
                {taskDetail.approvalRequests?.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span>
                        Người gửi: <strong>{req.requesterName}</strong>
                      </span>
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'success'
                            : req.status === 'rejected'
                            ? 'red'
                            : 'amber'
                        }
                      >
                        {req.status === 'approved'
                          ? 'Đã duyệt đạt'
                          : req.status === 'rejected'
                          ? 'Đã từ chối'
                          : 'Đang chờ duyệt'}
                      </Badge>
                    </div>
                    {req.requestNote && (
                      <p className="text-slate-600 dark:text-slate-400 italic">
                        "{req.requestNote}"
                      </p>
                    )}
                    {req.approvalNote && (
                      <p className="text-purple-700 dark:text-purple-400 font-medium">
                        Phản hồi cấp trên: {req.approvalNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

