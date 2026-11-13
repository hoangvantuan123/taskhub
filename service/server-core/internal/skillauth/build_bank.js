const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Read SVG URIs
let svgUris = {
  npnSensor: '',
  currentLoop: '',
  hscTiming: '',
  profinetTopo: '',
  scadaAlarm: '',
  batchGenealogy: '',
  oeeWaterfall: '',
  lotoSafety: ''
};
try {
  svgUris = JSON.parse(fs.readFileSync(path.join(__dirname, 'svgDataUris.json'), 'utf8'));
} catch (e) {}

// 2. Define the 8 Standard Folders matching Goldsun Smart Factory & ISA-95 Levels
const sampleFolders = [
  {
    SampleKey: "sample-fld-l0-sensors",
    Name: "Khối L0 — Cảm biến & Thiết bị hiện trường",
    Description: "Ngân hàng câu hỏi về cảm biến quang, tiệm cận, tín hiệu analog 4-20mA, cặp nhiệt điện PT100/TC và mạch đấu nối 24VDC.",
    LevelCode: "L0",
  },
  {
    SampleKey: "sample-fld-l1-plc-control",
    Name: "Khối L1 — Lập trình PLC & Mạng truyền thông Công nghiệp",
    Description: "Logic chấp hành PLC, ngắt phần cứng Hardware Interrupt, bộ đếm tốc độ cao HSC, mạng Profinet và logic an toàn máy Fail-Safe.",
    LevelCode: "L1",
  },
  {
    SampleKey: "sample-fld-scada-opcua",
    Name: "Khối L2 — Giám sát SCADA & Trạm HMI Thông minh",
    Description: "Giao diện HMI cảm ứng, thu thập dữ liệu thời gian thực OPC-UA DA/HA, đồ thị trend telemetry, quản lý cảnh báo Alarm và điều khiển vận hành.",
    LevelCode: "L2",
  },
  {
    SampleKey: "sample-fld-sec-oauth",
    Name: "Khối L2 — Bảo mật Mạng Công nghiệp OT/IT & An toàn Phiên",
    Description: "Nguyên lý phân tầng Purdue, bảo mật IEC 62443, xác thực HttpOnly Cookie, bảo vệ kết nối OPC-UA và phòng chống tấn công mạng xưởng.",
    LevelCode: "L2",
  },
  {
    SampleKey: "sample-fld-mes-isa95",
    Name: "Khối L3 — Hệ thống Điều hành Sản xuất (MES & Chuẩn ISA-95)",
    Description: "Kiến trúc ISA-95/Purdue Model, điều độ lệnh sản xuất Work Order, phả hệ mẻ nguyên vật liệu Batch Genealogy và tích hợp B2MML ERP.",
    LevelCode: "L3",
  },
  {
    SampleKey: "sample-fld-quality-spc",
    Name: "Khối L2 — Kiểm soát Chất lượng Công đoạn SPC & Hiệu suất Thiết bị OEE",
    Description: "Công thức và tình huống thực tế về tính toán OEE, biểu đồ kiểm soát SPC và phả hệ truy vết nguyên vật liệu (Genealogy).",
    LevelCode: "L2",
  },
  {
    SampleKey: "sample-fld-arch-clean",
    Name: "Khối L3 — Kiến trúc Phần mềm Modular Monolith & Giao dịch Idempotency",
    Description: "Nguyên lý thiết kế hệ thống lõi bền vững, cơ chế Idempotency API và kiểm soát xung đột phiên bản RowVersion.",
    LevelCode: "L3",
  },
  {
    SampleKey: "sample-fld-safety-critical",
    Name: "Khối Điểm liệt — Quy chuẩn An toàn Vận hành & LOTO Tuyệt đối",
    Description: "Bộ câu hỏi điểm liệt bắt buộc đúng 100%, quy tắc dừng khẩn cấp E-Stop, khóa nguồn Lockout/Tagout và an toàn tính mạng tuyệt đối.",
    LevelCode: "All",
  },
];

const questions = [];

function addQ({
  key, folder, level, format = 'theory', specialty = 'MES', topic = 'mes-scada-opcua',
  group = 'worker', cog = 'comprehension', content, explanation, type = 'single_choice',
  options, rubrics, simType = '', isCrit = false, critReason = '', image = '', status = 'published'
}) {
  questions.push({
    SampleKey: key,
    FolderSampleKey: folder,
    LevelCode: level,
    FormatCode: format,
    SpecialtyCode: specialty,
    TopicCode: topic,
    TargetGroupCode: group,
    CognitiveLevelCode: cog,
    Content: content,
    Explanation: explanation,
    Type: type,
    Options: options || [],
    Rubrics: rubrics || [],
    SimulationType: simType,
    IsCritical: isCrit,
    CriticalReason: critReason,
    ImageUrl: image,
    Status: status,
  });
}

