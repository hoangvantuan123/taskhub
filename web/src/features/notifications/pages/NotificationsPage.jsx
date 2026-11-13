import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import Button from '../../../shared/ui/Button';
import SearchInput from '../../../shared/ui/SearchInput';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';
import { useAuth } from '../../../shared/hooks/useAuth';
import TaskDetailPage from '../../tasks/pages/TaskDetailPage';
import { taskService } from '../../tasks/services/taskService';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Search,
  Trash2,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Mail,
  MailOpen,
  Calendar,
  Building2,
  FileText,
  CheckCircle2,
  Send,
  Copy,
  Inbox,
  Filter,
  Sparkles,
} from 'lucide-react';

const NOTIF_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'tasks', label: 'Giao việc' },
  { id: 'deadlines', label: 'Hạn chót' },
  { id: 'approvals', label: 'Phê duyệt' },
  { id: 'system', label: 'Hệ thống' },
];

// Bộ dữ liệu lịch sử thông báo mẫu phong phú, thực tế gắn liền với hệ sinh thái quản lý công việc ETPMS
const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-task-01',
    category: 'tasks',
    priority: 'urgent',
    title: 'Giao nhiệm vụ mới: Kiểm toán quy trình KCS bao bì màng nhôm phức hợp 5 lớp',
    message: 'Ban Giám Đốc đã giao nhiệm vụ kiểm tra chất lượng lô màng ghép xuất khẩu thị trường Nhật Bản cho phòng QC.',
    content: `Chào bạn,

Ban Giám Đốc và Quản đốc Sản xuất đã phê duyệt chỉ đạo giao việc khẩn cấp cho Bộ phận Kỹ thuật & QC:

1. Nội dung công việc: Tiến hành kiểm toán toàn diện quy trình KCS, đo độ dày màng ghép 5 lớp (PET/AL/PA/CPP), kiểm tra độ bền đường hàn dán và kiểm tra chỉ số thôi nhiễm kim loại nặng đối với lô hàng màng nhôm phức hợp xuất khẩu thị trường Nhật Bản.
2. Tiêu chuẩn nghiệm thu: Theo tiêu chuẩn JIS Z 1707 và quy định vệ sinh an toàn thực phẩm xuất khẩu.
3. Địa điểm kiểm tra: Phòng thí nghiệm KCS xưởng Ghép màng số 2.
4. Thời hạn hoàn thành: Trước 17:00 ngày 12/11/2026.

Vui lòng kiểm tra mục tiêu và cập nhật tiến độ ngay trên hệ thống.`,
    time: '5 phút trước',
    createdAt: '2026-11-08T08:30:00Z',
    read: false,
    sender: {
      name: 'Ban Giám Đốc',
      role: 'Chỉ đạo điều hành',
      department: 'Ban Lãnh Đạo',
      avatarColor: 'bg-rose-600',
      initials: 'BGĐ',
    },
    linkedTask: {
      id: 1,
      code: 'CV-2026-089',
      title: 'Kiểm toán quy trình KCS bao bì màng nhôm phức hợp 5 lớp',
      department: 'Phòng Quản Lý Chất Lượng (QC)',
      dueDate: '2026-11-12',
      progress: 25,
      status: 'in_progress',
      assigneeName: 'KCS Phòng QC',
    },
  },
  {
    id: 'notif-deadline-02',
    category: 'deadlines',
    priority: 'urgent',
    title: 'Cảnh báo hạn chót: Công việc [CV-2026-042] đến hạn trong hôm nay',
    message: 'Nhiệm vụ "Hoàn thiện bản vẽ kỹ thuật khuôn bế thùng carton sóng E" cần nộp hồ sơ trước 17:30.',
    content: `CẢNH BÁO TỰ ĐỘNG TỪ HỆ THỐNG ĐIỀU HÀNH:

Công việc [CV-2026-042] "Hoàn thiện bản vẽ kỹ thuật khuôn bế thùng carton sóng E đựng nông sản xuất khẩu" đang có hạn chót nghiệm thu là HÔM NAY (17:30).

Hiện tại tiến độ công việc đang ghi nhận: 70%.
Các hạng mục còn thiếu:
- Bản vẽ chi tiết kích thước nắp cài và rãnh gân sóng.
- File CAD 3D gửi xưởng chế tạo dao bế.

Đề nghị Kỹ sư phụ trách khẩn trương hoàn thiện hồ sơ nghiệm thu hoặc gửi yêu cầu gia hạn kèm lý do chính đáng để Lãnh đạo phê duyệt.`,
    time: '45 phút trước',
    createdAt: '2026-11-08T07:50:00Z',
    read: false,
    sender: {
      name: 'Hệ thống Quản trị ETPMS',
      role: 'Bot cảnh báo tự động',
      department: 'Hệ thống',
      avatarColor: 'bg-amber-600',
      initials: 'SYS',
    },
    linkedTask: {
      id: 2,
      code: 'CV-2026-042',
      title: 'Hoàn thiện bản vẽ kỹ thuật khuôn bế thùng carton sóng E',
      department: 'Bộ phận Thiết kế & R&D',
      dueDate: '2026-11-08',
      progress: 70,
      status: 'in_progress',
      assigneeName: 'Trần Đình Trọng',
    },
  },
  {
    id: 'notif-approval-03',
    category: 'approvals',
    priority: 'high',
    title: 'Yêu cầu phê duyệt: Nghiệm thu mẫu in ống đồng túi zipper cà phê xuất khẩu',
    message: 'Kỹ sư In Trần Đình Trọng đã gửi yêu cầu duyệt chất lượng mẫu in 8 màu lô hàng cà phê Buôn Ma Thuột.',
    content: `Kính gửi Người phụ trách duyệt chất lượng,

Kỹ sư phụ trách xưởng In vừa gửi phiếu yêu cầu thẩm định nghiệm thu mẫu in ống đồng:

- Sản phẩm: Bao bì túi zipper đáy đứng màng ghép mờ 8 màu thương hiệu Cà phê Buôn Ma Thuột.
- Nội dung kiểm tra:
  + Độ chính xác chồng màu (sai số <= 0.08mm).
  + Độ sai lệch mật độ màu Delta E <= 1.5 theo bảng chuẩn Pantone.
  + Độ khô và bám dính của mực in trên bề mặt màng OPP.
- Mẫu thử nghiệm đã được lưu tại khay KCS ca 1.

Đề nghị Quản đốc xưởng hoặc Trưởng phòng Kỹ thuật xem xét và bấm duyệt phiếu để xưởng tiến hành chạy đại trà.`,
    time: '2 giờ trước',
    createdAt: '2026-11-08T06:30:00Z',
    read: false,
    sender: {
      name: 'Trần Đình Trọng',
      role: 'Kỹ sư In Ống Đồng',
      department: 'Xưởng In & Chế Bản',
      avatarColor: 'bg-blue-600',
      initials: 'TĐT',
    },
    linkedTask: {
      id: 3,
      code: 'CV-2026-015',
      title: 'Thử nghiệm mẫu in ống đồng 8 màu túi zipper cà phê',
      department: 'Xưởng In & Chế Bản',
      dueDate: '2026-11-10',
      progress: 90,
      status: 'in_review',
      assigneeName: 'Trần Đình Trọng',
    },
  },
  {
    id: 'notif-task-04',
    category: 'tasks',
    priority: 'medium',
    title: 'Phản hồi chỉ đạo: Bổ sung 2 kỹ thuật viên ca đêm hỗ trợ đơn hàng bao bì co màng PE',
    message: 'Quản đốc Xưởng Đùn Thổi: Đã điều động 2 nhân sự ca 3 hỗ trợ đảm bảo tiến độ giao hàng.',
    content: `Thông báo điều động nhân sự hỗ trợ tiến độ:

Theo đề xuất của Trưởng ca sản xuất về nguy cơ trễ tiến độ đơn hàng màng co PE lốc nước giải khát:
- Đã phê duyệt tăng cường 02 kỹ thuật viên đùn thổi bậc cao sang hỗ trợ ca đêm (từ 22:00 đến 06:00).
- Mục tiêu: Tăng công suất máy đùn 3 lớp lên 1.8 tấn/ca để kịp giao hàng sáng ngày 14/11.
- Kỹ sư phụ trách máy cần phối hợp bàn giao ca đúng quy trình an toàn vận hành.`,
    time: '3 giờ trước',
    createdAt: '2026-11-08T05:30:00Z',
    read: true,
    sender: {
      name: 'Nguyễn Văn Cảnh',
      role: 'Quản đốc Nhà máy',
      department: 'Khối Sản Xuất',
      avatarColor: 'bg-emerald-600',
      initials: 'NVC',
    },
    linkedTask: {
      id: 4,
      code: 'CV-2026-056',
      title: 'Sản xuất lô màng co PE lốc nước ngọt xuất khẩu',
      department: 'Xưởng Đùn Thổi & Màng Co',
      dueDate: '2026-11-14',
      progress: 60,
      status: 'in_progress',
      assigneeName: 'Nguyễn Văn Cảnh',
    },
  },
  {
    id: 'notif-approval-05',
    category: 'approvals',
    priority: 'medium',
    title: 'Đã nghiệm thu hoàn thành: Thử nghiệm độ bền va đập và chịu lực thùng carton 5 lớp',
    message: 'Kết quả thử nghiệm đạt 100% tiêu chuẩn nén thùng BCT >= 4500N. Công việc đã chuyển sang trạng thái Done.',
    content: `THÔNG BÁO HOÀN TẤT NGHIỆM THU:

Công việc [CV-2026-033] "Thử nghiệm kiểm định độ chịu lực thùng carton 5 lớp pallet xuất khẩu" đã được Trưởng phòng QC phê duyệt nghiệm thu:

- Kết quả kiểm định máy nén thùng tự động: Đạt chỉ số chịu nén 4.620N (yêu cầu >= 4.500N).
- Chỉ số kiểm tra độ chịu bục burst test: 14.5 kgf/cm² (Đạt).
- Biên bản nghiệm thu số KCS-2026/11-04 đã được lưu trữ vào kho hồ sơ chất lượng.
- Công việc đã hoàn thành 100% đúng hạn. Cảm ơn các kỹ sư phụ trách.`,
    time: 'Hôm qua, 16:45',
    createdAt: '2026-11-07T16:45:00Z',
    read: true,
    sender: {
      name: 'Lê Thanh Hương',
      role: 'Trưởng phòng QC',
      department: 'Phòng Quản Lý Chất Lượng',
      avatarColor: 'bg-purple-600',
      initials: 'LTH',
    },
    linkedTask: {
      id: 5,
      code: 'CV-2026-033',
      title: 'Thử nghiệm kiểm định độ chịu lực thùng carton 5 lớp pallet xuất khẩu',
      department: 'Phòng Quản Lý Chất Lượng (QC)',
      dueDate: '2026-11-07',
      progress: 100,
      status: 'done',
      assigneeName: 'Lê Thanh Hương',
    },
  },
  {
    id: 'notif-system-06',
    category: 'system',
    priority: 'high',
    title: 'Thông báo bảo trì định kỳ hệ thống máy chủ ERP & Cơ sở dữ liệu ETPMS',
    message: 'Hệ thống sẽ bảo trì nâng cấp cụm cơ sở dữ liệu tốc độ cao vào lúc 23:00 Chủ Nhật ngày 15/11/2026.',
    content: `THÔNG BÁO TỪ BỘ PHẬN CÔNG NGHỆ THÔNG TIN (IT & DEVOPS):

Nhằm nâng cấp hiệu năng cơ sở dữ liệu, tối ưu hóa bảng dữ liệu lớn và triển khai bộ sao lưu dữ liệu tự động định kỳ:

- Thời gian bảo trì: Từ 23:00 Chủ Nhật (15/11/2026) đến 02:00 sáng Thứ Hai (16/11/2026).
- Phạm vi ảnh hưởng: Trong khoảng thời gian trên, hệ thống Web ERP và API đồng bộ dữ liệu sẽ tạm dừng hoạt động khoảng 45 phút.
- Khuyến nghị: Các phòng ban vui lòng lưu lại toàn bộ bảng kiểm tra checklist và nhật ký công việc trước 22:45 cùng ngày.

Mọi thắc mắc vui lòng liên hệ trực tiếp Bộ phận IT qua số nội bộ 102.`,
    time: 'Hôm qua, 10:15',
    createdAt: '2026-11-07T10:15:00Z',
    read: true,
    sender: {
      name: 'Bộ Phận IT & Hệ Thống',
      role: 'Quản trị hạ tầng',
      department: 'Công Nghệ Thông Tin',
      avatarColor: 'bg-slate-700',
      initials: 'IT',
    },
    linkedTask: null,
  },
  {
    id: 'notif-deadline-07',
    category: 'deadlines',
    priority: 'urgent',
    title: 'Cảnh báo quá hạn: Công việc [CV-2026-008] Quá hạn 2 ngày chưa nộp biên bản',
    message: 'Nhiệm vụ "Bảo dưỡng phòng ngừa máy dán miệng túi định hình" đã vượt quá thời hạn quy định.',
    content: `CẢNH BÁO VI PHẠM THỜI HẠN CÔNG VIỆC:

Công việc [CV-2026-008] "Bảo dưỡng phòng ngừa định kỳ máy dán miệng túi định hình tự động" hiện tại đã QUÁ HẠN 02 NGÀY (Hạn chót: 05/11/2026).

- Tình trạng ghi nhận: Trạng thái vẫn đang ở "In Progress (65%)".
- Chưa có báo cáo tiến độ cập nhật trong 48 giờ qua.
- Yêu cầu: Kỹ sư phụ trách lập tức cập nhật tình hình thực tế, các khó khăn phát sinh hoặc gửi đề xuất hỗ trợ thiết bị thay thế khẩn cấp.`,
    time: '06/11/2026',
    createdAt: '2026-11-06T14:20:00Z',
    read: true,
    sender: {
      name: 'Ban Kiểm Soát Nội Bộ',
      role: 'Giám sát tiến độ',
      department: 'Ban Kiểm Soát',
      avatarColor: 'bg-rose-700',
      initials: 'BKS',
    },
    linkedTask: {
      id: 6,
      code: 'CV-2026-008',
      title: 'Bảo dưỡng phòng ngừa định kỳ máy dán miệng túi định hình tự động',
      department: 'Bộ phận Cơ Điện & Bảo Trì',
      dueDate: '2026-11-05',
      progress: 65,
      status: 'in_progress',
      assigneeName: 'Nguyễn Văn Thắng',
    },
  },
  {
    id: 'notif-system-08',
    category: 'system',
    priority: 'low',
    title: 'Cập nhật chính sách an toàn lao động và phòng cháy chữa cháy xưởng In tháng 11',
    message: 'Tất cả cán bộ công nhân viên xưởng In và Ghép màng bắt buộc xem và xác nhận tài liệu an toàn mới.',
    content: `Thông báo phổ biến quy định an toàn lao động:

Ban An Toàn Vệ Sinh Lao Động (HSE) ban hành cập nhật nội quy an toàn xưởng In & Tráng Ghép màng:
1. Nghiêm cấm sử dụng các thiết bị sinh lửa, sinh nhiệt trong bán kính 25m khu vực pha chế dung môi mực in (Ethyl Acetate, Toluene).
2. Kiểm tra dây tiếp địa khử tĩnh điện trên tất cả các cuộn màng xả/thu của máy in trước khi bấm máy chạy tốc độ cao.
3. Yêu cầu 100% công nhân vận hành đeo khẩu trang hoạt tính và găng tay chống dung môi chuyên dụng.

Tài liệu chi tiết đính kèm đã được cập nhật trên cổng Thông tin nội bộ.`,
    time: '05/11/2026',
    createdAt: '2026-11-05T09:00:00Z',
    read: true,
    sender: {
      name: 'Ban An Toàn Lao Động (HSE)',
      role: 'Phòng ngừa rủi ro',
      department: 'Ban An Toàn',
      avatarColor: 'bg-teal-600',
      initials: 'HSE',
    },
    linkedTask: null,
  },
];

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || 'all';

  const [activeTab, setActiveTab] = useState(urlTab);
  const [notifications, setNotifications] = useState(() => {
    try {
      const cached = localStorage.getItem('etpms_user_notifications');
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_NOTIFICATIONS;
  });

  // Tìm kiếm & Bộ lọc
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Thông báo đang được chọn ở cột bên phải (Selected Notification)
  const [selectedId, setSelectedId] = useState(() => {
    return notifications[0]?.id || null;
  });

  // Mobile split view toggle (Khi ở mobile, bấm vào item mở detail fullscreen)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Mở in-screen workspace nếu click "Xem chi tiết công việc"
  const [workspaceTaskId, setWorkspaceTaskId] = useState(null);

  // Lưu notifications vào localStorage khi có thay đổi
  const persistNotifications = (nextList) => {
    setNotifications(nextList);
    try {
      localStorage.setItem('etpms_user_notifications', JSON.stringify(nextList));
    } catch {}
  };

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const next = new URLSearchParams(searchParams);
    if (tabId === 'all') {
      next.delete('tab');
    } else {
      next.set('tab', tabId);
    }
    setSearchParams(next, { replace: true });
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllRead = () => {
    const next = notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(next);
    notify.success('Đã đánh dấu tất cả thông báo là đã đọc.');
  };

  // Đánh dấu 1 thông báo là đã đọc / chưa đọc
  const handleToggleRead = (id, e) => {
    e?.stopPropagation();
    const next = notifications.map((n) => {
      if (n.id === id) {
        return { ...n, read: !n.read };
      }
      return n;
    });
    persistNotifications(next);
  };

  // Xóa 1 thông báo
  const handleDeleteNotif = (id, e) => {
    e?.stopPropagation();
    const next = notifications.filter((n) => n.id !== id);
    persistNotifications(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id || null);
    }
    notify.success('Đã xóa thông báo khỏi hộp thư.');
  };

  // Khôi phục danh sách thông báo mẫu ban đầu
  const handleResetNotifications = () => {
    persistNotifications(INITIAL_NOTIFICATIONS);
    setSelectedId(INITIAL_NOTIFICATIONS[0]?.id || null);
    notify.success('Đã nạp lại toàn bộ lịch sử thông báo mẫu.');
  };

  // Lọc thông báo theo tab, search, priority
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Tab filter
      if (activeTab === 'unread' && n.read) return false;
      if (activeTab === 'tasks' && n.category !== 'tasks') return false;
      if (activeTab === 'deadlines' && n.category !== 'deadlines') return false;
      if (activeTab === 'approvals' && n.category !== 'approvals') return false;
      if (activeTab === 'system' && n.category !== 'system') return false;

      // 2. Priority filter
      if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;

      // 3. Search query
      if (search) {
        const q = search.toLowerCase();
        const match =
          (n.title || '').toLowerCase().includes(q) ||
          (n.message || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q) ||
          (n.sender?.name || '').toLowerCase().includes(q) ||
          (n.linkedTask?.code || '').toLowerCase().includes(q) ||
          (n.linkedTask?.title || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [notifications, activeTab, priorityFilter, search]);

  // Thông báo được chọn
  const selectedNotification = useMemo(() => {
    return notifications.find((n) => n.id === selectedId) || filteredNotifications[0] || null;
  }, [notifications, selectedId, filteredNotifications]);

  // Khi người dùng click vào 1 thông báo
  const handleSelectNotification = (n) => {
    setSelectedId(n.id);
    setMobileDetailOpen(true);
    // Tự động đánh dấu đã đọc khi xem
    if (!n.read) {
      const next = notifications.map((item) => (item.id === n.id ? { ...item, read: true } : item));
      persistNotifications(next);
    }
  };

  // Sao chép nội dung thông báo
  const handleCopyContent = () => {
    if (!selectedNotification) return;
    const text = `${selectedNotification.title}\n\n${selectedNotification.content || selectedNotification.message}`;
    navigator.clipboard?.writeText(text);
    notify.success('Đã sao chép nội dung thông báo vào clipboard!');
  };

  // Icon hiển thị theo loại thông báo
  const getCategoryIcon = (category, priority) => {
    if (priority === 'urgent' || category === 'deadlines') {
      return <Clock size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />;
    }
    if (category === 'approvals') {
      return <ShieldCheck size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />;
    }
    if (category === 'tasks') {
      return <UserCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />;
    }
    return <Bell size={16} className="text-slate-600 dark:text-slate-400 shrink-0" />;
  };

  // Đếm số thông báo chưa đọc
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Nếu người dùng bấm "Xem chi tiết công việc liên quan" -> Mở TaskDetailPage Workspace!
  if (workspaceTaskId) {
    return (
      <TaskDetailPage
        taskId={workspaceTaskId}
        onBack={() => setWorkspaceTaskId(null)}
        onTaskUpdated={() => {
          // reload tasks if needed
        }}
      />
    );
  }

  return (
    <ManagementFrame
      header={
        <div className="flex items-center justify-between gap-3 w-full flex-wrap">
          {/* Header Left: Tabs danh mục */}
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
            {NOTIF_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const count =
                tab.id === 'all'
                  ? notifications.length
                  : tab.id === 'unread'
                  ? unreadCount
                  : notifications.filter((n) => n.category === tab.id).length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active
                        ? 'bg-white/25 text-white'
                        : tab.id === 'unread' && count > 0
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Header Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Đánh dấu tất cả thông báo là đã đọc"
            >
              <CheckCheck size={14} className="text-emerald-600" />
              <span className="hidden sm:inline">Đã đọc tất cả</span>
            </button>

            <button
              type="button"
              onClick={handleResetNotifications}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition cursor-pointer"
              title="Nạp lại lịch sử thông báo mẫu"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-72 max-w-full">
            <SearchInput
              size="sm"
              value={searchDraft}
              onChange={(e) => setSearchDraft(typeof e === 'string' ? e : e?.target?.value ?? '')}
              onClear={() => {
                setSearchDraft('');
                setSearch('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setSearch(searchDraft.trim());
                }
              }}
              placeholder="Tìm kiếm nội dung thông báo, người gửi, mã CV..."
            />
          </div>

          <button
            type="button"
            onClick={() => setSearch(searchDraft.trim())}
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition cursor-pointer"
            title="Tìm kiếm"
          >
            <Search size={14} />
          </button>

          <Select
            size="sm"
            className="w-40 font-medium text-xs"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e?.target?.value ?? e)}
            options={[
              { value: 'all', label: 'Tất cả mức độ' },
              { value: 'urgent', label: 'Khẩn cấp / Nguy cấp' },
              { value: 'high', label: 'Quan trọng' },
              { value: 'medium', label: 'Bình thường' },
            ]}
          />

          {(search || priorityFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchDraft('');
                setSearch('');
                setPriorityFilter('all');
              }}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition cursor-pointer"
              title="Xóa bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      }
      status={
        <TableStatusFooter
          title="Thông báo"
          totalCount={notifications.length}
          unit="thông báo"
          leftExtra={
            <span className="text-slate-500 dark:text-slate-400">
              (Hiển thị {filteredNotifications.length} / {notifications.length} thông báo{unreadCount > 0 ? ` · ${unreadCount} chưa đọc` : ''})
            </span>
          }
        />
      }
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* KHUNG GIAO DIỆN HỘP THƯ ĐẾN SPLIT-PANE 2 CỘT CHUẨN MASTER-DETAIL */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex h-full w-full overflow-hidden bg-white dark:bg-slate-950">
        {/* ========================================================= */}
        {/* CỘT TRÁI: MASTER LIST (DANH SÁCH THÔNG BÁO)               */}
        {/* ========================================================= */}
        <div
          className={`${
            mobileDetailOpen ? 'hidden md:flex' : 'flex'
          } w-full md:w-[420px] lg:w-[460px] shrink-0 h-full flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden`}
        >
          {/* Header nhỏ trên danh sách */}
          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Danh sách thông báo
            </span>
            <span className="text-[11px]">
              {unreadCount > 0 ? (
                <strong className="text-rose-600 dark:text-rose-400">{unreadCount} tin mới</strong>
              ) : (
                'Đã đọc tất cả'
              )}
            </span>
          </div>

          {/* Vùng cuộn danh sách thông báo */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-2">
                <Inbox size={36} className="text-slate-300 dark:text-slate-600 mb-1" />
                <p className="text-sm font-semibold">Không có thông báo nào</p>
                <p className="text-xs text-slate-400">Không tìm thấy thông báo phù hợp với bộ lọc hiện tại.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isSelected = selectedNotification?.id === notif.id;
                const isUnread = !notif.read;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleSelectNotification(notif)}
                    className={`group relative p-3 sm:p-3.5 transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                        : isUnread
                        ? 'bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60 border-l-4 border-rose-500'
                        : 'bg-slate-50/40 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-900/50 border-l-4 border-transparent'
                    }`}
                  >
                    {/* Hàng 1: Người gửi + Badge danh mục + Thời gian */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getCategoryIcon(notif.category, notif.priority)}
                        <span className={`truncate font-semibold ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                          {notif.sender?.name || 'Hệ thống ETPMS'}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Chưa đọc" />
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                        {notif.time}
                      </span>
                    </div>

                    {/* Hàng 2: Tiêu đề thông báo */}
                    <h4
                      className={`text-xs leading-snug line-clamp-1 mb-1 ${
                        isUnread
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {notif.title}
                    </h4>

                    {/* Hàng 3: Trích dẫn nội dung */}
                    <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                      {notif.message}
                    </p>

                    {/* Hàng 4: Tag & Hover Actions */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60 dark:border-slate-800/60 text-[10.5px]">
                      {notif.linkedTask ? (
                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 truncate max-w-[180px]">
                          [{notif.linkedTask.code}] {notif.linkedTask.department}
                        </span>
                      ) : (
                        <span className="text-slate-400">Thông báo chung</span>
                      )}

                      {/* Nút hành động nhanh khi hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(notif.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60 transition cursor-pointer"
                          title={notif.read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                        >
                          {notif.read ? <Mail size={12} /> : <Check size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotif(notif.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa thông báo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI: DETAIL PANE (CHI TIẾT NỘI DUNG THÔNG BÁO)       */}
        {/* FULL LAYOUT PHẲNG, TRÀN VIỀN, KHÔNG BO GÓC ĐÓNG KHUNG     */}
        {/* ========================================================= */}
        <div
          className={`${
            mobileDetailOpen ? 'flex' : 'hidden md:flex'
          } flex-1 h-full flex-col bg-white dark:bg-slate-950 overflow-hidden`}
        >
          {selectedNotification ? (
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Nút quay lại trên Mobile */}
              <div className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setMobileDetailOpen(false)}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Quay lại danh sách
                </button>
              </div>

              {/* Thanh Header chi tiết: Icon + Danh mục + Actions (Tràn viền, viền dưới phẳng) */}
              <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                    {getCategoryIcon(selectedNotification.category, selectedNotification.priority)}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {NOTIF_TABS.find((t) => t.id === selectedNotification.category)?.label || 'Thông báo làm việc'}
                    </span>
                    {selectedNotification.priority === 'urgent' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                        <AlertTriangle size={11} /> Khẩn cấp
                      </span>
                    )}
                    {selectedNotification.priority === 'high' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                        Ưu tiên cao
                      </span>
                    )}
                  </div>
                </div>

                {/* Nút tác vụ chi tiết */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleRead(selectedNotification.id, e)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 text-xs font-medium transition cursor-pointer"
                    title={selectedNotification.read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                  >
                    {selectedNotification.read ? <Mail size={13} /> : <Check size={13} />}
                    <span className="hidden sm:inline">{selectedNotification.read ? 'Chưa đọc' : 'Đã đọc'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyContent}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition cursor-pointer"
                    title="Sao chép nội dung"
                  >
                    <Copy size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteNotif(selectedNotification.id, e)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                    title="Xóa thông báo này"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Vùng nội dung chi tiết (Cuộn toàn bộ, Full Width, Phẳng hoàn toàn) */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Tiêu đề thông báo */}
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                    {selectedNotification.title}
                  </h2>
                </div>

                {/* Thông tin Người gửi & Thời gian nhận (Thanh ngang phẳng) */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                        selectedNotification.sender?.avatarColor || 'bg-emerald-600'
                      }`}
                    >
                      {selectedNotification.sender?.initials || 'NV'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {selectedNotification.sender?.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedNotification.sender?.role} {selectedNotification.sender?.department ? `· ${selectedNotification.sender?.department}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-slate-500 text-xs shrink-0">
                    <div>{selectedNotification.time}</div>
                    <div className="text-[11px] text-slate-400">{new Date(selectedNotification.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                </div>

                {/* Nội dung chi tiết thông báo (Full layout phẳng, không viền đóng hộp) */}
                <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedNotification.content || selectedNotification.message}
                </div>

                {/* Card Liên kết Công việc (Thiết kế phẳng viền mảnh) */}
                {selectedNotification.linkedTask && (
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={13} /> Công việc liên kết
                      </span>
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {selectedNotification.linkedTask.code}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedNotification.linkedTask.title}
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Phòng ban:</span>
                        <strong className="text-slate-800 dark:text-slate-200 truncate block">
                          {selectedNotification.linkedTask.department}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Hạn chót:</span>
                        <strong className="text-slate-800 dark:text-slate-200 block">
                          {new Date(selectedNotification.linkedTask.dueDate).toLocaleDateString('vi-VN')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Người thực hiện:</span>
                        <strong className="text-slate-800 dark:text-slate-200 truncate block">
                          {selectedNotification.linkedTask.assigneeName}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Tiến độ hiện tại:</span>
                        <strong className="text-emerald-600 block">
                          {selectedNotification.linkedTask.progress}%
                        </strong>
                      </div>
                    </div>

                    {/* Nút Mở Chi Tiết Công Việc */}
                    <div className="pt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setWorkspaceTaskId(selectedNotification.linkedTask.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition cursor-pointer"
                      >
                        <ExternalLink size={13} /> Mở chi tiết công việc
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State khi chưa chọn thông báo */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3">
              <MailOpen size={48} className="text-slate-300 dark:text-slate-600" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Chọn một thông báo từ danh sách bên trái
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Bấm vào thông báo để xem toàn bộ nội dung, chỉ đạo công việc hoặc mở liên kết công việc liên quan.
              </p>
            </div>
          )}
        </div>
      </div>
    </ManagementFrame>
  );
}
