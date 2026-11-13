package skillauth

import (
	"context"
	"encoding/json"
	"fmt"
)

type sampleFolderSeed struct {
	SampleKey   string
	Name        string
	Description string
	LevelCode   string
}

type sampleQuestionSeed struct {
	SampleKey          string
	FolderSampleKey    string
	LevelCode          string
	FormatCode         string
	SpecialtyCode      string
	TopicCode          string
	TargetGroupCode    string
	CognitiveLevelCode string
	Content            string
	Explanation        string
	Type               string
	Options            []map[string]any
	Rubrics            []map[string]any
	SimulationType     string
	IsCritical         bool
	CriticalReason     string
	ImageUrl           string
	Status             string
}

// 8 Standardized Folders categorized by ISA-95 Levels (L0, L1, L2, L3, All)
var sampleFolders = []sampleFolderSeed{
	{
		SampleKey:   "sample-fld-l0-sensors",
		Name:        "Khối L0 — Cảm biến & Thiết bị hiện trường",
		Description: "Ngân hàng câu hỏi về cảm biến quang, tiệm cận, tín hiệu analog 4-20mA, cặp nhiệt điện PT100/TC và mạch đấu nối 24VDC.",
		LevelCode:   "L0",
	},
	{
		SampleKey:   "sample-fld-l1-plc-control",
		Name:        "Khối L1 — Lập trình PLC & Mạng truyền thông Công nghiệp",
		Description: "Logic chấp hành PLC, ngắt phần cứng Hardware Interrupt, bộ đếm tốc độ cao HSC, mạng Profinet và logic an toàn máy Fail-Safe.",
		LevelCode:   "L1",
	},
	{
		SampleKey:   "sample-fld-scada-opcua",
		Name:        "Khối L2 — Giám sát SCADA & Trạm HMI Thông minh",
		Description: "Giao diện HMI cảm ứng, thu thập dữ liệu thời gian thực OPC-UA DA/HA, đồ thị trend telemetry, quản lý cảnh báo Alarm và điều khiển vận hành.",
		LevelCode:   "L2",
	},
	{
		SampleKey:   "sample-fld-sec-oauth",
		Name:        "Khối L2 — Bảo mật Mạng Công nghiệp OT/IT & An toàn Phiên",
		Description: "Nguyên lý phân tầng Purdue, bảo mật IEC 62443, xác thực HttpOnly Cookie, bảo vệ kết nối OPC-UA và phòng chống tấn công mạng xưởng.",
		LevelCode:   "L2",
	},
	{
		SampleKey:   "sample-fld-mes-isa95",
		Name:        "Khối L3 — Hệ thống Điều hành Sản xuất (MES & Chuẩn ISA-95)",
		Description: "Kiến trúc ISA-95/Purdue Model, điều độ lệnh sản xuất Work Order, phả hệ mẻ nguyên vật liệu Batch Genealogy và tích hợp B2MML ERP.",
		LevelCode:   "L3",
	},
	{
		SampleKey:   "sample-fld-quality-spc",
		Name:        "Khối L2 — Kiểm soát Chất lượng Công đoạn SPC & Hiệu suất Thiết bị OEE",
		Description: "Công thức và tình huống thực tế về tính toán OEE, biểu đồ kiểm soát SPC và phả hệ truy vết nguyên vật liệu (Genealogy).",
		LevelCode:   "L2",
	},
	{
		SampleKey:   "sample-fld-arch-clean",
		Name:        "Khối L3 — Kiến trúc Phần mềm Modular Monolith & Giao dịch Idempotency",
		Description: "Nguyên lý thiết kế hệ thống lõi bền vững, cơ chế Idempotency API và kiểm soát xung đột phiên bản RowVersion.",
		LevelCode:   "L3",
	},
	{
		SampleKey:   "sample-fld-safety-critical",
		Name:        "Khối Điểm liệt — Quy chuẩn An toàn Vận hành & LOTO Tuyệt đối",
		Description: "Bộ câu hỏi điểm liệt bắt buộc đúng 100%, quy tắc dừng khẩn cấp E-Stop, khóa nguồn Lockout/Tagout và an toàn tính mạng tuyệt đối.",
		LevelCode:   "All",
	},
}

