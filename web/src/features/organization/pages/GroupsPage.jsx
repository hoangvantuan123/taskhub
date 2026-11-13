import React from 'react';
import { useSearchParams } from 'react-router-dom';
import TeamListPage from './teams/TeamListPage';
import MyTeamsPage from './teams/MyTeamsPage';
import TeamMembersPage from './teams/TeamMembersPage';

export default function GroupsPage() {
  const [params] = useSearchParams();
  const filter = params.get('filter');

  if (filter === 'my') return <MyTeamsPage />;
  if (filter === 'members') return <TeamMembersPage />;
  return <TeamListPage />;
}
