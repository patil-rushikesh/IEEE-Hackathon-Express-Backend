import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { sendSuccess, sendError, HttpStatus } from '../utils/response';
import { MemberRole, Gender } from '@prisma/client';
import cloudinary from '../config/cloudinary';

interface TeamMemberInput {
  fullName: string;
  email: string;
  gender: Gender;
  role: MemberRole;
  isIeeeMember?: string | boolean;
  ieeeNumber?: string;
  schoolStandard?: string;
  schoolIdPdf?: string;
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
    const body: RegisterTeamInput = {
      ...req.body,
      members: JSON.parse(req.body.members),
    }
    const files = (req as any).files as { [key: string]: any }

    if (body.members.length !== 6) {
      sendError(res, "Team must have exactly 6 members", HttpStatus.BAD_REQUEST)
      return
    }

    let teamLeaderCount = 0
    let schoolStudentCount = 0
    let femaleCount = 0

    // Create a map of uploaded files by field name (schoolIdPdf_0, schoolIdPdf_1, etc.)
    const fileMap = new Map<string, any>()
    if (files) {
      for (const fieldname in files) {
        if (fieldname.startsWith("schoolIdPdf_")) {
          const fileData = files[fieldname]
          // express-fileupload provides either a single file object or an array
          const file = Array.isArray(fileData) ? fileData[0] : fileData
          if (file) {
            fileMap.set(fieldname, file)
          }
        }
      }
    }
    // Upload files to Cloudinary first
    const uploadPromises = Array.from(fileMap.entries()).map(async ([fieldname, file]) => {
      return new Promise<{ fieldname: string; url: string }>((resolve, reject) => {
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'ieee-hackathon/school-ids',
            public_id: uniqueFileName,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              reject(error)
            } else {
              resolve({ fieldname, url: result!.secure_url })
            }
          }
        )

        uploadStream.on('error', (err) => {
          reject(err)
        })

        uploadStream.end(file.data)
      })
    })

    let cloudinaryUrls: { [key: string]: string } = {}
    try {
      const uploadResults = await Promise.all(uploadPromises)
      uploadResults.forEach(({ fieldname, url }) => {
        cloudinaryUrls[fieldname] = url
      })
    } catch (uploadError: any) {
      console.error("Cloudinary upload error:", uploadError)
      sendError(res, "Failed to upload files", HttpStatus.INTERNAL_SERVER_ERROR)
      return
    }

    for (let i = 0; i < body.members.length; i++) {
      const member = body.members[i]

      if (member.role === MemberRole.TeamLeader) {
        teamLeaderCount++
        if (!member.isIeeeMember || !member.ieeeNumber) {
          sendError(
            res,
            "Team Leader must be an IEEE member with valid membership number",
            HttpStatus.BAD_REQUEST
          )
          return
        }
      }

      if (member.role === MemberRole.SchoolStudent) {
        schoolStudentCount++
        if (!member.schoolStandard) {
          sendError(
            res,
            "School Student must have a valid school standard (7th-9th)",
            HttpStatus.BAD_REQUEST
          )
          return
        }

        // Get the uploaded PDF URL for this school student by index
        const pdfUrl = cloudinaryUrls[`schoolIdPdf_${i}`]
        
        if (!pdfUrl) {
          sendError(res, "School ID PDF is required for School Student", HttpStatus.BAD_REQUEST)
          return
        }

        member.schoolIdPdf = pdfUrl
      }

      if (member.gender === Gender.Female) femaleCount++
    }

    if (teamLeaderCount !== 1) {
      sendError(res, "Team must have exactly one Team Leader", HttpStatus.BAD_REQUEST)
      return
    }

    if (schoolStudentCount !== 1) {
      sendError(
        res,
        "Team must have exactly one School Student",
        HttpStatus.BAD_REQUEST
      )
      return
    }

    if (femaleCount === 0) {
      sendError(res, "Team must have at least one female member", HttpStatus.BAD_REQUEST)
      return
    }

    const existingTeam = await prisma.team.findUnique({
      where: { teamName: body.teamName },
    })

    if (existingTeam) {
      sendError(res, "Team name already exists", HttpStatus.CONFLICT)
      return
    }

    const team = await prisma.$transaction(async (tx) => {
      const membersToCreate = body.members.map((member) => ({
        fullName: member.fullName,
        email: member.email,
        gender: member.gender,
        role: member.role,
        isIeeeMember: member.isIeeeMember === "Yes" || member.isIeeeMember === true,
        ieeeNumber: member.ieeeNumber || null,
        schoolStandard: member.schoolStandard || null,
        schoolIdPdf: member.schoolIdPdf || null,
      }))
      
      const newTeam = await tx.team.create({
        data: {
          teamName: body.teamName,
          theme: body.theme,
          members: {
            create: membersToCreate,
          },
        },
        include: { members: true },
      })

      const teamLeader = body.members.find(
        (m: any) => m.role === MemberRole.TeamLeader
      )

      if (teamLeader) {
        await tx.user.create({
          data: {
            name: teamLeader.fullName,
            email: teamLeader.email,
            password: await hashPassword("qwert123"),
            role: "participant",
            teamId: newTeam.id,
          },
        })
      }

      return newTeam
    })

    sendSuccess(
      res,
      { teamId: team.id, teamName: team.teamName },
      "Team registered successfully",
      HttpStatus.CREATED
    )
  } catch (error: any) {
    console.error("Register team error:", error)
    sendError(res, "Failed to register team", HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

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
