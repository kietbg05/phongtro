const API_URL = '/api';

// Hàm helper để convert dd/mm/yyyy sang yyyy-mm-dd cho Database
function parseInputDate(str) {
    if (!str) return '';
    // Nếu đã ở định dạng yyyy-mm-dd (browser trả về đôi khi)
    if (str.includes('-') && str.split('-')[0].length === 4) return str;
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return str;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Room Management System UI Loaded');
    
    // Chi chay neu dang o trang co cac element tuong ung
    if (document.getElementById('stat-total-rooms')) {
        fetchThongKe();
    }
    if (document.querySelector('table tbody')) {
        fetchDanhSachPhong();
    }
    if (document.getElementById('areaId')) {
        fetchKhuTro();
    }
});

// Cache danh sach phong de filter client-side
let allRooms = [];

function filterRooms() {
    const search = (document.getElementById('filterSearch')?.value || '').toLowerCase();
    const area = document.getElementById('filterArea')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';

    const filtered = allRooms.filter(room => {
        const matchSearch = !search || room.SoPhong.toLowerCase().includes(search);
        const matchArea = !area || String(room.idKhuTro) === area;
        const matchStatus = !status ||
            (status === 'empty' && !room.idHopDong) ||
            (status === 'rented' && room.idHopDong);
        return matchSearch && matchArea && matchStatus;
    });

    renderRoomTable(filtered);
}

function clearFilters() {
    const s = document.getElementById('filterSearch');
    const a = document.getElementById('filterArea');
    const st = document.getElementById('filterStatus');
    if (s) s.value = '';
    if (a) a.value = '';
    if (st) st.value = '';
    renderRoomTable(allRooms);
}


async function fetchKhuTro() {
    try {
        const response = await fetch(`${API_URL}/khutro?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Không thể tải danh sách khu trọ');
        const areas = await response.json();
        const select = document.getElementById('areaId');
        if (select) {
            select.innerHTML = areas.map(a => `<option value="${a.idKhuTro}">${a.TenKhuTro}</option>`).join('');
        }
    } catch (error) {
        console.error('Lỗi lấy khu trọ:', error);
    }
}

async function submitAddRoom() {
    const editId = document.getElementById('editRoomId').value;
    const data = {
        SoPhong: document.getElementById('roomNumber').value,
        idKhuTro: document.getElementById('areaId').value,
        giaThue: document.getElementById('roomPrice').value,
        dienTich: document.getElementById('roomArea').value,
        loaiPhong: document.getElementById('roomType').value,
        noiThat: document.getElementById('roomFurniture').value
    };

    if (!data.SoPhong || !data.idKhuTro || !data.giaThue) {
        alert('Vui lòng điền đầy đủ các trường bắt buộc!');
        return;
    }

    const url = editId ? `${API_URL}/phong/${editId}` : `${API_URL}/phong`;
    const method = editId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (response.ok) {
            alert(editId ? 'Cập nhật thành công!' : 'Thêm phòng thành công!');
            const modalElement = document.getElementById('addRoomModal');
            const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
            modal.hide();
            resetRoomForm();
            fetchDanhSachPhong();
            fetchThongKe();
        } else {
            alert('Lỗi: ' + (result.error || 'Không thể lưu thông tin.'));
        }
    } catch (error) {
        console.error('Error submitting room:', error);
        alert('Có lỗi kết nối đến máy chủ!');
    }
}

function resetRoomForm() {
    const form = document.getElementById('addRoomForm');
    if (form) form.reset();
    const editIdInput = document.getElementById('editRoomId');
    if (editIdInput) editIdInput.value = '';
    const btnSubmit = document.getElementById('btnSubmitRoom');
    if (btnSubmit) btnSubmit.innerText = 'Lưu Thông Tin';
}

function openEditModal(room) {
    document.getElementById('editRoomId').value = room.idPhong;
    document.getElementById('roomNumber').value = room.SoPhong;
    document.getElementById('roomType').value = room.loaiPhong;
    document.getElementById('areaId').value = room.idKhuTro;
    document.getElementById('roomPrice').value = room.giaThue;
    document.getElementById('roomArea').value = room.dienTich;
    document.getElementById('roomFurniture').value = room.noiThat || '';
    document.getElementById('btnSubmitRoom').innerText = 'Cập Nhật Thay Đổi';
    
    const modal = new bootstrap.Modal(document.getElementById('addRoomModal'));
    modal.show();
}

async function deleteRoom(id) {
    if (!id) return;
    showConfirm('Bạn có chắc chắn muốn xóa phòng này?', async () => {
        try {
            const res = await fetch(`${API_URL}/phong/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (res.ok) {
                alert('Đã xóa phòng thành công.');
                fetchDanhSachPhong();
                fetchThongKe();
            } else {
                alert(result.error || 'Lỗi: Không thể xóa phòng.');
            }
        } catch (err) {
            console.error('Error deleting room:', err);
            alert('Lỗi hệ thống khi xóa phòng.');
        }
    });
}

