# Role-Based Access Control (RBAC) Implementation

## Overview
This document describes the complete role-based access control system implemented in the dashboard application.

## User Roles

### 1. **Admin**
**Full system access with administrative privileges**

#### Access Rights:
- ✅ **Dashboard**: Full access to global dashboard and all entity dashboards
- ✅ **Admin Panel**: Complete user and entity management
  - View all users
  - Approve/reject user registrations
  - Assign user roles (Admin, Mailer, User)
  - Delete users
  - Manage entity access permissions
  - Create, edit, and delete entities
- ✅ **Proxy Partition**: Full access to proxy management tools
- ✅ **All Entities**: Complete CRUD operations
  - Create new entities
  - Update all entity fields (name, status, reporting plans, limits)
  - Delete entities
  - View all entity data

#### Implementation Details:
- **Route Protection**: `AdminRoute` component (App.tsx:33-43)
- **Middleware**: `requireAdmin` middleware (auth.ts:29-34)
- **Navigation**: Admin Panel and Proxy Partition links visible (Layout.tsx:70-94)
- **Backend Validation**: All admin endpoints require `requireAdmin` middleware

---

### 2. **Mailer_cmhw** (MAILER role)
**Operational access without administrative privileges**

#### Access Rights:
- ✅ **Dashboard**: Full access to global dashboard and all entity dashboards
- ✅ **Proxy Partition**: Full access to proxy management tools
- ✅ **All Entities**: Can view and modify all entities
  - View all entities
  - Update entity configurations (name, status, reporting plans, limits)
  - Cannot create new entities
  - Cannot delete entities
- ❌ **Admin Panel**: No access (route protected)

#### Restrictions:
- Cannot access `/admin` route (redirected to `/`)
- Cannot manage users or permissions
- Cannot create or delete entities

#### Implementation Details:
- **Route Protection**: Proxy Partition accessible via conditional check (App.tsx:60-67, Layout.tsx:83-94)
- **Entity Updates**: Full update permissions in entities.ts:142-160
- **Navigation**: Proxy Partition link visible, Admin Panel hidden

---

### 3. **User**
**Read-only access with limited modification capabilities**

#### Access Rights:
- ✅ **Dashboard**: View-only access to global dashboard
- ✅ **View Assigned Entities**: Can only see entities that an admin has granted them access to
- ✅ **Reporting Plan**: Can modify reporting plans for accessible entities only
- ✅ **Data Export**: Can copy and export data from accessible entities
- ❌ **No Modifications**: Cannot modify entity names, status, or limits
- ❌ **No Creation/Deletion**: Cannot create or delete entities
- ❌ **Admin Panel**: No access
- ❌ **Proxy Partition**: No access

#### Allowed Actions:
1. **View Assigned Entities**: Only entities explicitly granted by admin via EntityAccess
2. **Change Reporting Plan**: Update reporting configurations for accessible entities
3. **Copy Table Data**: Frontend capability to copy data from tables
4. **Export Data**: Frontend capability to export entity data

#### Restrictions:
- **Cannot view entities without explicit access** - Admin must grant access
- Cannot modify entity name
- Cannot modify entity status
- Cannot modify limits configuration
- Cannot access admin panel
- Cannot access proxy partition tools
- Cannot create or delete entities

#### Implementation Details:
- **Route Protection**: Cannot access `/admin` or `/proxy-partition`
- **Entity Filtering**: Backend filters entities based on `EntityAccess` table
- **Backend Validation**: entities.ts:110-139 restricts updates to reporting field only
- **Access Check**: All entity endpoints verify user has access via EntityAccess
- **Frontend**: Only accessible entities shown in navigation

---

## Technical Implementation

### Backend (Server)

#### 1. Authentication Middleware (`server/src/middleware/auth.ts`)
```typescript
// Verifies JWT token and attaches user to request
export function authenticateToken(req, res, next)

// Ensures user has ADMIN role
export function requireAdmin(req, res, next)
```

#### 2. Route Protection

**Admin Routes** (`server/src/routes/admin.ts`):
- All routes require `authenticateToken` + `requireAdmin`
- Endpoints:
  - `GET /api/admin/users` - List all users
  - `PUT /api/admin/users/:id/role` - Update user role
  - `PUT /api/admin/users/:id/approve` - Approve/reject user
  - `DELETE /api/admin/users/:id` - Delete user
  - `POST /api/admin/assign` - Grant entity access
  - `POST /api/admin/revoke` - Revoke entity access

