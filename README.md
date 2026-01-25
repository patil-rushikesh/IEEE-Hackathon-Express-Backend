# IEEE Hackathon Express Backend

A robust Express.js backend with Prisma ORM for the IEEE Hackathon Dashboard.

## Features

- 🔐 JWT-based authentication with role-based access control
- 📦 Prisma ORM with PostgreSQL
- 🔄 Redis for caching and real-time notifications (SSE)
- 🛡️ Security middleware (Helmet, CORS)
- ✅ Request validation with express-validator
- 📝 TypeScript support
- 🚀 Hot reload development with ts-node-dev

## Project Structure

```
IEEE-Hackathon-Express/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── config/             # Configuration files
│   │   ├── database.ts     # Prisma client
│   │   ├── redis.ts        # Redis client
│   │   └── index.ts        # Environment config
│   ├── handlers/           # Route handlers
│   │   ├── auth.handler.ts
│   │   ├── admin.handler.ts
│   │   ├── participant.handler.ts
│   │   ├── coordinator.handler.ts
│   │   ├── notification.handler.ts
│   │   └── evaluator.handler.ts
│   ├── middleware/         # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validators.ts
│   ├── routes/             # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── admin.routes.ts
│   │   ├── participant.routes.ts
│   │   ├── coordinator.routes.ts
│   │   ├── evaluator.routes.ts
│   │   └── notification.routes.ts
│   ├── utils/              # Utility functions
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── response.ts
│   └── index.ts            # App entry point
├── .env.example            # Environment variables template
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional, for real-time notifications)
- pnpm (recommended) or npm

### Installation

1. Clone the repository and navigate to the project:
   ```bash
   cd IEEE-Hackathon-Express
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the environment file and configure:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your database and Redis URLs.

4. Generate Prisma client:
   ```bash
   pnpm prisma:generate
   ```

5. Run database migrations:
   ```bash
   pnpm prisma:migrate
   ```

6. Start the development server:
   ```bash
   pnpm dev
   ```

The server will start on `http://localhost:8080`.

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Validate current user
- `POST /auth/logout` - User logout
- `POST /auth/change-password` - Change password

### Admin (requires admin role)
- `POST /admin/addUser` - Add new user
- `GET /admin/getUsers` - Get all users
- `DELETE /admin/deleteUser` - Delete user (soft delete)
- `PUT /admin/updateUser` - Update user
- `PUT /admin/:id/reset-password` - Reset user password

### Participant
- `POST /participant/register` - Register team (public)
- `GET /participant/deadlines` - Get deadlines (public)
- `GET /participant/team` - Get my team (authenticated)
- `POST /participant/submission` - Create/update submission (authenticated)

### Coordinator (requires coordinator role)
- `GET /coordinator/deadlines` - Get deadlines
- `PUT /coordinator/deadlines` - Update deadlines
- `GET /coordinator/teams` - Get all teams
- `GET /coordinator/submissions` - Get all submissions
- `GET /coordinator/announcements` - Get announcements
- `POST /coordinator/announcements` - Create announcement
- `PUT /coordinator/announcement` - Update announcement
- `DELETE /coordinator/announcement/:id` - Delete announcement

### Evaluator (requires evaluator role)
- `GET /evaluator/criteria` - Get evaluation criteria
- `POST /evaluator/criteria` - Create criteria
- `PUT /evaluator/criteria/:id` - Update criteria
- `DELETE /evaluator/criteria/:id` - Delete criteria
- `GET /evaluator/submissions` - Get submissions for evaluation
- `POST /evaluator/evaluate` - Submit evaluation
- `GET /evaluator/evaluations/:submissionId` - Get evaluations by submission
- `GET /evaluator/my-evaluations` - Get my evaluations

### Notifications
- `GET /notifications/stream/:id` - SSE notification stream
- `GET /notifications/:id` - Get notifications for user
- `GET /notifications/:id/unread-count` - Get unread count
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/:id/pin` - Toggle pin
- `POST /notifications/create` - Create notification

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:push` - Push schema to database
- `pnpm prisma:studio` - Open Prisma Studio

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT signing | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` |
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,http://localhost:3001` |

## Security Features

- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configurable cross-origin resource sharing
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Middleware for role verification
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: express-validator for request validation
- **Soft Delete**: Users are soft-deleted to preserve data integrity

## License

ISC
