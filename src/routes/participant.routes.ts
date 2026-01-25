import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { registerTeamValidator, submissionValidator } from '../middleware/validators';
import {
  registerTeam,
  getMyTeam,
  createOrUpdateSubmission,
  getSubmission,
} from '../handlers/participant.handler';
import { getDeadlines } from '../handlers/coordinator.handler';

const router = Router();

// Public routes
router.post('/register',  registerTeam);
router.get('/deadlines', getDeadlines);

// Protected routes (participant only)
router.use(authMiddleware('participant'));
router.get('/team', getMyTeam);
router.post('/submission', submissionValidator, createOrUpdateSubmission);
router.get('/submission', getSubmission);

export default router;