var sampleQuestions = []sampleQuestionSeed{
	// ==========================================
	// KHỐI LEVEL L0: CẢM BIẾN & THIẾT BỊ HIỆN TRƯỜNG
	// ==========================================
	{
		SampleKey:          "sample-qst-l0-01",
		FolderSampleKey:    "sample-fld-l0-sensors",
		LevelCode:          "L0",
		FormatCode:         "critical_safety",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "all",
		CognitiveLevelCode: "comprehension",
		Content:            "[ĐIỂM LIỆT AN TOÀN - CÓ HÌNH ẢNH] Quan sát sơ đồ đấu nối cảm biến tiệm cận quang 3 dây NPN (Normally Open) nguồn 24VDC vào ngõ vào Digital Input (DI) của PLC. Nếu kỹ sư bảo trì đấu nhầm dây nguồn 220VAC vào chân tín hiệu (Dây màu đen - Black Wire), sự cố nghiêm trọng nào chắc chắn sẽ xảy ra?",
		Explanation:        "Cảm biến NPN sử dụng bóng bán dẫn BJT/MOSFET với mức chịu áp tối đa danh định 30VDC. Khi cấp 220VAC (điện áp đỉnh > 310V), dòng xung điện cực đại sẽ phá hủy lớp bán dẫn, gây nổ module quang cách ly (Optocoupler) và làm hỏng toàn bộ kênh DI trên PLC.",
		Type:               "single_choice",
		IsCritical:         true,
		CriticalReason:     "Đấu nhầm nguồn AC vào ngõ vào cảm biến DC gây cháy nổ linh kiện bán dẫn và nguy cơ điện giật chết người.",
		ImageUrl:           `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMjgwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICAgIDxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMGYxNzJhIiByeD0iMTAiLz4KICAgIDx0ZXh0IHg9IjI0IiB5PSIzMiIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5TxqAgxJDhu5IgxJDhuqRVIE7hu5BJIEPhuqJNIEJJ4bq+TiBUSeG7hk0gQ+G6rE4gTlBOICgyNFZEQykgVsOATyBQTEM8L3RleHQ+CiAgICA8cmVjdCB4PSIzMCIgeT0iNTUiIHdpZHRoPSIxNjAiIGhlaWdodD0iMTkwIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iMiIgcng9IjgiLz4KICAgIDx0ZXh0IHg9IjUwIiB5PSI4NSIgZmlsbD0iI2Y4ZmFmYyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZvbnQtd2VpZ2h0PSJib2xkIj5D4bqiTSBCSeG6vk4gUVVBTkc8L3RleHQ+CiAgICA8dGV4dCB4PSI2NSIgeT0iMTA1IiBmaWxsPSIjOTRhM2I4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSI+TlBOIE5PICgyNFZEQyk8L3RleHQ+CiAgICA8cmVjdCB4PSI1MCIgeT0iMTI1IiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjMDkwZDE2IiBzdHJva2U9IiM0NzU1NjkiIHJ4PSI0Ii8+CiAgICA8dGV4dCB4PSI2NSIgeT0iMTUwIiBmaWxsPSIjY2JkNWUxIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjExIj5Ew6J5IE7DonUgKCspPC90ZXh0PgogICAgPHRleHQgeD0iNjUiIHk9IjE3NSIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMSI+RMOieSDEkGVuIChTaWcpPC90ZXh0PgogICAgPHRleHQgeD0iNjUiIHk9IjIwMCIgZmlsbD0iIzkzYzVmZCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMSI+RMOieSBYYW5oICgtKTwvdGV4dD4KICAgIDxwYXRoIGQ9Ik0xOTAgMTQ1IEwyNzAgMTQ1IiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWRhc2hhcnJheT0iNCw0Ii8+CiAgICA8cGF0aCBkPSJNMTkwIDE3MCBMNDIwIDE3MCIgc3Ryb2tlPSIjMDI4NGM3IiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxwYXRoIGQ9Ik0xOTAgMTk1IEwyNzAgMTk1IiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMjcwIiB5PSIxMjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iOTUiIGZpbGw9IiMxZTI5M2IiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHJ4PSI2Ii8+CiAgICA8dGV4dCB4PSIyODAiIHk9IjE0NSIgZmlsbD0iI2ZkZTY4YSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZvbnQtd2VpZ2h0PSJib2xkIj5OR1Xhu5JOIDI0VkRDPC90ZXh0PgogICAgPHRleHQgeD0iMjkwIiB5PSIxNzAiIGZpbGw9IiNjYmQ1ZTEiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTEiPisyNFYgKE7DonUpPC90ZXh0PgogICAgPHRleHQgeD0iMjkwIiB5PSIxOTUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTEiPjBWIChYYW5oKTwvdGV4dD4KICAgIDxyZWN0IHg9IjQyMCIgeT0iNTUiIHdpZHRoPSIxOTAiIGhlaWdodD0iMTkwIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiIgcng9IjgiLz4KICAgIDx0ZXh0IHg9IjQ0NSIgeT0iODUiIGZpbGw9IiNmOGZhZmMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEzIiBmb250LXdlaWdodD0iYm9sZCI+UExDIFNJRU1FTlMgUzc8L3RleHQ+CiAgICA8dGV4dCB4PSI0NTUiIHk9IjEwNSIgZmlsbD0iI2E3ZjNkMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiPkRpZ2l0YWwgSW5wdXQgTW9kdWxlPC90ZXh0PgogICAgPGNpcmNsZSBjeD0iNDQ1IiBjeT0iMTcwIiByPSI2IiBmaWxsPSIjMTBiOTgxIi8+CiAgICA8dGV4dCB4PSI0NjAiIHk9IjE3NSIgZmlsbD0iI2Y4ZmFmYyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPkRJIDAuMCAoVMOtbiBoaeG7h3UpPC90ZXh0PgogICAgPGNpcmNsZSBjeD0iNDQ1IiBjeT0iMjA1IiByPSI2IiBmaWxsPSIjNjQ3NDhiIi8+CiAgICA8dGV4dCB4PSI0NjAiIHk9IjIxMCIgZmlsbD0iIzk0YTNiOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPjFNIChDaHVuZyArMjRWKTwvdGV4dD4KICAgIDxyZWN0IHg9IjIzMCIgeT0iMjI1IiB3aWR0aD0iMjIwIiBoZWlnaHQ9IjM1IiBmaWxsPSIjODgxMzM3IiBzdHJva2U9IiNmNDNmNWUiIHJ4PSI0Ii8+CiAgICA8dGV4dCB4PSIyNDAiIHk9IjI0NyIgZmlsbD0iI2ZlY2RkMyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZvbnQtd2VpZ2h0PSJib2xkIj7imqAgQ+G6pE0gxJDhuqRVIDIyMFZBQyBWw4BPIENIw4JOIFNJRzwvdGV4dD4KICA8L3N2Zz4=`,
		Options: []map[string]any{
			{"id": "1", "text": "Phá hủy tức thì transistor công suất bên trong cảm biến và đánh thủng cách ly quang (Optocoupler) của module DI PLC do vượt quá điện áp đánh thủng cực đại.", "isCorrect": true},
			{"id": "2", "text": "Cảm biến tự động chuyển sang chế độ tiết kiệm điện và duy trì hoạt động bình thường.", "isCorrect": false},
			{"id": "3", "text": "Đèn LED trạng thái trên cảm biến sẽ nhấp nháy báo lỗi mã E-220 và tự ngắt bảo vệ.", "isCorrect": false},
			{"id": "4", "text": "PLC tự động hạ điện áp 220VAC xuống 24VDC nhờ bộ biến tần tích hợp trên bo mạch DI.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l0-02",
		FolderSampleKey:    "sample-fld-l0-sensors",
		LevelCode:          "L0",
		FormatCode:         "theory",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "application",
		Content:            "[TỰ LUẬN TÍNH TOÁN - CÓ HÌNH ẢNH] Một cảm biến đo áp suất hơi nước đường ống chính có dải đo từ 0 đến 10 bar, phát tín hiệu dòng điện chuẩn công nghiệp 4 - 20 mA về kênh Analog Input (AI) của PLC. Kỹ sư đo được dòng điện vòng lặp thực tế là 14.4 mA.\na) Áp suất thực tế trong đường ống tại thời điểm đo là bao nhiêu bar?\nb) Nếu tại đầu vào AI của PLC mắc điện trở shunt chuẩn 250 Ω để chuyển đổi dòng thành điện áp cho bộ ADC vi điều khiển, điện áp đo được qua điện trở này là bao nhiêu Volt?\nHãy nhập đầy đủ kết quả số và các bước công thức tính toán.",
		Explanation:        "Dải tín hiệu hữu ích: 20mA - 4mA = 16mA tương ứng dải đo 10 bar (1.6 mA/bar). Áp suất thực = (14.4 - 4) / 1.6 = 6.5 bar. Điện áp trên điện trở R = 250 Ohm: U = I * R = 0.0144 A * 250 Ohm = 3.60 V (nằm trong dải chuẩn 1V - 5V của ADC).",
		Type:               "essay",
		ImageUrl:           `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMjYwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICAgIDxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMGIxMzI5IiByeD0iMTAiLz4KICAgIDx0ZXh0IHg9IjI0IiB5PSIzMiIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5Ww5JORyBM4bq2UCBEw5JORyDEkEnhu4ZOIDQtMjBtQSBW4buaSSDEkEnhu4ZOIFRS4bueIFNIVU5UIDI1MM6pPC90ZXh0PgogICAgPHJlY3QgeD0iMzAiIHk9IjYwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE3MCIgZmlsbD0iIzFlMjkzYiIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI4Ii8+CiAgICA8dGV4dCB4PSI0NSIgeT0iOTAiIGZpbGw9IiNmOGZhZmMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+VFJBTlNNSVRURVIgw4FQIFNV4bqkVDwvdGV4dD4KICAgIDx0ZXh0IHg9IjU1IiB5PSIxMTUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIj5E4bqjaSDEkW86IDAgLSAxMCBiYXI8L3RleHQ+CiAgICA8dGV4dCB4PSI1NSIgeT0iMTQwIiBmaWxsPSIjMzhiZGY4IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEyIj5JID0gMTQuNCBtQTwvdGV4dD4KICAgIDx0ZXh0IHg9IjU1IiB5PSIxNjUiIGZpbGw9IiNmYmJmMjQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIj5QX3Ro4buxYyA9ID8gYmFyPC90ZXh0PgogICAgPHBhdGggZD0iTTE5MCAxMDAgTDMyMCAxMDAiIHN0cm9rZT0iIzM4YmRmOCIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjI2MCw5NSAyNzAsMTAwIDI2MCwxMDUiIGZpbGw9IiMzOGJkZjgiLz4KICAgIDx0ZXh0IHg9IjIyMCIgeT0iOTAiIGZpbGw9IiMzOGJkZjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIj4xNC40IG1BIExvb3A8L3RleHQ+CiAgICA8cmVjdCB4PSIzMjAiIHk9IjYwIiB3aWR0aD0iMTMwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMS41IiByeD0iNiIvPgogICAgPHRleHQgeD0iMzM1IiB5PSI5MCIgZmlsbD0iI2ZlZjA4YSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZvbnQtd2VpZ2h0PSJib2xkIj5OR1Xhu5JOIDI0VkRDPC90ZXh0PgogICAgPHRleHQgeD0iMzQ1IiB5PSIxMTUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIj5Mb29wIFBvd2VyPC90ZXh0PgogICAgPHBhdGggZD0iTTQ1MCAxMDAgTDQ5MCAxMDAgTDQ5MCAxMjAiIHN0cm9rZT0iIzM4YmRmOCIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8cmVjdCB4PSI0NzAiIHk9IjUwIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE4NSIgZmlsbD0iIzFlMjkzYiIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI4Ii8+CiAgICA8dGV4dCB4PSI0OTAiIHk9IjgwIiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPlBMQyBBTkFMT0cgSU5QVVQ8L3RleHQ+CiAgICA8cmVjdCB4PSI0OTUiIHk9IjEyMCIgd2lkdGg9IjkwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzM0MTU1IiBzdHJva2U9IiNmNDNmNWUiIHN0cm9rZS13aWR0aD0iMiIgcng9IjQiLz4KICAgIDx0ZXh0IHg9IjUwNSIgeT0iMTQ1IiBmaWxsPSIjZmVjZGQzIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+UiA9IDI1MCDOqTwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ5NSIgeT0iMTg1IiBmaWxsPSIjYTdmM2QwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSI+VSA9IEkgw5cgUiA9ID8gVjwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ5NSIgeT0iMjA1IiBmaWxsPSIjNmVlN2I3IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjExIj4oMVYgLSA1ViBBREMpPC90ZXh0PgogICAgPHBhdGggZD0iTTU0MCAxNjAgTDU0MCAyMTUgTDExMCAyMTUgTDExMCAxNzUiIHN0cm9rZT0iIzM4YmRmOCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtZGFzaGFycmF5PSI1LDUiLz4KICA8L3N2Zz4=`,
		Rubrics: []map[string]any{
			{"id": "1", "title": "Công thức tính áp suất từ tín hiệu dòng điện 4-20mA", "maxScore": 3.5, "description": "Nêu đúng công thức nội suy tuyến tính: P = P_min + ((I - 4) / 16) * (P_max - P_min)."},
			{"id": "2", "title": "Tính chính xác giá trị áp suất thực tế 6.5 bar", "maxScore": 3.5, "description": "Thay số: P = 0 + ((14.4 - 4) / 16) * 10 = 10.4 / 16 * 10 = 6.5 bar."},
			{"id": "3", "title": "Tính chính xác điện áp rơi 3.60 V qua điện trở shunt 250 Ohm", "maxScore": 3.0, "description": "Áp dụng định luật Ohm: U = I * R = 0.0144 A * 250 Ohm = 3.60 V."},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l0-03",
		FolderSampleKey:    "sample-fld-l0-sensors",
		LevelCode:          "L0",
		FormatCode:         "theory",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "comprehension",
		Content:            "Tại sao trong môi trường nhà máy công nghiệp có nhiều biến tần động cơ công suất lớn, các kỹ sư luôn ưu tiên truyền tín hiệu tương tự dạng dòng điện 4-20mA hơn là dạng điện áp 0-10V khi khoảng cách truyền trên 50 mét?",
		Explanation:        "Tín hiệu dòng điện 4-20mA duy trì cường độ dòng không đổi bất kể điện trở sụt áp của đường dây dài. Ngoài ra ngưỡng 4mA đóng vai trò 'Live Zero' giúp hệ thống phát hiện ngay tình trạng đứt cáp (I = 0mA) khác biệt hoàn toàn với trạng thái đo mức 0 đơn vị (I = 4mA).",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Tín hiệu dòng điện 4-20mA không bị suy hao sụt áp trên điện trở dây dẫn đường dài và dòng 4mA đóng vai trò Live Zero giúp phát hiện đứt dây ngay lập tức.", "isCorrect": true},
			{"id": "2", "text": "Tín hiệu 0-10V cần dùng dây cáp bằng vàng nguyên chất thì mới truyền được trong xưởng.", "isCorrect": false},
			{"id": "3", "text": "Tín hiệu 4-20mA tiêu tốn điện năng gấp 100 lần so với điện áp nên làm ấm đường cáp chống ẩm.", "isCorrect": false},
			{"id": "4", "text": "Các chuẩn PLC thế hệ mới đã loại bỏ hoàn toàn module Analog Input điện áp.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l0-04",
		FolderSampleKey:    "sample-fld-l0-sensors",
		LevelCode:          "L0",
		FormatCode:         "critical_safety",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "all",
		CognitiveLevelCode: "knowledge",
		Content:            "[ĐIỂM LIỆT AN TOÀN] Khi tháo lắp hoặc kiểm tra bảo dưỡng đồng hồ đo điện năng kết nối với cuộn biến dòng (Current Transformer - CT) trên thanh cái tủ điện hạ thế 380V đang hoạt động, hành động nào tuyệt đối NGHIÊM CẤM vì gây nguy hiểm tính mạng tức thì?",
		Explanation:        "ĐIỂM LIỆT NGUY CƠ TỬ VONG: Khi hở mạch cuộn thứ cấp CT đang mang tải, toàn bộ sức từ động sơ cấp sẽ từ hóa lõi thép đến mức bão hòa, cảm ứng một điện áp cực đại lên tới hàng nghìn Volt ở cuộn thứ cấp, gây nổ sứ cách điện, phóng hồ quang và giật điện chết người. BẮT BUỘC PHẢI NGẮN MẠCH THỨ CẤP CT TRƯỚC KHI THÁO ĐỒNG HỒ.",
		Type:               "single_choice",
		IsCritical:         true,
		CriticalReason:     "Hở mạch cuộn thứ cấp biến dòng CT đang mang tải sinh điện áp cảm ứng hàng nghìn Volt gây phóng điện chết người.",
		Options: []map[string]any{
			{"id": "1", "text": "Để hở mạch cuộn thứ cấp của biến dòng CT khi dây sơ cấp vẫn đang mang dòng tải chạy qua.", "isCorrect": true},
			{"id": "2", "text": "Nối tắt (ngắn mạch) hai đầu cực thứ cấp của biến dòng CT trước khi tháo đồng hồ.", "isCorrect": false},
			{"id": "3", "text": "Nối tiếp địa vỏ kim loại và lõi thép của biến dòng CT theo đúng tiêu chuẩn kỹ thuật.", "isCorrect": false},
			{"id": "4", "text": "Sử dụng kìm đo dòng kẹp (Clamp Meter) để kiểm tra dòng điện chạy qua dây sơ cấp.", "isCorrect": false},
		},
		Status: "published",
	},

	// ==========================================
	// KHỐI LEVEL L1: LẬP TRÌNH PLC & ĐIỀU KHIỂN MÁY
	// ==========================================
	{
		SampleKey:          "sample-qst-l1-01",
		FolderSampleKey:    "sample-fld-l1-plc-control",
		LevelCode:          "L1",
		FormatCode:         "critical_safety",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "all",
		CognitiveLevelCode: "comprehension",
		Content:            "[ĐIỂM LIỆT AN TOÀN - CÓ HÌNH ẢNH] Trong thiết kế hệ thống điều khiển PLC cho máy ép thủy lực theo tiêu chuẩn an toàn chức năng máy ISO 13849-1, tiếp điểm vật lý của nút Dừng khẩn cấp (E-Stop) ngoài hiện trường và logic xử lý ngắt nguồn trong tủ điện bắt buộc phải được thiết kế như thế nào để đảm bảo tính năng An toàn dự phòng sự cố (Fail-Safe)?",
		Explanation:        "Tiêu chuẩn Fail-Safe quy định: mọi trạng thái đứt dây, mất nguồn, lỏng giắc cắm của nút E-Stop phải tự động đưa hệ thống về trạng thái dừng an toàn (Safe State). Do đó bắt buộc dùng tiếp điểm thường đóng (NC). Nếu dùng tiếp điểm NO, khi dây bị chuột cắn đứt, bấm nút E-Stop sẽ hoàn toàn vô tác dụng.",
		Type:               "single_choice",
		IsCritical:         true,
		CriticalReason:     "Dùng tiếp điểm thường mở (NO) cho mạch dừng khẩn cấp vi phạm tiêu chuẩn ISO 13849/IEC 62061 (Fail-Safe), đứt dây sẽ không dừng được máy.",
		Options: []map[string]any{
			{"id": "1", "text": "Nút E-Stop sử dụng tiếp điểm phần cứng thường đóng (Normally Closed - NC) đấu nối trực tiếp vào Rơ-le an toàn (Safety Relay); khi đứt dây hoặc mất nguồn, mạch an toàn tự động mở ra ngắt điện cuộn hút khởi động từ (Fail-Safe).", "isCorrect": true},
			{"id": "2", "text": "Nút E-Stop sử dụng tiếp điểm thường mở (NO) và chỉ gửi tín hiệu qua mạng Ethernet thông thường về PLC để lập trình lệnh Reset.", "isCorrect": false},
			{"id": "3", "text": "Chỉ cần gắn một nút nhấn phần mềm trên màn hình điều khiển HMI cảm ứng là đủ tiêu chuẩn an toàn.", "isCorrect": false},
			{"id": "4", "text": "Đấu song song 5 nút thường mở NO để khi nhấn 1 nút thì PLC sẽ tăng tốc độ động cơ lên tối đa.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l1-02",
		FolderSampleKey:    "sample-fld-l1-plc-control",
		LevelCode:          "L1",
		FormatCode:         "case_study",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "analysis",
		Content:            "[TỰ LUẬN TÍNH TOÁN - CÓ HÌNH ẢNH] Một dây chuyền dán hộp carton tốc độ cao sử dụng một Encoder quang quay 1000 xung/vòng (1000 PPR) gắn trên trục con lăn dẫn hướng có đường kính d = 100 mm. Băng tải vận hành ở vận tốc danh định v = 3.14 m/s.\na) Tính tần số xung (Hz) mà Encoder phát ra khi băng tải chạy ở vận tốc nói trên?\nb) Nếu kỹ sư đấu chân pha A của Encoder này vào cổng Digital Input thường (có thời gian quét chương trình PLC Scan Cycle trung bình là 20 ms), giải thích tại sao PLC sẽ đếm sai lệch nghiêm trọng hoặc mất xung hoàn toàn?\nc) Để đếm chính xác 100% vị trí mép hộp carton, cấu hình phần cứng và phương thức lập trình bắt buộc trên PLC Siemens S7 là gì?\nHãy trình bày đầy đủ công thức, kết quả số và giải pháp.",
		Explanation:        "Chu vi con lăn: C = pi * d = 3.14 * 0.1m = 0.314 m. Tốc độ quay n = v / C = 3.14 / 0.314 = 10 vòng/giây. Tần số xung f = 10 * 1000 = 10.000 Hz = 10 kHz (chu kỳ 100 microseconds). Chu kỳ quét Scan Cycle 20ms gấp 200 lần chu kỳ xung nên ngõ vào thường sẽ bỏ sót tới 199 xung mỗi chu kỳ. Bắt buộc cấu hình module High Speed Counter (HSC) đếm xung độc lập ở tầng phần cứng.",
		Type:               "essay",
		ImageUrl:           `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMjYwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICAgIDxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMGYxNzJhIiByeD0iMTAiLz4KICAgIDx0ZXh0IHg9IjI0IiB5PSIzMCIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5TTyBTw4FOSCBYVU5HIEVOQ09ERVIgVlMgUExDIFNDQU4gQ1lDTEUgKDIwbXMpPC90ZXh0PgogICAgPHRleHQgeD0iMjQiIHk9IjY1IiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPlTDrW4gaGnhu4d1IEVuY29kZXIgKDEwIGtIeiAtIENodSBr4buzIDEwMMK1cyk6PC90ZXh0PgogICAgPHBhdGggZD0iTTI0IDEwMCBMNDAgMTAwIEw0MCA3NSBMNjAgNzUgTDYwIDEwMCBMODAgMTAwIEw4MCA3NSBMMTAwIDc1IEwxMDAgMTAwIEwxMjAgMTAwIEwxMjAgNzUgTDE0MCA3NSBMMTQwIDEwMCBMMTYwIDEwMCBMMTYwIDc1IEwxODAgNzUgTDE4MCAxMDAgTDIwMCAxMDAgTDIwMCA3NSBMMjIwIDc1IEwyMjAgMTAwIEwyNDAgMTAwIEwyNDAgNzUgTDI2MCA3NSBMMjYwIDEwMCBMMjgwIDEwMCBMMjgwIDc1IEwzMDAgNzUgTDMwMCAxMDAgTDMyMCAxMDAgTDMyMCA3NSBMMzQwIDc1IEwzNDAgMTAwIEwzNjAgMTAwIEwzNjAgNzUgTDM4MCA3NSBMMzgwIDEwMCBMNDAwIDEwMCBMNDAwIDc1IEw0MjAgNzUgTDQyMCAxMDAgTDQ0MCAxMDAgTDQ0MCA3NSBMNDYwIDc1IEw0NjAgMTAwIEw0ODAgMTAwIEw0ODAgNzUgTDUwMCA3NSBMNTAwIDEwMCBMNTIwIDEwMCBMNTIwIDc1IEw1NDAgNzUgTDU0MCAxMDAgTDU2MCAxMDAgTDU2MCA3NSBMNTgwIDc1IEw1ODAgMTAwIEw2MDAgMTAwIiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgogICAgPHRleHQgeD0iMjQiIHk9IjEzNSIgZmlsbD0iI2ZiYmYyNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIj5DaHUga+G7syBxdcOpdCBQTEMgdGjGsOG7nW5nIChTY2FuIEN5Y2xlIDIwbXMgLSBM4bqleSBt4bqrdSAxIGzhuqduKTo8L3RleHQ+CiAgICA8cmVjdCB4PSIyNCIgeT0iMTQ1IiB3aWR0aD0iMjgwIiBoZWlnaHQ9IjM1IiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiNmNDNmNWUiIHN0cm9rZS13aWR0aD0iMS41IiByeD0iNCIvPgogICAgPHRleHQgeD0iMzUiIHk9IjE2NyIgZmlsbD0iI2ZlY2RkMyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiPlNjYW4gMSAoMjBtcykg4p6UIELhu48gc8OzdCAxOTkgeHVuZzwvdGV4dD4KICAgIDxyZWN0IHg9IjMxNSIgeT0iMTQ1IiB3aWR0aD0iMjg1IiBoZWlnaHQ9IjM1IiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiNmNDNmNWUiIHN0cm9rZS13aWR0aD0iMS41IiByeD0iNCIvPgogICAgPHRleHQgeD0iMzMwIiB5PSIxNjciIGZpbGw9IiNmZWNkZDMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIj5TY2FuIDIgKDIwbXMpIOKelCBC4buPIHPDs3QgMTk5IHh1bmc8L3RleHQ+CiAgICA8cmVjdCB4PSIyNCIgeT0iMTk1IiB3aWR0aD0iNTg1IiBoZWlnaHQ9IjQ1IiBmaWxsPSIjMDY0ZTNiIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMS41IiByeD0iNiIvPgogICAgPHRleHQgeD0iNDAiIHk9IjIyMiIgZmlsbD0iI2E3ZjNkMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIj7inJMgR0nhuqJJIFBIw4FQOiBIaWdoIFNwZWVkIENvdW50ZXIgKEhTQykgcGjhuqduIGPhu6luZyBob+G6t2MgSGFyZHdhcmUgSW50ZXJydXB0IChPQjQwKTwvdGV4dD4KICA8L3N2Zz4=`,
		Rubrics: []map[string]any{
			{"id": "1", "title": "Tính chính xác tần số xung Encoder f = 10.000 Hz (10 kHz)", "maxScore": 3.5, "description": "Tính chu vi C = pi*d = 0.314m, tốc độ n = 10 vòng/s, f = 10 * 1000 = 10.000 Hz (10 kHz)."},
			{"id": "2", "title": "Phân tích nguyên nhân mất xung do chu kỳ quét Scan Cycle", "maxScore": 3.5, "description": "Giải thích chu kỳ xung T = 0.1ms trong khi Scan Cycle là 20ms, PLC chỉ lấy mẫu 1 lần nên bỏ lỡ xung."},
			{"id": "3", "title": "Giải pháp cấu hình High Speed Counter (HSC) hoặc ngắt OB40", "maxScore": 3.0, "description": "Nêu rõ cấu hình kênh HSC phần cứng tích hợp trên CPU hoặc Hardware Interrupt (OB40)."},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l1-03",
		FolderSampleKey:    "sample-fld-l1-plc-control",
		LevelCode:          "L1",
		FormatCode:         "theory",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "comprehension",
		Content:            "[TRẮC NGHIỆM CÔNG NGHỆ - CÓ HÌNH ẢNH] Trong cấu hình mạng truyền thông công nghiệp Profinet IO giữa PLC CPU S7-1500 và các trạm I/O phân tán ET200SP, tham số cấu hình nào quyết định việc định danh duy nhất của từng thiết bị trạm (Device Name) trước khi PLC có thể gán địa chỉ IP tự động khi khởi động hệ thống?",
		Explanation:        "Trong chuẩn Profinet IO (IEC 61158), Controller định danh và liên kết với Device dựa trên 'PROFINET Device Name' thông qua giao thức DCP (Discovery and Basic Configuration Protocol). Khi khớp Device Name, Controller mới gán IP Address được cấu hình trong dự án.",
		Type:               "single_choice",
		ImageUrl:           `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMjYwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICAgIDxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMGIxMzI5IiByeD0iMTAiLz4KICAgIDx0ZXh0IHg9IjI0IiB5PSIzMiIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5D4bqkVSBUUsOaQyBN4bqgTkcgQ8OUTkcgTkdISeG7hlAgUFJPRklORVQgSU8gKElFQyA2MTE1OCk8L3RleHQ+CiAgICA8cmVjdCB4PSIzMCIgeT0iNjAiIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiIgcng9IjgiLz4KICAgIDx0ZXh0IHg9IjQ1IiB5PSI5MCIgZmlsbD0iI2Y4ZmFmYyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZvbnQtd2VpZ2h0PSJib2xkIj5QUk9GSU5FVCBDT05UUk9MTEVSPC90ZXh0PgogICAgPHRleHQgeD0iNTUiIHk9IjExNSIgZmlsbD0iI2E3ZjNkMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiPlBMQyBTNy0xNTAwPC90ZXh0PgogICAgPHRleHQgeD0iNTUiIHk9IjE0MCIgZmlsbD0iIzk0YTNiOCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMSI+SVA6IDE5Mi4xNjguMC4xPC90ZXh0PgogICAgPHRleHQgeD0iNTUiIHk9IjE2NSIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMSI+RGV2OiAicGxjLW1haW4tMDEiPC90ZXh0PgogICAgPHJlY3QgeD0iMjYwIiB5PSIxMDAiIHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiMxZTI5M2IiIHN0cm9rZT0iIzBlYTVlOSIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iNiIvPgogICAgPHRleHQgeD0iMjc1IiB5PSIxMzAiIGZpbGw9IiNmOGZhZmMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+U1dJVENIIFNDQUxBTkNFPC90ZXh0PgogICAgPHRleHQgeD0iMjg1IiB5PSIxNTUiIGZpbGw9IiM3ZGQzZmMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIj5NYW5hZ2VkIFN3aXRjaDwvdGV4dD4KICAgIDxwYXRoIGQ9Ik0xOTAgMTQwIEwyNjAgMTQwIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iNCIvPgogICAgPHBhdGggZD0iTTM4MCAxNDAgTDQ1MCA5MCIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxwYXRoIGQ9Ik0zODAgMTQwIEw0NTAgMTkwIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iNDUwIiB5PSI1MCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSI3NSIgZmlsbD0iIzFlMjkzYiIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjEuNSIgcng9IjYiLz4KICAgIDx0ZXh0IHg9IjQ2NSIgeT0iNzUiIGZpbGw9IiNmOGZhZmMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+RVQyMDBTUCAoVHLhuqFtIEluKTwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ2NSIgeT0iOTUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTAiPkRldjogImV0MjAwc3AtcHJpbnQiPC90ZXh0PgogICAgPHRleHQgeD0iNDY1IiB5PSIxMTIiIGZpbGw9IiM2N2U4ZjkiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTAiPklQOiAxOTIuMTY4LjAuMTE8L3RleHQ+CiAgICA8cmVjdCB4PSI0NTAiIHk9IjE1MCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSI3NSIgZmlsbD0iIzFlMjkzYiIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjEuNSIgcng9IjYiLz4KICAgIDx0ZXh0IHg9IjQ2NSIgeT0iMTc1IiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPkVUMjAwU1AgKFRy4bqhbSBEw6FuKTwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ2NSIgeT0iMTk1IiBmaWxsPSIjOTRhM2I4IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEwIj5EZXY6ICJldDIwMHNwLWdsdWUiPC90ZXh0PgogICAgPHRleHQgeD0iNDY1IiB5PSIyMTIiIGZpbGw9IiM2N2U4ZjkiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTAiPklQOiAxOTIuMTY4LjAuMTI8L3RleHQ+CiAgPC9zdmc+`,
		Options: []map[string]any{
			{"id": "1", "text": "Tên thiết bị Profinet (PROFINET Device Name) được lưu trong bộ nhớ bất biến của module giao tiếp mạng.", "isCorrect": true},
			{"id": "2", "text": "Số serial in trên nhãn vỏ hộp carton của nhà sản xuất.", "isCorrect": false},
			{"id": "3", "text": "Tên tài khoản Windows của kỹ sư đã tải chương trình xuống PLC.", "isCorrect": false},
			{"id": "4", "text": "Địa chỉ MAC của máy in văn phòng ở tầng 2.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l1-04",
		FolderSampleKey:    "sample-fld-l1-plc-control",
		LevelCode:          "L1",
		FormatCode:         "case_study",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "ENG-FSH-03",
		CognitiveLevelCode: "knowledge",
		Content:            "Khi lập trình logic tuần tự trong PLC bằng ngôn ngữ Ladder (LAD), lỗi 'Double Coil' (sử dụng cùng một cuộn dây ngõ ra Output ở hai mạng rungs khác nhau) sẽ dẫn đến hiện tượng gì trong quá trình chạy máy?",
		Explanation:        "PLC hoạt động theo nguyên lý quét tuần tự từ trên xuống dưới, từ trái sang phải. Khi kết thúc chu kỳ quét, trạng thái của Process Image Output mới được xuất ra cọc đấu dây vật lý. Do đó, rung ở phía dưới sẽ ghi đè lên giá trị tính toán của rung phía trên.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Trạng thái ngõ ra thực tế ở cuối chu kỳ quét sẽ chỉ tuân theo kết quả logic của rung xuất hiện sau cùng (ở phía dưới), làm mất hiệu lực logic của rung phía trước.", "isCorrect": true},
			{"id": "2", "text": "PLC sẽ lập tức báo lỗi Hardware Fault và dừng CPU ngay lập tức.", "isCorrect": false},
			{"id": "3", "text": "Hai cuộn dây sẽ tự động cộng dồn điện áp lên gấp đôi thành 48VDC.", "isCorrect": false},
			{"id": "4", "text": "Cuộn dây sẽ nhấp nháy liên tục ở tần số 1000 Hz.", "isCorrect": false},
		},
		Status: "published",
	},

	// ==========================================
	// KHỐI LEVEL L2: GIÁM SÁT SCADA & HMI
	// ==========================================
	{
		SampleKey:          "sample-qst-l2-01",
		FolderSampleKey:    "sample-fld-scada-opcua",
		LevelCode:          "L2",
		FormatCode:         "simulation_hmi",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "all",
		CognitiveLevelCode: "application",
		Content:            "[MÔ PHỎNG SCADA - ĐIỂM LIỆT AN TOÀN] Trên màn hình SCADA trạm sấy mực in UV, đèn cảnh báo nhiệt độ nhấp nháy đỏ và chuông báo động vang lên với mã lỗi: 'ALARM HIGH-HIGH: Buồng sấy 1 đạt 185°C (Ngưỡng nguy hiểm cháy: 160°C)'. Thao tác vận hành nào sau đây là BẮT BUỘC để ngăn ngừa hỏa hoạn nhà máy?",
		Explanation:        "High-High Alarm là mức cảnh báo tối nguy hiểm (Critical Safety Interlock). Người vận hành phải thực hiện trip khẩn cấp nguồn nhiệt, cô lập van đốt và kích hoạt giải nhiệt để bảo vệ an toàn tính mạng công nhân và tài sản nhà máy.",
		Type:               "single_choice",
		SimulationType:     "estop",
		IsCritical:         true,
		CriticalReason:     "Không kích hoạt quy trình cô lập nguồn nhiệt khi xảy ra sự cố quá nhiệt buồng sấy (High-High Alarm) dẫn đến nguy cơ hỏa hoạn cháy nổ toàn xưởng.",
		ImageUrl:           `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMjYwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICAgIDxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMGYxNzJhIiByeD0iMTAiLz4KICAgIDx0ZXh0IHg9IjI0IiB5PSIzMiIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5TQ0FEQSBITUkgVEVMRU1FVFJZICYgQUxBUk0gU1RBVFVTPC90ZXh0PgogICAgPHJlY3QgeD0iMzAiIHk9IjYwIiB3aWR0aD0iMTcwIiBoZWlnaHQ9IjE3MCIgZmlsbD0iIzFlMjkzYiIgc3Ryb2tlPSIjZjQzZjVlIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI4Ii8+CiAgICA8cmVjdCB4PSIzMCIgeT0iNjAiIHdpZHRoPSIxNzAiIGhlaWdodD0iMzIiIGZpbGw9IiNiZTEyM2MiIHJ4PSI2Ii8+CiAgICA8dGV4dCB4PSI0MiIgeT0iODIiIGZpbGw9IiNmZmYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+QUxBUk0gSElHSC1ISUdIICgxODXCsEMpPC90ZXh0PgogICAgPHRleHQgeD0iNDUiIHk9IjEyMCIgZmlsbD0iI2Y4ZmFmYyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPkJ14buTbmcgU+G6pXkgVVYgMDE8L3RleHQ+CiAgICA8dGV4dCB4PSI0NSIgeT0iMTUwIiBmaWxsPSIjZmRhNGFmIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjIwIiBmb250LXdlaWdodD0iYm9sZCI+MTg1LjQgwrBDPC90ZXh0PgogICAgPHRleHQgeD0iNDUiIHk9IjE4MCIgZmlsbD0iI2Y0M2Y1ZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiPk5nxrDhu6FuZyBu4buVOiAxNjDCsEM8L3RleHQ+CiAgICA8cmVjdCB4PSI0NSIgeT0iMTk1IiB3aWR0aD0iMTQwIiBoZWlnaHQ9IjI1IiBmaWxsPSIjOTkxYjFiIiByeD0iNCIvPgogICAgPHRleHQgeD0iNjAiIHk9IjIxMiIgZmlsbD0iI2ZlY2RkMyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpZ2h0PSJib2xkIj5UUklQIEhFQVRFUiBUUklQPC90ZXh0PgogICAgPHJlY3QgeD0iMjIwIiB5PSI2MCIgd2lkdGg9IjE5MCIgaGVpZ2h0PSIxNzAiIGZpbGw9IiMxZTI5M2IiIHN0cm9rZT0iIzM4YmRmOCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHJ4PSI4Ii8+CiAgICA8dGV4dCB4PSIyMzUiIHk9Ijg1IiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPsSQ4buSIFRI4buKIE5ISeG7hlQgxJDhu5ggUkVBTFRJTUU8L3RleHQ+CiAgICA8cGF0aCBkPSJNMjM1IDE4MCBMMjc1IDE3NSBMMzE1IDE2MCBMMzU1IDEyNSBMMzk1IDEwMCIgc3Ryb2tlPSIjZjQzZjVlIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz4KICAgIDxsaW5lIHgxPSIyMzUiIHkxPSIxNDAiIHgyPSIzOTUiIHkyPSIxNDAiIHN0cm9rZT0iI2ZiYmYyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1kYXNoYXJyYXk9IjQsNCIvPgogICAgPHRleHQgeD0iMjM1IiB5PSIxMzUiIGZpbGw9IiNmYmJmMjQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIj5OZ8aw4buhbmcgSGlnaCAoMTQwwrBDKTwvdGV4dD4KICAgIDxyZWN0IHg9IjQzMCIgeT0iNjAiIHdpZHRoPSIxODAiIGhlaWdodD0iMTcwIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMS41IiByeD0iOCIvPgogICAgPHRleHQgeD0iNDQ1IiB5PSI4NSIgZmlsbD0iI2Y4ZmFmYyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIj5UUuG6oE0gxJBJ4buAVSDEkOG7mCBUSEFPIFTDgUM8L3RleHQ+CiAgICA8cmVjdCB4PSI0NDUiIHk9IjEwNSIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIzMiIgZmlsbD0iIzAyODRjNyIgcng9IjQiLz4KICAgIDx0ZXh0IHg9IjQ2MCIgeT0iMTI1IiBmaWxsPSIjZmZmIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPjEuIE1VVEUgQUxBUk08L3RleHQ+CiAgICA8cmVjdCB4PSI0NDUiIHk9IjE0NSIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIzMiIgZmlsbD0iI2Q5NzcwNiIgcng9IjQiLz4KICAgIDx0ZXh0IHg9IjQ2MCIgeT0iMTY1IiBmaWxsPSIjZmZmIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPjIuIENIVVnhu4JOIE1BTlVBTDwvdGV4dD4KICAgIDxyZWN0IHg9IjQ0NSIgeT0iMTg1IiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjMyIiBmaWxsPSIjZGMyNjI2IiByeD0iNCIvPgogICAgPHRleHQgeD0iNDYwIiB5PSIyMDUiIGZpbGw9IiNmZmYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+My4gRS1TVE9QIEhFQVRFUjwvdGV4dD4KICA8L3N2Zz4=`,
		Options: []map[string]any{
			{"id": "1", "text": "Nhấn nút Dừng khẩn cấp ngắt nguồn nhiệt (Heater Emergency Trip) ngay trên trạm SCADA/HMI, đóng van cấp khí gas/nguồn điện nhiệt, bật hệ thống quạt thông gió làm mát khẩn cấp và kích hoạt còi báo cháy khu vực.", "isCorrect": true},
			{"id": "2", "text": "Nhấp chuột chọn nút 'Tắt chuông báo động' (Alarm Silence) rồi tiếp tục ngồi chờ xem nhiệt độ có tự giảm xuống không.", "isCorrect": false},
			{"id": "3", "text": "Chỉnh sửa lại ngưỡng cảnh báo trên SCADA từ 160°C lên 300°C để đèn hết báo đỏ.", "isCorrect": false},
			{"id": "4", "text": "Rút dây mạng Ethernet của máy tính SCADA để không phải nghe tiếng chuông báo động.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l2-02",
		FolderSampleKey:    "sample-fld-scada-opcua",
		LevelCode:          "L2",
		FormatCode:         "case_study",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "analysis",
		Content:            "[TỰ LUẬN TÍNH TOÁN DỮ LIỆU SCADA] Hệ thống SCADA trung tâm tại nhà máy sản xuất thông minh thực hiện thu thập dữ liệu (Historian Data Collection) từ 1.000 biến số đo lường (Tags) từ các máy in và máy dán.\n- Chu kỳ thu thập mẫu: 1 giây / lần cho mỗi Tag.\n- Mỗi bản ghi dữ liệu (Data Record) gồm: Timestamp (8 byte) + Quality Flag (2 byte) + Float Value (4 byte) = 14 byte / record.\na) Tính tổng dung lượng dữ liệu thô (Megabytes) được ghi vào cơ sở dữ liệu Time-Series trong 1 ngày (24 giờ)?\nb) Tính tổng dung lượng lưu trữ cần thiết cho 1 tháng (30 ngày) tính theo đơn vị Gigabytes (GB) (lấy 1 GB = 1.024 MB)?\nc) Nếu áp dụng thuật toán nén biến thiên Swinging Door hoặc Deadband Compression với tỷ lệ nén 70% (dung lượng giảm 70%), dung lượng lưu trữ thực tế trong 30 ngày còn lại là bao nhiêu GB?\nHãy trình bày chi tiết công thức và từng bước tính toán.",
		Explanation:        "Số giây 1 ngày: 24 * 3600 = 86.400s. Dung lượng 1 ngày: 1.000 * 14 * 86.400 = 1.209.600.000 bytes = 1.209,6 MB (1,1265 GiB). Dung lượng 30 ngày: 1.209,6 * 30 = 36.288 MB = 35,44 GB. Dung lượng sau khi giảm 70% còn lại 30%: 35,44 * 0.30 = 10,63 GB.",
		Type:               "essay",
		Rubrics: []map[string]any{
			{"id": "1", "title": "Tính dung lượng thô 1 ngày = 1.209,6 MB", "maxScore": 3.5, "description": "Tính đúng số bản ghi 1 ngày = 86.400.000 records, nhân 14 bytes = 1.209.600.000 bytes = 1.209,6 MB."},
			{"id": "2", "title": "Tính dung lượng thô 30 ngày = 35,44 GB", "maxScore": 3.5, "description": "Nhân 30 ngày = 36.288 MB, chia 1.024 MB/GB = 35,44 GB."},
			{"id": "3", "title": "Tính dung lượng sau nén 70% = 10,63 GB", "maxScore": 3.0, "description": "Nhân hệ số còn lại 30%: 35,44 GB * 0.3 = 10,63 GB."},
		},
		Status: "published",
	},

	// ==========================================
	// KHỐI LEVEL L3: ĐIỀU HÀNH SẢN XUẤT MES & OEE
	// ==========================================
	{
		SampleKey:          "sample-qst-l3-01",
		FolderSampleKey:    "sample-fld-mes-isa95",
		LevelCode:          "L3",
		FormatCode:         "case_study",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-quality-oee",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "analysis",
		Content:            "[TỰ LUẬN TÍNH TOÁN OEE NHÀ MÁY - CÓ HÌNH ẢNH] Một ca sản xuất in bao bì carton kéo dài 8 giờ (480 phút) có các dữ liệu vận hành thu thập từ hệ thống MES như sau:\n- Thời gian nghỉ ăn ca và giao ca theo kế hoạch: 30 phút.\n- Thời gian dừng máy sự cố kỹ thuật (kẹt lô mực + đứt băng chuyền): 45 phút.\n- Thời gian thay đổi đơn hàng & căn chỉnh dao (Setup/Changeover): 15 phút.\n- Tốc độ thiết kế định mức của máy in: 120 sản phẩm/phút.\n- Tổng sản lượng thực tế máy in làm ra trong ca: 37.800 sản phẩm.\n- Số sản phẩm phế phẩm không đạt chuẩn chất lượng bị loại bỏ: 1.890 sản phẩm.\nHãy tính toán cụ thể và nhập các giá trị số sau (làm tròn 2 chữ số thập phân):\n1) Hệ số Khả dụng (Availability - A %)?\n2) Hệ số Hiệu suất (Performance - P %)?\n3) Hệ số Chất lượng (Quality - Q %)?\n4) Chỉ số Hiệu suất Tổng thể Thiết bị (Overall Equipment Effectiveness - OEE %)?\nHãy ghi rõ các bước tính toán và công thức chi tiết.",
		Explanation:        "Thời gian kế hoạch = 480 - 30 = 450p. Dừng ngoài kế hoạch = 45 + 15 = 60p. Thời gian chạy thực = 390p. A = 390/450 = 86.67%. Sản lượng lý thuyết trong 390p = 390 * 120 = 46.800 sp. P = 37.800 / 46.800 = 80.77%. Thành phẩm tốt = 37.800 - 1.890 = 35.910 sp. Q = 35.910 / 37.800 = 95.00%. OEE = 0.8667 * 0.8077 * 0.9500 = 66.50%.",
		Type:               "essay",
		ImageUrl:           `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMjYwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICAgIDxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMGYxNzJhIiByeD0iMTAiLz4KICAgIDx0ZXh0IHg9IjI0IiB5PSIzMCIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5D4bqkVSBUUsOaQyBQSMOCTiBUw41DSCBISeG7hlUgU1XhuqRUIFRISeG6vlQgQuG7iiBU4buUTkcgVEjhu4IgKE9FRSk8L3RleHQ+CiAgICA8cmVjdCB4PSIzMCIgeT0iNTUiIHdpZHRoPSI1ODAiIGhlaWdodD0iMzAiIGZpbGw9IiMzMzQxNTUiIHJ4PSI0Ii8+CiAgICA8dGV4dCB4PSI0MCIgeT0iNzUiIGZpbGw9IiNmOGZhZmMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+VOG7lW5nIHRo4budaSBnaWFuIGNhOiA0ODAgcGjDunQ8L3RleHQ+CiAgICA8cmVjdCB4PSIzMCIgeT0iOTUiIHdpZHRoPSI1MzAiIGhlaWdodD0iMzAiIGZpbGw9IiMwMzY5YTEiIHJ4PSI0Ii8+CiAgICA8dGV4dCB4PSI0MCIgeT0iMTE1IiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPkvhur8gaG/huqFjaCBjaOG6oXk6IDQ1MCBwaMO6dCAoTmdo4buJIGNhOiAzMHApPC90ZXh0PgogICAgPHJlY3QgeD0iMzAiIHk9IjEzNSIgd2lkdGg9IjQ2MCIgaGVpZ2h0PSIzMCIgZmlsbD0iIzA0Nzg1NyIgcng9IjQiLz4KICAgIDx0ZXh0IHg9IjQwIiB5PSIxNTUiIGZpbGw9IiNmOGZhZmMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+VGjhu51pIGdpYW4gY2jhuqF5IHRo4buxYzogMzkwIHBow7p0IOKelCBBdmFpbGFiaWxpdHkgQSA9IDg2LjY3JTwvdGV4dD4KICAgIDxyZWN0IHg9IjMwIiB5PSIxNzUiIHdpZHRoPSIzNzAiIGhlaWdodD0iMzAiIGZpbGw9IiNiNDUzMDkiIHJ4PSI0Ii8+CiAgICA8dGV4dCB4PSI0MCIgeT0iMTk1IiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPlPhuqNuIGzGsOG7o25nIHF1eSDEkeG7lWk6IDM3LjgwMCBzcCDinpQgUGVyZm9ybWFuY2UgUCA9IDgwLjc3JTwvdGV4dD4KICAgIDxyZWN0IHg9IjMwIiB5PSIyMTUiIHdpZHRoPSIzNTAiIGhlaWdodD0iMzAiIGZpbGw9IiNiZTEyM2MiIHJ4PSI0Ii8+CiAgICA8dGV4dCB4PSI0MCIgeT0iMjM1IiBmaWxsPSIjZjhmYWZjIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPlRow6BuaCBwaOG6qW0gxJHhuqF0IGNodeG6qW4gKExv4bqhaSAxLjg5MCBwaOG6vyBwaOG6qW0pOiBRdWFsaXR5IFEgPSA5NS4wJSDinpQgT0VFID0gNjYuNTAlPC90ZXh0PgogIDwvc3ZnPg==`,
		Rubrics: []map[string]any{
			{"id": "1", "title": "Tính chính xác Hệ số Khả dụng A = 86.67%", "maxScore": 2.5, "description": "Thời gian chạy kế hoạch = 450 phút, vận hành thực = 390 phút. A = 390/450 = 86.67%."},
			{"id": "2", "title": "Tính chính xác Hệ số Hiệu suất P = 80.77%", "maxScore": 2.5, "description": "Sản lượng lý thuyết = 390 * 120 = 46.800 sp. P = 37.800 / 46.800 = 80.77%."},
			{"id": "3", "title": "Tính chính xác Hệ số Chất lượng Q = 95.00%", "maxScore": 2.5, "description": "Sản phẩm đạt chuẩn = 35.910 sp. Q = 35.910 / 37.800 = 95.00%."},
			{"id": "4", "title": "Tính chính xác chỉ số OEE = 66.50%", "maxScore": 2.5, "description": "OEE = A * P * Q = 0.8667 * 0.8077 * 0.95 = 66.50%."},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l3-02",
		FolderSampleKey:    "sample-fld-mes-isa95",
		LevelCode:          "L3",
		FormatCode:         "critical_safety",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-work-order",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "comprehension",
		Content:            "[ĐIỂM LIỆT TRUY VẾT LÔ HÀNG - CÓ HÌNH ẢNH] Trên hệ thống MES, một lô mực in mã LOT-INK-99 bị bộ phận QC phát hiện nhiễm kim loại nặng vượt ngưỡng cho phép 500% sau khi đã in lên 20.000 vỏ hộp sữa chua. Hành động bắt buộc ngay lập tức của điều độ viên MES là gì?",
		Explanation:        "Zero-Tolerance Quality: Trong ngành sản xuất bao bì tiếp xúc thực phẩm/dược phẩm, việc giải phóng hoặc không cô lập kịp thời lô hàng nhiễm độc gây nguy hiểm trực tiếp tính mạng người tiêu dùng và hủy hoại danh tiếng công ty.",
		Type:               "single_choice",
		IsCritical:         true,
		CriticalReason:     "Vi phạm quy trình khóa cách ly lô hàng (Quarantine / Hold) khi phát hiện lỗi chất lượng nghiêm trọng dẫn đến việc phân phối sản phẩm lỗi ra thị trường, bị kiện tụng và thu hồi toàn cầu.",
		ImageUrl:           `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMjYwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICAgIDxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMGIxMzI5IiByeD0iMTAiLz4KICAgIDx0ZXh0IHg9IjI0IiB5PSIzMCIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5QSOG6oiBI4buGIEzDlCBT4bqiTiBYVeG6pFQgKEJBVENIIEdFTkVBTE9HWSAmIFRSQUNFQUJJTElUWSk8L3RleHQ+CiAgICA8cmVjdCB4PSIzMCIgeT0iNzAiIHdpZHRoPSIxNDAiIGhlaWdodD0iNjAiIGZpbGw9IiMxZTI5M2IiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iNiIvPgogICAgPHRleHQgeD0iNDAiIHk9Ijk1IiBmaWxsPSIjZmRlNjhhIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPkNV4buYTiBHSeG6pFkgU8OTTkc8L3RleHQ+CiAgICA8dGV4dCB4PSI0MCIgeT0iMTE1IiBmaWxsPSIjY2JkNWUxIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjExIj5MT1Q6IEItMjAyNi1YPC90ZXh0PgogICAgPHJlY3QgeD0iMzAiIHk9IjE1MCIgd2lkdGg9IjE0MCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzFlMjkzYiIgc3Ryb2tlPSIjZjQzZjVlIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI2Ii8+CiAgICA8dGV4dCB4PSI0MCIgeT0iMTc1IiBmaWxsPSIjZmNhNWE1IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPk3hu7BDIElOIFVWIMSQ4buOPC90ZXh0PgogICAgPHRleHQgeD0iNDAiIHk9IjE5NSIgZmlsbD0iI2NiZDVlMSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMSI+TE9UOiBJTkstOTktVVY8L3RleHQ+CiAgICA8cGF0aCBkPSJNMTcwIDEwMCBMMjQwIDEzMCIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxwYXRoIGQ9Ik0xNzAgMTgwIEwyNDAgMTUwIiBzdHJva2U9IiNmNDNmNWUiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPHJlY3QgeD0iMjQwIiB5PSIxMDUiIHdpZHRoPSIxNTAiIGhlaWdodD0iNzAiIGZpbGw9IiMxZTI5M2IiIHN0cm9rZT0iIzM4YmRmOCIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iNiIvPgogICAgPHRleHQgeD0iMjU1IiB5PSIxMzAiIGZpbGw9IiM3ZGQzZmMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+Q8OUTkcgxJBP4bqgTiBJTiAmIELhur48L3RleHQ+CiAgICA8dGV4dCB4PSIyNTUiIHk9IjE1MCIgZmlsbD0iI2NiZDVlMSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMCI+V086IFdPLTk5NDIwPC90ZXh0PgogICAgPHRleHQgeD0iMjU1IiB5PSIxNjUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIj5Nw6F5IEZsZXhvIDA0PC90ZXh0PgogICAgPHBhdGggZD0iTTM5MCAxNDAgTDQ2MCAxNDAiIHN0cm9rZT0iIzEwYjk4MSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjQ1MCwxMzUgNDYwLDE0MCA0NTAsMTQ1IiBmaWxsPSIjMTBiOTgxIi8+CiAgICA8cmVjdCB4PSI0NjAiIHk9Ijk1IiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiIgcng9IjYiLz4KICAgIDx0ZXh0IHg9IjQ3NSIgeT0iMTIwIiBmaWxsPSIjYTdmM2QwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPlRIw4BOSCBQSOG6qE0gWFXhuqRUPC90ZXh0PgogICAgPHRleHQgeD0iNDc1IiB5PSIxNDAiIGZpbGw9IiNjYmQ1ZTEiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTEiPlBhbGxldDogRkctODgyMDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ3NSIgeT0iMTYwIiBmaWxsPSIjZTJlOGYwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCI+U0w6IDUuMDAwIHRow7luZzwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ3NSIgeT0iMTc1IiBmaWxsPSIjZjg3MTcxIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiPltRVUFSQU5USU5FIExPQ0tdPC90ZXh0PgogIDwvc3ZnPg==`,
		Options: []map[string]any{
			{"id": "1", "text": "Kích hoạt ngay chức năng 'Hold / Quarantine Lot' trên MES để khóa mã toàn bộ 20.000 vỏ hộp thành phẩm và nguyên vật liệu liên quan, chặn xuất kho và tự động cảnh báo trạm đóng gói dừng nạp liệu.", "isCorrect": true},
			{"id": "2", "text": "Tiếp tục cho xuất kho bán ra thị trường để giải phóng kho và hy vọng người tiêu dùng không phát hiện ra.", "isCorrect": false},
			{"id": "3", "text": "Đổi tên mã lô mực trên hệ thống thành một mã ngẫu nhiên khác để tránh bị kiểm toán chất lượng.", "isCorrect": false},
			{"id": "4", "text": "Tắt tính năng cảnh báo của module QC trên MES để báo cáo tháng trông vẫn đẹp.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-l3-03",
		FolderSampleKey:    "sample-fld-mes-isa95",
		LevelCode:          "L3",
		FormatCode:         "case_study",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-quality-oee",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "analysis",
		Content:            "[TỰ LUẬN TÍNH TOÁN NĂNG LỰC QUY TRÌNH SPC] Trong công đoạn cắt phôi bìa carton, thông số chiều dài chuẩn theo thiết kế là L = 600 mm với giới hạn dung sai trên USL = 603 mm và giới hạn dung sai dưới LSL = 597 mm.\nHệ thống SPC của MES thu thập tự động 200 mẫu đo kiểm và tính được:\n- Giá trị trung bình thực tế: X_bar = 600.6 mm.\n- Độ lệch chuẩn mẫu đo: sigma = 0.5 mm.\na) Tính chỉ số năng lực quy trình tiềm năng Cp?\nb) Tính chỉ số năng lực thực tế Cpk?\nc) Căn cứ vào giá trị Cpk tính được (so sánh với ngưỡng chuẩn công nghiệp Cpk >= 1.33), hãy đưa ra kết luận quy trình cắt phôi này có đạt năng lực ổn định hay không?",
		Explanation:        "Khoảng dung sai T = 603 - 597 = 6 mm. Cp = 6 / (6 * 0.5) = 2.00. Cpu = (603 - 600.6) / 1.5 = 1.60. Cpl = (600.6 - 597) / 1.5 = 2.40. Cpk = min(1.60, 2.40) = 1.60. Vì Cpk = 1.60 > 1.33 nên quy trình sản xuất đạt chất lượng rất cao (tương đương 4-Sigma).",
		Type:               "essay",
		Rubrics: []map[string]any{
			{"id": "1", "title": "Tính chính xác chỉ số tiềm năng Cp = 2.00", "maxScore": 3.5, "description": "Dung sai T = 6mm, Cp = 6 / (6 * 0.5) = 2.00."},
			{"id": "2", "title": "Tính chính xác chỉ số thực tế Cpk = 1.60", "maxScore": 3.5, "description": "Cpu = (603 - 600.6)/1.5 = 1.60; Cpl = (600.6 - 597)/1.5 = 2.40. Cpk = 1.60."},
			{"id": "3", "title": "Đánh giá kết luận chất lượng quy trình đạt chuẩn", "maxScore": 3.0, "description": "Nhận xét Cpk = 1.60 > 1.33, quy trình cắt phôi đạt năng lực ổn định rất tốt."},
		},
		Status: "published",
	},

	// ==========================================
	// KHỐI LEVEL ALL: AN TOÀN & ĐIỂM LIỆT TUYỆT ĐỐI
	// ==========================================
	{
		SampleKey:          "sample-qst-all-01",
		FolderSampleKey:    "sample-fld-safety-critical",
		LevelCode:          "All",
		FormatCode:         "critical_safety",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "all",
		CognitiveLevelCode: "comprehension",
		Content:            "[ĐIỂM LIỆT AN TOÀN - CÓ HÌNH ẢNH] Quan sát quy trình 6 bước chuẩn bị Lockout / Tagout (LOTO) trong hình ảnh. Khi một kỹ sư bảo trì cần chui vào bên trong thùng máy bế thủy lực để thay lưỡi dao cắt, bước thứ 5 'Xả năng lượng dư thừa (Dissipate / Bleed Stored Energy)' bắt buộc phải thực hiện những gì?",
		Explanation:        "Năng lượng dư thừa nguy hiểm (Stored Residual Energy) như áp suất thủy lực tích trong bình tích áp, khí nén đọng trong xy-lanh hoặc thế năng trọng lực của bệ dao có thể tự kích hoạt đè bẹp công nhân dù đã ngắt điện. BẮT BUỘC xả hết áp suất và chèn cọc chống cơ khí.",
		Type:               "single_choice",
		IsCritical:         true,
		CriticalReason:     "Vi phạm quy trình khóa nguồn an toàn LOTO khi chui vào sửa chữa buồng máy đang có năng lượng cơ khí/điện dư thừa gây tai nạn tử vong tức thì.",
		ImageUrl:           `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMjYwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICAgIDxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMGIxMzI5IiByeD0iMTAiLz4KICAgIDx0ZXh0IHg9IjI0IiB5PSIzMiIgZmlsbD0iI2Y0M2Y1ZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5RVVkgVFLDjE5IIDYgQsav4buaQyBLSMOTQSBOR1Xhu5JOIEPDlCBM4bqsUCBOxIJORyBMxq/hu6JORyBBTiBUT8OATiAoTE9UTyk8L3RleHQ+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwgNjApIj4KICAgICAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9Ijg1IiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzFlMjkzYiIgc3Ryb2tlPSIjMzhiZGY4IiByeD0iNiIvPgogICAgICA8dGV4dCB4PSIxMCIgeT0iMzAiIGZpbGw9IiMzOGJkZjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmb250LXdlaWdodD0iYm9sZCI+MTwvdGV4dD4KICAgICAgPHRleHQgeD0iMTAiIHk9IjYwIiBmaWxsPSIjZmZmIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPlRIw5RORzwvdGV4dD4KICAgICAgPHRleHQgeD0iMTAiIHk9Ijc1IiBmaWxsPSIjZmZmIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPkLDgU88L3RleHQ+CiAgICAgIDx0ZXh0IHg9IjEwIiB5PSIxMDUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIj5DaG8gdHLGsOG7n25nIGNhICZhbXA7IHbhuq1uIGjDoG5oPC90ZXh0PgogICAgPC9nPgogICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTI1LCA2MCkiPgogICAgICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iODUiIGhlaWdodD0iMTUwIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiMzOGJkZjgiIHJ4PSI2Ii8+CiAgICAgIDx0ZXh0IHg9IjEwIiB5PSIzMCIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSJib2xkIj4yPC90ZXh0PgogICAgICA8dGV4dCB4PSIxMCIgeT0iNjAiIGZpbGw9IiNmZmYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+VOG6rlQgTcOBWTwvdGV4dD4KICAgICAgPHRleHQgeD0iMTAiIHk9IjEwNSIgZmlsbD0iIzk0YTNiOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiPlF1eSB0csOsbmggZOG7q25nIHR14bqnbiB04buxPC90ZXh0PgogICAgPC9nPgogICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjIwLCA2MCkiPgogICAgICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iODUiIGhlaWdodD0iMTUwIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiMzOGJkZjgiIHJ4PSI2Ii8+CiAgICAgIDx0ZXh0IHg9IjEwIiB5PSIzMCIgZmlsbD0iIzM4YmRmOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSJib2xkIj4zPC90ZXh0PgogICAgICA8dGV4dCB4PSIxMCIgeT0iNjAiIGZpbGw9IiNmZmYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+Q8OUIEzhuqxQPC90ZXh0PgogICAgICA8dGV4dCB4PSIxMCIgeT0iNzUiIGZpbGw9IiNmZmYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+TkdV4buSTjwvdGV4dD4KICAgICAgPHRleHQgeD0iMTAiIHk9IjEwNSIgZmlsbD0iIzk0YTNiOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiPk5n4bqvdCBj4bqndSBkYW8sIGtow7NhIHZhbjwvdGV4dD4KICAgIDwvZz4KICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMxNSwgNjApIj4KICAgICAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9Ijg1IiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzFlMjkzYiIgc3Ryb2tlPSIjZjU5ZTBiIiByeD0iNiIvPgogICAgICA8dGV4dCB4PSIxMCIgeT0iMzAiIGZpbGw9IiNmNTllMGIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmb250LXdlaWdodD0iYm9sZCI+NDwvdGV4dD4KICAgICAgPHRleHQgeD0iMTAiIHk9IjYwIiBmaWxsPSIjZmZmIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPktIw5NBICZhbXA7PC90ZXh0PgogICAgICA8dGV4dCB4PSIxMCIgeT0iNzUiIGZpbGw9IiNmZmYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+VFJFTyBUSOG6ujwvdGV4dD4KICAgICAgPHRleHQgeD0iMTAiIHk9IjEwNSIgZmlsbD0iI2ZkZTY4YSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiPuG7lCBraMOzYSBjw6EgbmjDom4gTE9UTzwvdGV4dD4KICAgIDwvZz4KICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQxMCwgNjApIj4KICAgICAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9Ijk1IiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzRjMDUxOSIgc3Ryb2tlPSIjZjQzZjVlIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI2Ii8+CiAgICAgIDx0ZXh0IHg9IjEwIiB5PSIzMCIgZmlsbD0iI2Y0M2Y1ZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSJib2xkIj41PC90ZXh0PgogICAgICA8dGV4dCB4PSIxMCIgeT0iNjAiIGZpbGw9IiNmZWNkZDMiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+WOG6oiBI4bq+VDwvdGV4dD4KICAgICAgPHRleHQgeD0iMTAiIHk9Ijc1IiBmaWxsPSIjZmVjZGQzIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPk7Egk5HIEzGr+G7ok5HPC90ZXh0PgogICAgICA8dGV4dCB4PSIxMCIgeT0iMTA1IiBmaWxsPSIjZmRhNGFmIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCI+S2jDrSBuw6luLCB0aOG7p3kgbOG7sWMsIHThu6UgxJFp4buHbjwvdGV4dD4KICAgIDwvZz4KICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDUyMCwgNjApIj4KICAgICAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9Ijg1IiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzA2NGUzYiIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI2Ii8+CiAgICAgIDx0ZXh0IHg9IjEwIiB5PSIzMCIgZmlsbD0iIzEwYjk4MSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSJib2xkIj42PC90ZXh0PgogICAgICA8dGV4dCB4PSIxMCIgeT0iNjAiIGZpbGw9IiNhN2YzZDAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iYm9sZCI+S0nhu4JNIFRSQTwvdGV4dD4KICAgICAgPHRleHQgeD0iMTAiIHk9Ijc1IiBmaWxsPSIjYTdmM2QwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPlRS4bqgTkcgVEjDgUk8L3RleHQ+CiAgICAgIDx0ZXh0IHg9IjEwIiB5PSIxMDUiIGZpbGw9IiM2ZWU3YjciIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIj5UaOG7rSBraOG7n2kgxJHhu5luZyBraMO0bmcgxJFp4buHbjwvdGV4dD4KICAgIDwvZz4KICAgIDxyZWN0IHg9IjMwIiB5PSIyMjIiIHdpZHRoPSI1NzUiIGhlaWdodD0iMjUiIGZpbGw9IiMxZTI5M2IiIHJ4PSI0Ii8+CiAgICA8dGV4dCB4PSI0MCIgeT0iMjM5IiBmaWxsPSIjZTJlOGYwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiPuKaoSBaRVJPIEVORVJHWSBTVEFURTogQuG6rlQgQlXhu5hDIMSQ4bqgVCBN4buoQyBOxIJORyBMxq/hu6JORyBExq8gQuG6sE5HIDAgVFLGr+G7mkMgS0hJIFRIQU8gVMOBQzwvdGV4dD4KICA8L3N2Zz4=`,
		Options: []map[string]any{
			{"id": "1", "text": "Xả toàn bộ áp suất thủy lực còn tích trong bình tích áp (Accumulator), xả khí nén trong đường ống, chèn cọc chống cơ khí để khóa trọng lực của bệ dao di động và đo kiểm điện áp dư trên tụ điện.", "isCorrect": true},
			{"id": "2", "text": "Chỉ cần dặn dò người bên ngoài đứng trông và hô to khi nào chuẩn bị xong.", "isCorrect": false},
			{"id": "3", "text": "Bật điều hòa phòng điều khiển trung tâm để làm mát buồng máy.", "isCorrect": false},
			{"id": "4", "text": "Thay lưỡi dao trước rồi mới xả khí nén sau khi đã lắp xong.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-all-02",
		FolderSampleKey:    "sample-fld-safety-critical",
		LevelCode:          "All",
		FormatCode:         "critical_safety",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "all",
		CognitiveLevelCode: "knowledge",
		Content:            "[ĐIỂM LIỆT AN TOÀN TUYỆT ĐỐI] Trong ca sản xuất, tiếp điểm rơ-le an toàn cửa buồng máy (Safety Door Interlock Switch) bị chập chờn khiến máy tự ngắt khi đang chạy. Hành vi nào sau đây bị NGHIÊM CẤM TUYỆT ĐỐI (Zero-Tolerance) theo nội quy an toàn nhà máy?",
		Explanation:        "HÀNH VI BẮT BUỘC ĐUỔI VIỆC & XỬ LÝ KỶ LUẬT: Việc đấu tắt công tắc cửa an toàn đã gây ra vô số vụ tai nạn lao động thương tâm khi công nhân thò tay hoặc bước vào vùng chuyển động của máy mà máy không tự dừng.",
		Type:               "single_choice",
		IsCritical:         true,
		CriticalReason:     "Bypass hoặc nối tắt tiếp điểm an toàn của rơ-le cửa máy (Safety Interlock Switch) là hành vi vi phạm nghiêm trọng luật an toàn lao động, có thể bị xử lý hình sự khi xảy ra tai nạn.",
		Options: []map[string]any{
			{"id": "1", "text": "Sử dụng một đoạn dây điện để đấu tắt (Bypass / Jump) hai đầu tiếp điểm an toàn nhằm đánh lừa hệ thống điều khiển để máy tiếp tục chạy khi cửa buồng máy vẫn đang mở.", "isCorrect": true},
			{"id": "2", "text": "Dừng máy, treo biển bảo trì, báo ngay cho kỹ sư cơ điện đến thay thế công tắc an toàn chính hãng mới.", "isCorrect": false},
			{"id": "3", "text": "Ghi chép nhật ký sự cố vào sổ giao ca và hệ thống bảo trì CMMS.", "isCorrect": false},
			{"id": "4", "text": "Kiểm tra độ đồng tâm của ngàm khóa cơ khí cánh cửa.", "isCorrect": false},
		},
		Status: "published",
	},

	// ==========================================
	// CÁC CÂU HỎI TIÊU CHUẨN ĐÃ CÓ TRƯỚC ĐÓ
	// ==========================================
	{
		SampleKey:          "sample-qst-01",
		FolderSampleKey:    "sample-fld-mes-isa95",
		LevelCode:          "L3",
		FormatCode:         "theory",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-isa95",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "comprehension",
		Content:            "Theo tiêu chuẩn ISA-95 (Purdue Model), ranh giới trách nhiệm cốt lõi giữa hệ thống ERP (Level 4) và hệ thống MES / MOM (Level 3) được xác định như thế nào trong quy trình lập kế hoạch và điều độ sản xuất?",
		Explanation:        "Theo ISA-95 phần 1 & 3: Level 4 (ERP) quản lý kế hoạch cấp doanh nghiệp (lệnh sản xuất tổng thể, tồn kho tài chính), trong khi Level 3 (MES/MOM) quản lý các hoạt động sản xuất chi tiết: điều độ máy móc, theo dõi vật tư WIP, quản lý chất lượng và nhân công trong phạm vi xưởng sản xuất theo thời gian thực.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "ERP lập kế hoạch kinh doanh và nhu cầu vật tư (Work Order), MES phân rã lệnh và điều độ chi tiết theo từng ca, máy và công đoạn thời gian thực.", "isCorrect": true},
			{"id": "2", "text": "ERP trực tiếp điều khiển đóng ngắt van và đọc tín hiệu cảm biến áp suất, MES tổng hợp báo cáo tài chính cuối tháng.", "isCorrect": false},
			{"id": "3", "text": "MES chịu trách nhiệm hoạch định tài chính và tiền lương, ERP chỉ lưu trữ nhật ký thao tác HMI.", "isCorrect": false},
			{"id": "4", "text": "Hai hệ thống hoàn toàn trùng lặp chức năng, việc phân chia chỉ dựa trên thỏa thuận với nhà cung cấp phần mềm.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-02",
		FolderSampleKey:    "sample-fld-mes-isa95",
		LevelCode:          "L3",
		FormatCode:         "case_study",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-work-order",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "analysis",
		Content:            "Trong dây chuyền sản xuất bao bì giấy sóng carton, cuộn giấy nguyên liệu mã B-2026-X bị phát hiện lỗi độ bục không đạt chuẩn sau khi đã gia công thành 5.000 thùng thành phẩm. Cần sử dụng chức năng nào của hệ thống MES để truy vết tức thời toàn bộ lô hàng liên quan?",
		Explanation:        "Chức năng Genealogy (Phả hệ lô sản xuất) trong MES liên kết toàn bộ mã cuộn giấy nguyên liệu đầu vào với từng công đoạn chia cuộn, in, bế, dán thùng, cho phép truy xuất xuôi (nguyên liệu đi vào những thành phẩm nào) và truy xuất ngược (thành phẩm cấu thành từ nguyên liệu nào) chỉ trong vài giây.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Chức năng Batch Genealogy & Forward/Backward Traceability (Truy xuất nguồn gốc xuôi và ngược).", "isCorrect": true},
			{"id": "2", "text": "Chức năng tính toán chỉ số khả năng quy trình Cpk trong module SPC.", "isCorrect": false},
			{"id": "3", "text": "Chức năng cấp phát tài khoản người dùng qua giao thức LDAP.", "isCorrect": false},
			{"id": "4", "text": "Thiết lập lại cấu hình địa chỉ IP của trạm cân điện tử đầu vào.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-03",
		FolderSampleKey:    "sample-fld-scada-opcua",
		LevelCode:          "L2",
		FormatCode:         "simulation_hmi",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "application",
		Content:            "Kỹ sư vận hành cần thiết lập kết nối OPC-UA Client từ máy chủ MES tới PLC Siemens S7-1500 của máy in Flexo. Thiết lập bảo mật nào là bắt buộc theo tiêu chuẩn IEC 62443 để ngăn chặn tấn công nghe lén dữ liệu trên mạng OT?",
		Explanation:        "Tiêu chuẩn IEC 62443 và thực hành bảo mật OPC-UA yêu cầu sử dụng chính sách mã hóa mạnh (tối thiểu Basic256Sha256) với chế độ SignAndEncrypt để đảm bảo cả tính toàn vẹn (integrity) và tính bảo mật (confidentiality) của dữ liệu shopfloor.",
		Type:               "single_choice",
		SimulationType:     "dispatch",
		Options: []map[string]any{
			{"id": "1", "text": "Kích hoạt Security Policy 'Basic256Sha256' kèm Message Security Mode 'SignAndEncrypt' và chứng chỉ x509 tin cậy.", "isCorrect": true},
			{"id": "2", "text": "Để chế độ Security Policy là 'None' để giảm tải CPU của PLC và không cần cấu hình chứng chỉ.", "isCorrect": false},
			{"id": "3", "text": "Chỉ sử dụng mật khẩu văn bản thuần (plain text) không mã hóa qua cổng HTTP 80.", "isCorrect": false},
			{"id": "4", "text": "Mở toàn bộ cổng mạng từ 1 đến 65535 và tắt tường lửa công nghiệp.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-04",
		FolderSampleKey:    "sample-fld-safety-critical",
		LevelCode:          "All",
		FormatCode:         "critical_safety",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "all",
		CognitiveLevelCode: "knowledge",
		Content:            "ĐIỂM LIỆT: Khi máy in bế tốc độ cao đang vận hành ở tốc độ 300 sản phẩm/phút và xảy ra sự cố kẹt giấy hoặc dị vật cuốn vào trục lăn, thao tác đầu tiên và bắt buộc của công nhân vận hành là gì?",
		Explanation:        "Đây là câu hỏi điểm liệt về an toàn tính mạng. Bất kỳ sự cố kẹt dị vật hay nguy cơ cuốn kẹp cơ khí phải được kích hoạt E-Stop vật lý ngay lập tức để ngắt điện động cơ và kích hoạt phanh cơ khí hãm trục quay.",
		Type:               "single_choice",
		IsCritical:         true,
		CriticalReason:     "Quy chuẩn an toàn lao động bắt buộc: Không tuân thủ quy trình dừng khẩn cấp dẫn đến tai nạn dập nát chi nghiêm trọng.",
		Options: []map[string]any{
			{"id": "1", "text": "Nhấn ngay nút Dừng khẩn cấp (Emergency Stop - E-Stop) trên trạm điều khiển gần nhất, tuyệt đối không dùng tay với vào khu vực chuyển động.", "isCorrect": true},
			{"id": "2", "text": "Thò tay vào gỡ tấm carton kẹt khi trục lăn vẫn đang quay theo quán tính để tránh rách sản phẩm.", "isCorrect": false},
			{"id": "3", "text": "Đợi hết lô hàng rồi mới bấm dừng máy bằng nút Stop mềm trên màn hình cảm ứng.", "isCorrect": false},
			{"id": "4", "text": "Chạy sang phòng điều khiển trung tâm để báo cáo trưởng ca xem xét.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-05",
		FolderSampleKey:    "sample-fld-quality-spc",
		LevelCode:          "L2",
		FormatCode:         "case_study",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-quality-oee",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "analysis",
		Content:            "Một ca sản xuất 8 giờ (480 phút) tại xưởng in có thời gian nghỉ theo kế hoạch là 30 phút. Thời gian dừng máy sự cố là 45 phút. Tốc độ thiết kế là 100 tờ/phút. Tổng sản lượng thực tế làm ra là 36.000 tờ, trong đó có 1.800 tờ lỗi phế phẩm. Hãy xác định chỉ số Hiệu suất Tổng thể Thiết bị (OEE) của ca làm việc?",
		Explanation:        "Thời gian chạy theo kế hoạch = 480 - 30 = 450 phút. Thời gian vận hành thực = 450 - 45 = 405 phút. Availability = 405/450 = 90.0%. Tốc độ thiết kế đạt 40.500 tờ lý thuyết trong 405 phút. Performance = 36.000/40.500 = 88.89%. Quality = (36.000 - 1.800)/36.000 = 95.0%. OEE = 0.90 * 0.8889 * 0.95 = 76.0%.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "OEE đạt xấp xỉ 76.0% (Availability: 90.0%, Performance: 88.89%, Quality: 95.0%).", "isCorrect": true},
			{"id": "2", "text": "OEE đạt 95.0% vì chỉ tính tỷ lệ thành phẩm đạt tiêu chuẩn.", "isCorrect": false},
			{"id": "3", "text": "OEE đạt 50.0% vì bị trừ toàn bộ thời gian dừng máy.", "isCorrect": false},
			{"id": "4", "text": "OEE đạt 100% vì đã hoàn thành đủ số lượng theo đơn vị đặt hàng.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-06",
		FolderSampleKey:    "sample-fld-arch-clean",
		LevelCode:          "L3",
		FormatCode:         "theory",
		SpecialtyCode:      "ARCH",
		TopicCode:          "arch-idempotency",
		TargetGroupCode:    "ARCH-MS-01",
		CognitiveLevelCode: "analysis",
		Content:            "Phân tích nguyên lý Idempotency (Tính bất biến khi gọi lại) trong việc thiết kế API xác nhận hoàn thành công đoạn sản xuất (Operation Confirmation). Trình bày cách sử dụng Idempotency Key và Database RowVersion để ngăn chặn ghi trùng dữ liệu sản lượng khi gặp sự cố mạng chập chờn.",
		Explanation:        "Idempotency đảm bảo việc gửi lại cùng một yêu cầu xác nhận công đoạn (cùng Idempotency Key) nhiều lần không gây ra tác động phụ nhân đôi số lượng thành phẩm hay trừ hai lần tồn kho vật tư.",
		Type:               "essay",
		Rubrics: []map[string]any{
			{"id": "1", "title": "Định nghĩa và vai trò của Idempotency trong hệ thống MES phân tán", "maxScore": 3.0, "description": "Giải thích được rủi ro retry tự động từ client/máy quét barcode gây nhân đôi sản lượng."},
			{"id": "2", "title": "Cơ chế Idempotency-Key và lưu trữ idempotency cache", "maxScore": 4.0, "description": "Trình bày cách sử dụng bảng cache hoặc token hash để trả kết quả cũ nếu key đã xử lý."},
			{"id": "3", "title": "Cơ chế Optimistic Concurrency Control qua RowVersion / RowVersion lock", "maxScore": 3.0, "description": "Giải thích kiểm tra phiên bản bản ghi để loại bỏ race condition."},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-07",
		FolderSampleKey:    "sample-fld-arch-clean",
		LevelCode:          "L2",
		FormatCode:         "theory",
		SpecialtyCode:      "REACT",
		TopicCode:          "react-concurrent",
		TargetGroupCode:    "WEB-ADV-26",
		CognitiveLevelCode: "application",
		Content:            "Trong giao diện giám sát nhà máy thời gian thực (MES Dashboard), khi nhận dữ liệu telemetry từ hàng trăm cảm biến tần suất 100ms, kỹ thuật nào của React 19 và Virtualization giúp tránh hiện tượng đơ giật giao diện (frame drop)?",
		Explanation:        "React 19 Concurrent Mode cùng useTransition cho phép giữ giao diện tương tác phản hồi mượt mà cho người dùng (priority updates), trong khi việc render biểu đồ nặng được phân bổ non-blocking. Virtualized table giới hạn số lượng DOM node thực tế hiển thị tương ứng với chiều cao màn hình.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Sử dụng useTransition để xếp các cập nhật biểu đồ vào diện non-blocking, kết hợp VirtualDataTable chỉ render các dòng nhìn thấy trong viewport.", "isCorrect": true},
			{"id": "2", "text": "Sử dụng setTimeout(..., 0) và ép buộc render toàn bộ 10.000 node DOM cùng lúc.", "isCorrect": false},
			{"id": "3", "text": "Lưu toàn bộ dữ liệu vào biến toàn cục window và gọi window.location.reload() sau mỗi 100ms.", "isCorrect": false},
			{"id": "4", "text": "Tắt hoàn toàn tính năng reconciliation của React và cập nhật innerHTML trực tiếp.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-08",
		FolderSampleKey:    "sample-fld-sec-oauth",
		LevelCode:          "L2",
		FormatCode:         "case_study",
		SpecialtyCode:      "SEC",
		TopicCode:          "sec-oauth",
		TargetGroupCode:    "SEC-2026-A",
		CognitiveLevelCode: "comprehension",
		Content:            "Hệ thống SkillHub MES sử dụng kiến trúc Token-Based Authentication. Vì sao Refresh Token bắt buộc phải được lưu trữ trong HttpOnly, Secure, SameSite Cookie thay vì lưu trữ tại localStorage của trình duyệt?",
		Explanation:        "HttpOnly Cookie không thể bị đọc hoặc truy cập bởi mã JavaScript chạy trong trình duyệt, loại bỏ nguy cơ mã độc XSS đánh cắp Refresh Token dài hạn của tài khoản quản trị.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Để ngăn chặn triệt để nguy cơ đánh cắp token thông qua các cuộc tấn công Cross-Site Scripting (XSS).", "isCorrect": true},
			{"id": "2", "text": "Vì localStorage chỉ lưu trữ được tối đa 256 byte dữ liệu.", "isCorrect": false},
			{"id": "3", "text": "Vì HttpOnly Cookie giúp tăng tốc độ mạng lên gấp 10 lần so với localStorage.", "isCorrect": false},
			{"id": "4", "text": "Vì giao thức HTTP không cho phép gửi Authorization header kèm request.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-09",
		FolderSampleKey:    "sample-fld-arch-clean",
		LevelCode:          "L2",
		FormatCode:         "theory",
		SpecialtyCode:      "CLOUD",
		TopicCode:          "cloud-cicd",
		TargetGroupCode:    "ARCH-MS-01",
		CognitiveLevelCode: "knowledge",
		Content:            "Trong tệp cấu hình Docker Compose triển khai hệ thống MES cục bộ tại nhà máy (Edge Node), chỉ thị nào được sử dụng để đảm bảo container API backend chỉ khởi động sau khi PostgreSQL đã sẵn sàng tiếp nhận kết nối?",
		Explanation:        "depends_on thông thường chỉ đợi container DB khởi tạo tiến trình, chưa đảm bảo DB đã sẵn sàng mở cổng mạng. Cần khai báo healthcheck (ví dụ: pg_isready) và chỉ định condition: service_healthy để đảm bảo container API không bị crash khi khởi động đồng thời.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "depends_on kết hợp điều kiện condition: service_healthy với healthcheck pg_isready.", "isCorrect": true},
			{"id": "2", "text": "Chỉ sử dụng depends_on cơ bản không kèm healthcheck.", "isCorrect": false},
			{"id": "3", "text": "Sử dụng lệnh sleep 30 trong file frontend package.json.", "isCorrect": false},
			{"id": "4", "text": "Không cần cấu hình, Docker sẽ tự động suy đoán thứ tự dịch vụ theo bảng chữ cái.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-10",
		FolderSampleKey:    "sample-fld-scada-opcua",
		LevelCode:          "L2",
		FormatCode:         "simulation_hmi",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "application",
		Content:            "MÔ PHỎNG HMI: Trên màn hình điều độ SCADA dây chuyền dán đáy thùng tự động, đèn báo lỗi Sensor Phôi (Sensor Error) nhấp nháy đỏ và còi báo động kêu. Trình tự thao tác chuẩn trên màn hình cảm ứng HMI là gì?",
		Explanation:        "Quy trình chuẩn hóa vận hành HMI: Đầu tiên tắt chuông báo động để tập trung xử lý, chuyển sang chế độ Manual để cô lập an toàn, kiểm tra vị trí phôi thực tế, loại bỏ dị vật và sau đó Reset trạng thái lỗi trên màn hình trước khi trở lại chế độ Auto.",
		Type:               "single_choice",
		SimulationType:     "dispatch",
		Options: []map[string]any{
			{"id": "1", "text": "Bấm nút 'Mute Alarm' -> Chuyển chế độ sang 'Manual' -> Xác nhận vị trí kẹt phôi trên sơ đồ -> Reset lỗi sau khi xử lý.", "isCorrect": true},
			{"id": "2", "text": "Bấm nút 'Bypass Sensor' để máy tiếp tục dán dù không có phôi vào.", "isCorrect": false},
			{"id": "3", "text": "Tắt nguồn toàn bộ tủ điện mà không lưu dữ liệu lệnh sản xuất.", "isCorrect": false},
			{"id": "4", "text": "Bấm nút Start liên tục cho đến khi phôi tự trôi qua.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-11",
		FolderSampleKey:    "sample-fld-mes-isa95",
		LevelCode:          "L3",
		FormatCode:         "theory",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-erp-b2mml",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "comprehension",
		Content:            "Chuẩn B2MML (Business to Manufacturing Markup Language) đóng vai trò gì trong việc trao đổi thông tin giữa hệ thống ERP SAP và hệ thống MES Goldsun?",
		Explanation:        "B2MML do WBF/MESA phát triển, hiện thực hóa các mô hình đối tượng của tiêu chuẩn ISA-95 thành các XML/JSON Schema chuẩn, giúp tích hợp ERP và MES không phụ thuộc vào nhà cung cấp công nghệ độc quyền.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Cung cấp lược đồ dữ liệu chuẩn hóa XML/JSON định nghĩa Lệnh sản xuất, Định mức nguyên vật liệu (BOM) và Kết quả sản lượng theo ISA-95.", "isCorrect": true},
			{"id": "2", "text": "Là giao thức điều khiển xung nhịp cho động cơ servo máy in.", "isCorrect": false},
			{"id": "3", "text": "Là ngôn ngữ lập trình thay thế cho Java và C#.", "isCorrect": false},
			{"id": "4", "text": "Là hệ điều hành thời gian thực chạy trực tiếp trên PLC.", "isCorrect": false},
		},
		Status: "pending_review",
	},
	{
		SampleKey:          "sample-qst-12",
		FolderSampleKey:    "sample-fld-mes-isa95",
		LevelCode:          "L3",
		FormatCode:         "case_study",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-work-order",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "application",
		Content:            "Khi tiếp nhận Lệnh sản xuất (Work Order) từ ERP với sản lượng 100.000 thùng carton, hệ thống MES tính toán tỷ lệ hao hụt dự kiến công đoạn in là 1.5% và công đoạn bế dán là 1.0%. Số lượng phôi giấy đầu vào cần cấp phát tối thiểu cho công đoạn đầu tiên là bao nhiêu?",
		Explanation:        "Sản lượng đầu vào cần tính ngược theo từng công đoạn: Qua bế dán cần 100.000 / (1 - 0.01) = 101.010 phôi. Qua công đoạn in cần 101.010 / (1 - 0.015) = 102.538 phôi giấy tấm.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Khoảng 102.538 phôi giấy tấm.", "isCorrect": true},
			{"id": "2", "text": "Đúng 100.000 phôi giấy tấm không tính hao hụt.", "isCorrect": false},
			{"id": "3", "text": "150.000 phôi giấy tấm.", "isCorrect": false},
			{"id": "4", "text": "101.500 phôi giấy tấm.", "isCorrect": false},
		},
		Status: "pending_review",
	},
	{
		SampleKey:          "sample-qst-13",
		FolderSampleKey:    "sample-fld-arch-clean",
		LevelCode:          "L3",
		FormatCode:         "theory",
		SpecialtyCode:      "ARCH",
		TopicCode:          "arch-clean",
		TargetGroupCode:    "ENG-FSH-03",
		CognitiveLevelCode: "comprehension",
		Content:            "Trong mô hình kiến trúc Modular Monolith của SkillHub, ranh giới giữa các module (như catalog, questions, assessments, auth) được cô lập bằng cách nào để ngăn chặn sự phụ thuộc chéo hỗn loạn (spaghetti dependency)?",
		Explanation:        "Modular Monolith phân chia ranh giới module rõ ràng (Bounded Context), mỗi module sở hữu dữ liệu riêng và chỉ tương tác qua hợp đồng interface/service định nghĩa trước.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Mỗi module quản lý schema/bảng riêng, giao tiếp qua Public Service Interface hoặc RPC nội bộ, không join trực tiếp qua các bảng nghiệp vụ của module khác.", "isCorrect": true},
			{"id": "2", "text": "Gộp chung toàn bộ mã nguồn vào một file duy nhất 50.000 dòng.", "isCorrect": false},
			{"id": "3", "text": "Viết trigger database gọi chéo nhau qua 20 bảng.", "isCorrect": false},
			{"id": "4", "text": "Sử dụng biến toàn cục chia sẻ trạng thái trong bộ nhớ.", "isCorrect": false},
		},
		Status: "draft",
	},
	{
		SampleKey:          "sample-qst-14",
		FolderSampleKey:    "sample-fld-safety-critical",
		LevelCode:          "All",
		FormatCode:         "critical_safety",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "all",
		CognitiveLevelCode: "knowledge",
		Content:            "ĐIỂM LIỆT: Khi thực hiện bảo trì, vệ sinh hoặc tra dầu mỡ vào hệ thống xích truyền động của máy dán hộp, quy tắc an toàn LOTO bắt buộc phải thực hiện là gì?",
		Explanation:        "Quy tắc LOTO (Lockout / Tagout) là sinh mạng của công nhân bảo trì. Phải cô lập nguồn năng lượng, xả năng lượng dư thừa (khí nén, thủy lực) và khóa ổ khóa cá nhân để không ai có thể khởi động máy ngoài ý muốn khi đang có người sửa chữa.",
		Type:               "single_choice",
		IsCritical:         true,
		CriticalReason:     "Vi phạm nguyên tắc LOTO có thể dẫn đến tai nạn kẹt cuốn gây tử vong.",
		Options: []map[string]any{
			{"id": "1", "text": "Ngắt cầu dao điện chính, treo biển cảnh báo và khóa ổ khóa an toàn cá nhân (Lockout / Tagout) trước khi thao tác.", "isCorrect": true},
			{"id": "2", "text": "Để máy chạy ở tốc độ chậm (jogging) để vừa chạy vừa lau chùi xích cho nhanh.", "isCorrect": false},
			{"id": "3", "text": "Nhờ người đứng trông công tắc nhưng không khóa ổ khóa.", "isCorrect": false},
			{"id": "4", "text": "Chỉ cần tắt màn hình cảm ứng điều khiển.", "isCorrect": false},
		},
		Status: "published",
	},
	{
		SampleKey:          "sample-qst-15",
		FolderSampleKey:    "sample-fld-scada-opcua",
		LevelCode:          "L2",
		FormatCode:         "theory",
		SpecialtyCode:      "MES",
		TopicCode:          "mes-scada-opcua",
		TargetGroupCode:    "MES-ENG-26",
		CognitiveLevelCode: "comprehension",
		Content:            "Tại sao trong mô hình Purdue (ISA-95), máy chủ MES không nên đọc trực tiếp I/O từ thiết bị cảm biến trường (Level 0) mà phải thông qua PLC/SCADA (Level 1/2)?",
		Explanation:        "PLC ở Level 1 được thiết kế chuyên biệt cho điều khiển chu kỳ cố định vài mili-giây (deterministic), đảm bảo an toàn thiết bị. MES ở Level 3 thu thập dữ liệu đã được tổng hợp, lọc nhiễu và xử lý logic từ PLC/SCADA để phục vụ quản lý sản xuất.",
		Type:               "single_choice",
		Options: []map[string]any{
			{"id": "1", "text": "Vì Level 0/1 đòi hỏi tính thời gian thực cứng (hard real-time chu kỳ mili-giây) và độ tin cậy điều khiển liên tục, trong khi MES hoạt động ở chu kỳ giao dịch (transactional).", "isCorrect": true},
			{"id": "2", "text": "Vì cảm biến trường không dùng điện.", "isCorrect": false},
			{"id": "3", "text": "Vì phần mềm MES không biết đọc số nguyên.", "isCorrect": false},
			{"id": "4", "text": "Vì giao diện SCADA chỉ vẽ được màu xanh đỏ.", "isCorrect": false},
		},
		Status: "published",
	},
}

// InitSampleQuestions seeds sample folders and questions idempotently into the database.
func (s *Server) InitSampleQuestions(ctx context.Context) error {
	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Resolve system actor
	var sysActor string
	if err = tx.GetContext(ctx, &sysActor, `SELECT "IdSeq" FROM "_SYSActorDirectory" WHERE "ActorType"='SYSTEM' LIMIT 1`); err != nil {
		return fmt.Errorf("system actor not found: %w", err)
	}
	if _, err = tx.ExecContext(ctx, `SELECT set_config('app.actor_seq', $1, true)`, sysActor); err != nil {
		return err
	}

	// 2. Resolve admin user for AuthorId
	var adminUser string
	if err = tx.GetContext(ctx, &adminUser, `SELECT "IdSeq" FROM "_USRAccountDirectory" WHERE "Role"='admin' LIMIT 1`); err != nil {
		adminUser = sysActor
	}

	// 3. Resolve catalog options into a lookup map: key:code -> UUID
	type catRow struct {
		CatalogKey string `db:"CatalogKey"`
		Value      string `db:"Value"`
		IdSeq      string `db:"IdSeq"`
	}
	var catRows []catRow
	if err = tx.SelectContext(ctx, &catRows, `SELECT "CatalogKey", "Value", "IdSeq"::text AS "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey" IN ('level','question_format','specialty','question_topic','target_group','cognitive_level') AND "Enabled"`); err != nil {
		return fmt.Errorf("loading catalog options: %w", err)
	}
	lookup := make(map[string]string)
	for _, r := range catRows {
		lookup[r.CatalogKey+":"+r.Value] = r.IdSeq
	}

	// 4. Seed Folders
	folderMap := make(map[string]string) // SampleKey -> IdSeq
	for _, fld := range sampleFolders {
		lvlID, ok := lookup["level:"+fld.LevelCode]
		if !ok {
			lvlID = lookup["level:All"]
		}
		var folderID string
		query := `INSERT INTO "_QSTFolder"("Name", "Description", "LevelId", "SampleKey", "CreatedBy", "UpdatedBy")
			VALUES($1, $2, $3, $4, $5, $5)
			ON CONFLICT ("SampleKey") DO UPDATE SET "Name"=EXCLUDED."Name", "Description"=EXCLUDED."Description", "LevelId"=EXCLUDED."LevelId"
			RETURNING "IdSeq"`
		if err = tx.GetContext(ctx, &folderID, query, fld.Name, fld.Description, lvlID, fld.SampleKey, sysActor); err != nil {
			return fmt.Errorf("seeding folder %s: %w", fld.SampleKey, err)
		}
		folderMap[fld.SampleKey] = folderID
	}

	// 5. Seed Questions
	for _, q := range sampleQuestions {
		lvlID := lookup["level:"+q.LevelCode]
		fmtID := lookup["question_format:"+q.FormatCode]
		spcID := lookup["specialty:"+q.SpecialtyCode]
		topID := lookup["question_topic:"+q.TopicCode]
		grpID := lookup["target_group:"+q.TargetGroupCode]
		cogID := lookup["cognitive_level:"+q.CognitiveLevelCode]

		if lvlID == "" || fmtID == "" || spcID == "" || topID == "" || grpID == "" || cogID == "" {
			return fmt.Errorf("missing catalog mapping for question %s (level=%s, format=%s, specialty=%s, topic=%s, group=%s, cog=%s)",
				q.SampleKey, q.LevelCode, q.FormatCode, q.SpecialtyCode, q.TopicCode, q.TargetGroupCode, q.CognitiveLevelCode)
		}

		folderID := folderMap[q.FolderSampleKey]
		optionsJSON, _ := json.Marshal(q.Options)
		if q.Options == nil {
			optionsJSON = []byte("[]")
		}
		rubricsJSON, _ := json.Marshal(q.Rubrics)
		if q.Rubrics == nil {
			rubricsJSON = []byte("[]")
		}

		qQuery := `INSERT INTO "_QSTQuestion"(
			"LevelId", "FormatId", "SpecialtyId", "TopicId", "TargetGroupId", "CognitiveLevelId",
			"FolderId", "Content", "Explanation", "Type", "Options", "Rubrics",
			"SimulationType", "IsCritical", "CriticalReason", "ImageUrl", "Status",
			"AuthorId", "SampleKey", "CreatedBy", "UpdatedBy"
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			NULLIF($7,'')::uuid, $8, $9, $10, $11::jsonb, $12::jsonb,
			$13, $14, $15, $16, $17,
			$18, $19, $20, $20
		)
		ON CONFLICT ("SampleKey") DO UPDATE SET
			"LevelId"=EXCLUDED."LevelId", "FormatId"=EXCLUDED."FormatId", "SpecialtyId"=EXCLUDED."SpecialtyId",
			"TopicId"=EXCLUDED."TopicId", "TargetGroupId"=EXCLUDED."TargetGroupId", "CognitiveLevelId"=EXCLUDED."CognitiveLevelId",
			"FolderId"=EXCLUDED."FolderId", "Content"=EXCLUDED."Content", "Explanation"=EXCLUDED."Explanation",
			"Type"=EXCLUDED."Type", "Options"=EXCLUDED."Options", "Rubrics"=EXCLUDED."Rubrics",
			"SimulationType"=EXCLUDED."SimulationType", "IsCritical"=EXCLUDED."IsCritical", "CriticalReason"=EXCLUDED."CriticalReason",
			"ImageUrl"=EXCLUDED."ImageUrl", "Status"=EXCLUDED."Status"`

		if _, err = tx.ExecContext(ctx, qQuery,
			lvlID, fmtID, spcID, topID, grpID, cogID,
			folderID, q.Content, q.Explanation, q.Type, string(optionsJSON), string(rubricsJSON),
			q.SimulationType, q.IsCritical, q.CriticalReason, q.ImageUrl, q.Status,
			adminUser, q.SampleKey, sysActor,
		); err != nil {
			return fmt.Errorf("seeding question %s: %w", q.SampleKey, err)
		}
	}

	return tx.Commit()
}
