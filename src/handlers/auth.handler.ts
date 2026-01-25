import { Request, Response } from "express";
import prisma from "../config/database";
import { generateToken } from "../utils/jwt";
import { comparePassword } from "../utils/password";
import { sendSuccess, sendError, HttpStatus } from "../utils/response";

/**
 * Login handler
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        email,
        deleted: false,
      },
    });

    if (!user) {
      sendError(res, "Invalid email or password", HttpStatus.UNAUTHORIZED);
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      sendError(res, "Invalid email or password", HttpStatus.UNAUTHORIZED);
      return;
    }

    const token = generateToken(user.id, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const userInfo = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { token, user: userInfo }, "Login successful");
  } catch (error) {
    console.error("Login error:", error);
    sendError(res, "Login failed", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Validate user token
 */
export const validateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "User not authenticated", HttpStatus.UNAUTHORIZED);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId, deleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      sendError(res, "User not found", HttpStatus.NOT_FOUND);
      return;
    }

    // Get the token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    sendSuccess(res, {
      user,
      token,
    });
  } catch (error) {
    console.error("Validate user error:", error);
    sendError(res, "Validation failed", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Logout handler
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear cookies
    res.cookie("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 0,
    });

    res.cookie("role", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 0,
    });

    res.cookie("user", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 0,
    });

    sendSuccess(
      res,
      {
        COOKIES_TO_CLEAR: ["access_token", "role", "user"],
      },
      "Logout successful",
    );
  } catch (error) {
    console.error("Logout error:", error);
    sendError(res, "Logout failed", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Change password
 */
export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      sendError(res, "User not authenticated", HttpStatus.UNAUTHORIZED);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      sendError(res, "User not found", HttpStatus.NOT_FOUND);
      return;
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      sendError(res, "Current password is incorrect", HttpStatus.UNAUTHORIZED);
      return;
    }

    // Hash new password
    const { hashPassword } = await import("../utils/password");
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    sendSuccess(res, null, "Password changed successfully");
  } catch (error) {
    console.error("Change password error:", error);
    sendError(
      res,
      "Failed to change password",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};
