"use strict";
// Server-side rendering utilities for Code City
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawGrid = exports.drawLegend = exports.drawDistricts = exports.drawBuildings = exports.RenderMode = exports.clearCanvas = exports.createDrawContext = void 0;
// Drawing utilities
var drawingUtils_1 = require("./render/drawingUtils");
Object.defineProperty(exports, "createDrawContext", { enumerable: true, get: function () { return drawingUtils_1.createDrawContext; } });
Object.defineProperty(exports, "clearCanvas", { enumerable: true, get: function () { return drawingUtils_1.clearCanvas; } });
// Rendering functions
var renderUtils_1 = require("./render/renderUtils");
Object.defineProperty(exports, "RenderMode", { enumerable: true, get: function () { return renderUtils_1.RenderMode; } });
Object.defineProperty(exports, "drawBuildings", { enumerable: true, get: function () { return renderUtils_1.drawBuildings; } });
Object.defineProperty(exports, "drawDistricts", { enumerable: true, get: function () { return renderUtils_1.drawDistricts; } });
Object.defineProperty(exports, "drawLegend", { enumerable: true, get: function () { return renderUtils_1.drawLegend; } });
Object.defineProperty(exports, "drawGrid", { enumerable: true, get: function () { return renderUtils_1.drawGrid; } });