// =================================================================================================
// 1. FOLDER L0: SENSORS & FIELD DEVICES (90 questions) - Group: worker & MES-ENG-26
// =================================================================================================
const fld0 = 'sample-fld-l0-sensors';
const l0MCQDefs = [
  { t: "Khoảng cách phát hiện danh định của cảm biến tiệm cận từ M18 đối với phôi thép carbon là 8mm. Khi chuyển sang phát hiện phôi nhôm, khoảng cách phát hiện thực tế sẽ thay đổi thế nào?",
    c: "Giảm còn khoảng 3.2 - 4.0 mm do hệ số suy giảm (Reduction Factor) của nhôm là 0.4 - 0.5.",
    w: ["Tăng lên gấp đôi thành 16mm", "Giữ nguyên không đổi đúng 8mm", "Không phát hiện được bất kỳ khoảng cách nào"],
    e: "Vật liệu kim loại màu (nhôm, đồng) có độ từ thẩm thấp hơn sắt từ, hệ số suy giảm khoảng 0.4 - 0.5." },
  { t: "Đặc điểm khác biệt cốt lõi giữa cảm biến tiệm cận lắp chìm (Flush/Shielded) và lắp nổi (Non-flush/Unshielded) trên khung máy kim loại là gì?",
    c: "Cảm biến lắp chìm có lớp bọc kim loại chống nhiễu từ xung quanh nên có thể lắp phẳng mặt với kết cấu kim loại máy mà không bị báo giả.",
    w: ["Cảm biến lắp chìm có khoảng cách phát hiện xa gấp 5 lần cảm biến lắp nổi", "Cảm biến lắp chìm không cần cấp nguồn 24VDC", "Cảm biến lắp nổi chỉ dùng được dưới nước"],
    e: "Flush sensor có vòng chắn từ trường bên hông, cho phép gắn chìm trong kim loại. Non-flush có từ trường tỏa rộng hơn nhưng phải lắp nhô ra ngoài." },
  { t: "Khi cảm biến quang thu phát chung (Diffuse Reflection) liên tục báo có sản phẩm dù băng chuyền trống, nguyên nhân kỹ thuật phổ biến nhất là gì?",
    c: "Độ nhạy (Sensitivity) cài quá cao khiến cảm biến bắt nền (Background) hoặc bề mặt băng tải bám bụi phản xạ ánh sáng.",
    w: ["Điện áp nguồn 24VDC bị giảm xuống 12V", "Cáp tín hiệu bị đứt ngầm", "Đèn LED hiển thị trên cảm biến bị cháy"],
    e: "Cảm biến Diffuse đo lượng sáng phản xạ ngược lại từ vật thể; nếu chỉnh ngưỡng quá nhạy hoặc có bụi bẩn phản xạ nền sẽ gây tín hiệu giả." },
  { t: "Cảm biến quang loại phản xạ gương (Retro-reflective) kèm bộ lọc phân cực (Polarizing Filter) có ưu thế vượt trội gì khi phát hiện các vật thể sáng bóng (như cuộn màng nhôm, lon inox)?",
    c: "Bộ lọc phân cực xoay góc 90 độ của chùm tia phản xạ từ gương, giúp loại bỏ phản xạ gương giả từ bề mặt bóng của vật thể.",
    w: ["Cho phép xuyên thấu qua lớp kim loại dày 10mm", "Tăng tốc độ băng tải lên gấp 10 lần", "Tự động phát ra ánh sáng huỳnh quang trong bóng tối"],
    e: "Gương phản xạ đặc biệt làm xoay góc phân cực 90 độ, vật thể bóng phản xạ không đổi góc nên bị thấu kính phân cực triệt tiêu, ngăn ngừa báo nhầm." },
  { t: "Cảm biến tiệm cận điện dung (Capacitive Proximity Sensor) thường được chọn để phát hiện đối tượng nào sau đây trong xưởng dán bao bì carton?",
    c: "Mức keo dán trong bồn nhựa trong suốt hoặc phát hiện phôi giấy carton không chứa kim loại.",
    w: ["Tốc độ quay của trục động cơ 3000 vòng/phút", "Điện áp xoay chiều 220V", "Lực kéo căng màng giấy cuộn"],
    e: "Cảm biến điện dung phát hiện sự biến thiên hằng số điện môi (Dielectric constant), dùng rất tốt cho chất lỏng, keo, hạt nhựa, giấy." },
  { t: "Trong hệ thống đo nhiệt độ buồng sấy Flexo bằng can nhiệt RTD PT100, nguyên lý đấu nối 3 dây (3-wire connection) có tác dụng gì quan trọng?",
    c: "Bù trừ điện trở của dây dẫn đường dài, giúp loại bỏ sai số nhiệt độ đo được tại bộ điều khiển.",
    w: ["Cung cấp thêm điện áp 220V dự phòng khi mất điện", "Giúp tăng gấp 3 lần tốc độ truyền tín hiệu", "Làm nóng đầu dò can nhiệt để sấy khô"],
    e: "Mạch cầu Wheatstone 3 dây triệt tiêu điện trở của dây nối (Line resistance compensation), đảm bảo độ chính xác đo nhiệt." },
  { t: "Cặp nhiệt điện loại K (Thermocouple Type K) được cấu tạo từ hai kim loại nào sau đây?",
    c: "Chromel (Hợp kim Niken-Crom) và Alumel (Hợp kim Niken-Nhôm).",
    w: ["Đồng nguyên chất và Nhôm nguyên chất", "Sắt và Vàng", "Bạch kim Platinum và Vàng"],
    e: "Thermocouple K sử dụng cặp điện cực Chromel - Alumel, dải đo rộng từ -200°C đến +1250°C." },
  { t: "Khi kiểm tra một cảm biến quang 3 dây chuẩn PNP ngõ ra NO, khi có vật cản, đồng hồ VOM đo giữa dây tín hiệu (Đen) và dây âm nguồn 0V (Xanh) sẽ cho giá trị xấp xỉ bao nhiêu?",
    c: "Xấp xỉ +24VDC (mức điện áp nguồn dương được đóng qua transistor bán dẫn PNP).",
    w: ["Đúng 0VDC", "Điện áp xoay chiều 220VAC", "Điện áp âm -24VDC"],
    e: "PNP (Sourcing) đóng cực dương nguồn (+24V) ra chân tải tín hiệu khi tích cực." },
  { t: "Ngược lại với PNP, cảm biến 3 dây chuẩn NPN khi tích cực ngõ ra sẽ nối chân tín hiệu (Đen) về đâu?",
    c: "Nối về cực âm nguồn 0VDC (Sinking - kéo tải xuống mass).",
    w: ["Nối lên cực dương +24VDC", "Nối vào dây tiếp địa vỏ máy", "Nối vào pha nóng điện lưới AC 220V"],
    e: "NPN (Sinking) sử dụng transistor NPN mở thông cực C-E kéo tín hiệu về 0VDC (GND)." },
  { t: "Đèn báo trạng thái màu cam/vàng trên thân cảm biến tiệm cận sáng lên biểu thị điều gì?",
    c: "Cảm biến đã phát hiện vật thể nằm trong vùng kích hoạt và ngõ ra bán dẫn đang đóng (Output Active).",
    w: ["Cảm biến đang bị ngắn mạch cháy hỏng", "Nguồn điện cấp bị quá áp 200%", "Cảm biến đang yêu cầu kết nối mạng WiFi"],
    e: "Đèn LED vàng/cam biểu thị trạng thái kích hoạt ngõ ra (Output Status LED)." },
  { t: "Van điện từ khí nén (Solenoid Valve) loại 5/2 đơn cuộn hút (Single Solenoid) điều khiển xi-lanh tác động kép hoạt động theo nguyên lý nào?",
    c: "Khi cấp điện cuộn hút van đổi hướng đẩy xi-lanh đi ra; khi ngắt điện, lò xo cơ khí hồi vị tự kéo van về vị trí ban đầu đưa xi-lanh lùi về.",
    w: ["Cần cấp điện liên tục cả hai chiều thì xi-lanh mới chuyển động", "Chỉ dùng được cho xi-lanh có lò xo đẩy", "Không cần cấp khí nén vẫn tự sinh lực đẩy 100kg"],
    e: "Van 5/2 đơn cuộn có lò xo hồi vị (Spring Return), mất điện van tự động trở về vị trí thường trực (Normal Position)." },
  { t: "Cụm van FRL (Filter - Regulator - Lubricator) đặt tại đầu vào khí nén của máy dán hộp có chức năng là gì?",
    c: "Lọc tách nước bụi bẩn, điều chỉnh ổn định áp suất khí nén và phun sương dầu bôi trơn các cơ cấu chấp hành.",
    w: ["Tăng áp suất khí nén từ 6 bar lên 100 bar", "Làm lạnh khí nén xuống 0°C để đông đá", "Phát xung điện từ điều khiển động cơ"],
    e: "FRL: Bộ lọc tách nước (Filter), van điều áp (Regulator), bộ tra dầu bôi trơn (Lubricator)." },
  { t: "Áp suất khí nén làm việc tiêu chuẩn của hầu hết các cơ cấu chấp hành xi-lanh trong nhà máy công nghiệp là bao nhiêu?",
    c: "Khoảng 5.0 đến 6.5 bar (0.5 - 0.65 MPa).",
    w: ["Dưới 0.5 bar", "Trên 30 bar", "Đúng 100 bar"],
    e: "Hệ thống khí nén công nghiệp tiêu chuẩn duy trì áp suất mạng xưởng 6-8 bar, qua điều áp máy còn 5-6.5 bar." },
  { t: "Để giảm chấn và điều chỉnh tốc độ tiến/lùi của xi-lanh khí nén êm ái, kỹ sư vận hành xoay núm điều chỉnh trên thiết bị nào?",
    c: "Van tiết lưu một chiều chỉnh lưu lượng khí xả (Speed Controller / Meter-out flow control).",
    w: ["Núm vặn chỉnh nhiệt độ máy in", "Cầu dao tổng 3 pha", "Công tắc dừng khẩn cấp"],
    e: "Van tiết lưu chỉnh lưu lượng khí xả từ buồng xi-lanh ra ngoài để tạo đệm khí khống chế tốc độ piston (Meter-out control)." },
  { t: "Rơ-le nhiệt (Thermal Overload Relay) lắp dưới khởi động từ (Contactor) trong tủ điện máy in có nhiệm vụ bảo vệ động cơ chống lại sự cố gì?",
    c: "Sự cố quá tải dòng điện kéo dài hoặc mất 1 pha làm động cơ phát nóng nguy cơ cháy cuộn dây.",
    w: ["Sự cố đứt dây curoa băng tải", "Sự cố mất mạng Internet", "Sự cố kẹt giấy in"],
    e: "Thanh lưỡng kim trong rơ-le nhiệt uốn cong khi dòng điện vượt định mức trong thời gian dài, ngắt mạch điều khiển bảo vệ motor." },
  { t: "Khi rơ-le nhiệt nhảy trip bảo vệ, trên thân rơ-le nút Reset màu xanh nhô lên. Hành động đúng kỹ thuật trước khi nhấn nút Reset là gì?",
    c: "Kiểm tra nguyên nhân cơ khí (kẹt trục, kẹt tải) và đo dòng điện động cơ, để thanh lưỡng kim nguội bớt trước khi ấn Reset.",
    w: ["Lập tức ấn Reset liên tục 10 lần và ép máy chạy tiếp", "Lấy băng dính dán chặt nút Reset lại để không bao giờ nhảy nữa", "Tăng dòng chỉnh định rơ-le lên mức tối đa gấp 5 lần"],
    e: "Phải tìm và loại bỏ nguyên nhân gây quá tải cơ khí/điện, đợi rơ-le nguội rồi mới Reset để tránh cháy động cơ." },
  { t: "Rơ-le trung gian (Relay kiếng 24VDC) thường được sử dụng trong tủ điện điều khiển nhằm mục đích gì?",
    c: "Cách ly điện áp giữa mạch điều khiển 24VDC và mạch động lực tải nặng, đồng thời khuếch đại dòng đóng cắt tín hiệu.",
    w: ["Thay thế hoàn toàn bộ vi xử lý CPU của PLC", "Lưu trữ dữ liệu báo cáo sản xuất hàng tháng", "Tự động biến đổi điện 1 chiều thành 3 pha"],
    e: "Relay trung gian dùng tiếp điểm cơ khí đóng cắt tải dòng lớn, bảo vệ ngõ ra bán dẫn transistor nhạy cảm của PLC." },
  { t: "Đi-ốt dập xung ngược (Flyback Diode / Freewheeling Diode) mắc song song ngược cực với cuộn hút rơ-le hoặc van điện từ DC có tác dụng gì?",
    c: "Triệt tiêu điện áp cảm ứng ngược sinh ra khi ngắt dòng qua cuộn cảm, bảo vệ transistor ngõ ra PLC không bị đánh thủng.",
    w: ["Làm tăng gấp đôi lực hút của cuộn dây nam châm", "Biến đổi cuộn hút DC thành cuộn hút xoay chiều AC", "Đổi màu đèn báo LED trên thân rơ-le"],
    e: "Định luật Faraday: Khi ngắt điện đột ngột cuộn cảm, V = -L(di/dt) sinh điện áp ngược hàng trăm Volt đánh thủng ngõ ra PLC." },
  { t: "Cảm biến Loadcell đo lực căng màng giấy hoạt động dựa trên nguyên lý biến dạng của linh kiện nào?",
    c: "Điện trở biến dạng Strain Gauge dán trên thanh kim loại đàn hồi mắc theo mạch cầu Wheatstone.",
    w: ["Bóng bán dẫn quang học phát tia hồng ngoại", "Nam châm vĩnh cửu quay tròn", "Khối pin năng lượng mặt trời"],
    e: "Strain Gauge thay đổi điện trở tỉ lệ thuận với biến dạng cơ học, làm mất cân bằng cầu Wheatstone sinh tín hiệu mV." },
  { t: "Tín hiệu điện áp ngõ ra của cảm biến Loadcell cầu Wheatstone thông thường nằm trong dải biên độ nào?",
    c: "Rất nhỏ, chỉ từ 0 đến vài chục milli-Volt (mV/V) và cần qua bộ khuếch đại Transmitter chuẩn hóa.",
    w: ["Điện áp lớn từ 220V đến 380V", "Dòng điện 100 Ampe", "Tần số cao 5 GHz"],
    e: "Loadcell xuất tín hiệu cỡ 2mV/V hoặc 3mV/V, cấp nguồn 10VDC thì ngõ ra max 20-30mV, bắt buộc dùng bộ khuếch đại chuẩn hóa sang 4-20mA hoặc 0-10V." }
];

