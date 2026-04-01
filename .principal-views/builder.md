# File City Builder

The builder package is the core engine that transforms repository file structures into city layout data. It handles treemap algorithms, building generation, grid management, and tour validation.

## Problem Solved

Converting a hierarchical file system into a visually meaningful city layout requires:
- Efficient space allocation for files and directories
- Consistent building sizing based on file metrics
- Grid-based layout for clean visual organization
- Tour validation for guided codebase exploration

## Core Modules

- **CodeCityBuilderWithGrid**: Main entry point that orchestrates city generation with grid-based layouts
- **GridLayoutManager**: Manages the grid system for positioning buildings and districts
- **FileTreeBuilder**: Constructs the hierarchical file tree from repository data
- **MultiVersionCityBuilder**: Handles visualization of multiple repository versions for diff views

## Tour System

The tour subsystem enables guided exploration:
- **tour/validation**: Validates tour configuration files against the city layout
- **tour/discovery**: Auto-discovers available tours in a repository

## Design Decisions

1. **Grid-based layout**: Buildings snap to a grid for cleaner visual appearance
2. **Treemap foundation**: Uses d3-hierarchy treemap for efficient space utilization
3. **Separation of concerns**: Building generation separate from layout management
4. **Validation-first tours**: Tours are validated at build time to catch errors early

## Data Flow

1. Repository abstraction provides file tree
2. FileTreeBuilder normalizes tree structure
3. CodeCityBuilderWithGrid generates layout using GridLayoutManager
4. Output is serializable city data consumed by rendering packages
