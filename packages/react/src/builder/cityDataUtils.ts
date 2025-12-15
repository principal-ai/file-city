import {
  CityBuilding,
  CityData,
  CityDistrict,
  SelectiveRenderOptions,
} from '@principal-ai/file-city-builder';

// Utility functions for selective rendering
export const filterCityDataForSelectiveRender = (
  cityData: CityData,
  selectiveRender?: SelectiveRenderOptions,
): CityData => {
  if (!selectiveRender || selectiveRender.mode === 'all') {
    return cityData;
  }

  const { mode, directories, rootDirectory, showParentContext } = selectiveRender;

  switch (mode) {
    case 'filter':
      return filterCityData(cityData, directories || new Set());

    case 'focus':
      // Focus mode doesn't filter data, just affects rendering
      return cityData;

    case 'drilldown':
      return drilldownCityData(cityData, rootDirectory || '', showParentContext || false);

    default:
      return cityData;
  }
};

const filterCityData = (cityData: CityData, visibleDirectories: Set<string>): CityData => {
  const filteredBuildings = cityData.buildings.filter(building => {
    // Check if building is in any of the visible directories
    return Array.from(visibleDirectories).some(
      dir => building.path.startsWith(dir + '/') || building.path === dir,
    );
  });

  const filteredDistricts = cityData.districts.filter(district => {
    // Include district if it's in the visible set or is a parent of a visible directory
    return Array.from(visibleDirectories).some(
      dir =>
        district.path === dir ||
        dir.startsWith(district.path + '/') ||
        district.path.startsWith(dir + '/'),
    );
  });

  return {
    ...cityData,
    buildings: filteredBuildings,
    districts: filteredDistricts,
    bounds: recalculateBounds(filteredBuildings, filteredDistricts),
  };
};

const drilldownCityData = (
  cityData: CityData,
  rootDirectory: string,
  showParentContext: boolean,
): CityData => {
  if (!rootDirectory) return cityData;

  // Filter buildings to only those within the root directory
  const filteredBuildings = cityData.buildings
    .filter(
      building => building.path.startsWith(rootDirectory + '/') || building.path === rootDirectory,
    )
    .map(building => ({
      ...building,
      // Adjust path to be relative to the new root
      path: building.path.startsWith(rootDirectory + '/')
        ? building.path.substring(rootDirectory.length + 1)
        : building.path,
    }));

  // Filter districts to only those within the root directory
  const filteredDistricts = cityData.districts
    .filter(
      district => district.path.startsWith(rootDirectory + '/') || district.path === rootDirectory,
    )
    .map(district => ({
      ...district,
      // Adjust path to be relative to the new root
      path: district.path.startsWith(rootDirectory + '/')
        ? district.path.substring(rootDirectory.length + 1)
        : district.path === rootDirectory
        ? ''
        : district.path,
    }));

  // If showing parent context, add immediate parent district
  if (showParentContext && rootDirectory) {
    const parentPath = rootDirectory.split('/').slice(0, -1).join('/');
    const parentDistrict = cityData.districts.find(d => d.path === parentPath);
    if (parentDistrict) {
      filteredDistricts.unshift({
        ...parentDistrict,
        path: '../' + parentDistrict.path.split('/').pop(),
      });
    }
  }

  return {
    ...cityData,
    buildings: filteredBuildings,
    districts: filteredDistricts,
    bounds: recalculateBounds(filteredBuildings, filteredDistricts),
    metadata: {
      ...cityData.metadata,
      rootPath: rootDirectory,
    },
  };
};