async function fetchThongKe() {
    try {
        const response = await fetch(`${API_URL}/thongke?t=${Date.now()}`);
        if (!response.ok) throw new Error('Lỗi tải thống kê');
        const data = await response.json();
        
        const totalElem = document.getElementById('stat-total-rooms');
        const rentedElem = document.getElementById('stat-rented-rooms');
        const availElem = document.getElementById('stat-available-rooms');
        const incomeElem = document.getElementById('stat-total-income');

        if (totalElem) totalElem.innerText = data.tongPhong || 0;
        if (rentedElem) rentedElem.innerText = data.dangThue || 0;
        if (availElem) availElem.innerText = (data.tongPhong - data.dangThue) || 0;
        if (incomeElem) incomeElem.innerText = new Intl.NumberFormat('vi-VN').format(data.doanhThu || 0) + ' đ';
        
        return data;
    } catch (error) {
        console.error('Lỗi lấy thống kê:', error);
        return null;
    }
}

async function fetchDanhSachPhong() {
    try {
        const response = await fetch(`${API_URL}/phong?t=${Date.now()}`);
        if (!response.ok) throw new Error('Loi tai danh sach phong');
        allRooms = await response.json();

        // Populate area filter dropdown
        const filterArea = document.getElementById('filterArea');
        if (filterArea) {
            const areas = [...new Map(allRooms.map(r => [r.idKhuTro, r.TenKhuTro])).entries()];
            filterArea.innerHTML = '<option value="">Tất cả khu trọ</option>' +
                areas.map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
        }

        renderRoomTable(allRooms);
    } catch (error) { console.error('Lỗi lấy danh sách phòng:', error); }
}

function renderRoomTable(rooms) {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">Không có phòng nào phù hợp.</td></tr>';
        return;
    }

    rooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', room.idPhong);
        tr.innerHTML = `
            <td class="fw-bold text-white">${room.SoPhong}</td>
            <td class="text-white">${room.TenKhuTro}</td>
            <td class="text-white">${room.loaiPhong}</td>
            <td class="text-white">${new Intl.NumberFormat('vi-VN').format(room.giaThue)} đ</td>
            <td><span class="badge ${room.idHopDong ? 'bg-success' : 'bg-warning text-dark'}">
                ${room.idHopDong ? 'Đã thuê' : 'Trống'}
            </span></td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-info" title="Xem chi tiết" onclick="viewRoomDetail(${room.idPhong})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-outline-warning" title="Sửa" onclick='openEditModal(${JSON.stringify(room).replace(/'/g, "&apos;")})'><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" title="Xóa" onclick="deleteRoom(${room.idPhong})"><i class="fas fa-trash"></i></button>
                    ${!room.idHopDong ? `
                        <button class="btn btn-sm btn-success" title="Cho thuê ngay" onclick="quickRent(${room.idPhong})">
                            <i class="fas fa-user-plus"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


