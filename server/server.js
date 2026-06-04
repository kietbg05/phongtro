const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { sendSms } = require('./services/smsService');
const { ensureSmsLogsTable, getSmsLogs, saveSmsLog } = require('./services/smsLogService');
const multer = require('multer');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

ensureSmsLogsTable().catch(err => {
    console.error('[SMS LOG] Không thể khởi tạo bảng sms_logs:', err.message);
});

// Cấu hình lưu trữ file cho hình ảnh phòng
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../public/img/rooms/');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép tải lên hình ảnh!'));
        }
    }
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// --- API KHU TRỌ ---
app.get('/api/khutro', (req, res) => {
    db.query('SELECT * FROM KhuTro', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/khutro/stats', (req, res) => {
    const query = `
        SELECT k.*, 
        (SELECT COUNT(*) FROM Phong WHERE idKhuTro = k.idKhuTro) as tongPhong,
        (SELECT COUNT(*) FROM Phong p JOIN HopDong hd ON p.idPhong = hd.idPhong WHERE p.idKhuTro = k.idKhuTro) as dangThue
        FROM KhuTro k
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/khutro', (req, res) => {
    const { TenKhuTro, DiaChi } = req.body;
    db.query('INSERT INTO KhuTro (TenKhuTro, DiaChi) VALUES (?, ?)', [TenKhuTro, DiaChi], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Thêm khu trọ thành công!' });
    });
});

app.put('/api/khutro/:id', (req, res) => {
    const { id } = req.params;
    const { TenKhuTro, DiaChi } = req.body;
    db.query('UPDATE KhuTro SET TenKhuTro=?, DiaChi=? WHERE idKhuTro=?', [TenKhuTro, DiaChi, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cập nhật thành công!' });
    });
});

app.delete('/api/khutro/:id', (req, res) => {
    db.query('DELETE FROM KhuTro WHERE idKhuTro = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Không thể xóa khu trọ đang chứa phòng!" });
        res.json({ message: 'Đã xóa khu trọ!' });
    });
});

app.get('/api/khutro/:id/details', (req, res) => {
    const { id } = req.params;
    // Lấy thông tin khu trọ
    db.query('SELECT * FROM KhuTro WHERE idKhuTro = ?', [id], (err, areaResults) => {
        if (err) return res.status(500).json({ error: err.message });

        // Lấy danh sách phòng thuộc khu đó kèm trạng thái thuê
        const roomQuery = `
            SELECT p.*, (SELECT idHopDong FROM HopDong WHERE idPhong = p.idPhong AND ngayHetHan >= CURDATE() LIMIT 1) as idHopDong
            FROM Phong p 
            WHERE p.idKhuTro = ?
        `;
        db.query(roomQuery, [id], (err, roomResults) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                ...areaResults[0],
                phong: roomResults
            });
        });
    });
});

// --- API PHÒNG ---
app.get('/api/phong', (req, res) => {
    const query = `
        SELECT p.*, k.TenKhuTro, 
               (SELECT idHopDong FROM HopDong WHERE idPhong = p.idPhong AND ngayHetHan >= CURDATE() LIMIT 1) as idHopDong,
               (SELECT duongDan FROM hinhanhphong WHERE idPhong = p.idPhong LIMIT 1) as thumbnail
        FROM Phong p 
        JOIN KhuTro k ON p.idKhuTro = k.idKhuTro
        ORDER BY k.TenKhuTro ASC, p.SoPhong ASC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/phong/:id/details', (req, res) => {
    const query = `
        SELECT p.*, k.TenKhuTro, k.DiaChi, nt.HoTen, nt.SoDT, nt.Email, hd.idHopDong, hd.ngayKy, hd.ngayHetHan, hd.tienCoc, hd.trangThaiCoc
        FROM Phong p
        JOIN KhuTro k ON p.idKhuTro = k.idKhuTro
        LEFT JOIN HopDong hd ON p.idPhong = hd.idPhong AND hd.ngayHetHan >= CURDATE()
        LEFT JOIN NguoiThue nt ON hd.idNguoiThue = nt.idNguoiThue
        WHERE p.idPhong = ?
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy phòng' });
        
        const room = results[0];
        
        // Lấy danh sách hình ảnh
        db.query('SELECT * FROM hinhanhphong WHERE idPhong = ?', [req.params.id], (err, imageResults) => {
            if (err) return res.status(500).json({ error: err.message });
            room.images = imageResults;
            res.json(room);
        });
    });
});

app.get('/api/phong/trong', (req, res) => {
    const query = `
        SELECT p.*, k.TenKhuTro FROM Phong p 
        LEFT JOIN KhuTro k ON p.idKhuTro = k.idKhuTro 
        WHERE p.idPhong NOT IN (SELECT idPhong FROM HopDong WHERE ngayHetHan >= CURDATE())
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/phong', (req, res) => {
    const { SoPhong, idKhuTro, giaThue, dienTich, loaiPhong, noiThat } = req.body;
    const query = 'INSERT INTO Phong (SoPhong, idKhuTro, giaThue, dienTich, loaiPhong, noiThat) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [SoPhong, idKhuTro, giaThue, dienTich, loaiPhong, noiThat], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Thêm phòng thành công!', id: result.insertId });
    });
});

app.put('/api/phong/:id', (req, res) => {
    const { id } = req.params;
    const { SoPhong, idKhuTro, giaThue, dienTich, loaiPhong, noiThat } = req.body;
    const query = 'UPDATE Phong SET SoPhong=?, idKhuTro=?, giaThue=?, dienTich=?, loaiPhong=?, noiThat=? WHERE idPhong=?';
    db.query(query, [SoPhong, idKhuTro, giaThue, dienTich, loaiPhong, noiThat, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cập nhật thành công!' });
    });
});

app.delete('/api/phong/:id', (req, res) => {
    db.query('DELETE FROM Phong WHERE idPhong = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Phòng này đang có người ở hoặc có hợp đồng!" });
        res.json({ message: 'Đã xóa phòng!' });
    });
});

// --- API HÌNH ẢNH PHÒNG ---
app.post('/api/phong/:id/images', upload.array('images', 10), (req, res) => {
    const { id } = req.params;
    const files = req.files;
    
    console.log(`[UPLOAD] Nhận yêu cầu upload ảnh cho phòng ID: ${id}`);
    
    if (!files || files.length === 0) {
        console.warn(`[UPLOAD] Không có file nào được gửi lên cho phòng ID: ${id}`);
        return res.status(400).json({ error: 'Không có file nào được tải lên' });
    }

    console.log(`[UPLOAD] Đang xử lý ${files.length} file cho phòng ID: ${id}`);

    const values = files.map(file => [id, `/img/rooms/${file.filename}`]);
    const query = 'INSERT INTO hinhanhphong (idPhong, duongDan) VALUES ?';
    
    db.query(query, [values], (err, result) => {
        if (err) {
            console.error(`[UPLOAD] Lỗi khi lưu vào DB cho phòng ID: ${id}`, err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`[UPLOAD] Đã lưu ${files.length} ảnh vào DB cho phòng ID: ${id}`);
        res.status(201).json({ message: 'Tải lên thành công!', count: files.length });
    });
});

app.delete('/api/phong/images/:id', (req, res) => {
    const { id } = req.params;
    
    // Lấy đường dẫn file trước khi xóa trong DB
    db.query('SELECT duongDan FROM hinhanhphong WHERE idHinhAnh = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
        
        const filePath = path.join(__dirname, '../public', results[0].duongDan);
        
        // Xóa trong DB
        db.query('DELETE FROM hinhanhphong WHERE idHinhAnh = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Xóa file vật lý
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (e) {
                    console.error('Lỗi xóa file:', e);
                }
            }
            res.json({ message: 'Đã xóa ảnh!' });
        });
    });
});

