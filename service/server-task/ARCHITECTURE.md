# Kiến Trúc Microservice Nghiệp Vụ Học - Thi (`server-learning`)

Tài liệu này mô tả chi tiết kiến trúc microservice `server-learning`, được tách ra từ `server-core` nhằm phụ trách toàn bộ nghiệp vụ Học tập, Khảo thí và Quản lý đào tạo theo chuẩn thiết kế **A - U - D - Q** phân tách từng file cho từng chức năng menu.

---

## 1. Phân Chia Trách Nhiệm Giữa 2 Server

| Server | Vai trò chính | Phạm vi nghiệp vụ |
| :--- | :--- | :--- |
| **`server-core`** | **Core Identity & Security** | - Quản lý tài khoản người dùng (`_ERPUsers`, `_USRAccountDirectory`).<br>- Xác thực, cấp phát JWT, Sessions, RBAC Phân quyền menu.<br>- **Bảo mật thi**: Xác thực chữ ký HMAC, Anti-Spam, kiểm soát gian lận (Anti-cheat), Audit log hệ thống khi làm bài thi. |
| **`server-learning`** | **Học - Thi - Đào tạo** | - Đăng ký ca thi, tổ chức đợt thi, phòng thi (`exams`).<br>- Học tập của user, bài học, tiến độ (`learning`).<br>- Bộ đề thi, cấu trúc ma trận (`assessments`).<br>- Ngân hàng câu hỏi, mô phỏng (`questions`).<br>- Chấm bài thi trắc nghiệm & tự luận (`grading`).<br>- Lớp & nhóm đào tạo (`groups`).<br>- Luyện tập cá nhân (`practice`).<br>- Kho tài liệu kiến thức (`knowledge`).<br>- Báo cáo kết quả thi và đào tạo (`reports`). |

---

## 2. Quy Chuẩn Tổ Chức Thư Mục & File: Chuẩn A - U - D - Q

Để tránh việc gộp chung tất cả nghiệp vụ vào 1 file lớn gây khó kiểm soát, mỗi chức năng menu được tách thành 1 thư mục riêng biệt với 5 file tiêu chuẩn:
- **`*_a.go`**: **Add / Create** (Thao tác Thêm mới, Khởi tạo, Đăng ký).
- **`*_u.go`**: **Update / Edit** (Thao tác Cập nhật, Nộp bài, Lưu tiến độ, Duyệt).
- **`*_d.go`**: **Delete / Remove** (Thao tác Xóa, Hủy, Reset).
- **`*_q.go`**: **Query / Read** (Thao tác Truy vấn, Tìm kiếm, Phân trang, Xem chi tiết).
- **`*_service.go`**: Khởi tạo Service Struct, Dependency Injection và Interface.

