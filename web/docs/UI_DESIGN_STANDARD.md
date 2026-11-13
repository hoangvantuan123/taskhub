# Management Interface & UI Design Standard (Khung Tiêu Chuẩn Thiết Kế Giao Diện Quản Trị)

> **Tài liệu quy chuẩn thiết kế và phát triển giao diện Quản trị (Admin & Management UI/UX Framework)**
> Áp dụng bắt buộc cho toàn bộ các màn hình quản trị trong hệ thống **SkillHub MES** (Quản lý người dùng, Ngân hàng câu hỏi, Phân quyền & Module, Kỳ đánh giá, Danh mục tổ chức, Báo cáo & Lịch sử audit,...).
> **Reference implementations tiêu chuẩn:**
> - `/admin/users` (Quản lý tài khoản, tổ chức, phân quyền, xuất/nhập dữ liệu)
> - `/manage/questions` (Ngân hàng câu hỏi, thư mục, thuộc tính catalog ISA-95)

---

## 1. Triết lý Thiết kế Cốt lõi (Core Design Principles)

1. **Hiệu năng & Tải trọng lớn (Performance & Scalability First):**
   - Mọi danh sách dữ liệu tiềm năng từ vài chục đến hàng nghìn bản ghi phải sử dụng **Virtual Scroll (`VirtualDataTable`)** để duy trì 60 FPS, không render DOM thừa.
   - Body sở hữu thanh cuộn riêng (`overflow: hidden` ở layout ngoài, bảng tự scroll); tuyệt đối không để cuộn kép toàn trang (double scrollbar).
2. **Nhất quán về Cấu trúc & Tương tác (Structural Consistency):**
   - Tất cả các trang quản trị tuân thủ mô hình **4 tầng cố định**: Header (Tabs & Hành động trang) → Toolbar (Tìm kiếm & Bộ lọc linh hoạt) → Data Canvas (Bảng dữ liệu/Cây thư mục) → Status Footer (Thông tin tóm tắt & Phân trang).
3. **Màu sắc & Phân cấp Thị giác Tinh tế (Visual Elegance & Dark Mode Support):**
   - Không sử dụng màu sắc thuần thô ráp (plain red/blue/green).
   - Màu chủ đạo (Primary Accent): **Emerald** (`emerald-600` / `emerald-700`).
   - Thanh điều hướng (Sidebar Theme): Mặc định là **Xám Slate hiện đại** (`#1e293b` / dark: `#0f172a`), thay thế màu xanh lục cũ; hỗ trợ người dùng tự do cá nhân hóa hoặc chọn mã màu tùy ý trong Cài đặt tài khoản (`/app/settings`).
   - Màu nền bề mặt (Surfaces): Nền trắng sáng tinh gọn (`bg-white`) / Slate tối sâu (`bg-slate-950`).
   - Đường viền (Borders): 1px Slate siêu mảnh (`border-slate-200 dark:border-slate-800`).
   - Bán kính bo góc (Border Radius): 6px – 8px (`rounded-lg`), không bo tròn quá đà.
   - Hỗ trợ toàn diện và đồng nhất 100% chế độ Sáng / Tối (Dark Mode).
4. **Dữ liệu bảng Thuần văn bản (Strict Plain Text Data Table):**
   - Data Table tuyệt đối **không dùng tag/badge/pill**, **không có cột action nội tuyến**, và **không có icon** trong ô bảng. Dữ liệu bảng hiển thị dạng text thuần tuý (Plain Text), rõ ràng, dễ quét nhanh, không gây rối mắt và cho phép bôi đen copy dễ dàng. Mọi thao tác xử lý được quy về Modal chi tiết (`onOpen`) hoặc thanh thao tác hàng loạt trên Toolbar.

---

## 2. Mô hình Bố cục Chuẩn 4 Tầng (The 4-Layer Layout Architecture)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TẦNG 1: HEADER & GLOBAL ACTIONS                                                        │
│ [ Tabs điều hướng ] (VD: Tài khoản người dùng | Nhóm quyền)         [ + Thêm mới ]     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 2: TOOLBAR TÌM KIẾM & BỘ LỌC THUẦN TÚY                                           │
│ [ 🔍 Tìm kiếm... ] [🔍] [Lọc Dept ▼] [Lọc Role ▼] [⚙ Lọc+] [↺ Xóa lọc]                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 3: DATA CANVAS (VIRTUAL DATA TABLE - PURE PLAIN TEXT)                             │
│ ┌───┬──────────────────────┬─────────────┬─────────────┬──────────────┬──────────────┐ │
│ │ # │ Cột chính (Link)     │ Phân loại   │ Nhóm quyền  │ Trạng thái   │ Metadata     │ │
│ ├───┼──────────────────────┼─────────────┼─────────────┼──────────────┼──────────────┤ │
│ │ 1 │ nguyen_van_a         │ Kỹ thuật    │ Operator    │ Hoạt động    │ 22/10/2026   │ │
│ │ 2 │ tran_thi_b           │ Đóng gói    │ Inspector   │ Đã khóa      │ 21/10/2026   │ │
│ └───┴──────────────────────┴─────────────┴─────────────┴──────────────┴──────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 4: STATUS FOOTER (TÁC VỤ BẢNG, TÓM TẮT & PHÂN TRANG - H-8 SLIM)                  │
│ Quản lý người dùng · 1,420 bản ghi · Đã chọn: 2  [⬇ Xuất] [⬆ Nhập] [▤ Cột] | [20 dòng] Trang 1/71│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Chi tiết các tầng:

### Tầng 1: Header & Global Actions
- **Bên trái:** Component `Tabs` thể hiện phân hệ quản trị hoặc các danh mục tab song song (tránh lặp lại thẻ `<h1>` cồng kềnh phía trên).
- **Bên phải (`management-actions`):**
  - Khi **chưa có chọn dòng**: Hiển thị nút hành động chính (Primary Button: ví dụ "Thêm tài khoản", "Tạo câu hỏi mới").
  - Khi **đang có chọn dòng (`selected.length > 0`)**: Tự động chuyển đổi/hiển thị thêm cụm **Bulk Actions Toolbar** (VD: "Khóa (2)", "Mở khóa (2)", "Xóa (2)") kèm nút "Bỏ chọn" nhanh.