// --- API NGƯỜI THUÊ ---
app.get('/api/nguoithue', (req, res) => {
    const sql = `
        SELECT nt.*, p.SoPhong, k.TenKhuTro, hd.idHopDong
        FROM NguoiThue nt
        LEFT JOIN HopDong hd ON nt.idNguoiThue = hd.idNguoiThue AND hd.ngayHetHan >= CURDATE()
        LEFT JOIN Phong p ON hd.idPhong = p.idPhong
        LEFT JOIN KhuTro k ON p.idKhuTro = k.idKhuTro
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/nguoithue/chua-thue', (req, res) => {
    // Lấy khách thuê không có hợp đồng nào còn hiệu lực (ngayHetHan >= CURDATE())
    const query = `
        SELECT * FROM NguoiThue 
        WHERE idNguoiThue NOT IN (
            SELECT idNguoiThue FROM HopDong WHERE ngayHetHan >= CURDATE()
        )
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/nguoithue', (req, res) => {
    const { HoTen, Email, SoDT, CCCD, GioiTinh, QueQuan, QuocTich } = req.body;
    
    // Kiểm tra trùng lặp CCCD hoặc SĐT
    // Chỉ check CCCD nếu có nhập (khác rỗng)
    let checkSql = 'SELECT idNguoiThue FROM NguoiThue WHERE SoDT = ?';
    let params = [SoDT];
    if (CCCD && CCCD.trim() !== "") {
        checkSql += ' OR CCCD = ?';
        params.push(CCCD);
    }

    db.query(checkSql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'Số CCCD hoặc Số điện thoại này đã tồn tại trên hệ thống!' });
        }

        db.beginTransaction(err => {
            if (err) return res.status(500).json({ error: err.message });
            const sqlAcc = 'INSERT INTO TaiKhoan (TenDangNhap, MatKhau, Quyen) VALUES (?, "123456", "NguoiThue")';
            db.query(sqlAcc, [SoDT], (err, accResult) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                const sqlTenant = 'INSERT INTO NguoiThue (idTaiKhoan, HoTen, Email, SoDT, CCCD, GioiTinh, QueQuan, QuocTich) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                db.query(sqlTenant, [accResult.insertId, HoTen, Email, SoDT, CCCD, GioiTinh || 'Nam', QueQuan || null, QuocTich || 'Việt Nam'], (err, ntResult) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                    db.commit(err => {
                        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                        res.status(201).json({ 
                            message: 'Thêm khách thuê thành công!',
                            idNguoiThue: ntResult.insertId 
                        });
                    });
                });
            });
        });
    });
});

app.put('/api/nguoithue/:id', (req, res) => {
    const { id } = req.params;
    const { HoTen, Email, SoDT, CCCD, GioiTinh, QueQuan, QuocTich } = req.body;
    
    // Kiểm tra trùng lặp với người khác
    let checkSql = 'SELECT idNguoiThue FROM NguoiThue WHERE (SoDT = ?';
    let params = [SoDT];
    if (CCCD && CCCD.trim() !== "") {
        checkSql += ' OR CCCD = ?';
        params.push(CCCD);
    }
    checkSql += ') AND idNguoiThue != ?';
    params.push(id);

    db.query(checkSql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'Số CCCD hoặc Số điện thoại này đã được sử dụng bởi khách thuê khác!' });
        }

        db.query('UPDATE NguoiThue SET HoTen=?, Email=?, SoDT=?, CCCD=?, GioiTinh=?, QueQuan=?, QuocTich=? WHERE idNguoiThue=?', [HoTen, Email, SoDT, CCCD, GioiTinh || 'Nam', QueQuan || null, QuocTich || 'Việt Nam', id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Cập nhật thành công!' });
        });
    });
});

app.delete('/api/nguoithue/:id', (req, res) => {
    db.query('DELETE FROM NguoiThue WHERE idNguoiThue = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Khách đang có hợp đồng hoặc hóa đơn!" });
        res.json({ message: 'Đã xóa khách thuê!' });
    });
});

// API Lấy hồ sơ chi tiết khách thuê
app.get('/api/nguoithue/:id/profile', (req, res) => {
    const { id } = req.params;
    const profile = {};
    
    // 1. Lấy Hợp đồng hiện tại
    const q1 = `SELECT hd.*, p.SoPhong, kt.TenKhuTro 
                FROM HopDong hd 
                JOIN Phong p ON hd.idPhong = p.idPhong 
                JOIN KhuTro kt ON p.idKhuTro = kt.idKhuTro
                WHERE hd.idNguoiThue = ? ORDER BY hd.ngayKy DESC LIMIT 1`;
    
    db.query(q1, [id], (err, contracts) => {
        profile.contract = contracts[0] || null;
        
        // 2. Lấy Hóa đơn gần đây
        const q2 = `SELECT * FROM HoaDon WHERE idHopDong = ? ORDER BY ngayLap DESC LIMIT 5`;
        const idHD = profile.contract ? profile.contract.idHopDong : 0;
        
        db.query(q2, [idHD], (err, invoices) => {
            profile.invoices = invoices;
            
            // 3. Lấy thành viên cùng phòng
            const q3 = `SELECT * FROM ThanhVienPhong WHERE idHopDong = ?`;
            db.query(q3, [idHD], (err, members) => {
                profile.members = members;
                res.json(profile);
            });
        });
    });
});

