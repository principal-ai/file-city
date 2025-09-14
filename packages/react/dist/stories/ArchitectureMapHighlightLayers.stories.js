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
exports.WithBorderRadius = exports.WithTransformations = exports.WithGrid = exports.CustomRenderStrategies = exports.WithAbstractionLayer = exports.Interactive = exports.SubdirectoryMode = exports.SelectiveRendering = exports.DirectoryHighlighting = exports.WithHighlightLayers = exports.Default = void 0;
const react_1 = __importStar(require("react"));
const ArchitectureMapHighlightLayers_1 = require("../components/ArchitectureMapHighlightLayers");
const sample_data_1 = require("./sample-data");
const meta = {
    title: 'Components/ArchitectureMapHighlightLayers',
    component: ArchitectureMapHighlightLayers_1.ArchitectureMapHighlightLayers,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (react_1.default.createElement("div", { style: { width: '100vw', height: '100vh', backgroundColor: '#1a1a1a' } },
            react_1.default.createElement(Story, null))),
    ],
};
exports.default = meta;
// Basic story with sample city data
exports.Default = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        showGrid: false,
        fullSize: true,
        canvasBackgroundColor: '#0f1419',
        defaultBuildingColor: '#36454F',
        defaultDirectoryColor: '#111827',
    },
};
// Story with highlight layers
exports.WithHighlightLayers = {
    render: () => {
        const [layers, setLayers] = (0, react_1.useState)([
            {
                id: 'modified-files',
                name: 'Modified Files',
                enabled: true,
                color: '#3b82f6',
                priority: 1,
                items: [
                    { path: 'src/components/App.tsx', type: 'file' },
                    { path: 'src/components/Header.tsx', type: 'file' },
                    { path: 'src/utils/helpers.ts', type: 'file' },
                ],
            },
            {
                id: 'new-files',
                name: 'New Files',
                enabled: true,
                color: '#10b981',
                priority: 2,
                items: [
                    { path: 'src/components/Footer.tsx', type: 'file' },
                    { path: 'tests/unit/footer.test.tsx', type: 'file' },
                ],
            },
            {
                id: 'deleted-files',
                name: 'Deleted Files',
                enabled: false,
                color: '#ef4444',
                priority: 3,
                items: [
                    { path: 'src/deprecated/OldComponent.tsx', type: 'file' },
                ],
            },
        ]);
        const handleLayerToggle = (layerId, enabled) => {
            setLayers(prev => prev.map(layer => layer.id === layerId ? { ...layer, enabled } : layer));
        };
        return (react_1.default.createElement(ArchitectureMapHighlightLayers_1.ArchitectureMapHighlightLayers, { cityData: (0, sample_data_1.createSampleCityData)(), highlightLayers: layers, onLayerToggle: handleLayerToggle, showLayerControls: true, fullSize: true, canvasBackgroundColor: "#0f1419", defaultBuildingColor: "#36454F", defaultDirectoryColor: "#111827" }));
    },
};
// Story with directory highlighting
exports.DirectoryHighlighting = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        highlightLayers: [
            {
                id: 'test-directory',
                name: 'Test Files',
                enabled: true,
                color: '#f59e0b',
                priority: 1,
                items: [
                    { path: 'tests', type: 'directory' },
                    { path: '__tests__', type: 'directory' },
                ],
            },
        ],
        showLayerControls: true,
        fullSize: true,
    },
};
// Story with selective rendering
exports.SelectiveRendering = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        selectiveRender: {
            mode: 'filter',
            directories: new Set(['src', 'tests']),
        },
        fullSize: true,
    },
};
// Story with subdirectory mode
exports.SubdirectoryMode = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        subdirectoryMode: {
            enabled: true,
            rootPath: 'src',
            autoCenter: true,
        },
        fullSize: true,
    },
};
// Interactive story with hover and click callbacks
exports.Interactive = {
    render: () => {
        const [hoveredInfo, setHoveredInfo] = (0, react_1.useState)('');
        const [clickedPath, setClickedPath] = (0, react_1.useState)('');
        return (react_1.default.createElement("div", { style: { position: 'relative', width: '100%', height: '100%' } },
            react_1.default.createElement(ArchitectureMapHighlightLayers_1.ArchitectureMapHighlightLayers, { cityData: (0, sample_data_1.createSampleCityData)(), fullSize: true, onHover: (info) => {
                    if (info.hoveredBuilding) {
                        setHoveredInfo(`File: ${info.hoveredBuilding.path}`);
                    }
                    else if (info.hoveredDistrict) {
                        setHoveredInfo(`Directory: ${info.hoveredDistrict.path || '/'}`);
                    }
                    else {
                        setHoveredInfo('');
                    }
                }, onFileClick: (path, type) => {
                    setClickedPath(`Clicked: ${type} - ${path}`);
                } }),
            react_1.default.createElement("div", { style: {
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    color: 'white',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: '10px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                } },
                react_1.default.createElement("div", null, hoveredInfo || 'Hover over elements'),
                clickedPath && react_1.default.createElement("div", null, clickedPath))));
    },
};
// Story with abstraction layer
exports.WithAbstractionLayer = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        highlightLayers: [
            {
                id: 'directory-abstraction',
                name: 'Directory Abstraction',
                enabled: true,
                color: '#1e40af',
                priority: 0,
                items: [],
                // @ts-ignore - abstraction layer specific properties
                abstractionLayer: true,
                abstractionConfig: {
                    maxZoomLevel: 2.0,
                    minPercentage: 0.02,
                    backgroundColor: '#1e40af',
                    allowRootAbstraction: false,
                },
            },
        ],
        fullSize: true,
    },
};
// Story with custom rendering strategies
exports.CustomRenderStrategies = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        highlightLayers: [
            {
                id: 'glow-effect',
                name: 'Glow Effect',
                enabled: true,
                color: '#fbbf24',
                priority: 1,
                items: [
                    {
                        path: 'src/index.ts',
                        type: 'file',
                        renderStrategy: 'glow',
                    },
                ],
            },
            {
                id: 'pattern-fill',
                name: 'Pattern Fill',
                enabled: true,
                color: '#8b5cf6',
                priority: 2,
                items: [
                    {
                        path: 'package.json',
                        type: 'file',
                        renderStrategy: 'pattern',
                    },
                ],
            },
            {
                id: 'covered-directories',
                name: 'Covered Directories',
                enabled: true,
                color: '#06b6d4',
                priority: 3,
                items: [
                    {
                        path: 'node_modules',
                        type: 'directory',
                        renderStrategy: 'cover',
                        coverOptions: {
                            text: 'Dependencies',
                            backgroundColor: '#06b6d4',
                            opacity: 0.8,
                            borderRadius: 4,
                        },
                    },
                ],
            },
        ],
        showLayerControls: true,
        fullSize: true,
    },
};
// Story with grid display
exports.WithGrid = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        showGrid: true,
        showFileNames: true,
        fullSize: true,
    },
};
// Story with transformations
exports.WithTransformations = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        transform: {
            rotation: 90,
            flipHorizontal: false,
            flipVertical: false,
        },
        fullSize: true,
    },
};
// Story with border radius
exports.WithBorderRadius = {
    args: {
        cityData: (0, sample_data_1.createSampleCityData)(),
        buildingBorderRadius: 4,
        districtBorderRadius: 8,
        fullSize: true,
    },
};
