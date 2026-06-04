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
);
