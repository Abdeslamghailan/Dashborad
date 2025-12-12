# User Roles & Access Control - Quick Reference

## Role Permissions Matrix

| Feature / Section | Admin | Mailer_cmhw | User |
|-------------------|-------|-------------|------|
| **Dashboard** | ✅ Full Access | ✅ Full Access | ✅ View Only |
| **Admin Panel** | ✅ Full Access | ❌ No Access | ❌ No Access |
| **Proxy Partition** | ✅ Full Access | ✅ Full Access | ❌ No Access |
| **All Entities** | ✅ Full Access | ✅ View & Edit | ❌ No Access |
| **Assigned Entities** | ✅ Full Access | ✅ View & Edit | ✅ View Only* |
| | | | |
| **Entity Operations** | | | |
| - Create Entity | ✅ Yes | ❌ No | ❌ No |
| - View All Entities | ✅ Yes | ✅ Yes | ❌ No |
| - View Assigned Entities | ✅ Yes | ✅ Yes | ✅ Yes |
| - Edit Entity Name | ✅ Yes | ✅ Yes | ❌ No |
| - Edit Entity Status | ✅ Yes | ✅ Yes | ❌ No |
| - Edit Reporting Plan | ✅ Yes | ✅ Yes | ✅ Yes** |
| - Edit Limits Config | ✅ Yes | ✅ Yes | ❌ No |
| - Delete Entity | ✅ Yes | ❌ No | ❌ No |

\* Users can only view entities that an admin has explicitly granted them access to  
\*\* Users can only edit reporting plans for entities they have access to
| | | | |
| **User Management** | | | |
| - View All Users | ✅ Yes | ❌ No | ❌ No |
| - Approve Users | ✅ Yes | ❌ No | ❌ No |
| - Change User Roles | ✅ Yes | ❌ No | ❌ No |
| - Delete Users | ✅ Yes | ❌ No | ❌ No |
| - Manage Entity Access | ✅ Yes | ❌ No | ❌ No |
| | | | |
| **Data Operations** | | | |
| - Copy Table Data | ✅ Yes | ✅ Yes | ✅ Yes |
| - Export Data | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Role Descriptions

### 🔴 **Admin**
**Full system administrator with complete control**

**Can Access:**
- ✅ Dashboard
- ✅ Admin Panel
- ✅ Proxy Partition
- ✅ All Entities

**Capabilities:**
- Complete CRUD operations on entities
- Full user management (approve, delete, assign roles)
- Manage entity access permissions
- All data operations (view, copy, export)

**Use Case:** System administrators, superusers

---

### 🟡 **Mailer_cmhw**
**Operational user with entity management capabilities**

**Can Access:**
- ✅ Dashboard
- ✅ Proxy Partition
- ✅ All Entities
- ❌ Admin Panel

**Capabilities:**
- View all entities
- Edit entity configurations (name, status, reporting, limits)
- Use proxy partition tools
- Copy and export data

**Restrictions:**
- Cannot create new entities
- Cannot delete entities
- Cannot manage users or permissions
- Cannot access admin panel

**Use Case:** Mailer operators, content managers

---

### 🟢 **User**
**Read-only user with limited modification rights**

**Can Access:**
- ✅ Dashboard (view only)
- ✅ Assigned Entities only (view only)
- ❌ Admin Panel
- ❌ Proxy Partition

**Capabilities:**
- View only entities granted by admin
- Change reporting plans for accessible entities
- Copy and export data from accessible entities

**Restrictions:**
- **Cannot view entities without admin-granted access**
- Cannot modify entity names
- Cannot modify entity status
- Cannot modify limits configuration
- Cannot create or delete entities
- Cannot access admin panel
- Cannot access proxy partition

**Use Case:** Viewers, reporters, analysts with limited entity access

---

## Access Routes

| Route | Admin | Mailer | User |
|-------|-------|--------|------|
| `/` (Dashboard) | ✅ | ✅ | ✅ |
| `/entity/:id` | ✅ | ✅ | ✅ |
| `/admin` | ✅ | ❌ | ❌ |
| `/proxy-partition` | ✅ | ✅ | ❌ |

---

## Implementation Status

✅ **Backend**
- Role-based route protection
- JWT authentication
- Middleware validation
- Role-specific update logic

✅ **Frontend**
- Route guards (AdminRoute, MailerOrAdminRoute)
- Conditional navigation rendering
- Auth context with role flags
- Protected routes

✅ **Database**
- User roles stored in database
- Entity access tracking (prepared for granular permissions)

---

## Quick Testing Guide

### Test Admin Access:
1. Login as Admin user
2. Verify access to `/admin` ✅
3. Verify access to `/proxy-partition` ✅
4. Try creating an entity ✅
5. Try deleting an entity ✅
6. Try managing users ✅

### Test Mailer Access:
1. Login as Mailer user
2. Try accessing `/admin` → Should redirect to `/` ✅
3. Verify access to `/proxy-partition` ✅
4. Try editing an entity (all fields) ✅
5. Verify no create/delete buttons for entities ✅

### Test User Access:
1. Login as User
2. Try accessing `/admin` → Should redirect to `/` ✅
3. Try accessing `/proxy-partition` → Should redirect to `/` ✅
4. Try editing reporting plan ✅
5. Try editing entity name → Should fail ✅
6. Verify copy/export functionality ✅

---

## Security Notes

🔒 **Authentication**: JWT tokens with role information
🔒 **Authorization**: Backend validates roles on every request
🔒 **Defense in Depth**: Multiple layers (UI, routes, API, database)
🔒 **Token Storage**: localStorage with automatic refresh
🔒 **Route Protection**: Frontend guards + backend middleware

---

**Last Updated**: 2025-12-07
**Version**: 1.0
