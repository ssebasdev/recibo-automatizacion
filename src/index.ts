export { WorkflowReceipt } from './workflow.receipt';
export { WorkflowReceiptRetry } from './workflow.receipt-retry';

interface UserService {
	usuario_id: number;
	nombre: string;
	chat_id: string;
	servicio_id: number;
	nombre_servicio: string;
	codigo_suministro: string;
	numero_documento: string | null;
	tipo_documento: string | null;
};

interface RecieptInfo {
	id: number;
	chat_id: string;
	detalle_ocr: string | null;
	bucket_url: string;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('HOLA ' + new Date().toISOString())
	},

	async scheduled(controller, env, ctx) {


		if (controller.cron === '0 7 10-20 * *') {
			const usersSevices = await env.DB_RECIBOS.prepare(`
			select
				u.id as usuario_id,
				u.nombre,
				u.chat_id,
				s.id as servicio_id,
				s.nombre as nombre_servicio,
				us.codigo_suministro,
				us.numero_documento,
				us.tipo_documento
			from usuarios_servicios us
				inner join usuarios u on us.usuario_id = u.id
				inner join servicios s on us.servicio_id = s.id
			where
				not exists (
					select
					1
					from recibo_notificaciones rn
					where
					periodo = strftime('%m-%Y', current_date)
					and rn.usuario_id = u.id and rn.servicio_id = s.id
				);
			`).all<UserService>();

			for (const userService of usersSevices.results) {
				const { codigo_suministro, nombre_servicio, usuario_id, servicio_id, numero_documento, tipo_documento, chat_id } = userService;
				await env.WORKFLOW_RECIBO_NOTIFICAR.create({
					id: crypto.randomUUID(),
					params: {
						supplyCode: codigo_suministro,
						serviceName: nombre_servicio,
						documentNumber: numero_documento ?? '',
						documentType: tipo_documento ?? '',
						userId: usuario_id,
						serviceId: servicio_id,
						chatId: chat_id,
					}
				});
			}
		}

		if (controller.cron === '0 8 10-20 * *') {
			const receipts = await env.DB_RECIBOS.prepare(`
				select
					rn.id,
					u.chat_id,
					rn.detalle_ocr,
					rn.bucket_url
				from recibo_notificaciones rn
					inner join usuarios u on u.id = rn.usuario_id
					inner join servicios s on s.id = rn.servicio_id
				where
					rn.enviado = false;`)
				.all<RecieptInfo>();

			for (const receipt of receipts.results) {
				const { id, chat_id, detalle_ocr, bucket_url } = receipt;
				await env.WORKFLOW_RECIBO_REINTENTAR.create({
					id: crypto.randomUUID(),
					params: {
						id,
						chatId: chat_id,
						detalleOcr: detalle_ocr,
						bucketUrl: bucket_url
					}
				})
			}
		}

	}
} satisfies ExportedHandler<Env>;