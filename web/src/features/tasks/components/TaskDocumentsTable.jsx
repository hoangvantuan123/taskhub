import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Archive,
  Download,
  Upload,
  Eye,
  Trash2,
  Folder,
  RotateCcw,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const TASK_DOCUMENT_CATEGORIES = [
  'Tất cả thư mục / Phân loại',
  '1. Hồ sơ thiết kế & Bản vẽ Kỹ thuật (CAD, ArtiosCAD, 3D)',
  '2. Quy trình chuẩn SOP & Tiêu chuẩn chất lượng (G7, ISO)',
  '3. Biên bản kiểm tra IQC / PQC / OQC & Nghiệm thu',
  '4. Kế hoạch sản xuất, Định mức BOM & Điều hành',
  '5. Báo cáo tiến độ & Bằng chứng kết quả hoàn thành',
];

export const DOCUMENT_COLUMNS = [
  { id: 'stt', label: 'STT', width: 55, pinned: true },
  { id: 'code', label: 'Mã tài liệu', width: 125, pinned: true },
  { id: 'name', label: 'Tên tệp tin & Tài liệu kỹ thuật', width: 340 },
  { id: 'category', label: 'Thư mục / Phân loại', width: 240 },
  { id: 'type', label: 'Định dạng', width: 100 },
  { id: 'version', label: 'Phiên bản', width: 95 },
  { id: 'size', label: 'Dung lượng', width: 105 },
  { id: 'owner', label: 'Người tải lên', width: 160 },
  { id: 'department', label: 'Phòng ban phụ trách', width: 180 },
  { id: 'updatedAt', label: 'Ngày cập nhật', width: 140 },
  { id: 'status', label: 'Trạng thái QA', width: 130 },
  { id: 'actions', label: 'Tác vụ', width: 110 },
];

