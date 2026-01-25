import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { sendSuccess, sendError, HttpStatus } from '../utils/response';
import { MemberRole, Gender } from '@prisma/client';

interface TeamMemberInput {
  fullName: string;
  email: string;
  gender: Gender;
  role: MemberRole;
  isIeeeMember?: boolean;
  ieeeNumber?: string;
  schoolStandard?: string;
}

interface RegisterTeamInput {
  teamName: string;
  theme: string;
  members: TeamMemberInput[];
  facultyMentor: {
    name: string;
    email: string;
    facultyId: string;
  };
  communityRepresentative: {
    name: string;
    email: string;
    affiliation: string;
  };
}

/**
 * Register a new team
 */
export const registerTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: RegisterTeamInput = req.body;

    if (body.members.length !== 6) {
      sendError(res, 'Team must have exactly 6 members', HttpStatus.BAD_REQUEST);
      return;
    }

    // Validate team composition
    let teamLeaderCount = 0;
    let schoolStudentCount = 0;
    let femaleCount = 0;

    for (const member of body.members) {
      if (member.role === MemberRole.TeamLeader) {
        teamLeaderCount++;
        // Team leader must be IEEE member
        if (!member.isIeeeMember || !member.ieeeNumber) {
          sendError(
            res,
            'Team Leader must be an IEEE member with valid membership number',
            HttpStatus.BAD_REQUEST
          );
          return;
        }
      }

      if (member.role === MemberRole.SchoolStudent) {
        schoolStudentCount++;
        if (!member.schoolStandard) {
          sendError(
            res,
            'School Student must have a valid school standard (6th-9th)',
            HttpStatus.BAD_REQUEST
          );
          return;
        }
      }

      if (member.gender === Gender.Female) {
        femaleCount++;
      }
    }

    // console.log('Register team request body:', body);
    if (teamLeaderCount !== 1) {
      sendError(res, 'Team must have exactly one Team Leader', HttpStatus.BAD_REQUEST);
      return;
    }

    if (schoolStudentCount === 0) {
      sendError(
        res,
        'Team must have at least one School Student (6th-9th standard)',
        HttpStatus.BAD_REQUEST
      );
      return;
    }

    if (femaleCount === 0) {
      sendError(res, 'Team must have at least one female member', HttpStatus.BAD_REQUEST);
      return;
    }

    // Check if team name already exists
    const existingTeam = await prisma.team.findUnique({
      where: { teamName: body.teamName },
    });

    if (existingTeam) {
      sendError(res, 'Team name already exists', HttpStatus.CONFLICT);
      return;
    }

    

    // Create team with all related data in a transaction
    const team = await prisma.$transaction(async (tx) => {
      // Create team
      const newTeam = await tx.team.create({
        data: {
          teamName: body.teamName,
          theme: body.theme,
          members: {
            create: body.members.map((member:any) => ({
              fullName: member.fullName,
              email: member.email,
              gender: member.gender,
              role: member.role,
              isIeeeMember: member.isIeeeMember==="Yes"?true:false,
              ieeeNumber: member.ieeeNumber,
              schoolStandard: member.schoolStandard,
            })),
          },
          facultyMentor: {
            create: {
              name: body.facultyMentor.name,
              email: body.facultyMentor.email,
              facultyId: body.facultyMentor.facultyId,
            },
          },
          communityRepresentative: {
            create: {
              name: body.communityRepresentative.name,
              email: body.communityRepresentative.email,
              affiliation: body.communityRepresentative.affiliation,
            },
          },
        },
        include: {
          members: true,
          facultyMentor: true,
          communityRepresentative: true,
        },
      });

      // Find team leader and create user account
      const teamLeader = body.members.find((m:any) => m.role === 'TeamLeader');
      if (teamLeader) {
        const hashedPassword = await hashPassword('qwert123');
        await tx.user.create({
          data: {
            name: teamLeader.fullName,
            email: teamLeader.email,
            password: hashedPassword,
            role: 'participant',
            teamId: newTeam.id,
          },
        });
      }

      return newTeam;
    });

    sendSuccess(
      res,
      {
        teamId: team.id,
        teamName: team.teamName,
      },
      'Team registered successfully',
      HttpStatus.CREATED
    );
  } catch (error: any) {
    console.error('Register team error:', error);
    if (error.code === 'P2002') {
      sendError(res, 'Team name already exists', HttpStatus.CONFLICT);
      return;
    }
    sendError(res, 'Failed to register team', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get all teams
 */
export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: true,
        facultyMentor: true,
        communityRepresentative: true,
        submission: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { teams });
  } catch (error) {
    console.error('Get teams error:', error);
    sendError(res, 'Failed to get teams', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get team by ID
 */
export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: true,
        facultyMentor: true,
        communityRepresentative: true,
        submission: true,
      },
    });

    if (!team) {
      sendError(res, 'Team not found', HttpStatus.NOT_FOUND);
      return;
    }

    sendSuccess(res, { team });
  } catch (error) {
    console.error('Get team error:', error);
    sendError(res, 'Failed to get team', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get participant's team (for logged-in participant)
 */
export const getMyTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', HttpStatus.UNAUTHORIZED);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      sendError(res, 'No team associated with this user', HttpStatus.NOT_FOUND);
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      include: {
        members: true,
        facultyMentor: true,
        communityRepresentative: true,
        submission: true,
      },
    });

    if (!team) {
      sendError(res, 'Team not found', HttpStatus.NOT_FOUND);
      return;
    }

    sendSuccess(res, { team });
  } catch (error) {
    console.error('Get my team error:', error);
    sendError(res, 'Failed to get team', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Create or update submission
 */
export const createOrUpdateSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', HttpStatus.UNAUTHORIZED);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      sendError(res, 'No team associated with this user', HttpStatus.NOT_FOUND);
      return;
    }

    const {
      title,
      tagline,
      description,
      problemStatement,
      demoVideoUrl,
      liveLinkUrl,
      codeRepoUrl,
      pptUrl,
    } = req.body;

    const submission = await prisma.submission.upsert({
      where: { teamId: user.teamId },
      update: {
        title,
        tagline,
        description,
        problemStatement,
        demoVideoUrl,
        liveLinkUrl,
        codeRepoUrl,
        pptUrl,
        updatedAt: new Date(),
      },
      create: {
        teamId: user.teamId,
        title,
        tagline,
        description,
        problemStatement,
        demoVideoUrl,
        liveLinkUrl,
        codeRepoUrl,
        pptUrl,
      },
    });

    sendSuccess(res, { submission }, 'Submission saved successfully');
  } catch (error) {
    console.error('Create/update submission error:', error);
    sendError(res, 'Failed to save submission', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
export const getSubmission = async(req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', HttpStatus.UNAUTHORIZED);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      sendError(res, 'No team associated with this user', HttpStatus.NOT_FOUND);
      return;
    }

    const submission = await prisma.submission.findUnique({
      where: { teamId: user.teamId },
    });

    if (!submission) {
      sendError(res, 'Submission not found', HttpStatus.NOT_FOUND);
      return;
    }

    sendSuccess(res, { submission });
  } catch (error) {
    console.error('Get submission error:', error);
    sendError(res, 'Failed to get submission', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};



/**
 * Get all submissions (for coordinators/evaluators)
 */
export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        team: {
          include: {
            members: true,
          },
        },
        evaluations: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    sendError(res, 'Failed to get submissions', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
