import { env } from 'cloudflare:workers'

export class TelegramSerice {
    private baseURL = 'https://gateway-telegram.sebastiansanchez-correo.workers.dev';
    private accessClientId = env.ACCESS_CLIENT_ID_CLOUDFLARE;
    private accessClientSecret = env.ACCESS_CLIENT_SECRET_CLOUDFLARE;

    async sendMessage(chatId: string, message: string) {
        const response = await fetch(`${this.baseURL}/telegram/send-message`, {
            method: 'POST',
            headers: {
                'CF-Access-Client-Id': this.accessClientId,
                'CF-Access-Client-Secret': this.accessClientSecret,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: chatId,
                message: message
            })
        });

        const result = await response.json() as { ok: boolean, status: number };

        if (result) {
            return result.ok;
        }
    }


    async sendDocument(chatId: string, documentBase64: Blob, fileName: string) {
        const formData = new FormData();
        formData.append('chatId', chatId);
        formData.append('document', documentBase64, fileName);

        const response = await fetch(`${this.baseURL}/telegram/send-document`, {
            method: 'POST',
            headers: {
                'CF-Access-Client-Id': this.accessClientId,
                'CF-Access-Client-Secret': this.accessClientSecret
            },
            body: formData
        });

        const result = await response.json() as { ok: boolean, status: number };

        if (result) {
            return result.ok;
        }
    }
}