### Tầng 2: Toolbar Tìm Kiếm & Bộ Lọc Thuần Túy
- Tầng 2 được tinh gọn 100% chỉ phục vụ tra cứu và lọc dữ liệu (không chứa các nút tác vụ bảng như Xuất/Nhập/Cài đặt cột để tránh rối thanh công cụ):
  1. `SearchInput`: Ô tìm kiếm từ khóa kích thước `size="sm"` (h-8), có placeholder cụ thể (VD: "Tìm tài khoản, tên, email, vị trí…"), hỗ trợ Enter để tìm và icon xóa nhanh.
  2. Nút bấm Kính lúp (h-8 w-8): Cho phép click chuột để kích hoạt tìm kiếm tức thì.
  3. Các dropdown bộ lọc đang bật (`Select`): Chiều rộng chuẩn `w-40` đến `w-44`, hỗ trợ tìm kiếm trong dropdown (`searchable`).
  4. `FilterToggleMenu`: Icon-only menu cho phép người dùng tùy ý tick chọn bật/tắt các trường lọc theo nhu cầu cá nhân hóa (lưu vào `IndexedDB` hoặc `localStorage`).
  5. Nút Khôi phục bộ lọc (`RotateCcw`): Chỉ hiển thị khi có bộ lọc hoặc từ khóa đang active, click để reset trạng thái sạch sẽ.

### Tầng 3: Data Canvas (VirtualDataTable)
- Sử dụng component `VirtualDataTable` tối ưu cao cấp với các tiêu chuẩn chống lỗi hiển thị (Anti-Glitch & Perfect Alignment):
  - **Khóa kích thước cột Pixel tuyệt đối (Deterministic Exact-Pixel Grid Tracks):** Mọi cột trong header và từng dòng virtualized đều dùng chung chuỗi `grid-template-columns` định dạng pixel (ví dụ: `40px 220px 360px 180px...`). Cột co dãn linh hoạt (`name` hoặc `flex`) được tính toán pixel dựa trên chiều rộng thực tế của viewport trừ đi các cột cố định. **Tuyệt đối không dùng `1fr` phân tán** vì nội dung cell dài ở một dòng sẽ khiến CSS Grid tự động nới rộng track riêng của dòng đó, làm lệch hoàn toàn các cột còn lại so với Header!
  - **Chống lỗi lộn xộn thứ tự cột (No Accidental Drag & Drop):** Không đặt thuộc tính `draggable` trên toàn bộ ô tiêu đề cột. Mọi thao tác sắp xếp thứ tự cột được điều khiển an toàn, có chủ đích thông qua Menu Tùy biến cột (`Columns3`) bằng nút 🔼 / 🔽.
  - **Cơ chế tự sửa lỗi (Self-Healing Column Order):** Tự động lọc bỏ các mã cột rác/cũ trong cache `localStorage` và `IndexedDB`, luôn đồng bộ với định nghĩa cột mới nhất từ code.
  - **Nút "Khôi phục bố cục mặc định" (Reset Layout):** Tích hợp sẵn trong menu cột, cho phép xóa cache và đưa bảng về trạng thái thiết kế ban đầu chỉ với 1 click.
  - **Bảo vệ hiển thị ô (Safe Cell Rendering & Overflow Clipping):** Mọi cell đều có `min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap` và bọc trong khối an toàn để nếu code `renderCell` phát sinh ngoại lệ thì dòng đó vẫn không bị vỡ layout.
  - Header sticky 36px, viền dưới 1px slate.
  - Chiều cao dòng chuẩn 44px (có thể cấu hình 36–64px theo cá nhân hóa).
  - Cột Resizable: Người dùng có thể kéo thả thay đổi độ rộng cột mượt mà, lưu vào preferences.
  - Sắp xếp cột (`onSort`): Click trực tiếp vào tiêu đề cột để đảo chiều sort (tăng/giảm).
  - **Multi-select Checkbox & Cột STT Tự Động (Dual-State Row Number & Select):** Cột đầu tiên 44px cố định. Ở trạng thái bình thường, hiển thị Số Thứ Tự (STT) tự động dạng font-mono rõ nét, gọn gàng, tính chuẩn xác theo phân trang (`(page - 1) * pageSize + index + 1`). Khi rê chuột (hover) vào dòng hoặc khi dòng được tick chọn (selected / click), số STT tự động ẩn đi và hiển thị checkbox chọn dòng. Header hiển thị ký tự `#` và tự động hiển thị master checkbox 'Chọn tất cả' khi hover hoặc khi có dòng đang được chọn.

### Tầng 4: Status Footer (Quy Chuẩn Toàn Diện Với `TableStatusFooter`)
- **Chiều cao tối ưu (Slim Height):** Giảm từ 38px xuống chuẩn **`h-8` (`min-h-[32px] px-3 py-0`)**, thanh thoát, không chiếm dụng không gian hiển thị của Data Canvas.
- **Bên trái (Tóm tắt thông tin & định danh):**
  - **Tên trang / Phân hệ:** In đậm (`font-semibold text-slate-800 dark:text-slate-100`, VD: `Quản lý người dùng`, `Ngân hàng câu hỏi`, `Danh mục hệ thống`).
  - Dấu chấm ngăn cách (`·`).
  - **Tổng số lượng bản ghi:** `{totalCount.toLocaleString('vi-VN')} {unit}` (VD: `1,420 tài khoản`, `850 câu hỏi`).
  - **Số lượng đã chọn:** Hiển thị khi `selectedCount > 0` với màu emerald (`· Đã chọn: 2`).
