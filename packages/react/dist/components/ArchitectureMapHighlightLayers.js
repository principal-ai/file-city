"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectureMapHighlightLayers = ArchitectureMapHighlightLayers;
const react_1 = __importStar(require("react"));
const cityDataUtils_1 = require("../builder/cityDataUtils");
const drawLayeredBuildings_1 = require("../render/client/drawLayeredBuildings");
const DEFAULT_DISPLAY_OPTIONS = {
    showGrid: false,
    showConnections: true,
    maxConnections: 20,
    gridSize: 50,
    padding: 20,
};
// Spatial Grid for fast hit testing (copied from original for now)
class SpatialGrid {
    constructor(bounds, cellSize = 100) {
        this.grid = new Map();
        this.bounds = bounds;
        this.cellSize = cellSize;
    }
    getCellKey(x, z) {
        const cellX = Math.floor((x - this.bounds.minX) / this.cellSize);
        const cellZ = Math.floor((z - this.bounds.minZ) / this.cellSize);
        return `${cellX},${cellZ}`;
    }
    getCellsForBounds(minX, maxX, minZ, maxZ) {
        const cells = [];
        const startCellX = Math.floor((minX - this.bounds.minX) / this.cellSize);
        const endCellX = Math.floor((maxX - this.bounds.minX) / this.cellSize);
        const startCellZ = Math.floor((minZ - this.bounds.minZ) / this.cellSize);
        const endCellZ = Math.floor((maxZ - this.bounds.minZ) / this.cellSize);
        for (let x = startCellX; x <= endCellX; x++) {
            for (let z = startCellZ; z <= endCellZ; z++) {
                cells.push(`${x},${z}`);
            }
        }
        return cells;
    }
    addBuilding(building) {
        const size = Math.max(building.dimensions[0], building.dimensions[2]);
        const halfSize = size / 2;
        const minX = building.position.x - halfSize;
        const maxX = building.position.x + halfSize;
        const minZ = building.position.z - halfSize;
        const maxZ = building.position.z + halfSize;
        const cells = this.getCellsForBounds(minX, maxX, minZ, maxZ);
        cells.forEach(cellKey => {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            this.grid.get(cellKey).push(building);
        });
    }
    addDistrict(district) {
        const cells = this.getCellsForBounds(district.worldBounds.minX, district.worldBounds.maxX, district.worldBounds.minZ, district.worldBounds.maxZ);
        cells.forEach(cellKey => {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            this.grid.get(cellKey).push(district);
        });
    }
    query(x, z, radius = 10) {
        const cells = this.getCellsForBounds(x - radius, x + radius, z - radius, z + radius);
        const results = [];
        const seen = new Set();
        cells.forEach(cellKey => {
            const items = this.grid.get(cellKey);
            if (items) {
                items.forEach(item => {
                    const key = 'dimensions' in item ? `b_${item.path}` : `d_${item.path}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        results.push(item);
                    }
                });
            }
        });
        return results;
    }
    clear() {
        this.grid.clear();
    }
}
function ArchitectureMapHighlightLayers({ cityData, highlightLayers = [], onLayerToggle, focusDirectory = null, rootDirectoryName, onDirectorySelect, onFileClick, fullSize = false, showGrid = false, showFileNames = false, className = '', selectiveRender, canvasBackgroundColor = '#0f1419', hoverBorderColor = '#ffffff', disableOpacityDimming = true, defaultDirectoryColor = '#111827', defaultBuildingColor = '#36454F', subdirectoryMode, showLayerControls = false, showFileTypeIcons = true, showLegend = false, showDirectoryLabels = true, transform = { rotation: 0 }, // Default to no rotation
onHover, buildingBorderRadius = 0, districtBorderRadius = 0, }) {
    const canvasRef = (0, react_1.useRef)(null);
    const containerRef = (0, react_1.useRef)(null);
    const [interactionState, setInteractionState] = (0, react_1.useState)({
        hoveredDistrict: null,
        hoveredBuilding: null,
        mousePos: { x: 0, y: 0 },
    });
    const [zoomState, setZoomState] = (0, react_1.useState)({
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        lastMousePos: { x: 0, y: 0 },
        hasMouseMoved: false,
    });
    const [hitTestCache, setHitTestCache] = (0, react_1.useState)(null);
    const calculateCanvasResolution = (fileCount, _cityBounds) => {
        const minSize = 400;
        const scaleFactor = Math.sqrt(fileCount / 5);
        const resolution = Math.max(minSize, minSize + scaleFactor * 300);
        return { width: resolution, height: resolution };
    };
    const [canvasSize, setCanvasSize] = (0, react_1.useState)(() => calculateCanvasResolution(cityData?.buildings?.length || 10, cityData?.bounds));
    const [displayOptions] = (0, react_1.useState)({
        ...DEFAULT_DISPLAY_OPTIONS,
        showGrid,
    });
    const filteredCityData = (0, react_1.useMemo)(() => {
        if (!cityData)
            return undefined;
        let processedData = cityData;
        if (subdirectoryMode?.enabled) {
            const autoCenter = subdirectoryMode.autoCenter === true;
            // Use new multi-filter function if filters are provided
            if (subdirectoryMode.filters && subdirectoryMode.filters.length > 0) {
                processedData = (0, cityDataUtils_1.filterCityDataForMultipleDirectories)(cityData, subdirectoryMode.filters, autoCenter, subdirectoryMode.combineMode || 'union');
            }
            else if (subdirectoryMode.rootPath) {
                // Fallback to single path for backward compatibility
                processedData = (0, cityDataUtils_1.filterCityDataForSubdirectory)(cityData, subdirectoryMode.rootPath, autoCenter);
            }
        }
        return (0, cityDataUtils_1.filterCityDataForSelectiveRender)(processedData, selectiveRender);
    }, [cityData, selectiveRender, subdirectoryMode]);
    const canvasSizingData = (0, react_1.useMemo)(() => {
        if (subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && cityData) {
            return cityData;
        }
        return filteredCityData;
    }, [subdirectoryMode?.enabled, subdirectoryMode?.autoCenter, cityData, filteredCityData]);
    // Build hit test cache with spatial indexing
    const buildHitTestCache = (0, react_1.useCallback)((cityData, scale, offsetX, offsetZ, zoomState, abstractedPaths) => {
        const spatialGrid = new SpatialGrid(cityData.bounds);
        // Only add visible buildings to spatial grid
        cityData.buildings.forEach(building => {
            // Check if this building is inside any abstracted directory
            let currentPath = building.path;
            let isAbstracted = false;
            while (currentPath.includes('/')) {
                currentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
                if (abstractedPaths.has(currentPath)) {
                    isAbstracted = true;
                    break;
                }
            }
            if (!isAbstracted) {
                spatialGrid.addBuilding(building);
            }
        });
        // Add districts to spatial grid
        cityData.districts.forEach(district => {
            if (!district.path) {
                spatialGrid.addDistrict(district); // Keep root
                return;
            }
            // For hit testing, we need to include abstracted districts too
            // because they have visual covers that users can click on.
            // Only skip children of abstracted directories.
            let isChildOfAbstracted = false;
            for (const abstractedPath of abstractedPaths) {
                if (abstractedPath && district.path.startsWith(abstractedPath + '/')) {
                    isChildOfAbstracted = true;
                    break;
                }
            }
            if (!isChildOfAbstracted) {
                spatialGrid.addDistrict(district);
            }
        });
        return {
            spatialGrid,
            transformParams: {
                scale,
                offsetX,
                offsetZ,
                zoomScale: zoomState.scale,
                zoomOffsetX: zoomState.offsetX,
                zoomOffsetY: zoomState.offsetY,
            },
            abstractedPaths,
            timestamp: Date.now(),
        };
    }, []);
    // Update canvas size when city data changes
    (0, react_1.useEffect)(() => {
        if (canvasSizingData) {
            const newSize = calculateCanvasResolution(canvasSizingData.buildings.length, canvasSizingData.bounds);
            setCanvasSize(newSize);
        }
    }, [canvasSizingData, subdirectoryMode]);
    // Separate stable and dynamic layers for performance optimization
    const stableLayers = (0, react_1.useMemo)(() => highlightLayers.filter(layer => layer.dynamic !== true), [highlightLayers]);
    const dynamicLayers = (0, react_1.useMemo)(() => highlightLayers.filter(layer => layer.dynamic === true), [highlightLayers]);
    // Combine all layers for rendering (moved up so abstractionLayer can use it)
    const allLayersWithoutAbstraction = (0, react_1.useMemo)(() => [...stableLayers, ...dynamicLayers], [stableLayers, dynamicLayers]);
    // Calculate abstracted directories based on current zoom using tree structure
    const abstractionLayer = (0, react_1.useMemo)(() => {
        // Find the abstraction layer in our highlight layers
        const abstractionLayerDef = highlightLayers.find(layer => layer.id === 'directory-abstraction' && layer.abstractionLayer);
        if (!abstractionLayerDef || !abstractionLayerDef.enabled || !filteredCityData) {
            return null;
        }
        const config = abstractionLayerDef.abstractionConfig;
        // Disable abstraction when zoomed in beyond a certain threshold
        const maxZoomForAbstraction = config?.maxZoomLevel ?? 5.0;
        if (zoomState.scale > maxZoomForAbstraction) {
            return null; // No abstractions when zoomed in
        }
        // Calculate which directories are too small at current zoom
        const abstractedItems = [];
        if (canvasRef.current) {
            const displayWidth = canvasRef.current.clientWidth || canvasSize.width;
            const displayHeight = canvasRef.current.clientHeight || canvasSize.height;
            const coordinateSystemData = subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && cityData
                ? cityData
                : filteredCityData;
            const { scale } = calculateScaleAndOffset(coordinateSystemData, displayWidth, displayHeight, displayOptions.padding);
            const totalScale = scale * zoomState.scale;
            // Get all highlighted paths from enabled layers
            const highlightedPaths = new Set();
            allLayersWithoutAbstraction.forEach(layer => {
                if (layer.enabled && layer.id !== 'directory-abstraction') {
                    layer.items.forEach(item => {
                        if (item.type === 'file') {
                            highlightedPaths.add(item.path);
                        }
                    });
                }
            });
            // Build directory tree
            const nodeMap = new Map();
            const rootNode = {
                path: '',
                district: {
                    path: '',
                    worldBounds: filteredCityData.bounds,
                    fileCount: 0,
                    type: 'directory',
                },
                screenSize: { width: Infinity, height: Infinity },
                children: [],
                buildings: [],
                containsHighlights: false,
                shouldAbstract: false,
            };
            nodeMap.set('', rootNode);
            // Create nodes for all districts
            filteredCityData.districts.forEach(district => {
                if (!district.path)
                    return;
                const screenWidth = (district.worldBounds.maxX - district.worldBounds.minX) * totalScale;
                const screenHeight = (district.worldBounds.maxZ - district.worldBounds.minZ) * totalScale;
                const node = {
                    path: district.path,
                    district: district,
                    screenSize: { width: screenWidth, height: screenHeight },
                    children: [],
                    buildings: [],
                    containsHighlights: false,
                    shouldAbstract: false,
                };
                nodeMap.set(district.path, node);
            });
            // Build parent-child relationships
            nodeMap.forEach((node, path) => {
                if (!path)
                    return; // Skip root
                // Find parent path
                const lastSlash = path.lastIndexOf('/');
                const parentPath = lastSlash > 0 ? path.substring(0, lastSlash) : '';
                const parent = nodeMap.get(parentPath);
                if (parent) {
                    parent.children.push(node);
                }
                else {
                    rootNode.children.push(node);
                }
            });
            // Assign buildings to their directories and check for highlights
            filteredCityData.buildings.forEach(building => {
                const dirPath = building.path.substring(0, building.path.lastIndexOf('/')) || '';
                const node = nodeMap.get(dirPath);
                if (node) {
                    node.buildings.push(building);
                    if (highlightedPaths.has(building.path)) {
                        // Mark this node and all parents as containing highlights
                        let current = node;
                        let depth = 0;
                        while (current && depth < 100) {
                            // Add safety limit
                            depth++;
                            current.containsHighlights = true;
                            const parentPath = current.path.lastIndexOf('/') > 0
                                ? current.path.substring(0, current.path.lastIndexOf('/'))
                                : '';
                            if (parentPath === current.path)
                                break; // Prevent infinite loop
                            current = nodeMap.get(parentPath);
                        }
                        if (depth >= 100) {
                            console.error('[Abstraction] Highlight propagation exceeded depth limit');
                        }
                    }
                }
            });
            if (config?.allowRootAbstraction) {
                const cityWidth = (filteredCityData.bounds.maxX - filteredCityData.bounds.minX) * totalScale;
                const cityHeight = (filteredCityData.bounds.maxZ - filteredCityData.bounds.minZ) * totalScale;
                const cityArea = cityWidth * cityHeight;
                const canvasArea = displayWidth * displayHeight;
                const minPercentage = config?.minPercentage || 0.01;
                const cityMeetsThreshold = cityArea >= canvasArea * minPercentage;
                if (!cityMeetsThreshold && !highlightedPaths.size) {
                    // Abstract the entire city
                    // Build meaningful project info text
                    const projectInfo = config.projectInfo;
                    let displayText = '';
                    if (projectInfo?.repoName || projectInfo?.rootDirectoryName) {
                        displayText = projectInfo.repoName || projectInfo.rootDirectoryName || 'Project';
                        if (projectInfo.currentBranch) {
                            displayText += `\n${projectInfo.currentBranch}`;
                        }
                    }
                    else {
                        displayText = 'Project Overview';
                    }
                    abstractedItems.push({
                        path: '', // Empty path for root
                        type: 'directory',
                        renderStrategy: 'cover',
                        coverOptions: {
                            text: displayText,
                            backgroundColor: config?.backgroundColor ?? '#1e40af',
                            opacity: 1.0,
                            borderRadius: 6,
                            textSize: 16,
                        },
                    });
                    // Return early with just the city abstraction
                    return {
                        ...abstractionLayerDef,
                        items: abstractedItems,
                    };
                }
            }
            else {
                console.log('[Abstraction] Root abstraction disabled - allowRootAbstraction is false');
            }
            // BFS to determine abstractions for subdirectories
            const queue = [...rootNode.children];
            while (queue.length > 0) {
                const node = queue.shift();
                // Decision logic - using percentage of canvas/viewport area
                // Current screen area of the directory
                const currentArea = node.screenSize.width * node.screenSize.height;
                // Canvas/viewport area
                const canvasArea = displayWidth * displayHeight;
                // Check if current size is at least X% of canvas
                const minPercentage = config?.minPercentage || 0.01; // Default 1% of canvas
                const meetsThreshold = currentArea >= canvasArea * minPercentage;
                if (meetsThreshold) {
                    // Large enough - show contents, continue to children
                    queue.push(...node.children);
                }
                else if (node.containsHighlights) {
                    // Too small but has highlights - show contents, continue to children
                    queue.push(...node.children);
                }
                else {
                    // Too small and no highlights - abstract this level
                    node.shouldAbstract = true;
                    const dirName = node.path.split('/').pop() || node.path;
                    abstractedItems.push({
                        path: node.path,
                        type: 'directory',
                        renderStrategy: 'cover',
                        coverOptions: {
                            text: dirName,
                            backgroundColor: config?.backgroundColor ?? '#1e40af',
                            opacity: 1.0,
                            borderRadius: 6,
                            textSize: 12,
                        },
                    });
                    // Don't process children - they're covered by this abstraction
                }
            }
        }
        // Return a new layer with calculated items
        return {
            ...abstractionLayerDef,
            items: abstractedItems,
        };
    }, [
        highlightLayers,
        filteredCityData,
        canvasSize,
        displayOptions.padding,
        zoomState.scale,
        subdirectoryMode,
        cityData,
        allLayersWithoutAbstraction,
    ]);
    // Combine all layers for rendering, including calculated abstraction layer
    const allLayers = (0, react_1.useMemo)(() => {
        const layers = [...stableLayers, ...dynamicLayers];
        // Replace abstraction layer with calculated one if it exists
        if (abstractionLayer) {
            const index = layers.findIndex(l => l.id === 'directory-abstraction');
            if (index >= 0) {
                layers[index] = abstractionLayer;
            }
        }
        return layers;
    }, [stableLayers, dynamicLayers, abstractionLayer]);
    // Update hit test cache when geometry or abstraction changes
    (0, react_1.useEffect)(() => {
        if (!filteredCityData)
            return;
        const width = canvasRef.current?.clientWidth || canvasSize.width;
        const height = canvasRef.current?.clientHeight || canvasSize.height;
        const { scale, offsetX, offsetZ } = calculateScaleAndOffset(filteredCityData, width, height, displayOptions.padding);
        // Get abstracted paths from the abstraction layer
        const abstractedPaths = new Set();
        if (abstractionLayer && abstractionLayer.enabled) {
            abstractionLayer.items.forEach(item => {
                if (item.type === 'directory') {
                    abstractedPaths.add(item.path);
                }
            });
        }
        const newCache = buildHitTestCache(filteredCityData, scale, offsetX, offsetZ, zoomState, abstractedPaths);
        setHitTestCache(newCache);
    }, [
        filteredCityData,
        canvasSize,
        displayOptions.padding,
        zoomState,
        buildHitTestCache,
        abstractionLayer,
    ]);
    // Main canvas drawing with layer-based highlighting
    (0, react_1.useEffect)(() => {
        if (!canvasRef.current || !filteredCityData)
            return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Performance monitoring start available for debugging
        const displayWidth = canvas.clientWidth || canvasSize.width;
        const displayHeight = canvas.clientHeight || canvasSize.height;
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        ctx.fillStyle = canvasBackgroundColor;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
        if (displayOptions.showGrid) {
            (0, drawLayeredBuildings_1.drawGrid)(ctx, displayWidth, displayHeight, displayOptions.gridSize);
        }
        const coordinateSystemData = subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && cityData
            ? cityData
            : filteredCityData;
        const { scale, offsetX, offsetZ } = calculateScaleAndOffset(coordinateSystemData, displayWidth, displayHeight, displayOptions.padding);
        const worldToCanvas = (x, z) => ({
            x: ((x - coordinateSystemData.bounds.minX) * scale + offsetX) * zoomState.scale +
                zoomState.offsetX,
            y: ((z - coordinateSystemData.bounds.minZ) * scale + offsetZ) * zoomState.scale +
                zoomState.offsetY,
        });
        // Get abstracted paths for filtering child districts
        const abstractedPathsForDistricts = new Set();
        const abstractionLayerForDistricts = allLayers.find(l => l.id === 'directory-abstraction');
        if (abstractionLayerForDistricts && abstractionLayerForDistricts.enabled) {
            abstractionLayerForDistricts.items.forEach(item => {
                if (item.type === 'directory') {
                    abstractedPathsForDistricts.add(item.path);
                }
            });
        }
        // Keep abstracted districts (for covers) but filter out their children
        let visibleDistricts = abstractedPathsForDistricts.size > 0
            ? filteredCityData.districts.filter(district => {
                // Check for root abstraction first
                if (abstractedPathsForDistricts.has('')) {
                    // If root is abstracted, only show root district
                    return !district.path || district.path === '';
                }
                if (!district.path)
                    return true; // Keep root
                // Keep the abstracted district itself (we need it for the cover)
                if (abstractedPathsForDistricts.has(district.path)) {
                    return true;
                }
                // Filter out children of abstracted directories
                for (const abstractedPath of abstractedPathsForDistricts) {
                    if (district.path.startsWith(abstractedPath + '/')) {
                        return false; // Skip child of abstracted directory
                    }
                }
                return true;
            })
            : filteredCityData.districts;
        // If root is abstracted and there's no root district, create one for the cover
        if (abstractedPathsForDistricts.has('')) {
            const hasRootDistrict = visibleDistricts.some(d => !d.path || d.path === '');
            if (!hasRootDistrict) {
                visibleDistricts = [
                    {
                        path: '',
                        worldBounds: filteredCityData.bounds,
                        fileCount: filteredCityData.buildings.length, // Total file count
                        type: 'directory',
                    },
                    ...visibleDistricts,
                ];
            }
        }
        // Draw districts with layer support
        (0, drawLayeredBuildings_1.drawLayeredDistricts)(ctx, visibleDistricts, worldToCanvas, scale * zoomState.scale, allLayers, interactionState.hoveredDistrict, fullSize, defaultDirectoryColor, filteredCityData.metadata.layoutConfig, abstractedPathsForDistricts, // Pass abstracted paths to skip labels
        showDirectoryLabels, districtBorderRadius);
        // Get abstracted directory paths for filtering from the actual layers being rendered
        const abstractedPaths = new Set();
        const activeAbstractionLayer = allLayers.find(l => l.id === 'directory-abstraction');
        if (activeAbstractionLayer && activeAbstractionLayer.enabled) {
            activeAbstractionLayer.items.forEach(item => {
                if (item.type === 'directory') {
                    abstractedPaths.add(item.path);
                }
            });
        }
        // Filter out buildings that are in abstracted directories
        const visibleBuildings = abstractedPaths.size > 0
            ? filteredCityData.buildings.filter(building => {
                // Check for root abstraction first
                if (abstractedPaths.has('')) {
                    // If root is abstracted, hide all buildings
                    return false;
                }
                const buildingDir = building.path.substring(0, building.path.lastIndexOf('/')) || '';
                // Simple direct check first
                for (const abstractedPath of abstractedPaths) {
                    if (buildingDir === abstractedPath) {
                        return false;
                    }
                    // Also check if building is in a subdirectory of abstracted path
                    if (buildingDir.startsWith(abstractedPath + '/')) {
                        return false;
                    }
                }
                return true;
            })
            : filteredCityData.buildings;
        // Log only if we see buildings that should have been filtered
        if (abstractedPaths.size > 0) {
            const suspiciousBuildings = visibleBuildings.filter(building => {
                const buildingDir = building.path.substring(0, building.path.lastIndexOf('/')) || '';
                // Check if this building's parent is visually covered
                for (const abstractedPath of abstractedPaths) {
                    if (buildingDir === abstractedPath || buildingDir.startsWith(abstractedPath + '/')) {
                        return true;
                    }
                }
                return false;
            });
            if (suspiciousBuildings.length > 0) {
                console.error(`[Building Filter] WARNING: ${suspiciousBuildings.length} buildings are being rendered in abstracted directories!`);
                suspiciousBuildings.slice(0, 3).forEach(building => {
                    console.error(`  - ${building.path}`);
                });
            }
        }
        // Draw buildings with layer support
        (0, drawLayeredBuildings_1.drawLayeredBuildings)(ctx, visibleBuildings, worldToCanvas, scale * zoomState.scale, allLayers, interactionState.hoveredBuilding, defaultBuildingColor, showFileNames, hoverBorderColor, disableOpacityDimming, showFileTypeIcons, buildingBorderRadius);
        const displayRootName = subdirectoryMode?.enabled && subdirectoryMode.rootPath
            ? subdirectoryMode.rootPath
                ? subdirectoryMode.rootPath
                : subdirectoryMode.rootPath.split('/').pop() || rootDirectoryName
            : selectiveRender?.mode === 'drilldown'
                ? selectiveRender.rootDirectory?.split('/').pop() || rootDirectoryName
                : rootDirectoryName;
        // Get total highlighted items count from all enabled layers
        const totalHighlighted = highlightLayers
            .filter(layer => layer.enabled)
            .reduce((sum, layer) => sum + layer.items.length, 0);
        if (showLegend) {
            (0, drawLayeredBuildings_1.drawLegend)(ctx, displayWidth, displayHeight, totalHighlighted, focusDirectory, fullSize, displayRootName);
        }
        // Performance monitoring end available for debugging
        // Performance stats available but not logged to reduce console noise
        // Uncomment for debugging: render time, buildings/districts counts, layer counts
    }, [
        filteredCityData,
        canvasSize,
        displayOptions,
        zoomState,
        selectiveRender,
        rootDirectoryName,
        highlightLayers,
        interactionState.hoveredBuilding,
        interactionState.hoveredDistrict,
        defaultDirectoryColor,
        showFileNames,
        fullSize,
        hoverBorderColor,
        disableOpacityDimming,
        focusDirectory,
        subdirectoryMode,
        cityData,
        canvasBackgroundColor,
        showLegend,
        showDirectoryLabels,
    ]);
    // Optimized hit testing
    const performHitTest = (0, react_1.useCallback)((canvasX, canvasY) => {
        if (!hitTestCache || !filteredCityData) {
            return { hoveredBuilding: null, hoveredDistrict: null };
        }
        const width = canvasRef.current?.clientWidth || canvasSize.width;
        const height = canvasRef.current?.clientHeight || canvasSize.height;
        const coordinateSystemData = subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && cityData
            ? cityData
            : filteredCityData;
        const { scale, offsetX, offsetZ } = calculateScaleAndOffset(coordinateSystemData, width, height, displayOptions.padding);
        const screenX = (canvasX - zoomState.offsetX) / zoomState.scale;
        const screenY = (canvasY - zoomState.offsetY) / zoomState.scale;
        const worldX = (screenX - offsetX) / scale + coordinateSystemData.bounds.minX;
        const worldZ = (screenY - offsetZ) / scale + coordinateSystemData.bounds.minZ;
        const nearbyItems = hitTestCache.spatialGrid.query(worldX, worldZ, 20);
        let hoveredBuilding = null;
        let hoveredDistrict = null;
        let minBuildingDistance = Infinity;
        let deepestDistrictLevel = -1;
        for (const item of nearbyItems) {
            if ('dimensions' in item) {
                const building = item;
                const size = Math.max(building.dimensions[0], building.dimensions[2]);
                const halfSize = size / 2;
                if (worldX >= building.position.x - halfSize &&
                    worldX <= building.position.x + halfSize &&
                    worldZ >= building.position.z - halfSize &&
                    worldZ <= building.position.z + halfSize) {
                    const distance = Math.sqrt(Math.pow(worldX - building.position.x, 2) + Math.pow(worldZ - building.position.z, 2));
                    if (distance < minBuildingDistance) {
                        minBuildingDistance = distance;
                        hoveredBuilding = building;
                    }
                }
            }
        }
        for (const item of nearbyItems) {
            if (!('dimensions' in item)) {
                const district = item;
                const districtPath = district.path || '';
                const isRoot = !districtPath || districtPath === '';
                // Skip root districts UNLESS they are abstracted (have covers)
                if (isRoot && !hitTestCache.abstractedPaths.has(''))
                    continue;
                if (worldX >= district.worldBounds.minX &&
                    worldX <= district.worldBounds.maxX &&
                    worldZ >= district.worldBounds.minZ &&
                    worldZ <= district.worldBounds.maxZ) {
                    const level = districtPath.split('/').filter(Boolean).length;
                    if (level > deepestDistrictLevel) {
                        deepestDistrictLevel = level;
                        hoveredDistrict = district;
                    }
                }
            }
        }
        return { hoveredBuilding, hoveredDistrict };
    }, [
        hitTestCache,
        filteredCityData,
        canvasSize,
        displayOptions.padding,
        zoomState,
        subdirectoryMode,
        cityData,
    ]);
    // Mouse event handlers
    // Call onHover callback when interaction state changes
    (0, react_1.useEffect)(() => {
        if (onHover && interactionState) {
            const fileTooltip = interactionState.hoveredBuilding
                ? {
                    text: interactionState.hoveredBuilding.path.split('/').pop() ||
                        interactionState.hoveredBuilding.path,
                }
                : null;
            const directoryTooltip = interactionState.hoveredDistrict && interactionState.hoveredDistrict.path !== '/'
                ? { text: interactionState.hoveredDistrict.path || '/' }
                : null;
            onHover({
                hoveredDistrict: interactionState.hoveredDistrict,
                hoveredBuilding: interactionState.hoveredBuilding,
                mousePos: interactionState.mousePos,
                fileTooltip,
                directoryTooltip,
                fileCount: interactionState.hoveredDistrict
                    ? Math.round(interactionState.hoveredDistrict.fileCount || 0)
                    : null,
            });
        }
    }, [interactionState, onHover]);
    // Helper function to transform mouse coordinates based on rotation/flip
    const transformMouseCoordinates = (0, react_1.useCallback)((x, y, canvasWidth, canvasHeight) => {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        // Translate to center
        let transformedX = x - centerX;
        let transformedY = y - centerY;
        // Apply inverse rotation (negative angle to undo visual rotation)
        const rotationDegrees = transform?.rotation || 0;
        if (rotationDegrees) {
            const angle = -(rotationDegrees * Math.PI) / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const newX = transformedX * cos - transformedY * sin;
            const newY = transformedX * sin + transformedY * cos;
            transformedX = newX;
            transformedY = newY;
        }
        // Apply inverse flips
        if (transform?.flipHorizontal) {
            transformedX = -transformedX;
        }
        if (transform?.flipVertical) {
            transformedY = -transformedY;
        }
        // Translate back from center
        transformedX += centerX;
        transformedY += centerY;
        return { x: transformedX, y: transformedY };
    }, [transform]);
    const handleMouseMoveInternal = (0, react_1.useCallback)((e) => {
        if (!canvasRef.current || !containerRef.current || !filteredCityData || zoomState.isDragging)
            return;
        // Get the container rect for mouse position
        const containerRect = containerRef.current.getBoundingClientRect();
        // Get mouse position relative to the container
        const rawX = e.clientX - containerRect.left;
        const rawY = e.clientY - containerRect.top;
        // Use canvas dimensions for transformation since that's what the hit testing uses
        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;
        // Transform the mouse coordinates to account for rotation/flips
        const { x, y } = transformMouseCoordinates(rawX, rawY, canvasWidth, canvasHeight);
        const { hoveredBuilding, hoveredDistrict } = performHitTest(x, y);
        setInteractionState(prev => {
            const hoveredItemChanged = prev.hoveredBuilding !== hoveredBuilding || prev.hoveredDistrict !== hoveredDistrict;
            const positionChanged = prev.mousePos.x !== x || prev.mousePos.y !== y;
            if (!hoveredItemChanged && !positionChanged) {
                return prev;
            }
            // Tooltip data will be calculated in onHover callback
            return {
                hoveredBuilding,
                hoveredDistrict,
                mousePos: { x, y },
            };
        });
    }, [filteredCityData, zoomState.isDragging, performHitTest, transformMouseCoordinates]);
    const handleMouseMove = (0, react_1.useCallback)((e) => {
        if (zoomState.isDragging) {
            const rawDeltaX = e.clientX - zoomState.lastMousePos.x;
            const rawDeltaY = e.clientY - zoomState.lastMousePos.y;
            // Transform the drag deltas based on rotation/flips
            let deltaX = rawDeltaX;
            let deltaY = rawDeltaY;
            const rotationDegrees = transform?.rotation || 0;
            if (rotationDegrees) {
                // Apply inverse rotation to the deltas
                const angle = -(rotationDegrees * Math.PI) / 180;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                deltaX = rawDeltaX * cos - rawDeltaY * sin;
                deltaY = rawDeltaX * sin + rawDeltaY * cos;
            }
            // Apply inverse flips
            if (transform?.flipHorizontal) {
                deltaX = -deltaX;
            }
            if (transform?.flipVertical) {
                deltaY = -deltaY;
            }
            setZoomState(prev => ({
                ...prev,
                offsetX: prev.offsetX + deltaX,
                offsetY: prev.offsetY + deltaY,
                lastMousePos: { x: e.clientX, y: e.clientY },
                hasMouseMoved: true,
            }));
            return;
        }
        handleMouseMoveInternal(e);
    }, [zoomState.isDragging, zoomState.lastMousePos, handleMouseMoveInternal, transform]);
    const handleClick = () => {
        if (zoomState.hasMouseMoved) {
            return;
        }
        if (interactionState.hoveredBuilding && onFileClick) {
            /*const fullPath = subdirectoryMode?.enabled && subdirectoryMode.rootPath
              ? `${subdirectoryMode.rootPath}/${interactionState.hoveredBuilding.path}`
              : interactionState.hoveredBuilding.path;*/
            onFileClick(interactionState.hoveredBuilding.path, 'file');
            return;
        }
        if (interactionState.hoveredDistrict) {
            const districtPath = interactionState.hoveredDistrict.path || '';
            const isRoot = !districtPath || districtPath === '';
            const fullPath = subdirectoryMode?.enabled && subdirectoryMode.rootPath && !isRoot
                ? `${subdirectoryMode.rootPath}/${districtPath}`
                : districtPath;
            if (onFileClick && !isRoot) {
                onFileClick(fullPath, 'directory');
            }
            else if (onDirectorySelect) {
                onDirectorySelect(focusDirectory === fullPath ? null : fullPath);
            }
        }
    };
    const handleMouseLeave = (0, react_1.useCallback)(() => {
        setInteractionState(prev => ({
            ...prev,
            hoveredDistrict: null,
            hoveredBuilding: null,
        }));
    }, []);
    const handleWheel = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, zoomState.scale * zoomFactor));
        const scaleChange = newScale / zoomState.scale;
        const newOffsetX = mouseX - (mouseX - zoomState.offsetX) * scaleChange;
        const newOffsetY = mouseY - (mouseY - zoomState.offsetY) * scaleChange;
        setZoomState(prev => ({
            ...prev,
            scale: newScale,
            offsetX: newOffsetX,
            offsetY: newOffsetY,
        }));
    };
    const handleMouseDown = (e) => {
        setZoomState(prev => ({
            ...prev,
            isDragging: true,
            lastMousePos: { x: e.clientX, y: e.clientY },
            hasMouseMoved: false,
        }));
    };
    const handleMouseUp = (0, react_1.useCallback)(() => {
        setZoomState(prev => ({ ...prev, isDragging: false }));
    }, []);
    if (!filteredCityData) {
        return (react_1.default.createElement("div", { className: `bg-gray-900 rounded-lg p-4 flex items-center justify-center ${className}` },
            react_1.default.createElement("div", { className: "text-gray-400" }, "No city data available")));
    }
    return (react_1.default.createElement("div", { ref: containerRef, className: className, style: {
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: canvasBackgroundColor,
            transform: (() => {
                const transforms = [];
                // Apply rotation
                const rotationDegrees = transform?.rotation || 0;
                if (rotationDegrees) {
                    transforms.push(`rotate(${rotationDegrees}deg)`);
                }
                // Apply flips
                if (transform?.flipHorizontal) {
                    transforms.push('scaleX(-1)');
                }
                if (transform?.flipVertical) {
                    transforms.push('scaleY(-1)');
                }
                return transforms.length > 0 ? transforms.join(' ') : undefined;
            })(),
        } },
        showLayerControls && highlightLayers.length > 0 && (react_1.default.createElement("div", { className: "flex flex-col gap-2", style: {
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            } }, highlightLayers.map(layer => (react_1.default.createElement("button", { key: layer.id, onClick: () => onLayerToggle?.(layer.id, !layer.enabled), className: `
                px-3 py-2 rounded-lg shadow-lg transition-all duration-200
                flex items-center gap-2 text-xs font-medium
                ${layer.enabled
                ? 'bg-gray-700 text-white border-2'
                : 'bg-gray-800 bg-opacity-80 text-gray-400 border-2 border-gray-700 hover:border-gray-600'}
                hover:bg-gray-600
              `, style: {
                borderColor: layer.enabled ? layer.color : undefined,
                minWidth: '120px',
            }, title: `Toggle ${layer.name}` },
            react_1.default.createElement("div", { className: `w-3 h-3 rounded-full transition-opacity ${layer.enabled ? 'opacity-100' : 'opacity-40'}`, style: { backgroundColor: layer.color } }),
            react_1.default.createElement("span", { className: "text-left flex-1" }, layer.name),
            layer.items && layer.items.length > 0 && (react_1.default.createElement("span", { className: `text-xs ${layer.enabled ? 'text-gray-300' : 'text-gray-500'}` }, layer.items.length))))))),
        react_1.default.createElement("canvas", { ref: canvasRef, style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: 1,
            } }),
        react_1.default.createElement("div", { style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 2,
                cursor: zoomState.isDragging
                    ? 'grabbing'
                    : interactionState.hoveredBuilding
                        ? 'pointer'
                        : interactionState.hoveredDistrict
                            ? 'pointer'
                            : 'grab',
            }, onMouseMove: handleMouseMove, onMouseDown: handleMouseDown, onMouseUp: handleMouseUp, onClick: handleClick, onMouseLeave: handleMouseLeave, onWheel: handleWheel })));
}
function calculateScaleAndOffset(cityData, width, height, padding) {
    const cityWidth = cityData.bounds.maxX - cityData.bounds.minX;
    const cityDepth = cityData.bounds.maxZ - cityData.bounds.minZ;
    const horizontalPadding = padding;
    const verticalPadding = padding * 2;
    const scaleX = (width - horizontalPadding) / cityDepth;
    const scaleZ = (height - verticalPadding) / cityWidth;
    const scale = Math.min(scaleX, scaleZ);
    const scaledCityWidth = cityDepth * scale;
    const scaledCityHeight = cityWidth * scale;
    const offsetX = (width - scaledCityWidth) / 2;
    const offsetZ = (height - scaledCityHeight) / 2;
    return { scale, offsetX, offsetZ };
}
