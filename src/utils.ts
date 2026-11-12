import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const tz = "America/Lima";
dayjs.tz.setDefault(tz);

export default dayjs;


export function formatMessageReciept(ocr: any): string | null {
    const parseOCR = JSON.parse(ocr ?? '{}');
    if (parseOCR === null || Object.keys(parseOCR).length === 0) {
        return null;
    }
    const { tipo_servicio, proveedor, numero_recibo_o_factura, numero_cliente, numero_medidor, fecha_emision, fecha_vencimiento, tarifa, subtotal, saldo_anterior, impuestos, total_a_pagar, moneda } = parseOCR;
    const { lectura_anterior, lectura_actual, consumo_total, unidad } = parseOCR.consumo;
    const message =
        `<b>RECIBO DE ${tipo_servicio.toUpperCase()} - ${proveedor}</b>
<b>📋 Datos del Recibo:</b>
• <b>Nº Factura:</b> <code>${numero_recibo_o_factura}</code>
• <b>Cliente:</b> <code>${numero_cliente}</code> | <b>Medidor:</b> <code>${numero_medidor}</code>
• <b>Vencimiento:</b> ${fecha_vencimiento} <i>(Emisión: ${fecha_emision})</i>

<b>📊 Consumo:</b>
• <b>Total:</b> ${consumo_total} ${unidad} <i>(Anterior: ${lectura_anterior} | Actual: ${lectura_actual})</i>
• <b>Tarifa:</b> ${tarifa}

<b>💳 Resumen de Pago:</b>
• <b>Subtotal:</b> ${moneda} ${subtotal ?? saldo_anterior}
• <b>IGV (18%):</b> ${moneda} ${impuestos}
💰 <b>TOTAL A PAGAR:</b> <b>${moneda} ${total_a_pagar}</b>
`;
    return message;
};

export function formatMessageRecieptError(id: string, error: string): string {
    const message =
        `<b>❌ ERROR AL PROCESAR EL RECIBO</b>
<b>Detalles del Error:</b>
• <b>ID:</b> ${id}
• <b>Mensaje:</b> ${error}
`;
    return message;
};