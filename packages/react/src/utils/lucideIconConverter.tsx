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
  Package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  BookOpen: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  BookText: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/>',
  ScrollText: '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M15 8h-5"/><path d="M15 12h-5"/>',
  Settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  Home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  Lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  GitBranch: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  EyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
  Key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  Atom: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
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
