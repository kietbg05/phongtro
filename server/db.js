const mysql = require('mysql2');
require('dotenv').config();

// Cấu hình kết nối MySQL
// Lưu ý: Bạn cần thay đổi thông tin này khớp với XAMPP/MySQL của bạn
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Mặc định của XAMPP là root
    password: '',      // Mặc định của XAMPP là rỗng
    database: 'QuanLyPhongTro'
});

connection.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối CSDL: ' + err.stack);
        return;
    }
    console.log('Đã kết nối MySQL thành công với ID: ' + connection.threadId);
});

module.exports = connection;
