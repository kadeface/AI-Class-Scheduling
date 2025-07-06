import { Router } from 'express';
import { getOverview } from '../controllers/statistics-controller';

const router = Router();

// GET /api/statistics/overview
router.get('/overview', getOverview);

export default router; 