const db = require('../db');

const createSmsLogsTableSql = `
    CREATE TABLE IF NOT EXISTS sms_logs (
        idSmsLog INT NOT NULL AUTO_INCREMENT,
        idNguoiThue INT NULL,
        phoneOriginal VARCHAR(30) NULL,
        phoneNormalized VARCHAR(30) NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL,
        errorMessage TEXT NULL,
        isDemo TINYINT(1) NOT NULL DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idSmsLog),
        INDEX idx_sms_logs_createdAt (createdAt),
        INDEX idx_sms_logs_idNguoiThue (idNguoiThue)
    )
`;

function queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

async function ensureSmsLogsTable() {
    await queryAsync(createSmsLogsTableSql);
}

async function saveSmsLog(log) {
    await ensureSmsLogsTable();

    const sql = `
        INSERT INTO sms_logs
            (idNguoiThue, phoneOriginal, phoneNormalized, message, status, errorMessage, isDemo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await queryAsync(sql, [
        log.idNguoiThue || null,
        log.phoneOriginal || null,
        log.phoneNormalized || null,
        log.message || '',
        log.status || 'failed',
        log.errorMessage || null,
        log.isDemo ? 1 : 0
    ]);

    return result.insertId;
}

async function getSmsLogs(limit = 20) {
    await ensureSmsLogsTable();

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const sql = `
        SELECT
            sl.*,
            nt.HoTen
        FROM sms_logs sl
        LEFT JOIN NguoiThue nt ON sl.idNguoiThue = nt.idNguoiThue
        ORDER BY sl.createdAt DESC, sl.idSmsLog DESC
        LIMIT ?
    `;

    return queryAsync(sql, [safeLimit]);
}

module.exports = {
    ensureSmsLogsTable,
    getSmsLogs,
    saveSmsLog
};
