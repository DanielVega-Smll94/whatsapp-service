import { WhatsAppService } from '../services/whatsapp.service';

export class MessageController {
    private waService = WhatsAppService.getInstance();

    public sendMessage = async (req: any, res: any) => {
        try {
            const { number, message, mediaUrl, fileName } = req.body;

            if (!number) return res.status(400).json({ error: 'Número es requerido.', success: false });

            // Si viene mediaUrl, enviamos como documento (PDF, etc.)
            if (mediaUrl) {
                await this.waService.sendMediaMessage(number, mediaUrl, fileName || 'documento.pdf', message);
            } else {
                // Si no, enviamos texto normal
                await this.waService.sendTextMessage(number, message);
            }

            return res.status(200).json({ status: 'success', success: true, message: 'Mensaje enviado correctamente.' });
        } catch (error: any) {
            return res.status(500).json({ error: 'Error interno', details: error.message, success: false });
        }
    }

    public getQR = async (req: any, res: any) => {
        try {
            const status = this.waService.getStatus();

            if (status.isReady) {
                return res.status(200).json({ status: 'ready', message: 'WhatsApp ya está vinculado.' });
            }

            if (!status.qr) {
                return res.status(404).json({ status: 'loading', message: 'Esperando a que el motor genere un QR...' });
            }

            // Si quieres devolver el string del QR para procesarlo (ej. con una librería en el frontend)
            return res.status(200).json({
                status: 'qr_ready',
                qr: status.qr
            });

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}