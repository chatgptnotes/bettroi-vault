---
domain: pulseofproject.com
repo: chatgptnotes/pulseofproject
default_branch: main
last_push: 2026-05-27T12:20:16Z
size_kb: 2436
language: JavaScript
description: ""
extracted: 2026-06-02T07:31:23.544Z
---
# Software Operations Tracker — `pulseofproject.com`

**Live URL:** https://pulseofproject.com/
**GitHub repo:** https://github.com/chatgptnotes/pulseofproject
**Default branch:** `main`  ·  **Last push:** 2026-05-27T12:20:16Z
**Language:** JavaScript  ·  **Repo size:** 2436KB



## Tech stack

**Name:** neurosense360  ·  **Version:** 1.4.0  ·  **Type:** module

**Scripts:**
- `dev`: `vite`
- `build`: `vite build`
- `lint`: `eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0`
- `preview`: `vite preview`
- `version:bump`: `node scripts/bump-version.js`
- `setup:hooks`: `node scripts/setup-git-hooks.js`
- `postinstall`: `node scripts/setup-git-hooks.js`

**Dependencies (39):** @anthropic-ai/sdk, @aws-sdk/client-dynamodb, @aws-sdk/client-s3, @aws-sdk/lib-dynamodb, @aws-sdk/s3-request-presigner, @emailjs/browser, @google/generative-ai, @heroicons/react, @stripe/stripe-js, @supabase/supabase-js, @tanstack/react-table, axios, cors, date-fns, date-fns-tz, dotenv, express, framer-motion, js-cookie, lucide-react, papaparse, pdf-parse, pdfjs-dist, prop-types, qrcode.react, razorpay, react, react-dnd, react-dnd-html5-backend, react-dom...

**Dev Dependencies (11):** @types/react, @types/react-dom, @vitejs/plugin-react, autoprefixer, eslint, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, postcss, tailwindcss, vite

## Top-level files

- `.env.example` (2KB)
- `.env.production` (880B)
- `.eslintrc.cjs` (591B)
- `.eslintrc.js` (811B)
- `.gitignore` (1KB)
- `ADD_DOMAINS_FROM_PDF_2026_05_15.sql` (7KB)
- `ADD_PRIORITY_TO_ADMIN_PROJECTS.sql` (880B)
- `ADMIN-PROJECTS-DYNAMIC-SYSTEM-README.md` (11KB)
- `ADMIN_PROJECTS_MIGRATION.sql` (12KB)
- `ALL-PROJECTS-MILESTONES-DELIVERABLES.sql` (16KB)
- `ASSIGN_ALL_PROJECTS_TO_SUPERADMIN.sql` (1023B)
- `AUTH-SYSTEM-COMPLETED.md` (4KB)
- `AUTHENTICATION_FIX_COMPLETE.md` (9KB)
- `AUTHENTICATION_SETUP.md` (9KB)
- `AWS_CREDENTIALS_FIX.md` (3KB)
- `AWS_DYNAMODB_SETUP_GUIDE.md` (4KB)
- `AWS_IAM_FIX.md` (3KB)
- `AWS_S3_SETUP_GUIDE.md` (5KB)
- `AWS_SETUP_GUIDE.md` (8KB)
- `BACKUP_MILESTONES_FIRST.sql` (2KB)
- `BROWSER_S3_COMPATIBILITY_FIX.md` (5KB)
- `BUG_ISOLATION_FIX_README.md` (6KB)
- `BUG_SAVE_FIX_INSTRUCTIONS.md` (3KB)
- `CHECKBOX_UI_UPDATE_FIX.md` (6KB)
- `CHECK_ADMIN_PROJECTS_DATA.sql` (2KB)
- `CHECK_USER_PROJECT_ASSIGNMENT.sql` (3KB)
- `CLAUDE.md` (19KB)
- `COLLABORATIVE_PROJECT_TRACKING_GUIDE.md` (6KB)
- `COMPLETE-ALL-PROJECTS-SQL.sql` (28KB)
- `COMPLETE_ERROR_FIX_GUIDE.md` (6KB)

## Folder breakdown

- `apps/` — 116 files
- `packages/` — 13 files
- `.claude/` — 10 files
- `supabase/` — 7 files
- `scripts/` — 5 files
- `api/` — 3 files
- `supabase-migrations/` — 3 files
- `server/` — 2 files
- `.env.example/` — 1 file
- `.env.production/` — 1 file
- `.eslintrc.cjs/` — 1 file
- `.eslintrc.js/` — 1 file
- `.gitignore/` — 1 file
- `ADD_DOMAINS_FROM_PDF_2026_05_15.sql/` — 1 file
- `ADD_PRIORITY_TO_ADMIN_PROJECTS.sql/` — 1 file

## Recent commits

- `34e4236` _2026-05-27_ — refactor(seo): move pre-render fallback styles to a stylesheet
- `774dcd7` _2026-05-27_ — fix(seo): point canonical/OG/sitemap to www.pulseofproject.com
- `716a833` _2026-05-27_ — feat(seo): optimize metadata, public landing, perf, and social tags
- `88cf6b0` _2026-05-15_ — Merge pull request #6 from chatgptnotes/deploy/employees
- `ec0f880` _2026-05-15_ — feat(employees): add Employees page (Drmhope + Bettroi roster) - v2.0.28
- `2ed7c23` _2026-05-15_ — Merge pull request #5 from chatgptnotes/deploy/domain-master
- `58b3a47` _2026-05-15_ — feat(domain-master): new categorized Domain Master page + sidebar entry - v2.0.2
- `02eedfb` _2026-05-06_ — Merge pull request #3 from chatgptnotes/feat/bug-scope-classification
- `ff62148` _2026-05-06_ — chore: bump version to 2.0.26
- `832972d` _2026-05-06_ — fix: declare scope-classifier deps in apps/web

