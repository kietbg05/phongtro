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

async function sendSms(to, message) {
    if (!to) {
        return {
            success: false,
            error: 'Thiếu số điện thoại nhận SMS.'
        };
    }

    if (!message) {
        return {
            success: false,
            error: 'Thiếu nội dung SMS.'
        };
    }

    if (process.env.SMS_ENABLED !== 'true') {
        console.log(`[SMS DEMO] To: ${to} | Message: ${message}`);
        return {
            success: true,
            demo: true,
            to,
            message
        };
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        return {
            success: false,
            error: 'Thiếu cấu hình Twilio trong biến môi trường.'
        };
    }

    try {
        const result = await getTwilioClient().messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
        });

        return {
            success: true,
            sid: result.sid,
            to
        };
    } catch (error) {
        console.error('[SMS ERROR]', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    sendSms
};
