import React, { useState } from 'react';
import { Network, ZoomIn, ZoomOut, RotateCcw, Building2, Users } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Tabs from '../../../shared/ui/Tabs';
import { notify } from '../../../shared/lib/notify';

const ORG_TREE = {
  id: 'HDQT',
  name: 'Hội đồng Quản trị',
  head: 'Nguyễn Văn Chủ Tịch',
  role: 'Cấp quản trị cao nhất',
  count: 5,
  children: [
    {
      id: 'BGD',
      name: 'Ban Tổng Giám Đốc',
      head: 'Nguyễn Văn Hoàng',
      role: 'Tổng Giám Đốc điều hành',
      count: 4,
      children: [
        {
          id: 'TECH',
          name: 'Phòng Kỹ thuật & R&D',
          head: 'Trần Văn Kỹ Sư (Trưởng phòng)',
          role: 'Nghiên cứu & Thiết kế',
          count: 22,
          children: [
            { id: 'TECH_LAB', name: 'Phòng Thí nghiệm LAB', head: 'Lê LAB', count: 6 },
            { id: 'TECH_DES', name: 'Tổ Thiết kế Mẫu in', head: 'Phạm Design', count: 8 },
          ],
        },
        {
          id: 'PROD',
          name: 'Khối Sản xuất & Nhà máy Hưng Yên',
          head: 'Lê Văn Quản Lý (Giám đốc NM)',
          role: 'Vận hành 4 dây chuyền in & ghép',
          count: 140,
          children: [
            { id: 'PROD_PRINT', name: 'Xưởng In ống đồng', head: 'Bùi Quản Đốc', count: 65 },
            { id: 'PROD_LAM', name: 'Xưởng Ghép đùn & Chia cuộn', head: 'Vũ Quản Đốc', count: 50 },
            { id: 'PROD_QC', name: 'Phòng Quản lý chất lượng (QC/KCS)', head: 'Hoàng KCS', count: 15 },
          ],
        },
        {
          id: 'SALES',
          name: 'Phòng Kinh doanh & Dự án',
          head: 'Phạm Thị Trưởng Phòng',
          role: 'Kinh doanh nội địa & Xuất khẩu',
          count: 16,
        },
        {
          id: 'HR',
          name: 'Phòng Hành chính - Nhân sự',
          head: 'Đỗ Thị Nhân Sự',
          role: 'Nhân sự & Pháp chế',
          count: 8,
        },
      ],
    },
  ],
};

function OrgNode({ node, level = 0 }) {
  const isRoot = level === 0;
  const isBGD = level === 1;

  return (
    <div className="flex flex-col items-center">
      {/* NODE CARD */}
      <div
        className={`px-4 py-3 rounded-lg border transition-shadow shadow-sm flex flex-col items-center text-center min-w-[220px] max-w-[280px] ${
          isRoot
            ? 'bg-emerald-700 text-white border-emerald-800'
            : isBGD
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-100'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
        }`}
      >
        <div className={`text-xs font-semibold ${isRoot ? 'text-white' : 'text-emerald-800 dark:text-emerald-400'}`}>
          {node.name}
        </div>
        <div className={`text-[11px] mt-0.5 ${isRoot ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
          {node.head}
        </div>
        {node.role && (
          <div className={`text-[10px] mt-1 italic ${isRoot ? 'text-emerald-200' : 'text-slate-400'}`}>
            {node.role}
          </div>
        )}
        <div className={`text-[10px] mt-2 font-mono px-2 py-0.5 rounded-full ${isRoot ? 'bg-emerald-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
          {node.count} nhân sự
        </div>
      </div>

      {/* CHILDREN CONNECTION LINES */}
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-start justify-center gap-6 relative pt-4 border-t border-slate-300 dark:border-slate-700">
            {node.children.map(child => (
              <OrgNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState('');

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <>
          <Tabs
            tabs={[
              { id: 'chart', label: 'Sơ đồ tổ chức (Organogram)' }
            ]}
            activeTab="chart"
            onChange={() => {}}
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => notify('Đang xuất sơ đồ tổ chức dưới dạng PDF/PNG...', 'info')}
            >
              Xuất sơ đồ
            </Button>
          </div>
        </>
      }
      filters={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="w-64 max-w-full">
              <SearchInput
                size="sm"
                value={search}
                onChange={setSearch}
                placeholder="Tìm phòng ban, lãnh đạo…"
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Thu nhỏ"
            >
              <ZoomOut size={15} />
            </button>
            <span className="font-mono text-slate-700 dark:text-slate-300 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(1.4, z + 0.1))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Phóng to"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 ml-1"
            >
              Mặc định
            </button>
          </div>
        </div>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400">
          <div>
            <strong className="font-semibold text-slate-800 dark:text-slate-200">Sơ đồ cơ cấu tổ chức</strong> · 4 cấp phân quyền · 8 phòng ban & phân xưởng · 227 cán bộ nhân viên
          </div>
          <div>Cập nhật: 07/11/2026 bởi Ban Giám Đốc</div>
        </div>
      }
    >
      <div className="flex-1 overflow-auto p-10 bg-slate-50/50 dark:bg-slate-950 flex justify-center items-start">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
          <OrgNode node={ORG_TREE} />
        </div>
      </div>
    </ManagementFrame>
  );
}