- **Bên phải (Tác vụ bảng mặc định & Điều hướng phân trang):**
  - **3 Tác vụ bảng mặc định (Default Table Actions):**
    1. **Xuất dữ liệu (`Download` icon + Text):** Kích hoạt modal xuất file Excel/CSV/JSON.
    2. **Nhập dữ liệu (`Upload` icon + Text):** Kích hoạt modal nhập dữ liệu (nếu có quyền).
    3. **Cài đặt cột (`Columns3` icon + Text):** Mở popup tùy chỉnh ẩn/hiện và sắp xếp thứ tự cột (bật menu mở ngược lên trên `bottom-full mb-1.5` để không bị che khuất).
  - **Quy tắc Hover Tương tác Tầng 4:**
    > [!IMPORTANT]
    > **Hover vào chỉ nổi màu chữ, KHÔNG CÓ BACKGROUND (No bg):**
    > Toàn bộ các action (Xuất, Nhập, Cài đặt cột) và các nút phân trang (Trước, Sau, Page Size select) ở Status Footer sử dụng style trong suốt:
    > `bg-transparent hover:bg-transparent border-0 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors cursor-pointer`.
    > Tuyệt đối không thêm hộp nền (background container) hay bo tròn nền khi rê chuột vào!
  - **Ngăn cách:** Ký tự gạch đứng mờ `|` (`text-slate-300 dark:text-slate-700`).
  - **Cụm phân trang:**
    - Dropdown chọn số dòng mỗi trang (`20 dòng`, `50 dòng`, `100 dòng`) không viền, nền trong suốt.
    - Nút "Trước" (ghost, text-only hover, disabled mờ 30% khi ở trang đầu).
    - Chỉ số phân trang: `Trang {page}/{totalPages}`.
    - Nút "Sau" (ghost, text-only hover, disabled mờ 30% khi ở trang cuối).

---

## 3. Quy chuẩn Hiển thị Dữ liệu Ô Bảng (Strict Plain Text Standard)

> [!IMPORTANT]
> **3 QUY TẮC BẤT DI BẤT DỊCH TRONG DATA TABLE:**
> 1. **TUYỆT ĐỐI KHÔNG DÙNG TAG / BADGE / PILL:** Không dùng background thẻ, bo góc, border màu mè. Toàn bộ ô bảng hiển thị dưới dạng văn bản thuần túy (Plain Text), rõ ràng, dễ đọc, dễ sao chép (copyable).
> 2. **TUYỆT ĐỐI KHÔNG CÓ CỘT THAO TÁC / NÚT ACTION TRONG BẢNG:** Không bao giờ tạo cột `Thao tác` (actions) hay nhét các nút Sửa / Xóa / Khóa vào trong từng dòng bảng làm rác giao diện. Mọi thao tác được thực hiện tập trung qua:
>    - Click dòng để mở Modal chi tiết & chỉnh sửa (`onOpen`).
>    - Chọn checkbox để dùng thanh tác vụ hàng loạt (Bulk Actions Toolbar) ở Tầng 1.
> 3. **TUYỆT ĐỐI KHÔNG DÙNG ICON TRONG Ô CELL:** Không đặt icon vào ô dữ liệu, giữ bảng dữ liệu chuẩn phong cách hệ thống MES tối giản, sạch sẽ và hiệu năng cao nhất.

### Bảng chuẩn định dạng Plain Text cho Data Table:

| Kiểu dữ liệu | Quy chuẩn hiển thị | Ví dụ thực tế | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Định danh / Tên chính** | Clickable text link, font-medium, hover underline | `nguyen_van_a` | Click để mở Modal chi tiết (`onOpen`) |
| **Trạng thái tài khoản/đối tượng** | Text thuần túy, không viền, không nền thẻ | `Hoạt động`, `Đã khóa`, `Chờ duyệt` | Không dùng tag/badge/pill |
| **Phân nhóm / Danh mục** | Chuỗi văn bản ngăn cách bằng dấu phẩy | `Quản trị viên, Vận hành MES` | `row.groups.map(g => g.label).join(', ')` |
| **Thời gian (CreatedAt,...)** | Chuỗi format chuẩn tiếng Việt `dd/mm/yyyy hh:mm` | `22/10/2026 14:30` | Gọi hàm `formatDate(value)` |
| **Dữ liệu trống (Null/Empty)**| Ký tự gạch ngang dài `—` hoặc chữ nghiêng | `—` hoặc `Chưa gán` | Màu muted text (`text-slate-400 dark:text-slate-500`) |

Mọi hàm hiển thị cell ưu tiên dùng `formatCell(column, row)` trả về trực tiếp chuỗi string hoặc text node đơn giản.

---

---

## 4. Quy Chuẩn Giao Diện Thêm Mới & Chỉnh Sửa Dữ Liệu (Add/Edit Data Standard: In-Screen Workspace)

> [!IMPORTANT]
> **QUY TẮC CỐT LÕI: KHÔNG DÙNG MODAL BAY Ở GIỮA MÀN HÌNH ĐỂ THÊM/SỬA DỮ LIỆU NGHIỆP VỤ!**
> Tuyệt đối **không mở pop-up dialog trôi nổi ở giữa màn hình với lớp backdrop xám/đen che mờ trang** (Centered Modal) khi tạo mới hoặc chỉnh sửa dữ liệu quản trị.
> Toàn bộ thao tác thêm mới (`?item=new`) hoặc xem/chỉnh sửa chi tiết (`?item=...`) phải mở **NGAY TẠI CHỖ (In-Screen Workspace)** trên chính không gian làm việc của màn hình đó.

### 4.1. Tại sao phải dùng In-Screen Workspace thay vì Centered Modal?

