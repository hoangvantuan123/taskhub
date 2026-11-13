const fs = require('fs');

// Read SVG Data URIs
const svgUris = {
  npnSensor: "data:image/svg+xml;base64,...",
  currentLoop: "data:image/svg+xml;base64,...",
  hscTiming: "data:image/svg+xml;base64,...",
  profinetTopo: "data:image/svg+xml;base64,...",
  scadaAlarm: "data:image/svg+xml;base64,...",
  batchGenealogy: "data:image/svg+xml;base64,...",
  oeeWaterfall: "data:image/svg+xml;base64,...",
  lotoSafety: "data:image/svg+xml;base64,..."
};

// If svgDataUris.json exists, read it
try {
  const loaded = JSON.parse(fs.readFileSync(__dirname + '/svgDataUris.json', 'utf8'));
  Object.assign(svgUris, loaded);
} catch (e) {}

// Let's create an array of folders
const folders = [
  {
    SampleKey: "sample-fld-l0-sensors",
    Name: "Khối L0 — Cảm biến & Thiết bị hiện trường (Công nhân sản xuất)",
    Description: "Ngân hàng câu hỏi về cảm biến quang, tiệm cận, tín hiệu analog 4-20mA, cặp nhiệt điện PT100/TC và mạch đấu nối 24VDC cho công nhân & kỹ thuật máy.",
    LevelCode: "L0",
  },
  {
    SampleKey: "sample-fld-l1-plc-control",
    Name: "Khối L1 — Lập trình PLC & Vận hành Chấp hành (Công nhân sản xuất)",
    Description: "Logic chấp hành PLC, ngắt phần cứng Hardware Interrupt, bộ đếm tốc độ cao HSC, biến tần, servo và an toàn máy Fail-Safe cho công nhân & kỹ thuật viên.",
    LevelCode: "L1",
  },
  {
    SampleKey: "sample-fld-scada-opcua",
    Name: "Khối L2 — Giám sát SCADA & Trạm HMI (Công nhân & Điều độ sản xuất)",
    Description: "Giao diện HMI cảm ứng, thu thập dữ liệu thời gian thực OPC-UA DA/HA, đồ thị trend telemetry, quản lý cảnh báo Alarm và điều độ trạm trộn cho điều độ viên.",
    LevelCode: "L2",
  },
  {
    SampleKey: "sample-fld-mes-isa95",
    Name: "Khối L3 — Điều độ Lệnh sản xuất & Batch Genealogy (Điều độ sản xuất)",
    Description: "Kiến trúc ISA-95/Purdue, điều độ lệnh sản xuất Work Order, phả hệ mẻ nguyên liệu Batch Genealogy, cân bằng chuyền và tích hợp B2MML cho điều độ viên.",
    LevelCode: "L3",
  },
  {
    SampleKey: "sample-fld-quality-spc",
    Name: "Khối L3 — Quản trị Hiệu suất OEE & Kiểm soát Chất lượng SPC (Quản lý sản xuất)",
    Description: "Tính toán chỉ số OEE 3 thành phần (A, P, Q), biểu đồ kiểm soát SPC X-bar/R, phân tích năng lực Cpk, MTBF/MTTR và quản lý phế phẩm cho quản lý sản xuất.",
    LevelCode: "L3",
  },
  {
    SampleKey: "sample-fld-safety-critical",
    Name: "Khối Điểm liệt — An toàn Lao động & Vận hành Nhà máy (Bắt buộc mọi vị trí)",
    Description: "Bộ câu hỏi điểm liệt bắt buộc đúng 100%, quy tắc dừng khẩn cấp E-Stop, khóa nguồn Lockout/Tagout, an toàn điện và an toàn tính mạng cho toàn bộ nhân sự.",
    LevelCode: "All",
  },
];

console.log('Folders defined:', folders.length);