// --- API HỢP ĐỒNG ---
app.get('/api/hopdong', (req, res) => {
    const query = `
        SELECT hd.*, nt.HoTen, nt.SoDT, nt.CCCD, nt.GioiTinh, nt.QueQuan, nt.QuocTich, p.SoPhong, p.giaThue, kt.TenKhuTro 
        FROM HopDong hd 
        JOIN NguoiThue nt ON hd.idNguoiThue = nt.idNguoiThue 
        JOIN Phong p ON hd.idPhong = p.idPhong
        JOIN KhuTro kt ON p.idKhuTro = kt.idKhuTro
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/hopdong', (req, res) => {
    const { idNguoiThue, idPhong, ngayKy, ngayHetHan, tienCoc } = req.body;
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });

        // 1. Chèn hợp đồng
        db.query('INSERT INTO HopDong (idNguoiThue, idPhong, ngayKy, ngayHetHan, tienCoc, trangThaiCoc) VALUES (?, ?, ?, ?, ?, "Đã đóng")', 
        [idNguoiThue, idPhong, ngayKy, ngayHetHan, tienCoc || 0], (err, result) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            db.commit(err => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                res.status(201).json({ message: 'Lập hợp đồng thành công!' });
            });
        });
    });
});

app.put('/api/hopdong/:id', (req, res) => {
    const { ngayKy, ngayHetHan, tienCoc } = req.body;
    const query = 'UPDATE HopDong SET ngayKy = ?, ngayHetHan = ?, tienCoc = ? WHERE idHopDong = ?';
    db.query(query, [ngayKy, ngayHetHan, tienCoc, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cập nhật hợp đồng thành công!' });
    });
});

// Gia hạn hợp đồng
app.post('/api/hopdong/:id/renew', (req, res) => {
    const { ngayHetHan } = req.body;
    db.query('UPDATE HopDong SET ngayHetHan = ? WHERE idHopDong = ?', [ngayHetHan, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Gia hạn hợp đồng thành công!' });
    });
});

// Thanh lý hợp đồng (Trả phòng & Chốt cọc)
app.post('/api/hopdong/:id/checkout', (req, res) => {
    const { id } = req.params;
    
    // Đặt ngày hết hạn về hôm qua để phòng hiện trạng thái "Trống" ngay lập tức 
    // (Vì logic hệ thống dùng: WHERE ngayHetHan >= CURDATE() để xác định phòng Đang thuê)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    db.query('UPDATE HopDong SET ngayHetHan = ?, trangThaiCoc = "Đã tất toán" WHERE idHopDong = ?', [dateStr, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Trả phòng và chốt cọc thành công! Phòng đã được giải phóng.' });
    });
});

// Cập nhật trạng thái cọc
app.put('/api/hopdong/:id/deposit', (req, res) => {
    const { trangThaiCoc } = req.body;
    db.query('UPDATE HopDong SET trangThaiCoc = ? WHERE idHopDong = ?', [trangThaiCoc, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cập nhật trạng thái cọc thành công!' });
    });
});

// --- API THÀNH VIÊN PHÒNG ---
app.get('/api/hopdong/:id/members', (req, res) => {
    db.query('SELECT * FROM ThanhVienPhong WHERE idHopDong = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Lấy chỉ số điện nước cuối cùng của hợp đồng
app.get('/api/hopdong/:id/last-meter', (req, res) => {
    const query = 'SELECT dienMoi, nuocMoi FROM HoaDon WHERE idHopDong = ? ORDER BY ngayLap DESC LIMIT 1';
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || { dienMoi: 0, nuocMoi: 0 });
    });
});

app.post('/api/hopdong/:id/members', (req, res) => {
    const { HoTen, SoDT, CCCD, ngayVao, GioiTinh, QueQuan, QuocTich, Email } = req.body;
    db.query('INSERT INTO ThanhVienPhong (idHopDong, HoTen, SoDT, CCCD, ngayVao, GioiTinh, QueQuan, QuocTich, Email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
    [req.params.id, HoTen, SoDT, CCCD, ngayVao, GioiTinh, QueQuan, QuocTich, Email], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Thêm thành viên thành công!', id: result.insertId });
    });
});

app.delete('/api/members/:id', (req, res) => {
    db.query('DELETE FROM ThanhVienPhong WHERE idThanhVien = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Đã xóa thành viên!' });
    });
});

// Lấy TẤT CẢ thành viên ở cùng (kèm thông tin phòng, khu trọ, người thuê chính)
// Sửa thông tin thành viên ở cùng
app.put('/api/members/:id', (req, res) => {
    const { id } = req.params;
    const { HoTen, SoDT, CCCD, ngayVao, GioiTinh, QueQuan, QuocTich, Email } = req.body;
    const sql = 'UPDATE ThanhVienPhong SET HoTen=?, SoDT=?, CCCD=?, ngayVao=?, GioiTinh=?, QueQuan=?, QuocTich=?, Email=? WHERE idThanhVien=?';
    db.query(sql, [HoTen, SoDT, CCCD, ngayVao, GioiTinh, QueQuan, QuocTich, Email, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cập nhật thành viên thành công!' });
    });
});

app.get('/api/members/all', (req, res) => {
    const query = `
        SELECT tv.*, p.SoPhong, kt.TenKhuTro, nt.HoTen as ChuHopDong
        FROM ThanhVienPhong tv
        JOIN HopDong hd ON tv.idHopDong = hd.idHopDong
        JOIN Phong p ON hd.idPhong = p.idPhong
        JOIN KhuTro kt ON p.idKhuTro = kt.idKhuTro
        JOIN NguoiThue nt ON hd.idNguoiThue = nt.idNguoiThue
        ORDER BY kt.TenKhuTro, p.SoPhong, tv.HoTen
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- API DỊCH VỤ ---
app.get('/api/dichvu', (req, res) => {
    db.query('SELECT * FROM DichVu', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.delete('/api/hopdong/:id', (req, res) => {
    const { id } = req.params;
    // Lấy idPhong trước để reset trạng thái
    db.query('SELECT idPhong FROM HopDong WHERE idHopDong = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });
        
        const idPhong = rows[0].idPhong;
        db.query('DELETE FROM HopDong WHERE idHopDong = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Đã xóa hợp đồng và giải phóng phòng!' });
        });
    });
});

app.post('/api/dichvu', (req, res) => {
    const { TenDichVu, Gia, DonViTinh, loaiThu } = req.body;
    db.query('INSERT INTO DichVu (TenDichVu, Gia, DonViTinh, loaiThu) VALUES (?, ?, ?, ?)', [TenDichVu, Gia, DonViTinh, loaiThu], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Thêm dịch vụ thành công!' });
    });
});

app.put('/api/dichvu/:id', (req, res) => {
    const { TenDichVu, Gia, DonViTinh, loaiThu } = req.body;
    db.query('UPDATE DichVu SET TenDichVu=?, Gia=?, DonViTinh=?, loaiThu=? WHERE idDichVu=?', [TenDichVu, Gia, DonViTinh, loaiThu, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cập nhật thành công!' });
    });
});

app.delete('/api/dichvu/:id', (req, res) => {
    db.query('DELETE FROM DichVu WHERE idDichVu = ?', [req.params.id], (err) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ error: "Không thể xóa vì dịch vụ này đang được gán vào hóa đơn. Bạn nên đổi tên hoặc để nguyên để giữ lịch sử hóa đơn." });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Đã xóa dịch vụ!' });
    });
});

