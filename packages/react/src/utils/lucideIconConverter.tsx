// Cache for converted SVG data URLs
const svgCache = new Map<string, string>();

// Cache for loaded Image objects (to prevent flashing)
const imageCache = new Map<string, HTMLImageElement>();

// SVG path data for Lucide icons
// Source: https://github.com/lucide-icons/lucide
const ICON_PATHS: Record<string, string> = {
  TestTube: '<path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/>',
  FlaskConical: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
  FileCode: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
  FileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  File: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  Folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
};

/**
 * Convert a Lucide icon name to an SVG data URL that can be used in Canvas
 * @param iconName - The name of the Lucide icon (e.g., "TestTube", "FileCode")
 * @param color - The color to apply to the icon (default: "white")
 * @param size - The size of the icon (default: 24)
 * @returns SVG data URL string or null if icon not found
 */
export function lucideIconToDataUrl(
  iconName: string,
  color: string = 'white',
  size: number = 24,
): string | null {
  // Create cache key
  const cacheKey = `${iconName}-${color}-${size}`;

  // Check cache first
  if (svgCache.has(cacheKey)) {
    const cached = svgCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Get the icon path data
  const pathData = ICON_PATHS[iconName];

  if (!pathData) {
    console.warn(`[lucideIconConverter] Icon "${iconName}" not found. Available icons:`, Object.keys(ICON_PATHS));
    return null;
  }

  try {
    // Create SVG string
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathData}</svg>`;

    // Convert to data URL
    const encodedSvg = encodeURIComponent(svgString);
    const dataUrl = `data:image/svg+xml,${encodedSvg}`;

    // Cache the result
    svgCache.set(cacheKey, dataUrl);

    return dataUrl;
  } catch (error) {
    console.error(`[lucideIconConverter] Error converting icon "${iconName}":`, error);
    return null;
  }
}

/**
 * Preload commonly used icons to improve performance
 * Call this on app initialization
 */
export function preloadCommonIcons() {
  const commonIcons = [
    'TestTube',
    'FileCode',
    'FileText',
    'File',
    'Folder',
    'Image',
    'Database',
    'Settings',
  ];

  commonIcons.forEach(iconName => {
    lucideIconToDataUrl(iconName);
  });
}

/**
 * Get a cached Image object for an icon (prevents flashing on redraws)
 * @param iconName - The name of the Lucide icon
 * @param color - The color to apply to the icon (default: "white")
 * @param size - The size of the icon (default: 24)
 * @returns HTMLImageElement or null if icon not found
 */
export function getLucideIconImage(
  iconName: string,
  color: string = 'white',
  size: number = 24,
): HTMLImageElement | null {
  const cacheKey = `${iconName}-${color}-${size}`;

  // Return cached image if available
  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Get the data URL
  const dataUrl = lucideIconToDataUrl(iconName, color, size);
  if (!dataUrl) {
    return null;
  }

  // Create and cache the image
  const img = new Image();
  img.src = dataUrl;
  imageCache.set(cacheKey, img);

  return img;
}

/**
 * Clear the SVG cache (useful for memory management)
 */
export function clearIconCache() {
  svgCache.clear();
  imageCache.clear();
}

/**
 * Get available Lucide icon names
 * @returns Array of all available icon names
 */
export function getAvailableIcons(): string[] {
  return Object.keys(ICON_PATHS);
}
