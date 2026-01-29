import { Client, LocalAuth, Events, Message, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import axios from 'axios';
import pino from 'pino';
import { config } from '../config';

const logger = pino({ transport: { target: 'pino-pretty' } });

export class WhatsAppService {
    private client: Client;
    private static instance: WhatsAppService;
    private isReady: boolean = false;
    private lastQR: string = '';

    private constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: './sessions' }),
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
            },
            puppeteer: {
                headless: true, // Mantén true para evitar distracciones
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--no-zygote',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
                ],
            }
        });
        this.initializeEvents();
    }

    // Singleton: Una sola instancia para todo el proyecto
    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    private initializeEvents() {
        // 1. Mostrar el QR para vinculación
        this.client.on(Events.QR_RECEIVED, (qr) => {
            this.lastQR = qr; // Guardamos el último QR generado
            logger.info('--- NUEVO QR RECIBIDO (Escanea para vincular JB ProAdvisor) ---');
            qrcode.generate(qr, { small: true });
            this.isReady = false;
        });

        // 2. Sesión autenticada (Paso intermedio)
        this.client.on(Events.AUTHENTICATED, () => {
            logger.info('🔒 Sesión de WhatsApp autenticada. Cargando base de datos interna...');
        });

        // 3. CLIENTE LISTO (Aquí es cuando ya puedes usar la API)
        this.client.on(Events.READY, () => {
            this.lastQR = ''; // Limpiamos el QR ya que no es necesario
            this.isReady = true; // Seteamos a true para permitir envíos
            logger.info('✅ WhatsApp Service: ¡ONLINE y listo para Sophielandia!');
        });

        // --- AGREGA ESTO AQUÍ PARA MONITOREAR EL CAMBIO DE ESTADO ---
        this.client.on('change_state', (state) => {
            logger.info(`Estatus de conexión: ${state}`);
            if (state === 'CONNECTED') {
                this.isReady = true; // Por si el evento READY falla, esto nos salva
            }
        });

        // 4. Manejo de mensajes entrantes (Webhook hacia n8n)
        this.client.on(Events.MESSAGE_RECEIVED, async (msg) => {
            await this.handleIncomingMessage(msg);
        });

        // 5. Gestión de fallos y desconexiones
        this.client.on(Events.AUTHENTICATION_FAILURE, (msg) => {
            this.isReady = false;
            logger.error(`❌ Fallo de autenticación: ${msg}`);
        });

        this.client.on(Events.DISCONNECTED, async (reason) => {
            this.isReady = false;
            this.lastQR = '';
            logger.warn(`⚠️ Cliente desconectado: ${reason}`);
            // Intentar reinicializar si es necesario
            if (config.webhookUrl) {
                try {
                    await axios.post(config.webhookUrl, {
                        event: 'device.disconnected',
                        reason: reason,
                        timestamp: new Date().toISOString(),
                        message: "🚨 ¡Alerta! El bot de JB ProAdvisor se ha desconectado. Es necesario re-vincular."
                    }, {
                        headers: { 'apikey': config.apiKey }
                    });
                    logger.info('🔔 Alerta de desconexión enviada a n8n');
                } catch (error: any) {
                    logger.error(`Error enviando alerta de desconexión: ${error.message}`);
                }
            }
        });

        // Dentro de initializeEvents, después de todos los .on(...)
        this.client.on('authenticated', () => {
            logger.info('🔒 Autenticado. Esperando estabilización...');

            // Si en 40 segundos no ha dado READY, lo forzamos preguntando al estado interno
            const interval = setInterval(async () => {
                try {
                    const state = await this.client.getState();
                    logger.info(`Estado actual: ${state}`);
                    if (state === 'CONNECTED') {
                        this.isReady = true;
                        logger.info('✅ SISTEMA RECUPERADO: Ya puedes enviar mensajes.');
                        clearInterval(interval);
                    }
                } catch (e) {
                    // Aún no está listo el objeto state, seguimos esperando
                }
            }, 10000);
        });
    }

    private async handleIncomingMessage(msg: Message) {
        // Evitamos procesar mensajes de grupos si no es necesario
        if (msg.from.includes('@g.us')) return;

        logger.info(`Mensaje entrante de ${msg.from}: ${msg.body}`);

        // Obtenemos el contacto de forma oficial
        const contact = await msg.getContact();
        const pushName = contact.pushname || 'Usuario Desconocido';
        // Si tenemos configurado un Webhook en el .env, enviamos los datos a n8n
        if (config.webhookUrl) {
            try {
                await axios.post(config.webhookUrl, {
                    from: msg.from,
                    body: msg.body,
                    pushName: pushName, // Usamos el nombre obtenido limpiamente
                    timestamp: msg.timestamp,
                    type: msg.type
                }, {
                    headers: { 'apikey': config.apiKey }
                });
            } catch (error: any) {
                logger.error(`Error al enviar Webhook a n8n: ${error.message}`);
            }
        }
    }

    // Método público para inicializar el cliente desde el server.ts
    public async initialize() {
        try {
            logger.info('Iniciando motor de WhatsApp...');
            await this.client.initialize();
        } catch (error: any) {
            logger.error(error, 'Error crítico al inicializar el cliente');
        }
    }

    // Método para enviar mensajes (Outbound)
    public async sendTextMessage(to: string, text: string) {
        if (!this.isReady) {
            throw new Error("El cliente aún no está listo (READY). Espera a que aparezca el log verde.");
        }

        try {
            // Limpiar número: quitar '+', espacios y guiones
            let number = to.replace(/\D/g, '');

            // Asegurar formato correcto @c.us
            const chatId = `${number}@c.us`;
            //const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

            const response = await this.client.sendMessage(chatId, text,
                {
                    linkPreview: false,
                    sendSeen: false
                }
            );

            logger.info(`✅ Mensaje enviado a ${chatId} [ID: ${response.id.id}]`);
            return response;
        } catch (error: any) {
            logger.error(error, `❌ Error enviando mensaje a ${to}`);
            throw error;
        }
    }

    public async sendMediaMessage(to: string, url: string, fileName: string, caption?: string) {
        if (!this.isReady) {
            throw new Error("El cliente aún no está listo (READY).");
        }

        try {
            let number = to.replace(/\D/g, '');
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

            // Descargamos el archivo desde la URL y lo convertimos a base64 automáticamente
            const media = await MessageMedia.fromUrl(url, { unsafeMime: true });

            // Seteamos el nombre con el que el usuario verá el archivo al descargar
            media.filename = fileName;

            const response = await this.client.sendMessage(chatId, media, {
                caption: caption,
                sendMediaAsDocument: true, // Esto fuerza a que se envíe como archivo y no como imagen/video
                sendSeen: false
            });

            logger.info(`✅ Documento [${fileName}] enviado a ${chatId}`);
            return response;
        } catch (error: any) {
            /*.error(error, `❌ Error enviando documento a ${to}`);
            throw error;*/
            // Manejo del error de interfaz pero confirmación de envío
            if (error.message.includes('markedUnread')) {
                logger.warn(`⚠️ Error de interfaz al enviar ${fileName}, pero el archivo probablemente salió.`);
                return { status: 'check_device', details: 'Envío de media procesado con bypass' };
            }

            logger.error(error, `❌ Error real enviando documento a ${to}`);
            throw error;
        }
    }

    // Método para obtener el estado y el QR
    public getStatus() {
        return {
            isReady: this.isReady,
            qr: this.lastQR,
            timestamp: new Date().toISOString()
        };
    }
}