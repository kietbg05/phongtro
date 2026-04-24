/**
 * Custom Confirm Modal - Thay thế confirm() native bị browser block
 * Include file này ở mọi trang sau bootstrap.bundle.min.js
 * 
 * Cách dùng:
 *   showConfirm('Bạn có chắc muốn xoá?', async () => { 
 *       // code xử lý khi user bấm Xác nhận 
 *   });
 */
(function() {
    // Tạo modal HTML 1 lần duy nhất
    const modalHTML = `
    <div class="modal fade" id="globalConfirmModal" tabindex="-1" aria-hidden="true" style="z-index:9999">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content bg-dark text-white border-danger shadow-lg" style="border-radius:12px; overflow:hidden">
                <div class="modal-header border-0 pb-0" style="background: linear-gradient(135deg, rgba(220,53,69,0.15), rgba(220,53,69,0.05))">
                    <h6 class="modal-title text-danger fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Xác nhận</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body pt-3 pb-2">
                    <p id="globalConfirmMessage" class="mb-0" style="line-height:1.6"></p>
                </div>
                <div class="modal-footer border-0 pt-0">
                    <button type="button" class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Hủy</button>
                    <button type="button" class="btn btn-sm btn-danger px-3" id="globalConfirmBtn">
                        <i class="fas fa-check me-1"></i> Xác nhận
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Callback pending
    let pendingCallback = null;

    // Global function
    window.showConfirm = function(message, callback) {
        document.getElementById('globalConfirmMessage').innerHTML = message;
        pendingCallback = callback;
        const modal = new bootstrap.Modal(document.getElementById('globalConfirmModal'));
        modal.show();
    };

    // Xử lý khi bấm Xác nhận
    document.getElementById('globalConfirmBtn').addEventListener('click', function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('globalConfirmModal'));
        if (modal) modal.hide();
        if (pendingCallback) {
            pendingCallback();
            pendingCallback = null;
        }
    });
})();