```
❌ KHÔNG DÙNG: MODAL POP-UP TRÔI NỔI Ở GIỮA     ✅ QUY CHUẨN BẮT BUỘC: IN-SCREEN WORKSPACE (MỞ TẠI CHỖ)
┌───────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│ SIDEBAR │ TOPBAR                          │   │ SIDEBAR │ TOPBAR                          │
│         ├─────────────────────────────────┤   │         ├─────────────────────────────────┤
│         │ [ Nền bị phủ mờ xám / đen ]     │   │         │ ← Quay lại | Chi tiết nhóm   LƯU│
│         │        ┌──────────────┐         │   │         ├───────────────┬─────────────────┤
│         │        │ MODAL POPUP  │         │   │         │ CỘT TRÁI      │ CỘT PHẢI        │
│         │        │ Bị gò bó     │         │   │         │ (Thông tin)   │ (Canvas dữ liệu)│
│         │        │ chật hẹp     │         │   │         │ - Mã nhóm     │ - Cây phân quyền│
│         │        │ ở giữa       │         │   │         │ - Tên nhóm    │ - Bảng thành    │
│         │        └──────────────┘         │   │         │ - Trạng thái  │   viên liên kết │
│         │ Không gian thừa bị lãng phí     │   │         │ - Tóm tắt     │ - Tìm kiếm & lọc│
└─────────┴─────────────────────────────────┘   └─────────┴───────────────┴─────────────────┘
```

| Tiêu chí | ❌ Modal Pop-up trôi nổi giữa màn hình | ✅ In-Screen Workspace (Mở tại chỗ) |
| :--- | :--- | :--- |
| **Vị trí hiển thị** | Bay lơ lửng ở trung tâm, lớp backdrop đen/xám phủ mờ toàn trang làm mất ngữ cảnh. | **Gắn liền tại chỗ**, mở trực tiếp trong khung làm việc (`ManagementFrame`) của màn hình đó. |
| **Không gian làm việc** | Bị gò bó trong khung hộp thoại (600px–800px), dễ phát sinh cuộn kép. | **Tận dụng 100% diện tích** màn hình theo cả chiều rộng và chiều cao. |
| **Dữ liệu phức tạp** | Rất khó nhét cây phân cấp, bảng tài khoản, quan hệ liên kết nhiều chiều. | Chia 2 cột hoàn hảo: Cột trái form cơ bản, Cột phải là Canvas bảng/cây dữ liệu lớn. |
| **Điều hướng & URL** | URL không đổi; nếu F5 hoặc bấm Back trình duyệt sẽ mất sạch dữ liệu đang nhập. | **Đồng bộ vào URL** (`?tab=...&group=new` hoặc `?group=admin`), F5 không mất trang, hỗ trợ Back/Forward. |
| **Cảm giác người dùng** | Gián đoạn mạch làm việc, cảm giác như một cửa sổ phụ tạm bợ. | Trải nghiệm liền mạch, chuyên nghiệp, vững chãi như một màn hình làm việc thực thụ. |

---

### 4.2. Bố Cục Chuẩn Màn Hình Thêm & Chỉnh Sửa (2-Column Split Layout)

Màn hình sử dụng `ManagementFrame` với `scrollableContent={false}` để khóa cuộn kép toàn trang:

#### 1. Thanh Header Điều Hướng & Hành Động (Top Header Bar)
- **Cụm bên trái:**
  1. **Nút Quay lại (Back Button):** `variant="ghost"`, size `sm`, icon `ArrowLeft`, nhãn `"Quay lại"`. Bấm để quay về danh sách cha.
  2. **Vạch ngăn cách:** Đường kẻ dọc mảnh `h-6 w-px bg-slate-200 dark:bg-slate-800`.
  3. **Tiêu đề trang:** `"Tạo [tên thực thể] mới"` khi tạo mới, hoặc Tên bản ghi hiện tại khi chỉnh sửa.
  4. **Dòng trạng thái tóm tắt (Metadata Summary):** Cỡ chữ 12px nằm dưới tiêu đề, các thông số ngăn cách bằng dấu chấm giữa `·`:
     - Mã thực thể: `@ma_dinh_danh` (font-mono).
     - Các chỉ số quan trọng (VD: `12 chức năng · 38 thao tác · 5 thành viên`).
     - Trạng thái: `Hoạt động` (màu emerald) / `Tạm ngưng` (màu slate-400).
     - Cờ chưa lưu: Hiển thị chữ nghiêng màu hổ phách `(Có thay đổi chưa lưu)` khi form bị chỉnh sửa (`isDirty`).
- **Cụm bên phải (Thanh nút hành động):**
  1. **Nút Hủy:** `variant="outline"`, size `sm`.
  2. **Nút Xóa:** Chỉ hiển thị khi chỉnh sửa bản ghi tùy chỉnh (không áp dụng cho bản ghi mặc định của hệ thống) và user có quyền xóa. Màu chữ `text-rose-600`.
  3. **Nút Lưu / Tạo mới:** `variant="primary"`, size `sm`. Nhãn `"Tạo [thực thể]"` hoặc `"Lưu thay đổi"`.
     - **Quy tắc Disabled:** Vô hiệu hóa (`disabled`) khi form chưa có thay đổi nào (`!isDirty`) hoặc đang gọi API (`busy`).
     - **Quy tắc Loading (Cực kỳ quan trọng):** Tuyệt đối **không chèn icon xoay / spinner** làm phình to nút hay xô lệch thanh header; chỉ dùng trạng thái disabled mờ nhẹ để chống double-click.

#### 2. Cột Trái: Thông Tin Cơ Bản (Left Form Sidebar - Cố định 360px)
- **Kích thước:** Chiều rộng cố định `w-[360px]` trên màn hình lớn (`lg:grid-cols-[360px_minmax(0,1fr)]`), nền nhạt `bg-slate-50/40 dark:bg-slate-900/20`, viền phải `border-r border-slate-200 dark:border-slate-800`.
- **Cấu trúc trường nhập:**
  - Tiêu đề nhóm in hoa, cỡ chữ 11px: `THÔNG TIN CƠ BẢN`.
  - Thiết kế input dạng phẳng không bo viền thô (outline tối giản), tiêu đề trường ở trên, ô nhập ở dưới.
  - **Mã định danh (Key / Code):**
    - Khi tạo mới: Tự động chuẩn hóa dạng `snake_case` (chữ thường, không dấu, ngăn cách bằng `_`) theo tên người dùng gõ, nhưng vẫn cho phép sửa thủ công.
    - Khi chỉnh sửa: Hiển thị cố định dạng text `@key` (không cho phép sửa mã định danh của bản ghi đã tồn tại).
  - **Trạng thái:** Dùng dropdown `Select` phẳng (Hoạt động / Tạm ngưng).
