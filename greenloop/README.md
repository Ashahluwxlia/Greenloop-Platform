# GreenLoop - Employee Sustainability Engagement Platform

A comprehensive platform for tracking and gamifying employee sustainability actions within organizations.

## Features

- **Dual Authentication**: Traditional email/password + Microsoft 365 SSO support
- **Action Logging**: Track sustainability actions with points and CO₂ impact
- **Gamification**: Badges, levels, and leaderboards to encourage participation
- **Team Collaboration**: Create teams and participate in group challenges
- **Challenge System**: Individual and team-based sustainability challenges
- **Admin Panel**: Comprehensive management tools for administrators
- **Analytics & Reporting**: Detailed insights and data export capabilities
- **Real-time Dashboard**: Live statistics and progress tracking

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with Row Level Security
- **UI Components**: shadcn/ui with Tailwind CSS
- **Charts**: Recharts for data visualization
- **TypeScript**: Full type safety throughout

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project

### Installation Steps

1. **Clone and Install**
   \`\`\`bash
   git clone <repository-url>
   cd greenloop-platform
   npm install
   \`\`\`

2. **Environment Configuration**
   - Copy `.env.local` and fill in your Supabase credentials
   - Get credentials from your Supabase project dashboard

3. **Database Setup**
   - Run the SQL migration scripts in order:
   \`\`\`bash
   # Execute these in your Supabase SQL editor or via CLI
   scripts/001_create_core_tables.sql
   scripts/002_create_content_admin_tables.sql
   scripts/003_create_rls_policies.sql
   scripts/004_create_functions_triggers.sql
   scripts/005_seed_initial_data.sql
   \`\`\`

4. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Access the Application**
   - Open http://localhost:3000
   - Register a new account or use seeded admin credentials

### Admin Access

After running the seed script, you can access the admin panel with:
- Email: admin@company.com
- Password: admin123 (change immediately)

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── admin/             # Admin panel pages
│   ├── auth/              # Authentication pages
│   ├── api/               # API routes
│   └── [features]/        # Feature pages
├── components/            # Reusable UI components
├── lib/                   # Utility libraries
│   └── supabase/         # Supabase client configuration
├── scripts/              # Database migration scripts
└── hooks/                # Custom React hooks
\`\`\`

## Key Features Implementation

### Authentication System
- Dual authentication support (email/password + SSO)
- Protected routes with middleware
- Row Level Security (RLS) policies

### Gamification Engine
- Points system with configurable values
- Badge achievements with criteria
- User levels based on points
- Leaderboards and rankings

### Challenge System
- Individual and team challenges
- Progress tracking and completion
- Reward distribution
- Category-based organization

### Admin Management
- User management and permissions
- Team and challenge oversight
- System settings and configuration
- Comprehensive analytics dashboard

## Database Schema

The application uses 17 core tables:
- User management (users, sessions, permissions)
- Actions (categories, actions, attachments)
- Gamification (badges, points, transactions)
- Teams (teams, members, roles)
- Challenges (challenges, participants, progress)
- Content (news, analytics, settings)

## Security Features

- Row Level Security (RLS) on all tables
- Admin permission checks
- Secure API endpoints
- Input validation and sanitization
- Audit logging for admin actions

## Performance Optimizations

- Server-side rendering with caching
- Optimized database queries with joins
- Image optimization and lazy loading
- Progressive Web App (PWA) support
- Error boundaries and loading states

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
