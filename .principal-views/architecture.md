# File City Architecture

File City is a monorepo visualization tool that transforms repository file structures into isometric city landscapes. The visualization metaphor represents files as buildings, directories as city blocks, and metrics as building characteristics.

## Problem Solved

Navigating large codebases is challenging. File City provides an intuitive spatial representation that helps developers:
- Understand repository structure at a glance
- Identify code hotspots and areas of complexity
- Create guided tours for onboarding
- Visualize architectural patterns

## Package Structure

The monorepo contains four packages with clear responsibilities:

- **builder**: Core algorithms for treemap layout, building generation, and data transformation
- **react**: React components for interactive visualization using Three.js and React Flow
- **server**: Server-side rendering using node-canvas for static image generation
- **cli**: Command-line tool for tour validation and linting

## Design Decisions

1. **Builder as foundation**: All visualization packages depend on builder, ensuring consistent data structures and algorithms
2. **Separate rendering targets**: React for interactive web, server for static images
3. **Treemap-based layout**: Uses d3-hierarchy for space-efficient file arrangement
4. **Isometric projection**: Buildings rendered in isometric view for depth perception without perspective distortion

## Workflows

1. **Interactive visualization**: Load repository data → builder generates layout → react renders 3D scene
2. **Static image generation**: Load repository data → builder generates layout → server renders to canvas → export PNG
3. **Tour creation**: Define tour stops → cli validates → react renders with tour navigation