const recalculateBounds = (buildings: CityBuilding[], districts: CityDistrict[]) => {
  if (buildings.length === 0 && districts.length === 0) {
    return { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
  }

  const allX = [
    ...buildings.map(b => b.position.x),
    ...districts.flatMap(d => [d.worldBounds.minX, d.worldBounds.maxX]),
  ];
  const allZ = [
    ...buildings.map(b => b.position.z),
    ...districts.flatMap(d => [d.worldBounds.minZ, d.worldBounds.maxZ]),
  ];

  return {
    minX: Math.min(...allX),
    maxX: Math.max(...allX),
    minZ: Math.min(...allZ),
    maxZ: Math.max(...allZ),
  };
};

/**
 * Filter city data to only include a subdirectory and optionally remap coordinates
 * to make the subdirectory the new origin (0,0)
 */
export const filterCityDataForSubdirectory = (
  cityData: CityData,
  subdirectoryPath: string,
  autoCenter: boolean = true,
): CityData => {
  if (!subdirectoryPath) return cityData;

  // Normalize path - remove leading/trailing slashes
  const normalizedPath = subdirectoryPath.replace(/^\/+|\/+$/g, '');

  // Filter buildings to only those within the subdirectory
  const filteredBuildings = cityData.buildings.filter(
    building =>
      building.path === normalizedPath ||
      building.path.startsWith(normalizedPath + '/') ||
      building.path.startsWith(`/${normalizedPath}`),
  );

  // Filter districts to only those within the subdirectory
  const filteredDistricts = cityData.districts.filter(
    district =>
      district.path === normalizedPath ||
      district.path.startsWith(normalizedPath + '/') ||
      district.path.startsWith(`/${normalizedPath}`),
  );

  // Find the subdirectory district to get its bounds
  const subdirectoryDistrict = cityData.districts.find(d => d.path === normalizedPath);

  if (!subdirectoryDistrict && filteredBuildings.length === 0) {
    // Subdirectory not found or empty
    return {
      ...cityData,
      buildings: [],
      districts: [],
      bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 },
      metadata: {
        ...cityData.metadata,
        rootPath: normalizedPath,
      },
    };
  }

  // Calculate the bounds of the subdirectory content
  const contentBounds = recalculateBounds(filteredBuildings, filteredDistricts);

  let remappedBuildings: CityBuilding[];
  let remappedDistricts: CityDistrict[];
  let newBounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  if (autoCenter) {
    // Calculate offset to make subdirectory origin (0,0)
    const offsetX = -contentBounds.minX;
    const offsetZ = -contentBounds.minZ;

    // Remap building coordinates relative to subdirectory origin
    remappedBuildings = filteredBuildings.map(building => ({
      ...building,
      position: {
        ...building.position,
        x: building.position.x + offsetX,
        z: building.position.z + offsetZ,
      },
      // Make path relative to subdirectory
      path:
        building.path === normalizedPath
          ? building.path.split('/').pop() || building.path
          : building.path.substring(normalizedPath.length + 1),
    }));

    // Remap district coordinates relative to subdirectory origin
    remappedDistricts = filteredDistricts.map(district => ({
      ...district,
      worldBounds: {
        minX: district.worldBounds.minX + offsetX,
        maxX: district.worldBounds.maxX + offsetX,
        minZ: district.worldBounds.minZ + offsetZ,
        maxZ: district.worldBounds.maxZ + offsetZ,
      },
      // Make path relative to subdirectory
      path:
        district.path === normalizedPath
          ? '' // The subdirectory itself becomes the root
          : district.path.substring(normalizedPath.length + 1),
    }));

    // New bounds with origin at (0,0)
    newBounds = {
      minX: 0,
      maxX: contentBounds.maxX - contentBounds.minX,
      minZ: 0,
      maxZ: contentBounds.maxZ - contentBounds.minZ,
    };
  } else {
    // Preserve original coordinates when autoCenter is disabled
    remappedBuildings = filteredBuildings.map(building => ({
      ...building,
      // Make path relative to subdirectory
      path:
        building.path === normalizedPath
          ? building.path.split('/').pop() || building.path
          : building.path.substring(normalizedPath.length + 1),
    }));

    remappedDistricts = filteredDistricts.map(district => ({
      ...district,
      // Make path relative to subdirectory
      path:
        district.path === normalizedPath
          ? '' // The subdirectory itself becomes the root
          : district.path.substring(normalizedPath.length + 1),
    }));

    // Preserve original full city bounds to maintain spatial context
    newBounds = cityData.bounds;
  }

  return {
    ...cityData,
    buildings: remappedBuildings,
    districts: remappedDistricts,
    bounds: newBounds,
    metadata: {
      ...cityData.metadata,
      rootPath: normalizedPath,
      totalFiles: filteredBuildings.length,
      totalDirectories: filteredDistricts.length,
    },
  };
};

/**
 * Filter city data based on multiple directory filters with include/exclude modes
 */
