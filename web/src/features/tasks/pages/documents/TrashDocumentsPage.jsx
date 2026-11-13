import React, { useState, useMemo } from 'react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../../shared/ui/TableStatusFooter';
import Tabs from '../../../../shared/ui/Tabs';
import Button from '../../../../shared/ui/Button';
import SearchInput from '../../../../shared/ui/SearchInput';
import { notify } from '../../../../shared/lib/notify';
import { INITIAL_DOCUMENTS, DOCUMENT_COLUMNS } from './documentsData';
import DocumentDetailPage from './DocumentDetailPage';
import {
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';

export default function TrashDocumentsPage() {
  const [documents, setDocuments] = useState(
    INITIAL_DOCUMENTS.filter(d => d.status === 'trash')
  );
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (search) {
        const q = search.toLowerCase();
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.code.toLowerCase().includes(q) ||
          doc.project.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, search]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const renderCell = (column, row) => {
    if (column.id === 'code') {
      return (
        <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
          {row.code}
        </span>
      );
    }
    if (column.id === 'name') {
      return (
        <span className="font-medium text-slate-900 dark:text-white line-through decoration-slate-400">
          {row.name}
        </span>
      );
    }
    if (column.id === 'status') {
      return 'Trong thùng rác';
    }
    return String(row[column.id] || '—');
  };

  if (selectedDoc) {
    return (
      <DocumentDetailPage
        doc={selectedDoc}
        onBack={() => setSelectedDoc(null)}
        onDeleted={(id) => {
          setDocuments(prev => prev.filter(d => d.id !== id));
        }}
        onRestored={(id) => {
          setDocuments(prev => prev.filter(d => d.id !== id));
        }}
      />
    );
  }

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'trash-documents', label: 'Thùng rác tài liệu' }]}
            activeTab="trash-documents"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            {documents.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon={Trash2}
                className="text-rose-600 hover:text-rose-700"
                onClick={() => {
                  setDocuments([]);
                  notify.success('Đã dọn sạch thùng rác vĩnh viễn');
                }}
              >
                Dọn sạch thùng rác
              </Button>
            )}
          </div>
        </>
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-64 max-w-full">
            <SearchInput
              size="sm"
              value={searchDraft}
              onChange={(e) => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
              onClear={() => {
                setSearchDraft('');
                setSearch('');
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplySearch();
                }
              }}
              placeholder="Tìm tài liệu đã xóa…"
            />
          </div>

          <button
            type="button"
            title="Tìm kiếm"
            aria-label="Tìm kiếm"
            onClick={handleApplySearch}
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Search size={15} />
          </button>

          {search && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Xóa bộ lọc"
              aria-label="Xóa bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      }
      status={
        <TableStatusFooter
          title="Thùng rác tài liệu"
          totalCount={total}
          unit="tài liệu"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <VirtualDataTable
        columns={DOCUMENT_COLUMNS}
        rows={pageItems}
        onOpen={(row) => setSelectedDoc(row)}
        onRowClick={(row) => setSelectedDoc(row)}
        renderCell={renderCell}
        emptyText="Thùng rác đang trống."
      />
    </ManagementFrame>
  );
}