for (let i = 0; i < 70; i++) {
  const base = l0MCQDefs[i % l0MCQDefs.length];
  const qNum = i + 1;
  const isFatal = [1, 4, 12, 16, 25, 33, 42, 55, 63].includes(qNum);
  const options = [
    { id: '1', text: base.c, isCorrect: true },
    { id: '2', text: base.w[0], isCorrect: false },
    { id: '3', text: base.w[1], isCorrect: false },
    { id: '4', text: base.w[2], isCorrect: false }
  ];
  addQ({
    key: `sample-qst-l0-mcq-${String(qNum).padStart(3, '0')}`,
    folder: fld0,
    level: 'L0',
    format: isFatal ? 'critical_safety' : (i % 3 === 0 ? 'case_study' : 'theory'),
    specialty: 'MES',
    topic: 'mes-scada-opcua',
    group: i % 4 === 0 ? 'MES-ENG-26' : 'worker',
    cog: isFatal ? 'comprehension' : (i % 2 === 0 ? 'knowledge' : 'application'),
    content: `${isFatal ? '[ĐIỂM LIỆT AN TOÀN - CÔNG NHÂN VẬN HÀNH] ' : `[CẢM BIẾN HIỆN TRƯỜNG #${qNum}] `}${base.t} (Máy ${['In Flexo', 'Dán thùng tự động', 'Bế phẳng', 'Chia cuộn'][i % 4]})`,
    explanation: base.e,
    type: 'single_choice',
    options: options.sort(() => (i % 2 === 0 ? 0 : 0.5 - Math.random())),
    isCrit: isFatal,
    critReason: isFatal ? 'Quy chuẩn an toàn điện công nghiệp & Tránh chập nổ thiết bị trường (Zero-tolerance)' : '',
    image: qNum === 1 ? svgUris.npnSensor : ''
  });
}

for (let j = 1; j <= 20; j++) {
  const p = 2 + j * 0.4;
  const iVal = (4 + (p / 10) * 16).toFixed(2);
  const uVal = (iVal * 0.25).toFixed(2);
  addQ({
    key: `sample-qst-l0-num-${String(j).padStart(3, '0')}`,
    folder: fld0,
    level: 'L0',
    format: 'case_study',
    specialty: 'MES',
    topic: 'mes-scada-opcua',
    group: j % 2 === 0 ? 'worker' : 'MES-ENG-26',
    cog: 'application',
    content: `[TỰ LUẬN TÍNH TOÁN CẢM BIẾN #${j}] Cảm biến áp suất đường ống nạp keo (0 - 10 bar) phát tín hiệu dòng 4 - 20 mA. Kỹ sư đo được dòng tín hiệu thực tế là ${iVal} mA.\na) Hãy tính áp suất thực tế trong đường ống keo (bar)?\nb) Khi tín hiệu dòng này chạy qua điện trở chuẩn 250 Ω tại ngõ vào analog PLC, điện áp rơi đo được là bao nhiêu Volt?\nHãy nhập chi tiết công thức và kết quả số.`,
    explanation: `Công thức: P = ((I - 4) / 16) * 10 bar = ((${iVal} - 4) / 16) * 10 = ${p.toFixed(2)} bar. Điện áp U = I * R = ${iVal} mA * 250 Ohm = ${uVal} V.`,
    type: 'essay',
    image: j === 1 ? svgUris.currentLoop : '',
    rubrics: [
      { id: '1', title: 'Công thức chuyển đổi tín hiệu dòng 4-20mA sang áp suất', maxScore: 3.5, description: 'Nêu đúng công thức nội suy tuyến tính dải 4-20mA sang 0-10 bar.' },
      { id: '2', title: `Tính đúng áp suất thực tế ${p.toFixed(2)} bar`, maxScore: 3.5, description: `Thay số chính xác tính ra P = ${p.toFixed(2)} bar.` },
      { id: '3', title: `Tính đúng điện áp rơi ${uVal} V qua điện trở 250 Ohm`, maxScore: 3.0, description: `Định luật Ohm U = I * R tính ra U = ${uVal} V.` }
    ]
  });
}

// =================================================================================================
// 2. FOLDER L1: PLC & MACHINE CONTROL (90 questions) - Group: worker & MES-ENG-26
// =================================================================================================
const fld1 = 'sample-fld-l1-plc-control';
const l1MCQDefs = [
  { t: "Nguyên lý chu kỳ quét (Scan Cycle) của PLC gồm 4 bước tuần tự theo đúng thứ tự nào sau đây?",
    c: "1. Đọc trạng thái ngõ vào (PII) ➔ 2. Thực thi chương trình logic (OB1) ➔ 3. Truyền thông & chẩn đoán ➔ 4. Cập nhật trạng thái ngõ ra (PIO).",
    w: ["1. Cập nhật ngõ ra ➔ 2. Đọc ngõ vào ➔ 3. Nghỉ ngơi ➔ 4. Thực thi logic", "1. Gửi email báo cáo ➔ 2. Khởi động lại CPU ➔ 3. Đọc cảm biến", "Chạy ngẫu nhiên không theo chu kỳ cố định"],
    e: "Chu kỳ quét xác định (Deterministic Scan Cycle) là nền tảng hoạt động của PLC đảm bảo tính thời gian thực." },
  { t: "Lệnh Timer TON (On-Delay Timer) trong PLC bắt đầu tính thời gian và đóng ngõ ra Q khi nào?",
    c: "Bắt đầu tính thời gian khi ngõ vào IN chuyển từ 0 lên 1; ngõ ra Q bật lên 1 khi thời gian đếm ET đạt giá trị cài đặt PT.",
    w: ["Ngõ ra Q bật ngay lập tức khi IN = 1 và tắt khi hết thời gian", "Chỉ đếm khi ngõ vào IN = 0", "Không bao giờ đóng ngõ ra"],
    e: "Timer TON là bộ định thời trễ bật: duy trì tín hiệu ngõ vào đủ thời gian PT thì ngõ ra Q mới kích hoạt." },
  { t: "Lệnh Timer TOF (Off-Delay Timer) có đặc tính hoạt động như thế nào khi ngõ vào IN chuyển từ 1 xuống 0?",
    c: "Ngõ ra Q vẫn tiếp tục giữ mức 1 và bắt đầu đếm thời gian; khi đếm đủ thời gian cài đặt PT thì ngõ ra Q mới ngắt về 0.",
    w: ["Ngõ ra Q ngắt ngay lập tức không có độ trễ", "Timer tự động reset về 0 và khóa CPU", "Làm động cơ quay ngược chiều"],
    e: "Timer TOF là bộ định thời trễ ngắt: duy trì trạng thái ngõ ra thêm một khoảng thời gian sau khi tín hiệu vào đã mất." },
  { t: "Lệnh phát hiện sườn xung cạnh lên P_TRIG (Positive Edge Detection) cho ra tín hiệu ngõ ra trong bao lâu?",
    c: "Chỉ duy nhất trong đúng 1 chu kỳ quét (1 Scan Cycle) tại thời điểm tín hiệu chuyển từ mức 0 lên mức 1.",
    w: ["Duy trì liên tục trong 10 giây", "Duy trì cho đến khi tắt nguồn máy", "Cho tín hiệu liên tục 50Hz"],
    e: "Lệnh bắt sườn xung kích hoạt đúng 1 chu kỳ quét để tạo lệnh kích ngắt hoặc cộng bộ đếm không bị nhảy liên tục." },
  { t: "Lỗi 'Double Coil' (ghi trùng cuộn dây ngõ ra trong hai mạng rung khác nhau) dẫn đến kết quả gì?",
    c: "Trạng thái ngõ ra vật lý ở cuối chu kỳ quét chỉ tuân theo kết quả tính toán của rung xuất hiện sau cùng (ở dưới).",
    w: ["Cả hai rung cùng có tác dụng đồng thời", "PLC bị cháy ngõ ra", "Điện áp ngõ ra tự động tăng gấp đôi"],
    e: "Do PLC ghi đè giá trị vào Process Image Output ở cuối chu kỳ quét nên rung bên dưới sẽ ghi đè lên rung bên trên." },
  { t: "Trong biến tần (VFD), thông số Thời gian tăng tốc (Acceleration Time) được định nghĩa là gì?",
    c: "Thời gian để động cơ tăng tốc từ tốc độ 0 Hz lên đến tần số định mức cực đại (thường là 50 Hz).",
    w: ["Thời gian từ khi bật máy đến khi máy in xong lô hàng", "Thời gian làm mát biến tần", "Thời gian bấm nút khởi động"],
    e: "Accel Time là khoảng thời gian ram dốc tăng tốc từ 0 đến tần số max cài đặt để hạn chế dòng khởi động giật cơ khí." },
  { t: "Điện trở xả hãm (Braking Resistor) gắn thêm vào biến tần của máy bế có công dụng gì quan trọng?",
    c: "Tiêu tán năng lượng điện ngược do quán tính động cơ tái sinh sinh ra khi giảm tốc nhanh, tránh lỗi quá áp đường bus DC (Overvoltage Trip).",
    w: ["Làm tăng nhiệt độ cho phòng máy", "Giảm tiếng ồn của quạt làm mát", "Tăng tốc độ động cơ lên 200%"],
    e: "Khi dừng nhanh tải quán tính lớn, động cơ biến thành máy phát trả điện về DC Bus. Điện trở xả tiêu tán năng lượng này thành nhiệt." },
  { t: "Tại sao tín hiệu Encoder đo vị trí mép giấy tốc độ cao phải đưa vào khối High-Speed Counter (HSC) thay vì Digital Input thường?",
    c: "Module HSC đếm xung bằng vi mạch phần cứng chuyên dụng độc lập với chu kỳ quét của CPU, bắt kịp xung tần số hàng chục kHz.",
    w: ["Vì cổng Digital Input thường không có nguồn điện", "Vì Encoder phát ra sóng WiFi", "Vì HSC giúp tiết kiệm 90% điện năng"],
    e: "Tần số xung encoder hàng chục kHz có chu kỳ micro-giây, chu kỳ quét CPU thường 10-20ms không thể bắt kịp nếu không dùng HSC." },
  { t: "Trong mạng Profinet IO, giao thức nào được sử dụng để Controller phát hiện và gán địa chỉ IP tự động cho các trạm Device dựa trên Device Name?",
    c: "Giao thức DCP (Discovery and Basic Configuration Protocol).",
    w: ["Giao thức FTP", "Giao thức POP3", "Giao thức Bluetooth"],
    e: "Profinet DCP hoạt động ở tầng liên kết dữ liệu (Layer 2) để gán IP và cấu hình tên thiết bị." },
  { t: "Chức năng của khối tổ chức ngắt phần cứng Hardware Interrupt OB40 trong PLC Siemens S7 là gì?",
    c: "Tạm dừng chương trình chính OB1 ngay lập tức để xử lý tức thời sự kiện khẩn cấp khi có cạnh xung kích hoạt ở ngõ vào.",
    w: ["Xóa toàn bộ chương trình trong PLC", "Khởi động lại máy in", "In bản vẽ kỹ thuật"],
    e: "OB40 ngắt luồng quét chính để phản hồi sự kiện phần cứng trong thời gian vài micro-giây." }
];

for (let i = 0; i < 70; i++) {
  const base = l1MCQDefs[i % l1MCQDefs.length];
  const qNum = i + 1;
  const isFatal = [2, 5, 11, 19, 28, 37, 46, 58, 64].includes(qNum);
  const options = [
    { id: '1', text: base.c, isCorrect: true },
    { id: '2', text: base.w[0], isCorrect: false },
    { id: '3', text: base.w[1], isCorrect: false },
    { id: '4', text: base.w[2], isCorrect: false }
  ];
  addQ({
    key: `sample-qst-l1-mcq-${String(qNum).padStart(3, '0')}`,
    folder: fld1,
    level: 'L1',
    format: isFatal ? 'critical_safety' : (i % 3 === 0 ? 'case_study' : 'theory'),
    specialty: 'MES',
    topic: 'mes-scada-opcua',
    group: i % 3 === 0 ? 'MES-ENG-26' : 'worker',
    cog: isFatal ? 'comprehension' : (i % 2 === 0 ? 'knowledge' : 'application'),
    content: `${isFatal ? '[ĐIỂM LIỆT AN TOÀN - ĐIỀU KHIỂN PLC] ' : `[LẬP TRÌNH & ĐIỀU KHIỂN PLC #${qNum}] `}${base.t} (Hệ điều khiển S7-1500 / Máy in #${(i % 5) + 1})`,
    explanation: base.e,
    type: 'single_choice',
    options: options.sort(() => (i % 2 === 0 ? 0 : 0.5 - Math.random())),
    isCrit: isFatal,
    critReason: isFatal ? 'Quy chuẩn an toàn máy ISO 13849 & Ngắt liên động E-Stop bắt buộc (Zero-tolerance)' : '',
    image: qNum === 8 ? svgUris.hscTiming : (qNum === 9 ? svgUris.profinetTopo : '')
  });
}

for (let j = 1; j <= 20; j++) {
  const v = (2.0 + j * 0.15).toFixed(2);
  const ppr = 1000;
  const dia = 0.1; // 100mm
  const circ = (Math.PI * dia).toFixed(3);
  const freq = Math.round((v / circ) * ppr);
  addQ({
    key: `sample-qst-l1-num-${String(j).padStart(3, '0')}`,
    folder: fld1,
    level: 'L1',
    format: 'case_study',
    specialty: 'MES',
    topic: 'mes-scada-opcua',
    group: j % 2 === 0 ? 'worker' : 'MES-ENG-26',
    cog: 'analysis',
    content: `[TỰ LUẬN TÍNH TOÁN PLC #${j}] Băng tải máy dán hộp chạy ở vận tốc v = ${v} m/s. Trục con lăn kéo có đường kính d = 100 mm (chu vi xấp xỉ ${circ} m) gắn Encoder quang ${ppr} xung/vòng.\na) Tính tần số xung cực đại phát ra từ Encoder (Hz)?\nb) Với chu kỳ quét PLC Scan Cycle trung bình 20 ms, hãy giải thích tại sao không được dùng ngõ vào thường và phải dùng khối HSC?\nHãy nhập chi tiết công thức và kết quả số.`,
    explanation: `Tần số xung f = (v / C) * PPR = (${v} / ${circ}) * ${ppr} = ${freq} Hz. Chu kỳ xung là T = 1/f = ${(1000 / freq).toFixed(3)} ms, nhỏ hơn nhiều so với Scan Cycle 20ms nên ngõ vào thường sẽ bỏ sót xung.`,
    type: 'essay',
    image: j === 1 ? svgUris.hscTiming : '',
    rubrics: [
      { id: '1', title: 'Công thức tính tốc độ quay và tần số xung Encoder', maxScore: 3.5, description: 'Nêu đúng công thức f = (v / (pi * d)) * PPR.' },
      { id: '2', title: `Tính đúng tần số xung ${freq} Hz`, maxScore: 3.5, description: `Thay số tính ra kết quả xấp xỉ ${freq} Hz.` },
      { id: '3', title: 'Lý giải chu kỳ quét Scan Cycle và giải pháp HSC', maxScore: 3.0, description: 'So sánh chu kỳ xung với Scan Cycle 20ms và kết luận dùng High Speed Counter.' }
    ]
  });
}

// =================================================================================================
// 3. FOLDER L2: SCADA & HMI SUPERVISORY (90 questions) - Group: worker, dispatcher, MES-ENG-26
// =================================================================================================
const fld2 = 'sample-fld-scada-opcua';
const l2MCQDefs = [
  { t: "Theo tiêu chuẩn quản lý cảnh báo ISA-18.2, mục đích chính của việc phân cấp cảnh báo (Alarm Prioritization) là gì?",
    c: "Giúp người vận hành nhận biết và xử lý ngay lập tức cảnh báo nguy hiểm nhất khi xảy ra lũ cảnh báo (Alarm Flood).",
    w: ["Tăng số lượng chuông reo trong phòng điều khiển", "Để nhân viên dễ ngủ hơn", "Tắt toàn bộ hệ thống âm thanh"],
    e: "Phân cấp Low/High/High-High giúp người vận hành không bị quá tải thông tin và ưu tiên xử lý sự cố đe dọa an toàn." },
  { t: "Chức năng 'Alarm Shelving' trên màn hình điều khiển SCADA cho phép người vận hành làm gì?",
    c: "Tạm thời ẩn một cảnh báo đang nhảy chập chờn trong một khoảng thời gian xác định có kiểm soát để tập trung xử lý sự cố chính.",
    w: ["Xóa vĩnh viễn cảnh báo khỏi hệ thống", "Tắt toàn bộ điện nhà máy", "Gửi cảnh báo sang máy tính công ty khác"],
    e: "Shelving là thao tác tạm gác cảnh báo phiền toái đã biết rõ nguyên nhân trong thời gian hẹn giờ (Shelve duration)." },
  { t: "Trong giao thức OPC-UA, 'Subscription' kết hợp 'MonitoredItem' mang lại lợi ích gì so với cơ chế Polling liên tục?",
    c: "Chỉ gửi dữ liệu lên mạng khi giá trị có sự thay đổi vượt ngưỡng lọc (Report by Exception), giảm tới 90% tải đường truyền mạng.",
    w: ["Làm tăng gấp 10 lần dung lượng đường truyền", "Ngăn không cho máy tính kết nối mạng", "Tự động tắt nguồn máy tính"],
    e: "OPC-UA Subscription gửi dữ liệu theo sự kiện (Publish-Subscribe) thay vì hỏi vòng tuần tự liên tục (Polling)." },
  { t: "Cổng mạng TCP mặc định chuẩn hóa quốc tế của giao thức truyền thông OPC-UA là cổng nào?",
    c: "Cổng TCP 4840 (opc.tcp://).",
    w: ["Cổng 80", "Cổng 443", "Cổng 21"],
    e: "OPC Unified Architecture sử dụng cổng nhị phân mặc định là TCP 4840." },
  { t: "Thuật toán nén dữ liệu Deadband Compression trên hệ thống SCADA Historian hoạt động theo nguyên lý nào?",
    c: "Chỉ ghi bản ghi mới vào cơ sở dữ liệu khi giá trị đo lường biến thiên vượt quá một khoảng dung sai (Deadband) so với điểm đo trước.",
    w: ["Nén tệp tin thành file đuôi .zip", "Xóa toàn bộ số lẻ", "Lưu ngẫu nhiên 1 điểm mỗi ngày"],
    e: "Deadband nén dữ liệu chuỗi thời gian hiệu quả bằng cách bỏ qua các dao động nhỏ nhiễu không đáng kể." },
  { t: "Giao thức vòng mạng dự phòng MRP (Media Redundancy Protocol) trong mạng SCADA xưởng đảm bảo thời gian chuyển mạch khi đứt cáp là bao lâu?",
    c: "Dưới 200 milli-giây (thường dưới 50ms), đảm bảo SCADA không bị mất kết nối thiết bị.",
    w: ["Mất khoảng 2 giờ đồng hồ", "Đúng 1 ngày", "Không bao giờ tự chuyển mạch được"],
    e: "MRP tiêu chuẩn IEC 62439-2 cho phép tự động đóng đường truyền dự phòng trong vòng <200ms khi phát hiện đứt vòng ring." },
  { t: "Trên giao diện HMI trạm trộn, thao tác chuyển từ chế độ MANUAL sang AUTO đòi hỏi điều kiện liên động nào?",
    c: "Tất cả các cơ cấu chấp hành phải ở vị trí gốc an toàn (Home Position) và không có cảnh báo lỗi đang tồn tại.",
    w: ["Không cần điều kiện gì, ấn nút là chuyển ngay", "Phải ngắt toàn bộ điện tủ điều khiển", "Phải tháo hết cảm biến ra ngoài"],
    e: "Interlock chuyển Auto yêu cầu xác nhận vị trí Safe State để tránh va chạm cơ khí khi hệ thống tự động khởi động." }
];

for (let i = 0; i < 70; i++) {
  const base = l2MCQDefs[i % l2MCQDefs.length];
  const qNum = i + 1;
  const isFatal = [3, 7, 14, 22, 31, 44, 52, 61].includes(qNum);
  const options = [
    { id: '1', text: base.c, isCorrect: true },
    { id: '2', text: base.w[0], isCorrect: false },
    { id: '3', text: base.w[1], isCorrect: false },
    { id: '4', text: base.w[2], isCorrect: false }
  ];
  addQ({
    key: `sample-qst-l2-mcq-${String(qNum).padStart(3, '0')}`,
    folder: fld2,
    level: 'L2',
    format: isFatal ? 'critical_safety' : (i % 2 === 0 ? 'simulation_hmi' : 'theory'),
    specialty: 'MES',
    topic: 'mes-scada-opcua',
    group: i % 3 === 0 ? 'dispatcher' : (i % 3 === 1 ? 'worker' : 'MES-ENG-26'),
    cog: isFatal ? 'comprehension' : 'application',
    content: `${isFatal ? '[ĐIỂM LIỆT VẬN HÀNH SCADA] ' : `[GIÁM SÁT SCADA & HMI #${qNum}] `}${base.t} (Trạm điều khiển #${(i % 4) + 1})`,
    explanation: base.e,
    type: 'single_choice',
    simType: i % 4 === 0 ? 'dispatch' : '',
    options: options.sort(() => (i % 2 === 0 ? 0 : 0.5 - Math.random())),
    isCrit: isFatal,
    critReason: isFatal ? 'Quy chuẩn an toàn vận hành trạm giám sát SCADA & Tránh sự cố cháy nổ' : '',
    image: qNum === 3 ? svgUris.scadaAlarm : ''
  });
}

for (let j = 1; j <= 20; j++) {
  const tags = 500 + j * 50;
  const recSize = 14;
  const dayBytes = tags * recSize * 86400;
  const dayMB = (dayBytes / (1024 * 1024)).toFixed(1);
  const monthGB = ((dayBytes * 30) / (1024 * 1024 * 1024)).toFixed(2);
  const compGB = (monthGB * 0.3).toFixed(2);
  addQ({
    key: `sample-qst-l2-num-${String(j).padStart(3, '0')}`,
    folder: fld2,
    level: 'L2',
    format: 'case_study',
    specialty: 'MES',
    topic: 'mes-scada-opcua',
    group: j % 2 === 0 ? 'dispatcher' : 'MES-ENG-26',
    cog: 'analysis',
    content: `[TỰ LUẬN TÍNH TOÁN DỮ LIỆU SCADA #${j}] Hệ thống SCADA Historian thu thập ${tags} biến dữ liệu (Tags) từ xưởng sản xuất với chu kỳ ghi 1 giây/lần. Mỗi bản ghi tốn 14 bytes.\na) Tính tổng dung lượng dữ liệu thô ghi nhận trong 1 ngày 24h (MB)?\nb) Tính dung lượng lưu trữ cần thiết cho 30 ngày (GB)?\nc) Sau khi áp dụng thuật toán nén Deadband nén giảm 70% dung lượng, dung lượng thực tế 30 ngày còn bao nhiêu GB?\nHãy nhập chi tiết các bước tính toán.`,
    explanation: `1 ngày = ${tags} * 14 * 86.400 = ${dayBytes.toLocaleString()} bytes = ${dayMB} MB. 30 ngày = ${monthGB} GB. Sau nén 70% (còn 30%): ${monthGB} * 0.3 = ${compGB} GB.`,
    type: 'essay',
    rubrics: [
      { id: '1', title: `Tính đúng dung lượng 1 ngày: ${dayMB} MB`, maxScore: 3.5, description: 'Tính đúng số giây 1 ngày và nhân dung lượng bản ghi.' },
      { id: '2', title: `Tính đúng dung lượng 30 ngày: ${monthGB} GB`, maxScore: 3.5, description: 'Nhân 30 ngày và quy đổi đơn vị byte sang GB.' },
      { id: '3', title: `Tính đúng dung lượng sau nén: ${compGB} GB`, maxScore: 3.0, description: 'Áp dụng hệ số nén 70% còn lại 30%.' }
    ]
  });
}

// =================================================================================================
// 4. FOLDER L2: OT/IT SECURITY & OAUTH (50 questions) - Group: SEC-2026-A, dispatcher, all
// =================================================================================================
const fldSec = 'sample-fld-sec-oauth';
const secMCQDefs = [
  { t: "Theo mô hình phân tầng Purdue và tiêu chuẩn IEC 62443, vùng phi quân sự công nghiệp (Industrial DMZ - Layer 3.5) có vai trò gì quan trọng nhất?",
    c: "Cách ly hoàn toàn mạng IT doanh nghiệp và mạng điều khiển OT, ngăn chặn việc kết nối trực tiếp giữa máy chủ ERP và PLC/SCADA.",
    w: ["Nơi để công nhân nghỉ giải lao", "Tăng tốc độ truy cập Facebook tại nhà máy", "Cung cấp nguồn điện dự phòng cho máy in"],
    e: "Layer 3.5 DMZ bắt buộc các luồng dữ liệu phải dừng lại tại các máy chủ trung gian (Reverse Proxy, Historian Mirror) không cho xuyên tầng trực tiếp." },
  { t: "Tại sao trong ứng dụng MES Web, Refresh Token bắt buộc phải lưu trữ trong HttpOnly, Secure, SameSite Cookie thay vì localStorage?",
    c: "Vì mã JavaScript trên trình duyệt không thể truy cập HttpOnly Cookie, loại bỏ hoàn toàn nguy cơ bị đánh cắp qua tấn công XSS.",
    w: ["Vì localStorage chỉ chứa được 10 chữ cái", "Vì HttpOnly Cookie giúp tăng tốc độ mạng lên 100 lần", "Vì localStorage làm hỏng màn hình máy tính"],
    e: "XSS cho phép kẻ tấn công đọc toàn bộ localStorage; dùng HttpOnly Cookie là biện pháp phòng thủ căn bản bảo vệ phiên làm việc dài hạn." },
  { t: "Trong giao thức OPC-UA, chế độ bảo mật 'SignAndEncrypt' kết hợp với Security Policy 'Basic256Sha256' mang lại sự bảo vệ nào?",
    c: "Ký số chống sửa đổi giả mạo gói tin (Integrity) và mã hóa toàn bộ dữ liệu truyền trên mạng (Confidentiality).",
    w: ["Chỉ bảo vệ mật khẩu đăng nhập, không mã hóa dữ liệu cảm biến", "Làm máy in chạy chậm lại 10 lần", "Tự động tắt nguồn PLC khi có sự cố"],
    e: "SignAndEncrypt dùng chứng chỉ số X.509 để vừa ký số SHA256 chống giả mạo vừa mã hóa đối xứng AES256 bảo vệ dữ liệu." },
  { t: "Khi máy khách OPC-UA Client kết nối vào PLC S7-1500 báo lỗi 'BadCertificateUntrusted', nguyên nhân và cách khắc phục là gì?",
    c: "Chứng chỉ số của Client chưa được Administrator tin cậy; cần đăng nhập vào PLC web server chuyển chứng chỉ từ Rejected sang Trusted List.",
    w: ["Cáp mạng bị đứt ngắt kết nối", "Điện áp 24VDC bị sụt áp", "PLC đã bị hacker xóa hết bộ nhớ"],
    e: "Cơ chế Mutual Authentication của OPC-UA đòi hỏi cả Client và Server phải tin cậy chứng chỉ của nhau (Trusted Certificates)." },
  { t: "Điểm yếu bảo mật nghiêm trọng nhất của giao thức Modbus TCP truyền thống trong xưởng sản xuất là gì?",
    c: "Không có cơ chế xác thực danh tính (No Authentication) và dữ liệu truyền hoàn toàn bằng văn bản thuần không mã hóa (Cleartext).",
    w: ["Tốc độ truyền thông quá nhanh làm hỏng cáp", "Chỉ chạy được trên hệ điều hành Linux", "Không hỗ trợ cáp đồng RJ45"],
    e: "Bất kỳ ai kết nối vào cùng mạng con Modbus TCP đều có thể bắt gói tin (Sniffing) hoặc gửi lệnh giả mạo ghi đè thanh ghi điều khiển." },
  { t: "Hành động nào sau đây của nhân sự vận hành vi phạm nghiêm trọng quy chế an toàn thông tin OT và có thể dẫn đến lây nhiễm mã độc tống tiền (Ransomware)?",
    c: "Cắm USB cá nhân không qua kiểm dịch vào máy trạm SCADA hoặc cắm dây mạng Internet văn phòng vào switch điều khiển máy in.",
    w: ["Đổi mật khẩu định kỳ 90 ngày một lần", "Báo cáo cảnh báo an ninh cho trưởng ca", "Khóa màn hình máy tính khi rời khỏi vị trí"],
    e: "Cầu nối trực tiếp (Bridge) giữa mạng Internet/văn phòng và mạng điều khiển máy móc là con đường chính của các đợt bùng phát mã độc công nghiệp." },
  { t: "Khi một máy trạm HMI trong xưởng có dấu hiệu bị nhiễm mã độc (màn hình khóa, xuất hiện thông báo tống tiền), thao tác cách ly khẩn cấp đầu tiên là gì?",
    c: "Rút ngay cáp mạng Ethernet vật lý kết nối máy trạm đó với mạng xưởng, giữ nguyên nguồn điện và báo ngay cho đội an ninh OT.",
    w: ["Khởi động lại máy tính 10 lần liên tục", "Cắm thêm các USB khác vào để sao chép dữ liệu", "Đấu tắt rơ-le an toàn"],
    e: "Rút cáp mạng ngăn mã độc quét và lây lan sang các máy trạm khác; giữ nguyên nguồn để bảo lưu chứng cứ số trong RAM cho điều tra forensics." }
];

for (let i = 0; i < 35; i++) {
  const base = secMCQDefs[i % secMCQDefs.length];
  const qNum = i + 1;
  const isFatal = [2, 6, 12, 20, 28].includes(qNum);
  const options = [
    { id: '1', text: base.c, isCorrect: true },
    { id: '2', text: base.w[0], isCorrect: false },
    { id: '3', text: base.w[1], isCorrect: false },
    { id: '4', text: base.w[2], isCorrect: false }
  ];
  addQ({
    key: `sample-qst-sec-mcq-${String(qNum).padStart(3, '0')}`,
    folder: fldSec,
    level: 'L2',
    format: isFatal ? 'critical_safety' : (i % 2 === 0 ? 'case_study' : 'theory'),
    specialty: 'SEC',
    topic: 'sec-oauth',
    group: i % 2 === 0 ? 'SEC-2026-A' : 'dispatcher',
    cog: isFatal ? 'comprehension' : 'application',
    content: `${isFatal ? '[ĐIỂM LIỆT AN NINH MẠNG OT/IT] ' : `[BẢO MẬT HỆ THỐNG CÔNG NGHIỆP #${qNum}] `}${base.t} (Quy chuẩn IEC 62443 Nhà máy Thông minh)`,
    explanation: base.e,
    type: 'single_choice',
    options: options.sort(() => (i % 2 === 0 ? 0 : 0.5 - Math.random())),
    isCrit: isFatal,
    critReason: isFatal ? 'Quy chuẩn an toàn an ninh mạng OT/IT & Phòng chống tê liệt sản xuất do Ransomware' : ''
  });
}

for (let j = 1; j <= 15; j++) {
  addQ({
    key: `sample-qst-sec-num-${String(j).padStart(3, '0')}`,
    folder: fldSec,
    level: 'L2',
    format: 'case_study',
    specialty: 'SEC',
    topic: 'sec-oauth',
    group: 'SEC-2026-A',
    cog: 'analysis',
    content: `[TỰ LUẬN AN NINH MẠNG OT/IT #${j}] Nhà máy triển khai kết nối giữa máy chủ MES (Vùng Layer 3) và máy tính trạm SCADA (Vùng Layer 2). Để tuân thủ tiêu chuẩn IEC 62443:\na) Hãy thiết kế kiến trúc phân vùng DMZ Layer 3.5 và các quy tắc tường lửa (Firewall Rules) bắt buộc?\nb) Nêu rõ cổng mạng và giao thức được phép mở qua Firewall DMZ giữa MES và SCADA?\nc) Giải thích tại sao không được phép cho máy tính văn phòng truy cập trực tiếp vào dải IP của PLC S7-1500?`,
    explanation: `DMZ Layer 3.5 đặt Reverse Proxy và Data Historian Mirror. Chỉ mở cổng TCP 4840 (OPC-UA với SignAndEncrypt) và TCP 443 (HTTPS) từ Layer 2 lên DMZ; cấm tuyệt đối mọi kết nối trực tiếp từ Layer 4/Văn phòng xuống Layer 1/2 để ngăn chặn tấn công lan truyền khi máy tính văn phòng bị nhiễm mã độc.`,
    type: 'essay',
    rubrics: [
      { id: '1', title: 'Thiết kế phân vùng Layer 3.5 DMZ chuẩn IEC 62443', maxScore: 3.5, description: 'Trình bày đúng vai trò trạm trung gian cách ly mạng IT và OT.' },
      { id: '2', title: 'Khai báo đúng cổng mạng và giao thức bảo mật', maxScore: 3.5, description: 'Chỉ rõ cổng OPC-UA TCP 4840 và HTTPS 443 có mã hóa chứng chỉ X.509.' },
      { id: '3', title: 'Phân tích rủi ro tấn công xuyên tầng và biện pháp cô lập', maxScore: 3.0, description: 'Lý giải nguy cơ lan truyền virus/ransomware từ mạng văn phòng vào PLC điều khiển.' }
    ]
  });
}

// =================================================================================================
// 5. FOLDER L3: MES DISPATCH & GENEALOGY (90 questions) - Group: dispatcher & MES-ENG-26
// =================================================================================================
const fld3 = 'sample-fld-mes-isa95';
const l3DispDefs = [
  { t: "Theo mô hình ISA-95 phần 3, chức năng 'Production Dispatching' (Điều độ sản xuất) của hệ thống MES có nhiệm vụ cốt lõi là gì?",
    c: "Phân bổ và kích hoạt các lệnh sản xuất (Work Order) cụ thể tới từng máy, thiết bị và công nhân dựa trên tình trạng sẵn sàng thực tế.",
    w: ["Thanh toán tiền lương cho công nhân", "Mua sắm máy móc thiết bị mới", "Ký hợp đồng bán hàng với khách"],
    e: "Dispatching chuyển kế hoạch sản xuất thành hành động thực thi tại xưởng theo thời gian thực." },
  { t: "Khái niệm 'Forward Traceability' (Truy xuất nguồn gốc xuôi) trong phả hệ mẻ sản xuất (Batch Genealogy) được hiểu là gì?",
    c: "Từ một mã lô nguyên liệu đầu vào cụ thể, truy vết ra tất cả các lô bán thành phẩm và thành phẩm đã sử dụng lô nguyên liệu đó.",
    w: ["Dự đoán số lượng hàng sẽ bán được trong năm tới", "Đo tốc độ chạy của máy", "In lại hóa đơn bán hàng"],
    e: "Forward Traceability dùng khi phát hiện nguyên liệu bị lỗi/nhiễm độc, cần truy tìm toàn bộ sản phẩm thành phẩm để thu hồi khẩn cấp." },
  { t: "Ngược lại, 'Backward Traceability' (Truy xuất nguồn gốc ngược) bắt đầu từ đâu?",
    c: "Bắt đầu từ mã số kiện hàng thành phẩm khách hàng khiếu nại, truy vết ngược lại các công đoạn và mã cuộn nguyên liệu tạo ra nó.",
    w: ["Bắt đầu từ tiền lương của giám đốc", "Bắt đầu từ bản vẽ thiết kế nhà máy", "Bắt đầu từ dự báo thời tiết"],
    e: "Backward Traceability dùng khi khách hàng phản ánh sản phẩm lỗi, cần truy tìm xem lỗi phát sinh từ lô nguyên liệu nào hay máy nào." },
  { t: "Thời gian nhịp (Takt Time) trong điều độ sản xuất Lean được định nghĩa bằng công thức nào?",
    c: "Takt Time = Thời gian làm việc khả dụng trong ca ÷ Số lượng sản phẩm khách hàng yêu cầu.",
    w: ["Takt Time = Tổng thời gian nghỉ trưa ÷ 60", "Takt Time = Tốc độ tối đa của máy in", "Takt Time = Số công nhân nhân với 8 giờ"],
    e: "Takt Time là nhịp điệu sản xuất cần đạt để đáp ứng chính xác nhu cầu khách hàng không dư thừa tồn kho." },
  { t: "Hiện tượng 'Nút thắt cổ chai' (Bottleneck) trong dây chuyền sản xuất nhiều công đoạn (In -> Bế -> Dán) là gì?",
    c: "Công đoạn có năng lực xử lý (Throughput) thấp nhất hoặc thời gian chu kỳ dài nhất, quyết định công suất đầu ra của cả dây chuyền.",
    w: ["Đoạn đường ống dẫn nước bị tắc", "Khu vực để xe của công nhân", "Máy tính điều độ bị tắt màn hình"],
    e: "Theo Lý thuyết điểm hạn chế (Theory of Constraints), năng lực của cả dây chuyền bị giới hạn bởi công đoạn Bottleneck." },
  { t: "Chuẩn B2MML (Business to Manufacturing Markup Language) sử dụng định dạng dữ liệu nào để kết nối ERP và MES?",
    c: "Lược đồ XML và JSON Schema chuẩn hóa mô hình đối tượng sản xuất theo ISA-95.",
    w: ["Mã nhị phân máy tính không đọc được", "Tệp văn bản thuần không có cấu trúc", "Hình ảnh chụp màn hình"],
    e: "B2MML do MESA phát triển chuẩn hóa cấu trúc trao đổi dữ liệu Work Order, BOM, Material Actual." },
  { t: "Quy tắc FIFO (First In, First Out) trong quản lý tồn kho bán thành phẩm WIP giữa các công đoạn có ý nghĩa gì?",
    c: "Lô bán thành phẩm nào hoàn thành trước sẽ được đưa vào công đoạn tiếp theo trước, tránh ẩm mốc và lão hóa keo/giấy.",
    w: ["Lô nào nhẹ hơn thì làm trước", "Lô nào làm xong sau cùng thì xuất trước", "Làm ngẫu nhiên không cần thứ tự"],
    e: "FIFO đảm bảo chất lượng vật liệu không bị suy giảm theo thời gian lưu kho và kiểm soát phả hệ đồng đều." }
];

for (let i = 0; i < 70; i++) {
  const base = l3DispDefs[i % l3DispDefs.length];
  const qNum = i + 1;
  const isFatal = [2, 6, 15, 24, 35, 48, 59, 66].includes(qNum);
  const options = [
    { id: '1', text: base.c, isCorrect: true },
    { id: '2', text: base.w[0], isCorrect: false },
    { id: '3', text: base.w[1], isCorrect: false },
    { id: '4', text: base.w[2], isCorrect: false }
  ];
  addQ({
    key: `sample-qst-l3disp-mcq-${String(qNum).padStart(3, '0')}`,
    folder: fld3,
    level: 'L3',
    format: isFatal ? 'critical_safety' : (i % 3 === 0 ? 'case_study' : 'theory'),
    specialty: 'MES',
    topic: 'mes-work-order',
    group: i % 2 === 0 ? 'dispatcher' : 'MES-ENG-26',
    cog: isFatal ? 'comprehension' : 'application',
    content: `${isFatal ? '[ĐIỂM LIỆT ĐIỀU ĐỘ & TRUY VẾT] ' : `[ĐIỀU ĐỘ SẢN XUẤT MES #${qNum}] `}${base.t} (Lệnh sản xuất WO-${90000 + i})`,
    explanation: base.e,
    type: 'single_choice',
    options: options.sort(() => (i % 2 === 0 ? 0 : 0.5 - Math.random())),
    isCrit: isFatal,
    critReason: isFatal ? 'Quy chuẩn truy vết chất lượng sản phẩm & Tránh lẫn lộn mẻ hàng (Zero-tolerance)' : '',
    image: qNum === 2 ? svgUris.batchGenealogy : ''
  });
}

for (let j = 1; j <= 20; j++) {
  const target = 50000 + j * 5000;
  const rIn = 0.015;
  const rBe = 0.012;
  const rDan = 0.008;
  const reqDan = Math.ceil(target / (1 - rDan));
  const reqBe = Math.ceil(reqDan / (1 - rBe));
  const reqIn = Math.ceil(reqBe / (1 - rIn));
  addQ({
    key: `sample-qst-l3disp-num-${String(j).padStart(3, '0')}`,
    folder: fld3,
    level: 'L3',
    format: 'case_study',
    specialty: 'MES',
    topic: 'mes-work-order',
    group: 'dispatcher',
    cog: 'analysis',
    content: `[TỰ LUẬN TÍNH TOÁN ĐIỀU ĐỘ #${j}] Điều độ viên tiếp nhận Lệnh sản xuất ${target.toLocaleString()} thùng carton thành phẩm. Tỷ lệ hao hụt định mức từng công đoạn gồm: Công đoạn Dán ${(rDan*100).toFixed(1)}%, Công đoạn Bế ${(rBe*100).toFixed(1)}%, Công đoạn In ${(rIn*100).toFixed(1)}%.\na) Tính số lượng bán thành phẩm cần cấp phát vào công đoạn Dán?\nb) Tính số lượng phôi giấy tấm nguyên liệu tối thiểu cần xuất kho cấp cho công đoạn In đầu tiên?\nHãy trình bày chi tiết công thức tính ngược theo từng công đoạn.`,
    explanation: `Tính ngược từ thành phẩm: Qua dán cần ${target} / (1 - ${rDan}) = ${reqDan.toLocaleString()} phôi. Qua bế cần ${reqDan} / (1 - ${rBe}) = ${reqBe.toLocaleString()} phôi. Qua in cần ${reqBe} / (1 - ${rIn}) = ${reqIn.toLocaleString()} phôi giấy tấm đầu vào.`,
    type: 'essay',
    image: j === 1 ? svgUris.batchGenealogy : '',
    rubrics: [
      { id: '1', title: 'Công thức tính ngược sản lượng bù hao hụt đa công đoạn', maxScore: 3.5, description: 'Nêu đúng công thức tính ngược chia tỷ lệ bù hao hụt từng bước.' },
      { id: '2', title: `Tính đúng bán thành phẩm công đoạn Dán: ${reqDan.toLocaleString()} sp`, maxScore: 3.0, description: 'Tính đúng số lượng bán thành phẩm công đoạn dán.' },
      { id: '3', title: `Tính đúng phôi nguyên liệu đầu vào: ${reqIn.toLocaleString()} phôi`, maxScore: 3.5, description: 'Tính chính xác tổng số phôi giấy tấm cần xuất kho cấp phát.' }
    ]
  });
}

// =================================================================================================
// 6. FOLDER L2: OEE & QUALITY SPC (90 questions) - Group: production_manager & MES-ENG-26
// =================================================================================================
const fld4 = 'sample-fld-quality-spc';
const l3MgrDefs = [
  { t: "Chỉ số OEE (Overall Equipment Effectiveness) đẳng cấp thế giới (World Class OEE) thường được quốc tế công nhận là đạt từ bao nhiêu phần trăm trở lên?",
    c: "Từ 85% trở lên (với Availability ≥ 90%, Performance ≥ 95%, Quality ≥ 99.9%).",
    w: ["Đúng 100%", "Chỉ cần trên 50%", "Đạt 70% là tối đa"],
    e: "OEE 85% là tiêu chuẩn vàng của sản xuất tinh gọn Lean Manufacturing cho thấy thiết bị vận hành tối ưu." },
  { t: "Trong công thức tính OEE, Hệ số Khả dụng (Availability) bị ảnh hưởng trực tiếp bởi nhóm tổn thất nào trong 6 tổn thất lớn (Six Big Losses)?",
    c: "Sự cố dừng máy đột xuất (Breakdowns) và thời gian dừng cài đặt căn chỉnh cữ máy (Setup & Adjustments).",
    w: ["Sản phẩm bị rách mép in", "Máy chạy chậm hơn thiết kế", "Mất kết nối Internet"],
    e: "Availability phản ánh tỷ lệ thời gian máy thực tế chạy so với thời gian lên kế hoạch chạy." },
  { t: "Hệ số Hiệu suất (Performance) trong OEE bị giảm sút do những nguyên nhân nào sau đây?",
    c: "Dừng vặt (Minor Stops dưới 5 phút) và máy phải chạy giảm tốc độ so với tốc độ thiết kế định mức.",
    w: ["Công nhân nghỉ trưa theo ca", "Thời gian máy ngừng theo lịch bảo dưỡng định kỳ", "Mất điện toàn thành phố"],
    e: "Performance đo lường sự suy giảm tốc độ vận hành thực tế so với tốc độ thiết kế lý thuyết." },
  { t: "Chỉ số năng lực quy trình thực tế Cpk khác với chỉ số năng lực tiềm năng Cp ở điểm mấu chốt nào?",
    c: "Cpk xét đến độ lệch tâm (Centering Error) của giá trị trung bình thực tế so với tâm dung sai thiết kế.",
    w: ["Cpk chỉ tính cho ngày chủ nhật", "Cpk không dùng công thức toán học", "Cp luôn luôn nhỏ hơn Cpk"],
    e: "Cp chỉ đo độ phân tán (6 sigma), còn Cpk xét cả vị trí trung bình thực tế có bị lệch về biên trên USL hoặc biên dưới LSL hay không." },
  { t: "Một quy trình sản xuất được coi là 'Có năng lực tốt và ổn định' khi chỉ số Cpk đạt giá trị tối thiểu là bao nhiêu?",
    c: "Cpk ≥ 1.33 (tương đương chuẩn chất lượng 4-Sigma với tỷ lệ phế phẩm dự báo dưới 63 PPM).",
    w: ["Cpk ≥ 0.1", "Cpk âm (-1.0)", "Cpk = 0"],
    e: "Cpk >= 1.33 là ngưỡng tiêu chuẩn công nghiệp chấp nhận được; dưới 1.0 là quy trình không đạt năng lực." },
  { t: "Chỉ số MTBF (Mean Time Between Failures) trong bảo trì thiết bị TPM phản ánh điều gì?",
    c: "Thời gian trung bình thiết bị hoạt động bình thường giữa hai lần xảy ra sự cố hỏng hóc (độ tin cậy máy).",
    w: ["Thời gian kỹ sư sửa chữa máy", "Thời gian thay dao bế", "Thời gian máy nghỉ ca"],
    e: "MTBF càng cao chứng tỏ máy móc càng tin cậy và ít bị dừng đột xuất." },
  { t: "Chỉ số MTTR (Mean Time To Repair) phản ánh điều gì và mục tiêu của đội bảo trì là gì?",
    c: "Thời gian trung bình để sửa chữa khắc phục sự cố; mục tiêu là giảm MTTR càng thấp càng tốt.",
    w: ["Thời gian máy chạy không tải", "Thời gian giao hàng cho khách", "Mục tiêu là tăng MTTR lên tối đa"],
    e: "MTTR phản ánh năng lực và tốc độ sửa chữa sự cố của đội ngũ bảo trì kỹ thuật." }
];

for (let i = 0; i < 70; i++) {
  const base = l3MgrDefs[i % l3MgrDefs.length];
  const qNum = i + 1;
  const isFatal = [1, 4, 10, 18, 27, 39, 51, 62].includes(qNum);
  const options = [
    { id: '1', text: base.c, isCorrect: true },
    { id: '2', text: base.w[0], isCorrect: false },
    { id: '3', text: base.w[1], isCorrect: false },
    { id: '4', text: base.w[2], isCorrect: false }
  ];
  addQ({
    key: `sample-qst-l3mgr-mcq-${String(qNum).padStart(3, '0')}`,
    folder: fld4,
    level: 'L2',
    format: isFatal ? 'critical_safety' : (i % 3 === 0 ? 'case_study' : 'theory'),
    specialty: 'MES',
    topic: 'mes-quality-oee',
    group: i % 2 === 0 ? 'production_manager' : 'MES-ENG-26',
    cog: isFatal ? 'comprehension' : 'analysis',
    content: `${isFatal ? '[ĐIỂM LIỆT QUẢN LÝ CHẤT LƯỢNG] ' : `[QUẢN LÝ SẢN XUẤT & OEE/SPC #${qNum}] `}${base.t} (Phân xưởng Bao bì #${(i % 3) + 1})`,
    explanation: base.e,
    type: 'single_choice',
    options: options.sort(() => (i % 2 === 0 ? 0 : 0.5 - Math.random())),
    isCrit: isFatal,
    critReason: isFatal ? 'Quy chuẩn kiểm soát chất lượng & Minh bạch số liệu OEE nhà máy (Zero-tolerance)' : '',
    image: qNum === 1 ? svgUris.oeeWaterfall : ''
  });
}

for (let j = 1; j <= 20; j++) {
  const planMins = 450;
  const downMins = 30 + j * 2;
  const runMins = planMins - downMins;
  const speed = 100;
  const idealOutput = runMins * speed;
  const actualOutput = Math.round(idealOutput * (0.85 + (j % 5) * 0.02));
  const scrap = Math.round(actualOutput * 0.04);
  const good = actualOutput - scrap;
  const A = ((runMins / planMins) * 100).toFixed(2);
  const P = ((actualOutput / idealOutput) * 100).toFixed(2);
  const Q = ((good / actualOutput) * 100).toFixed(2);
  const OEE = ((A * P * Q) / 10000).toFixed(2);

  addQ({
    key: `sample-qst-l3mgr-num-${String(j).padStart(3, '0')}`,
    folder: fld4,
    level: 'L2',
    format: 'case_study',
    specialty: 'MES',
    topic: 'mes-quality-oee',
    group: 'production_manager',
    cog: 'analysis',
    content: `[TỰ LUẬN TÍNH TOÁN OEE QUẢN LÝ #${j}] Ca làm việc 8 giờ có thời gian chạy kế hoạch ${planMins} phút. Sự cố dừng máy cộng dồn là ${downMins} phút. Tốc độ thiết kế ${speed} sp/phút. Sản lượng thực tế đạt ${actualOutput.toLocaleString()} sp, trong đó có ${scrap.toLocaleString()} phế phẩm.\na) Tính Hệ số Khả dụng A (%)?\nb) Tính Hệ số Hiệu suất P (%)?\nc) Tính Hệ số Chất lượng Q (%)?\nd) Tính chỉ số OEE (%) của ca làm việc?\nHãy trình bày đầy đủ công thức và các bước tính số.`,
    explanation: `A = ${runMins}/${planMins} = ${A}%. P = ${actualOutput}/${idealOutput} = ${P}%. Q = ${good}/${actualOutput} = ${Q}%. OEE = ${A}% * ${P}% * ${Q}% = ${OEE}%.`,
    type: 'essay',
    image: j === 1 ? svgUris.oeeWaterfall : '',
    rubrics: [
      { id: '1', title: `Tính đúng Availability: ${A}%`, maxScore: 2.5, description: 'Lấy thời gian chạy thực chia thời gian chạy kế hoạch.' },
      { id: '2', title: `Tính đúng Performance: ${P}%`, maxScore: 2.5, description: 'Lấy sản lượng thực chia sản lượng lý thuyết trong thời gian chạy thực.' },
      { id: '3', title: `Tính đúng Quality: ${Q}%`, maxScore: 2.5, description: 'Lấy sản phẩm đạt chuẩn chia tổng sản lượng thực tế.' },
      { id: '4', title: `Tính đúng OEE: ${OEE}%`, maxScore: 2.5, description: 'Tích 3 hệ số A * P * Q.' }
    ]
  });
}

// =================================================================================================
// 7. FOLDER L3: CLEAN ARCHITECTURE & IDEMPOTENCY (50 questions) - Group: ARCH-MS-01, WEB-ADV-26
// =================================================================================================
const fldArch = 'sample-fld-arch-clean';
const archMCQDefs = [
  { t: "Nguyên lý bất di bất dịch cốt lõi (The Dependency Rule) trong Clean Architecture quy định hướng phụ thuộc của mã nguồn như thế nào?",
    c: "Mã nguồn chỉ được phụ thuộc hướng vào trong (Inward); các tầng bên trong (Domain Entity, Use Cases) tuyệt đối không biết gì về Database, UI hay Framework bên ngoài.",
    w: ["Tầng nghiệp vụ Domain phải import trực tiếp thư viện kết nối Database", "Tất cả các tầng đều phụ thuộc vào giao diện người dùng UI", "Phụ thuộc tự do vòng tròn lẫn nhau"],
    e: "Quy tắc phụ thuộc một chiều giúp bảo vệ lõi nghiệp vụ doanh nghiệp độc lập với sự thay đổi của cơ sở dữ liệu và công nghệ giao diện." },
  { t: "Trong kiến trúc Modular Monolith cho hệ thống điều hành nhà máy MES, lợi thế vượt trội nhất so với Microservices trong giai đoạn đầu là gì?",
    c: "Đảm bảo tính toàn vẹn giao dịch ACID trên cùng Database, không gặp độ trễ mạng phân tán và triển khai vận hành cực kỳ tinh gọn.",
    w: ["Không cần viết mã nguồn", "Tự động sinh ra tiền cho doanh nghiệp", "Thay thế hoàn toàn công nhân nhà máy"],
    e: "Modular Monolith giữ ranh giới module rõ ràng trong một tiến trình duy nhất, tránh các vấn đề Distributed Transactions (Saga) phức tạp của Microservices." },
  { t: "Cơ chế kiểm soát xung đột đồng thời lạc quan (Optimistic Concurrency Control - OCC) qua cột RowVersion hoạt động theo nguyên tắc nào?",
    c: "Khi cập nhật bản ghi, so sánh RowVersion hiện tại với RowVersion lúc đọc; nếu khác nhau nghĩa là đã có người khác sửa trước và câu lệnh sẽ bị từ chối.",
    w: ["Khóa cứng toàn bộ bảng cơ sở dữ liệu không cho ai đọc", "Tự động ghi đè mà không cần kiểm tra", "Xóa bản ghi cũ và tạo bản ghi mới ngẫu nhiên"],
    e: "OCC dùng RowVersion ngăn chặn lỗi ghi đè dữ liệu mất mát (Lost Updates) giữa hai người dùng cùng sửa một Lệnh sản xuất mà không cần lock hàng kéo dài." },
  { t: "Cơ chế Idempotency Key (Khóa bất biến) trên API xác nhận hoàn thành công đoạn giải quyết vấn đề kỹ thuật gì?",
    c: "Ngăn chặn việc cộng trùng sản lượng hoặc trừ hai lần tồn kho khi người dùng nhấn nút 2 lần hoặc mạng chập chờn client tự động gửi lại request (Retry).",
    w: ["Tăng tốc độ máy chủ lên gấp 100 lần", "Lưu trữ mật khẩu người dùng dưới dạng mã hóa", "Tự động in báo cáo ra giấy"],
    e: "Idempotency Key đảm bảo cho dù một yêu cầu HTTP POST được gửi 10 lần thì hệ quả kinh doanh lên cơ sở dữ liệu chỉ được thực thi đúng 1 lần duy nhất." },
  { t: "Trong React 19, Hook `useTransition` mang lại lợi ích gì vượt trội khi hiển thị bảng dữ liệu thời gian thực hàng ngàn cảm biến xưởng?",
    c: "Đánh dấu việc render biểu đồ nặng vào diện ưu tiên thấp (Non-blocking), giữ cho giao diện gõ phím, cuộn chuột và click nút luôn phản hồi tức thì.",
    w: ["Xóa bỏ hoàn toàn bộ nhớ cache của trình duyệt", "Tự động biến React thành ứng dụng Java Desktop", "Tắt toàn bộ animation"],
    e: "useTransition phân tách các cập nhật khẩn cấp (Urgent - nhập liệu) và cập nhật chuyển tiếp (Transition - dữ liệu telemetry nền) chống đơ giao diện." },
  { t: "Kỹ thuật 'Virtualized Window' (Virtual List) trong hiển thị danh sách 50.000 câu hỏi hay log vận hành máy giải quyết bài toán hiệu năng nào?",
    c: "Chỉ tạo và render các phần tử DOM nằm trong khung nhìn màn hình (Viewport), giữ số lượng DOM node luôn dưới 50 phần tử và RAM trình duyệt cực thấp.",
    w: ["Tải toàn bộ 50.000 dòng vào DOM cùng một lúc", "Tự động ẩn đi các dòng có lỗi", "Biến bảng HTML thành tệp PDF"],
    e: "Nếu render 50.000 node DOM đồng thời trình duyệt sẽ bị tràn bộ nhớ và sụt FPS nghiêm trọng; Virtualization giải quyết triệt để vấn đề này." },
  { t: "Lợi ích của kỹ thuật Multi-stage build trong Dockerfile khi đóng gói ứng dụng Golang Core Server là gì?",
    c: "Biên dịch mã nguồn trong container trung gian và chỉ sao chép file thực thi nhị phân duy nhất sang container Scratch/Alpine, giảm kích thước image từ 1.5GB xuống dưới 30MB.",
    w: ["Làm tăng dung lượng image lên 10GB để an toàn", "Bắt buộc người dùng cài thêm trình duyệt vào máy chủ", "Tự động viết code thay cho lập trình viên"],
    e: "Multi-stage build loại bỏ toàn bộ Go SDK, mã nguồn và build tools ra khỏi container triển khai, tối ưu bảo mật và thời gian kéo image cực nhanh." }
];

for (let i = 0; i < 35; i++) {
  const base = archMCQDefs[i % archMCQDefs.length];
  const qNum = i + 1;
  const isFatal = [3, 7, 14, 21, 29].includes(qNum);
  const options = [
    { id: '1', text: base.c, isCorrect: true },
    { id: '2', text: base.w[0], isCorrect: false },
    { id: '3', text: base.w[1], isCorrect: false },
    { id: '4', text: base.w[2], isCorrect: false }
  ];
  addQ({
    key: `sample-qst-arch-mcq-${String(qNum).padStart(3, '0')}`,
    folder: fldArch,
    level: 'L3',
    format: isFatal ? 'critical_safety' : (i % 2 === 0 ? 'theory' : 'case_study'),
    specialty: 'ARCH',
    topic: i % 3 === 0 ? 'arch-clean' : (i % 3 === 1 ? 'arch-idempotency' : 'react-concurrent'),
    group: i % 2 === 0 ? 'ARCH-MS-01' : 'WEB-ADV-26',
    cog: isFatal ? 'comprehension' : 'application',
    content: `${isFatal ? '[ĐIỂM LIỆT KIẾN TRÚC & IDEMPOTENCY] ' : `[KIẾN TRÚC PHẦN MỀM LÕI #${qNum}] `}${base.t} (Hệ thống SkillHub Enterprise Core)`,
    explanation: base.e,
    type: 'single_choice',
    options: options.sort(() => (i % 2 === 0 ? 0 : 0.5 - Math.random())),
    isCrit: isFatal,
    critReason: isFatal ? 'Quy chuẩn toàn vẹn dữ liệu giao dịch & Chống xung đột dữ liệu RowVersion' : ''
  });
}

for (let j = 1; j <= 15; j++) {
  addQ({
    key: `sample-qst-arch-num-${String(j).padStart(3, '0')}`,
    folder: fldArch,
    level: 'L3',
    format: 'case_study',
    specialty: 'ARCH',
    topic: 'arch-idempotency',
    group: 'ARCH-MS-01',
    cog: 'analysis',
    content: `[TỰ LUẬN KIẾN TRÚC HỆ THỐNG #${j}] Khi thiết kế API xác nhận sản lượng công đoạn sản xuất (Operation Confirmation):\na) Hãy mô tả cơ chế Idempotency Key và cách lưu vết cache token để xử lý an toàn khi client gửi trùng lặp request?\nb) Giải thích cơ chế Optimistic Concurrency Control (OCC) thông qua RowVersion để loại trừ Race Condition khi 2 trưởng ca cùng sửa trạng thái Work Order?\nc) Trình bày nguyên lý thiết kế Clean Architecture phân tầng Domain - Application - Infrastructure cho use case này.`,
    explanation: `API nhận header Idempotency-Key kiểm tra trong Redis/DB; nếu đã xử lý trả về response cũ. Trong UPDATE query sử dụng WHERE "IdSeq"=id AND "RowVersion"=version; nếu RowsAffected=0 thông báo xung đột dữ liệu. Tầng Domain định nghĩa entity và quy tắc trừ kho, tầng Application điều phối transaction, tầng Infrastructure triển khai gRPC/SQL.`,
    type: 'essay',
    rubrics: [
      { id: '1', title: 'Thiết kế cơ chế Idempotency Key hoàn chỉnh', maxScore: 3.5, description: 'Trình bày đúng nguyên lý header token và cache kết quả giao dịch.' },
      { id: '2', title: 'Cơ chế Optimistic Concurrency Control qua RowVersion', maxScore: 3.5, description: 'Mô tả đúng câu lệnh UPDATE có điều kiện version và xử lý RowsAffected=0.' },
      { id: '3', title: 'Phân tầng Clean Architecture và nguyên lý phụ thuộc', maxScore: 3.0, description: 'Phân tách đúng trách nhiệm Domain, Application và Infrastructure.' }
    ]
  });
}

// =================================================================================================
// 8. FOLDER ALL: SAFETY CRITICAL & LOTO (90 questions) - Group: all, worker, dispatcher, production_manager
// =================================================================================================
const fld5 = 'sample-fld-safety-critical';
const safetyMCQDefs = [
  { t: "Bước thứ 4 trong quy trình 6 bước khóa nguồn an toàn Lockout / Tagout (LOTO) quy định người thực hiện phải làm gì?",
    c: "Khóa ổ khóa an toàn cá nhân (Lockout) vào thiết bị cô lập nguồn và treo thẻ cảnh báo cá nhân (Tagout) ghi rõ tên người thực hiện.",
    w: ["Giao chìa khóa cho bảo vệ giữ hộ", "Chỉ treo biển giấy không cần khóa", "Nhờ đồng nghiệp khóa hộ"],
    e: "Nguyên tắc LOTO: Mỗi người một ổ khóa và một chìa khóa riêng biệt (One Person, One Lock, One Key)." },
  { t: "Trong quy trình LOTO, tại sao bước 5 'Xả và triệt tiêu năng lượng dư thừa (Dissipate Stored Energy)' bắt buộc phải thực hiện trước khi bước vào máy?",
    c: "Vì áp suất thủy lực còn tích trong bình tích áp hoặc thế năng trọng lực của bệ dao treo cao có thể tự giải phóng gây nghiền dập tử vong.",
    w: ["Để xả nước rửa sàn nhà máy", "Để tiết kiệm điện năng cho công ty", "Để máy không bị han gỉ"],
    e: "Năng lượng dư thừa tàng trữ (Stored Energy) là nguyên nhân của hơn 70% các vụ tai nạn lao động nghiêm trọng trong bảo trì máy." },
  { t: "Khi nút dừng khẩn cấp E-Stop bị nhấn kích hoạt, động cơ dừng lại. Để máy có thể chạy lại an toàn, quy trình bắt buộc là gì?",
    c: "Kiểm tra loại bỏ nguyên nhân sự cố ➔ Xoay nhả nút E-Stop cơ khí ➔ Nhấn nút Reset an toàn tại tủ điện ➔ Mới được ấn nút Start vận hành.",
    w: ["Chỉ cần ấn nút Start là máy tự vượt qua lỗi E-Stop", "Cắt đứt dây nối nút E-Stop", "Cắm điện trực tiếp vào động cơ bỏ qua tủ"],
    e: "Quy chuẩn ISO 13850 bắt buộc mạch an toàn phải có thao tác Reset có chủ đích sau khi giải phóng nút E-Stop." },
  { t: "Hành vi nào sau đây vi phạm nghiêm trọng quy chuẩn an toàn lao động và bị xử lý sa thải ngay lập tức (Zero-Tolerance)?",
    c: "Đấu tắt (Bypass / Jumper) tiếp điểm công tắc an toàn cửa buồng máy hoặc rèm quang an toàn để máy chạy khi cửa mở.",
    w: ["Đeo găng tay bảo hộ lao động khi làm việc", "Báo cáo sự cố rò rỉ dầu cho trưởng ca", "Tham gia huấn luyện an toàn lao động định kỳ"],
    e: "Bypass công tắc an toàn cửa máy là hành vi cố ý triệt tiêu tính năng bảo vệ tính mạng con người, bị cấm tuyệt đối." },
  { t: "Khi làm việc bảo dưỡng trong không gian hạn chế (Confined Space) như bên trong bồn trộn hóa chất hoặc lò sấy dài, nồng độ oxy tối thiểu cho phép là bao nhiêu?",
    c: "Nồng độ oxy trong không khí phải đạt từ 19.5% đến 23.5% và có người cảnh giới liên tục ở cửa bồn.",
    w: ["Dưới 10% oxy", "Trên 50% oxy", "Không cần đo oxy"],
    e: "Nồng độ oxy dưới 19.5% gây ngạt thở bất tỉnh trong vài giây; trên 23.5% là môi trường cực kỳ dễ bắt cháy nổ." },
  { t: "Khi xảy ra cháy khay chứa mực in dung môi cồn ethanol trong xưởng in Flexo, loại bình chữa cháy nào sau đây TUYỆT ĐỐI KHÔNG ĐƯỢC SỬ DỤNG?",
    c: "Tuyệt đối không dùng nước hoặc vòi phun nước áp lực cao vì sẽ làm dung môi nổi lên trên và loang rộng đám cháy.",
    w: ["Bình bột chữa cháy khô ABC", "Bình khí CO2 làm ngạt", "Hệ thống màng bọt bọt Foam dập cháy dung môi"],
    e: "Dung môi hữu cơ nhẹ hơn nước, dội nước vào sẽ làm cháy lan nhanh chóng và bắn dung môi đang cháy ra xung quanh." },
  { t: "Khoảng cách an toàn phóng điện tối thiểu đối với đường dây điện hoặc thanh cái trần cấp điện áp 380V hạ thế là bao nhiêu?",
    c: "Tối thiểu 0.5 mét đối với thao tác có cách điện và cấm tiếp xúc trực tiếp bằng cơ thể hoặc vật dẫn trần.",
    w: ["0 cm (chạm tay trực tiếp)", "10 mét", "50 mét"],
    e: "Quy chuẩn an toàn điện quy định khoảng cách an toàn chống phóng điện hồ quang và giật điện." }
];

for (let i = 0; i < 70; i++) {
  const base = safetyMCQDefs[i % safetyMCQDefs.length];
  const qNum = i + 1;
  const options = [
    { id: '1', text: base.c, isCorrect: true },
    { id: '2', text: base.w[0], isCorrect: false },
    { id: '3', text: base.w[1], isCorrect: false },
    { id: '4', text: base.w[2], isCorrect: false }
  ];
  addQ({
    key: `sample-qst-safe-mcq-${String(qNum).padStart(3, '0')}`,
    folder: fld5,
    level: 'All',
    format: 'critical_safety',
    specialty: 'MES',
    topic: 'mes-scada-opcua',
    group: 'all',
    cog: 'comprehension',
    content: `[ĐIỂM LIỆT AN TOÀN NHÀ MÁY #${qNum}] ${base.t} (Quy chuẩn Zero-Tolerance Nhà máy Thông minh)`,
    explanation: base.e,
    type: 'single_choice',
    options: options.sort(() => (i % 2 === 0 ? 0 : 0.5 - Math.random())),
    isCrit: true,
    critReason: 'Quy chuẩn an toàn tính mạng tuyệt đối & LOTO Zero-Tolerance (Bắt buộc đúng 100%)',
    image: qNum === 1 ? svgUris.lotoSafety : ''
  });
}

for (let j = 1; j <= 20; j++) {
  const k = 1600;
  const tStop = (0.08 + j * 0.01).toFixed(2);
  const cExtra = 128;
  const sDist = Math.round(k * tStop + cExtra);
  addQ({
    key: `sample-qst-safe-num-${String(j).padStart(3, '0')}`,
    folder: fld5,
    level: 'All',
    format: 'critical_safety',
    specialty: 'MES',
    topic: 'mes-scada-opcua',
    group: 'all',
    cog: 'analysis',
    content: `[TỰ LUẬN TÍNH TOÁN AN TOÀN #${j}] Theo tiêu chuẩn EN ISO 13855, khoảng cách an toàn tối thiểu S (mm) từ rèm quang an toàn (Light Curtain) đến vùng nguy hiểm của dao máy bế được tính theo công thức S = (K × T) + C.\n- Tốc độ với tay của người K = 1600 mm/s.\n- Tổng thời gian dừng của máy và rèm quang đo được T = ${tStop} giây.\n- Hệ số độ sâu thò tay C = ${cExtra} mm.\na) Hãy tính khoảng cách an toàn tối thiểu S (mm) bắt buộc phải lắp rèm quang?\nb) Nếu kỹ sư lắp rèm quang cách dao bế chỉ 150 mm thì hậu quả nguy hiểm là gì?\nHãy nhập chi tiết công thức và kết quả số.`,
    explanation: `Khoảng cách an toàn S = (1600 * ${tStop}) + ${cExtra} = ${sDist} mm. Nếu lắp khoảng cách 150 mm nhỏ hơn ${sDist} mm, khi công nhân thò tay vào vùng nguy hiểm, máy chưa kịp dừng hẳn và dao bế sẽ dập đứt lìa bàn tay.`,
    type: 'essay',
    isCrit: true,
    critReason: 'Tính toán sai khoảng cách an toàn rèm quang dẫn đến tai nạn dập nát chi nghiêm trọng (Zero-tolerance).',
    image: j === 1 ? svgUris.lotoSafety : '',
    rubrics: [
      { id: '1', title: 'Công thức tính khoảng cách an toàn theo ISO 13855', maxScore: 3.5, description: 'Nêu đúng công thức S = (K * T) + C.' },
      { id: '2', title: `Tính đúng khoảng cách an toàn tối thiểu S = ${sDist} mm`, maxScore: 3.5, description: `Thay số tính ra S = ${sDist} mm.` },
      { id: '3', title: 'Phân tích nguy cơ tai nạn khi lắp dưới khoảng cách an toàn', maxScore: 3.0, description: 'Chỉ rõ tay công nhân tiếp cận dao trước khi máy dừng kịp.' }
    ]
  });
}

console.log(`Successfully generated ${questions.length} questions across ${sampleFolders.length} folders!`);

// 3. Write sample_questions.json
fs.writeFileSync(path.join(__dirname, 'sample_questions.json'), JSON.stringify({
  folders: sampleFolders,
  questions: questions
}, null, 2));
console.log('Saved sample_questions.json!');

// 4. Generate seed_bank.sql
function escapeSql(str) {
  if (str === null || str === undefined) return "''";
  return "$val$" + String(str).replace(/\0/g, '') + "$val$";
}

let sql = `-- ============================================================================
-- AUTO-GENERATED QUESTION BANK SEED SCRIPT (SKILLHUB SMART FACTORY)
-- Total Folders: ${sampleFolders.length} | Total Questions: ${questions.length}
-- ============================================================================
BEGIN;

-- Set system actor context for auditing
SELECT set_config('app.actor_seq', '01a14802-9765-7cdb-922e-357b570d1809', true);

-- 1. Ensure Target Groups exist in Catalog
INSERT INTO "_SYSCatalogOption"("CatalogKey", "Value", "Label", "Enabled", "SortOrder", "CreatedBy", "UpdatedBy")
VALUES 
  ('target_group', 'worker', 'Công nhân vận hành & Kỹ thuật máy', true, 7, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809'),
  ('target_group', 'dispatcher', 'Điều độ sản xuất & Trưởng ca', true, 8, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809'),
  ('target_group', 'production_manager', 'Quản lý sản xuất (QLSX)', true, 9, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809')
ON CONFLICT ("CatalogKey", "Value") DO UPDATE SET "Label"=EXCLUDED."Label", "Enabled"=true;

-- 2. Seed Folders
`;

for (const fld of sampleFolders) {
  sql += `
INSERT INTO "_QSTFolder"("Name", "Description", "LevelId", "SampleKey", "CreatedBy", "UpdatedBy")
VALUES (
  ${escapeSql(fld.Name)},
  ${escapeSql(fld.Description)},
  (SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='level' AND "Value"=${escapeSql(fld.LevelCode)} LIMIT 1),
  ${escapeSql(fld.SampleKey)},
  '01a14802-9765-7cdb-922e-357b570d1809',
  '01a14802-9765-7cdb-922e-357b570d1809'
)
ON CONFLICT ("SampleKey") DO UPDATE SET
  "Name"=EXCLUDED."Name",
  "Description"=EXCLUDED."Description",
  "LevelId"=EXCLUDED."LevelId";
`;
}

sql += `\n-- 3. Seed Questions\n`;

for (const q of questions) {
  const optJson = JSON.stringify(q.Options);
  const rubJson = JSON.stringify(q.Rubrics);

  sql += `
INSERT INTO "_QSTQuestion"(
  "LevelId", "FormatId", "SpecialtyId", "TopicId", "TargetGroupId", "CognitiveLevelId",
  "FolderId", "Content", "Explanation", "Type", "Options", "Rubrics",
  "SimulationType", "IsCritical", "CriticalReason", "ImageUrl", "Status",
  "AuthorId", "SampleKey", "CreatedBy", "UpdatedBy"
) VALUES (
  (SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='level' AND "Value"=${escapeSql(q.LevelCode)} LIMIT 1),
  (SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='question_format' AND "Value"=${escapeSql(q.FormatCode)} LIMIT 1),
  (SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='specialty' AND "Value"=${escapeSql(q.SpecialtyCode)} LIMIT 1),
  (SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='question_topic' AND "Value"=${escapeSql(q.TopicCode)} LIMIT 1),
  (SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='target_group' AND "Value"=${escapeSql(q.TargetGroupCode)} LIMIT 1),
  (SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='cognitive_level' AND "Value"=${escapeSql(q.CognitiveLevelCode)} LIMIT 1),
  (SELECT "IdSeq" FROM "_QSTFolder" WHERE "SampleKey"=${escapeSql(q.FolderSampleKey)} LIMIT 1),
  ${escapeSql(q.Content)},
  ${escapeSql(q.Explanation)},
  ${escapeSql(q.Type)},
  ${escapeSql(optJson)}::jsonb,
  ${escapeSql(rubJson)}::jsonb,
  ${escapeSql(q.SimulationType)},
  ${q.IsCritical ? 'true' : 'false'},
  ${escapeSql(q.CriticalReason)},
  ${escapeSql(q.ImageUrl)},
  ${escapeSql(q.Status)},
  '01a147e8-bfdf-7bba-b390-b45c43410463',
  ${escapeSql(q.SampleKey)},
  '01a14802-9765-7cdb-922e-357b570d1809',
  '01a14802-9765-7cdb-922e-357b570d1809'
)
ON CONFLICT ("SampleKey") DO UPDATE SET
  "LevelId"=EXCLUDED."LevelId",
  "FormatId"=EXCLUDED."FormatId",
  "SpecialtyId"=EXCLUDED."SpecialtyId",
  "TopicId"=EXCLUDED."TopicId",
  "TargetGroupId"=EXCLUDED."TargetGroupId",
  "CognitiveLevelId"=EXCLUDED."CognitiveLevelId",
  "FolderId"=EXCLUDED."FolderId",
  "Content"=EXCLUDED."Content",
  "Explanation"=EXCLUDED."Explanation",
  "Type"=EXCLUDED."Type",
  "Options"=EXCLUDED."Options",
  "Rubrics"=EXCLUDED."Rubrics",
  "SimulationType"=EXCLUDED."SimulationType",
  "IsCritical"=EXCLUDED."IsCritical",
  "CriticalReason"=EXCLUDED."CriticalReason",
  "ImageUrl"=EXCLUDED."ImageUrl",
  "Status"=EXCLUDED."Status";
`;
}

sql += `\nCOMMIT;\n`;

const sqlPath = path.join(__dirname, 'seed_bank.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');
console.log(`Saved seed_bank.sql (${(fs.statSync(sqlPath).size / 1024).toFixed(1)} KB)!`);
