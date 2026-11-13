import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  TrendingUp,
  ExternalLink,
  RotateCcw,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Layers,
  FileSpreadsheet,
  Globe,
  BarChart2,
  Check,
  Search,
  Columns3,
  SlidersHorizontal,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  MoveVertical,
  Calendar,
  X,
} from 'lucide-react';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import { notify } from '../../../shared/lib/notify';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

const DEFAULT_SHAREPOINT_REPORT_NAME = 'Báo cáo Tiến độ Công việc Nhà máy (goldsunpackagingvn-my.sharepoint.com)';
const DEFAULT_SHAREPOINT_URL = 'https://goldsunpackagingvn-my.sharepoint.com/:x:/r/personal/goldsunpackagingvn_onmicrosoft_com/_layouts/15/Doc.aspx?sourcedoc=%7B8C24A10B-1463-4DB2-B147-E3547D9344A1%7D&file=BaoCaoTienDoNhaMay_2026.xlsx&action=default';

// 17 Cột chuẩn hóa của người dùng (VirtualDataTable column format)
export const SHAREPOINT_REPORT_COLUMNS = [
  { id: 'stt', label: 'STT', width: 56, minWidth: 48, pinned: 'left', canHide: false, sortable: true },
  { id: 'requestDate', label: 'Ngày yêu cầu', width: 110, minWidth: 95, sortable: true },
  { id: 'requestDepartment', label: 'BP yêu cầu', width: 110, minWidth: 95, sortable: true },
  { id: 'requester', label: 'Người yêu cầu', width: 125, minWidth: 110, sortable: true },
  { id: 'module', label: 'Phân hệ', width: 125, minWidth: 110, sortable: true },
  { id: 'feature', label: 'Chức năng', width: 175, minWidth: 150, sortable: true },
  { id: 'description', label: 'Mô tả yêu cầu/ thực trạng', width: 380, minWidth: 300, sortable: false },
  { id: 'directImpact', label: 'Hệ quả trực tiếp', width: 270, minWidth: 220, sortable: false },
  { id: 'receivingDepartment', label: 'BP tiếp nhận', width: 110, minWidth: 95, sortable: true },
  { id: 'receiver', label: 'Người tiếp nhận', width: 125, minWidth: 110, sortable: true },
  { id: 'completionTime', label: 'Thời gian hoàn thành', width: 125, minWidth: 105, sortable: true },
  { id: 'statusLabel', label: 'Trạng thái', width: 140, minWidth: 120, sortable: true },
  { id: 'priority', label: 'Phân loại', width: 110, minWidth: 95, sortable: true },
  { id: 'actionPlan', label: 'Kế hoạch hành động', width: 360, minWidth: 280, sortable: false },
  { id: 'assigneeOrWatcher', label: 'Người thực hiện/ Theo dõi', width: 165, minWidth: 135, sortable: true },
  { id: 'deadline', label: 'Deadline hoàn thành', width: 125, minWidth: 105, sortable: true },
  { id: 'secondaryCategory', label: 'Phân loại', width: 110, minWidth: 90, sortable: true },
];

export const getRowValue = (row, key) => {
  if (!row) return '';
  switch (key) {
    case 'stt':
      return row.stt ?? row.id ?? '';
    case 'requestDate':
      return row.requestDate || row.request_date || row.ngay_yeu_cau || '';
    case 'requestDepartment':
      return row.requestDepartment || row.request_department || row.requestDept || row.request_dept || row.bp_yeu_cau || '';
    case 'requester':
      return row.requester || row.request_by || row.nguoi_yeu_cau || '';
    case 'module':
      return row.module || row.phan_he || row.category || '';
    case 'feature':
      return row.feature || row.chuc_nang || row.title || '';
    case 'description':
      return row.description || row.mo_ta || '';
    case 'directImpact':
      return row.directImpact || row.direct_impact || row.impact || row.he_qua || '';
    case 'receivingDepartment':
      return row.receivingDepartment || row.receiving_department || row.receivingDept || row.receiving_dept || row.department || row.bp_tiep_nhan || '';
    case 'receiver':
      return row.receiver || row.assignee || row.nguoi_tiep_nhan || '';
    case 'completionTime':
      return row.completionTime || row.completion_time || row.completed_at || row.thoi_gian_hoan_thanh || '';
    case 'statusLabel':
      return row.statusLabel || row.status_label || row.statusText || row.status || row.trang_thai || '';
    case 'priority':
      return row.priority || row.phan_loai || '';
    case 'actionPlan':
      return row.actionPlan || row.action_plan || row.ke_hoach || '';
    case 'assigneeOrWatcher':
      return row.assigneeOrWatcher || row.assignee_or_watcher || row.executor || row.nguoi_thuc_hien || '';
    case 'deadline':
      return row.deadline || row.due_date || row.deadline_hoan_thanh || '';
    case 'secondaryCategory':
      return row.secondaryCategory || row.secondary_category || row.notes || '';
    default:
      return row[key] || '';
  }
};