export const INITIAL_TASK_DOCUMENTS = [
  {
    id: 'doc-1',
    code: 'DOC-CAD-2604',
    name: 'CAD-S26-Magnetic-Box-DieLine-Rev4.pdf',
    category: '1. Hồ sơ thiết kế & Bản vẽ Kỹ thuật (CAD, ArtiosCAD, 3D)',
    type: 'PDF',
    version: 'v4.0',
    size: '5.4 MB',
    owner: 'Đỗ Văn Hùng',
    department: 'Phòng R&D & Thiết kế Cấu trúc Bao bì',
    updatedAt: '2026-11-06 14:20',
    status: 'Đã duyệt QA',
    statusKey: 'approved',
  },
  {
    id: 'doc-2',
    code: 'DOC-DWG-002',
    name: 'Die-Structure-Magnet-Closure-3D.dwg',
    category: '1. Hồ sơ thiết kế & Bản vẽ Kỹ thuật (CAD, ArtiosCAD, 3D)',
    type: 'CAD',
    version: 'v2.1',
    size: '8.2 MB',
    owner: 'Đỗ Văn Hùng',
    department: 'Phòng R&D & Thiết kế Cấu trúc Bao bì',
    updatedAt: '2026-11-05 09:40',
    status: 'Đã duyệt QA',
    statusKey: 'approved',
  },
  {
    id: 'doc-3',
    code: 'DOC-SOP-001',
    name: 'SOP-OFFSET-G7-Color-Control-v3.2.pdf',
    category: '2. Quy trình chuẩn SOP & Tiêu chuẩn chất lượng (G7, ISO)',
    type: 'PDF',
    version: 'v3.2',
    size: '2.8 MB',
    owner: 'Hoàng Văn Tuấn',
    department: 'Phòng R&D & Thiết kế Cấu trúc Bao bì',
    updatedAt: '2026-11-04 16:10',
    status: 'Đã ban hành',
    statusKey: 'published',
  },
  {
    id: 'doc-4',
    code: 'DOC-STD-005',
    name: 'Tieu-Chuan-Do-Ben-Bao-Bi-ISTA-2A.pdf',
    category: '2. Quy trình chuẩn SOP & Tiêu chuẩn chất lượng (G7, ISO)',
    type: 'PDF',
    version: 'v1.0',
    size: '1.9 MB',
    owner: 'Lê Thị Hương Lan',
    department: 'Phòng Quản lý Chất lượng (QA/QC)',
    updatedAt: '2026-11-02 10:30',
    status: 'Đã ban hành',
    statusKey: 'published',
  },
  {
    id: 'doc-5',
    code: 'DOC-IQC-003',
    name: 'Bao-Cao-Do-Kiem-IQC-Giay-Kraft-My-Lot2604.xlsx',
    category: '3. Biên bản kiểm tra IQC / PQC / OQC & Nghiệm thu',
    type: 'XLSX',
    version: 'v1.0',
    size: '1.4 MB',
    owner: 'Ngô Tuyết Mai',
    department: 'Phòng Quản lý Chất lượng (QA/QC)',
    updatedAt: '2026-11-06 11:00',
    status: 'Đạt chuẩn IQC',
    statusKey: 'approved',
  },
  {
    id: 'doc-6',
    code: 'DOC-PQC-011',
    name: 'Bien-Ban-Thu-Mau-Plotter-Sample-Test.pdf',
    category: '3. Biên bản kiểm tra IQC / PQC / OQC & Nghiệm thu',
    type: 'PDF',
    version: 'v1.0',
    size: '1.1 MB',
    owner: 'Ngô Tuyết Mai',
    department: 'Phòng Quản lý Chất lượng (QA/QC)',
    updatedAt: '2026-11-06 15:45',
    status: 'Đạt chuẩn PQC',
    statusKey: 'approved',
  },
  {
    id: 'doc-7',
    code: 'DOC-BOM-102',
    name: 'Dinh-Muc-Tieu-Hao-BOM-Hop-S26-Chinh-Thuc.xlsx',
    category: '4. Kế hoạch sản xuất, Định mức BOM & Điều hành',
    type: 'XLSX',
    version: 'v2.0',
    size: '2.1 MB',
    owner: 'Nguyễn Đức Minh',
    department: 'Khối Sản xuất In Offset & Flexo',
    updatedAt: '2026-11-05 13:20',
    status: 'Đã duyệt định mức',
    statusKey: 'approved',
  },
];

// Helper to render file icon by extension/type
function getFileBadge(type) {
  const t = (type || '').toUpperCase();
  if (t === 'PDF') {
    return {
      icon: FileText,
      color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    };
  }
  if (t === 'XLSX' || t === 'XLS' || t === 'CSV') {
    return {
      icon: FileSpreadsheet,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    };
  }
  if (t === 'CAD' || t === 'DWG' || t === 'DXF') {
    return {
      icon: FileCode,
      color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    };
  }
  if (t === 'DOC' || t === 'DOCX') {
    return {
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    };
  }
  return {
    icon: Archive,
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  };
}