- **Khối Tóm tắt cấu hình (Configuration Summary):** Đặt ở cuối cột trái, hiển thị tổng hợp nhanh các chỉ số định lượng của dữ liệu bên cột phải (giúp nắm bắt tổng thể mà không cần duyệt hết các tab).

#### 3. Cột Phải: Không Gian Dữ Liệu Chuyên Sâu (Right Data Canvas)
- **Đúng phạm vi trách nhiệm dữ liệu (Data Scoping):**
  - Màn hình cấu hình thực thể nào chỉ tập trung vào đúng thuộc tính và danh mục trực thuộc thực thể đó.
  - *Ví dụ:* Màn hình Đăng ký/Chỉnh sửa Chức năng (Module) chỉ tập trung cấu hình mã, tên, trạng thái và **Danh mục thao tác** của chức năng đó. Tuyệt đối không kéo các dữ liệu quan hệ chéo dư thừa (như danh sách "Nhóm quyền có hiệu lực") vào màn hình này vì việc phân bổ nhóm quyền thuộc về tab Quản lý nhóm quyền.
- **Quy chuẩn Danh mục lựa chọn Thao tác / Quyền hạn (Action / Checkbox List Standard):**
  - ❌ **Không dùng lưới thẻ card (card-grid 3 cột):** Các ô card to chiếm diện tích lớn, viền dày khiến giao diện bị vụn vặt và khó rà soát.
  - ✅ **Dùng Bảng dữ liệu phẳng (Table Structure):**
    - Cột 1: **Checkbox** (Hỗ trợ checkbox "Chọn tất cả" trên `thead`).
    - Cột 2: **Tên thao tác** (In đậm rõ ràng, tiếng Việt chuẩn).
    - Cột 3: **Mã kỹ thuật** (Dạng `font-mono @action`).
    - Cột 4: **Phân nhóm nghiệp vụ** (VD: *Dữ liệu cơ bản, Vào / Ra dữ liệu, Quy trình & Quản trị, Nghiệp vụ đào tạo*).
    - Cột 5: **Mô tả quyền hạn** (Ý nghĩa thực thi khi được cấp phép).
    - Cột 6: **Ràng buộc** (Nhãn text `[Bắt buộc]` màu hổ phách cho các quyền cốt lõi, hoặc `Tùy chọn`).
  - **Thanh công cụ danh mục (Toolbar):**
    - Ô tìm kiếm nhanh thao tác / mã kỹ thuật.
    - Bộ đếm số lượng thao tác đã kích hoạt / tổng số (`Đã kích hoạt X / Y thao tác`).
    - Nhóm nút thao tác hàng loạt: *Chỉ chọn Xem*, *Mặc định (CRUD)*, *Chọn tất cả*, *Bỏ chọn*.
    - Ô thêm thao tác mở rộng tùy chỉnh ở chân bảng (cho phép admin bổ sung action mới dạng `snake_case`).
  - Các tab chuyển đổi ngữ cảnh (VD: *Phân quyền chức năng*, *Thành viên nhóm*) đi kèm số lượng badge nhỏ trong ngoặc đơn.
  - Tab đang chọn có viền gạch chân màu `border-emerald-600` và chữ `font-semibold text-emerald-700`.
  - Phía bên phải thanh tab là dòng chữ hướng dẫn ngắn gọn cho người dùng.
- **Sub-Toolbar Nội bộ:**
  - Ô tìm kiếm nhanh `SearchInput`, dropdown lọc phân loại, nút xóa bộ lọc `RotateCcw`.
  - Hiển thị số lượng bản ghi đã chọn (VD: `Đã chọn 5 / 48 tài khoản`).
- **Data Table / Hierarchy Canvas:**
  - Sử dụng bảng cuộn ảo `VirtualDataTable` với checkbox selection.
  - Đảm bảo hiển thị dạng plain text chuẩn (không tag/badge lòe loẹt, không icon ô cell).

---

### 4.3. Quy Chuẩn Vị Trí & Hình Thức Thông Báo (Notification Placement)

| Loại thông báo | Vị trí hiển thị | Hình thức & Thiết kế UI | Khi nào kích hoạt? |
| :--- | :--- | :--- | :--- |
| **Toast thao tác thành công** | **Góc dưới bên phải (`bottom-right`)** | **Compact Pill (Viên thuốc Dynamic Island)**: 1 dòng duy nhất gồm `[Icon ✓] [Nội dung thông báo]`, nền bo tròn viên thuốc, hiệu ứng nảy nhẹ (`bounce: 0.2`, `preset: 'smooth'`). Không dùng header 2 tầng, không có thanh progress bar. | Lưu dữ liệu thành công, cập nhật trạng thái, xóa thành công. |
| **Cảnh báo lỗi Form / Lỗi API** | **Dưới thanh Header trang** | **Inline Banner**: Nằm ngang toàn bộ chiều rộng trang, nền hồng nhạt `bg-rose-50 dark:bg-rose-950/40`, viền dưới `border-rose-200`, chữ đỏ `text-xs text-rose-700`. | Khi bấm Lưu bị lỗi thiếu trường bắt buộc hoặc backend trả về lỗi (400/409/500). |
| **Cảnh báo Dữ liệu chưa lưu** | **Header & Modal xác nhận** | 1. Nhãn text nghiêng màu hổ phách `(Có thay đổi chưa lưu)` trên header.<br>2. **Modal Xác nhận Rời khỏi**: Nổi giữa màn hình khi người dùng bấm Hủy/Quay lại/Esc mà dữ liệu đang bẩn (`isDirty`). | Khi có thay đổi chưa lưu và người dùng định thoát trang. |

