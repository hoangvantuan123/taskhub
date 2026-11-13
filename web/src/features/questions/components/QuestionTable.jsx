import React from 'react';
import { formatDate } from '../../../shared/lib/formatters';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';

export const getFieldText = (column, row) => {
    const field = column.id;
    if (field === 'updatedAt') return row.updatedAt ? formatDate(row.updatedAt) : '—';
    if (field === 'topic') return row.topicName || 'Chung';
    if (field === 'level') return row.levelName || row.level || 'Chung';
    if (field === 'targetGroup') return row.targetGroupName || '—';
    if (field === 'difficulty') return row.difficultyLabel || '—';
    if (field === 'format' && row.formatLabel) return row.formatLabel;
    if (field === 'isCritical') return row.isCritical ? 'Điểm liệt' : '—';
    if (field === 'status') return ({ published: 'Đã xuất bản', draft: 'Bản nháp', pending_review: 'Chờ duyệt' })[row.status] || row.status;
    if (field === 'format') return ({ simulation_hmi: 'Mô phỏng HMI', case_study: 'Tình huống', essay: 'Tự luận', critical_safety: 'An toàn' })[row.format] || 'Trắc nghiệm';
    return String(row[field] ?? '—');
  };

export default function QuestionTable(props) {
  return <VirtualDataTable {...props} formatCell={props.formatCell || getFieldText} />;
}
