import { config } from '../config';

export const authMiddleware = (req: { headers: { [x: string]: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error: string; }): any; new(): any; }; }; }, next: () => void) => {
    const apiKey = req.headers['apikey'];
    if (!apiKey || apiKey !== config.apiKey) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    next();
};