// --- API HÓA ĐƠN ---
app.get('/api/hoadon', (req, res) => {
    const query = `
        SELECT h.*, p.SoPhong, p.giaThue, nt.HoTen, k.TenKhuTro, 
               (SELECT COUNT(*) FROM ThanhVienPhong WHERE idHopDong = hd.idHopDong) as soNguoi
        FROM HoaDon h 
        JOIN HopDong hd ON h.idHopDong = hd.idHopDong 
        JOIN Phong p ON hd.idPhong = p.idPhong 
        JOIN NguoiThue nt ON hd.idNguoiThue = nt.idNguoiThue 
        JOIN KhuTro k ON p.idKhuTro = k.idKhuTro 
        ORDER BY h.ngayLap DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/hoadon', (req, res) => {
    const { idHopDong, ngayLap, trangThai, services } = req.body;
    const dienCu = Number(req.body.dienCu || 0);
    const dienMoi = Number(req.body.dienMoi || 0);
    const giaDien = Number(req.body.giaDien || 3500);
    const nuocCu = Number(req.body.nuocCu || 0);
    const nuocMoi = Number(req.body.nuocMoi || 0);
    const giaNuoc = Number(req.body.giaNuoc || 15000);

    const qRoom = `
        SELECT p.giaThue, (SELECT COUNT(*) + 1 FROM ThanhVienPhong WHERE idHopDong = hd.idHopDong) as tongNguoi
        FROM HopDong hd 
        JOIN Phong p ON hd.idPhong = p.idPhong 
        WHERE hd.idHopDong = ?
    `;
    db.query(qRoom, [idHopDong], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: 'Lỗi lấy thông tin phòng' });

        const { giaThue, tongNguoi } = results[0];
        let tienDichVu = 0;
        
        // Tính tiền dịch vụ cộng thêm (nếu có)
        if (services && Array.isArray(services)) {
            services.forEach(s => {
                const gia = Number(s.Gia || 0);
                if (s.customQty !== undefined) {
                    tienDichVu += gia * s.customQty;
                } else if (s.loaiThu === 'Theo người') {
                    tienDichVu += gia * tongNguoi;
                } else {
                    tienDichVu += gia;
                }
            });
        }

        const tienPhong = Number(giaThue);
        const tienDien = (dienMoi - dienCu) * giaDien;
        const tienNuoc = (nuocMoi - nuocCu) * giaNuoc;
        const tongTien = tienPhong + tienDien + tienNuoc + tienDichVu;

        // KIỂM TRA TRÙNG LẶP: Đã có hóa đơn tháng này chưa?
        const checkQuery = `
            SELECT idHoaDon FROM HoaDon 
            WHERE idHopDong = ? 
            AND MONTH(ngayLap) = MONTH(?) 
            AND YEAR(ngayLap) = YEAR(?)
        `;
        db.query(checkQuery, [idHopDong, ngayLap, ngayLap], (err, checkResults) => {
            if (err) return res.status(500).json({ error: 'Lỗi kiểm tra trùng lặp' });
            
            if (checkResults.length > 0) {
                return res.status(400).json({ error: `Phòng này đã có hóa đơn cho tháng ${new Date(ngayLap).getMonth() + 1}/${new Date(ngayLap).getFullYear()}. Vui lòng kiểm tra lại!` });
            }

            const query = 'INSERT INTO HoaDon (idHopDong, ngayLap, tongTien, trangThai, dienCu, dienMoi, giaDien, nuocCu, nuocMoi, giaNuoc, tienDichVu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            db.query(query, [idHopDong, ngayLap, tongTien, trangThai, dienCu, dienMoi, giaDien, nuocCu, nuocMoi, giaNuoc, tienDichVu], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
            
            // Lưu vết các dịch vụ vào bảng hoadondichvu
            if (services && services.length > 0) {
                const idHoaDon = result.insertId;
                const svQueries = services.map(s => {
                    let sl = 1;
                    if (s.customQty !== undefined) sl = s.customQty;
                    else if (s.loaiThu === 'Theo người') sl = tongNguoi;
                    return [idHoaDon, s.isCustom ? null : s.idDichVu, s.isCustom ? s.TenDichVu : null, sl, s.Gia * sl];
                });
                db.query('INSERT INTO HoaDonDichVu (idHoaDon, idDichVu, tenDichVuCustom, soLuong, thanhTien) VALUES ?', [svQueries], (err) => {
                    if (err) console.error('Lỗi lưu chi tiết dịch vụ:', err);
                });
            }
            
            res.status(201).json({ message: 'Tạo hóa đơn thành công!' });
        });
    });
});
});

app.put('/api/hoadon/:id', (req, res) => {
    const { id } = req.params;
    const { idHopDong, ngayLap, trangThai, services } = req.body;
    const dienCu = Number(req.body.dienCu || 0);
    const dienMoi = Number(req.body.dienMoi || 0);
    const giaDien = Number(req.body.giaDien || 3500);
    const nuocCu = Number(req.body.nuocCu || 0);
    const nuocMoi = Number(req.body.nuocMoi || 0);
    const giaNuoc = Number(req.body.giaNuoc || 15000);

    const qRoom = `
        SELECT p.giaThue, (SELECT COUNT(*) + 1 FROM ThanhVienPhong WHERE idHopDong = hd.idHopDong) as tongNguoi
        FROM HopDong hd 
        JOIN Phong p ON hd.idPhong = p.idPhong 
        WHERE hd.idHopDong = ?
    `;
    db.query(qRoom, [idHopDong], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: 'Lỗi lấy thông tin phòng' });

        const { giaThue, tongNguoi } = results[0];
        let tienDichVu = 0;
        if (services && Array.isArray(services)) {
            services.forEach(s => {
                const gia = Number(s.Gia || 0);
                if (s.customQty !== undefined) {
                    tienDichVu += gia * s.customQty;
                } else if (s.loaiThu === 'Theo người') {
                    tienDichVu += gia * tongNguoi;
                } else {
                    tienDichVu += gia;
                }
            });
        }

        const tongTien = Number(giaThue) + (dienMoi - dienCu) * giaDien + (nuocMoi - nuocCu) * giaNuoc + tienDichVu;
        
        const query = 'UPDATE HoaDon SET idHopDong=?, ngayLap=?, tongTien=?, trangThai=?, dienCu=?, dienMoi=?, giaDien=?, nuocCu=?, nuocMoi=?, giaNuoc=?, tienDichVu=? WHERE idHoaDon=?';
        db.query(query, [idHopDong, ngayLap, tongTien, trangThai, dienCu, dienMoi, giaDien, nuocCu, nuocMoi, giaNuoc, tienDichVu, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Cập nhật dịch vụ: Xóa cũ thêm mới
            db.query('DELETE FROM HoaDonDichVu WHERE idHoaDon = ?', [id], (err) => {
                if (services && services.length > 0) {
                    const svQueries = services.map(s => {
                        let sl = 1;
                        if (s.customQty !== undefined) sl = s.customQty;
                        else if (s.loaiThu === 'Theo người') sl = tongNguoi;
                        return [id, s.isCustom ? null : s.idDichVu, s.isCustom ? s.TenDichVu : null, sl, s.Gia * sl];
                    });
                    db.query('INSERT INTO HoaDonDichVu (idHoaDon, idDichVu, tenDichVuCustom, soLuong, thanhTien) VALUES ?', [svQueries], (err2) => {
                        res.json({ message: 'Cập nhật thành công!' });
                    });
                } else {
                    res.json({ message: 'Cập nhật thành công!' });
                }
            });
        });
    });
});

app.delete('/api/hoadon/:id', (req, res) => {
    db.query('DELETE FROM HoaDon WHERE idHoaDon = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Đã xóa hóa đơn!' });
    });
});

// API Chốt điện nước hàng loạt
app.get('/api/utilities/area/:id', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT p.idPhong, p.SoPhong, hd.idHopDong, nt.HoTen,
               (SELECT dienMoi FROM HoaDon WHERE idHopDong = hd.idHopDong ORDER BY ngayLap DESC LIMIT 1) as lastDienMoi,
               (SELECT nuocMoi FROM HoaDon WHERE idHopDong = hd.idHopDong ORDER BY ngayLap DESC LIMIT 1) as lastNuocMoi
        FROM Phong p
        JOIN HopDong hd ON p.idPhong = hd.idPhong
        JOIN NguoiThue nt ON hd.idNguoiThue = nt.idNguoiThue
        WHERE p.idKhuTro = ?
    `;
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/utilities/batch', async (req, res) => {
    const { list, ngayLap } = req.body;
    if (!list || !Array.isArray(list)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });

    // Lấy tất cả dịch vụ hiện có để áp dụng hàng loạt
    db.query('SELECT * FROM DichVu', async (err, services) => {
        if (err) return res.status(500).json({ error: 'Lỗi lấy danh sách dịch vụ' });

        const promises = list.map(item => {
            return new Promise((resolve) => {
                const qRoom = `
                    SELECT p.giaThue, (SELECT COUNT(*) + 1 FROM ThanhVienPhong WHERE idHopDong = hd.idHopDong) as tongNguoi
                    FROM HopDong hd 
                    JOIN Phong p ON hd.idPhong = p.idPhong 
                    WHERE hd.idHopDong = ?
                `;
                db.query(qRoom, [item.idHopDong], (err, results) => {
                    if (err || results.length === 0) return resolve({ error: true });
                    
                    const { giaThue, tongNguoi } = results[0];
                    let tienDichVu = 0;
                    services.forEach(s => {
                        const gia = Number(s.Gia || 0);
                        tienDichVu += (s.loaiThu === 'Theo người') ? gia * tongNguoi : gia;
                    });

                    const dienCu = Number(item.dienCu || 0);
                    const dienMoi = Number(item.dienMoi || 0);
                    const nuocCu = Number(item.nuocCu || 0);
                    const nuocMoi = Number(item.nuocMoi || 0);
                    const giaDien = 3500; 
                    const giaNuoc = 15000;
                    const tongTien = Number(giaThue) + (dienMoi - dienCu) * giaDien + (nuocMoi - nuocCu) * giaNuoc + tienDichVu;
                    
                    const query = 'INSERT INTO HoaDon (idHopDong, ngayLap, tongTien, trangThai, dienCu, dienMoi, giaDien, nuocCu, nuocMoi, giaNuoc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    db.query(query, [item.idHopDong, ngayLap, tongTien, 'Chưa thanh toán', dienCu, dienMoi, giaDien, nuocCu, nuocMoi, giaNuoc], (err, result) => {
                        if (err) return resolve({ error: true });
                        
                        const idHoaDon = result.insertId;
                        if (services.length > 0) {
                            const svQueries = services.map(s => [
                                idHoaDon, s.idDichVu, null, (s.loaiThu === 'Theo người' ? tongNguoi : 1), (s.loaiThu === 'Theo người' ? s.Gia * tongNguoi : s.Gia)
                            ]);
                            db.query('INSERT INTO HoaDonDichVu (idHoaDon, idDichVu, tenDichVuCustom, soLuong, thanhTien) VALUES ?', [svQueries], (errRes) => {
                                resolve({ success: true });
                            });
                        } else {
                            resolve({ success: true });
                        }
                    });
                });
            });
        });

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        res.json({ message: `Đã xử lý xong. Thành công: ${successCount}/${list.length}` });
    });
});

