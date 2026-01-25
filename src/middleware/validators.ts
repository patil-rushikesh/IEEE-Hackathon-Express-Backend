import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendError, HttpStatus } from '../utils/response';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    sendError(
      res,
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      errors.array()
    );
    return;
  }
  
  next();
};

// ==================== AUTH VALIDATORS ====================

export const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  handleValidationErrors,
];

// ==================== USER VALIDATORS ====================

export const addUserValidator = [
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Name is required'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['admin', 'coordinator', 'evaluator', 'participant', 'head'])
    .withMessage('Valid role is required'),
  handleValidationErrors,
];

export const editUserValidator = [
  body('id')
    .isUUID()
    .withMessage('Valid user ID is required'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Name cannot be empty'),
  body('role')
    .optional()
    .isIn(['admin', 'coordinator', 'evaluator', 'participant', 'head'])
    .withMessage('Valid role is required'),
  handleValidationErrors,
];

// ==================== TEAM VALIDATORS ====================

export const registerTeamValidator = [
  body('teamName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Team name is required'),
  body('theme')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Theme is required'),
  body('members')
    .isArray({ min: 6, max: 6 })
    .withMessage('Team must have exactly 6 members'),
  body('members.*.fullName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Member full name is required'),
  body('members.*.email')
    .isEmail()
    .withMessage('Valid member email is required'),
  body('members.*.gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Valid gender is required'),
  body('members.*.role')
    .isIn(['TeamLeader', 'TeamMember', 'SchoolStudent'])
    .withMessage('Valid member role is required'),
  body('facultyMentor.name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Faculty mentor name is required'),
  body('facultyMentor.email')
    .isEmail()
    .withMessage('Valid faculty mentor email is required'),
  body('facultyMentor.facultyId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Faculty ID is required'),
  body('communityRepresentative.name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Community representative name is required'),
  body('communityRepresentative.email')
    .isEmail()
    .withMessage('Valid community representative email is required'),
  body('communityRepresentative.affiliation')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Community representative affiliation is required'),
  handleValidationErrors,
];

// ==================== ANNOUNCEMENT VALIDATORS ====================

export const createAnnouncementValidator = [
  body('title')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Title is required'),
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content is required'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Valid status is required'),
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  handleValidationErrors,
];

// ==================== DEADLINE VALIDATORS ====================

export const updateDeadlineValidator = [
  body('registrationStart')
    .optional()
    .isISO8601()
    .withMessage('Valid registration start date is required'),
  body('registrationEnd')
    .optional()
    .isISO8601()
    .withMessage('Valid registration end date is required'),
  body('submissionDeadline')
    .optional()
    .isISO8601()
    .withMessage('Valid submission deadline is required'),
  body('evaluationStart')
    .optional()
    .isISO8601()
    .withMessage('Valid evaluation start date is required'),
  body('evaluationEnd')
    .optional()
    .isISO8601()
    .withMessage('Valid evaluation end date is required'),
  body('resultDeclaration')
    .optional()
    .isISO8601()
    .withMessage('Valid result declaration date is required'),
  handleValidationErrors,
];

// ==================== SUBMISSION VALIDATORS ====================

export const submissionValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Title cannot be empty'),
  body('tagline')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Tagline must be less than 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('problemStatement')
    .optional()
    .trim(),
  body('demoVideoUrl')
    .optional()
    .isURL()
    .withMessage('Valid demo video URL is required'),
  body('liveLinkUrl')
    .optional()
    .isURL()
    .withMessage('Valid live link URL is required'),
  body('codeRepoUrl')
    .optional()
    .isURL()
    .withMessage('Valid code repository URL is required'),
  handleValidationErrors,
];

// ==================== NOTIFICATION VALIDATORS ====================

export const createNotificationValidator = [
  body('title')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Title is required'),
  body('message')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Message is required'),
  body('type')
    .optional()
    .isIn(['info', 'warning', 'success', 'error'])
    .withMessage('Valid notification type is required'),
  handleValidationErrors,
];

// ==================== PARAM VALIDATORS ====================

export const idParamValidator = [
  param('id')
    .isUUID()
    .withMessage('Valid ID is required'),
  handleValidationErrors,
];
