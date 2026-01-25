import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError, HttpStatus } from '../utils/response';

/**
 * Get deadlines
 */
export const getDeadlines = async (req: Request, res: Response): Promise<void> => {
  try {
    const deadline = await prisma.deadline.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!deadline) {
      sendSuccess(res, { deadline: null });
      return;
    }

    sendSuccess(res, { deadline });
  } catch (error) {
    console.error('Get deadlines error:', error);
    sendError(res, 'Failed to get deadlines', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update deadlines
 */
export const updateDeadlines = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      registrationStart,
      registrationEnd,
      submissionDeadline,
      evaluationStart,
      evaluationEnd,
      resultDeclaration,
    } = req.body;

    // console.log('Updating deadlines with data:', req.body);
    // Try to find existing deadline
    const existingDeadline = await prisma.deadline.findFirst();

    let deadline;
    if (existingDeadline) {
      // Update existing deadline
      deadline = await prisma.deadline.update({
        where: { id: existingDeadline.id },
        data: {
          registrationStart: registrationStart ? new Date(registrationStart) : undefined,
          registrationEnd: registrationEnd ? new Date(registrationEnd) : undefined,
          submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : undefined,
          evaluationStart: evaluationStart ? new Date(evaluationStart) : undefined,
          evaluationEnd: evaluationEnd ? new Date(evaluationEnd) : undefined,
          resultDeclaration: resultDeclaration ? new Date(resultDeclaration) : undefined,
        },
      });
    } else {
      // Create new deadline
      deadline = await prisma.deadline.create({
        data: {
          registrationStart: new Date(registrationStart),
          registrationEnd: new Date(registrationEnd),
          submissionDeadline: new Date(submissionDeadline),
          evaluationStart: new Date(evaluationStart),
          evaluationEnd: new Date(evaluationEnd),
          resultDeclaration: new Date(resultDeclaration),
        },
      });
    }

    sendSuccess(res, { deadline }, 'Deadlines updated successfully');
  } catch (error) {
    console.error('Update deadlines error:', error);
    sendError(res, 'Failed to update deadlines', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get announcements for coordinator
 */
export const getAnnouncementsForCoordinator = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    sendError(res, 'Failed to get announcements', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Create announcement
 */
export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, roles, status } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        roles: roles || [],
        status: status || 'draft',
      },
    });

    sendSuccess(res, { announcement }, 'Announcement created successfully', HttpStatus.CREATED);
  } catch (error) {
    console.error('Create announcement error:', error);
    sendError(res, 'Failed to create announcement', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update announcement
 */
export const updateAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, title, content, roles, status } = req.body;

    if (!id) {
      sendError(res, 'Announcement ID is required', HttpStatus.BAD_REQUEST);
      return;
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        content,
        roles,
        status,
        updatedAt: new Date(),
      },
    });

    sendSuccess(res, { announcement }, 'Announcement updated successfully');
  } catch (error: any) {
    console.error('Update announcement error:', error);
    if (error.code === 'P2025') {
      sendError(res, 'Announcement not found', HttpStatus.NOT_FOUND);
      return;
    }
    sendError(res, 'Failed to update announcement', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Announcement deleted successfully');
  } catch (error: any) {
    console.error('Delete announcement error:', error);
    if (error.code === 'P2025') {
      sendError(res, 'Announcement not found', HttpStatus.NOT_FOUND);
      return;
    }
    sendError(res, 'Failed to delete announcement', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