app.get('/api/hoadon/:id/services', (req, res) => {
    const query = `
        SELECT hddv.*, COALESCE(dv.TenDichVu, hddv.tenDichVuCustom) AS TenDichVu, COALESCE(dv.DonViTinh, 'Lần') AS DonViTinh 
        FROM HoaDonDichVu hddv
        LEFT JOIN DichVu dv ON hddv.idDichVu = dv.idDichVu
        WHERE hddv.idHoaDon = ?
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/hoadon/:id/pay', (req, res) => {
    db.query('UPDATE HoaDon SET trangThai = "Đã thanh toán" WHERE idHoaDon = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Đã xác nhận thanh toán!' });
    });
});

// --- THỐNG KÊ ---
app.get('/api/thongke', (req, res) => {
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM Phong) as tongPhong,
            (SELECT COUNT(DISTINCT idPhong) FROM HopDong WHERE ngayHetHan >= CURDATE()) as dangThue,
            (SELECT COALESCE(SUM(tongTien), 0) FROM HoaDon 
             WHERE MONTH(ngayLap) = MONTH(CURDATE()) AND YEAR(ngayLap) = YEAR(CURDATE()) 
             AND trangThai = 'Đã thanh toán') as doanhThu,
            (SELECT COALESCE(SUM(tongTien), 0) FROM HoaDon 
             WHERE MONTH(ngayLap) = MONTH(CURDATE()) AND YEAR(ngayLap) = YEAR(CURDATE())) as duKien
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// API Lấy danh sách sự kiện thông minh cho Dashboard (Kết hợp nhiều nguồn - Bản tối ưu UNION)
app.get('/api/thongke/notifications', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const subLimit = Math.ceil(limit / 2); // Tăng giới hạn từng nguồn để phong phú hơn

    const query = `
        (SELECT 'report' as type, idBaoCao as id, TieuDe as title, NoiDung as \`desc\`, NgayBao as date, 'warning' as color, 'fa-tools' as icon, 'admin_baocao.html' as link 
         FROM BaoCaoSuaChua WHERE TrangThai = 'Chờ xử lý' LIMIT ${subLimit})
        UNION ALL
        (SELECT 'contract' as type, hd.idHopDong as id, p.SoPhong as title, 'Hợp đồng sắp hết hạn' as \`desc\`, hd.ngayHetHan as date, 'danger' as color, 'fa-file-contract' as icon, 'contracts.html' as link 
         FROM HopDong hd JOIN Phong p ON hd.idPhong = p.idPhong WHERE hd.ngayHetHan BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) LIMIT ${subLimit})
        UNION ALL
        (SELECT 'payment' as type, h.idHoaDon as id, p.SoPhong as title, CONCAT('Nợ phí: ', FORMAT(h.tongTien, 0), ' đ') as \`desc\`, h.ngayLap as date, 'warning' as color, 'fa-money-bill-wave' as icon, 'invoices.html' as link 
         FROM HoaDon h JOIN HopDong hd ON h.idHopDong = hd.idHopDong JOIN Phong p ON hd.idPhong = p.idPhong WHERE h.trangThai = 'Chưa thanh toán' LIMIT ${subLimit})
        UNION ALL
        (SELECT 'tenant' as type, idNguoiThue as id, HoTen as title, 'Khách thuê mới' as \`desc\`, CURDATE() as date, 'info' as color, 'fa-user-plus' as icon, 'tenants.html' as link 
         FROM NguoiThue ORDER BY idNguoiThue DESC LIMIT ${subLimit})
        ORDER BY date DESC LIMIT ${limit}
    `;


    db.query(query, (err, results) => {
        if (err) {
            console.error('Lỗi lấy sự kiện:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});


// --- API THÔNG BÁO (BẢN SIÊU ỔN ĐỊNH) ---
app.get('/api/notifications', (req, res) => {
    const notifications = [];
    let completed = 0;
    const totalTasks = 3;

    function finish() {
        completed++;
        if (completed === totalTasks) {
            res.json(notifications);
        }
    }

    // Task 1: Hợp đồng
    db.query(`SELECT p.SoPhong FROM HopDong hd JOIN Phong p ON hd.idPhong = p.idPhong WHERE hd.ngayHetHan BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)`, (err, rows) => {
        if (!err && rows) rows.forEach(r => notifications.push({ type: 'contract', icon: 'fa-file-contract', color: 'danger', title: `Phòng ${r.SoPhong} sắp hết hạn`, desc: 'Sắp tới hạn gia hạn', badge: 'Hạn chót' }));
        finish();
    });

    // Task 2: Hóa đơn
    db.query(`SELECT p.SoPhong, h.tongTien FROM HoaDon h JOIN HopDong hd ON h.idHopDong = hd.idHopDong JOIN Phong p ON hd.idPhong = p.idPhong WHERE h.trangThai = 'Chưa thanh toán'`, (err, rows) => {
        if (!err && rows) rows.forEach(r => notifications.push({ type: 'payment', icon: 'fa-money-check-alt', color: 'warning', title: `Phòng ${r.SoPhong} nợ phí`, desc: `${new Intl.NumberFormat('vi-VN').format(r.tongTien)} đ`, badge: 'Chưa đóng' }));
        finish();
    });

    // Task 3: Khách thuê
    db.query(`SELECT HoTen FROM NguoiThue ORDER BY idNguoiThue DESC LIMIT 3`, (err, rows) => {
        if (!err && rows) rows.forEach(r => notifications.push({ type: 'tenant', icon: 'fa-user-plus', color: 'info', title: `Khách mới: ${r.HoTen}`, desc: 'Mới thêm vào hệ thống', badge: 'Mới' }));
        finish();
    });

    // Timeout phòng hờ (Nếu sau 3 giây không xong thì trả về rỗng luôn để không bị treo vòng tròn)
    setTimeout(() => {
        if (!res.headersSent) res.json(notifications);
    }, 3000);
});

// --- API THÔNG BÁO TỪ ADMIN ---
app.get('/api/thongbao', (req, res) => {
    const { idNguoiThue } = req.query;
    let sql = 'SELECT * FROM ThongBao ';
    let params = [];

    if (idNguoiThue) {
        sql += 'WHERE idNguoiThue IS NULL OR idNguoiThue = ? ';
        params.push(idNguoiThue);
    }
    
    sql += 'ORDER BY ngayDang DESC';
    
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/thongbao', (req, res) => {
    const { tieuDe, noiDung, loaiThongBao, idNguoiThue, idNguoiThues } = req.body;
    
    // Nếu gửi cho nhiều người (mảng IDs)
    if (Array.isArray(idNguoiThues) && idNguoiThues.length > 0) {
        const values = idNguoiThues.map(id => [tieuDe, noiDung, loaiThongBao || 'Chung', id]);
        const sql = 'INSERT INTO ThongBao (tieuDe, noiDung, loaiThongBao, idNguoiThue) VALUES ?';
        db.query(sql, [values], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Đã gửi thông báo cho nhóm cư dân.' });
        });
        return;
    }

    // Gửi cho 1 người hoặc tất cả (idNguoiThue = null)
    const sql = 'INSERT INTO ThongBao (tieuDe, noiDung, loaiThongBao, idNguoiThue) VALUES (?, ?, ?, ?)';
    db.query(sql, [tieuDe, noiDung, loaiThongBao || 'Chung', idNguoiThue || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ idThongBao: result.insertId });
    });
});

app.delete('/api/thongbao/:id', (req, res) => {
    db.query('DELETE FROM ThongBao WHERE idThongBao = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Đã xóa thông báo!' });
    });
});

// --- API GỬI SMS THỦ CÔNG ---
app.post('/api/sms/send-to-tenant', (req, res) => {
    const { idNguoiThue, message } = req.body;

    if (!idNguoiThue) {
        return res.status(400).json({ error: 'Thiếu idNguoiThue.' });
    }

    if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Nội dung SMS không được để trống.' });
    }

    // Lấy số điện thoại người thuê trước khi gọi dịch vụ SMS.
    db.query('SELECT SoDT FROM NguoiThue WHERE idNguoiThue = ?', [idNguoiThue], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            try {
                await saveSmsLog({
                    idNguoiThue,
                    phoneOriginal: null,
                    phoneNormalized: null,
                    message: message.trim(),
                    status: 'failed',
                    errorMessage: 'Không tìm thấy người thuê.',
                    isDemo: process.env.SMS_ENABLED !== 'true'
                });
            } catch (logError) {
                console.error('[SMS LOG] Không thể lưu lịch sử SMS:', logError.message);
            }

            return res.status(404).json({ error: 'Không tìm thấy người thuê.' });
        }

        const tenantPhone = results[0].SoDT;
        if (!tenantPhone) {
            try {
                await saveSmsLog({
                    idNguoiThue,
                    phoneOriginal: null,
                    phoneNormalized: null,
                    message: message.trim(),
                    status: 'failed',
                    errorMessage: 'Người thuê này chưa có số điện thoại.',
                    isDemo: process.env.SMS_ENABLED !== 'true'
                });
            } catch (logError) {
                console.error('[SMS LOG] Không thể lưu lịch sử SMS:', logError.message);
            }

            return res.status(400).json({ error: 'Người thuê này chưa có số điện thoại.' });
        }

        try {
            const smsResult = await sendSms(tenantPhone, message.trim());
            const status = smsResult.success ? 'success' : 'failed';

            try {
                await saveSmsLog({
                    idNguoiThue,
                    phoneOriginal: smsResult.originalTo || smsResult.to || tenantPhone,
                    phoneNormalized: smsResult.normalizedTo || null,
                    message: message.trim(),
                    status,
                    errorMessage: smsResult.error || null,
                    isDemo: smsResult.demo === true
                });
            } catch (logError) {
                console.error('[SMS LOG] Không thể lưu lịch sử SMS:', logError.message);
            }

            res.json({
                success: smsResult.success,
                message: smsResult.success ? 'Đã xử lý yêu cầu gửi SMS.' : 'Không gửi được SMS.',
                tenantPhone,
                smsResult
            });
        } catch (error) {
            try {
                await saveSmsLog({
                    idNguoiThue,
                    phoneOriginal: tenantPhone,
                    phoneNormalized: null,
                    message: message.trim(),
                    status: 'failed',
                    errorMessage: error.message,
                    isDemo: process.env.SMS_ENABLED !== 'true'
                });
            } catch (logError) {
                console.error('[SMS LOG] Không thể lưu lịch sử SMS:', logError.message);
            }

            res.status(500).json({
                success: false,
                message: 'Không gửi được SMS.',
                tenantPhone,
                smsResult: {
                    success: false,
                    error: error.message
                }
            });
        }
    });
});

