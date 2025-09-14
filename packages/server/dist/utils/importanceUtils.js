"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateImportance = calculateImportance;
exports.getImportanceLevel = getImportanceLevel;
exports.shouldShowImportance = shouldShowImportance;
exports.getStarCount = getStarCount;
exports.createImportanceMatcher = createImportanceMatcher;
const minimatch_1 = require("minimatch");
const importanceTypes_1 = require("../types/importanceTypes");
/**
 * Calculate the importance of a file or directory based on the configuration
 */
function calculateImportance(path, type, config) {
    if (!config)
        return null;
    // Check explicit entries first (they take precedence)
    if (config.explicit) {
        const entries = type === 'file' ? config.explicit.files : config.explicit.directories;
        if (entries) {
            const exactMatch = entries.find(entry => entry.path === path);
            if (exactMatch) {
                return {
                    importance: exactMatch.importance,
                    label: exactMatch.label,
                    description: exactMatch.description,
                    documentationPath: exactMatch.documentationPath,
                    source: 'explicit',
                };
            }
        }
    }
    // Check patterns
    if (config.patterns) {
        const patterns = type === 'file' ? config.patterns.files : config.patterns.directories;
        if (patterns) {
            // Find the highest importance match
            let bestMatch = null;
            for (const pattern of patterns) {
                if ((0, minimatch_1.minimatch)(path, pattern.pattern)) {
                    if (!bestMatch || pattern.importance > bestMatch.importance) {
                        bestMatch = {
                            importance: pattern.importance,
                            label: pattern.label,
                            description: pattern.description,
                            documentationPath: pattern.documentationPath,
                            source: 'pattern',
                        };
                    }
                }
            }
            if (bestMatch)
                return bestMatch;
        }
    }
    return null;
}
/**
 * Get the importance level details for a given importance value
 */
function getImportanceLevel(importance, config) {
    const levels = config?.levels || importanceTypes_1.DEFAULT_IMPORTANCE_LEVELS;
    // Find the matching level or the closest one below
    let matchedLevel = levels[levels.length - 1]; // Default to lowest
    for (const level of levels) {
        if (importance >= level.value) {
            matchedLevel = level;
            break;
        }
    }
    return matchedLevel;
}
/**
 * Check if a file or directory should show importance indicators
 */
function shouldShowImportance(importance, config) {
    if (!config?.visualSettings?.showStars)
        return false;
    // Only show stars for importance >= 5 by default
    return importance >= 5;
}
/**
 * Get star count for an importance level
 */
function getStarCount(importance, config) {
    const level = getImportanceLevel(importance, config);
    return level.starCount || 0;
}
/**
 * Create a path matcher function for efficient bulk matching
 */
function createImportanceMatcher(config) {
    if (!config)
        return () => null;
    return (path, type) => {
        return calculateImportance(path, type, config);
    };
}
