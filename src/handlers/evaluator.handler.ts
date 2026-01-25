import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError, HttpStatus } from '../utils/response';

/**
 * Get evaluation criteria
 */
export const getEvaluationCriteria = async (req: Request, res: Response): Promise<void> => {
  try {
    const criteria = await prisma.evaluationCriteria.findMany({
      orderBy: { weightage: 'desc' },
    });

    sendSuccess(res, { criteria });
  } catch (error) {
    console.error('Get evaluation criteria error:', error);
    sendError(res, 'Failed to get evaluation criteria', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Create evaluation criteria
 */
export const createEvaluationCriteria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { criteria, weightage, description } = req.body;

    const newCriteria = await prisma.evaluationCriteria.create({
      data: {
        criteria,
        weightage,
        description,
      },
    });

    sendSuccess(res, { criteria: newCriteria }, 'Criteria created successfully', HttpStatus.CREATED);
  } catch (error) {
    console.error('Create evaluation criteria error:', error);
    sendError(res, 'Failed to create criteria', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update evaluation criteria
 */
export const updateEvaluationCriteria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { criteria, weightage, description } = req.body;

    const updatedCriteria = await prisma.evaluationCriteria.update({
      where: { id },
      data: {
        criteria,
        weightage,
        description,
      },
    });

    sendSuccess(res, { criteria: updatedCriteria }, 'Criteria updated successfully');
  } catch (error: any) {
    console.error('Update evaluation criteria error:', error);
    if (error.code === 'P2025') {
      sendError(res, 'Criteria not found', HttpStatus.NOT_FOUND);
      return;
    }
    sendError(res, 'Failed to update criteria', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Delete evaluation criteria
 */
export const deleteEvaluationCriteria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.evaluationCriteria.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Criteria deleted successfully');
  } catch (error: any) {
    console.error('Delete evaluation criteria error:', error);
    if (error.code === 'P2025') {
      sendError(res, 'Criteria not found', HttpStatus.NOT_FOUND);
      return;
    }
    sendError(res, 'Failed to delete criteria', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get submissions for evaluation
 */
export const getSubmissionsForEvaluation = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissions = await prisma.submission.findMany({
      where: {
        title: { not: null },
      },
      include: {
        team: {
          select: {
            id: true,
            teamName: true,
            theme: true,
          },
        },
        evaluations: {
          include: {
            scores: {
              include: {
                criteria: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { submissions });
  } catch (error) {
    console.error('Get submissions for evaluation error:', error);
    sendError(res, 'Failed to get submissions', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Submit evaluation
 */
export const submitEvaluation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', HttpStatus.UNAUTHORIZED);
      return;
    }

    const { submissionId, scores, comments } = req.body;

    if (!submissionId || !scores || !Array.isArray(scores)) {
      sendError(res, 'Invalid evaluation data', HttpStatus.BAD_REQUEST);
      return;
    }

    // Calculate total score based on weightage
    const criteria = await prisma.evaluationCriteria.findMany();
    let totalScore = 0;
    let totalWeightage = 0;

    for (const score of scores) {
      const criteriaItem = criteria.find((c) => c.id === score.criteriaId);
      if (criteriaItem) {
        totalScore += (score.score * criteriaItem.weightage) / 100;
        totalWeightage += criteriaItem.weightage;
      }
    }

    // Normalize if total weightage isn't 100
    if (totalWeightage > 0 && totalWeightage !== 100) {
      totalScore = (totalScore * 100) / totalWeightage;
    }

    // Create or update evaluation
    const evaluation = await prisma.$transaction(async (tx) => {
      // Check if evaluation exists
      const existingEvaluation = await tx.evaluation.findUnique({
        where: {
          submissionId_evaluatorId: {
            submissionId,
            evaluatorId: req.user!.userId,
          },
        },
      });

      let evaluationRecord;

      if (existingEvaluation) {
        // Delete existing scores
        await tx.evaluationScore.deleteMany({
          where: { evaluationId: existingEvaluation.id },
        });

        // Update evaluation
        evaluationRecord = await tx.evaluation.update({
          where: { id: existingEvaluation.id },
          data: {
            totalScore,
            comments,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new evaluation
        evaluationRecord = await tx.evaluation.create({
          data: {
            submissionId,
            evaluatorId: req.user!.userId,
            totalScore,
            comments,
          },
        });
      }

      // Create scores
      await tx.evaluationScore.createMany({
        data: scores.map((score: { criteriaId: string; score: number }) => ({
          evaluationId: evaluationRecord.id,
          criteriaId: score.criteriaId,
          score: score.score,
        })),
      });

      return evaluationRecord;
    });

    sendSuccess(res, { evaluation }, 'Evaluation submitted successfully');
  } catch (error) {
    console.error('Submit evaluation error:', error);
    sendError(res, 'Failed to submit evaluation', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get evaluations by submission
 */
export const getEvaluationsBySubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;

    const evaluations = await prisma.evaluation.findMany({
      where: { submissionId },
      include: {
        scores: {
          include: {
            criteria: true,
          },
        },
      },
    });

    sendSuccess(res, { evaluations });
  } catch (error) {
    console.error('Get evaluations error:', error);
    sendError(res, 'Failed to get evaluations', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get my evaluations (for evaluator)
 */
export const getMyEvaluations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', HttpStatus.UNAUTHORIZED);
      return;
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { evaluatorId: req.user.userId },
      include: {
        submission: {
          include: {
            team: {
              select: {
                id: true,
                teamName: true,
                theme: true,
              },
            },
          },
        },
        scores: {
          include: {
            criteria: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { evaluations });
  } catch (error) {
    console.error('Get my evaluations error:', error);
    sendError(res, 'Failed to get evaluations', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