## README

```markdown
# 🧠 NeuroSense360 - EEG Report Management Platform

A comprehensive SaaS platform for managing EEG reports, clinic onboarding, and subscription-based monetization. Built with React, Vite, and Tailwind CSS according to the NeuroSense360 masterplan.

## 🌟 Features

### ✅ Super Admin Panel
- **Dashboard**: Overview of platform analytics and activity
- **Clinic Management**: Create, edit, deactivate clinic accounts
- **Report Upload**: Manual upload of PDF/EDF files per patient
- **Analytics**: Usage statistics, revenue tracking, and insights
- **Alert System**: Automated notifications for usage limits and trial status
- **Usage Tracking**: Monitor report consumption per clinic

### ✅ Clinic Portal
- **Secure Login**: Clinic-specific authentication
- **Patient Management**: Add, edit, and manage patient records
- **Report Viewing**: View and download patient reports (PDF/EDF)
- **Usage Dashboard**: Track report consumption and limits
- **Subscription Management**: Purchase additional reports via Stripe
- **Automated Alerts**: Notifications when approaching limits

### ✅ Subscription & Payments
- **Stripe Integration**: "Per 10 report" purchase model
- **Usage Monitoring**: Real-time tracking of report consumption
- **Automated Alerts**: Email/in-app notifications for limits
- **Trial Management**: 30-day trial with 10 free reports
- **Payment History**: Complete transaction records

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd /mnt/c/Users/poona/Downloads/Neuro360/Neuro360
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000`

## 🔐 Access the Platform

### Default Accounts

#### Super Admin Access
- **URL**: `http://localhost:3000/admin`
- **Credentials**: 
  - Email: `admin@neurosense360.com`
  - Password: `admin123`

#### Clinic Portal Access  
- **URL**: `http://localhost:3000/clinic`
- **Demo Clinic**: Created automatically on first visit

### Quick Navigation
- **Main Dashboard**: `http://localhost:3000/dashboard`
- **Super Admin Panel**: `http://localhost:3000/admin`
- **Clinic Portal**: `http://localhost:3000/clinic`
- **Subscription Manager**: `http://localhost:3000/clinic/subscription`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api

# OAuth Configuration (Optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id

# App Configuration
VITE_APP_NAME=Neuro360
VITE_APP_URL=http://localhost:3000
```

### API Integration

The application is designed to work with a backend API. Update the `src/services/authService.js` file to integrate with your actual backend endpoints.

#### Required API Endpoints:

- `POST /auth/login` - Email/password login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user data
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset confirmation
- `POST /auth/change-password` - Change password
- `PUT /auth/profile` - Update user profile

## 🎨 UI Components

### Authentication Forms
- **LoginForm** - Email/password login with social auth options
- **RegisterForm** - User registration with validation
- **ForgotPasswordForm** - Password reset request
- **ResetPasswordForm** - Password reset with token validation
- **SocialAuthButtons** - Reusable social authentication buttons

### Protected Components
- **Dashboard** - Main user dashboard
- **ProtectedRoute** - Route wrapper for authenticated access

### Utility Components
- **AuthContext** - Global authentication state management

## 🔐 Authentication Flow

### Email/Password Authentication
1. User enters email and password
2. Form validation occurs client-side
3. Credentials sent to API for verification
4. JWT token received and stored in cookies
5. User redirected to dashboard

### Social Authentication (OAuth)
1. User clicks social login button
2. Redirect to OAuth provider
3. User authorizes application
4. OAuth provider returns authorization code
5. Backend exchanges code for access token
6. User data retrieved and JWT token issued
7. User redirected to dashboard

### Password Recovery
1. User enters email address
2. Password reset email sent
3. User clicks reset link with token
4. New password form displayed
5. Password updated in database
6. User redirected to login

## 🎯 Usage Examples

### Basic Login
```jsx
import { useAuth } from './contexts/AuthContext';

function LoginComponent() {
  const { login, loading } = useAuth();
  
  const handleLogin = async (credentials) => {
    const result = await login(credentials, 'email');
    if (result.success) {
      // Handle success
    }
  };
}
```

### Social Authentication
```jsx
const handleGoogleLogin = async () => {
  const result = await login({}, 'google');
  if (result.success) {
    // Handle success
  }
};
```

### Protected Routes
```jsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify
```bash
# Build the project
npm run build

# Upload dist folder to Netlify
```

## 🔒 Security Considerations

- **HTTPS Only** - Always use HTTPS in production
- **Secure Cookies** - Configure secure cookie settings
- **CORS Configuration** - Properly configure CORS on your API
- **Input Validation** - Validate all inputs on both client and server
- **Rate Limiting** - Implement rate limiting on authentication endpoints
- **Password Policies** - Enforce strong password requirements

## 🧪 Testing

The application includes form validation and error handling. For comprehensive testing:

1. **Test Authentication Flows**
   - Valid login/registration
   - Invalid credentials
   - Network errors
   - Token expiration

2. **Test Form Validation**
   - Required fields
   - Email format validation
   - Password strength requirements
   - Confirm password matching

3. **Test Protected Routes**
   - Authenticated access
   - Unauthenticated redirects
   - Token refresh scenarios

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🔄 Updates

### Version 1.0.0
- Initial release with multi-authentication support
- Email/password authentication
- Social OAuth integration (Google, GitHub, Facebook)
- Password recovery system
- Protected routes
- Modern responsive UI
- Comprehensive form validation
- Toast notifications
- Loading states and error handling

---

**Built with ❤️ using React, Vite, and Tailwind CSS**
#   N e u r o 3 6 0  
 
```

---

*Generated by `brain:repo-overview` — re-run anytime to refresh.*
