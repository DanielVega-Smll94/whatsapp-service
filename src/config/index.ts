import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    apiKey: process.env.API_KEY || 'mi-clave-secreta-provisoria',
    webhookUrl: process.env.WEBHOOK_URL || '',
    environment: process.env.NODE_ENV || 'development'
};