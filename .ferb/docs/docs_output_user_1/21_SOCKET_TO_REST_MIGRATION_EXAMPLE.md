# Socket.IO to REST Migration Example
## Real-World Before/After Migration Guide

**Document Version:** 1.0
**Date:** January 28, 2026
**Status:** Phase 6 - Frontend Migration Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Pattern](#migration-pattern)
3. [Example 1: Hook Migration (useClients → useClientsREST)](#example-1-hook-migration)
4. [Example 2: Component Migration (AddClient Modal)](#example-2-component-migration)
5. [Key Differences Summary](#key-differences-summary)
6. [Migration Checklist](#migration-checklist)

---

## Overview

This document provides real-world examples of migrating from Socket.IO to REST APIs while maintaining real-time updates via Socket.IO broadcasts.

### Architecture: Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │   Component     │────────▶│  REST Hook      │               │
│  │   (add_client)  │         │  (useClientsREST)│              │
│  └─────────────────┘         └────────┬────────┘               │
│                                       │                         │
│                              ┌────────▼────────┐               │
│                              │   HTTP Request  │               │
│                              │   (axios/fetch)  │               │
│                              └────────┬────────┘               │
│                                       │                         │
└───────────────────────────────────────┼─────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │   REST Route    │────────▶│   Database      │               │
│  │  (/api/clients) │         │   (MongoDB)     │               │
│  └────────┬────────┘         └─────────────────┘               │
│           │                                                        │
│           │                                                        │
│           ▼                                                        │
│  ┌─────────────────┐                                               │
│  │ Socket.IO       │                                               │
│  │ Broadcaster     │───────▶ Real-time update to all clients      │
│  └─────────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefits

| Aspect | Socket.IO Only | REST + Socket.IO Hybrid |
|--------|----------------|------------------------|
| **Scalability** | Limited (connection-per-client) | High (stateless REST) |
| **Caching** | Not cacheable | HTTP caching available |
| **Testing** | Complex (need socket server) | Simple (mock HTTP) |
| **Standard Tools** | Socket.IO specific | Any HTTP client (curl, Postman) |
| **Real-time Updates** | ✅ Yes | ✅ Yes (via broadcasts) |
| **Code Simplicity** | Callback hell | Clean async/await |

---

## Migration Pattern

### Step-by-Step Migration

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION STEPS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Identify Socket.IO emits in your component/hook              │
│     ▼                                                            │
│  2. Import the corresponding REST hook                           │
│     ▼                                                            │
│  3. Replace socket.emit() with REST hook function calls         │
│     ▼                                                            │
│  4. Remove socket.on() for request responses                    │
│     ▼                                                            │
│  5. Keep socket.on() for broadcast events (real-time updates)   │
│     ▼                                                            │
│  6. Test that everything still works                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 1: Hook Migration (useClients → useClientsREST)

### BEFORE: Socket.IO-Only Hook

**File:** `react/src/hooks/useClients.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { Socket } from 'socket.io-client';

export const useClients = () => {
  const socket = useSocket() as Socket | null;
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(false);

  // ❌ OLD: Fetch data using Socket.IO emit
  const fetchAllData = useCallback((filters: ClientFilters = {}) => {
    if (!socket) return;
    setLoading(true);
    socket.emit('client:getAllData', filters);
  }, [socket]);

  // ❌ OLD: Create client using Socket.IO emit + response listener
  const createClient = useCallback(async (clientData: Partial<Client>): Promise<boolean> => {
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit('client:create', clientData);

      const handleResponse = (response: any) => {
        if (response.done) {
          message.success('Client created successfully!');
          fetchAllData();
          resolve(true);
        } else {
          message.error(`Failed: ${response.error}`);
          resolve(false);
        }
        socket.off('client:create-response', handleResponse);
      };

      socket.on('client:create-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // ❌ OLD: Listen for data response
  useEffect(() => {
    if (!socket) return;

    const handleGetAllDataResponse = (response: any) => {
      setLoading(false);
      if (response.done) {
        setClients(response.data.clients || []);
        setStats(response.data.stats || {});
      }
    };

    socket.on('client:getAllData-response', handleGetAllDataResponse);

    return () => {
      socket.off('client:getAllData-response', handleGetAllDataResponse);
    };
  }, [socket]);

  return { clients, stats, loading, fetchAllData, createClient };
};
```

**Problems with Old Approach:**
- 🔴 Multiple nested callbacks for each operation
- 🔴 Manual Promise wrapping required
- 🔴 Need to manually manage response listeners
- 🔴 Difficult to test (requires Socket.IO server)
- 🔴 No TypeScript autocomplete for response structure

---

### AFTER: REST + Socket.IO Hybrid Hook

**File:** `react/src/hooks/useClientsREST.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { get, post, put, del, buildParams, ApiResponse } from '../services/api';

export const useClientsREST = () => {
  const socket = useSocket();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ NEW: Fetch data using REST API
  const fetchClients = useCallback(async (filters: ClientFilters = {}) => {
    setLoading(true);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Client[]> = await get('/clients', { params });

      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to fetch clients';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ NEW: Create client using REST API (clean async/await)
  const createClient = useCallback(async (clientData: Partial<Client>): Promise<boolean> => {
    try {
      const response: ApiResponse<Client> = await post('/clients', clientData);

      if (response.success && response.data) {
        message.success('Client created successfully!');
        setClients(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create client');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      message.error(errorMessage);
      return false;
    }
  }, []);

  // ✅ NEW: Keep Socket.IO for REAL-TIME BROADCASTS only
  useEffect(() => {
    if (!socket) return;

    const handleClientCreated = (data: Client) => {
      // Another user created a client - update our list
      setClients(prev => [...prev, data]);
    };

    const handleClientUpdated = (data: Client) => {
      setClients(prev =>
        prev.map(client => (client._id === data._id ? { ...client, ...data } : client))
      );
    };

    const handleClientDeleted = (data: { _id: string }) => {
      setClients(prev => prev.filter(client => client._id !== data._id));
    };

    socket.on('client:created', handleClientCreated);
    socket.on('client:updated', handleClientUpdated);
    socket.on('client:deleted', handleClientDeleted);

    return () => {
      socket.off('client:created', handleClientCreated);
      socket.off('client:updated', handleClientUpdated);
      socket.off('client:deleted', handleClientDeleted);
    };
  }, [socket]);

  return { clients, stats, loading, fetchClients, createClient };
};
```

**Benefits of New Approach:**
- ✅ Clean async/await pattern
- ✅ No manual Promise wrapping
- ✅ No response listener management for requests
- ✅ Easy to test (mock axios)
- ✅ Full TypeScript support
- ✅ Real-time updates still work via Socket.IO broadcasts

---

## Example 2: Component Migration (AddClient Modal)

### BEFORE: Socket.IO-Only Component

**File:** `react/src/feature-module/projects/client/add_client.tsx`

```typescript
import React, { useState } from 'react';
import { useSocket } from '../../../SocketContext';
import { Socket } from 'socket.io-client';
import { message } from 'antd';

const AddClient = () => {
  const socket = useSocket() as Socket | null;
  const [formData, setFormData] = useState<ClientFormData>({...});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setLoading(true);
    try {
      // ❌ OLD: Emit Socket.IO event
      socket.emit('client:create', formData);

      // ❌ OLD: Listen for response (callback hell!)
      socket.once('client:create-response', (response: any) => {
        if (response.done) {
          message.success('Client created successfully!');
          closeModal();
        } else {
          message.error(`Failed: ${response.error}`);
        }
        setLoading(false);
      });
    } catch (error) {
      message.error('An error occurred');
      setLoading(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

---

### AFTER: REST + Socket.IO Hybrid Component

**File:** `react/src/feature-module/projects/client/add_client.tsx`

```typescript
import React, { useState } from 'react';
import { message } from 'antd';
import { useClientsREST } from '../../../hooks/useClientsREST';

const AddClient = () => {
  // ✅ NEW: Use REST hook instead of socket directly
  const { createClient } = useClientsREST();
  const [formData, setFormData] = useState<ClientFormData>({...});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      // ✅ NEW: Clean REST API call
      const success = await createClient(formData);

      if (success) {
        closeModal();
      }
    } catch (error) {
      message.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

**Key Changes:**
1. Removed `useSocket()` from component
2. Imported `useClientsREST` hook
3. Replaced `socket.emit()` + response listener with single `createClient()` call
4. Simplified error handling with try/catch/finally
5. Component doesn't need to know about Socket.IO

---

## Key Differences Summary

### Data Fetching

| Operation | Socket.IO (OLD) | REST (NEW) |
|-----------|----------------|------------|
| **Fetch** | `socket.emit('client:getAllData', filters)` + listener | `await get('/clients', { params })` |
| **Create** | `socket.emit('client:create', data)` + listener | `await post('/clients', data)` |
| **Update** | `socket.emit('client:update', data)` + listener | `await put('/clients/:id', data)` |
| **Delete** | `socket.emit('client:delete', id)` + listener | `await del('/clients/:id')` |
| **Response** | Callback via `socket.on('event-response')` | Direct Promise return |

### Code Comparison

**Fetch Data - Before:**
```typescript
// ❌ 3 steps: emit, listen, handle response
socket.emit('client:getAllData', filters);
socket.on('client:getAllData-response', (response) => {
  if (response.done) {
    setClients(response.data.clients);
  }
});
```

**Fetch Data - After:**
```typescript
// ✅ 1 step: clean async/await
const response = await get('/clients', { params: filters });
setClients(response.data);
```

**Create Item - Before:**
```typescript
// ❌ Nested callbacks, manual cleanup
socket.emit('client:create', data);
const handler = (response) => {
  if (response.done) {
    message.success('Created!');
  }
  socket.off('client:create-response', handler);
};
socket.on('client:create-response', handler);
```

**Create Item - After:**
```typescript
// ✅ Clean, simple, testable
const success = await createClient(data);
if (success) {
  message.success('Created!');
}
```

---

## Migration Checklist

### For Each Component/Hook

- [ ] **Step 1:** Import the REST hook instead of/useSocket
  ```typescript
  // OLD: import { useSocket } from '../SocketContext';
  // NEW: import { useClientsREST } from '../hooks/useClientsREST';
  ```

- [ ] **Step 2:** Replace socket.emit() calls with REST hook functions
  ```typescript
  // OLD: socket.emit('client:create', data);
  // NEW: await createClient(data);
  ```

- [ ] **Step 3:** Remove response listeners (no longer needed)
  ```typescript
  // OLD: socket.on('client:create-response', handler);
  // NEW: (delete - not needed)
  ```

- [ ] **Step 4:** Keep broadcast listeners for real-time updates
  ```typescript
  // KEEP: socket.on('client:created', handleBroadcast);
  ```

- [ ] **Step 5:** Update error handling (try/catch instead of response.done)
  ```typescript
  // OLD: if (response.done) { ... } else { message.error(response.error); }
  // NEW: try { await createClient(data); } catch (err) { message.error(err.message); }
  ```

- [ ] **Step 6:** Test manually and with automated tests
  ```bash
  npm run test
  npm run build
  ```

---

## Available REST Hooks

| Module | Hook File | Endpoints |
|--------|-----------|-----------|
| **Clients** | `useClientsREST.ts` | 11 endpoints |
| **Employees** | `useEmployeesREST.ts` | 11 endpoints |
| **Projects** | `useProjectsREST.ts` | 8 endpoints |
| **Tasks** | `useTasksREST.ts` | 9 endpoints |
| **Leads** | `useLeadsREST.ts` | 11 endpoints |
| **Pipelines** | `usePipelinesREST.ts` | 13 endpoints |
| **Activities** | `useActivitiesREST.ts` | 12 endpoints |
| **Attendance** | `useAttendanceREST.ts` | 10 endpoints |
| **Leave** | `useLeaveREST.ts` | 10 endpoints |

---

## Testing Your Migration

### Before (Socket.IO)
```typescript
// Complex test setup - requires Socket.IO server
const { io } = require('socket.io-client');
const server = require('../server');

test('creates client', (done) => {
  const socket = io('http://localhost:5000');
  socket.emit('client:create', mockData);
  socket.on('client:create-response', (response) => {
    expect(response.done).toBe(true);
    done();
  });
});
```

### After (REST)
```typescript
// Simple test - just mock axios
import { get, post } from '../services/api';
jest.mock('../services/api');

test('creates client', async () => {
  post.mockResolvedValue({ success: true, data: mockClient });
  const { createClient } = useClientsREST();
  const result = await createClient(mockData);
  expect(result).toBe(true);
  expect(post).toHaveBeenCalledWith('/clients', mockData);
});
```

---

## Common Pitfalls to Avoid

### ❌ Don't Remove Socket.IO Entirely
```typescript
// WRONG: Removing all Socket.IO code
const fetchClients = async () => {
  const response = await get('/clients');
  setClients(response.data);
  // No real-time updates! Other users' changes won't appear
};
```

### ✅ Keep Broadcast Listeners
```typescript
// RIGHT: REST for requests, Socket.IO for broadcasts
const fetchClients = async () => {
  const response = await get('/clients');
  setClients(response.data);
};

useEffect(() => {
  socket.on('client:created', (data) => {
    setClients(prev => [...prev, data]); // Real-time update!
  });
}, [socket]);
```

---

## Next Steps

1. **Migrate one module at a time** - Start with low-risk modules like Clients
2. **Test thoroughly** - Verify real-time updates still work
3. **Update documentation** - Note any module-specific patterns
4. **Remove old hooks** - Once all components are migrated, delete old Socket.IO-only hooks

---

## Support & Questions

- **REST Hooks Reference:** See `react/src/hooks/*REST.ts` files
- **API Documentation:** Visit `/api-docs` when server is running
- **Progress Tracking:** See [Phase 6 Progress Report](./20_PHASE_6_PROGRESS.md)

---

**END OF MIGRATION EXAMPLE**
