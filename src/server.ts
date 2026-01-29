import express from 'express';
import { config } from './config';
import { WhatsAppService } from './services/whatsapp.service';
import apiRoutes from './routes/api.routes';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });
const app = express();

// Middlewares
app.use(express.json());

// Rutas
app.use('/api/v1', apiRoutes);

// Función de arranque
const startServer = async () => {
    try {
        logger.info('Iniciando sistema para JB ProAdvisor...');

        // 1. Obtenemos la instancia del servicio de WhatsApp
        const waService = WhatsAppService.getInstance();

        // 2. IMPORTANTE: Arrancamos el motor de WhatsApp (esto generará el QR)
        await waService.initialize(); 

        // 3. Una vez que el motor inicia, levantamos la API Express
        app.listen(config.port, () => {
            logger.info(`🚀 [whatsapp-service]: Servidor listo en http://localhost:${config.port}`);
        });

    } catch (error: any) {
        // Corregido para que Pino no se queje del tipo 'unknown'
        logger.error(error, 'Error crítico al arrancar el servidor');
        process.exit(1);
    }
};

// Ejecutamos la función
startServer();