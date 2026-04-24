const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
               (SELECT idHopDong FROM HopDong WHERE idPhong = p.idPhong AND ngayHetHan >= CURDATE() LIMIT 1) as idHopDong 
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
        res.json(results[0]);
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
    const query = `
        SELECT nt.* FROM NguoiThue nt 
        LEFT JOIN HopDong hd ON nt.idNguoiThue = hd.idNguoiThue 
        WHERE hd.idHopDong IS NULL
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
            const sqlAcc = 'INSERT INTO TaiKhoan (TenDangNhap, MatKhau, Quyen) VALUES (?, "123", "NguoiThue")';
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

        const query = 'INSERT INTO HoaDon (idHopDong, ngayLap, tongTien, trangThai, dienCu, dienMoi, giaDien, nuocCu, nuocMoi, giaNuoc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [idHopDong, ngayLap, tongTien, trangThai, dienCu, dienMoi, giaDien, nuocCu, nuocMoi, giaNuoc], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Lưu vết các dịch vụ vào bảng hoadondichvu (nếu cần xem chi tiết sau này)
            if (services && services.length > 0) {
                const idHoaDon = result.insertId;
                const svQueries = services.map(s => {
                    let sl = 1;
                    if (s.customQty !== undefined) sl = s.customQty;
                    else if (s.loaiThu === 'Theo người') sl = tongNguoi;
                    return [idHoaDon, s.idDichVu, sl, s.Gia * sl];
                });
                db.query('INSERT INTO HoaDonDichVu (idHoaDon, idDichVu, soLuong, thanhTien) VALUES ?', [svQueries], (err) => {
                    if (err) console.error('Lỗi lưu chi tiết dịch vụ:', err);
                });
            }
            
            res.status(201).json({ message: 'Tạo hóa đơn thành công!' });
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
        
        const query = 'UPDATE HoaDon SET idHopDong=?, ngayLap=?, tongTien=?, trangThai=?, dienCu=?, dienMoi=?, giaDien=?, nuocCu=?, nuocMoi=?, giaNuoc=? WHERE idHoaDon=?';
        db.query(query, [idHopDong, ngayLap, tongTien, trangThai, dienCu, dienMoi, giaDien, nuocCu, nuocMoi, giaNuoc, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Cập nhật dịch vụ: Xóa cũ thêm mới
            db.query('DELETE FROM HoaDonDichVu WHERE idHoaDon = ?', [id], (err) => {
                if (services && services.length > 0) {
                    const svQueries = services.map(s => {
                        let sl = 1;
                        if (s.customQty !== undefined) sl = s.customQty;
                        else if (s.loaiThu === 'Theo người') sl = tongNguoi;
                        return [id, s.idDichVu, sl, s.Gia * sl];
                    });
                    db.query('INSERT INTO HoaDonDichVu (idHoaDon, idDichVu, soLuong, thanhTien) VALUES ?', [svQueries], (err2) => {
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
                                idHoaDon, s.idDichVu, (s.loaiThu === 'Theo người' ? tongNguoi : 1), (s.loaiThu === 'Theo người' ? s.Gia * tongNguoi : s.Gia)
                            ]);
                            db.query('INSERT INTO HoaDonDichVu (idHoaDon, idDichVu, soLuong, thanhTien) VALUES ?', [svQueries], (errRes) => {
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
        SELECT hddv.*, dv.TenDichVu, dv.DonViTinh 
        FROM HoaDonDichVu hddv
        JOIN DichVu dv ON hddv.idDichVu = dv.idDichVu
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
