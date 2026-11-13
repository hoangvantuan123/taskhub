import React, { useState, useEffect, useMemo } from 'react';
import ManagementFrame from '../../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../../shared/ui/TableStatusFooter';
import Tabs from '../../../../shared/ui/Tabs';
import Button from '../../../../shared/ui/Button';
import SearchInput from '../../../../shared/ui/SearchInput';
import Select from '../../../../shared/ui/Select';
import { notify } from '../../../../shared/lib/notify';
import { taskService } from '../../services/taskService';
import { INITIAL_DOCUMENTS, DOCUMENT_COLUMNS } from './documentsData';
import DocumentDetailPage from './DocumentDetailPage';
import {
  Upload,
  FolderPlus,
  Search,
  RotateCcw,
} from 'lucide-react';

export default function AllDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const list = await taskService.listDocuments();
      if (Array.isArray(list) && list.length > 0) {
        setDocuments(list.filter(d => d.status !== 'trash'));
      } else {
        setDocuments(INITIAL_DOCUMENTS.filter(d => d.status !== 'trash'));
      }
    } catch {
      setDocuments(INITIAL_DOCUMENTS.filter(d => d.status !== 'trash'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleApplySearch = () => {
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setTypeFilter('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (typeFilter && doc.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.code.toLowerCase().includes(q) ||
          doc.project.toLowerCase().includes(q) ||
          doc.owner.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, search, typeFilter]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const renderCell = (column, row) => {
    if (column.id === 'code') {
      return (
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {row.code}
        </span>
      );
    }
    if (column.id === 'name') {
      return (
        <span className="font-medium text-slate-900 dark:text-white">
          {row.name}
        </span>
      );
    }
    if (column.id === 'status') {
      return row.status === 'active' ? 'Đang lưu trữ' : 'Đã xóa tạm';
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
      />
    );
  }

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[{ id: 'all-documents', label: 'Tất cả tài liệu' }]}
            activeTab="all-documents"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={FolderPlus}
              onClick={() => notify.info('Mở hộp thoại tạo thư mục phân loại tài liệu')}
            >
              Tạo thư mục
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={() => notify.info('Mở hộp thoại tải lên tài liệu mới')}
            >
              Tải lên tài liệu
            </Button>
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
              placeholder="Tìm tên tài liệu, mã số, dự án…"
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

          <Select
            size="sm"
            className="w-40 font-medium text-xs"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e?.target?.value ?? e);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả định dạng' },
              { value: 'PDF', label: 'Tài liệu PDF' },
              { value: 'DOCX', label: 'Văn bản Word' },
              { value: 'XLSX', label: 'Bảng tính Excel' },
              { value: 'MD', label: 'Tài liệu Markdown (MD)' },
            ]}
          />

          {(search || typeFilter) && (
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
          title="Kho tài liệu"
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
        emptyText="Không có tài liệu nào trong kho."
      />
    </ManagementFrame>
  );
}
