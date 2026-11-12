import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import { TelegramSerice } from "./telegram";
import { formatMessageReciept } from "./utils";
import { NonRetryableError } from "cloudflare:workflows";

interface Params {
    id: number;
    chatId: string;
    detalleOcr: string | null;
    bucketUrl: string;
}
const config: WorkflowStepConfig = {
    retries: {
        limit: 3,
        delay: 5000,
    },
    timeout: "5 minutes",

}
export class WorkflowReceiptRetry extends WorkflowEntrypoint<Env, Params> {
    async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
        const { id, chatId, detalleOcr, bucketUrl } = event.payload;
        const telegram = new TelegramSerice();

        await step.do('send receipt notification - message', config, async (ctx) => {
            const message = formatMessageReciept(detalleOcr);

            if (message === null) {
                console.log(event.instanceId, typeof detalleOcr)
                throw new NonRetryableError('El OCR del recibo no es valido');
            }

            const statusMessage = await telegram.sendMessage(chatId, message);

            if (!statusMessage) {
                throw new Error('No se pudo enviar el mensaje de notificación al usuario.');
            }

        });

        await step.sleep('wait 3 seconds', 3000);



        await step.do('send receipt notification - document', config, async (ctx) => {
            const file = await this.env.R2_RECIBO.get(bucketUrl);
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const statusDocument = await telegram.sendDocument(chatId, blob, bucketUrl.split('/').pop() || 'recibo.pdf');
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
                .bind(id)
                .run();
        });
    }
}