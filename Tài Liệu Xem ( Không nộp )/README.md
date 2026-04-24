# Đồ Án Quản Lý Phòng Trọ - HUTECH

Hệ thống quản lý phòng trọ xây dựng bằng Node.js, Express và MySQL.

## 1. Cấu trúc thư mục
- `public/`: Chứa giao diện người dùng (HTML, CSS, JS frontend).
  - `css/style.css`: Giao diện chính (Dark Mode, Glassmorphism).
  - `js/frontend.js`: Xử lý logic gọi API và hiển thị dữ liệu.
- `server/`: Chứa mã nguồn Backend.
  - `server.js`: Định nghĩa các API và khởi chạy máy chủ.
  - `db.js`: Cấu hình kết nối MySQL.
- `database/`: Chứa các script cơ sở dữ liệu.
  - `full_export.sql`: **Dùng file này để Import vào máy mới.**

## 2. Cách cài đặt trên máy khác
1. Cài đặt **Node.js** và **XAMPP**.
2. Mở XAMPP, chạy **Apache** và **MySQL**.
3. Vào `localhost/phpmyadmin`, tạo database tên `QuanLyPhongTro`.
4. Import file `database/full_export.sql` vào database vừa tạo.
5. Mở Terminal tại thư mục dự án và chạy:
   ```bash
   npm install
   ```
6. Chạy server bằng lệnh:
   ```bash
   node server/server.js
   ```
7. Truy cập vào trình duyệt: `http://localhost:3000/login.html`

## 3. Tài khoản mặc định
- **Admin**: `admin` / `123456`
- **Người thuê mẫu**: `0987654321` / `123`

## 4. Cách chỉnh sửa tiếp tục
- Muốn sửa giao diện: Chỉnh sửa các file trong thư mục `public/`.
- Muốn thêm tính năng/API: Chỉnh sửa file `server/server.js`.
- Dự án được viết bằng mã nguồn mở đơn giản, dễ dàng mở rộng thêm các mục như "Quản lý điện nước chi tiết" hoặc "Báo cáo doanh thu".