// Chuyển đổi định dạng ngày D/M/YYYY hoặc YYYY-MM-DD thành Date object để lọc dải ngày
export const parseRowDate = (str) => {
  if (!str) return null;
  const s = String(str).trim();
  // D/M/YYYY hoặc DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }
  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// 7 dòng dữ liệu mẫu chính xác của người dùng
export const SAMPLE_SHAREPOINT_DATA = [
  {
    id: 'sp-task-1',
    stt: 1,
    requestDate: '4/11/2026',
    requestDepartment: '',
    requester: '',
    module: 'Sản xuất',
    feature: 'Lệnh triển khai',
    description: 'Báo cáo thể hiện được các cđ chưa được kéo lệnh triển khai từ đơn hàng bán SO -> thêm cột trạng thái đã kéo ltk và cột đóng đơn hàng',
    directImpact: '',
    receivingDepartment: 'ERP',
    receiver: 'Mrs Phương',
    completionTime: '6/11/2026',
    status: 'in_progress',
    statusLabel: 'chưa hoàn thành',
    priority: '',
    actionPlan: 'Trao đổi với brv hoàn thiện yêu cầu',
    assigneeOrWatcher: '',
    deadline: '',
    secondaryCategory: '',
  },
  {
    id: 'sp-task-2',
    stt: 2,
    requestDate: '6/11/2026',
    requestDepartment: '',
    requester: '',
    module: 'Sản xuất',
    feature: 'Lệnh thao tác',
    description: 'Thêm cột thời gian tạo, thời gian sửa trên chi tiết từng dòng lệnh thao tác',
    directImpact: '',
    receivingDepartment: 'ERP',
    receiver: 'Mrs Phương',
    completionTime: '6/11/2026',
    status: 'completed',
    statusLabel: 'Hoàn thành',
    priority: '',
    actionPlan: 'Trao đổi với brv hoàn thiện yêu cầu',
    assigneeOrWatcher: '',
    deadline: '6/11/2026',
    secondaryCategory: '',
  },
  {
    id: 'sp-task-3',
    stt: 3,
    requestDate: '9/11/2026',
    requestDepartment: 'ERP',
    requester: 'Mrs Phương',
    module: 'Kho',
    feature: 'Phân tích toàn trình module kho',
    description: `Phân tích toàn trình module kho BRV - Kho MES\n1.  hoàn thiện báo cáo vướng mắc cần xử lý nếu có để giảm thao tác cho người dùng và mapping với thiết kế mới của MES chỗ Mr Hoàn EPS\n2. Hoàn thiện yêu cầu của Mr Cường\n 3. Tổng hợp toàn bộ hướng dẫn sử dụng phần MES của Mr Hoàn/ phần Brv đang có/ hình ảnh test`,
    directImpact: 'ko nắm rõ logic ko hỗ trợ và phân tích qui trình chuẩn được',
    receivingDepartment: 'ERP',
    receiver: 'Mrs Thương',
    completionTime: '',
    status: 'in_progress',
    statusLabel: 'chưa hoàn thành',
    priority: 'Ưu tiên',
    actionPlan: `Mr Khiêm làm việc với Brv, Thương đi sâu vào tìm hiểu phân tích\n-> hoàn thiện báo cáo vướng mắc cần xử lý nếu có để giảm thao tác cho người dùng và mapping với thiết kế mới của MES chỗ Mr Hoàn EPS`,
    assigneeOrWatcher: 'Mrs Thương',
    deadline: '15/11/2026',
    secondaryCategory: '',
  },
  {
    id: 'sp-task-4',
    stt: 4,
    requestDate: '7/11/2026',
    requestDepartment: 'ERP',
    requester: 'Mrs Phương',
    module: 'Dashboard',
    feature: 'Theo dõi tiến độ công việc',
    description: 'Tuấn xây dashboard quản lý, theo dõi tiến độ báo cáo công việc của mn trong phòng kèm biểu đồ tăng trưởng',
    directImpact: 'Theo dõi phân tích khối lượng công việc trong phòng',
    receivingDepartment: 'ERP',
    receiver: 'Mr Tuấn',
    completionTime: '',
    status: 'in_progress',
    statusLabel: 'chưa hoàn thành',
    priority: 'Ưu tiên',
    actionPlan: `Xây dựng web  quản lý công việc tạo công việc, theo dõi các công việc, giao việc, \nXây dựng báo cáo phân tích biểu đồ tiến độ công việc`,
    assigneeOrWatcher: 'Mrs Phương',
    deadline: '15/11/2026',
    secondaryCategory: '',
  },
  {
    id: 'sp-task-5',
    stt: 5,
    requestDate: '7/11/2026',
    requestDepartment: 'ERP',
    requester: 'Mrs Phương',
    module: 'Biên bản họp',
    feature: 'Giao ban hàng ngày',
    description: `1. nhận file ghi âm\n2. chạy AI ra biên bản họp\n3. đẩy các đầu việc sau họp vào sheet "đầu việc sau họp GB MES" trên link chung`,
    directImpact: 'Theo dõi nội dung thống nhất, đầu việc liên quan dự án MES',
    receivingDepartment: 'ERP',
    receiver: 'Mr Minh',
    completionTime: '',
    status: 'recurring',
    statusLabel: 'Theo dõi hàng ngày',
    priority: '',
    actionPlan: 'Mr Minh theo dõi và hoàn thiện hàng ngày',
    assigneeOrWatcher: 'Mrs Phương',
    deadline: '',
    secondaryCategory: '',
  },
  {
    id: 'sp-task-6',
    stt: 6,
    requestDate: '7/11/2026',
    requestDepartment: 'ERP',
    requester: 'Mrs Phương',
    module: 'Đào tạo/ theo dõi',
    feature: 'Toolkit',
    description: 'Đào tạo, theo dõi Mr Tuấn Anh đpsx 1A thực hiện hàng ngày. Tiếp nhận, hoàn thiện yêu cầu chỉnh sửa nếu có',
    directImpact: '',
    receivingDepartment: 'ERP',
    receiver: 'Mr Tuấn',
    completionTime: '11/9/2026',
    status: 'completed',
    statusLabel: 'Hoàn Thành',
    priority: '',
    actionPlan: 'Đào tạo sử dụng 3 chức năng quyết toán lệnh công đoạn, lệnh thao tác, dời ngày thao tác',
    assigneeOrWatcher: 'Mr Tuấn',
    deadline: '11/9/2026',
    secondaryCategory: '',
  },
  {
    id: 'sp-task-7',
    stt: 7,
    requestDate: '7/11/2026',
    requestDepartment: 'ERP',
    requester: 'Mrs Phương',
    module: 'Sản xuất',
    feature: 'Báo cáo P3',
    description: 'Thêm c cột ngày sửa của chi tiết ltt ở báo cáo P3',
    directImpact: '',
    receivingDepartment: 'ERP',
    receiver: 'Mrs Phương',
    completionTime: '',
    status: 'in_progress',
    statusLabel: 'chưa hoàn thành',
    priority: '',
    actionPlan: 'Trao đổi với brv hoàn thiện yêu cầu',
    assigneeOrWatcher: 'Mrs Phương',
    deadline: '',
    secondaryCategory: '',
  },
];

// Dữ liệu tăng trưởng tiến độ theo tuần (Growth Area Chart với Recharts)
const GROWTH_DATA = [
  { week: 'Tuần 42', actual: 28, target: 35 },
  { week: 'Tuần 43', actual: 48, target: 50 },
  { week: 'Tuần 44', actual: 65, target: 65 },
  { week: 'Tuần 45', actual: 80, target: 75 },
  { week: 'Hiện tại (T46)', actual: 88, target: 85 },
];

export default function SharepointProgressReportsTab() {
  const [reportTitle] = useState(DEFAULT_SHAREPOINT_REPORT_NAME);
  const [sharepointUrl] = useState(DEFAULT_SHAREPOINT_URL);
  const [rows] = useState(SAMPLE_SHAREPOINT_DATA);

  // Selected Row IDs for VirtualDataTable
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Kéo dãn độ cao hàng / cột (Row Height Adjuster & Resizing State)
  const [tableRowHeight, setTableRowHeight] = useState(() => {
    return Number(localStorage.getItem('etpms_sp_row_height')) || 64;
  });
  const [isHeightMenuOpen, setIsHeightMenuOpen] = useState(false);

  // Kéo dãn độ cao khu vực Biểu đồ / Dashboard
  const [dashboardHeight, setDashboardHeight] = useState(() => {
    return Number(localStorage.getItem('etpms_sp_dashboard_height')) || 210;
  });
  const [isDashboardVisible, setIsDashboardVisible] = useState(true);

  // Filters
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [receiverFilter, setReceiverFilter] = useState('all');

  // Lọc theo dải ngày (Date Range Filter)
  const [dateField, setDateField] = useState('requestDate'); // 'requestDate' | 'deadline' | 'completionTime'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Kéo chuột trực tiếp để thay đổi độ cao dòng (Interactive Row Height Dragging)
  const isDraggingRowHeight = useRef(false);
  const startY = useRef(0);
  const startRowHeight = useRef(tableRowHeight);

  const handleRowHeightDragStart = (e) => {
    e.preventDefault();
    isDraggingRowHeight.current = true;
    startY.current = e.clientY;
    startRowHeight.current = tableRowHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingRowHeight.current) return;
      const delta = moveEvent.clientY - startY.current;
      const newHeight = Math.min(180, Math.max(36, startRowHeight.current + delta));
      setTableRowHeight(newHeight);
      localStorage.setItem('etpms_sp_row_height', String(newHeight));
    };

    const onMouseUp = () => {
      isDraggingRowHeight.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Kéo chuột để thay đổi độ cao Dashboard biểu đồ
  const isDraggingDashboard = useRef(false);
  const startDashY = useRef(0);
  const startDashHeight = useRef(dashboardHeight);

  const handleDashboardDragStart = (e) => {
    e.preventDefault();
    isDraggingDashboard.current = true;
    startDashY.current = e.clientY;
    startDashHeight.current = dashboardHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingDashboard.current) return;
      const delta = moveEvent.clientY - startDashY.current;
      const newH = Math.min(420, Math.max(130, startDashHeight.current + delta));
      setDashboardHeight(newH);
      localStorage.setItem('etpms_sp_dashboard_height', String(newH));
    };

    const onMouseUp = () => {
      isDraggingDashboard.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Options
  const modules = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const m = getRowValue(r, 'module');
      if (m) set.add(m);
    });
    return [
      { value: 'all', label: 'Tất cả phân hệ' },
      ...Array.from(set).map((m) => ({ value: m, label: m })),
    ];
  }, [rows]);

  const receivers = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const rec = getRowValue(r, 'receiver');
      if (rec) set.add(rec);
    });
    return [
      { value: 'all', label: 'Tất cả người tiếp nhận' },
      ...Array.from(set).map((m) => ({ value: m, label: m })),
    ];
  }, [rows]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = rows.length;
    let completed = 0;
    let inProgress = 0;
    let recurring = 0;
    let urgent = 0;

    rows.forEach((r) => {
      const status = (getRowValue(r, 'statusLabel') || getRowValue(r, 'status')).toLowerCase();
      const priority = (getRowValue(r, 'priority') || '').toLowerCase();

      if (status.includes('hoàn thành') && !status.includes('chưa')) {
        completed += 1;
      } else if (status.includes('hàng ngày')) {
        recurring += 1;
      } else {
        inProgress += 1;
      }

      if (priority.includes('ưu tiên')) {
        urgent += 1;
      }
    });

    const completionRate = Math.round((completed / (total || 1)) * 100);
    return { total, completed, inProgress, recurring, urgent, completionRate };
  }, [rows]);

  // Dữ liệu cho Biểu đồ cột (Bar Chart Recharts) theo Phân hệ
  const moduleBarData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const m = getRowValue(r, 'module') || 'Khác';
      map[m] = (map[m] || 0) + 1;
    });

    const palette = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4'];
    return Object.entries(map).map(([name, count], idx) => ({
      name,
      count,
      fill: palette[idx % palette.length],
    })).sort((a, b) => b.count - a.count);
  }, [rows]);

  // Theo dõi chi tiết tiến độ công việc của từng người trong phòng ERP
  const teamProgress = useMemo(() => {
    const members = [
      {
        name: 'Mrs Phương',
        role: 'Trưởng nhóm ERP',
        tasks: rows.filter((r) => getRowValue(r, 'receiver') === 'Mrs Phương'),
        targetProgress: 80,
      },
      {
        name: 'Mr Tuấn',
        role: 'Chuyên viên Dashboard',
        tasks: rows.filter((r) => getRowValue(r, 'receiver') === 'Mr Tuấn'),
        targetProgress: 85,
      },
      {
        name: 'Mrs Thương',
        role: 'Phân tích Kho MES',
        tasks: rows.filter((r) => getRowValue(r, 'receiver') === 'Mrs Thương'),
        targetProgress: 60,
      },
      {
        name: 'Mr Minh',
        role: 'Biên bản & AI',
        tasks: rows.filter((r) => getRowValue(r, 'receiver') === 'Mr Minh'),
        targetProgress: 90,
      },
    ];

    return members.map((m) => {
      const total = m.tasks.length;
      let completed = 0;
      let inProgress = 0;
      let recurring = 0;
      let urgent = 0;

      m.tasks.forEach((t) => {
        const st = (getRowValue(t, 'statusLabel') || '').toLowerCase();
        const pri = (getRowValue(t, 'priority') || '').toLowerCase();
        if (st.includes('hoàn thành') && !st.includes('chưa')) completed += 1;
        else if (st.includes('hàng ngày')) recurring += 1;
        else inProgress += 1;
        if (pri.includes('ưu tiên')) urgent += 1;
      });

      const actualProgress = total > 0
        ? Math.round(((completed * 100 + recurring * 90 + inProgress * 40) / (total * 100)) * 100)
        : 0;

      return {
        ...m,
        total,
        completed,
        inProgress,
        recurring,
        urgent,
        actualProgress,
      };
    });
  }, [rows]);

  // Filtered rows for the data table
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const mod = getRowValue(r, 'module');
      if (moduleFilter !== 'all' && mod !== moduleFilter) return false;

      const stLabel = getRowValue(r, 'statusLabel').toLowerCase();
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && (!stLabel.includes('hoàn thành') || stLabel.includes('chưa'))) return false;
        if (statusFilter === 'in_progress' && !stLabel.includes('chưa hoàn thành')) return false;
        if (statusFilter === 'recurring' && !stLabel.includes('hàng ngày')) return false;
      }

      const pri = getRowValue(r, 'priority').toLowerCase();
      if (priorityFilter !== 'all') {
        if (priorityFilter === 'urgent' && !pri.includes('ưu tiên')) return false;
        if (priorityFilter === 'normal' && pri.includes('ưu tiên')) return false;
      }

      const rec = getRowValue(r, 'receiver');
      if (receiverFilter !== 'all' && rec !== receiverFilter) return false;

      // Lọc theo dải ngày (Date Range Filter)
      if (startDate || endDate) {
        const rawDateStr = getRowValue(r, dateField);
        const rowDate = parseRowDate(rawDateStr);
        if (rowDate) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (rowDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (rowDate > end) return false;
          }
        } else {
          return false;
        }
      }

      if (search) {
        const q = search.toLowerCase();
        return (
          getRowValue(r, 'feature').toLowerCase().includes(q) ||
          getRowValue(r, 'description').toLowerCase().includes(q) ||
          getRowValue(r, 'receiver').toLowerCase().includes(q) ||
          getRowValue(r, 'requester').toLowerCase().includes(q) ||
          getRowValue(r, 'actionPlan').toLowerCase().includes(q) ||
          getRowValue(r, 'assigneeOrWatcher').toLowerCase().includes(q) ||
          getRowValue(r, 'directImpact').toLowerCase().includes(q) ||
          getRowValue(r, 'module').toLowerCase().includes(q) ||
          getRowValue(r, 'receivingDepartment').toLowerCase().includes(q) ||
          getRowValue(r, 'requestDepartment').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, moduleFilter, statusFilter, priorityFilter, receiverFilter, search, startDate, endDate, dateField]);

  const totalFiltered = filteredRows.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  // Custom Cell Renderer for VirtualDataTable với độ cao thích ứng
  const renderCell = useCallback((column, row) => {
    const val = getRowValue(row, column.id);

    if (column.id === 'stt') {
      return <span className="font-mono text-center block text-slate-500">{val}</span>;
    }

    if (column.id === 'requestDate' || column.id === 'completionTime' || column.id === 'deadline') {
      return (
        <span className="font-mono text-center block text-slate-700 dark:text-slate-300">
          {val || '—'}
        </span>
      );
    }

    if (column.id === 'requestDepartment' || column.id === 'receivingDepartment') {
      if (!val) return <span className="text-slate-400 block text-center">—</span>;
      return (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {val}
        </span>
      );
    }

    if (column.id === 'feature') {
      return (
        <span className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer block truncate" title={val}>
          {val}
        </span>
      );
    }

    if (column.id === 'module') {
      return <span className="font-semibold text-slate-900 dark:text-slate-100 block">{val}</span>;
    }

    if (column.id === 'description' || column.id === 'actionPlan' || column.id === 'directImpact') {
      return (
        <span
          className={`leading-relaxed block py-1 text-slate-800 dark:text-slate-200 ${
            tableRowHeight >= 64 ? 'whitespace-pre-wrap' : 'truncate'
          }`}
          title={val}
        >
          {val || '—'}
        </span>
      );
    }

    if (column.id === 'statusLabel') {
      const isCompleted = val.toLowerCase().includes('hoàn thành') && !val.toLowerCase().includes('chưa');
      const isInProgress = val.toLowerCase().includes('chưa hoàn thành');
      const isRecurring = val.toLowerCase().includes('hàng ngày');

      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : isRecurring
              ? 'bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              : isInProgress
              ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800'
          }`}
        >
          {val || '—'}
        </span>
      );
    }

    if (column.id === 'priority') {
      const isUrgent = val.toLowerCase().includes('ưu tiên');
      if (!val) return <span className="text-slate-400 block text-center">—</span>;
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            isUrgent
              ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800'
          }`}
        >
          {val}
        </span>
      );
    }

    if (column.id === 'receiver' || column.id === 'assigneeOrWatcher') {
      return <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{val || '—'}</span>;
    }

    return String(val || '—');
  }, [tableRowHeight]);

  // Chiều cao tự động thích ứng cho bảng dữ liệu để hiển thị trọn vẹn toàn bộ các dòng và cho phép cuộn dọc cả trang
  const tableTotalHeight = useMemo(() => {
    const rowCount = Math.max(pagedRows.length, 1);
    // 40px cho table header + rowCount * tableRowHeight + 52px safe margin cho footer/padding
    return Math.max(450, rowCount * tableRowHeight + 52);
  }, [pagedRows.length, tableRowHeight]);

  // Xuất Excel chuẩn 17 cột
  const handleExportExcel = () => {
    const exportData = filteredRows.map((r, idx) => ({
      'STT': getRowValue(r, 'stt') || (idx + 1),
      'Ngày yêu cầu': getRowValue(r, 'requestDate'),
      'BP yêu cầu': getRowValue(r, 'requestDepartment'),
      'Người yêu cầu': getRowValue(r, 'requester'),
      'Phân hệ': getRowValue(r, 'module'),
      'Chức năng': getRowValue(r, 'feature'),
      'Mô tả yêu cầu/ thực trạng': getRowValue(r, 'description'),
      'Hệ quả trực tiếp': getRowValue(r, 'directImpact'),
      'BP tiếp nhận': getRowValue(r, 'receivingDepartment'),
      'Người tiếp nhận': getRowValue(r, 'receiver'),
      'Thời gian hoàn thành': getRowValue(r, 'completionTime'),
      'Trạng thái': getRowValue(r, 'statusLabel'),
      'Phân loại': getRowValue(r, 'priority'),
      'Kế hoạch hành động': getRowValue(r, 'actionPlan'),
      'Người thực hiện/ Theo dõi': getRowValue(r, 'assigneeOrWatcher'),
      'Deadline hoàn thành': getRowValue(r, 'deadline'),
      'Phân loại ': getRowValue(r, 'secondaryCategory'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TienDoCongViec');
    XLSX.writeFile(wb, `Bao_Cao_Tien_Do_Cong_Viec_Goldsun_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify.success(`Đã xuất ${filteredRows.length} dòng báo cáo tiến độ ra file Excel.`);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 select-text flex flex-col scrollbar-thin">
      {/* 1. THANH TIÊU ĐỀ & BỘ LỌC CỐ ĐỊNH Ở ĐẦU TRANG (STICKY HEADER & FILTERS) */}
      <div className="sticky top-0 z-30 shrink-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Hàng 1: Tiêu đề báo cáo, KPI badges & Các nút thao tác */}
        <div className="flex flex-wrap items-center justify-between w-full gap-3 px-4 py-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider truncate">
                {reportTitle}
              </h1>

              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Check size={10} /> 7 công việc phòng ERP
              </span>

              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                goldsunpackagingvn-my.sharepoint.com
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Theo dõi tiến độ báo cáo công việc của mọi người trong phòng ERP kèm biểu đồ tăng trưởng & biểu đồ cột phân tích
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle ẩn/hiện Dashboard biểu đồ */}
            <button
              type="button"
              onClick={() => setIsDashboardVisible((prev) => !prev)}
              className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-medium text-xs transition cursor-pointer"
              title={isDashboardVisible ? 'Thu gọn biểu đồ' : 'Mở rộng biểu đồ'}
            >
              {isDashboardVisible ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isDashboardVisible ? 'Thu gọn biểu đồ' : 'Xem biểu đồ'}</span>
            </button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => {
                setSearchDraft('');
                setSearch('');
                setModuleFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
                setReceiverFilter('all');
                setStartDate('');
                setEndDate('');
                setSelectedTaskIds([]);
                setPage(1);
                notify.success('Đã tải lại toàn bộ dữ liệu');
              }}
              title="Đặt lại bộ lọc"
            >
              Làm mới
            </Button>

            <a
              href={sharepointUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 font-medium text-xs transition"
              title="Mở tài liệu SharePoint Online"
            >
              <Globe size={13} />
              <span>Mở SharePoint</span>
              <ExternalLink size={11} />
            </a>

            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportExcel}
              title="Xuất 17 cột dữ liệu ra file Excel (.xlsx)"
            >
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* Hàng 2: Các card tổng kết KPI: 2 hoàn tất (29%), 4 đang làm, 2 ưu tiên, 7 tổng số */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-4 py-2 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
          {/* Card 1: Hoàn tất */}
          <div
            onClick={() => {
              setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'));
              setPage(1);
            }}
            className={`p-2.5 rounded-lg border transition cursor-pointer select-none group ${
              statusFilter === 'completed'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/20'
            }`}
            title="Nhấn để lọc các công việc Đã hoàn thành"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                Hoàn tất
              </span>
              <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 size={13} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {kpis.completed}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                hoàn tất ({kpis.completionRate}%)
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Đã nghiệm thu</span>
              {statusFilter === 'completed' && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-1 rounded">
                  Đang lọc
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Đang làm */}
          <div
            onClick={() => {
              setStatusFilter((prev) => (prev === 'in_progress' ? 'all' : 'in_progress'));
              setPage(1);
            }}
            className={`p-2.5 rounded-lg border transition cursor-pointer select-none group ${
              statusFilter === 'in_progress'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50/20'
            }`}
            title="Nhấn để lọc các công việc Đang làm / Chưa hoàn thành"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                Đang làm
              </span>
              <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300">
                <Clock size={13} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                {kpis.inProgress}
              </span>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 font-mono">
                đang làm
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Chưa hoàn thành</span>
              {statusFilter === 'in_progress' && (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-1 rounded">
                  Đang lọc
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Ưu tiên */}
          <div
            onClick={() => {
              setPriorityFilter((prev) => (prev === 'urgent' ? 'all' : 'urgent'));
              setPage(1);
            }}
            className={`p-2.5 rounded-lg border transition cursor-pointer select-none group ${
              priorityFilter === 'urgent'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-1 ring-rose-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400 hover:bg-rose-50/20'
            }`}
            title="Nhấn để lọc các công việc Ưu tiên"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                Ưu tiên
              </span>
              <div className="p-1 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
                <AlertTriangle size={13} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400">
                {kpis.urgent}
              </span>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 font-mono">
                ưu tiên
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Trọng điểm cần xử lý</span>
              {priorityFilter === 'urgent' && (
                <span className="text-[9px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-950 px-1 rounded">
                  Đang lọc
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Tổng số công việc phòng ERP */}
          <div
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setModuleFilter('all');
              setReceiverFilter('all');
              setStartDate('');
              setEndDate('');
              setSearchDraft('');
              setSearch('');
              setPage(1);
            }}
            className={`p-2.5 rounded-lg border transition cursor-pointer select-none group ${
              statusFilter === 'all' && priorityFilter === 'all' && moduleFilter === 'all' && receiverFilter === 'all' && !startDate && !endDate && !search
                ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 ring-1 ring-blue-400 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/20'
            }`}
            title="Nhấn để xem toàn bộ danh sách"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Tổng công việc
              </span>
              <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
                <Layers size={13} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {rows.length}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                đầu việc ERP
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Đang hiện: {filteredRows.length} việc</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline">Xem tất cả</span>
            </div>
          </div>
        </div>

        {/* Hàng 3: Bộ lọc tìm kiếm, lọc dải ngày & tùy chỉnh độ cao dòng */}
        <div className="flex flex-wrap items-center justify-between w-full gap-2 px-4 py-1.5 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-52 sm:w-60">
              <SearchInput
                value={searchDraft}
                onChange={setSearchDraft}
                onSubmit={setSearch}
                placeholder="Tìm chức năng, mô tả, người làm..."
                size="sm"
              />
            </div>

            {/* Lọc dải ngày (Date Range Picker) */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded h-8 px-2 text-xs">
              <Calendar size={13} className="text-emerald-600 shrink-0" />
              <select
                value={dateField}
                onChange={(e) => {
                  setDateField(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer pr-1"
                title="Chọn cột ngày để lọc"
              >
                <option value="requestDate">Ngày yêu cầu</option>
                <option value="deadline">Hạn hoàn thành</option>
                <option value="completionTime">Ngày HT</option>
              </select>

              <span className="text-slate-300 dark:text-slate-700">|</span>

              <span className="text-[10px] text-slate-400">Từ</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                title="Từ ngày"
              />

              <span className="text-[10px] text-slate-400">Đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                title="Đến ngày"
              />

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                  title="Xóa lọc dải ngày"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick preset for Month 11/2026 */}
            <button
              type="button"
              onClick={() => {
                if (startDate === '2026-11-01' && endDate === '2026-11-30') {
                  setStartDate('');
                  setEndDate('');
                } else {
                  setStartDate('2026-11-01');
                  setEndDate('2026-11-30');
                }
                setPage(1);
              }}
              className={`h-8 px-2.5 text-[11px] font-medium rounded border transition cursor-pointer select-none ${
                startDate === '2026-11-01' && endDate === '2026-11-30'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
              title="Lọc nhanh toàn bộ công việc Tháng 11/2026"
            >
              Tháng 11/2026
            </button>

            <div className="w-36">
              <Select
                size="sm"
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e?.target?.value ?? e);
                  setPage(1);
                }}
                options={modules}
              />
            </div>

            <div className="w-32">
              <Select
                size="sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e?.target?.value ?? e);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'completed', label: 'Hoàn thành' },
                  { value: 'in_progress', label: 'Chưa hoàn thành' },
                  { value: 'recurring', label: 'Theo dõi hàng ngày' },
                ]}
              />
            </div>

            <div className="w-28">
              <Select
                size="sm"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e?.target?.value ?? e);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả phân loại' },
                  { value: 'urgent', label: 'Ưu tiên' },
                  { value: 'normal', label: 'Bình thường' },
                ]}
              />
            </div>

            <div className="w-32">
              <Select
                size="sm"
                value={receiverFilter}
                onChange={(e) => {
                  setReceiverFilter(e?.target?.value ?? e);
                  setPage(1);
                }}
                options={receivers}
              />
            </div>

            {(search || moduleFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || receiverFilter !== 'all' || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchDraft('');
                  setSearch('');
                  setModuleFilter('all');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setReceiverFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} /> Bỏ lọc
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bộ điều khiển độ cao hàng / cột (Row Height Adjuster) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsHeightMenuOpen((prev) => !prev)}
                className={`h-8 px-2.5 flex items-center gap-1.5 rounded border text-xs font-medium transition cursor-pointer select-none ${
                  isHeightMenuOpen
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
                title="Tùy chỉnh độ cao hàng / cột (Row height)"
              >
                <ChevronsUpDown size={14} className="text-emerald-600" />
                <span>Độ cao dòng: <strong className="font-mono">{tableRowHeight}px</strong></span>
              </button>

              {isHeightMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-64 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl text-xs space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MoveVertical size={13} className="text-emerald-600" /> Kéo dãn độ cao dòng / cột
                    </span>
                    <span className="font-mono font-bold text-emerald-600">{tableRowHeight}px</span>
                  </div>

                  {/* Slider kéo dãn độ cao */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Gọn (36px)</span>
                      <span>Mở rộng (160px)</span>
                    </div>
                    <input
                      type="range"
                      min="36"
                      max="160"
                      step="4"
                      value={tableRowHeight}
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        setTableRowHeight(h);
                        localStorage.setItem('etpms_sp_row_height', String(h));
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* 4 Mức độ cao có sẵn */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {[
                      { label: 'Gọn (40px)', val: 40 },
                      { label: 'Tiêu chuẩn (60px)', val: 60 },
                      { label: 'Rộng (84px)', val: 84 },
                      { label: 'Chi tiết (120px)', val: 120 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          setTableRowHeight(opt.val);
                          localStorage.setItem('etpms_sp_row_height', String(opt.val));
                        }}
                        className={`px-2 py-1.5 text-center text-[11px] rounded transition font-medium cursor-pointer ${
                          tableRowHeight === opt.val
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    Mức 84px hoặc 120px cho phép xem trọn vẹn toàn bộ các dòng mô tả yêu cầu & kế hoạch hành động.
                  </p>
                </div>
              )}
            </div>

            <div id="etpms-sharepoint-column-menu" className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">
                Hiển thị <strong>{filteredRows.length}</strong> / <strong>{rows.length}</strong> công việc
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC DASHBOARD: BIỂU ĐỒ TĂNG TRƯỞNG & BIỂU ĐỒ CỘT (RECHARTS) & TIẾN ĐỘ NHÂN SỰ */}
      {isDashboardVisible && (
        <div
          style={{ height: `${dashboardHeight}px` }}
          className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:border-slate-800 overflow-hidden relative"
        >
          {/* Cột 1: Biểu đồ tăng trưởng (Recharts AreaChart) - 4 cols */}
          <div className="lg:col-span-4 p-3 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                <TrendingUp size={14} className="text-emerald-600" />
                <span>Biểu đồ tăng trưởng tuần</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                +12.5%
              </span>
            </div>

            <div className="flex-1 min-h-0 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GROWTH_DATA} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 6, padding: '4px 8px' }}
                    formatter={(val, name) => [`${val}%`, name === 'actual' ? 'Thực tế đạt' : 'Kế hoạch']}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="actual"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#growthAreaGrad)"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="target"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-600" /> Thực tế: 88%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-b border-dashed border-slate-400" /> Kế hoạch: 85%</span>
            </div>
          </div>

          {/* Cột 2: Biểu đồ cột (Recharts BarChart theo Phân hệ) - 4 cols */}
          <div className="lg:col-span-4 p-3 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                <BarChart2 size={14} className="text-blue-600" />
                <span>Biểu đồ cột phân hệ</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {moduleBarData.length} phân hệ
              </span>
            </div>

            <div className="flex-1 min-h-0 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleBarData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 9 }} allowDecimals={false} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 6, padding: '4px 8px' }}
                    formatter={(val) => [`${val} yêu cầu`, 'Số lượng']}
                  />
                  <Bar dataKey="count" name="Số yêu cầu" radius={[3, 3, 0, 0]}>
                    {moduleBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-100 dark:border-slate-800 shrink-0">
              Sản xuất chiếm tỷ trọng lớn nhất với 3 yêu cầu (43%)
            </div>
          </div>

          {/* Cột 3: Theo dõi tiến độ nhân sự phòng ERP - 4 cols */}
          <div className="lg:col-span-4 p-3 flex flex-col justify-between bg-slate-50/40 dark:bg-slate-900/60 overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                <Users size={14} className="text-purple-600" />
                <span>Tiến độ nhân sự phòng ERP</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">4 cán bộ</span>
            </div>

            <div className="space-y-1.5 my-auto overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
              {teamProgress.map((member) => (
                <div key={member.name} className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      <span>{member.name}</span>
                      <span className="text-[9px] text-slate-400 font-normal">({member.role})</span>
                      {member.urgent > 0 && (
                        <span className="px-1 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-bold">
                          Ưu tiên
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <span className="text-slate-500">{member.completed}/{member.total} xong</span>
                      <span className="font-bold text-emerald-600">{member.actualProgress}%</span>
                    </div>
                  </div>

                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                      style={{ width: `${member.actualProgress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-200/60 dark:border-slate-800 shrink-0">
              Tiến độ trung bình toàn phòng ERP đạt 88%
            </div>
          </div>
        </div>
      )}

      {/* Thanh kéo dãn chuột phân tách giữa Dashboard Biểu đồ & Table (Dashboard Resizer Handle) */}
      {isDashboardVisible && (
        <div
          onMouseDown={handleDashboardDragStart}
          className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 dark:hover:bg-emerald-500 cursor-row-resize transition-colors flex items-center justify-center shrink-0 group select-none"
          title="Kéo chuột lên/xuống để thay đổi độ cao khu vực biểu đồ & bảng"
        >
          <div className="w-12 h-0.5 bg-slate-300 dark:bg-slate-600 group-hover:bg-white rounded-full" />
        </div>
      )}

      {/* 3. VIRTUAL DATA TABLE (Hỗ trợ kéo dãn độ cao hàng/cột linh hoạt & cuộn dọc cả trang) */}
      <div className="w-full flex flex-col shrink-0 bg-white dark:bg-slate-950">
        {/* Thanh handle kéo dãn độ cao dòng trực tiếp (Row Height Resizing Handle) */}
        <div
          onMouseDown={handleRowHeightDragStart}
          className="h-1 w-full bg-slate-200/50 dark:bg-slate-800 hover:bg-emerald-400 cursor-row-resize transition-colors flex items-center justify-center shrink-0 group select-none"
          title={`Kéo chuột lên/xuống để kéo giãn độ cao hàng (Hiện tại: ${tableRowHeight}px)`}
        >
          <div className="w-8 h-0.5 bg-slate-400 dark:bg-slate-500 group-hover:bg-emerald-600 rounded-full opacity-60 group-hover:opacity-100" />
        </div>

        <div
          style={{ height: `${tableTotalHeight}px` }}
          className="w-full relative shrink-0"
        >
          <VirtualDataTable
            preferenceKey="etpms-sharepoint-progress-report"
            columns={SHAREPOINT_REPORT_COLUMNS}
            rows={pagedRows}
            selectedIds={selectedTaskIds}
            onSelectedIdsChange={setSelectedTaskIds}
            renderCell={renderCell}
            page={page}
            pageSize={pageSize}
            columnMenuTargetId="etpms-sharepoint-column-menu"
            rowHeight={tableRowHeight}
            emptyText="Không tìm thấy yêu cầu công việc nào phù hợp với bộ lọc."
          />
        </div>
      </div>

      {/* 4. FOOTER THANH TRẠNG THÁI & PHÂN TRANG */}
      <div className="px-3 h-9 min-h-[36px] py-0 text-xs bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0 text-slate-600 dark:text-slate-400 select-none">
        <TableStatusFooter
          title="Báo cáo tiến độ SharePoint (17 cột)"
          totalCount={totalFiltered}
          selectedCount={selectedTaskIds.length}
          unit="công việc"
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={false}
        />
      </div>
    </div>
  );
}
