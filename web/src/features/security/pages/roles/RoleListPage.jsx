import React from 'react';
import PermissionGroupsPage from '../../components/PermissionGroupsPage';

export default function RoleListPage() {
  return (
    <PermissionGroupsPage
      tabs={[{ id: 'groups', label: 'Danh sách vai trò & Nhóm quyền' }]}
      onTabChange={() => {}}
      initialView="groups"
    />
  );
}