---

### 4.4. Quy Chuẩn Hiệu Năng & Bảo Toàn Dữ Liệu (Performance & Dirty State)

1. **Cơ chế Dirty Checking (Bảo vệ dữ liệu chưa lưu):**
   - Lưu snapshot ban đầu của dữ liệu khi vừa nạp trang (`useRef`).
   - Tự động so sánh sâu (deep compare) giữa dữ liệu nháp hiện tại và snapshot ban đầu để kích hoạt cờ `isDirty`.
   - Nút **Lưu thay đổi** chỉ sáng khi `isDirty === true` (tránh gửi request vô nghĩa lên server).
   - Đăng ký sự kiện `beforeunload` để ngăn người dùng vô tình F5 hoặc tắt tab trình duyệt khi chưa lưu.
   - Hỗ trợ phím tắt `Escape` để hủy/thoát an toàn.
2. **Quy tắc gọi API khi Lưu (Tuyệt đối không làm nặng Server):**
   - **Không gọi hàm tải toàn bộ dữ liệu (`load()`) sau khi Lưu:**
     - Chỉ gọi đúng API cập nhật của thực thể đó.
     - Sau khi lưu, chỉ gọi 1 API lấy phiên bản mới nhất (`RowVersion`) của chính thực thể đó để phục vụ cho các lần lưu tiếp theo (tránh lỗi xung đột 409).
     - Không kéo lại toàn bộ bảng người dùng hay danh mục lớn khi chỉ đang lưu 1 nhóm quyền.
   - **Tắt Polling/Background Query khi đang mở In-Screen Workspace:**
     - Các effect tìm kiếm/phân trang ngoài bảng cha phải kiểm tra điều kiện `if (activeDraft) return;` để không tự động bắn request ngầm khi người dùng đang ở trong màn hình chi tiết.

### 4.5. QUY TẮC BẮT BUỘC VỀ VỊ TRÍ NÚT ACTION TRÊN TỪNG TAB CỦA BẢNG (Action Placement on Tabs & Tables)

> [!CAUTION]
> **QUY TẮC CỐT LÕI: TOÀN BỘ NÚT ACTION CỦA TỪNG TAB BẢNG PHẢI ĐẶT TRÊN HEADER ACTION BAR!**
> 
> 1. **Vị trí bắt buộc:**
>    - Khi màn hình chia 2 cột (Cột 1: Thông tin cơ bản, Cột 2: Canvas các Tab bảng dữ liệu như Checklist, Báo cáo Worklog, Hồ sơ Tài liệu, Lịch sử...):
>    - **Toàn bộ nút hành động nghiệp vụ của tab đó (Thêm dòng, Xóa dòng, Nghiệm thu tất cả, Lưu bảng, Báo cáo kết quả, Tải lên tài liệu, Tải toàn bộ,...) PHẢI ĐẶT Ở DẢI ACTION BÊN PHẢI CỦA HEADER TABS (Canvas Tab Navigation Bar).**
> 
> 2. **Tuyệt đối cấm:**
>    - **KHÔNG ĐƯỢC** đặt dải nút action trôi nổi bên trong thân bảng (table body), trên đầu lưới dữ liệu hoặc chèn ngang làm hẹp chiều cao của bảng.
>    - Bảng dữ liệu bên dưới phải là **Full Edge-to-Edge flat**, tự cuộn độc lập (`overflow: auto`), tận dụng tối đa 100% chiều cao hiển thị.
> 
> 3. **Cơ chế chuyển đổi nút Action động theo Tab đang chọn:**
>    - Tab `checklist`: Hiển thị các nút `[Khôi phục]`, `[Xóa dòng]`, `[Nghiệm thu tất cả]`, `[Thêm dòng]`, `[Lưu bảng kiểm tra]`.
>    - Tab `worklog`: Hiển thị nút `[Báo cáo kết quả & Gửi duyệt]`.
>    - Tab `documents` / `attachments`: Hiển thị các nút `[Tải cả thư mục / Tải toàn bộ (.zip)]`, `[Chọn tệp tin / Tải lên tài liệu]`.
>    - Các component bảng con (`TaskChecklistTable`, `TaskDocumentsTable`, `TaskAttachmentsTab`) phải hỗ trợ prop `hideActions={true}` / `hideToolbar={true}` và `useImperativeHandle` ref để Header điều khiển tập trung.

---

## 5. Quy chuẩn Hộp thoại Thứ Cấp (Secondary Modals & Dialogs)

> [!NOTE]
> Modal truyền thống chỉ được dùng cho các tác vụ thứ cấp diễn ra nhanh chóng (Xác nhận xóa, Cảnh báo chưa lưu, Tùy biến phân quyền chi tiết cho 1 dòng `AdjustPermissionModal`). Không dùng để làm màn hình chính thêm/sửa thực thể lớn.

### 5.1. Phân loại Kích thước & Mật độ
- **`density="compact"`**: Dùng cho cấu hình cột bảng, chọn nhanh phân loại, xác nhận thao tác ngắn (Lock, Unlock, Reset mật khẩu, Xác nhận xóa).
- **`density="comfortable"`**: Dùng cho Form chỉnh sửa chi tiết đơn mục (VD: `AdjustPermissionModal`, `ModuleDetailModal`).
  - Chiều rộng: `size="lg"` (680px) hoặc `size="2xl"` / `maxWidth="780px"`.
  - Chiều cao: Co dãn theo nội dung (`fitContent={true}`), tối đa `calc(100vh - 32px)`.
  - Header & Footer luôn cố định (sticky); chỉ vùng nội dung `body` được cuộn nếu nội dung dài.

