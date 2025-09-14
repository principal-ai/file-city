"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_VISUAL_SETTINGS = exports.DEFAULT_IMPORTANCE_LEVELS = void 0;
// Default importance levels
exports.DEFAULT_IMPORTANCE_LEVELS = [
    {
        value: 10,
        name: 'Critical',
        color: '#ff0000',
        starCount: 3,
    },
    {
        value: 8,
        name: 'High',
        color: '#ff8800',
        starCount: 2,
    },
    {
        value: 5,
        name: 'Medium',
        color: '#ffcc00',
        starCount: 1,
    },
    {
        value: 3,
        name: 'Low',
        color: '#88ff00',
        starCount: 0,
    },
];
// Default visual settings
exports.DEFAULT_VISUAL_SETTINGS = {
    showStars: true,
    starColor: '#FFD700',
    starSize: 1,
    enableGlow: true,
};