app.get('/api/sms/logs', async (req, res) => {
    try {
        const logs = await getSmsLogs(req.query.limit);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sms/send-invoice-bulk', (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Tháng gửi SMS không hợp lệ.' });
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ error: 'Năm gửi SMS không hợp lệ.' });
    }

    const query = `
        SELECT
            h.idHoaDon,
            nt.idNguoiThue,
            nt.HoTen,
            nt.SoDT,
            p.SoPhong,
            p.giaThue,
            h.ngayLap,
            h.tongTien,
            h.trangThai,
            h.dienCu,
            h.dienMoi,
            h.giaDien,
            h.nuocCu,
            h.nuocMoi,
            h.giaNuoc,
            h.tienDichVu
        FROM HoaDon h
        JOIN HopDong hd ON h.idHopDong = hd.idHopDong
        JOIN NguoiThue nt ON hd.idNguoiThue = nt.idNguoiThue
        JOIN Phong p ON hd.idPhong = p.idPhong
        WHERE MONTH(h.ngayLap) = ? AND YEAR(h.ngayLap) = ?
        ORDER BY p.SoPhong ASC, h.idHoaDon ASC
    `;

    db.query(query, [month, year], async (err, invoices) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!invoices.length) {
            return res.json({
                success: true,
                total: 0,
                successCount: 0,
                failedCount: 0,
                message: `Không có hóa đơn trong tháng ${month}/${year}.`,
                results: []
            });
        }

        const cycle = `${String(month).padStart(2, '0')}/${year}`;
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        const moneyValue = value => Number(value || 0) || 0;
        const formatMoney = value => new Intl.NumberFormat('vi-VN', {
            maximumFractionDigits: 0
        }).format(Math.round(moneyValue(value)));

        for (const invoice of invoices) {
            const roomText = invoice.SoPhong || '---';
            const soDien = moneyValue(invoice.dienMoi) - moneyValue(invoice.dienCu);
            const tienDien = soDien * moneyValue(invoice.giaDien);
            const soNuoc = moneyValue(invoice.nuocMoi) - moneyValue(invoice.nuocCu);
            const tienNuoc = soNuoc * moneyValue(invoice.giaNuoc);
            const tienDichVu = moneyValue(invoice.tienDichVu);
            const tongTien = moneyValue(invoice.tongTien);
            const tienKhacHoacTienPhong = Math.max(tongTien - tienDien - tienNuoc - tienDichVu, 0);
            const isPaid = String(invoice.trangThai || '').trim() === 'Đã thanh toán';
            const endingText = isPaid
                ? 'Hoa don da thanh toan. Cam on quy khach.'
                : 'Vui long thanh toan dung han.';
            const message = `Thong bao hoa don phong ${roomText} thang ${cycle}: Tien phong/phu phi ${formatMoney(tienKhacHoacTienPhong)} VND, dien ${soDien} so = ${formatMoney(tienDien)} VND, nuoc ${soNuoc} so = ${formatMoney(tienNuoc)} VND, dich vu ${formatMoney(tienDichVu)} VND. Tong cong ${formatMoney(tongTien)} VND. ${endingText}`;

            let smsResult;
            try {
                smsResult = await sendSms(invoice.SoDT, message, { forceDemo: true });
            } catch (sendError) {
                smsResult = {
                    success: false,
                    error: sendError.message,
                    to: invoice.SoDT,
                    normalizedTo: null,
                    demo: true
                };
            }

            const status = smsResult.success ? 'success' : 'failed';
            if (smsResult.success) successCount += 1;
            else failedCount += 1;

            try {
                await saveSmsLog({
                    idNguoiThue: invoice.idNguoiThue,
                    phoneOriginal: smsResult.originalTo || smsResult.to || invoice.SoDT,
                    phoneNormalized: smsResult.normalizedTo || null,
                    message,
                    status,
                    errorMessage: smsResult.error || null,
                    isDemo: true
                });
            } catch (logError) {
                console.error('[SMS LOG] Không thể lưu lịch sử SMS hóa đơn:', logError.message);
            }

            results.push({
                idHoaDon: invoice.idHoaDon,
                idNguoiThue: invoice.idNguoiThue,
                HoTen: invoice.HoTen,
                SoPhong: invoice.SoPhong,
                phoneOriginal: smsResult.originalTo || smsResult.to || invoice.SoDT,
                phoneNormalized: smsResult.normalizedTo || null,
                status,
                errorMessage: smsResult.error || null,
                isDemo: true
            });
        }

        res.json({
            success: true,
            total: invoices.length,
            successCount,
            failedCount,
            results
        });
    });
});

