import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createAnnouncementValidator,
  updateDeadlineValidator,
} from '../middleware/validators';
import {
  getDeadlines,
  updateDeadlines,
  getAnnouncementsForCoordinator,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../handlers/coordinator.handler';
import { getTeams, getSubmissions } from '../handlers/participant.handler';
import { resetUserPassword } from '../handlers/admin.handler';

const router = Router();

// All coordinator routes require coordinator role
router.get('/deadlines', getDeadlines);
router.use(authMiddleware('coordinator'));

// Deadline management
router.put('/deadlines', updateDeadlineValidator, updateDeadlines);

// Password reset
router.put('/:id/reset-password', resetUserPassword);

// Team and submission management
router.get('/teams', getTeams);
router.get('/submissions', getSubmissions);

// Announcement management
router.get('/announcements', getAnnouncementsForCoordinator);
router.post('/announcements', createAnnouncementValidator, createAnnouncement);
router.put('/announcement', updateAnnouncement);
router.delete('/announcement/:id', deleteAnnouncement);

export default router;