async function quickRent(idPhong) {
    try {
        const modalElement = document.getElementById('addContractModal');
        if (!modalElement) {
            console.error('Không tìm thấy bảng lập hợp đồng!');
            return;
        }
        
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        
        // Đóng các modal khác
        const detailModalEl = document.getElementById('roomDetailModal');
        if (detailModalEl) {
            const detailModal = bootstrap.Modal.getInstance(detailModalEl);
            if (detailModal) detailModal.hide();
        }
        
        // Load dữ liệu khách
        await fetchKhachChuaThue();
        
        // Hiển thị số phòng và lưu ID vào ô ẩn
        const row = document.querySelector(`tr[data-id="${idPhong}"]`);
        const roomNum = row ? row.querySelector('td:first-child').innerText : idPhong;
        
        document.getElementById('displayRoomNumber').innerText = 'Phòng: ' + roomNum;
        document.getElementById('contractRoomId').value = idPhong;
        
        // Gán ngày bằng Flatpickr để đúng định dạng dd/mm/yyyy
        const today = new Date();
        const next6Months = new Date();
        next6Months.setMonth(today.getMonth() + 6);
        
        const formatDate = (date) => {
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const y = date.getFullYear();
            return `${d}/${m}/${y}`;
        };

        if (document.getElementById('contractDate')._flatpickr) {
            document.getElementById('contractDate')._flatpickr.setDate(formatDate(today));
        } else {
            document.getElementById('contractDate').value = formatDate(today);
        }

        if (document.getElementById('contractEndDate')._flatpickr) {
            document.getElementById('contractEndDate')._flatpickr.setDate(formatDate(next6Months));
        } else {
            document.getElementById('contractEndDate').value = formatDate(next6Months);
        }
        
        modal.show();
    } catch (error) {
        console.error('Lỗi khi mở thuê nhanh:', error);
        alert('Có lỗi khi mở bảng thuê phòng!');
    }
}

// --- Logic Đăng Ký Nhanh Khách Thuê ---
function openQuickAddTenant() {
    // Không đóng modal lập hợp đồng, chỉ mở đè lên (nhờ z-index)
    const modal = new bootstrap.Modal(document.getElementById('quickAddTenantModal'));
    modal.show();
}

