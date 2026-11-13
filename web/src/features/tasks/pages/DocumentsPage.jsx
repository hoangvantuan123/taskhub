import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AllDocumentsPage from './documents/AllDocumentsPage';
import MyDocumentsPage from './documents/MyDocumentsPage';
import SharedDocumentsPage from './documents/SharedDocumentsPage';
import TrashDocumentsPage from './documents/TrashDocumentsPage';

export default function DocumentsPage() {
  const [params] = useSearchParams();
  const tab = params.get('tab');

  if (tab === 'my') return <MyDocumentsPage />;
  if (tab === 'shared') return <SharedDocumentsPage />;
  if (tab === 'trash') return <TrashDocumentsPage />;
  return <AllDocumentsPage />;
}
