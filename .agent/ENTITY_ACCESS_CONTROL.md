# Entity-Level Access Control Implementation

## Overview
Implemented **entity-level access control** for USER role. Users can now only view and modify entities that an admin has explicitly granted them access to via the Admin Panel.

## Changes Made

### Backend Changes

#### 1. **GET /api/entities** - Entity List Filtering
**File**: `server/src/routes/entities.ts`

**Before**: All users could see all entities
**After**: Role-based filtering
- **ADMIN & MAILER**: See all entities
- **USER**: See only entities with granted access via `EntityAccess` table

```typescript
if (userRole === 'ADMIN' || userRole === 'MAILER') {
  entities = await prisma.entity.findMany({ orderBy: { name: 'asc' } });
} else {
  // USER role - filter by EntityAccess
  const userWithAccess = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accessibleEntities: { include: { entity: true } }
    }
  });
  entities = userWithAccess.accessibleEntities.map(access => access.entity);
}
```

#### 2. **GET /api/entities/:id** - Single Entity Access Check
**File**: `server/src/routes/entities.ts`

**Before**: All users could view any entity
**After**: USER role must have explicit access

```typescript
if (userRole === 'USER') {
  const hasAccess = await prisma.entityAccess.findUnique({
    where: {
      userId_entityId: { userId, entityId: id }
    }
  });
  
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this entity' });
  }
}
```

#### 3. **PUT /api/entities/:id** - Update Access Check
**File**: `server/src/routes/entities.ts`

**Before**: USER could update reporting plan for any entity
**After**: USER must have explicit access to update

```typescript
if (userRole === 'USER') {
  // Check access first
  const hasAccess = await prisma.entityAccess.findUnique({
    where: { userId_entityId: { userId, entityId: id } }
  });
  
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this entity' });
  }
  
  // Then allow reporting plan update
  // ... existing logic
}
```

### Documentation Updates

Updated the following documentation files:
1. **`.agent/RBAC_IMPLEMENTATION.md`**
   - Updated User role description
   - Added entity-level access control code examples
   - Updated API endpoints table
   - Updated testing checklist
   - Updated database schema notes

2. **`.agent/RBAC_QUICK_REFERENCE.md`**
   - Updated permissions matrix
   - Updated User role description
   - Added footnotes explaining entity-level access

## How It Works

### For Admins
1. Navigate to **Admin Panel** → **Users** tab
2. Click **Manage Access** for any user
3. Check/uncheck entities to grant/revoke access
4. Changes take effect immediately

### For Users
1. Users only see entities in the navigation that they have access to
2. Attempting to access a non-granted entity returns **403 Forbidden**
3. Users can still:
   - View assigned entities
   - Edit reporting plans for assigned entities
   - Copy and export data from assigned entities

### For Mailers
- No change - Mailers still have access to all entities
- Entity access management does not apply to MAILER role

## Database Schema

The `EntityAccess` table is now actively used:

```prisma
model EntityAccess {
  userId    Int
  entityId  String
  user      User     @relation(fields: [userId], references: [id])
  entity    Entity   @relation(fields: [entityId], references: [id])
  
  @@id([userId, entityId])
}
```

**Composite Primary Key**: `(userId, entityId)` ensures one access record per user-entity pair

## API Response Changes

### GET /api/entities
**Before**:
```json
[
  { "id": "ent_1", "name": "Entity 1" },
  { "id": "ent_2", "name": "Entity 2" },
  { "id": "ent_3", "name": "Entity 3" }
]
```

**After** (for USER with access to only ent_1):
```json
[
  { "id": "ent_1", "name": "Entity 1" }
]
```

### GET /api/entities/:id
**Before**: Returns entity data for any entity
**After** (for USER without access):
```json
{
  "error": "Access denied to this entity"
}
```
**Status**: `403 Forbidden`

## Testing Guide

### Test Entity-Level Access Control

1. **Create a test user with USER role**
   - Login as admin
   - Go to Admin Panel → Users
   - Approve the user and set role to USER

2. **Grant access to specific entities**
   - Click "Manage Access" for the user
   - Select 1-2 entities
   - Click Done

3. **Login as the test user**
   - Verify navigation only shows granted entities
   - Try to access a non-granted entity directly (should get 403)
   - Verify can edit reporting plan for granted entities
   - Verify cannot edit other fields

4. **Revoke access**
   - Login as admin
   - Uncheck entities in Manage Access
   - Login as test user again
   - Verify entities are no longer visible

## Security Considerations

### Defense in Depth
1. **Frontend**: Navigation only shows accessible entities (UX)
2. **Backend**: All entity endpoints check access (Security)
3. **Database**: EntityAccess table enforces permissions (Data layer)

### Access Control Flow
```
User Request → JWT Auth → Role Check → Entity Access Check → Response
```

**For ADMIN/MAILER**:
- JWT Auth ✓ → Role Check ✓ → **Skip Entity Access** → Response

**For USER**:
- JWT Auth ✓ → Role Check ✓ → **Entity Access Check** ✓ → Response
- If no access: Return 403 Forbidden

## Migration Notes

### Existing Users
- All existing USER role accounts will have **zero entity access** by default
- Admin must explicitly grant access to entities
- This is a **breaking change** for existing USER accounts

### Recommended Migration Steps
1. **Before deploying**: Document which users should have access to which entities
2. **After deploying**: 
   - Login as admin
   - Grant appropriate entity access to all USER accounts
   - Notify users of the change

## Future Enhancements

1. **Bulk Access Management**
   - Grant access to multiple users at once
   - Grant access to all entities for a user

2. **Access Templates**
   - Create predefined access templates
   - Apply templates to new users

3. **Time-Based Access**
   - Temporary access grants
   - Auto-expiring permissions

4. **Access Audit Log**
   - Track who granted/revoked access
   - View access history for users

## Troubleshooting

### User can't see any entities
**Cause**: No entity access granted
**Solution**: Admin must grant access via Admin Panel → Manage Access

### User gets 403 error when accessing entity
**Cause**: User doesn't have access to that specific entity
**Solution**: Admin must grant access to that entity

### Navigation shows entities but can't access them
**Cause**: Frontend/backend sync issue
**Solution**: Refresh the page or clear browser cache

---

**Implementation Date**: 2025-12-07
**Version**: 2.0 (Entity-Level Access Control)