### Cây thư mục chi tiết (`internal/service/`):
```text
service/server-learning/internal/service/
├── exams/                  # Menu: Kỳ thi của tôi / Tổ chức ca thi
│   ├── exam_service.go
│   ├── exam_a.go           # Tạo ca thi, bắt đầu lượt thi (StartAttempt), đăng ký ca thi
│   ├── exam_u.go           # Cập nhật ca thi, lưu heartbeat, nộp bài thi (SubmitAttempt)
│   ├── exam_d.go           # Xóa ca thi, hủy đăng ký ca thi
│   └── exam_q.go           # Danh sách ca thi, kỳ thi của tôi, chi tiết bài làm
├── learning/               # Menu: Khóa học của tôi
│   ├── learning_service.go
│   ├── learning_a.go       # Tạo khóa học, thêm bài học mới
│   ├── learning_u.go       # Cập nhật khóa học, bài học, tiến độ học viên
│   ├── learning_d.go       # Xóa khóa học, xóa bài học
│   └── learning_q.go       # Danh sách khóa học, chi tiết khóa học & bài học
├── assessments/            # Menu: Quản lý bộ đề thi & Blueprints
│   ├── assessment_service.go
│   ├── assessment_a.go     # Tạo bộ đề thi mới, tạo ma trận đề (Blueprint)
│   ├── assessment_u.go     # Cập nhật bộ đề, xuất bản bộ đề (Publish)
│   ├── assessment_d.go     # Xóa bộ đề, xóa blueprint
│   └── assessment_q.go     # Danh sách bộ đề, chi tiết bộ đề & danh sách câu hỏi
├── questions/              # Menu: Ngân hàng câu hỏi
│   ├── question_service.go
│   ├── question_a.go       # Thêm câu hỏi, tạo thư mục câu hỏi
│   ├── question_u.go       # Cập nhật câu hỏi, duyệt câu hỏi
│   ├── question_d.go       # Xóa câu hỏi, xóa thư mục câu hỏi
│   └── question_q.go       # Tìm kiếm câu hỏi có phân trang/lọc, xem chi tiết
├── grading/                # Menu: Chấm bài thi
│   ├── grading_service.go
│   ├── grading_a.go        # Ghi nhận điểm chấm tự luận lần đầu
│   ├── grading_u.go        # Cập nhật điểm phúc khảo, nhận xét bài thi
│   ├── grading_d.go        # Reset bài thi về trạng thái chờ chấm
│   └── grading_q.go        # Hàng đợi chấm bài (Grading Queue), chi tiết bài chấm
├── groups/                 # Menu: Lớp & Nhóm đào tạo
│   ├── group_service.go
│   ├── group_a.go          # Tạo nhóm đào tạo, thêm học viên vào nhóm
│   ├── group_u.go          # Cập nhật thông tin nhóm đào tạo
│   ├── group_d.go          # Xóa nhóm, xóa học viên khỏi nhóm
│   └── group_q.go          # Danh sách nhóm, chi tiết danh sách thành viên
├── practice/               # Menu: Luyện tập
│   ├── practice_service.go
│   ├── practice_a.go       # Bắt đầu phiên luyện tập mới
│   ├── practice_u.go       # Hoàn thành phiên luyện tập và lưu kết quả
│   ├── practice_d.go       # Hủy phiên luyện tập đang diễn ra
│   └── practice_q.go       # Danh sách chủ đề luyện tập & số lượng câu hỏi
├── knowledge/              # Menu: Kho kiến thức & Tài liệu
│   ├── knowledge_service.go
│   ├── knowledge_a.go      # Tạo tài liệu kiến thức mới
│   ├── knowledge_u.go      # Cập nhật tài liệu kiến thức
│   ├── knowledge_d.go      # Xóa tài liệu kiến thức
│   └── knowledge_q.go      # Tra cứu và tìm kiếm tài liệu
└── reports/                # Menu: Báo cáo đào tạo
    ├── report_service.go
    ├── report_a.go         # Tạo snapshot lưu trữ báo cáo định kỳ
    ├── report_u.go         # Cập nhật ngưỡng chỉ số KPI đào tạo
    ├── report_d.go         # Xóa bộ nhớ đệm / snapshot báo cáo cũ
    └── report_q.go         # Báo cáo tổng quan, tỷ lệ đỗ/trượt, phổ điểm theo phòng ban
```

---

## 3. Cơ Chế Kết Nối Giữa Các Tầng

1. **Client / Web UI** gọi API thông qua **API Gateway** (`/api/learning/*` hoặc `/api/v2/*`).
2. **API Gateway** chuyển tiếp request đến `server-learning` qua cổng HTTP `8083` (hoặc gRPC `60053`).
3. `server-learning` kiểm tra token xác thực thông qua `CoreSecurityClient` được cấp bởi `server-core`.
4. Trong quá trình làm bài thi, các sự kiện bất thường hoặc kiểm tra token phiên thi được kiểm tra chéo với cơ chế bảo mật của `server-core`.
5. Service thực hiện các tác vụ SQL tối ưu với `sqlx` và `pgxpool`.
