"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCodeCityData = exports.MultiVersionCityBuilder = exports.getFileColorMapping = exports.getDefaultFileColorConfig = exports.createFileColorHighlightLayers = exports.filterCityDataForMultipleDirectories = exports.filterCityDataForSubdirectory = exports.filterCityDataForSelectiveRender = exports.ArchitectureMapHighlightLayers = void 0;
// Main component export
var ArchitectureMapHighlightLayers_1 = require("./components/ArchitectureMapHighlightLayers");
Object.defineProperty(exports, "ArchitectureMapHighlightLayers", { enumerable: true, get: function () { return ArchitectureMapHighlightLayers_1.ArchitectureMapHighlightLayers; } });
// Utility functions
var cityDataUtils_1 = require("./builder/cityDataUtils");
Object.defineProperty(exports, "filterCityDataForSelectiveRender", { enumerable: true, get: function () { return cityDataUtils_1.filterCityDataForSelectiveRender; } });
Object.defineProperty(exports, "filterCityDataForSubdirectory", { enumerable: true, get: function () { return cityDataUtils_1.filterCityDataForSubdirectory; } });
Object.defineProperty(exports, "filterCityDataForMultipleDirectories", { enumerable: true, get: function () { return cityDataUtils_1.filterCityDataForMultipleDirectories; } });
// File color highlight layer utilities
var fileColorHighlightLayers_1 = require("./utils/fileColorHighlightLayers");
Object.defineProperty(exports, "createFileColorHighlightLayers", { enumerable: true, get: function () { return fileColorHighlightLayers_1.createFileColorHighlightLayers; } });
Object.defineProperty(exports, "getDefaultFileColorConfig", { enumerable: true, get: function () { return fileColorHighlightLayers_1.getDefaultFileColorConfig; } });
Object.defineProperty(exports, "getFileColorMapping", { enumerable: true, get: function () { return fileColorHighlightLayers_1.getFileColorMapping; } });
// Re-export MultiVersionCityBuilder which was requested
var code_city_builder_1 = require("@principal-ai/code-city-builder");
Object.defineProperty(exports, "MultiVersionCityBuilder", { enumerable: true, get: function () { return code_city_builder_1.MultiVersionCityBuilder; } });
// Export the useCodeCityData hook
var useCodeCityData_1 = require("./hooks/useCodeCityData");
Object.defineProperty(exports, "useCodeCityData", { enumerable: true, get: function () { return useCodeCityData_1.useCodeCityData; } });
