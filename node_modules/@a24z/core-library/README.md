# @a24z/core-library

Core library for the a24z ecosystem, providing essential functionality for managing notes, views, and configurations.

## Installation

```bash
npm install @a24z/core-library
# or
yarn add @a24z/core-library
# or
pnpm add @a24z/core-library
# or
bun add @a24z/core-library
```

## Features

- **MemoryPalace**: Primary API for managing anchored notes and codebase views
- **Project Management**: Tools for managing Alexandria repositories and projects
- **Validation Rules**: Extensible rules engine for codebase validation
- **FileSystem Abstraction**: Dependency injection for filesystem operations
- **In-Memory Testing**: Built-in InMemoryFileSystemAdapter for testing

## Basic Usage

### Using MemoryPalace

```typescript
import { MemoryPalace, NodeFileSystemAdapter } from '@a24z/core-library';

// Initialize with filesystem adapter
const fsAdapter = new NodeFileSystemAdapter();
const memory = new MemoryPalace('/path/to/repo', fsAdapter);

// Save a note
const noteId = await memory.saveNote({
  note: 'This function handles user authentication',
  anchors: ['src/auth.ts', 'src/middleware/auth.ts'],
  tags: ['authentication', 'security'],
  metadata: {
    author: 'john.doe',
    jiraTicket: 'AUTH-123',
  },
});

// Retrieve notes for a path
const notes = memory.getNotesForPath('src/auth.ts');

// List all views
const views = memory.listViews();

// Get repository guidance
const guidance = memory.getGuidance();
```

### Project Management

```typescript
import { ProjectRegistryStore, AlexandriaOutpostManager, NodeFileSystemAdapter } from '@a24z/core-library';

const fsAdapter = new NodeFileSystemAdapter();

// Manage projects
const registry = new ProjectRegistryStore(fsAdapter, '/home/user');
registry.registerProject('my-project', '/path/to/project');
const projects = registry.listProjects();

// Manage Alexandria repositories
const outpost = new AlexandriaOutpostManager(fsAdapter);
const repos = await outpost.getAllRepositories();
```

### Testing with InMemoryFileSystemAdapter

```typescript
import { MemoryPalace, InMemoryFileSystemAdapter } from '@a24z/core-library';

// Use in-memory adapter for testing
const fsAdapter = new InMemoryFileSystemAdapter();
fsAdapter.setupTestRepo('/test-repo');

const memory = new MemoryPalace('/test-repo', fsAdapter);
// ... run tests without touching real filesystem
```

## Core Exports

### Primary APIs
- `MemoryPalace` - Main API for note and view management
- `ProjectRegistryStore` - Project registry management
- `AlexandriaOutpostManager` - Alexandria repository management

### FileSystem Adapters
- `NodeFileSystemAdapter` - Node.js filesystem implementation
- `InMemoryFileSystemAdapter` - In-memory implementation for testing

### Stores
- `CodebaseViewsStore` - Manage codebase views
- `generateViewIdFromName` - Utility for view ID generation

### Utilities
- `LibraryRulesEngine` - Validation rules engine
- `ConfigValidator` - Configuration validation
- `OverviewPathAutoFix` - Auto-fix for overview paths

### Types
See the TypeScript definitions for comprehensive type exports including:
- Note types (`StoredAnchoredNote`, `AnchoredNoteWithPath`)
- View types (`CodebaseView`, `CodebaseViewSummary`)
- Repository types (`AlexandriaRepository`, `AlexandriaEntry`)
- Validation types (`ValidationResult`, `ValidationIssue`)

## License

MIT

## Contributing

This is a core library for the a24z ecosystem. For issues and contributions, please visit the main repository.