export const filterCityDataForMultipleDirectories = (
  cityData: CityData,
  filters: Array<{ path: string; mode: 'include' | 'exclude' }>,
  autoCenter: boolean = true,
  combineMode: 'union' | 'intersection' = 'union',
): CityData => {
  if (!filters || filters.length === 0) return cityData;

  // Normalize all filter paths
  const normalizedFilters = filters.map(filter => ({
    ...filter,
    path: filter.path.replace(/^\/+|\/+$/g, ''),
  }));

  const includeFilters = normalizedFilters.filter(f => f.mode === 'include');
  const excludeFilters = normalizedFilters.filter(f => f.mode === 'exclude');

  // Helper function to check if a path matches a filter
  const matchesFilter = (itemPath: string, filterPath: string): boolean => {
    const normalizedItemPath = itemPath.replace(/^\/+/, '');
    return normalizedItemPath === filterPath || normalizedItemPath.startsWith(filterPath + '/');
  };

  // Filter buildings based on include/exclude rules
  const filteredBuildings = cityData.buildings.filter(building => {
    // Check excludes first (they take precedence)
    for (const filter of excludeFilters) {
      if (matchesFilter(building.path, filter.path)) {
        return false;
      }
    }

    // If we have includes, must match based on combine mode
    if (includeFilters.length > 0) {
      if (combineMode === 'union') {
        // Union: match any include filter
        return includeFilters.some(filter => matchesFilter(building.path, filter.path));
      } else {
        // Intersection: must match all include filters (rare use case)
        return includeFilters.every(filter => matchesFilter(building.path, filter.path));
      }
    }

    // No includes means include everything (except excludes)
    return true;
  });

  // Filter districts with the same logic
  const filteredDistricts = cityData.districts.filter(district => {
    // Check excludes first
    for (const filter of excludeFilters) {
      if (matchesFilter(district.path, filter.path)) {
        return false;
      }
    }

    // Check if district contains any included content
    if (includeFilters.length > 0) {
      if (combineMode === 'union') {
        // Include district if it matches any filter or contains matching content
        return includeFilters.some(
          filter =>
            matchesFilter(district.path, filter.path) || matchesFilter(filter.path, district.path), // District is parent of filter
        );
      } else {
        // Intersection mode for districts is complex - simplify to union behavior
        return includeFilters.some(
          filter =>
            matchesFilter(district.path, filter.path) || matchesFilter(filter.path, district.path),
        );
      }
    }

    return true;
  });

  // If nothing matches, return empty city
  if (filteredBuildings.length === 0 && filteredDistricts.length === 0) {
    return {
      ...cityData,
      buildings: [],
      districts: [],
      bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 },
      metadata: {
        ...cityData.metadata,
        rootPath: filters.map(f => `${f.mode}:${f.path}`).join(', '),
      },
    };
  }

  // Calculate bounds and optionally recenter
  const contentBounds = recalculateBounds(filteredBuildings, filteredDistricts);

  if (autoCenter) {
    // Calculate offset to center the content
    const offsetX = -contentBounds.minX;
    const offsetZ = -contentBounds.minZ;

    // Remap coordinates
    const remappedBuildings = filteredBuildings.map(building => ({
      ...building,
      position: {
        ...building.position,
        x: building.position.x + offsetX,
        z: building.position.z + offsetZ,
      },
    }));

    const remappedDistricts = filteredDistricts.map(district => ({
      ...district,
      worldBounds: {
        minX: district.worldBounds.minX + offsetX,
        maxX: district.worldBounds.maxX + offsetX,
        minZ: district.worldBounds.minZ + offsetZ,
        maxZ: district.worldBounds.maxZ + offsetZ,
      },
    }));

    return {
      ...cityData,
      buildings: remappedBuildings,
      districts: remappedDistricts,
      bounds: {
        minX: 0,
        maxX: contentBounds.maxX - contentBounds.minX,
        minZ: 0,
        maxZ: contentBounds.maxZ - contentBounds.minZ,
      },
      metadata: {
        ...cityData.metadata,
        rootPath: filters.map(f => `${f.mode}:${f.path}`).join(', '),
        totalFiles: remappedBuildings.length,
        totalDirectories: remappedDistricts.length,
      },
    };
  } else {
    // Return filtered data with original coordinates and bounds
    return {
      ...cityData,
      buildings: filteredBuildings,
      districts: filteredDistricts,
      bounds: cityData.bounds, // Preserve original bounds when autoCenter is false
      metadata: {
        ...cityData.metadata,
        rootPath: filters.map(f => `${f.mode}:${f.path}`).join(', '),
        totalFiles: filteredBuildings.length,
        totalDirectories: filteredDistricts.length,
      },
    };
  }
};
