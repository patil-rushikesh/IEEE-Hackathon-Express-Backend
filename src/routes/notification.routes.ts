import { Router } from 'express';
import { createNotificationValidator } from '../middleware/validators';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  togglePin,
  createNotification,
  streamNotifications,
  debugNotificationStatuses,
} from '../handlers/notification.handler';

const router = Router();

// SSE stream endpoint
router.get('/stream/:id', streamNotifications);

// Notification endpoints
router.get('/:id', getNotifications);
router.get('/:id/unread-count', getUnreadCount);
router.get('/:id/debug', debugNotificationStatuses);
router.put('/:id/read', markAsRead);
router.put('/:id/pin', togglePin);
router.post('/create', createNotificationValidator, createNotification);

export default router;
