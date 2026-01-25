import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { sendSuccess, sendError, HttpStatus } from '../utils/response';

/**
 * Add a new user (admin only)
 */
export const addUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      sendError(res, 'User with this email already exists', HttpStatus.CONFLICT);
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    sendSuccess(res, { user }, 'User added successfully', HttpStatus.CREATED);
  } catch (error) {
    console.error('Add user error:', error);
    sendError(res, 'Failed to add user', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get all users (admin only)
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { deleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { users });
  } catch (error) {
    console.error('Get users error:', error);
    sendError(res, 'Failed to get users', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Delete a user (soft delete)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.body;

    if (!id) {
      sendError(res, 'ID is required', HttpStatus.BAD_REQUEST);
      return;
    }

    const result = await prisma.user.update({
      where: { id },
      data: {
        deleted: true,
        updatedAt: new Date(),
      },
    });

    if (!result) {
      sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      return;
    }

    sendSuccess(res, null, 'User deleted successfully');
  } catch (error: any) {
    console.error('Delete user error:', error);
    if (error.code === 'P2025') {
      sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      return;
    }
    sendError(res, 'Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Edit user details
 */
export const editUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, email, name, role } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;

    // Check if there's anything to update besides updatedAt
    if (Object.keys(updateData).length === 1) {
      sendError(res, 'No fields to update', HttpStatus.BAD_REQUEST);
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, { user }, 'User updated successfully');
  } catch (error: any) {
    console.error('Edit user error:', error);
    if (error.code === 'P2025') {
      sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      return;
    }
    sendError(res, 'Failed to update user', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Reset user password (admin/coordinator)
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const defaultPassword = newPassword || 'hackathon@123';
    const hashedPassword = await hashPassword(defaultPassword);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    sendSuccess(res, null, 'Password reset successfully');
  } catch (error: any) {
    console.error('Reset password error:', error);
    if (error.code === 'P2025') {
      sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      return;
    }
    sendError(res, 'Failed to reset password', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