function closeQuickAddTenant() {
    const modalElement = document.getElementById('quickAddTenantModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
}

async function submitQuickTenant() {
    const data = {
        HoTen: document.getElementById('quickTenantName').value,
        SoDT: document.getElementById('quickTenantPhone').value,
        CCCD: document.getElementById('quickTenantCCCD').value,
        GioiTinh: document.getElementById('quickTenantGioiTinh')?.value || 'Nam',
        QueQuan: document.getElementById('quickTenantQueQuan')?.value || '',
        QuocTich: document.getElementById('quickTenantQuocTich')?.value || 'Việt Nam',
        Email: document.getElementById('quickTenantEmail')?.value || ''
    };

    if (!data.HoTen || !data.SoDT) {
        alert('Vui lòng điền tên và số điện thoại!');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/nguoithue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('Đã đăng ký khách thuê mới!');
            closeQuickAddTenant();
            
            // Reload danh sách khách ở modal lập hợp đồng
            await fetchKhachChuaThue();
            
            // Tự động chọn khách vừa tạo bằng ID trả về từ Server
            const newId = result.idNguoiThue;
            const select = document.getElementById('contractTenantId');
            if (select && newId) {
                select.value = newId;
            }
        } else {
            alert(result.error || 'Lỗi đăng ký khách');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ!');
    }
}

async function viewRoomDetail(id) {
    try {
        const res = await fetch(`${API_URL}/phong/${id}/details`);
        if (!res.ok) throw new Error('Lỗi tải chi tiết');
        const p = await res.json();
        
        // Fetch roommates
        let membersHtml = '<p class="text-muted small">Chưa có thành viên đăng ký ở cùng.</p>';
        if (p.idHopDong) {
            const memRes = await fetch(`${API_URL}/hopdong/${p.idHopDong}/members`);
            if (memRes.ok) {
                const members = await memRes.json();
                if (members.length > 0) {
                    membersHtml = `
                        <div class="table-responsive">
                            <table class="table table-sm table-dark table-hover border-secondary small">
                                <thead>
                                    <tr>
                                        <th>Họ Tên</th>
                                        <th>GT</th>
                                        <th>CCCD</th>
                                        <th>SĐT</th>
                                        <th>Quê quán</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${members.map(m => `
                                        <tr>
                                            <td>${m.HoTen}</td>
                                            <td><i class="fas ${m.GioiTinh === 'Nữ' ? 'fa-venus text-pink' : m.GioiTinh === 'Khác' ? 'fa-genderless text-secondary' : 'fa-mars text-info'}" title="${m.GioiTinh}"></i></td>
                                            <td>${m.CCCD || '---'}</td>
                                            <td>${m.SoDT || '---'}</td>
                                            <td class="small opacity-75">${m.QueQuan || '---'}</td>
                                            <td class="text-end">
                                                <button class="btn btn-link text-danger p-0" onclick="deleteMember(${m.idThanhVien}, ${id})"><i class="fas fa-times"></i></button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }
        }

        const content = `
            <div class="row g-4 text-white">
                <div class="col-md-5 border-end border-secondary">
                    <h6 class="text-primary mb-3 fw-bold border-bottom border-primary border-opacity-25 pb-2"><i class="fas fa-building me-2"></i>Thông Tin Phòng</h6>
                    <div class="mb-2 d-flex justify-content-between"><strong>Số Phòng:</strong> <span class="text-info fw-bold">${p.SoPhong}</span></div>
                    <div class="mb-2 d-flex justify-content-between"><strong>Khu Trọ:</strong> <span>${p.TenKhuTro}</span></div>
                    <div class="mb-2 d-flex justify-content-between"><strong>Giá Thuê:</strong> <span class="text-warning">${new Intl.NumberFormat('vi-VN').format(p.giaThue)} đ</span></div>
                    <div class="mb-2 d-flex justify-content-between"><strong>Diện Tích:</strong> <span>${p.dienTich} m²</span></div>
                    <div class="mb-2 d-flex justify-content-between"><strong>Loại Phòng:</strong> <span>${p.loaiPhong}</span></div>
                    
                    <div class="mt-4 p-3 bg-secondary bg-opacity-10 rounded border border-secondary">
                        <h6 class="text-info small fw-bold mb-2"><i class="fas fa-couch me-2"></i>Nội Thất</h6>
                        <div class="small text-secondary">${p.noiThat || 'Chưa cập nhật.'}</div>
                    </div>
                </div>
                
                <div class="col-md-7">
                    <h6 class="text-primary mb-3 fw-bold border-bottom border-primary border-opacity-25 pb-2"><i class="fas fa-user-shield me-2"></i>Hợp Đồng & Nhân Khẩu</h6>
                    ${p.HoTen ? `
                        <div class="row mb-3">
                            <div class="col-6">
                                <small class="text-secondary d-block">Chủ hợp đồng thuê</small>
                                <span class="fw-bold">${p.HoTen}</span>
                            </div>
                            <div class="col-6">
                                <small class="text-secondary d-block">SĐT liên hệ</small>
                                <span class="fw-bold text-info">${p.SoDT}</span>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <small class="text-secondary d-block">Tiền đặt cọc</small>
                                <span class="fw-bold text-warning">${new Intl.NumberFormat('vi-VN').format(p.tienCoc)} đ</span>
                            </div>
                            <div class="col-6">
                                <small class="text-secondary d-block">Trạng thái cọc</small>
                                <span class="badge ${p.trangThaiCoc === 'Đã đóng' ? 'bg-success' : 'bg-danger'}">${p.trangThaiCoc}</span>
                            </div>
                        </div>
                        <div class="row mb-4">
                            <div class="col-6">
                                <small class="text-secondary d-block">Thời hạn hợp đồng</small>
                                <span>${new Date(p.ngayKy).toLocaleDateString('vi-VN')} - ${new Date(p.ngayHetHan).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                        
                        <div class="bg-dark p-3 rounded border border-secondary mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="small fw-bold mb-0 text-info uppercase"><i class="fas fa-users me-2"></i>Thành viên cùng phòng</h6>
                                <button class="btn btn-outline-info btn-xs py-0 px-2" style="font-size: 0.7rem;" onclick="openAddMember(${p.idHopDong})">
                                    <i class="fas fa-plus"></i> Thêm
                                </button>
                            </div>
                            ${membersHtml}
                        </div>
                    ` : `
                        <div class="alert alert-warning bg-dark border-warning py-4 text-center">
                            <i class="fas fa-door-open fa-3x mb-3 text-warning opacity-50"></i>
                            <h6 class="alert-heading fw-bold">PHÒNG ĐANG TRỐNG</h6>
                            <p class="mb-0 small text-secondary">Hệ thống chưa ghi nhận hợp đồng thuê cho phòng này.</p>
                            <button class="btn btn-warning btn-sm mt-3 fw-bold" onclick="quickRent(${id})">Lập Hợp Đồng Ngay</button>
                        </div>
                    `}
                </div>
            </div>
        `;
        document.getElementById('roomDetailContent').innerHTML = content;
        
        // Show actions in footer if rented
        const actionsElem = document.getElementById('roomDetailActions');
        if (p.idHopDong) {
            actionsElem.innerHTML = `
                <button class="btn btn-outline-info btn-sm me-2" onclick="renewContract(${p.idHopDong}, '${p.ngayHetHan}', ${id})">
                    <i class="fas fa-calendar-plus me-1"></i> Gia hạn
                </button>
                <button class="btn btn-danger btn-sm" onclick="checkoutContract(${p.idHopDong}, ${id})">
                    <i class="fas fa-sign-out-alt me-1"></i> Trả phòng & Chốt cọc
                </button>
            `;
        } else {
            actionsElem.innerHTML = '';
        }
        
        const modal = new bootstrap.Modal(document.getElementById('roomDetailModal'));
        modal.show();
    } catch (error) { 
        console.error('Lỗi chi tiết:', error);
        alert('Lỗi tải chi tiết phòng!'); 
    }
}

async function fetchNotifications() {
    try {
        const res = await fetch(`${API_URL}/notifications?t=${Date.now()}`);
        if (!res.ok) throw new Error('Lỗi tải thông báo');
        const data = await res.json();
        const container = document.getElementById('notification-list');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<li class="list-group-item bg-transparent text-muted text-center py-4 italic">Hiện không có sự kiện quan trọng nào.</li>';
            return;
        }

        container.innerHTML = data.map(n => `
            <li class="list-group-item bg-transparent text-white border-secondary py-3 animate-fade-in">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="icon-sm rounded-circle bg-${n.color} bg-opacity-10 text-${n.color} me-3 d-flex align-items-center justify-content-center" style="width: 35px; height: 35px;">
                            <i class="fas ${n.icon}"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${n.title}</div>
                            <div class="small text-secondary">${n.desc}</div>
                        </div>
                    </div>
                    <span class="badge bg-${n.color} bg-opacity-75 rounded-pill small">${n.badge}</span>
                </div>
            </li>
        `).join('');
    } catch (error) {
        console.error('Lỗi lấy thông báo:', error);
    }
}

async function fetchKhachChuaThue() {
    try {
        const res = await fetch(`${API_URL}/nguoithue/chua-thue`);
        if (!res.ok) throw new Error('Lỗi tải danh sách khách');
        const data = await res.json();
        const select = document.getElementById('contractTenantId');
        if (!select) return;
        
        if (data.length === 0) {
            select.innerHTML = '<option value="">Tất cả khách đã có phòng</option>';
        } else {
            select.innerHTML = '<option value="">Chọn khách thuê</option>' + 
                data.map(t => `<option value="${t.idNguoiThue}">${t.HoTen}</option>`).join('');
        }
    } catch (err) { console.error('Lỗi lấy khách chưa thuê:', err); }
}



async function submitContract() {
    const data = {
        idNguoiThue: document.getElementById('contractTenantId').value,
        idPhong: document.getElementById('contractRoomId').value,
        ngayKy: parseInputDate(document.getElementById('contractDate').value),
        ngayHetHan: parseInputDate(document.getElementById('contractEndDate').value),
        tienCoc: document.getElementById('contractDeposit').value
    };

    if (!data.idNguoiThue || !data.idPhong || !data.ngayKy || !data.ngayHetHan || !data.tienCoc) {
        alert('Vui lòng điền đầy đủ thông tin hợp đồng và tiền cọc!');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/hopdong`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('Lập hợp đồng thành công!');
            const modalElement = document.getElementById('addContractModal');
            const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
            modal.hide();
            fetchDanhSachPhong();
            fetchThongKe();
            fetchNotifications();
        } else {
            alert('Lỗi: ' + (result.error || 'Không thể lập hợp đồng.'));
        }
    } catch (err) { 
        console.error('Error submitting contract:', err);
        alert('Lỗi kết nối khi lập hợp đồng!'); 
    }
}

// --- QUẢN LÝ THÀNH VIÊN (ROOMMATES) ---
function openAddMember(idHopDong) {
    document.getElementById('memberContractId').value = idHopDong;
    document.getElementById('addMemberForm').reset();
    
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    const todayStr = `${d}/${m}/${y}`;
    
    if (document.getElementById('memberJoinDate')._flatpickr) {
        document.getElementById('memberJoinDate')._flatpickr.setDate(todayStr);
    } else {
        document.getElementById('memberJoinDate').value = todayStr;
    }
    
    // Đóng modal chi tiết để tránh lỗi chồng tab/backdrop (nếu cần)
    // Ở đây ta có thể cho phép mở đè nếu z-index chuẩn, nhưng để chắc chắn ta đóng modal cũ
    const detailModalEl = document.getElementById('roomDetailModal');
    if (detailModalEl) {
        const detailModal = bootstrap.Modal.getInstance(detailModalEl);
        if (detailModal) detailModal.hide();
    }

    const modal = new bootstrap.Modal(document.getElementById('addMemberModal'));
    modal.show();
}
function openQuickRentFromDetail(id) {
    // Helper để gọi từ trang chi tiết
    quickRent(id);
}

function closeAddMember() {
    const modalElement = document.getElementById('addMemberModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
}

async function submitMember() {
    const idHD = document.getElementById('memberContractId').value;
    const hoTen = document.getElementById('memberName').value.trim();
    const ngayVaoRaw = document.getElementById('memberJoinDate').value;

    if (!hoTen || !ngayVaoRaw) {
        return alert('Vui lòng nhập Họ tên và Ngày vào!');
    }

    const data = {
        HoTen: hoTen,
        SoDT: document.getElementById('memberPhone').value,
        CCCD: document.getElementById('memberCCCD').value,
        ngayVao: parseInputDate(ngayVaoRaw),
        GioiTinh: document.getElementById('memberGioiTinh').value,
        QueQuan: document.getElementById('memberQueQuan').value,
        QuocTich: document.getElementById('memberQuocTich').value,
        Email: document.getElementById('memberEmail').value
    };

    try {
        const res = await fetch(`${API_URL}/hopdong/${idHD}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeAddMember();
            alert('Thêm thành viên thành công!');
            location.reload(); 
        }
    } catch (err) { alert('Lỗi khi thêm thành viên'); }
}

async function deleteMember(idMember, idPhong) {
    showConfirm('Xóa thành viên này khỏi phòng?', async () => {
        try {
            const res = await fetch(`${API_URL}/members/${idMember}`, { method: 'DELETE' });
            if (res.ok) {
                alert('Đã xóa thành viên.');
                viewRoomDetail(idPhong);
            }
        } catch (err) { alert('Lỗi khi xóa thành viên'); }
    });
}

// --- VÒNG ĐỜI HỢP ĐỒNG (LIFECYCLE) ---
function renewContract(idHopDong, currentEndDate, idPhong) {
    document.getElementById('renewHDId').value = idHopDong;
    document.getElementById('renewRoomId').value = idPhong;
    
    // Tính toán ngày 6 tháng sau mặc định
    const current = new Date(currentEndDate);
    current.setMonth(current.getMonth() + 6);
    
    const d = current.getDate().toString().padStart(2, '0');
    const m = (current.getMonth() + 1).toString().padStart(2, '0');
    const y = current.getFullYear();
    const futureDateStr = `${d}/${m}/${y}`;
    
    // Set vào flatpickr
    const input = document.getElementById('renewNewDate');
    if (input._flatpickr) {
        input._flatpickr.setDate(current);
    } else {
        input.value = futureDateStr;
    }

    const modal = new bootstrap.Modal(document.getElementById('renewContractModal'));
    modal.show();
}

async function submitRenew() {
    const idHD = document.getElementById('renewHDId').value;
    const idPhong = document.getElementById('renewRoomId').value;
    const newDateRaw = document.getElementById('renewNewDate').value;

    if (!newDateRaw) return alert('Vui lòng chọn ngày hết hạn mới!');

    try {
        const res = await fetch(`${API_URL}/hopdong/${idHD}/renew`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ngayHetHan: parseInputDate(newDateRaw) })
        });
        
        if (res.ok) {
            alert('Gia hạn hợp đồng thành công!');
            const modalEl = document.getElementById('renewContractModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            
            viewRoomDetail(idPhong);
            fetchDanhSachPhong();
        } else {
            alert('Lỗi gia hạn hợp đồng!');
        }
    } catch (err) { alert('Lỗi kết nối máy chủ!'); }
}

async function checkoutContract(idHopDong, idPhong) {
    showConfirm('Xác nhận trả phòng? Hệ thống sẽ chốt ngày trả là hôm nay và tất toán tiền cọc.', async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await fetch(`${API_URL}/hopdong/${idHopDong}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                alert('Đã hoàn tất trả phòng và tất toán cọc.');
                const modalElement = document.getElementById('roomDetailModal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
                fetchDanhSachPhong();
                fetchThongKe();
            } else {
                const errData = await res.json();
                alert('Lỗi: ' + (errData.error || 'Không thể thực hiện trả phòng.'));
            }
        } catch (err) { 
            console.error('Checkout error:', err);
            alert('Lỗi kết nối máy chủ!'); 
        }
    });
}
