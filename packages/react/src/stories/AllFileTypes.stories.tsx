import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import { CodeCityBuilderWithGrid, buildFileSystemTreeFromFileInfoList } from '@principal-ai/file-city-builder';
import { createFileColorHighlightLayers } from '../utils/fileColorHighlightLayers';

const meta = {
  title: 'Showcase/All File Types',
  component: ArchitectureMapHighlightLayers,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1a1a1a' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ArchitectureMapHighlightLayers>;

export default meta;
type Story = StoryObj<typeof meta>;

// Comprehensive list of file types with examples
const allFileTypes = [
  // Frontend
  { path: 'frontend/typescript/index.ts', size: 1500 },
  { path: 'frontend/typescript/App.tsx', size: 3200 },
  { path: 'frontend/javascript/script.js', size: 1200 },
  { path: 'frontend/javascript/Component.jsx', size: 1800 },
  { path: 'frontend/html/index.html', size: 2000 },
  { path: 'frontend/css/styles.css', size: 1500 },
  { path: 'frontend/scss/main.scss', size: 1700 },
  { path: 'frontend/sass/theme.sass', size: 1600 },
  { path: 'frontend/less/layout.less', size: 1400 },
  { path: 'frontend/vue/Component.vue', size: 2200 },
  { path: 'frontend/svelte/Widget.svelte', size: 1900 },

  // Backend
  { path: 'backend/python/server.py', size: 3500 },
  { path: 'backend/java/Application.java', size: 4200 },
  { path: 'backend/go/main.go', size: 2800 },
  { path: 'backend/rust/lib.rs', size: 3100 },
  { path: 'backend/php/index.php', size: 2400 },
  { path: 'backend/ruby/app.rb', size: 2100 },
  { path: 'backend/csharp/Program.cs', size: 2600 },

  // Mobile
  { path: 'mobile/swift/ViewController.swift', size: 2900 },
  { path: 'mobile/kotlin/MainActivity.kt', size: 3200 },
  { path: 'mobile/dart/main.dart', size: 2500 },
  { path: 'mobile/objc/AppDelegate.m', size: 2800 },
  { path: 'mobile/objcpp/Bridge.mm', size: 2400 },

  // Systems
  { path: 'systems/c/main.c', size: 2200 },
  { path: 'systems/cpp/engine.cpp', size: 3800 },
  { path: 'systems/headers/types.h', size: 1200 },
  { path: 'systems/zig/build.zig', size: 1800 },
  { path: 'systems/zig-config/build.zon', size: 900 },

  // Testing - NEW with Lucide icons!
  { path: 'tests/typescript/auth.test.ts', size: 2400 },
  { path: 'tests/typescript/Login.test.tsx', size: 2800 },
  { path: 'tests/javascript/utils.test.js', size: 1900 },
  { path: 'tests/javascript/Button.test.jsx', size: 2100 },
  { path: 'tests/specs/api.spec.ts', size: 2600 },
  { path: 'tests/specs/Header.spec.tsx', size: 2300 },
  { path: 'tests/specs/validation.spec.js', size: 1800 },
  { path: 'tests/specs/Form.spec.jsx', size: 2000 },
  { path: 'tests/snapshots/component.snap', size: 3500 },

  // Data & Config
  { path: 'config/data.json', size: 1200 },
  { path: 'config/settings.yaml', size: 1000 },
  { path: 'config/app.yml', size: 950 },
  { path: 'config/data.xml', size: 1800 },
  { path: 'config/Cargo.toml', size: 800 },
  { path: 'config/nix/default.nix', size: 1400 },

  // Documentation
  { path: 'docs/README.md', size: 4200 },
  { path: 'docs/API.mdx', size: 3800 },
  { path: 'docs/notes.txt', size: 600 },

  // Scripts
  { path: 'scripts/deploy.sh', size: 1500 },
  { path: 'scripts/setup.bash', size: 1300 },
  { path: 'scripts/env.zsh', size: 1100 },
  { path: 'scripts/utils.fish', size: 900 },
  { path: 'scripts/build.ps1', size: 1700 },
  { path: 'scripts/tasks.nu', size: 1200 },
  { path: 'scripts/vim/config.vim', size: 800 },
  { path: 'scripts/lua/init.lua', size: 1400 },
  { path: 'scripts/scheme/query.scm', size: 900 },

  // Database
  { path: 'database/schema.sql', size: 3200 },

  // Images
  { path: 'assets/images/logo.svg', size: 2400 },
  { path: 'assets/images/hero.png', size: 45000 },
  { path: 'assets/images/photo.jpg', size: 38000 },
  { path: 'assets/images/banner.jpeg', size: 42000 },
  { path: 'assets/images/animation.gif', size: 12000 },
  { path: 'assets/images/modern.webp', size: 28000 },

  // Graphics
  { path: 'shaders/vertex.glsl', size: 1800 },
  { path: 'shaders/fragment.metal', size: 2100 },

  // Assets
  { path: 'fonts/Inter-Regular.ttf', size: 156000 },
  { path: 'fonts/Inter-Bold.otf', size: 148000 },
  { path: 'fonts/Roboto-Regular.woff', size: 82000 },
  { path: 'fonts/Roboto-Bold.woff2', size: 76000 },

  // Apple/iOS
  { path: 'ios/Interface.xib', size: 4200 },
  { path: 'ios/Info.plist', size: 1200 },
  { path: 'ios/App.entitlements', size: 800 },

  // Other
  { path: 'analytics/analysis.r', size: 2800 },
  { path: 'data/visualization.canvas', size: 1500 },
  { path: 'special/LICENSE', size: 1100 },

  // Lock files
  { path: 'package-lock.json', size: 256000 },
  { path: 'Cargo.lock', size: 45000 },
  { path: 'yarn.lock', size: 128000 },

  // Config files (exact names)
  { path: '.gitignore', size: 600 },
  { path: '.dockerignore', size: 400 },
  { path: '.npmignore', size: 300 },
  { path: '.eslintignore', size: 250 },
  { path: '.prettierignore', size: 200 },
  { path: '.bashrc', size: 1800 },
  { path: '.zshrc', size: 2200 },
  { path: '.vimrc', size: 3500 },
  { path: '.npmrc', size: 400 },
  { path: '.eslintrc', size: 800 },
  { path: '.prettierrc', size: 300 },
  { path: '.babelrc', size: 500 },

  // GTK
  { path: 'ui/window.blp', size: 2100 },

  // Localization
  { path: 'locales/en.po', size: 4500 },
  { path: 'locales/template.pot', size: 3800 },
];

// Create city data from file types
function createAllFileTypesCityData() {
  const fileInfos = allFileTypes.map(({ path, size }) => {
    const lastSlash = path.lastIndexOf('/');
    const name = lastSlash === -1 ? path : path.substring(lastSlash + 1);
    const lastDot = name.lastIndexOf('.');
    const extension = lastDot === -1 ? '' : name.substring(lastDot);

    return {
      name,
      path,
      relativePath: path,
      size,
      extension,
      lastModified: new Date('2025-01-26'),
      isDirectory: false,
    };
  });

  const fileTree = buildFileSystemTreeFromFileInfoList(fileInfos);
  const builder = new CodeCityBuilderWithGrid();
  return builder.buildCityFromFileSystem(fileTree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    paddingInner: 1,
    paddingOuter: 3,
  });
}

