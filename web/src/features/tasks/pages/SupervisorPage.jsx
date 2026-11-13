import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PendingApprovalsPage from './approvals/PendingApprovalsPage';
import MyApprovalRequestsPage from './approvals/MyApprovalRequestsPage';
import ApprovalHistoryPage from './approvals/ApprovalHistoryPage';

export default function SupervisorPage() {
  const [params] = useSearchParams();
  const tab = params.get('tab');

  if (tab === 'my_requests' || tab === 'my-requests') return <MyApprovalRequestsPage />;
  if (tab === 'history') return <ApprovalHistoryPage />;
  return <PendingApprovalsPage />;
}