**Entity Routes** (`server/src/routes/entities.ts`):
- `GET /api/entities` - **Role-based filtering**:
  - **ADMIN/MAILER**: View all entities
  - **USER**: View only entities with granted access via EntityAccess
- `GET /api/entities/:id` - **Role-based access check**:
  - **ADMIN/MAILER**: View any entity
  - **USER**: View only if access granted via EntityAccess
- `POST /api/entities` - Admin only (create entity)
- `PUT /api/entities/:id` - Role-based update logic:
  - **USER**: Can only update `reporting` field (and must have access)
  - **MAILER**: Can update all fields (name, status, reporting, limits)
  - **ADMIN**: Can update all fields
- `DELETE /api/entities/:id` - Admin only

#### 3. Entity-Level Access Control (`entities.ts`)

**GET /api/entities** - List entities with role-based filtering:
```typescript
if (userRole === 'ADMIN' || userRole === 'MAILER') {
  // Admin and Mailer can see all entities
  entities = await prisma.entity.findMany({ orderBy: { name: 'asc' } });
} else {
  // Regular users can only see entities they have access to
  const userWithAccess = await prisma.user.findUnique({
    where: { id: userId },
    include: { accessibleEntities: { include: { entity: true } } }
  });
  entities = userWithAccess.accessibleEntities.map(access => access.entity);
}
```

**GET /api/entities/:id** - Single entity with access check:
```typescript
if (userRole === 'USER') {
  const hasAccess = await prisma.entityAccess.findUnique({
    where: { userId_entityId: { userId, entityId: id } }
  });
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this entity' });
  }
}
```

**PUT /api/entities/:id** - Update with access check:
```typescript
if (userRole === 'USER') {
  // Check if user has access to this entity
  const hasAccess = await prisma.entityAccess.findUnique({
    where: { userId_entityId: { userId, entityId: id } }
  });
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Preserve existing data, only update reporting
  const existingData = JSON.parse(existingEntity.data);
  const entityData = {
    ...existingData,
    reporting // Only allow updating reporting
  };
}

// ADMIN and MAILER have full update access
```

### Frontend (Client)

#### 1. Auth Context (`contexts/AuthContext.tsx`)
Provides:
- `user` - Current user object with role
- `isAdmin` - Boolean flag for admin role
- `isMailer` - Boolean flag for mailer role
- `token` - JWT authentication token

#### 2. Route Protection (`App.tsx`)

**ProtectedRoute**:
- Requires authentication
- Redirects to `/login` if not authenticated
- Used for: Dashboard, Entity pages

**AdminRoute**:
- Requires authentication + Admin role
- Redirects to `/` if not admin
- Used for: Admin Panel, Proxy Partition (Admin only)

**Proxy Partition Access**:
- Accessible by Admin and Mailer roles
- Conditional rendering in Layout navigation

#### 3. Navigation (`components/Layout.tsx`)

**Conditional Menu Items**:
```typescript
// Admin Panel - Admin only
{isAdmin && (
  <Link to="/admin">Admin Panel</Link>
)}

// Proxy Partition - Admin or Mailer
{(isAdmin || user?.role === 'MAILER') && (
  <Link to="/proxy-partition">Proxy Partition</Link>
)}

// Entities - All authenticated users
{entities.map(entity => (
  <Link to={`/entity/${entity.id}`}>{entity.name}</Link>
))}
```

#### 4. UI Permissions

**Entity Dashboard Components**:
- Should conditionally render edit/delete buttons based on role
- USER role: Only show reporting plan editor
- MAILER/ADMIN: Show all editing capabilities

**Recommended Frontend Checks**:
```typescript
const { user, isAdmin, isMailer } = useAuth();
const canEditEntity = isAdmin || isMailer;
const canEditReporting = true; // All users
const canEditOtherFields = isAdmin || isMailer;
const canDeleteEntity = isAdmin;
```

---

## Security Considerations

### 1. **Defense in Depth**
- Frontend UI restrictions (UX)
- Frontend route guards (prevent navigation)
- Backend route middleware (authentication)
- Backend role checks (authorization)
- Database-level permissions (future enhancement)

### 2. **Token-Based Authentication**
- JWT tokens stored in localStorage
- Tokens include user ID, role, and Telegram ID
- All API requests include `Authorization: Bearer <token>` header
- Tokens verified on every request

### 3. **Role Validation**
- User role stored in database
- Role included in JWT payload
- Backend validates role on every protected endpoint
- Frontend uses role for UI rendering only (not security)

---

## Testing Checklist

