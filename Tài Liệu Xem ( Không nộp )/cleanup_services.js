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

    // Xóa các dịch vụ trùng tên mà CHƯA có trong hóa đơn nào
    const query = `
        DELETE d1 FROM dichvu d1
        INNER JOIN dichvu d2 
        WHERE d1.idDichVu > d2.idDichVu 
          AND d1.TenDichVu = d2.TenDichVu
          AND d1.idDichVu NOT IN (SELECT idDichVu FROM hoadondichvu);
    `;

    connection.query(query, (err, results) => {
        if (err) console.error('Lỗi dọn dẹp:', err);
        else console.log(`Đã dọn dẹp xong! Số bản ghi bị xóa: ${results.affectedRows}`);
        connection.end();
    });
});