### 5.2. Quy chuẩn Accessibility trong Modal
- Bắt buộc có focus containment (focus trap).
- Nhấn phím `Escape` đóng modal (nếu không ở trạng thái loading/busy).
- Footer: Nút hủy/đóng luôn nằm bên trái, nút hành động chính (submit) nằm bên phải với trạng thái disabled khi busy.


---

## 6. Quy chuẩn Dropdown Bộ Lọc (`Select` Specification)

Toàn bộ các dropdown bộ lọc trong hệ thống phải tuân thủ nghiêm ngặt 8 quy tắc sau:
1. **Chiều cao Trigger:** Chuẩn 32px (`h-8`, `size="sm"`), viền `border-slate-200 dark:border-slate-700`, chữ 12px vừa vặn với toolbar.
2. **Luôn có Search Bar bên trong menu:** Dù danh sách chỉ có 2-3 phần tử, ô tìm kiếm vẫn luôn hiển thị ở đầu menu popover (`searchable={true}`).
3. **Tìm kiếm thông minh (Vietnamese Diacritics Insensitive):** Tìm kiếm không phân biệt hoa thường và không phân biệt dấu tiếng Việt (ví dụ: gõ "ky thuat" vẫn tìm thấy "Kỹ thuật").
4. **Tự động Focus:** Khi menu mở ra, con trỏ chuột tự động focus vào ô search.
5. **Tùy chọn Reset ("Tất cả ..."):** Luôn có dòng đầu tiên là "Tất cả [Tên trường]" mang giá trị rỗng (`value: ''`) để xóa lọc nhanh.
6. **Điều hướng bàn phím:** Hỗ trợ phím Mũi tên Lên/Xuống để duyệt danh sách, phím `Enter` để chọn, phím `Escape` để đóng popover.
7. **Portal & Tự định vị:** Menu mở ra bằng React Portal, tính toán vị trí hiển thị (lên hoặc xuống) tránh bị che khuất bởi cạnh màn hình hoặc vùng cuộn của table.
8. **Trạng thái chọn rõ ràng:** Mục đang chọn có dấu tích `Check` màu xanh và nền highlight nhẹ.

---

## 7. Xử lý Trạng thái Trống, Tải trang & Thông báo (States & Feedback)

### 7.1. Trạng thái Đang tải (Loading States)
- Khi tải toàn trang lần đầu: Dùng `LoadingPage` với thông điệp rõ ràng, không giật màn hình.
- Khi làm mới dữ liệu nền (Filter/Page change): Giữ nguyên khung bảng, hiển thị loader nhẹ nhàng trên lớp phủ của `VirtualDataTable` mà không phá vỡ chiều cao viewport.
- Khi Submit form/Button: Disable nút mờ nhẹ chống double-click; **tuyệt đối không chèn icon xoay bên trong nút** gây phình to và nhảy layout.

### 7.2. Trạng thái Trống (Empty Search / No Data State)
- Khi tìm kiếm hoặc áp dụng bộ lọc không trả về kết quả nào:
  - Hiển thị icon kính lúp mờ hoặc folder trống.
  - Dòng thông điệp rõ ràng: `"Không tìm thấy dữ liệu phù hợp với điều kiện tìm kiếm."`
  - Kèm ngay một nút bấm **"Xóa tất cả bộ lọc"** để người dùng khôi phục dữ liệu gốc chỉ với 1 click.

### 7.3. Thông báo Toast Chuẩn (Compact Pill Dynamic Island)
- Toàn bộ hành động thành công/thất bại thông qua `notify(message, type)` từ `src/shared/lib/notify.js`.
- **Thiết kế Compact Pill (Dynamic Island)**:
  - Nằm ở góc dưới bên phải màn hình (`bottom-right`).
  - Gọn gàng trên **1 dòng duy nhất**: `[Icon trạng thái] [Nội dung thông báo]` (Không dùng tiêu đề 2 tầng cồng kềnh).
  - Không hiển thị thanh đếm ngược (Progress Bar) và không dùng nút đóng to xù.
  - Hiệu ứng nảy nhẹ tự nhiên (`bounce: 0.2`, `preset: 'smooth'`), tự động đóng sau 3.0–4.5 giây.
  - Tự động đồng bộ màu sắc mượt mà giữa Light Mode và Dark Mode.
- Phân loại:
  - `success`: Hành động hoàn thành (VD: "Đã cập nhật nhóm quyền thành công.").
  - `warning`: Cảnh báo thao tác (VD: "Mật khẩu mới cần tối thiểu 12 ký tự.").
  - `error`: Lỗi xử lý backend (VD: "Không thể khóa tài khoản quản trị viên.").
- Tránh thông báo mơ hồ; không hiển thị raw stack trace của server cho người dùng.

---

## 8. Khung Code Mẫu Chuẩn Cho Một Màn Hình Mới

Dưới đây là mẫu khung code hoàn chỉnh (Boilerplate) khi lập trình bất kỳ màn hình quản trị mới nào:

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import ManagementFrame from '@/shared/ui/ManagementFrame';
import VirtualDataTable from '@/shared/ui/VirtualDataTable';
import Select from '@/shared/ui/Select';
import Button from '@/shared/ui/Button';
import Tabs from '@/shared/ui/Tabs';
import SearchInput from '@/shared/ui/SearchInput';
import FilterToggleMenu from '@/shared/ui/FilterToggleMenu';
import { useMenuPreferences } from '@/shared/lib/tablePreferences';
import { notify } from '@/shared/lib/notify';
import { Search, RotateCcw, Download, Plus } from 'lucide-react';

