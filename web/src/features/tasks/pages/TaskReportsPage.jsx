import React from 'react';
import { useSearchParams } from 'react-router-dom';
import OverviewReportsPage from '../../analytics/reports/OverviewReportsPage';
import TaskReportsSubPage from '../../analytics/reports/TaskReportsSubPage';
import ProjectReportsPage from '../../analytics/reports/ProjectReportsPage';

export default function TaskReportsPage() {
  const [params] = useSearchParams();
  const tab = params.get('tab');

  if (tab === 'tasks') return <TaskReportsSubPage />;
  if (tab === 'projects') return <ProjectReportsPage />;
  return <OverviewReportsPage />;
}
