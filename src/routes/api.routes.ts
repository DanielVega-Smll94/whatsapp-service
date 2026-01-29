import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
const router = Router();
const messageController = new MessageController();

// Todas las rutas aquí dentro pedirán la apikey en el header
router.get('/status', authMiddleware, messageController.getQR);
router.post('/messages/send', authMiddleware, messageController.sendMessage);

export default router;