// --- API XÁC THỰC (LOGIN) ---
app.post('/api/admin/create-tenant-account', (req, res) => {
    const { idNguoiThue, username, password } = req.body;
    
    // 1. Kiểm tra xem đã có tài khoản chưa
    db.query('SELECT idTaiKhoan FROM NguoiThue WHERE idNguoiThue = ?', [idNguoiThue], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0 && results[0].idTaiKhoan) {
            return res.status(400).json({ error: 'Khách thuê này đã có tài khoản rồi.' });
        }

        // 2. Tạo tài khoản mới
        db.query('INSERT INTO TaiKhoan (TenDangNhap, MatKhau, Quyen) VALUES (?, ?, "NguoiThue")', [username, password], (err, result) => {
            if (err) return res.status(500).json({ error: 'Tên đăng nhập đã tồn tại hoặc lỗi hệ thống.' });
            
            const idTaiKhoan = result.insertId;
            // 3. Liên kết với người thuê
            db.query('UPDATE NguoiThue SET idTaiKhoan = ? WHERE idNguoiThue = ?', [idTaiKhoan, idNguoiThue], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Đã cấp tài khoản thành công!' });
            });
        });
    });
});

app.post('/api/admin/reset-password', (req, res) => {
    const { idTaiKhoan, newPassword } = req.body;
    db.query('UPDATE TaiKhoan SET MatKhau = ? WHERE idTaiKhoan = ?', [newPassword, idTaiKhoan], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Đã đặt lại mật khẩu thành công!' });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM TaiKhoan WHERE TenDangNhap = ? AND MatKhau = ?', [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
        
        const account = results[0];
        if (account.Quyen === 'Admin') {
            res.json({ idTaiKhoan: account.idTaiKhoan, idAdmin: account.idTaiKhoan, name: 'Admin', role: 'Admin' });
        } else {
            // Lấy thông tin người thuê
            db.query('SELECT idNguoiThue, HoTen FROM NguoiThue WHERE idTaiKhoan = ?', [account.idTaiKhoan], (err, ntResults) => {
                if (err) return res.status(500).json({ error: err.message });
                if (ntResults.length === 0) return res.status(404).json({ error: 'Không tìm thấy hồ sơ khách thuê' });
                
                res.json({ 
                    idTaiKhoan: account.idTaiKhoan, 
                    idNguoiThue: ntResults[0].idNguoiThue, 
                    name: ntResults[0].HoTen, 
                    role: 'NguoiThue' 
                });
            });
        }
    });
});