### Admin Role
- [ ] Can access `/admin` route
- [ ] Can access `/proxy-partition` route
- [ ] Can view all entities
- [ ] Can create new entities
- [ ] Can update all entity fields
- [ ] Can delete entities
- [ ] Can view all users in admin panel
- [ ] Can approve/reject users
- [ ] Can change user roles
- [ ] Can delete users
- [ ] Can assign/revoke entity access

### Mailer Role
- [ ] Cannot access `/admin` route (redirected)
- [ ] Can access `/proxy-partition` route
- [ ] Can view all entities
- [ ] Can update entity name, status, reporting, limits
- [ ] Cannot create entities (no UI button)
- [ ] Cannot delete entities (no UI button)
- [ ] Cannot access admin panel

### User Role
- [ ] Cannot access `/admin` route (redirected)
- [ ] Cannot access `/proxy-partition` route (redirected)
- [ ] **Can only view entities granted by admin** (not all entities)
- [ ] Cannot view entities without explicit access (403 error)
- [ ] Can update reporting plan for accessible entities only
- [ ] Cannot update reporting plan for non-accessible entities
- [ ] Cannot update entity name
- [ ] Cannot update entity status
- [ ] Cannot update entity limits
- [ ] Cannot create entities
- [ ] Cannot delete entities
- [ ] Can copy table data from accessible entities
- [ ] Can export data from accessible entities
- [ ] Navigation only shows accessible entities

---

## Future Enhancements

### 1. **Granular Permissions**
- Entity-level permissions (specific entities per user)
- Feature-level permissions (e.g., can export but not copy)
- Time-based access (temporary permissions)

### 2. **Audit Logging**
- Log all admin actions
- Track entity modifications
- User access history

### 3. **Permission Groups**
- Create custom permission groups
- Assign multiple roles to users
- Role inheritance

### 4. **Frontend Improvements**
- Disable UI elements instead of hiding them
- Show permission tooltips ("Admin only")
- Better error messages for unauthorized actions

---

## API Endpoints Summary

| Endpoint | Method | Admin | Mailer | User | Description |
|----------|--------|-------|--------|------|-------------|
| `/api/entities` | GET | ✅ (all) | ✅ (all) | ✅ (assigned only) | List entities |
| `/api/entities/:id` | GET | ✅ (any) | ✅ (any) | ✅ (if access granted) | Get single entity |
| `/api/entities` | POST | ✅ | ❌ | ❌ | Create entity |
| `/api/entities/:id` | PUT | ✅ (all fields) | ✅ (all fields) | ✅ (reporting only, if access) | Update entity |
| `/api/entities/:id` | DELETE | ✅ | ❌ | ❌ | Delete entity |
| `/api/admin/users` | GET | ✅ | ❌ | ❌ | List users |
| `/api/admin/users/:id/role` | PUT | ✅ | ❌ | ❌ | Update role |
| `/api/admin/users/:id/approve` | PUT | ✅ | ❌ | ❌ | Approve user |
| `/api/admin/users/:id` | DELETE | ✅ | ❌ | ❌ | Delete user |
| `/api/admin/assign` | POST | ✅ | ❌ | ❌ | Grant entity access |
| `/api/admin/revoke` | POST | ✅ | ❌ | ❌ | Revoke entity access |

---

## Database Schema

### User Model
```prisma
model User {
  id                  Int            @id @default(autoincrement())
  telegramId          String         @unique
  username            String?
  firstName           String?
  lastName            String?
  photoUrl            String?
  role                String         @default("USER") // ADMIN, MAILER, USER
  isApproved          Boolean        @default(false)
  createdAt           DateTime       @default(now())
  accessibleEntities  EntityAccess[]
}
```

### Entity Access Model
```prisma
model EntityAccess {
  userId    Int
  entityId  String
  user      User     @relation(fields: [userId], references: [id])
  entity    Entity   @relation(fields: [entityId], references: [id])
  
  @@id([userId, entityId])
}
```

**Implementation**: 
- **ADMIN and MAILER**: Can view all entities without EntityAccess records
- **USER role**: Entity-level access control is **actively enforced**
  - Users can only view/update entities they have explicit access to
  - Admin must grant access via the Admin Panel
  - EntityAccess table stores user-to-entity permissions

---

## Environment Variables

Required for authentication:
```env
JWT_SECRET=your-secret-key-here
```

---

## Contact & Support

For questions or issues related to RBAC implementation, please refer to:
- Backend routes: `server/src/routes/`
- Middleware: `server/src/middleware/auth.ts`
- Frontend auth: `contexts/AuthContext.tsx`
- Route protection: `App.tsx`

Last Updated: 2025-12-07
