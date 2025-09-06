# 🔍 Resource Removal Flows Analysis

## 📊 **Two Different Removal Contexts**

### **Context 1: ResourceLibrary Removal (From Library)**
**Location:** `lib/hooks/useResourceLibrary.ts`
**Purpose:** Remove resource completely from the system

**Flow:**
```
User clicks "Delete" → handleDeleteResource() → confirmDelete() → 
deleteResource(resourceId) → DELETE /api/resources/{id} → 
Database DELETE → setAllResources() → UI updates
```

**Backend Connection:** ✅ **FULLY CONNECTED**
- Uses `deleteResource()` function
- Makes API call to `DELETE /api/resources/{id}`
- Updates database
- Persists changes

---

### **Context 2: ResourcePage Removal (From Assigned Products)**
**Location:** `lib/hooks/useResourcePage.ts`
**Purpose:** Remove resource from specific funnel (not from system)

**Flow:**
```
User clicks "Remove" → handleDeleteResource() → confirmDelete() → 
Local state update → onUpdateFunnel() → setFunnels() → UI updates
```

**Backend Connection:** ❌ **NOT CONNECTED**
- Only updates local state
- No API call to remove from funnel
- Changes lost on page refresh
- Database not updated

---

## 🚨 **CRITICAL ISSUE IDENTIFIED**

### **Problem:**
The ResourcePage removal flow is **completely disconnected** from the backend. When users remove resources from "Assigned Products", the changes are not persisted to the database.

### **Impact:**
- Users remove resources from funnels
- Changes appear to work (UI updates)
- Page refresh → Changes are lost
- Database still shows resource assigned to funnel
- Inconsistent state between frontend and backend

---

## 🔧 **Required Fix**

### **What Needs to Be Done:**
1. Add `removeResourceFromFunnel` function to `useFunnelManagement`
2. Update ResourcePage to use API call instead of local state
3. Connect the removal flow to `DELETE /api/funnels/{funnelId}/resources/{resourceId}`

### **Expected Fixed Flow:**
```
User clicks "Remove" → handleDeleteResource() → confirmDelete() → 
removeResourceFromFunnel() → DELETE /api/funnels/{funnelId}/resources/{resourceId} → 
Database DELETE → setSelectedFunnel() → UI updates
```

---

## 📋 **Current Status Summary**

| Context | Component | Backend Connected | API Endpoint | Status |
|---------|-----------|-------------------|--------------|---------|
| **Library Removal** | ResourceLibrary | ✅ Yes | `DELETE /api/resources/{id}` | ✅ Working |
| **Assigned Products Removal** | ResourcePage | ❌ No | `DELETE /api/funnels/{id}/resources/{resourceId}` | ❌ Broken |

---

## 🎯 **Next Steps**

1. **HIGH PRIORITY:** Fix ResourcePage removal flow
2. **MEDIUM PRIORITY:** Add error handling for removal operations
3. **LOW PRIORITY:** Add loading states for removal operations

The ResourcePage removal flow must be fixed to ensure data consistency and proper user experience.