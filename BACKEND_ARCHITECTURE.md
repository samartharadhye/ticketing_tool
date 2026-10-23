# Complete NestJS Backend Architecture & Specification
## Derived Directly From Existing React 19 Frontend (Inbox Ticketing & Task Management)

---

## Table of Contents
1. [Phase 1 — Frontend Codebase Analysis](#phase-1--frontend-codebase-analysis)
2. [Phase 2 — Frontend → Backend Requirement Map](#phase-2--frontend--backend-requirement-map)
3. [Phase 3 — NestJS Backend Modules Discovered from Frontend](#phase-3--nestjs-backend-modules-discovered-from-frontend)
4. [Phase 4 — Relational Database Design (PostgreSQL)](#phase-4--relational-database-design-postgresql)
5. [Phase 5 — Complete Prisma Schema (`schema.prisma`)](#phase-5--complete-prisma-schema-schemaprisma)
6. [Phase 6 — NestJS Architectural Layout](#phase-6--nestjs-architectural-layout)
7. [Phase 7 — Controller → Service → Prisma Architectural Flow](#phase-7--controller--service--prisma-architectural-flow)
8. [Phase 8 — API Endpoints Specification](#phase-8--api-endpoints-specification)
9. [Phase 9 — Data Transfer Objects (DTOs) & Validation](#phase-9--data-transfer-objects-dtos--validation)
10. [Phase 10 — Authentication & Role-Based Access Control (RBAC)](#phase-10--authentication--role-based-access-control-rbac)
11. [Phase 11 — Error Handling & Exception Filter Architecture](#phase-11--error-handling--exception-filter-architecture)
12. [Phase 12 — Request Validation Architecture](#phase-12--request-validation-architecture)
13. [Phase 13 — Database Performance & SLA Query Optimization](#phase-13--database-performance--sla-query-optimization)
14. [Phase 14 — React 19 Frontend Integration Strategy](#phase-14--react-19-frontend-integration-strategy)
15. [Phase 15 — Environment Variables & Configuration](#phase-15--environment-variables--configuration)
16. [Phase 16 — Step-by-Step Project Setup & Migration Guide](#phase-16--step-by-step-project-setup--migration-guide)
17. [Phase 17 — Complete Backend Directory Structure](#phase-17--complete-backend-directory-structure)

---

## Phase 1 — Frontend Codebase Analysis

The frontend is an enterprise-grade Ticketing, Sprint Backlog, and Tiered Support Escalation Tool (**Inbox / GoldMine Portal**) built on React 19 with Vite, Tailwind CSS v4, Lucide icons, and Recharts.

### 1. Actual Routes Discovered in `src/App.tsx`
| Route | Component | Access Guard | Description |
|---|---|---|---|
| `/login` | `LoginPage` | `PublicOnlyRoute` | Authenticates users using email/userId and password. |
| `/` | `Dashboard` | `RoleRoute (dashboard)` | Key metrics, SLA compliance rate, tier distribution, ticket status pie/bar charts, urgent tickets. |
| `/issues` | `IssuesPage` | `RoleRoute (issues)` | Searchable, multi-filtered list & cards view for tickets, saved filters, bulk quick actions. |
| `/issues/:id` | `IssueDetailPage` | `RoleRoute (issues)` | Comprehensive ticket view: description, status transitions, priority, escalation history, comments (public/internal), attachments, SLA timers. |
| `/board` | `KanbanBoard` | `RoleRoute (board)` | Drag-and-drop Kanban workflow columns (`To Do`, `In Progress`, `In Review`, `Testing`, `Resolved`, `Closed`), sprint & project filters. |
| `/backlog` | `BacklogPage` | `RoleRoute (backlog)` | Sprint lifecycle management (create, start, complete sprint with rollover), backlog issue refinement. |
| `/epics` | `BacklogPage` | `RoleRoute (backlog)` | Alias route to backlog & epic planning workspace. |
| `/support` | `SupportCenterPage` | `RoleRoute (support)` | Multi-tier queue view (L1 Frontline, L2 Technical, L3 Engineering, Escalated) with real-time countdowns. |
| `/reports` | `ReportsPage` | `RoleRoute (reports)` | SLA compliance audit, breach statistics, tier breakdown, priority distribution, trend analytics. |
| `/projects` | `ProjectsPage` | `RoleRoute (projects)` | Repository directory, project creation, status, project lead assignment. |
| `/projects/:id` | `ProjectDetailPage` | `RoleRoute (projects)` | Single project cockpit, linked epics, active sprints, and associated issues. |
| `/team` | `TeamPage` | `RoleRoute (team)` | Member roster, support tier competency badges (L1, L2, L3), department, active workload. |
| `/admin` | `AdminPanelPage` | `RoleRoute (admin)` | User administration, password reset, role-to-page permission matrix (RBAC), SLA policies, audit logs, backup export/import/reset. |
| `/settings` | `SettingsPage` | `RoleRoute (settings)` | Workspace branding, SLA threshold policies (L1/L2/L3 response & resolution hours), system export/reset. |
| `/profile` | `ProfilePage` | `RoleRoute (profile)` | Current user profile, personal tier competence configuration, open ticket load telemetry. |
| `/docs` | `DocumentationPage` | `RoleRoute (docs)` | Interactive SLA calculator, escalation matrix guide, architecture manuals. |
| `/*` (denied) | `AccessDeniedPage` | Rendered by `RoleRoute` | Role-based restriction screen when a role lacks access to a page. |

---

### 2. Actual Components Performing Backend Operations
- **`LoginPage`**: Dispatches user authentication (`login(email, password)`).
- **`Dashboard`**: Queries issues, projects, users, and audit logs to aggregate SLA metrics and charts.
- **`IssuesPage`**: Filters, searches, sorts issues; creates tickets via `CreateIssueModal`; triggers `EscalateModal`; deletes issues; creates/deletes `SavedFilter`.
- **`IssueDetailPage`**: Loads ticket by ID; updates fields (title, description, status, priority, supportLevel, assigneeId, sprintId, epicId, dueDate, labels, storyPoints, estimatedTime, remainingTime); triggers escalation; creates public/internal comments; edits/deletes comments; uploads and deletes attachments.
- **`KanbanBoard`**: Loads issues grouped by status; updates status on drag-and-drop column drop.
- **`BacklogPage`**: Creates sprints (`createSprint`), starts sprints (`startSprint`), completes sprints with issue rollover (`completeSprint`), deletes sprints (`deleteSprint`), reassigns issues between sprints and backlog.
- **`ProjectDetailPage`**: Creates epics (`createEpic`), lists project-specific epics, sprints, and issues.
- **`ProjectsPage`**: Creates, updates, and deletes projects.
- **`TeamPage`**: Lists team members; adds new user accounts; updates user details and tier competencies (`L1`, `L2`, `L3`).
- **`AdminPanelPage`**:
  - Tab `users`: User CRUD and administrative password overwrite (`updateUserPassword`).
  - Tab `permissions`: Dynamic role-to-page access matrix persisted via `updateSettings({ rolePageAccess })`.
  - Tab `sla`: SLA policy threshold updates.
  - Tab `audit`: Activity log telemetry feed.
  - Tab `system`: JSON database export, import JSON, restore seed data.
- **`SettingsPage`**: Persists system configuration, workspace name, notifications toggles, and SLA policy hours.
- **`ProfilePage`**: Updates current user credentials, avatar, and support tier competencies.
- **`Topbar`**:
  - `GlobalSearchModal`: Full-text search across issues, projects, epics, and users.
  - `NotificationPanel`: Fetches notifications, marks individual notification as read, marks all as read.
  - `UserSwitcher`: Switches session user context, signs out (`logout`).
- **`CreateIssueModal`**: Generates new tickets with auto-generated ID (e.g. `INB-1001`), computes SLA deadlines based on priority.
- **`EscalateModal`**: Escalates ticket (`fromLevel -> toLevel`), captures mandatory escalation reason, optionally reassigns, logs audit event, creates internal escalation note, and triggers notifications.

---

### 3. Concrete User Actions Identified
1. **Authentication**: `login`, `logout`, `switchUser`, `updateUserPassword`.
2. **Issue Operations**: `createIssue`, `updateIssue`, `deleteIssue`, `escalateIssue`, `changeStatus`, `assignIssue`, `updatePriority`.
3. **Comment Operations**: `addComment` (`public` or `internal`), `editComment`, `deleteComment`.
4. **Attachment Operations**: `addAttachment` (metadata: filename, fileType, fileSize), `deleteAttachment`.
5. **Project Operations**: `createProject`, `updateProject`, `deleteProject`, view project details.
6. **Sprint Operations**: `createSprint`, `updateSprint`, `startSprint`, `completeSprint` (with incomplete issues rollover), `deleteSprint`.
7. **Epic Operations**: `createEpic`, `updateEpic`, `deleteEpic`.
8. **Team / User Operations**: `addUser`, `updateUser`, `deleteUser`, `updateProfile`.
9. **Notification Operations**: `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`.
10. **Saved Filter Operations**: `saveFilter`, `deleteFilter`.
11. **Settings & Governance Operations**: `updateSettings`, `updateRolePermissions`, `resetAllData`, `exportJSON`, `importJSON`.
12. **Activity & Audit Operations**: `getActivityLog` (automatic logging on create, assign, status change, escalation, comment, attachment).
13. **Search Operations**: `searchGlobal` across issues, projects, epics.

---

### 4. Existing Types and Data Contracts (`src/types/index.ts`)
- **`IssueType`**: `'Task' | 'Bug' | 'Story' | 'Epic' | 'Sub-task'`
- **`IssueStatus`**: `'Open' | 'To Do' | 'In Progress' | 'In Review' | 'Testing' | 'Blocked' | 'Resolved' | 'Closed'`
- **`Priority`**: `'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest'`
- **`SupportLevel`**: `'L1' | 'L2' | 'L3'`
- **`UserRole`**: `'Admin' | 'Project Manager' | 'Developer' | 'QA' | 'Support Agent' | 'Technical' | 'Engineer' | 'Viewer'`
- **`SLAStatus`**: `'Within SLA' | 'At Risk' | 'Breached'`
- **`ProjectStatus`**: `'Active' | 'Planning' | 'Completed' | 'On Hold'`
- **`SprintStatus`**: `'active' | 'future' | 'completed' | 'planned'`
- **`EpicStatus`**: `'To Do' | 'In Progress' | 'Done'`
- **`CommentType`**: `'public' | 'internal'`
- **`NotificationType`**: `'escalation' | 'assignment' | 'comment' | 'status' | 'sprint' | 'system'`

---

## Phase 2 — Frontend → Backend Requirement Map

| Frontend Page / Component | User Action | Required Backend Operation | HTTP Method | Endpoint | Request Data | Response Data |
|---|---|---|---|---|---|---|
| `LoginPage` | Enter credentials | Authenticate user session | `POST` | `/api/auth/login` | `{ emailOrId, password }` | `{ accessToken, user }` |
| `UserSwitcher` / `AppLayout` | Mount / check auth | Fetch authenticated user | `GET` | `/api/auth/me` | None (Bearer Token) | `User` object |
| `UserSwitcher` / `Sidebar` | Click Logout | Invalidate user session | `POST` | `/api/auth/logout` | None | `{ success: true }` |
| `AdminPanelPage` | Change user password | Overwrite user password | `PATCH` | `/api/users/:id/password` | `{ newPassword }` | `{ success: true }` |
| `IssuesPage` / `Dashboard` | Page load / filter | Retrieve issues with relations | `GET` | `/api/issues` | Query: `q, status, priority, supportLevel, assigneeId, projectId, sprintId, sla` | `Issue[]` |
| `IssueDetailPage` | Load ticket details | Get single issue with full relations | `GET` | `/api/issues/:id` | Param: `id` | `Issue` with comments, attachments, escalationHistory |
| `CreateIssueModal` | Submit new ticket | Create issue with SLA rules | `POST` | `/api/issues` | `{ title, description, type, status, priority, supportLevel, assigneeId?, projectId, sprintId?, epicId?, labels, dueDate?, estimatedTime?, storyPoints? }` | `Issue` |
| `IssueDetailPage` | Inline edits / status change | Partial update issue | `PATCH` | `/api/issues/:id` | Partial `Issue` fields | `Updated Issue` |
| `IssueDetailPage` / `IssuesPage` | Confirm delete | Remove issue | `DELETE` | `/api/issues/:id` | Param: `id` | `{ success: true, id }` |
| `EscalateModal` | Escalate ticket | Execute tier escalation | `POST` | `/api/issues/:id/escalate` | `{ toLevel, reason, assignedToUserId? }` | `Issue` with updated level, escalationRecord, and auto-generated internal comment |
| `KanbanBoard` | Drag & drop card | Update ticket status | `PATCH` | `/api/issues/:id/status` | `{ status: IssueStatus }` | `Issue` |
| `IssueDetailPage` | Post comment | Create public or internal note | `POST` | `/api/issues/:id/comments` | `{ content, type: 'public' \| 'internal' }` | `Comment` |
| `IssueDetailPage` | Edit comment text | Update existing comment | `PATCH` | `/api/comments/:commentId` | `{ content }` | `Comment` |
| `IssueDetailPage` | Delete comment | Remove comment | `DELETE` | `/api/comments/:commentId` | Param: `commentId` | `{ success: true }` |
| `IssueDetailPage` | Upload attachment | Add attachment metadata | `POST` | `/api/issues/:id/attachments` | `{ filename, fileType, fileSize }` | `Attachment` |
| `IssueDetailPage` | Delete attachment | Remove attachment | `DELETE` | `/api/issues/:id/attachments/:attachmentId` | Params: `id, attachmentId` | `{ success: true }` |
| `ProjectsPage` | View project list | List projects with leads & counts | `GET` | `/api/projects` | Query: `q, status` | `Project[]` |
| `ProjectDetailPage` | Load project cockpit | Get project by ID | `GET` | `/api/projects/:id` | Param: `id` | `Project` with epics, sprints, issues |
| `ProjectsPage` | Create project | Add new project repository | `POST` | `/api/projects` | `{ key, name, description, category, leadId, memberIds? }` | `Project` |
| `ProjectsPage` | Edit project | Update project settings | `PATCH` | `/api/projects/:id` | Partial `Project` fields | `Project` |
| `ProjectsPage` | Delete project | Delete project | `DELETE` | `/api/projects/:id` | Param: `id` | `{ success: true }` |
| `BacklogPage` | View sprints | List sprints for a project | `GET` | `/api/sprints` | Query: `projectId` | `Sprint[]` |
| `BacklogPage` | Create sprint modal | Create planned sprint | `POST` | `/api/sprints` | `{ projectId, name, goal?, startDate, endDate }` | `Sprint` |
| `BacklogPage` | Edit sprint | Update sprint metadata | `PATCH` | `/api/sprints/:id` | Partial `Sprint` fields | `Sprint` |
| `BacklogPage` | Click Start Sprint | Activate sprint | `POST` | `/api/sprints/:id/start` | Param: `id` | `Sprint` |
| `BacklogPage` | Complete sprint modal | Complete sprint & rollover | `POST` | `/api/sprints/:id/complete` | `{ targetSprintId? }` | `{ sprint: Sprint, rolledOverCount: number }` |
| `BacklogPage` | Delete sprint | Remove sprint & unassign issues | `DELETE` | `/api/sprints/:id` | Param: `id` | `{ success: true }` |
| `ProjectDetailPage` | List epics | List epics for project | `GET` | `/api/epics` | Query: `projectId` | `Epic[]` |
| `ProjectDetailPage` | Create epic form | Add epic | `POST` | `/api/epics` | `{ projectId, name, description, summary?, color, status, dueDate? }` | `Epic` |
| `ProjectDetailPage` | Update epic | Edit epic details | `PATCH` | `/api/epics/:id` | Partial `Epic` fields | `Epic` |
| `ProjectDetailPage` | Delete epic | Remove epic | `DELETE` | `/api/epics/:id` | Param: `id` | `{ success: true }` |
| `TeamPage` / `AdminPanelPage` | List users | Get team roster | `GET` | `/api/users` | Query: `role, search, supportLevel` | `User[]` |
| `TeamPage` / `AdminPanelPage` | Add user modal | Create user account | `POST` | `/api/users` | `{ name, email, password?, role, department, supportLevels, avatar?, timezone? }` | `User` |
| `TeamPage` / `AdminPanelPage` | Edit user modal | Update user details | `PATCH` | `/api/users/:id` | Partial `User` fields | `User` |
| `TeamPage` / `AdminPanelPage` | Delete user | Delete user account | `DELETE` | `/api/users/:id` | Param: `id` | `{ success: true }` |
| `ProfilePage` | Update profile | Save current user profile | `PATCH` | `/api/users/profile` | `{ name, email, avatar, supportLevels }` | `User` |
| `NotificationPanel` | View notifications | Fetch user notifications | `GET` | `/api/notifications` | None (current user) | `Notification[]` |
| `NotificationPanel` | Click notification | Mark single as read | `PATCH` | `/api/notifications/:id/read` | Param: `id` | `Notification` |
| `NotificationPanel` | Mark all read | Mark all user notifications read | `POST` | `/api/notifications/mark-all-read` | None | `{ success: true }` |
| `IssuesPage` | Save current filter | Save custom filter | `POST` | `/api/saved-filters` | `{ name, filters }` | `SavedFilter` |
| `IssuesPage` | Delete saved filter | Delete saved filter | `DELETE` | `/api/saved-filters/:id` | Param: `id` | `{ success: true }` |
| `AdminPanelPage` / `Dashboard` | Audit trail tab | List activity events | `GET` | `/api/activity` | Query: `issueId?, projectId?, userId?, limit?` | `ActivityEvent[]` |
| `SettingsPage` / `AdminPanelPage` | Load system settings | Retrieve workspace settings | `GET` | `/api/settings` | None | `Settings` |
| `SettingsPage` / `AdminPanelPage` | Save settings form | Update workspace settings / SLA / RBAC | `PATCH` | `/api/settings` | Partial `Settings` | `Settings` |
| `GlobalSearchModal` | Type search string | Multi-entity global search | `GET` | `/api/search` | Query: `q` | `{ issues: Issue[], projects: Project[], epics: Epic[] }` |
| `AdminPanelPage` / `SettingsPage` | Export data button | Export full JSON dump | `GET` | `/api/system/export` | None | Full JSON backup object |
| `AdminPanelPage` / `SettingsPage` | Import JSON backup | Restore system from JSON | `POST` | `/api/system/import` | Full JSON backup object | `{ success: true }` |
| `AdminPanelPage` / `SettingsPage` | Reset to seed | Reset database to initial seeds | `POST` | `/api/system/reset` | None | `{ success: true }` |

---

## Phase 3 — NestJS Backend Modules Discovered from Frontend

Each NestJS module directly maps to a distinct subsystem discovered in the React frontend:

1. **`AuthModule`**:
   - **Reason**: Handles credentials verification for `LoginPage`, token issuance, password updates from `AdminPanelPage`, and current-user session hydration for `AppLayout`.
2. **`UsersModule`**:
   - **Reason**: Powers `TeamPage`, `AdminPanelPage` user table, `ProfilePage`, and user lookups for assignment dropdowns.
3. **`IssuesModule`**:
   - **Reason**: Powers the central ticketing hub (`IssuesPage`, `IssueDetailPage`, `KanbanBoard`, `SupportCenterPage`, `Dashboard`, and `CreateIssueModal`). Manages ticket CRUD, SLA deadlines, and tier escalation workflows (`EscalateModal`).
4. **`CommentsModule`**:
   - **Reason**: Manages public responses and internal notes on tickets in `IssueDetailPage`.
5. **`AttachmentsModule`**:
   - **Reason**: Handles file attachments attached to tickets in `IssueDetailPage`.
6. **`ProjectsModule`**:
   - **Reason**: Powers `ProjectsPage` and `ProjectDetailPage`, generating project keys (e.g. `INB`, `CSP`, `MOB`) used in ticket numbering.
7. **`SprintsModule`**:
   - **Reason**: Powers `BacklogPage` and `KanbanBoard` sprint filtering, handling sprint creation, activation, and sprint rollover completion.
8. **`EpicsModule`**:
   - **Reason**: Powers epic breakdown in `ProjectDetailPage`, `BacklogPage`, and `CreateIssueModal`.
9. **`NotificationsModule`**:
   - **Reason**: Powers `NotificationPanel` in `Topbar`, delivering notifications for assignments, escalations, comments, and sprint events.
10. **`ActivityModule`**:
    - **Reason**: Powers the audit log in `AdminPanelPage` (Audit tab) and the History tab in `IssueDetailPage`.
11. **`SavedFiltersModule`**:
    - **Reason**: Powers the saved filters bookmark system on `IssuesPage`.
12. **`SettingsModule`**:
    - **Reason**: Powers `SettingsPage` and `AdminPanelPage` (SLA policies & RBAC permissions matrix).
13. **`SearchModule`**:
    - **Reason**: Powers `GlobalSearchModal` (triggered via Cmd+K or search bar).
14. **`SystemModule`**:
    - **Reason**: Powers Admin system controls (`AdminPanelPage` System tab and `SettingsPage`) for JSON export, JSON import, and reset to factory seed data.
15. **`PrismaModule`**:
    - **Reason**: Global database access wrapper providing `PrismaClient` with connection pooling, logging, and lifecycle hooks.

---

## Phase 4 — Relational Database Design (PostgreSQL)

### Data Pipeline Architecture
```text
Frontend React 19 State / Forms
             ↓ HTTP POST/PATCH/GET (JSON)
       NestJS Controller
             ↓ Class-Validator DTOs
       NestJS Service (Business Logic, SLA Engine)
             ↓ Type-safe Prisma Queries
        Prisma ORM Client
             ↓ Structured SQL / Migrations
      PostgreSQL Relational DB
```

### Entities & Relationships Breakdown
1. **`User`**:
   - Primary key: `id` (String, e.g. `user-1` or UUID/CUID).
   - Unique: `email`.
   - Fields: `name`, `email`, `password` (hashed with bcrypt), `role` (`UserRole` enum), `department`, `supportLevels` (`SupportLevel[]` enum array), `avatar`, `timezone`, `status` (`UserStatus` enum).
   - Relations:
     - Issues assigned (`assignedIssues` -> `Issue.assigneeId`)
     - Issues reported (`reportedIssues` -> `Issue.reporterId`)
     - Escalations initiated (`escalatedBy` -> `EscalationRecord.escalatedByUserId`)
     - Escalations received (`escalationAssignments` -> `EscalationRecord.assignedToUserId`)
     - Comments authored (`comments` -> `Comment.authorId`)
     - Projects led (`ledProjects` -> `Project.leadId`)
     - Projects member (`projects` -> junction table `_ProjectMembers`)
     - Notifications received (`notifications` -> `Notification.userId`)
     - Activities performed (`activities` -> `ActivityEvent.userId`)
     - Saved filters (`savedFilters` -> `SavedFilter.userId`)

2. **`Project`**:
   - Primary key: `id` (e.g. `proj-1`).
   - Unique: `key` (e.g. `INB`, `CSP`).
   - Fields: `name`, `description`, `category`, `leadId` (FK -> User), `status` (`ProjectStatus` enum), `createdDate`.
   - Relations: `lead` (User), `members` (User[]), `issues` (Issue[]), `sprints` (Sprint[]), `epics` (Epic[]), `activities` (ActivityEvent[]).

3. **`Sprint`**:
   - Primary key: `id` (e.g. `sprint-1`).
   - Fields: `projectId` (FK -> Project), `name`, `startDate`, `endDate`, `status` (`SprintStatus` enum), `goal`, `completedDate`.
   - Relations: `project` (Project), `issues` (Issue[]).

4. **`Epic`**:
   - Primary key: `id` (e.g. `epic-1`).
   - Fields: `projectId` (FK -> Project), `name`, `description`, `summary`, `color`, `status` (`EpicStatus` enum), `dueDate`.
   - Relations: `project` (Project), `issues` (Issue[]).

5. **`Issue`**:
   - Primary key: `id` (e.g. `INB-1001`). Must match the project key prefix and numeric counter.
   - Fields: `title`, `description`, `type` (`IssueType` enum), `status` (`IssueStatus` enum), `priority` (`Priority` enum), `supportLevel` (`SupportLevel` enum), `assigneeId` (FK -> User, optional), `reporterId` (FK -> User), `projectId` (FK -> Project), `sprintId` (FK -> Sprint, optional), `epicId` (FK -> Epic, optional), `labels` (`String[]`), `dueDate` (DateTime, optional), `createdDate` (DateTime), `updatedDate` (DateTime), `estimatedTime` (String, optional), `remainingTime` (String, optional), `storyPoints` (Int, optional), `responseSLAHours` (Float), `resolutionSLAHours` (Float), `firstRespondedAt` (DateTime, optional), `resolvedAt` (DateTime, optional), `isEscalated` (Boolean, default `false`).
   - Relations: `project`, `assignee`, `reporter`, `sprint`, `epic`, `comments`, `attachments`, `escalationHistory`, `activities`.

6. **`EscalationRecord`**:
   - Primary key: `id` (e.g. `esc-1`).
   - Fields: `issueId` (FK -> Issue), `timestamp` (DateTime), `fromLevel` (`SupportLevel`), `toLevel` (`SupportLevel`), `reason` (Text), `escalatedByUserId` (FK -> User), `assignedToUserId` (FK -> User, optional).

7. **`Comment`**:
   - Primary key: `id` (e.g. `comm-1`).
   - Fields: `issueId` (FK -> Issue), `authorId` (FK -> User), `content` (Text), `type` (`CommentType` enum: `public` | `internal`), `createdAt` (DateTime), `updatedAt` (DateTime, optional).

8. **`Attachment`**:
   - Primary key: `id` (e.g. `att-1`).
   - Fields: `issueId` (FK -> Issue), `filename` (String), `fileType` (String), `fileSize` (Int), `uploadDate` (DateTime).

9. **`ActivityEvent`**:
   - Primary key: `id` (e.g. `act-1`).
   - Fields: `issueId` (FK -> Issue, optional), `projectId` (FK -> Project, optional), `userId` (FK -> User), `action` (String), `details` (Text), `timestamp` (DateTime).

10. **`Notification`**:
    - Primary key: `id` (e.g. `notif-1`).
    - Fields: `userId` (FK -> User), `title` (String), `message` (Text), `type` (`NotificationType` enum), `issueId` (FK -> Issue, optional), `read` (Boolean, default `false`), `createdAt` (DateTime).

11. **`SavedFilter`**:
    - Primary key: `id` (e.g. `filter-1`).
    - Fields: `userId` (FK -> User, optional), `name` (String), `filters` (Json).

12. **`Settings`**:
    - Primary key: `id` (String, default `"singleton"`).
    - Fields: `appName` (String), `tagline` (String), `workspaceName` (String), `theme` (String), `notificationsEnabled` (Boolean), `slaSettings` (Json), `notifications` (Json), `preferences` (Json), `slaRules` (Json), `rolePageAccess` (Json).

---

## Phase 5 — Complete Prisma Schema (`schema.prisma`)

```prisma
// datasource and client generator
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// -----------------------------------------------------------------------------
// ENUMS (Derived strictly from src/types/index.ts)
// -----------------------------------------------------------------------------

enum IssueType {
  Task
  Bug
  Story
  Epic
  Sub_task @map("Sub-task")
}

enum IssueStatus {
  Open
  To_Do       @map("To Do")
  In_Progress @map("In Progress")
  In_Review   @map("In Review")
  Testing
  Blocked
  Resolved
  Closed
}

enum Priority {
  Lowest
  Low
  Medium
  High
  Highest
}

enum SupportLevel {
  L1
  L2
  L3
}

enum UserRole {
  Admin
  Project_Manager @map("Project Manager")
  Developer
  QA
  Support_Agent   @map("Support Agent")
  Technical
  Engineer
  Viewer
}

enum UserStatus {
  Active
  Away
  Offline
}

enum ProjectStatus {
  Active
  Planning
  Completed
  On_Hold @map("On Hold")
}

enum SprintStatus {
  active
  future
  completed
  planned
}

enum EpicStatus {
  To_Do       @map("To Do")
  In_Progress @map("In Progress")
  Done
}

enum CommentType {
  public
  internal
}

enum NotificationType {
  escalation
  assignment
  comment
  status
  sprint
  system
}

// -----------------------------------------------------------------------------
// MODELS
// -----------------------------------------------------------------------------

model User {
  id            String         @id @default(cuid())
  name          String
  email         String         @unique
  password      String         // bcrypt hashed
  role          UserRole       @default(Viewer)
  department    String
  supportLevels SupportLevel[] @default([L1])
  avatar        String         @default("")
  timezone      String         @default("UTC")
  status        UserStatus     @default(Active)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  // Relationships
  assignedIssues        Issue[]            @relation("IssueAssignee")
  reportedIssues        Issue[]            @relation("IssueReporter")
  escalatedRecordsMade  EscalationRecord[] @relation("EscalatedBy")
  escalatedAssignments  EscalationRecord[] @relation("EscalatedTo")
  comments              Comment[]
  ledProjects           Project[]          @relation("ProjectLead")
  memberProjects        Project[]          @relation("ProjectMembers")
  activities            ActivityEvent[]
  notifications         Notification[]
  savedFilters          SavedFilter[]

  @@index([role])
  @@index([email])
}

model Project {
  id          String        @id @default(cuid())
  key         String        @unique // e.g. "INB", "CSP"
  name        String
  description String        @default("")
  category    String?       @default("Software")
  leadId      String
  lead        User          @relation("ProjectLead", fields: [leadId], references: [id])
  members     User[]        @relation("ProjectMembers")
  status      ProjectStatus @default(Active)
  createdDate DateTime      @default(now())
  updatedDate DateTime      @updatedAt

  // Relationships
  issues     Issue[]
  sprints    Sprint[]
  epics      Epic[]
  activities ActivityEvent[]

  @@index([key])
  @@index([status])
}

model Sprint {
  id            String       @id @default(cuid())
  projectId     String
  project       Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name          String
  startDate     DateTime
  endDate       DateTime
  status        SprintStatus @default(planned)
  goal          String?
  completedDate DateTime?
  createdAt     DateTime     @default(now())

  issues Issue[]

  @@index([projectId, status])
}

model Epic {
  id          String     @id @default(cuid())
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name        String
  description String     @default("")
  summary     String?
  color       String     @default("#3b82f6")
  status      EpicStatus @default(To_Do)
  dueDate     DateTime?
  createdAt   DateTime   @default(now())

  issues Issue[]

  @@index([projectId])
}

model Issue {
  id                 String       @id // Format: "INB-1001"
  title              String
  description        String       @default("")
  type               IssueType    @default(Task)
  status             IssueStatus  @default(Open)
  priority           Priority     @default(Medium)
  supportLevel       SupportLevel @default(L1)
  assigneeId         String?
  assignee           User?        @relation("IssueAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  reporterId         String
  reporter           User         @relation("IssueReporter", fields: [reporterId], references: [id])
  projectId          String
  project            Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sprintId           String?
  sprint             Sprint?      @relation(fields: [sprintId], references: [id], onDelete: SetNull)
  epicId             String?
  epic               Epic?        @relation(fields: [epicId], references: [id], onDelete: SetNull)
  labels             String[]     @default([])
  dueDate            DateTime?
  createdDate        DateTime     @default(now())
  updatedDate        DateTime     @updatedAt
  estimatedTime      String?      // e.g. "4h"
  remainingTime      String?      // e.g. "2h"
  storyPoints        Int?
  responseSLAHours   Float        @default(4.0)
  resolutionSLAHours Float        @default(24.0)
  firstRespondedAt   DateTime?
  resolvedAt         DateTime?
  isEscalated        Boolean      @default(false)

  // Relationships
  escalationHistory EscalationRecord[]
  comments          Comment[]
  attachments       Attachment[]
  activities        ActivityEvent[]
  notifications     Notification[]

  @@index([projectId, status])
  @@index([supportLevel, status])
  @@index([assigneeId])
  @@index([priority])
  @@index([createdDate])
  @@index([isEscalated])
}

model EscalationRecord {
  id                String       @id @default(cuid())
  issueId           String
  issue             Issue        @relation(fields: [issueId], references: [id], onDelete: Cascade)
  timestamp         DateTime     @default(now())
  fromLevel         SupportLevel
  toLevel           SupportLevel
  reason            String
  escalatedByUserId String
  escalatedByUser   User         @relation("EscalatedBy", fields: [escalatedByUserId], references: [id])
  assignedToUserId  String?
  assignedToUser    User?        @relation("EscalatedTo", fields: [assignedToUserId], references: [id], onDelete: SetNull)

  @@index([issueId])
  @@index([timestamp])
}

model Comment {
  id        String      @id @default(cuid())
  issueId   String
  issue     Issue       @relation(fields: [issueId], references: [id], onDelete: Cascade)
  authorId  String
  author    User        @relation(fields: [authorId], references: [id])
  content   String
  type      CommentType @default(public)
  createdAt DateTime    @default(now())
  updatedAt DateTime?   @updatedAt

  @@index([issueId, type])
}

model Attachment {
  id         String   @id @default(cuid())
  issueId    String
  issue      Issue    @relation(fields: [issueId], references: [id], onDelete: Cascade)
  filename   String
  fileType   String
  fileSize   Int      // bytes
  uploadDate DateTime @default(now())

  @@index([issueId])
}

model ActivityEvent {
  id        String   @id @default(cuid())
  issueId   String?
  issue     Issue?   @relation(fields: [issueId], references: [id], onDelete: Cascade)
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  details   String
  timestamp DateTime @default(now())

  @@index([issueId])
  @@index([projectId])
  @@index([timestamp])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  type      NotificationType @default(system)
  issueId   String?
  issue     Issue?           @relation(fields: [issueId], references: [id], onDelete: Cascade)
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, read])
}

model SavedFilter {
  id      String  @id @default(cuid())
  userId  String?
  user    User?   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name    String
  filters Json

  @@index([userId])
}

model Settings {
  id                   String  @id @default("singleton")
  appName              String  @default("Inbox")
  tagline              String  @default("Work organized. Teams aligned.")
  workspaceName        String  @default("Acme Global Workspace")
  theme                String  @default("light")
  notificationsEnabled Boolean @default(true)
  slaSettings          Json    // { l1ResponseHours, l1ResolutionHours, ... }
  notifications        Json    // { issueAssigned, commentAdded, ... }
  preferences          Json    // { defaultIssueView, defaultProjectId, ... }
  slaRules             Json    // { Highest: { responseHours, resolutionHours }, ... }
  rolePageAccess       Json    // Record<AppPageId, UserRole[]>
  updatedAt            DateTime @updatedAt
}
```

---

## Phase 6 — NestJS Architectural Layout

```text
backend/
├── prisma/
│   ├── schema.prisma  (Database blueprint like design )
│   └── seed.ts
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── prisma-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/jwt.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── change-password.dto.ts
|   |
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── issues/
│   │   ├── issues.module.ts
│   │   ├── issues.controller.ts
│   │   ├── issues.service.ts
│   │   └── dto/
│   │       ├── create-issue.dto.ts
│   │       ├── update-issue.dto.ts
│   │       ├── escalate-issue.dto.ts
│   │       ├── update-status.dto.ts
│   │       └── query-issues.dto.ts
│   │
│   ├── comments/
│   │   ├── comments.module.ts
│   │   ├── comments.controller.ts
│   │   ├── comments.service.ts
│   │   └── dto/
│   │       ├── create-comment.dto.ts
│   │       └── update-comment.dto.ts
│   │
│   ├── attachments/
│   │   ├── attachments.module.ts
│   │   ├── attachments.controller.ts
│   │   ├── attachments.service.ts
│   │   └── dto/create-attachment.dto.ts
│   │
│   ├── projects/
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   └── dto/
│   │       ├── create-project.dto.ts
│   │       └── update-project.dto.ts
│   │
│   ├── sprints/
│   │   ├── sprints.module.ts
│   │   ├── sprints.controller.ts
│   │   ├── sprints.service.ts
│   │   └── dto/
│   │       ├── create-sprint.dto.ts
│   │       ├── update-sprint.dto.ts
│   │       └── complete-sprint.dto.ts
│   │
│   ├── epics/
│   │   ├── epics.module.ts
│   │   ├── epics.controller.ts
│   │   ├── epics.service.ts
│   │   └── dto/
│   │       ├── create-epic.dto.ts
│   │       └── update-epic.dto.ts
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   └── notifications.service.ts
│   │
│   ├── activity/
│   │   ├── activity.module.ts
│   │   ├── activity.controller.ts
│   │   └── activity.service.ts
│   │
│   ├── saved-filters/
│   │   ├── saved-filters.module.ts
│   │   ├── saved-filters.controller.ts
│   │   ├── saved-filters.service.ts
│   │   └── dto/create-filter.dto.ts
│   │
│   ├── settings/
│   │   ├── settings.module.ts
│   │   ├── settings.controller.ts
│   │   ├── settings.service.ts
│   │   └── dto/update-settings.dto.ts
│   │
│   ├── search/
│   │   ├── search.module.ts
│   │   ├── search.controller.ts
│   │   └── search.service.ts
│   │
│   └── system/
│       ├── system.module.ts
│       ├── system.controller.ts
│       └── system.service.ts
├── test/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## Phase 7 — Controller → Service → Prisma Architectural Flow

### Real Project Flow: Ticket Escalation (`POST /api/issues/:id/escalate`)
1. **React UI**: Support agent on `IssueDetailPage` clicks "Escalate", fills out `EscalateModal` (`toLevel: 'L2'`, `reason`, `assignedToUserId`), and submits.
2. **HTTP Request**:
   ```http
   POST /api/issues/INB-1002/escalate HTTP/1.1
   Authorization: Bearer <jwt_token>
   Content-Type: application/json

   {
     "toLevel": "L2",
     "reason": "API schema validation error confirmed. Handing off to technical support.",
     "assignedToUserId": "user-3"
   }
   ```
3. **Controller**:
   ```typescript
   @Post(':id/escalate')
   @UseGuards(JwtAuthGuard)
   async escalateIssue(
     @Param('id') id: string,
     @Body() dto: EscalateIssueDto,
     @CurrentUser() user: AuthenticatedUser,
   ) {
     return this.issuesService.escalate(id, dto, user.id);
   }
   ```
4. **Validation Pipe**: Intercepts the request, validates `toLevel` is one of `['L1', 'L2', 'L3']`, validates `reason` has minimum length, sanitizes payload.
5. **Service Layer** (`IssuesService`):
   - Executes an atomic PostgreSQL transaction with `prisma.$transaction`:
     1. Fetches current issue status and current support level (`fromLevel`).
     2. Verifies escalation level hierarchy.
     3. Inserts `EscalationRecord`.
     4. Updates `Issue` fields: `supportLevel = toLevel`, `isEscalated = true`, `assigneeId = assignedToUserId`.
     5. Inserts an automated internal comment (`[Internal Escalation Note]`).
     6. Inserts `ActivityEvent` audit record.
     7. Inserts `Notification` for `assignedToUserId`.
6. **Prisma Service**:
   ```typescript
   return this.prisma.$transaction(async (tx) => {
     const issue = await tx.issue.findUniqueOrThrow({ where: { id } });
     
     const record = await tx.escalationRecord.create({
       data: {
         issueId: id,
         fromLevel: issue.supportLevel,
         toLevel: dto.toLevel,
         reason: dto.reason,
         escalatedByUserId: currentUserId,
         assignedToUserId: dto.assignedToUserId || issue.assigneeId,
       },
     });

     await tx.comment.create({
       data: {
         issueId: id,
         authorId: currentUserId,
         type: 'internal',
         content: `[Internal Escalation Note] Escalated from ${issue.supportLevel} to ${dto.toLevel}.\nReason: ${dto.reason}`,
       },
     });

     await tx.activityEvent.create({
       data: {
         issueId: id,
         projectId: issue.projectId,
         userId: currentUserId,
         action: 'escalated',
         details: `escalated ${id} ${issue.supportLevel} -> ${dto.toLevel} (Reason: ${dto.reason})`,
       },
     });

     return tx.issue.update({
       where: { id },
       data: {
         supportLevel: dto.toLevel,
         isEscalated: true,
         assigneeId: dto.assignedToUserId ?? issue.assigneeId,
       },
       include: {
         escalationHistory: true,
         comments: { include: { author: true } },
         assignee: true,
       },
     });
   });
   ```
7. **JSON Response**: Controller returns the full updated `Issue` object with 200 OK.
8. **React State**: React updates `issues` state and immediately displays the new badge, comment note, and toast notification.

---

## Phase 8 — API Endpoints Specification

### 1. Authentication Endpoints (`/api/auth`)
#### `POST /api/auth/login`
- **Purpose**: Authenticate user and issue JWT.
- **Auth Required**: No.
- **Body**: `{ "emailOrId": "tejas@inbox.GoldMine.io", "password": "admin123" }`
- **Response**: `{ "accessToken": "eyJhbGci...", "user": { "id": "user-1", "name": "Tejas Chauhan", "email": "...", "role": "Admin", "supportLevels": ["L1","L2","L3"] } }`
- **Errors**: `400 Bad Request`, `401 Unauthorized`.
- **Frontend Component**: `LoginPage`.

#### `GET /api/auth/me`
- **Purpose**: Fetch currently authenticated user profile.
- **Auth Required**: Yes (`Bearer`).
- **Response**: `User` object.
- **Errors**: `401 Unauthorized`.
- **Frontend Component**: `AppLayout`, `UserSwitcher`.

#### `POST /api/auth/logout`
- **Purpose**: Terminate session.
- **Auth Required**: Yes.
- **Response**: `{ "success": true }`
- **Frontend Component**: `UserSwitcher`, `Sidebar`.

---

### 2. User & Team Endpoints (`/api/users`)
#### `GET /api/users`
- **Purpose**: Fetch team members list.
- **Auth Required**: Yes.
- **Query Params**: `q?: string`, `role?: string`, `supportLevel?: string`.
- **Response**: `User[]`
- **Frontend Component**: `TeamPage`, `AdminPanelPage`, `CreateIssueModal`.

#### `POST /api/users`
- **Purpose**: Create a new member account.
- **Auth Required**: Yes (`Admin` or `Project Manager`).
- **Body**: `{ "name": "Rajesh Kumar", "email": "rajesh@inbox.GoldMine.io", "password": "password123", "role": "Support Agent", "department": "Customer Operations", "supportLevels": ["L1"] }`
- **Response**: `User`
- **Errors**: `409 Conflict` (Email already taken), `403 Forbidden`.
- **Frontend Component**: `TeamPage`, `AdminPanelPage`.

#### `PATCH /api/users/:id`
- **Purpose**: Update user information.
- **Auth Required**: Yes.
- **Body**: Partial `User` fields.
- **Response**: `User`
- **Frontend Component**: `TeamPage`, `AdminPanelPage`.

#### `PATCH /api/users/:id/password`
- **Purpose**: Admin password reset or user credential update.
- **Auth Required**: Yes (`Admin` or self).
- **Body**: `{ "newPassword": "newSecurePassword123" }`
- **Response**: `{ "success": true }`
- **Errors**: `400 Bad Request` (< 4 chars).
- **Frontend Component**: `AdminPanelPage`.

#### `DELETE /api/users/:id`
- **Purpose**: Remove team member.
- **Auth Required**: Yes (`Admin`).
- **Response**: `{ "success": true }`
- **Frontend Component**: `AdminPanelPage`, `TeamPage`.

---

### 3. Issue & Ticket Endpoints (`/api/issues`)
#### `GET /api/issues`
- **Purpose**: Retrieve issues list with filtering and search.
- **Auth Required**: Yes.
- **Query Params**:
  - `q`: Search string (ticket ID, title, description, labels)
  - `status`: Filter by `IssueStatus`
  - `priority`: Filter by `Priority`
  - `supportLevel`: Filter by `SupportLevel` (`L1`, `L2`, `L3`)
  - `assigneeId`: Filter by assignee ID (or `unassigned`, or `me`)
  - `projectId`: Filter by project
  - `sprintId`: Filter by sprint (or `backlog`)
  - `isEscalated`: Boolean
- **Response**: `Issue[]` with nested `assignee`, `project`, `sprint`.
- **Frontend Component**: `IssuesPage`, `Dashboard`, `KanbanBoard`, `SupportCenterPage`.

#### `GET /api/issues/:id`
- **Purpose**: Retrieve single issue details with comments, attachments, and escalation history.
- **Auth Required**: Yes.
- **Response**: Full `Issue` object.
- **Errors**: `404 Not Found`.
- **Frontend Component**: `IssueDetailPage`.

#### `POST /api/issues`
- **Purpose**: Create ticket with automatic ID generation and SLA calculation.
- **Auth Required**: Yes.
- **Body**:
  ```json
  {
    "projectId": "proj-1",
    "title": "Payment gateway timeout on checkout",
    "description": "Customer unable to pay via credit card",
    "type": "Bug",
    "status": "Open",
    "priority": "High",
    "supportLevel": "L1",
    "assigneeId": "user-2",
    "sprintId": "sprint-4",
    "epicId": "epic-2",
    "labels": ["payment", "checkout"],
    "dueDate": "2026-10-15T18:00:00Z",
    "storyPoints": 5,
    "estimatedTime": "4h"
  }
  ```
- **Response**: Created `Issue` with generated ID (e.g. `INB-1025`) and SLA deadlines.
- **Frontend Component**: `CreateIssueModal`.

#### `PATCH /api/issues/:id`
- **Purpose**: Update issue fields (title, description, assignee, priority, sprint, labels, etc.).
- **Auth Required**: Yes.
- **Body**: Partial `Issue` fields.
- **Response**: Updated `Issue`.
- **Frontend Component**: `IssueDetailPage`, `BacklogPage`.

#### `PATCH /api/issues/:id/status`
- **Purpose**: Dedicated status transition (e.g. Kanban drag and drop).
- **Auth Required**: Yes.
- **Body**: `{ "status": "In Progress" }`
- **Response**: Updated `Issue`.
- **Frontend Component**: `KanbanBoard`.

#### `POST /api/issues/:id/escalate`
- **Purpose**: Escalate support level (`L1 -> L2` or `L2 -> L3`), log escalation record, and add internal note.
- **Auth Required**: Yes.
- **Body**:
  ```json
  {
    "toLevel": "L2",
    "reason": "Stripe API returns non-standard error payload.",
    "assignedToUserId": "user-3"
  }
  ```
- **Response**: Updated `Issue`.
- **Frontend Component**: `EscalateModal`.

#### `DELETE /api/issues/:id`
- **Purpose**: Remove issue.
- **Auth Required**: Yes (`Admin` or `Project Manager`).
- **Response**: `{ "success": true, "id": "INB-1002" }`
- **Frontend Component**: `IssuesPage`, `IssueDetailPage`.

---

### 4. Comment Endpoints (`/api/issues/:id/comments`, `/api/comments/:commentId`)
#### `POST /api/issues/:id/comments`
- **Purpose**: Post public comment or internal team note.
- **Auth Required**: Yes.
- **Body**: `{ "content": "Investigating logs in CloudWatch.", "type": "internal" }`
- **Response**: `Comment` with author relation.
- **Frontend Component**: `IssueDetailPage`.

#### `PATCH /api/comments/:commentId`
- **Purpose**: Update existing comment text.
- **Auth Required**: Yes (Author or Admin).
- **Body**: `{ "content": "Updated investigation notes." }`
- **Response**: `Comment`.
- **Frontend Component**: `IssueDetailPage`.

#### `DELETE /api/comments/:commentId`
- **Purpose**: Delete comment.
- **Auth Required**: Yes (Author or Admin).
- **Response**: `{ "success": true }`
- **Frontend Component**: `IssueDetailPage`.

---

### 5. Attachment Endpoints (`/api/issues/:id/attachments`)
#### `POST /api/issues/:id/attachments`
- **Purpose**: Register uploaded attachment file metadata.
- **Auth Required**: Yes.
- **Body**: `{ "filename": "traceback.log", "fileType": "text/plain", "fileSize": 14200 }`
- **Response**: `Attachment`.
- **Frontend Component**: `IssueDetailPage`.

#### `DELETE /api/issues/:id/attachments/:attachmentId`
- **Purpose**: Delete attachment.
- **Auth Required**: Yes.
- **Response**: `{ "success": true }`
- **Frontend Component**: `IssueDetailPage`.

---

### 6. Project Endpoints (`/api/projects`)
#### `GET /api/projects`
- **Purpose**: List all projects.
- **Auth Required**: Yes.
- **Response**: `Project[]` with leads and issue count statistics.
- **Frontend Component**: `ProjectsPage`.

#### `GET /api/projects/:id`
- **Purpose**: Get project cockpit details with linked sprints and epics.
- **Auth Required**: Yes.
- **Response**: `Project`.
- **Frontend Component**: `ProjectDetailPage`.

#### `POST /api/projects`
- **Purpose**: Create a new project repository.
- **Auth Required**: Yes (`Admin` or `Project Manager`).
- **Body**:
  ```json
  {
    "key": "DEV",
    "name": "Developer SDK",
    "description": "Public client libraries and API wrappers",
    "category": "Software",
    "leadId": "user-1",
    "memberIds": ["user-1", "user-3"]
  }
  ```
- **Response**: `Project`.
- **Errors**: `409 Conflict` (Project key already exists).
- **Frontend Component**: `ProjectsPage`.

#### `PATCH /api/projects/:id`
- **Purpose**: Update project settings.
- **Auth Required**: Yes.
- **Body**: Partial `Project` fields.
- **Response**: `Project`.
- **Frontend Component**: `ProjectsPage`.

#### `DELETE /api/projects/:id`
- **Purpose**: Delete project repository.
- **Auth Required**: Yes (`Admin`).
- **Response**: `{ "success": true }`
- **Frontend Component**: `ProjectsPage`.

---

### 7. Sprint Endpoints (`/api/sprints`)
#### `GET /api/sprints`
- **Purpose**: Fetch sprints list (optional `?projectId=...`).
- **Auth Required**: Yes.
- **Response**: `Sprint[]`.
- **Frontend Component**: `BacklogPage`, `KanbanBoard`.

#### `POST /api/sprints`
- **Purpose**: Create planned sprint.
- **Auth Required**: Yes.
- **Body**: `{ "projectId": "proj-1", "name": "Sprint 6", "goal": "Zero high-priority bugs", "startDate": "2026-10-10", "endDate": "2026-10-24" }`
- **Response**: `Sprint`.
- **Frontend Component**: `BacklogPage`.

#### `POST /api/sprints/:id/start`
- **Purpose**: Mark sprint as active.
- **Auth Required**: Yes.
- **Response**: `Sprint`.
- **Frontend Component**: `BacklogPage`.

#### `POST /api/sprints/:id/complete`
- **Purpose**: Finalize sprint and roll over unresolved tickets to backlog or target sprint.
- **Auth Required**: Yes.
- **Body**: `{ "targetSprintId": "sprint-5" }`
- **Response**: `{ "sprint": Sprint, "rolledOverCount": 4 }`
- **Frontend Component**: `BacklogPage`.

#### `DELETE /api/sprints/:id`
- **Purpose**: Remove sprint and unassign attached issues.
- **Auth Required**: Yes.
- **Response**: `{ "success": true }`
- **Frontend Component**: `BacklogPage`.

---

### 8. Epic Endpoints (`/api/epics`)
#### `GET /api/epics`
- **Purpose**: List epics (optional `?projectId=...`).
- **Auth Required**: Yes.
- **Response**: `Epic[]`.
- **Frontend Component**: `ProjectDetailPage`, `BacklogPage`.

#### `POST /api/epics`
- **Purpose**: Create epic.
- **Auth Required**: Yes.
- **Body**: `{ "projectId": "proj-1", "name": "Authentication V2", "description": "Passkeys support", "color": "#10b981", "status": "To Do" }`
- **Response**: `Epic`.
- **Frontend Component**: `ProjectDetailPage`.

#### `PATCH /api/epics/:id`
- **Purpose**: Update epic.
- **Auth Required**: Yes.
- **Response**: `Epic`.
- **Frontend Component**: `ProjectDetailPage`.

#### `DELETE /api/epics/:id`
- **Purpose**: Remove epic.
- **Auth Required**: Yes.
- **Response**: `{ "success": true }`
- **Frontend Component**: `ProjectDetailPage`.

---

### 9. Notification Endpoints (`/api/notifications`)
#### `GET /api/notifications`
- **Purpose**: Retrieve notifications for currently logged in user.
- **Auth Required**: Yes.
- **Response**: `Notification[]`.
- **Frontend Component**: `NotificationPanel`.

#### `PATCH /api/notifications/:id/read`
- **Purpose**: Mark specific notification as read.
- **Auth Required**: Yes.
- **Response**: `Notification`.
- **Frontend Component**: `NotificationPanel`.

#### `POST /api/notifications/mark-all-read`
- **Purpose**: Mark all user notifications as read.
- **Auth Required**: Yes.
- **Response**: `{ "success": true }`
- **Frontend Component**: `NotificationPanel`.

---

### 10. Saved Filters Endpoints (`/api/saved-filters`)
#### `GET /api/saved-filters`
- **Purpose**: List saved issue filter presets.
- **Auth Required**: Yes.
- **Response**: `SavedFilter[]`.
- **Frontend Component**: `IssuesPage`.

#### `POST /api/saved-filters`
- **Purpose**: Create saved filter preset.
- **Auth Required**: Yes.
- **Body**: `{ "name": "Critical L3 Escalations", "filters": { "supportLevel": "L3", "priority": "Highest" } }`
- **Response**: `SavedFilter`.
- **Frontend Component**: `IssuesPage`.

#### `DELETE /api/saved-filters/:id`
- **Purpose**: Remove saved filter preset.
- **Auth Required**: Yes.
- **Response**: `{ "success": true }`
- **Frontend Component**: `IssuesPage`.

---

### 11. Activity & Audit Endpoints (`/api/activity`)
#### `GET /api/activity`
- **Purpose**: List audit activity records.
- **Auth Required**: Yes.
- **Query Params**: `issueId?: string`, `projectId?: string`, `limit?: number`.
- **Response**: `ActivityEvent[]`.
- **Frontend Component**: `AdminPanelPage` (Audit tab), `IssueDetailPage` (History tab).

---

### 12. Settings & Governance Endpoints (`/api/settings`)
#### `GET /api/settings`
- **Purpose**: Retrieve global workspace configuration, SLA rules, and role page access matrix.
- **Auth Required**: Yes.
- **Response**: `Settings`.
- **Frontend Component**: `SettingsPage`, `AdminPanelPage`, `AppLayout`.

#### `PATCH /api/settings`
- **Purpose**: Update SLA thresholds, role permissions, or workspace branding.
- **Auth Required**: Yes (`Admin` or `Project Manager`).
- **Body**: Partial `Settings` fields.
- **Response**: `Settings`.
- **Frontend Component**: `SettingsPage`, `AdminPanelPage`.

---

### 13. Global Search Endpoint (`/api/search`)
#### `GET /api/search`
- **Purpose**: Multi-entity instant search query.
- **Auth Required**: Yes.
- **Query Param**: `q: string`
- **Response**: `{ "issues": Issue[], "projects": Project[], "epics": Epic[] }`
- **Frontend Component**: `GlobalSearchModal`.

---

### 14. Administrative System Endpoints (`/api/system`)
#### `GET /api/system/export`
- **Purpose**: Generate complete JSON database snapshot.
- **Auth Required**: Yes (`Admin`).
- **Response**: Complete JSON dump containing all tables.
- **Frontend Component**: `AdminPanelPage` (System tab), `SettingsPage`.

#### `POST /api/system/import`
- **Purpose**: Restore database from JSON backup.
- **Auth Required**: Yes (`Admin`).
- **Body**: Full JSON export object.
- **Response**: `{ "success": true, "message": "Database restored successfully." }`
- **Frontend Component**: `AdminPanelPage` (System tab), `SettingsPage`.

#### `POST /api/system/reset`
- **Purpose**: Restore database state to factory seed data (`seedData.ts`).
- **Auth Required**: Yes (`Admin`).
- **Response**: `{ "success": true }`
- **Frontend Component**: `AdminPanelPage`, `SettingsPage`, `UserSwitcher`.

---

## Phase 9 — DTOs & Validation

NestJS DTOs strictly enforce data integrity using `class-validator` and `class-transformer`.

### 1. `CreateIssueDto`
```typescript
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, IsInt, Min, IsDateString } from 'class-validator';
import { IssueType, IssueStatus, Priority, SupportLevel } from '@prisma/client';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(IssueType)
  type: IssueType;

  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;

  @IsEnum(Priority)
  priority: Priority;

  @IsEnum(SupportLevel)
  supportLevel: SupportLevel;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  reporterId?: string;

  @IsString()
  @IsOptional()
  sprintId?: string;

  @IsString()
  @IsOptional()
  epicId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  storyPoints?: number;

  @IsString()
  @IsOptional()
  estimatedTime?: string;
}
```

### 2. `EscalateIssueDto`
```typescript
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { SupportLevel } from '@prisma/client';

export class EscalateIssueDto {
  @IsEnum(SupportLevel)
  toLevel: SupportLevel;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  assignedToUserId?: string;
}
```

### 3. `LoginDto`
```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  emailOrId: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

### 4. `CreateCommentDto`
```typescript
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CommentType } from '@prisma/client';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(CommentType)
  type: CommentType; // 'public' | 'internal'
}
```

### 5. `CreateProjectDto`
```typescript
import { IsNotEmpty, IsString, IsOptional, IsArray, Matches } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Matches(/^[A-Z0-9]{2,6}$/, { message: 'Project key must be 2-6 uppercase alphanumeric characters' })
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsNotEmpty()
  leadId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  memberIds?: string[];
}
```

---

## Phase 10 — Authentication & Role-Based Access Control (RBAC)

### 1. Requirements Derived From Frontend
- **Frontend Login**: Users login with `email` or `userId` and password.
- **Password Fallback**: In the seed data, standard users default to `password123`, Admin defaults to `admin123`. In production backend, passwords will be hashed using `bcrypt` (10 rounds).
- **JWT Payload**:
  ```typescript
  export interface JwtPayload {
    sub: string;       // userId
    email: string;
    role: UserRole;
    supportLevels: SupportLevel[];
  }
  ```
- **RBAC Matrix**: The frontend features a dynamic Role-to-Page permission map defined in `src/services/rbac.ts` and managed in `AdminPanelPage`.
  - Roles: `Admin`, `Project Manager`, `Engineer`, `Technical`, `Developer`, `QA`, `Support Agent`, `Viewer`.
  - Pages: `dashboard`, `issues`, `board`, `backlog`, `support`, `reports`, `projects`, `team`, `admin`, `settings`, `profile`, `docs`.
  - Admin always has absolute access.

### 2. NestJS Guards Implementation
#### `JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts`)
Validates incoming `Authorization: Bearer <token>` and attaches the user object to `request.user`.

#### `RolesGuard` (`src/common/guards/roles.guard.ts`)
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (user.role === UserRole.Admin) return true; // Superuser bypass
    return requiredRoles.includes(user.role);
  }
}
```

---

## Phase 11 — Error Handling & Exception Filter Architecture

### Consistent JSON Error Structure
Every error returned by the backend conforms to this standard JSON contract:
```json
{
  "statusCode": 404,
  "message": "Ticket INB-9999 was not found.",
  "error": "Not Found",
  "timestamp": "2026-10-07T18:00:00.000Z",
  "path": "/api/issues/INB-9999"
}
```

### 1. `HttpExceptionFilter` (`src/common/filters/http-exception.filter.ts`)
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const res = exception.getResponse();

    const message = typeof res === 'object' && res !== null && 'message' in res 
      ? (res as any).message 
      : exception.message;

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.name,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 2. `PrismaExceptionFilter` (`src/common/filters/prisma-exception.filter.ts`)
Translates Prisma database errors to clean HTTP status codes:
- `P2002` (Unique constraint failed, e.g. duplicate email or project key) -> `409 Conflict`.
- `P2025` (Record to update or delete not found) -> `404 Not Found`.
- `P2003` (Foreign key constraint violation) -> `400 Bad Request`.

---

## Phase 12 — Request Validation Architecture

In `main.ts`, the global NestJS `ValidationPipe` is registered:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Strips unexpected fields
    forbidNonWhitelisted: true,    // Throws 400 if extra properties are sent
    transform: true,              // Automatically coerces payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

---

## Phase 13 — Database Performance & SLA Query Optimization

### 1. Real-Time SLA Calculations vs Database Queries
In the frontend, tickets have:
- `createdDate`
- `responseSLAHours`
- `resolutionSLAHours`
- `firstRespondedAt`
- `resolvedAt`

A ticket is considered **Breached** if:
`resolvedAt ? (resolvedAt > deadline) : (NOW() > deadline)`.

**Optimization Strategy**:
Do not calculate SLA by querying all rows in JavaScript. Instead, construct indexed PostgreSQL expressions or compute deadline timestamps at write time:
```sql
-- Computed deadline column indexing
ALTER TABLE "Issue" ADD COLUMN "resolutionDeadline" TIMESTAMP GENERATED ALWAYS AS 
("createdDate" + ("resolutionSLAHours" || ' hours')::interval) STORED;

CREATE INDEX idx_issue_resolution_deadline ON "Issue" ("resolutionDeadline") 
WHERE "status" NOT IN ('Resolved', 'Closed');
```
This enables querying urgent or breached tickets in `< 2ms` even on millions of rows.

### 2. Eliminating the N+1 Problem with Prisma
Instead of executing secondary queries per ticket to load assignees and comments:
```typescript
// Optimized single round-trip query with selective fields
const issues = await this.prisma.issue.findMany({
  where: filterWhereClause,
  select: {
    id: true,
    title: true,
    status: true,
    priority: true,
    supportLevel: true,
    isEscalated: true,
    responseSLAHours: true,
    resolutionSLAHours: true,
    createdDate: true,
    firstRespondedAt: true,
    resolvedAt: true,
    assignee: {
      select: { id: true, name: true, avatar: true, role: true },
    },
    project: {
      select: { id: true, key: true, name: true },
    },
    _count: {
      select: { comments: true, attachments: true },
    },
  },
  orderBy: { createdDate: 'desc' },
  take: 50,
});
```

### 3. PostgreSQL Indexes Plan
1. `CREATE INDEX idx_issues_proj_status ON "Issue" ("projectId", "status");` (Kanban Board queries).
2. `CREATE INDEX idx_issues_support_status ON "Issue" ("supportLevel", "status");` (Support Center tiered queues).
3. `CREATE INDEX idx_issues_assignee ON "Issue" ("assigneeId");` (My Tickets filter).
4. `CREATE INDEX idx_comments_issue_type ON "Comment" ("issueId", "type");` (Issue Detail comment tabs).
5. `CREATE INDEX idx_notifications_user_read ON "Notification" ("userId", "read");` (Topbar unread count badge).

---

## Phase 14 — React 19 Frontend Integration Strategy

Connecting the React frontend to the NestJS backend without altering the UI layout:

### 1. HTTP API Client (`src/services/api.ts`)
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('inbox_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP Error ${response.status}`);
  }

  return response.json();
}
```

### 2. Transition in `src/context/AppContext.tsx`
Replace `storage.getIssues()` with initial fetch:
```typescript
useEffect(() => {
  async function loadInitialData() {
    try {
      const [fetchedIssues, fetchedProjects, fetchedUsers, fetchedSettings] = await Promise.all([
        apiRequest<Issue[]>('/issues'),
        apiRequest<Project[]>('/projects'),
        apiRequest<User[]>('/users'),
        apiRequest<Settings>('/settings'),
      ]);
      setIssues(fetchedIssues);
      setProjects(fetchedProjects);
      setUsers(fetchedUsers);
      setSettings(fetchedSettings);
    } catch (err) {
      console.error('Failed to connect to NestJS backend', err);
    }
  }
  if (isAuthenticated) {
    loadInitialData();
  }
}, [isAuthenticated]);
```

---

## Phase 15 — Environment Variables & Configuration

### Backend `.env`
```env
# Application Port
PORT=4000

# Node Environment
NODE_ENV=development

# PostgreSQL Connection String (Prisma)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/inbox_ticketing?schema=public"

# JWT Authentication Secret & Expiration
JWT_SECRET="inbox_jwt_super_secret_production_key_2026_xyz"
JWT_EXPIRATION="7d"

# Allowed CORS Origins (React Vite Frontend)
CORS_ORIGIN="http://localhost:3000"
```

### Backend `.env.example`
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
JWT_SECRET="your-256-bit-secret"
JWT_EXPIRATION="7d"
CORS_ORIGIN="http://localhost:3000"
```

---

## Phase 16 — Step-by-Step Project Setup & Migration Guide

### 1. Initialize NestJS Backend Directory
In the workspace root:
```bash
npx -y @nestjs/cli new backend --package-manager npm --skip-git
cd backend
```

### 2. Install Required Dependencies
```bash
npm install @prisma/client @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer dotenv
npm install -D prisma @types/passport-jwt @types/bcrypt @types/node
```

### 3. Initialize Prisma with PostgreSQL
```bash
npx prisma init
```
Copy the complete schema from [Phase 5](#phase-5--complete-prisma-schema-schemaprisma) into `backend/prisma/schema.prisma`.

### 4. Create and Apply Initial Database Migration
```bash
npx prisma migrate dev --name init_inbox_schema
npx prisma generate
```

### 5. Seed Database with Existing Frontend Seed Data
Create `backend/prisma/seed.ts` containing the initial records from `src/data/seedData.ts` (projects, initial users, issues, sprints, epics, comments, activities, settings).
In `backend/package.json`, add:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```
Run the seed command:
```bash
npx prisma db seed
```

### 6. Run the NestJS Backend
```bash
npm run start:dev
```
The REST API will listen on `http://localhost:4000`.

---

## Phase 17 — Complete Backend Directory Structure

```text
backend/
├── prisma/
│   ├── migrations/
│   │   └── 20261007180000_init_inbox_schema/
│   │       └── migration.sql
│   ├── schema.prisma
│   └── seed.ts
│
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── prisma-exception.filter.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       └── roles.guard.ts
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── change-password.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── issues/
│   │   ├── issues.module.ts
│   │   ├── issues.controller.ts
│   │   ├── issues.service.ts
│   │   └── dto/
│   │       ├── create-issue.dto.ts
│   │       ├── update-issue.dto.ts
│   │       ├── escalate-issue.dto.ts
│   │       ├── update-status.dto.ts
│   │       └── query-issues.dto.ts
│   │
│   ├── comments/
│   │   ├── comments.module.ts
│   │   ├── comments.controller.ts
│   │   ├── comments.service.ts
│   │   └── dto/
│   │       ├── create-comment.dto.ts
│   │       └── update-comment.dto.ts
│   │
│   ├── attachments/
│   │   ├── attachments.module.ts
│   │   ├── attachments.controller.ts
│   │   ├── attachments.service.ts
│   │   └── dto/
│   │       └── create-attachment.dto.ts
│   │
│   ├── projects/
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   └── dto/
│   │       ├── create-project.dto.ts
│   │       └── update-project.dto.ts
│   │
│   ├── sprints/
│   │   ├── sprints.module.ts
│   │   ├── sprints.controller.ts
│   │   ├── sprints.service.ts
│   │   └── dto/
│   │       ├── create-sprint.dto.ts
│   │       ├── update-sprint.dto.ts
│   │       └── complete-sprint.dto.ts
│   │
│   ├── epics/
│   │   ├── epics.module.ts
│   │   ├── epics.controller.ts
│   │   ├── epics.service.ts
│   │   └── dto/
│   │       ├── create-epic.dto.ts
│   │       └── update-epic.dto.ts
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   └── notifications.service.ts
│   │
│   ├── activity/
│   │   ├── activity.module.ts
│   │   ├── activity.controller.ts
│   │   └── activity.service.ts
│   │
│   ├── saved-filters/
│   │   ├── saved-filters.module.ts
│   │   ├── saved-filters.controller.ts
│   │   ├── saved-filters.service.ts
│   │   └── dto/
│   │       └── create-filter.dto.ts
│   │
│   ├── settings/
│   │   ├── settings.module.ts
│   │   ├── settings.controller.ts
│   │   ├── settings.service.ts
│   │   └── dto/
│   │       └── update-settings.dto.ts
│   │
│   ├── search/
│   │   ├── search.module.ts
│   │   ├── search.controller.ts
│   │   └── search.service.ts
│   │
│   └── system/
│       ├── system.module.ts
│       ├── system.controller.ts
│       └── system.service.ts
│
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```
