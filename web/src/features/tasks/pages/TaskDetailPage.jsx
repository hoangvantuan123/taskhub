import React from 'react';
import { useParams } from 'react-router-dom';
import CreateTaskPage from './CreateTaskPage';

/**
 * TaskDetailPage - Workspace Xem chi tiết & Nghiệm thu công việc
 * Đồng bộ 100% quy chuẩn giao diện và luồng tương tác với CreateTaskPage (/app/tasks/new)
 */
export default function TaskDetailPage({ taskId: propTaskId, onBack, onTaskUpdated }) {
  const { seq } = useParams();
  const taskId = propTaskId || seq;

  return (
    <CreateTaskPage
      taskId={taskId}
      mode="edit"
      onBack={onBack}
      onSuccess={onTaskUpdated}
    />
  );
}
