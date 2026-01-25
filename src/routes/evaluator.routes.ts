import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getEvaluationCriteria,
  createEvaluationCriteria,
  updateEvaluationCriteria,
  deleteEvaluationCriteria,
  getSubmissionsForEvaluation,
  submitEvaluation,
  getEvaluationsBySubmission,
  getMyEvaluations,
} from '../handlers/evaluator.handler';

const router = Router();

// All evaluator routes require evaluator role
router.use(authMiddleware('evaluator'));

// Evaluation criteria
router.get('/criteria', getEvaluationCriteria);
router.post('/criteria', createEvaluationCriteria);
router.put('/criteria/:id', updateEvaluationCriteria);
router.delete('/criteria/:id', deleteEvaluationCriteria);

// Submissions for evaluation
router.get('/submissions', getSubmissionsForEvaluation);

// Evaluations
router.post('/evaluate', submitEvaluation);
router.get('/evaluations/:submissionId', getEvaluationsBySubmission);
router.get('/my-evaluations', getMyEvaluations);

export default router;