export default function EntityManagementPage({ service }) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // 1. Quản lý Preferences bộ lọc & phân trang tự động lưu
  const [menuPreferences, setMenuPreferences, preferencesReady] = useMenuPreferences('admin-entity:query', {
    search: '',
    filters: {},
    pageSize: 20,
    sort: { key: 'id', direction: 1 },
  });

  const search = menuPreferences.search || '';
  const [searchDraft, setSearchDraft] = useState(search);
  const filters = menuPreferences.filters || {};
  const pageSize = menuPreferences.pageSize || 20;
  const sort = menuPreferences.sort || { key: 'id', direction: 1 };

  // 2. Tải dữ liệu
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await service.list({ search, filters, page, pageSize, sort });
      setItems(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      notify(err.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preferencesReady) loadData();
  }, [preferencesReady, search, filters, pageSize, sort, page]);

  // 3. Render giao diện chuẩn 4 tầng
  return (
    <ManagementFrame
      header={
        <>
          <Tabs tabs={[{ id: 'main', label: 'Quản lý Thực thể' }]} activeTab="main" />
          <div className="management-actions flex items-center gap-2">
            {selected.length > 0 ? (
              <Button size="sm" variant="outline" onClick={() => handleBulkAction(selected)}>
                Thao tác ({selected.length})
              </Button>
            ) : (
              <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
                Thêm mới
              </Button>
            )}
          </div>
        </>
      }
      filters={
        <>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="w-64 max-w-full">
              <SearchInput
                size="sm"
                value={searchDraft}
                onChange={e => setSearchDraft(typeof e === 'string' ? e : e?.target?.value)}
                onKeyDown={e => e.key === 'Enter' && setMenuPreferences(p => ({ ...p, search: searchDraft }))}
                placeholder="Tìm kiếm..."
              />
            </div>
            <button
              type="button"
              onClick={() => setMenuPreferences(p => ({ ...p, search: searchDraft }))}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <Search size={15} />
            </button>
            {/* Dynamic filter controls */}
            <FilterToggleMenu columns={availableFilterFields} filters={filters} onToggle={toggleFilter} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <div id="admin-entity-column-menu" />
          </div>
        </>
      }
      status={
        <div className="contents">
          <div className="flex items-center gap-2">
            <strong className="text-slate-800 dark:text-slate-100 font-semibold">Thực thể</strong>
            <span className="text-slate-500">· {totalCount} bản ghi</span>
            {selected.length > 0 && <span className="text-emerald-600 font-medium">· Đã chọn {selected.length}</span>}
          </div>
          <div className="flex items-center gap-3">
            <Select
              size="sm"
              className="w-28"
              value={String(pageSize)}
              onChange={e => setMenuPreferences(p => ({ ...p, pageSize: Number(e.target.value) }))}
              options={[20, 50, 100].map(v => ({ value: String(v), label: `${v} dòng` }))}
            />
            {/* Nút phân trang Trước / Sau */}
          </div>
        </div>
      }
    >
      <VirtualDataTable
        columns={columns}
        rows={items}
        loading={loading}
        sort={sort}
        onSort={handleSort}
        selectedIds={selected}
        onSelectedIdsChange={setSelected}
        renderCell={renderStandardCell}
      />
    </ManagementFrame>
  );
}
```

---

## 9. Bảng Kiểm Tra Đánh Giá UI (UI Acceptance Checklist)

Trước khi nghiệm thu bất kỳ màn hình quản trị nào để đưa vào sử dụng, kỹ sư phát triển phải kiểm tra danh mục tiêu chuẩn sau:

- [ ] **Viewport & Scrolling:** Toàn bộ trang nằm vừa vặn trong màn hình, không xuất hiện thanh cuộn trình duyệt kép; chỉ có bảng hoặc modal body cuộn.
- [ ] **Add/Edit In-Screen Workspace:** Thao tác thêm mới / sửa chi tiết mở trực tiếp tại chỗ (In-Screen), tuyệt đối không dùng modal pop-up trôi nổi ở giữa màn hình; bố cục 2 cột tách biệt; có nút Quay lại (Back), đồng bộ URL query param (`?item=new` / `?item=id`).
- [ ] **Dirty State Protection:** Nút "Lưu thay đổi" chỉ bật sáng khi có thay đổi (`isDirty`); có cảnh báo thoát trang nếu dữ liệu chưa được lưu.
- [ ] **No Button Loading Spinner:** Nút submit chỉ mờ nhẹ disabled khi busy, tuyệt đối không chèn icon xoay gây nhảy kích thước hoặc lệch layout.
- [ ] **Compact Pill Toast:** Thông báo hoàn thành dạng viên thuốc Dynamic Island 1 dòng ở góc `bottom-right`, không có tiêu đề 2 tầng cồng kềnh, không có progress bar.
- [ ] **Inline Error Banner:** Thông báo lỗi form / server nằm ngang ngay dưới header bar, không che khuất các trường nhập liệu.
- [ ] **Performance & Single API Call:** Sau khi lưu, không gọi lại `load()` toàn bộ hệ thống; chỉ làm mới bản ghi liên quan và tắt background polling khi đang mở view chi tiết.
- [ ] **Dark Mode:** Kiểm tra đầy đủ giao diện ở chế độ Sáng và Tối (bảng màu Slate/Emerald hài hòa, không có text trắng trên nền trắng hoặc ngược lại).
- [ ] **Tab Table Actions on Header Only:** Toàn bộ nút action thao tác dữ liệu của từng tab bảng (Thêm dòng, Xóa dòng, Nghiệm thu tất cả, Lưu bảng, Báo cáo kết quả, Tải file, Tải cả thư mục...) PHẢI ĐẶT TRÊN HEADER ACTION BAR ngang hàng với các Tab; tuyệt đối không đặt nội bộ trong thân bảng làm thu hẹp không gian hiển thị.
- [ ] **Data Table Plain Text:** Không có tag, không có badge/pill, không có icon, không có cột action trong bảng; dữ liệu là văn bản thuần túy (Plain Text), dễ đọc, dễ sao chép; dữ liệu rỗng hiển thị `—` hoặc chữ nghiêng.
- [ ] **Thao tác hàng loạt (Bulk Actions):** Khi chọn checkbox, toolbar hiển thị số lượng được chọn kèm các nút thao tác thích hợp và nút bỏ chọn.

