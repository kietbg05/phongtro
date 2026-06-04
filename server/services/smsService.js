const path = require('path');
const twilio = require('twilio');

require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let client = null;

function getTwilioClient() {
    if (!client) {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }

    return client;
}

function normalizeVietnamPhoneNumber(phone) {
    if (!phone) {
        return {
            success: false,
            error: 'Thiếu số điện thoại nhận SMS.',
            originalPhone: phone || null,
            normalizedPhone: null
        };
    }

    const originalPhone = String(phone);
    const cleanedPhone = originalPhone.replace(/[\s.\-()]/g, '');
    let normalizedPhone = cleanedPhone;

    if (!normalizedPhone) {
        return {
            success: false,
            error: 'Số điện thoại nhận SMS không hợp lệ.',
            originalPhone,
            normalizedPhone: null
        };
    }

    if (!/^\+?\d+$/.test(normalizedPhone)) {
        return {
            success: false,
            error: 'Số điện thoại chỉ được chứa chữ số hoặc dấu + ở đầu.',
            originalPhone,
            normalizedPhone
        };
    }

    if (normalizedPhone.startsWith('+')) {
        normalizedPhone = `+${normalizedPhone.slice(1)}`;
    } else if (normalizedPhone.startsWith('84')) {
        normalizedPhone = `+${normalizedPhone}`;
    } else if (normalizedPhone.startsWith('0')) {
        normalizedPhone = `+84${normalizedPhone.slice(1)}`;
    } else {
        return {
            success: false,
            error: 'Số điện thoại Việt Nam phải bắt đầu bằng 0, 84 hoặc +84.',
            originalPhone,
            normalizedPhone
        };
    }

    if (!/^\+84\d{9,10}$/.test(normalizedPhone)) {
        return {
            success: false,
            error: 'Số điện thoại Việt Nam không hợp lệ. Vui lòng nhập dạng 0xxxxxxxxx, 84xxxxxxxxx hoặc +84xxxxxxxxx.',
            originalPhone,
            normalizedPhone
        };
    }

    return {
        success: true,
        originalPhone,
        normalizedPhone
    };
}

async function sendSms(to, message, options = {}) {
    if (!message) {
        return {
            success: false,
            error: 'Thiếu nội dung SMS.'
        };
    }

    const phoneResult = normalizeVietnamPhoneNumber(to);
    if (!phoneResult.success) {
        return {
            ...phoneResult,
            to: phoneResult.originalPhone || to,
            normalizedTo: phoneResult.normalizedPhone || null
        };
    }

    const { originalPhone, normalizedPhone } = phoneResult;

    if (options.forceDemo || process.env.SMS_ENABLED !== 'true') {
        console.log(`[SMS DEMO] Original To: ${originalPhone} | Normalized To: ${normalizedPhone} | Message: ${message}`);
        return {
            success: true,
            demo: true,
            to: originalPhone,
            normalizedTo: normalizedPhone,
            message
        };
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        return {
            success: false,
            error: 'Thiếu cấu hình Twilio trong biến môi trường.',
            to: originalPhone,
            normalizedTo: normalizedPhone,
            demo: false
        };
    }

    try {
        const result = await getTwilioClient().messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: normalizedPhone
        });

        return {
            success: true,
            sid: result.sid,
            to: normalizedPhone,
            normalizedTo: normalizedPhone,
            originalTo: originalPhone
        };
    } catch (error) {
        console.error('[SMS ERROR]', error.message);
        return {
            success: false,
            error: error.message,
            to: originalPhone,
            normalizedTo: normalizedPhone,
            demo: false
        };
    }
}

module.exports = {
    normalizeVietnamPhoneNumber,
    sendSms
};
