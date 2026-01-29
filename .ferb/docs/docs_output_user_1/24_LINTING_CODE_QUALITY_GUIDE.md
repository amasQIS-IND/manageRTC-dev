# Linting & Code Quality Guide
## manageRTC - ESLint & Prettier Configuration

**Document Version:** 1.0
**Date:** January 28, 2026
**Status:** Phase 6 - Production Readiness

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration Files](#configuration-files)
3. [Available Scripts](#available-scripts)
4. [Rules & Standards](#rules--standards)
5. [VSCode Integration](#vscode-integration)
6. [Pre-commit Hooks](#pre-commit-hooks)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This project uses **ESLint** for linting and **Prettier** for code formatting to maintain consistent code quality across the codebase.

### Tools Used

| Tool | Purpose | Version |
|------|---------|---------|
| **ESLint** | Linting JavaScript/TypeScript code | ^8.57.0 |
| **Prettier** | Code formatting | ^3.3.3 |
| **TypeScript ESLint** | TypeScript linting support | ^7.18.0 |
| **React ESLint** | React-specific linting rules | ^7.37.2 |
| **React Hooks ESLint** | Hooks rules enforcement | ^5.0.0 |

### Why Linting Matters

- **Consistency**: Uniform code style across the team
- **Bug Prevention**: Catch common errors before runtime
- **Best Practices**: Enforce industry standards
- **Readability**: Clean, formatted code is easier to understand
- **Maintainability**: Easier to onboard new developers

---

## Configuration Files

### Project Structure

```
hrms-tool-amasqis/
├── .prettierrc.json           # Root Prettier config
├── .prettierignore            # Files to ignore
├── .eslintignore              # Files to ignore
├── backend/
│   ├── .eslintrc.json        # Backend ESLint config
│   └── package.json          # Backend linting scripts
└── react/
    ├── .eslintrc.json        # Frontend ESLint config
    └── package.json          # Frontend linting scripts
```

### Backend ESLint Configuration

**File:** [backend/.eslintrc.json](backend/.eslintrc.json)

**Key Features:**
- Node.js ES modules support
- Prettier integration
- Console.log warnings (allow warn/error/info)
- Import/export validation
- Jest test file support

**Rules:**
```json
{
  "prettier/prettier": "warn",
  "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
  "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
  "node/no-unsupported-features/es-syntax": ["error", { "version": ">=18.0.0" }]
}
```

### Frontend ESLint Configuration

**File:** [react/.eslintrc.json](react/.eslintrc.json)

**Key Features:**
- React and React Hooks rules
- TypeScript support
- JSX accessibility checks
- Import organization
- Prettier integration

**Rules:**
```json
{
  "prettier/prettier": "warn",
  "react/react-in-jsx-scope": "off",
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",
  "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
  "import/order": ["error", { "groups": ["builtin", "external", "internal"] }]
}
```

### Prettier Configuration

**File:** [.prettierrc.json](.prettierrc.json)

**Settings:**
```json
{
  "semi": true,                    // Use semicolons
  "trailingComma": "es5",          // Trailing commas where valid
  "singleQuote": true,             // Use single quotes
  "printWidth": 100,               // Line width limit
  "tabWidth": 2,                   // Spaces per indentation level
  "useTabs": false,                // Use spaces instead of tabs
  "arrowParens": "always",         // Parentheses around arrow function params
  "endOfLine": "lf"                // Line feed only (Unix style)
}
```

---

## Available Scripts

### Backend Scripts

Run from the `backend/` directory:

```bash
# Lint all JavaScript files
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Format all files with Prettier
npm format

# Check if files are formatted (CI/CD)
npm run format:check
```

### Frontend Scripts

Run from the `react/` directory:

```bash
# Lint all TypeScript/JavaScript files
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Format all files with Prettier
npm format

# Check if files are formatted (CI/CD)
npm run format:check
```

### Project-Wide Scripts

Run from the project root:

```bash
# Lint both backend and frontend
npm run lint --workspaces --if-present

# Format both backend and frontend
npm run format --workspaces --if-present
```

---

## Rules & Standards

### JavaScript/TypeScript Standards

#### 1. Variable Naming

```javascript
// ✅ Good - camelCase for variables and functions
const userFirstName = 'John';
function getUserData() { }

// ✅ Good - PascalCase for classes/components
class UserService { }
const UserProfile = () => { };

// ✅ Good - UPPER_CASE for constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// ❌ Bad - Inconsistent naming
const User_First_Name = 'John';
function get_user_data() { }
```

#### 2. Import Organization

```typescript
// ✅ Good - Organized by groups
// 1. Node.js built-ins
import path from 'path';

// 2. External packages
import express from 'express';
import axios from 'axios';

// 3. Internal modules
import { User } from './models/user.model.js';
import { authMiddleware } from './middleware/auth.js';

// 4. Related imports
import { logger } from './utils/logger.js';

// ❌ Bad - Unorganized imports
import { User } from './models/user.model.js';
import express from 'express';
import path from 'path';
```

#### 3. Function Declaration

```javascript
// ✅ Good - Async/await for readability
async function fetchUserData(userId) {
  try {
    const response = await axios.get(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch user:', error);
    throw error;
  }
}

// ✅ Good - Arrow functions for callbacks
const processedUsers = users.map(user => ({
  id: user._id,
  name: user.fullName
}));

// ❌ Bad - Nested callbacks
function fetchUserData(userId, callback) {
  axios.get(`/api/users/${userId}`, (response) => {
    const data = response.data;
    callback(data);
  });
}
```

#### 4. Error Handling

```javascript
// ✅ Good - Try-catch with error logging
async function createUser(userData) {
  try {
    const user = await User.create(userData);
    return user;
  } catch (error) {
    logger.error('Failed to create user:', error);
    throw new Error('User creation failed');
  }
}

// ✅ Good - Specific error messages
if (!userData.email) {
  throw new Error('Email is required');
}

// ❌ Bad - Silent errors
async function createUser(userData) {
  const user = await User.create(userData);
  return user; // No error handling
}
```

#### 5. TypeScript Typing

```typescript
// ✅ Good - Explicit types
interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: Date;
}

async function getUserById(id: string): Promise<User | null> {
  const user = await User.findById(id);
  return user;
}

// ✅ Good - Generic types with constraints
async function fetchAll<T extends { _id: string }>(
  model: Model<T>
): Promise<T[]> {
  return await model.find();
}

// ❌ Bad - Any types
async function getUserById(id: any): Promise<any> {
  return await User.findById(id);
}
```

### React Standards

#### 1. Component Structure

```tsx
// ✅ Good - Organized component structure
import { useState, useEffect } from 'react';
import { Button } from 'antd';
import { useUsersREST } from '../hooks/useUsersREST';

interface UserListProps {
  companyId: string;
}

export const UserList: React.FC<UserListProps> = ({ companyId }) => {
  // 1. Hooks
  const { users, loading, error, fetchUsers } = useUsersREST();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // 2. Effects
  useEffect(() => {
    fetchUsers({ companyId });
  }, [companyId]);

  // 3. Handlers
  const handleUserClick = (userId: string) => {
    setSelectedUser(userId);
  };

  // 4. Conditional renders
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // 5. Render
  return (
    <div>
      {users.map(user => (
        <Button key={user._id} onClick={() => handleUserClick(user._id)}>
          {user.name}
        </Button>
      ))}
    </div>
  );
};
```

#### 2. Hooks Usage

```tsx
// ✅ Good - Following Rules of Hooks
export const UserProfile: React.FC = () => {
  // Hooks at the top level
  const [user, setUser] = useState<User | null>(null);
  const { data, loading } = useUsersREST();

  // Early returns
  if (loading) return <div>Loading...</div>;

  // Render
  return <div>{user?.name}</div>;
};

// ❌ Bad - Hook inside condition
export const UserProfile: React.FC = () => {
  if (someCondition) {
    const [user, setUser] = useState<User | null>(null); // WRONG!
  }
  return <div>User</div>;
};
```

#### 3. Props Destructuring

```tsx
// ✅ Good - Destructured props with types
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const CustomButton: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false
}) => {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
};

// ❌ Bad - Props object
export const CustomButton: React.FC<{ props: ButtonProps }> = ({ props }) => {
  return <button onClick={props.onClick} disabled={props.disabled}>
    {props.label}
  </button>;
};
```

### Backend Standards

#### 1. Route Handler Structure

```javascript
// ✅ Good - Consistent route handler
export const createClient = async (req, res) => {
  try {
    // 1. Validate input
    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message }
      });
    }

    // 2. Check for duplicates
    const existing = await Client.findOne({ email: value.email });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email already exists' }
      });
    }

    // 3. Create document
    const client = await Client.create(value);

    // 4. Emit socket event
    req.socket.emit('client:created', client);

    // 5. Send response
    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully'
    });
  } catch (error) {
    logger.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};
```

#### 2. Async/Await Error Handling

```javascript
// ✅ Good - Proper error handling
async function getAllClients(filters = {}) {
  try {
    const clients = await Client.find(filters)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      data: clients,
      count: clients.length
    };
  } catch (error) {
    logger.error('Error fetching clients:', error);
    return {
      success: false,
      error: { message: 'Failed to fetch clients' }
    };
  }
}

// ❌ Bad - No error handling
async function getAllClients(filters = {}) {
  const clients = await Client.find(filters);
  return { success: true, data: clients };
}
```

---

## VSCode Integration

### Recommended Extensions

Install these VSCode extensions for the best development experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",           // ESLint
    "esbenp.prettier-vscode",            // Prettier
    "bradlc.vscode-tailwindcss",         // Tailwind CSS IntelliSense
    "ms-vscode.vscode-typescript-next",  // TypeScript
    "formulahendry.auto-rename-tag",     // Auto rename tag
    "christian-kohler.path-intellisense" // Path intellisense
  ]
}
```

### VSCode Settings

Create or update `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "react/node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Pre-commit Hooks

### Setup with Husky

```bash
# Install Husky
npm install -g husky

# Initialize Git hooks
husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint:fix && npm run format:check"
```

### Pre-commit Hook Script

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running linters..."

# Backend linting
cd backend
npm run lint:fix
if [ $? -ne 0 ]; then
  echo "❌ Backend linting failed. Fix errors before committing."
  exit 1
fi

# Frontend linting
cd ../react
npm run lint:fix
if [ $? -ne 0 ]; then
  echo "❌ Frontend linting failed. Fix errors before committing."
  exit 1
fi

# Format check
cd ..
npm run format:check
if [ $? -ne 0 ]; then
  echo "❌ Code formatting check failed. Run 'npm run format' to fix."
  exit 1
fi

echo "✅ All checks passed!"
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/lint.yml`

```yaml
name: Lint & Format

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: ./backend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  lint-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./react
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: ./react/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
```

---

## Troubleshooting

### Common Issues

#### Issue 1: ESLint not working in VSCode

**Symptoms:**
- No red squiggly lines
- Format on save not working

**Solutions:**
```bash
# Restart ESLint server
# Press: Ctrl+Shift+P -> "ESLint: Restart ESLint Server"

# Reinstall ESLint
npm uninstall eslint
npm install eslint --save-dev

# Check VSCode output logs
# View -> Output -> ESLint
```

#### Issue 2: Prettier conflicts with ESLint

**Symptoms:**
- Format on save causes ESLint errors
- Inconsistent formatting

**Solutions:**
```bash
# Ensure eslint-config-prettier is last in extends array
# .eslintrc.json should have:
{
  "extends": [
    "...other configs...",
    "plugin:prettier/recommended"  // MUST BE LAST
  ]
}

# Disable specific Prettier rules in ESLint
{
  "rules": {
    "prettier/prettier": ["warn", { "endOfLine": "auto" }]
  }
}
```

#### Issue 3: TypeScript errors not showing

**Symptoms:**
- TS errors not flagged
- Type checking not working

**Solutions:**
```bash
# Restart TypeScript server
# Press: Ctrl+Shift+P -> "TypeScript: Restart TS Server"

# Verify tsconfig.json
# Ensure "compilerOptions.strict": true

# Update TypeScript
npm install -g typescript
npm install typescript --save-dev
```

#### Issue 4: Import errors after refactoring

**Symptoms:**
- "Module not found" errors
- Import path issues

**Solutions:**
```bash
# Check tsconfig.json paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@services/*": ["src/services/*"]
    }
  }
}

# Update ESLint resolver
# .eslintrc.json should have:
{
  "settings": {
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  }
}
```

---

## Quick Reference

### Useful Commands

```bash
# Backend
cd backend && npm run lint:fix
cd backend && npm run format

# Frontend
cd react && npm run lint:fix
cd react && npm run format

# Both (from root)
npm run lint --workspaces --if-present
npm run format --workspaces --if-present
```

### File Locations

| Config File | Location |
|-------------|----------|
| Prettier config | `.prettierrc.json` |
| Prettier ignore | `.prettierignore` |
| ESLint ignore | `.eslintignore` |
| Backend ESLint | `backend/.eslintrc.json` |
| Frontend ESLint | `react/.eslintrc.json` |
| VSCode settings | `.vscode/settings.json` |

---

**END OF LINTING & CODE QUALITY GUIDE**