// Story showing all file types with color coding
export const AllFileTypesWithColors: Story = {
  render: function RenderAllFileTypes() {
    const cityData = createAllFileTypesCityData();
    const highlightLayers = createFileColorHighlightLayers(cityData.buildings);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ArchitectureMapHighlightLayers
          cityData={cityData}
          highlightLayers={highlightLayers}
          showLayerControls={true}
          fullSize={true}
          canvasBackgroundColor="#0a0a0a"
          defaultBuildingColor="#36454F"
          defaultDirectoryColor="#1a1a1a"
          enableZoom={true}
          buildingBorderRadius={2}
          districtBorderRadius={4}
        />
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: '16px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxWidth: '300px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#10b981' }}>
            📁 All File Types Showcase
          </div>
          <div style={{ color: '#9ca3af', fontSize: '11px', lineHeight: '1.5' }}>
            This story demonstrates all {allFileTypes.length} supported file types with their colors
            and icons.
            <br />
            <br />
            🧪 Test files (.test.*, .spec.*) now have Lucide icons!
            <br />
            <br />
            Use the layer controls on the left to filter by file type.
          </div>
        </div>
      </div>
    );
  },
};

// Story focusing on test files with icons
export const TestFilesWithIcons: Story = {
  render: function RenderTestFiles() {
    const testFiles = allFileTypes.filter(
      f => f.path.includes('.test.') || f.path.includes('.spec.') || f.path.includes('.snap'),
    );

    const fileInfos = testFiles.map(({ path, size }) => {
      const lastSlash = path.lastIndexOf('/');
      const name = lastSlash === -1 ? path : path.substring(lastSlash + 1);
      const lastDot = name.lastIndexOf('.');
      const extension = lastDot === -1 ? '' : name.substring(lastDot);

      return {
        name,
        path,
        relativePath: path,
        size,
        extension,
        lastModified: new Date('2025-01-26'),
        isDirectory: false,
      };
    });

    const fileTree = buildFileSystemTreeFromFileInfoList(fileInfos);
    const builder = new CodeCityBuilderWithGrid();
    const cityData = builder.buildCityFromFileSystem(fileTree, '', {
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 2,
      paddingRight: 2,
      paddingInner: 1,
      paddingOuter: 3,
    });
    const highlightLayers = createFileColorHighlightLayers(cityData.buildings);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ArchitectureMapHighlightLayers
          cityData={cityData}
          highlightLayers={highlightLayers}
          showLayerControls={true}
          fullSize={true}
          canvasBackgroundColor="#0a0a0a"
          defaultBuildingColor="#36454F"
          defaultDirectoryColor="#1a1a1a"
          enableZoom={true}
          buildingBorderRadius={3}
        />
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: '20px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxWidth: '320px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
            🧪 Test Files with Lucide Icons
          </div>
          <div style={{ color: '#9ca3af', fontSize: '11px', lineHeight: '1.6', marginBottom: '12px' }}>
            Test files now feature professional SVG icons from the Lucide library:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#10b981',
                  borderRadius: '2px',
                }}
              />
              <span style={{ color: '#10b981' }}>TestTube icon</span>
              <span style={{ color: '#6b7280' }}>.test.*</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#059669',
                  borderRadius: '2px',
                }}
              />
              <span style={{ color: '#059669' }}>FlaskConical</span>
              <span style={{ color: '#6b7280' }}>.spec.*</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#9d4edd',
                  borderRadius: '2px',
                }}
              />
              <span style={{ color: '#9d4edd' }}>Snapshot</span>
              <span style={{ color: '#6b7280' }}>.snap</span>
            </div>
          </div>
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #374151',
              color: '#9ca3af',
              fontSize: '10px',
            }}
          >
            💡 Zoom in to see the icons clearly
          </div>
        </div>
      </div>
    );
  },
};