const TaskDocumentsTable = forwardRef(function TaskDocumentsTable(
  { taskId, task, documents: initialDocs = [], hideActions = false },
  ref
) {
  const [documents, setDocuments] = useState(() => {
    if (initialDocs && initialDocs.length > 0) {
      return initialDocs.map((d, idx) => ({
        id: d.id || `doc-${idx + 1}`,
        code: d.code || `DOC-${idx + 1}`,
        name: d.fileName || d.name || 'Tài liệu kỹ thuật',
        category: d.category || '1. Hồ sơ thiết kế & Bản vẽ Kỹ thuật (CAD, ArtiosCAD, 3D)',
        type: d.fileType || d.type || 'PDF',
        version: d.version || 'v1.0',
        size: d.fileSize || d.size || '2.0 MB',
        owner: d.uploaderName || d.owner || 'Cán bộ kỹ thuật',
        department: d.department || task?.department || 'Phòng R&D',
        updatedAt: d.updatedAt ? String(d.updatedAt).slice(0, 16) : '2026-11-06 14:00',
        status: d.status || 'Đã duyệt QA',
      }));
    }
    return INITIAL_TASK_DOCUMENTS;
  });

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả thư mục / Phân loại');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload modal states
  const [newFileName, setNewFileName] = useState('');
  const [newCategory, setNewCategory] = useState(TASK_DOCUMENT_CATEGORIES[1]);
  const [newFileType, setNewFileType] = useState('PDF');
  const [newVersion, setNewVersion] = useState('v1.0');

  // Trigger download file to computer
  const handleDownload = (doc) => {
    try {
      const dummyContent = `HỆ THỐNG QUẢN TRỊ TÁC NGHIỆP ETPMS - TÀI LIỆU KỸ THUẬT\n--------------------------------------------------\nTên tệp: ${doc.name}\nMã tài liệu: ${doc.code}\nThư mục: ${doc.category}\nPhiên bản: ${doc.version}\nDung lượng: ${doc.size}\nNgười tải: ${doc.owner}\nPhòng ban: ${doc.department}\nNgày tải: ${doc.updatedAt}\nNhiệm vụ liên kết: ${task?.code || taskId} - ${task?.title || ''}\n--------------------------------------------------\nNội dung hồ sơ kỹ thuật số đã được kiểm định bảo mật.`;
      const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify.success(`Đang tải xuống tệp tin: ${doc.name}`);
    } catch (e) {
      notify.error('Lỗi khi tải file: ' + e.message);
    }
  };

  // Download all as ZIP bundle
  const handleDownloadAll = () => {
    notify.success('Đang nén toàn bộ hồ sơ kỹ thuật...');
    setTimeout(() => {
      const dummyContent = `ETPMS BUNDLE ARCHIVE\nTask: ${task?.code || 'TSK'}\nTotal Files: ${documents.length}\nExported: ${new Date().toLocaleString('vi-VN')}`;
      const blob = new Blob([dummyContent], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HO_SO_TAI_LIEU_${task?.code || 'TSK'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify.success('Đã tải xuống gói hồ sơ tài liệu (.zip) thành công.');
    }, 600);
  };

  useImperativeHandle(ref, () => ({
    downloadAll: handleDownloadAll,
    openUploadModal: () => setShowUploadModal(true),
  }));

  // Upload submit
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      notify.error('Vui lòng nhập tên tệp tin tài liệu');
      return;
    }

    const createdDoc = {
      id: `doc-${Date.now()}`,
      code: `DOC-GS-${Math.floor(100 + Math.random() * 900)}`,
      name: newFileName.trim(),
      category: newCategory,
      type: newFileType,
      version: newVersion || 'v1.0',
      size: '2.4 MB',
      owner: 'Tôi (Cán bộ thực hiện)',
      department: task?.department || 'Phòng Kỹ thuật & R&D',
      updatedAt: new Date().toLocaleString('vi-VN'),
      status: 'Chờ duyệt QA',
      statusKey: 'pending',
    };

    setDocuments((prev) => [createdDoc, ...prev]);
    setShowUploadModal(false);
    setNewFileName('');
    notify.success(`Đã thêm tệp tin "${createdDoc.name}" vào bảng tài liệu.`);
  };

  // Filter
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (categoryFilter && categoryFilter !== 'Tất cả thư mục / Phân loại' && doc.category !== categoryFilter) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.code.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q) ||
          doc.owner.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, search, categoryFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  // Custom Cell Renderer for VirtualDataTable
  const renderCell = (col, row) => {
    if (col.id === 'stt') {
      const idx = pageItems.indexOf(row);
      return (
        <span className="font-mono text-xs text-slate-400 font-semibold text-center block w-full">
          {start + idx + 1}
        </span>
      );
    }

    if (col.id === 'code') {
      return (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
          {row.code}
        </span>
      );
    }

    if (col.id === 'name') {
      const badge = getFileBadge(row.type);
      const BadgeIcon = badge.icon;
      return (
        <div className="flex items-center gap-2 min-w-0 py-0.5">
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border ${badge.color}`}
            title={`Tệp ${row.type}`}
          >
            <BadgeIcon size={13} />
          </div>
          <span
            onClick={() => handleDownload(row)}
            className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer truncate"
            title={`Bấm để tải tệp tin: ${row.name}`}
          >
            {row.name}
          </span>
        </div>
      );
    }

    if (col.id === 'category') {
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <Folder size={13} className="text-amber-500 shrink-0" />
          <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
            {row.category}
          </span>
        </div>
      );
    }

    if (col.id === 'type') {
      return (
        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {row.type}
        </span>
      );
    }

    if (col.id === 'version') {
      return (
        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {row.version}
        </span>
      );
    }

    if (col.id === 'size') {
      return (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {row.size}
        </span>
      );
    }

    if (col.id === 'status') {
      const isApproved = String(row.status).includes('Đã') || String(row.status).includes('Đạt');
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
            isApproved
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
          }`}
        >
          {isApproved ? <CheckCircle2 size={11} /> : <Clock size={11} />}
          {row.status}
        </span>
      );
    }

    if (col.id === 'actions') {
      return (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(row);
            }}
            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
            title="Tải tệp tin về máy tính"
          >
            <Download size={12} /> Tải về
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white dark:bg-slate-950 overflow-hidden text-xs rounded-none">
      {/* 1. Standard Table Toolbar */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="w-56 sm:w-64">
            <SearchInput
              value={searchDraft}
              onChange={setSearchDraft}
              onSearch={() => {
                setSearch(searchDraft.trim());
                setPage(1);
              }}
              placeholder="Tìm tên tệp, mã tài liệu, người tải..."
            />
          </div>

          {/* Folder Category Select Filter */}
          <div className="w-64 sm:w-72">
            <Select
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
              }}
              options={TASK_DOCUMENT_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            />
          </div>

          {(search || categoryFilter !== 'Tất cả thư mục / Phân loại') && (
            <button
              type="button"
              onClick={() => {
                setSearchDraft('');
                setSearch('');
                setCategoryFilter('Tất cả thư mục / Phân loại');
                setPage(1);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {!hideActions && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={Download}
              onClick={handleDownloadAll}
              title="Đóng gói và tải toàn bộ hồ sơ (.zip)"
            >
              Tải toàn bộ (.zip)
            </Button>

            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={Upload}
              onClick={() => setShowUploadModal(true)}
            >
              Tải lên tài liệu
            </Button>
          </div>
        )}
      </div>

      {/* 2. Standard VirtualDataTable Canvas */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <VirtualDataTable
          columns={DOCUMENT_COLUMNS}
          rows={pageItems}
          renderCell={renderCell}
          onRowClick={(row) => handleDownload(row)}
          preferenceKey="etpms-task-documents-table"
          emptyText="Không có tài liệu nào phù hợp với bộ lọc."
        />
      </div>

      {/* 3. Standard TableStatusFooter */}
      <TableStatusFooter
        title="Hồ sơ tài liệu kỹ thuật"
        totalCount={total}
        unit="tệp tin"
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* 4. Modal Tải Lên Tài Liệu Mới */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Upload size={16} className="text-emerald-600" /> Tải lên tài liệu kỹ thuật mới
              </span>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Thư mục / Phân loại hồ sơ *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                >
                  {TASK_DOCUMENT_CATEGORIES.filter((c) => !c.startsWith('Tất cả')).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Tên tệp tin đính kèm *
                </label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Ví dụ: CAD-Khuon-Be-Hop-Samsung-v5.pdf"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Định dạng file
                  </label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="PDF">PDF (Tài liệu chuẩn)</option>
                    <option value="XLSX">Excel (XLSX / Bảng tính)</option>
                    <option value="CAD">CAD / DWG (Bản vẽ)</option>
                    <option value="DOCX">Word (DOCX / Soạn thảo)</option>
                    <option value="ZIP">ZIP (Lưu trữ nén)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Phiên bản (Version)
                  </label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="v1.0"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={Upload}>
                  Xác nhận tải lên bảng
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default TaskDocumentsTable;
