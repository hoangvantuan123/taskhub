export const INITIAL_TEAMS = [
  {
    id: 'TEAM-001',
    code: 'TEAM-RD',
    name: 'Đội R&D Vật liệu màng phức hợp',
    department: 'Kỹ thuật',
    leader: 'Trần Kỹ Sư',
    memberCount: 6,
    activeProjects: 3,
    description: 'Nghiên cứu công nghệ tráng ghép màng nhiệt đa lớp và thử nghiệm độ bám dính mực in ống đồng.',
    members: [
      { id: 'NV-101', code: 'NV-101', name: 'Trần Kỹ Sư', role: 'Trưởng nhóm', position: 'Kỹ sư trưởng R&D' },
      { id: 'NV-102', code: 'NV-102', name: 'Lê Văn An', role: 'Kỹ sư chính', position: 'Kỹ sư công nghệ polyme' },
      { id: 'NV-103', code: 'NV-103', name: 'Phạm Bình', role: 'Thành viên', position: 'Kỹ sư hóa nghiệm' },
      { id: 'NV-104', code: 'NV-104', name: 'Nguyễn Cường', role: 'Thành viên', position: 'Kỹ thuật viên phòng lab' },
      { id: 'NV-105', code: 'NV-105', name: 'Hoàng Dung', role: 'Thư ký', position: 'Chuyên viên tài liệu ISO' },
      { id: 'NV-106', code: 'NV-106', name: 'Vũ Đức', role: 'Thành viên', position: 'Kỹ sư cơ điện' },
    ],
  },
  {
    id: 'TEAM-002',
    code: 'TEAM-QC-NM2',
    name: 'Tổ Kiểm định chất lượng NM2 - Hưng Yên',
    department: 'Quản lý chất lượng (QA/QC)',
    leader: 'Nguyễn Văn Kiểm',
    memberCount: 8,
    activeProjects: 2,
    description: 'Giám sát chỉ tiêu cơ lý, độ bền kéo đứt màng BOPP và kiểm tra ngoại quan thành phẩm cuộn.',
    members: [
      { id: 'NV-201', code: 'NV-201', name: 'Nguyễn Văn Kiểm', role: 'Trưởng nhóm', position: 'Tổ trưởng QA/QC' },
      { id: 'NV-202', code: 'NV-202', name: 'Trần Thị Hà', role: 'Kỹ sư chính', position: 'Chuyên viên kiểm tra nguyên liệu' },
      { id: 'NV-203', code: 'NV-203', name: 'Đỗ Hùng', role: 'Thành viên', position: 'KCS dây chuyền in ống đồng' },
      { id: 'NV-204', code: 'NV-204', name: 'Bùi Mai', role: 'Thành viên', position: 'KCS dây chuyền chia cuộn' },
    ],
  },
  {
    id: 'TEAM-003',
    code: 'TEAM-IN-OD',
    name: 'Tổ Vận hành Máy in Ống đồng 8 màu',
    department: 'Sản xuất',
    leader: 'Vũ Thợ Cả',
    memberCount: 10,
    activeProjects: 4,
    description: 'Chịu trách nhiệm trực tiếp ca sản xuất in ấn bao bì thực phẩm sạch, canh màu và bảo dưỡng trục in.',
    members: [
      { id: 'NV-301', code: 'NV-301', name: 'Vũ Thợ Cả', role: 'Trưởng nhóm', position: 'Tổ trưởng máy in' },
      { id: 'NV-302', code: 'NV-302', name: 'Lê Minh', role: 'Kỹ sư chính', position: 'Thợ trưởng pha mực' },
      { id: 'NV-303', code: 'NV-303', name: 'Nguyễn Nam', role: 'Thành viên', position: 'Vận hành tháo lắp trục in' },
    ],
  },
  {
    id: 'TEAM-004',
    code: 'TEAM-IT-ERP',
    name: 'Đội Triển khai Hệ thống Số hóa & ERP',
    department: 'CNTT',
    leader: 'Phạm Quản Trị',
    memberCount: 5,
    activeProjects: 2,
    description: 'Phát triển module quản lý sản xuất, tích hợp cân tự động và hệ thống quản lý công việc ETPMS.',
    members: [
      { id: 'NV-401', code: 'NV-401', name: 'Phạm Quản Trị', role: 'Trưởng nhóm', position: 'Trưởng nhóm giải pháp phần mềm' },
      { id: 'NV-402', code: 'NV-402', name: 'Trần Lập Trình', role: 'Kỹ sư chính', position: 'Kỹ sư Backend Go/PostgreSQL' },
      { id: 'NV-403', code: 'NV-403', name: 'Lê Giao Diện', role: 'Thành viên', position: 'Kỹ sư Frontend React' },
    ],
  },
];

export const TEAM_COLUMNS = [
  { id: 'code', label: 'Mã nhóm', width: 140 },
  { id: 'name', label: 'Tên nhóm làm việc', width: 300 },
  { id: 'department', label: 'Phòng ban trực thuộc', width: 190 },
  { id: 'leader', label: 'Trưởng nhóm / Phụ trách', width: 180 },
  { id: 'memberCountText', label: 'Quy mô', width: 130 },
  { id: 'activeProjectsText', label: 'Dự án tham gia', width: 150 },
  { id: 'description', label: 'Mô tả nhiệm vụ trọng tâm', width: 340 },
];

export const MEMBER_COLUMNS = [
  { id: 'code', label: 'Mã NV', width: 120 },
  { id: 'name', label: 'Họ và tên nhân sự', width: 220 },
  { id: 'teamName', label: 'Thuộc nhóm làm việc', width: 250 },
  { id: 'role', label: 'Vai trò trong nhóm', width: 160 },
  { id: 'position', label: 'Chức danh chuyên môn', width: 220 },
  { id: 'department', label: 'Phòng ban', width: 180 },
];