app.post('/api/change-password', (req, res) => {
    const { idTaiKhoan, oldPassword, newPassword } = req.body;
    
    // 1. Kiểm tra mật khẩu cũ
    db.query('SELECT * FROM TaiKhoan WHERE idTaiKhoan = ? AND MatKhau = ?', [idTaiKhoan, oldPassword], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Mật khẩu cũ không chính xác.' });

        // 2. Cập nhật mật khẩu mới
        db.query('UPDATE TaiKhoan SET MatKhau = ? WHERE idTaiKhoan = ?', [newPassword, idTaiKhoan], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Đã đổi mật khẩu thành công!' });
        });
    });
});

app.post('/api/admin/change-password', (req, res) => {
    const { idAdmin, oldPass, newPass, type } = req.body;
    
    const changePass = (idTaiKhoan) => {
        db.query('SELECT * FROM TaiKhoan WHERE idTaiKhoan = ? AND MatKhau = ?', [idTaiKhoan, oldPass], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(401).json({ error: 'Mật khẩu cũ không chính xác.' });

            db.query('UPDATE TaiKhoan SET MatKhau = ? WHERE idTaiKhoan = ?', [newPass, idTaiKhoan], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Đã đổi mật khẩu thành công!' });
            });
        });
    };

    if (type === 'admin') {
        changePass(idAdmin);
    } else {
        db.query('SELECT idTaiKhoan FROM NguoiThue WHERE idNguoiThue = ?', [idAdmin], (err, ntResults) => {
            if (err) return res.status(500).json({ error: err.message });
            if (ntResults.length === 0 || !ntResults[0].idTaiKhoan) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
            changePass(ntResults[0].idTaiKhoan);
        });
    }
});

// --- API KHÁCH THUÊ (TENANT) ---
app.get('/api/tenant/:id/hoadon', (req, res) => {
    const query = `
        SELECT h.*, p.SoPhong, k.TenKhuTro
        FROM HoaDon h 
        JOIN HopDong hd ON h.idHopDong = hd.idHopDong 
        JOIN Phong p ON hd.idPhong = p.idPhong 
        JOIN KhuTro k ON p.idKhuTro = k.idKhuTro 
        WHERE hd.idNguoiThue = ?
        ORDER BY h.ngayLap DESC
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/tenant/:id/baocao', (req, res) => {
    db.query('SELECT * FROM BaoCaoSuaChua WHERE idNguoiThue = ? ORDER BY NgayBao DESC', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Lấy thông tin chỉ số điện nước mới nhất từ hóa đơn
app.get('/api/tenant/:id/chisodiennuoc', (req, res) => {
    const query = `
        SELECT h.dienMoi as chiSoDien, h.nuocMoi as chiSoNuoc, MONTH(h.ngayLap) as thang, YEAR(h.ngayLap) as nam, p.SoPhong
        FROM HoaDon h
        JOIN HopDong hd ON h.idHopDong = hd.idHopDong
        JOIN Phong p ON hd.idPhong = p.idPhong
        WHERE hd.idNguoiThue = ?
        ORDER BY h.ngayLap DESC
        LIMIT 1
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || {});
    });
});

// Lấy danh sách dịch vụ đang sử dụng (từ hóa đơn mới nhất của người thuê)
app.get('/api/tenant/:id/dichvu', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT dv.* 
        FROM HoaDonDichVu hddv
        JOIN DichVu dv ON hddv.idDichVu = dv.idDichVu
        WHERE hddv.idHoaDon = (
            SELECT h.idHoaDon 
            FROM HoaDon h 
            JOIN HopDong hd ON h.idHopDong = hd.idHopDong 
            WHERE hd.idNguoiThue = ? 
            ORDER BY h.ngayLap DESC LIMIT 1
        )
    `;
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            // Nếu chưa có hóa đơn, trả về tất cả dịch vụ (mặc định cho người mới)
            db.query('SELECT * FROM DichVu', (err2, allResults) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json(allResults);
            });
        } else {
            res.json(results);
        }
    });
});

// Lấy danh sách dịch vụ từ hóa đơn cuối cùng của hợp đồng
app.get('/api/hopdong/:id/last-services', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT hddv.idDichVu, hddv.soLuong
        FROM HoaDonDichVu hddv
        WHERE hddv.idHoaDon = (
            SELECT idHoaDon FROM HoaDon 
            WHERE idHopDong = ? 
            ORDER BY ngayLap DESC LIMIT 1
        )
    `;
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});


// Lấy thông tin hợp đồng chi tiết - NỚI LỎNG ĐIỀU KIỆN ĐỂ LUÔN THẤY
app.get('/api/tenant/:id/contract-detail', (req, res) => {
    const query = `
        SELECT hd.*, p.SoPhong, k.TenKhuTro, p.giaThue
        FROM HopDong hd
        JOIN Phong p ON hd.idPhong = p.idPhong
        JOIN KhuTro k ON p.idKhuTro = k.idKhuTro
        WHERE hd.idNguoiThue = ?
        ORDER BY hd.idHopDong DESC
        LIMIT 1
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || {});
    });
});

app.post('/api/tenant/baocao', (req, res) => {
    const { idNguoiThue, TieuDe, NoiDung } = req.body;
    db.query('INSERT INTO BaoCaoSuaChua (idNguoiThue, TieuDe, NoiDung) VALUES (?, ?, ?)', [idNguoiThue, TieuDe, NoiDung], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Gửi báo cáo thành công' });
    });
});

// API cho Admin xem và cập nhật báo cáo - ĐƠN GIẢN HÓA ĐỂ KHÔNG BỊ MẤT DỮ LIỆU
app.get('/api/admin/baocao', (req, res) => {
    const query = `
        SELECT 
            bc.*, 
            nt.HoTen, 
            COALESCE(p.SoPhong, 'Chưa gán') as SoPhong, 
            COALESCE(k.TenKhuTro, '---') as TenKhuTro
        FROM BaoCaoSuaChua bc
        LEFT JOIN NguoiThue nt ON bc.idNguoiThue = nt.idNguoiThue
        LEFT JOIN HopDong hd ON nt.idNguoiThue = hd.idNguoiThue
        LEFT JOIN Phong p ON hd.idPhong = p.idPhong
        LEFT JOIN KhuTro k ON p.idKhuTro = k.idKhuTro
        GROUP BY bc.idBaoCao
        ORDER BY bc.idBaoCao DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.put('/api/admin/baocao/:id', (req, res) => {
    const { TrangThai, PhanHoiAdmin } = req.body;
    console.log(`Updating report ${req.params.id}: Status=${TrangThai}, Reply=${PhanHoiAdmin}`);
    db.query('UPDATE BaoCaoSuaChua SET TrangThai = ?, PhanHoiAdmin = ? WHERE idBaoCao = ?', [TrangThai, PhanHoiAdmin, req.params.id], (err) => {
        if (err) {
            console.error('Update error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Cập nhật thành công' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
