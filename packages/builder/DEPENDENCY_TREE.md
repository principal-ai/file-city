# Dependency Tree for buildMultiVersionCity

## Entry Point
`buildMultiVersionCity.ts`
- External: `@principal-ai/repository-abstraction`
- Internal: `MultiVersionCityBuilder.ts`
- Internal: `types/cityData`

## Level 1: MultiVersionCityBuilder.ts
- External: `@principal-ai/repository-abstraction`
- External: `@principal-ai/alexandria-core-library` (CodebaseView)
- Internal: `CodeCityBuilderWithGrid.ts`
- Internal: `types/cityData`

## Level 2: CodeCityBuilderWithGrid.ts
- External: `@principal-ai/repository-abstraction`
- External: `@principal-ai/alexandria-core-library` (CodebaseView)
- External: `d3-hierarchy`
- Internal: `types/buildingTypes`
- Internal: `types/cityData`
- Internal: `types/sorts`
- Internal: `types/themes` (should be removed - colors handled elsewhere)
- Internal: `types/ui-metadata`
- Internal: `GridLayoutManager`

## Level 3: GridLayoutManager.ts
- External: `@principal-ai/repository-abstraction`
- External: `@principal-ai/alexandria-core-library` (CodebaseView)
- Internal: `types/cityData`
- Internal: `GridLayoutConfigValidator`

## Files Copied
1. ✅ buildMultiVersionCity.ts
2. ✅ MultiVersionCityBuilder.ts
3. ✅ CodeCityBuilderWithGrid.ts
4. ✅ GridLayoutManager.ts
5. ✅ GridLayoutConfigValidator.ts
6. ✅ types/cityData.ts
7. ✅ types/buildingTypes.ts
8. ✅ types/sorts.ts
9. ✅ types/ui-metadata.ts
10. ✅ types/themes.ts (needs to be removed - colors should be handled in React layer)

## External Dependencies Needed
- @principal-ai/repository-abstraction
- @principal-ai/alexandria-core-library
- d3-hierarchy