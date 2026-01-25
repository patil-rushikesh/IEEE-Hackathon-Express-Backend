import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import participantRoutes from './participant.routes';
import coordinatorRoutes from './coordinator.routes';
import evaluatorRoutes from './evaluator.routes';
import notificationRoutes from './notification.routes';

const router: Router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Register all routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/participant', participantRoutes);
router.use('/coordinator', coordinatorRoutes);
router.use('/evaluator', evaluatorRoutes);
router.use('/notifications', notificationRoutes);

export default router;
