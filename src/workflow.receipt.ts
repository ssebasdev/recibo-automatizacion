import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep, WorkflowStepConfig } from 'cloudflare:workers';
import { RecieptService } from './receipt.service';
import { TelegramSerice } from './telegram';
import { processRecieptOCR } from './ai.google';
import dayjs, { formatMessageReciept, formatMessageRecieptError } from './utils';
import { NonRetryableError } from 'cloudflare:workflows';

interface Params {
    supplyCode: string;
    serviceName: string;
    documentNumber: string;
    documentType: string;
    userId: number;
    serviceId: number;
    chatId: string;
}

const config: WorkflowStepConfig = {
    retries: {
        limit: 3,
        delay: 5000,
    },
    timeout: "5 minutes",

}

export class WorkflowReceipt extends WorkflowEntrypoint<Env, Params> {
    async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
        const { supplyCode, serviceName, documentNumber, documentType, userId, serviceId, chatId } = event.payload;

        const telegram = new TelegramSerice();


        const file = await step.do('download receipt', config,
            async (ctx) => {
                if (ctx.attempt == 3) {
                    const message = formatMessageRecieptError(event.instanceId, '3 Intentos fallidos al descargar el recibo');
                    await telegram.sendMessage(this.env.CHAT_ID_LOGS_TELEGRAM, message);

                    throw new NonRetryableError('No se puedo descargar el recibo después de 3 intentos, se detiene la ejecución del workflow.');
                }
                const receiptService = new RecieptService();
                const file = await receiptService.fetchReceipt(supplyCode, serviceName, documentNumber ?? '', documentType ?? '')
                if (file === null) {
                    throw new NonRetryableError('No se encontro el recibo para el suministro: ' + supplyCode + ' y servicio: ' + serviceName);
                }
                return file;
            });

        await step.sleep('wait 3 seconds', 3000);

        const keyR2 = await step.do('upload receipt to R2', config, async (ctx) => {
            const currentDate = dayjs.tz();

            const fileName = `/${currentDate.year()}/${supplyCode}/${serviceName}_${currentDate.year()}-${currentDate.format('MM')}.pdf`;
            const bucket = await this.env.R2_RECIBO.put(fileName, file, {
                httpMetadata: {
                    contentType: 'application/pdf',
                },
                customMetadata: {
                    usuario_id: userId.toString(),
                    servicio_id: serviceId.toString()
                }
            });

            return bucket.key;
        });

        const lastKey = await step.do('save receipt info to database', config, async (ctx) => {
            const result = await this.env.DB_RECIBOS.prepare(`
						insert into recibo_notificaciones (usuario_id, servicio_id, bucket_url, periodo)
						values (?, ?, ?, strftime('%m-%Y', current_date))
                `)
                .bind(userId, serviceId, keyR2)
                .run();
            return result.meta.last_row_id;
        });

        await step.sleep('wait 3 seconds', 3000);

        const ocr = await step.do('process receipt OCR', config, async (ctx) => {
            const file = await this.env.R2_RECIBO.get(keyR2);
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                const fileBase64 = Buffer.from(arrayBuffer).toString('base64');

                const ocr = await processRecieptOCR(fileBase64);
                return ocr;
            }
        });

        await step.sleep('wait 3 seconds', 3000);

        await step.do('save receipt OCR to database', config, async (ctx) => {
            await this.env.DB_RECIBOS.prepare(`
                        update recibo_notificaciones set detalle_ocr = ?
                        where id = ?
                    `)
                .bind(ocr, lastKey)
                .run();
        });

        await step.do('send receipt notification - message', config, async (ctx) => {
            const message = formatMessageReciept(ocr);
            if (message === null) {
                console.log(event.instanceId, typeof ocr)
                throw new NonRetryableError('El OCR del recibo no es valido');
            }

            const statusMessage = await telegram.sendMessage(chatId, message);
            if (!statusMessage) {
                throw new Error('No se pudo enviar el mensaje de notificación al usuario.');
            }

        });

        await step.do('send receipt notification - document', config, async (ctx) => {
            const file = await this.env.R2_RECIBO.get(keyR2);
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const statusDocument = await telegram.sendDocument(chatId, blob, keyR2.split('/').pop() || 'recibo.pdf');
                if (!statusDocument) {
                    throw new Error('No se pudo enviar el documento al usuario.');
                }
            }
        })

        await step.sleep('wait 3 seconds', 3000);

        await step.do('save receipt notification - status', config, async (ctx) => {
            await this.env.DB_RECIBOS.prepare(`
                        update recibo_notificaciones set enviado = 1
                        where id = ?
                    `)
                .bind(lastKey)
                .run();
        });
    }
}