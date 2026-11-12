import { env } from 'cloudflare:workers'

export class RecieptService {
    private baseURL = 'https://gateway-proveedores-api.onrender.com';
    private apiKey = env.TOKEN_SECRET_API_PROVEEDOR;

    private async fetchServiceSedapal(supplyCode: string) {
        const response = await fetch(`${this.baseURL}/recibo/sedapal/${supplyCode}`, {
            method: 'GET',
            headers: {
                'content-type': 'application/json',
                'x-api-key': this.apiKey
            }
        });
        if (!response.ok) {
            return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    private async fetchServiceCalidda(supplyCode: string, documentNumber: string, documentType: 'PE2' | 'PE1') {
        const response = await fetch(`${this.baseURL}/recibo/calidda/${supplyCode}`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': this.apiKey
            },
            body: JSON.stringify({
                'documentNumber': documentNumber,
                'documentType': documentType
            })
        });

        if (!response.ok) {
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);

    }

    async fetchReceipt(supplyCode: string, serviceName: string, documentNumber: string = '', documentType: string = '') {
        if (serviceName === 'sedapal') {
            return await this.fetchServiceSedapal(supplyCode);
        } else if (serviceName === 'calidda') {
            let docType: 'PE2' | 'PE1' = 'PE2';
            if (documentType === 'dni') {
                docType = 'PE2';
            } else if (documentType === 'ruc') {
                docType = 'PE1';
            }

            return await this.fetchServiceCalidda(supplyCode, documentNumber, docType);
        } else {
            throw new Error(`Service ${serviceName} not supported`);
        }
    }
}