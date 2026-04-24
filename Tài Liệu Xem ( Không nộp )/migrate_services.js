const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'QuanLyPhongTro',
    multipleStatements: true
});

connection.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối: ' + err.stack);
        process.exit(1);
    }

    const queries = `
        -- 1. Thêm cột loaiThu nếu chưa có
        ALTER TABLE dichvu ADD COLUMN IF NOT EXISTS loaiThu VARCHAR(50) DEFAULT 'Theo phòng';
        
        -- 2. Chèn các dịch vụ mẫu nếu bảng trống
        INSERT INTO dichvu (TenDichVu, Gia, DonViTinh, loaiThu)
        SELECT 'Tiền rác', 30000, 'Tháng', 'Theo phòng'
        WHERE NOT EXISTS (SELECT 1 FROM dichvu WHERE TenDichVu = 'Tiền rác');

        INSERT INTO dichvu (TenDichVu, Gia, DonViTinh, loaiThu)
        SELECT 'Internet', 100000, 'Tháng', 'Theo phòng'
        WHERE NOT EXISTS (SELECT 1 FROM dichvu WHERE TenDichVu = 'Internet');

        INSERT INTO dichvu (TenDichVu, Gia, DonViTinh, loaiThu)
        SELECT 'Vệ sinh', 20000, 'Người', 'Theo người'
        WHERE NOT EXISTS (SELECT 1 FROM dichvu WHERE TenDichVu = 'Vệ sinh');
    `;

    connection.query(queries, (err, results) => {
        if (err) {
            console.error('Lỗi thực thi script:', err);
        } else {
            console.log('Đã cập nhật cấu trúc database và chèn dữ liệu mẫu thành công!');
        }
        connection.end();
    });
});
