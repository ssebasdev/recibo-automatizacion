import { GoogleGenAI } from '@google/genai';
import { env } from 'cloudflare:workers';

const PROMPT = `Eres un asistente experto en extracción de datos de recibos de servicios públicos (luz, agua, gas, internet, teléfono, etc.). Analiza el recibo adjunto y extrae la información en el formato JSON indicado abajo.

REGLAS:
- Extrae solo lo que aparece en el documento. Si un dato no está o no es legible, usa null. Nunca inventes ni deduzcas valores.
- Fechas en formato: DD-MM-AAAA.
- Montos como números con punto decimal, sin símbolos ni separadores de miles (ej: 1234.56).
- Si hay varios montos que parezcan "total", usa el que corresponda a "total a pagar" o equivalente, y menciona la duda en "observaciones".
- Conserva los nombres de conceptos tal como aparecen en el recibo.
- Responde únicamente con el JSON, sin texto adicional ni bloques de código.
- Numero cliente solo son numeros sin espacios ni guiones

FORMATO DE SALIDA:
{
  "tipo_servicio": "luz | agua | gas | otro",
  "proveedor": "",
  "numero_cliente": "",
  "numero_medidor": "",
  "numero_recibo_o_factura": "",
  "periodo_facturacion": {
    "inicio": "",
    "fin": ""
  },
  "fecha_emision": "",
  "fecha_vencimiento": "",
  "consumo": {
    "lectura_anterior": null,
    "lectura_actual": null,
    "consumo_total": null,
    "unidad": "kWh | m3 | otro"
  },
  "tarifa": "",
  "desglose_cargos": [
    {
      "concepto": "",
      "monto": 0.00
    }
  ],
  "subtotal": null,
  "impuestos": null,
  "saldo_anterior": null,
  "total_a_pagar": null,
  "moneda": "PEN | USD | otro",
}`

const ai = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY });

export async function processRecieptOCR(fileBase64: string) {
  const interaccion = await ai.interactions.create({
    model: 'gemini-3.1-flash-lite',
    input: [
      { type: 'text', text: PROMPT },
      { type: 'document', data: fileBase64, mime_type: 'application/pdf' }
    ]
  });
  console.log(interaccion);
  return interaccion.output_text;
}
