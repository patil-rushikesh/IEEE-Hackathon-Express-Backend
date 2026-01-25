import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError, HttpStatus } from '../utils/response';

/**
 * Get notifications for a user
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = req.params;

    const notifications = await prisma.notification.findMany({
      include: {
        statuses: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include user-specific status
    const userNotifications = notifications.map((notification: {
      id: string;
      title: string;
      message: string;
      type: string;
      createdAt: Date;
      statuses: { isRead: boolean; isPinned: boolean }[];
    }) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
      isRead: notification.statuses[0]?.isRead ?? false,
      isPinned: notification.statuses[0]?.isPinned ?? false,
    }));

    sendSuccess(res, { notifications: userNotifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    sendError(res, 'Failed to get notifications', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get unread notification count for a user
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = req.params;

    // Get all notification IDs
    const allNotifications = await prisma.notification.findMany({
      select: { id: true },
    });

    // Get read notification IDs for user
    const readStatuses = await prisma.notificationStatus.findMany({
      where: {
        userId,
        isRead: true,
      },
      select: { notificationId: true },
    });

    const readNotificationIds = new Set(readStatuses.map((s) => s.notificationId));
    const unreadCount = allNotifications.filter((n) => !readNotificationIds.has(n.id)).length;

    sendSuccess(res, { unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    sendError(res, 'Failed to get unread count', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: notificationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      sendError(res, 'User ID is required', HttpStatus.BAD_REQUEST);
      return;
    }

    await prisma.notificationStatus.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      update: { isRead: true },
      create: {
        notificationId,
        userId,
        isRead: true,
        isPinned: false,
      },
    });

    sendSuccess(res, null, 'Notification marked as read');
  } catch (error) {
    console.error('Mark as read error:', error);
    sendError(res, 'Failed to mark notification as read', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Toggle pin status for notification
 */
export const togglePin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: notificationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      sendError(res, 'User ID is required', HttpStatus.BAD_REQUEST);
      return;
    }

    // Get current status
    const currentStatus = await prisma.notificationStatus.findUnique({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
    });

    const newPinnedStatus = !(currentStatus?.isPinned ?? false);

    await prisma.notificationStatus.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      update: { isPinned: newPinnedStatus },
      create: {
        notificationId,
        userId,
        isRead: false,
        isPinned: newPinnedStatus,
      },
    });

    sendSuccess(res, { isPinned: newPinnedStatus }, 'Pin status toggled');
  } catch (error) {
    console.error('Toggle pin error:', error);
    sendError(res, 'Failed to toggle pin status', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Create notification
 */
export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message, type } = req.body;

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || 'info',
      },
    });

    // Publish to Redis for real-time updates
    try {
    } catch (redisError) {
      console.warn('Redis publish failed:', redisError);
      // Continue even if Redis fails
    }

    sendSuccess(res, { notification }, 'Notification created successfully', HttpStatus.CREATED);
  } catch (error) {
    console.error('Create notification error:', error);
    sendError(res, 'Failed to create notification', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Stream notifications using Server-Sent Events
 */
export const streamNotifications = async (req: Request, res: Response): Promise<void> => {
  const { id: userId } = req.params;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  // Subscribe to Redis notifications channel
  
  

  // Send heartbeat every 30 seconds
  const heartbeatInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
  }, 30000);

  // Cleanup on close
  req.on('close', async () => {
    clearInterval(heartbeatInterval);
  });
};

/**
 * Debug notification statuses (for development)
 */
export const debugNotificationStatuses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = req.params;

    const statuses = await prisma.notificationStatus.findMany({
      where: { userId },
      include: { notification: true },
    });

    sendSuccess(res, { statuses });
  } catch (error) {
    console.error('Debug notification statuses error:', error);
    sendError(res, 'Failed to get notification statuses', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
