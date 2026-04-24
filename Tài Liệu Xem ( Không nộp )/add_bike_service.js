const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'QuanLyPhongTro'
});

connection.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối: ' + err.stack);
        process.exit(1);
    }

    const query = `
        INSERT INTO dichvu (TenDichVu, Gia, DonViTinh, loaiThu)
        SELECT 'Phí giữ xe', 100000, 'Xe', 'Theo số lượng'
        WHERE NOT EXISTS (SELECT 1 FROM dichvu WHERE TenDichVu = 'Phí giữ xe');
    `;

    connection.query(query, (err, results) => {
        if (err) console.error('Lỗi:', err);
        else console.log('Đã thêm dịch vụ Phí giữ xe!');
        connection.end();
    });
});
