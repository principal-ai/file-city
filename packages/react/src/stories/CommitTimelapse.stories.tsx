import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  type CityData,
} from '../components/FileCity3D';
import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
  diffCityData,
  interpolateCityData,
} from '@principal-ai/file-city-builder';
import type { FileInfo } from '@principal-ai/repository-abstraction';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/FileCity3D/CommitTimelapse',
  component: FileCity3D,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// --- Types ---

interface FileEntry {
  path: string;
  size: number;
  lineCount: number;
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  files: FileEntry[];
}

// --- Build city data from file list ---

function buildCity(files: FileEntry[]): CityData {
  const fileInfos: FileInfo[] = files.map(f => ({
    name: f.path.split('/').pop() || f.path,
    path: f.path,
    relativePath: f.path,
    size: f.size,
    lineCount: f.lineCount,
    extension: f.path.includes('.') ? '.' + (f.path.split('.').pop() || '') : '',
    lastModified: new Date(),
    isDirectory: false,
  }));
  const tree = buildFileSystemTreeFromFileInfoList(fileInfos, 'main');
  const builder = new CodeCityBuilderWithGrid();
  return builder.buildCityFromFileSystem(tree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    paddingInner: 1,
    paddingOuter: 3,
  });
}

// --- Commit history: a project being built over 20 commits ---

const commitHistory: Commit[] = [
  {
    hash: 'a1b2c3d',
    message: 'Initial project setup',
    author: 'alice',
    files: [
      { path: 'package.json', size: 800, lineCount: 30 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1200, lineCount: 40 },
    ],
  },
  {
    hash: 'e4f5g6h',
    message: 'Add entry point and app shell',
    author: 'alice',
    files: [
      { path: 'package.json', size: 800, lineCount: 30 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1200, lineCount: 40 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 1200, lineCount: 38 },
    ],
  },
  {
    hash: 'i7j8k9l',
    message: 'Add layout components',
    author: 'bob',
    files: [
      { path: 'package.json', size: 800, lineCount: 30 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1200, lineCount: 40 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
    ],
  },
  {
    hash: 'm0n1o2p',
    message: 'Add sidebar and navigation',
    author: 'bob',
    files: [
      { path: 'package.json', size: 800, lineCount: 30 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1200, lineCount: 40 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 1500, lineCount: 48 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
    ],
  },
  {
    hash: 'q3r4s5t',
    message: 'Add API client and types',
    author: 'alice',
    files: [
      { path: 'package.json', size: 900, lineCount: 33 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1200, lineCount: 40 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 1500, lineCount: 48 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1400, lineCount: 45 },
      { path: 'src/api/endpoints.ts', size: 1800, lineCount: 56 },
    ],
  },
  {
    hash: 'u6v7w8x',
    message: 'Add authentication hooks',
    author: 'alice',
    files: [
      { path: 'package.json', size: 900, lineCount: 33 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1200, lineCount: 40 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 1500, lineCount: 48 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1400, lineCount: 45 },
      { path: 'src/api/endpoints.ts', size: 1800, lineCount: 56 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
    ],
  },
  {
    hash: 'y9z0a1b',
    message: 'Add dashboard page',
    author: 'bob',
    files: [
      { path: 'package.json', size: 900, lineCount: 33 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1200, lineCount: 40 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1400, lineCount: 45 },
      { path: 'src/api/endpoints.ts', size: 1800, lineCount: 56 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/pages/Dashboard.tsx', size: 2800, lineCount: 88 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 1600, lineCount: 50 },
    ],
  },
  {
    hash: 'c2d3e4f',
    message: 'Add settings page',
    author: 'alice',
    files: [
      { path: 'package.json', size: 900, lineCount: 33 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1200, lineCount: 40 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1400, lineCount: 45 },
      { path: 'src/api/endpoints.ts', size: 1800, lineCount: 56 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/pages/Dashboard.tsx', size: 2800, lineCount: 88 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 1600, lineCount: 50 },
      { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 900, lineCount: 28 },
    ],
  },
  {
    hash: 'g5h6i7j',
    message: 'Add form components library',
    author: 'bob',
    files: [
      { path: 'package.json', size: 1000, lineCount: 36 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1500, lineCount: 50 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Input.tsx', size: 700, lineCount: 22 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1400, lineCount: 45 },
      { path: 'src/api/endpoints.ts', size: 1800, lineCount: 56 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/pages/Dashboard.tsx', size: 2800, lineCount: 88 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 1600, lineCount: 50 },
      { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 900, lineCount: 28 },
    ],
  },
  {
    hash: 'k8l9m0n',
    message: 'Add data fetching hooks',
    author: 'alice',
    files: [
      { path: 'package.json', size: 1000, lineCount: 36 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1500, lineCount: 50 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Input.tsx', size: 700, lineCount: 22 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1400, lineCount: 45 },
      { path: 'src/api/endpoints.ts', size: 1800, lineCount: 56 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1400, lineCount: 44 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 900, lineCount: 28 },
      { path: 'src/pages/Dashboard.tsx', size: 3200, lineCount: 100 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2000, lineCount: 62 },
      { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 900, lineCount: 28 },
    ],
  },
  {
    hash: 'o1p2q3r',
    message: 'Add user profile page',
    author: 'bob',
    files: [
      { path: 'package.json', size: 1000, lineCount: 36 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1500, lineCount: 50 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Input.tsx', size: 700, lineCount: 22 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 2400, lineCount: 75 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1400, lineCount: 44 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 900, lineCount: 28 },
      { path: 'src/pages/Dashboard.tsx', size: 3200, lineCount: 100 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2000, lineCount: 62 },
      { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 900, lineCount: 28 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
    ],
  },
  {
    hash: 's4t5u6v',
    message: 'Refactor: extract shared utils',
    author: 'alice',
    files: [
      { path: 'package.json', size: 1000, lineCount: 36 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1500, lineCount: 50 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Input.tsx', size: 700, lineCount: 22 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 2400, lineCount: 75 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1400, lineCount: 44 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/format.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/validate.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/storage.ts', size: 700, lineCount: 22 },
      { path: 'src/pages/Dashboard.tsx', size: 3200, lineCount: 100 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2000, lineCount: 62 },
      { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 900, lineCount: 28 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
    ],
  },
  {
    hash: 's4t5u6v2',
    message: 'Refactor: cleanup types and add comments',
    author: 'alice',
    files: [
      { path: 'package.json', size: 1000, lineCount: 36 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1800, lineCount: 60 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/Header.tsx', size: 1500, lineCount: 46 },
      { path: 'src/components/Footer.tsx', size: 1000, lineCount: 32 },
      { path: 'src/components/Layout.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/Sidebar.tsx', size: 1900, lineCount: 58 },
      { path: 'src/components/NavItem.tsx', size: 650, lineCount: 20 },
      { path: 'src/components/ui/Button.tsx', size: 850, lineCount: 27 },
      { path: 'src/components/ui/Input.tsx', size: 750, lineCount: 24 },
      { path: 'src/components/ui/Select.tsx', size: 950, lineCount: 30 },
      { path: 'src/components/ui/Modal.tsx', size: 1250, lineCount: 40 },
      { path: 'src/components/ui/Toast.tsx', size: 1050, lineCount: 34 },
      { path: 'src/api/client.ts', size: 2300, lineCount: 72 },
      { path: 'src/api/types.ts', size: 1700, lineCount: 55 },
      { path: 'src/api/endpoints.ts', size: 2500, lineCount: 78 },
      { path: 'src/hooks/useAuth.ts', size: 1250, lineCount: 40 },
      { path: 'src/hooks/useSession.ts', size: 850, lineCount: 26 },
      { path: 'src/hooks/useFetch.ts', size: 1500, lineCount: 48 },
      { path: 'src/hooks/useMutation.ts', size: 1150, lineCount: 36 },
      { path: 'src/hooks/useQuery.ts', size: 950, lineCount: 30 },
      { path: 'src/utils/format.ts', size: 1300, lineCount: 42 },
      { path: 'src/utils/validate.ts', size: 1000, lineCount: 32 },
      { path: 'src/utils/storage.ts', size: 750, lineCount: 24 },
      { path: 'src/pages/Dashboard.tsx', size: 3300, lineCount: 104 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1150, lineCount: 36 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2100, lineCount: 65 },
      { path: 'src/pages/Settings.tsx', size: 2300, lineCount: 72 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1450, lineCount: 46 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 950, lineCount: 30 },
      { path: 'src/pages/Profile.tsx', size: 1850, lineCount: 58 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1250, lineCount: 40 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1600, lineCount: 52 },
    ],
  },
  {
    hash: 'w7x8y9z',
    message: 'Add notification system',
    author: 'bob',
    files: [
      { path: 'package.json', size: 1100, lineCount: 40 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1500, lineCount: 50 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/Header.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Input.tsx', size: 700, lineCount: 22 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/notifications/NotificationProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/notifications/NotificationBell.tsx', size: 900, lineCount: 28 },
      { path: 'src/notifications/useNotifications.ts', size: 1100, lineCount: 34 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 2800, lineCount: 88 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1400, lineCount: 44 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/format.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/validate.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/storage.ts', size: 700, lineCount: 22 },
      { path: 'src/pages/Dashboard.tsx', size: 3200, lineCount: 100 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2000, lineCount: 62 },
      { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
    ],
  },
  {
    hash: 'a0b1c2d',
    message: 'Add search functionality',
    author: 'alice',
    files: [
      { path: 'package.json', size: 1200, lineCount: 44 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1500, lineCount: 50 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/Header.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Input.tsx', size: 700, lineCount: 22 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/components/SearchBar.tsx', size: 1400, lineCount: 44 },
      { path: 'src/components/SearchResults.tsx', size: 1600, lineCount: 50 },
      { path: 'src/notifications/NotificationProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/notifications/NotificationBell.tsx', size: 900, lineCount: 28 },
      { path: 'src/notifications/useNotifications.ts', size: 1100, lineCount: 34 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 3200, lineCount: 100 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1400, lineCount: 44 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 900, lineCount: 28 },
      { path: 'src/hooks/useSearch.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/format.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/validate.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/storage.ts', size: 700, lineCount: 22 },
      { path: 'src/pages/Dashboard.tsx', size: 3200, lineCount: 100 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2000, lineCount: 62 },
      { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
      { path: 'src/pages/Search.tsx', size: 1800, lineCount: 56 },
    ],
  },
  {
    hash: 'e3f4g5h',
    message: 'Add dark mode support',
    author: 'bob',
    files: [
      { path: 'package.json', size: 1200, lineCount: 44 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1800, lineCount: 60 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2400, lineCount: 75 },
      { path: 'src/components/Header.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Input.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/components/SearchBar.tsx', size: 1400, lineCount: 44 },
      { path: 'src/components/SearchResults.tsx', size: 1600, lineCount: 50 },
      { path: 'src/theme/ThemeProvider.tsx', size: 1200, lineCount: 38 },
      { path: 'src/theme/tokens.ts', size: 800, lineCount: 25 },
      { path: 'src/theme/dark.ts', size: 600, lineCount: 18 },
      { path: 'src/theme/light.ts', size: 600, lineCount: 18 },
      { path: 'src/notifications/NotificationProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/notifications/NotificationBell.tsx', size: 900, lineCount: 28 },
      { path: 'src/notifications/useNotifications.ts', size: 1100, lineCount: 34 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 3200, lineCount: 100 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1400, lineCount: 44 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 900, lineCount: 28 },
      { path: 'src/hooks/useSearch.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useTheme.ts', size: 700, lineCount: 22 },
      { path: 'src/utils/format.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/validate.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/storage.ts', size: 700, lineCount: 22 },
      { path: 'src/pages/Dashboard.tsx', size: 3200, lineCount: 100 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2000, lineCount: 62 },
      { path: 'src/pages/Settings.tsx', size: 2800, lineCount: 88 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Settings/ThemePicker.tsx', size: 1000, lineCount: 32 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
      { path: 'src/pages/Search.tsx', size: 1800, lineCount: 56 },
    ],
  },
  {
    hash: 'i6j7k8l',
    message: 'Add data visualization components',
    author: 'alice',
    files: [
      { path: 'package.json', size: 1400, lineCount: 50 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1800, lineCount: 60 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2400, lineCount: 75 },
      { path: 'src/components/Header.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Input.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/components/SearchBar.tsx', size: 1400, lineCount: 44 },
      { path: 'src/components/SearchResults.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/charts/LineChart.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/charts/BarChart.tsx', size: 1800, lineCount: 56 },
      { path: 'src/components/charts/PieChart.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/charts/ChartTooltip.tsx', size: 800, lineCount: 25 },
      { path: 'src/theme/ThemeProvider.tsx', size: 1200, lineCount: 38 },
      { path: 'src/theme/tokens.ts', size: 800, lineCount: 25 },
      { path: 'src/theme/dark.ts', size: 600, lineCount: 18 },
      { path: 'src/theme/light.ts', size: 600, lineCount: 18 },
      { path: 'src/notifications/NotificationProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/notifications/NotificationBell.tsx', size: 900, lineCount: 28 },
      { path: 'src/notifications/useNotifications.ts', size: 1100, lineCount: 34 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 3200, lineCount: 100 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1400, lineCount: 44 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 900, lineCount: 28 },
      { path: 'src/hooks/useSearch.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useTheme.ts', size: 700, lineCount: 22 },
      { path: 'src/utils/format.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/validate.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/storage.ts', size: 700, lineCount: 22 },
      { path: 'src/pages/Dashboard.tsx', size: 3800, lineCount: 120 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2600, lineCount: 82 },
      { path: 'src/pages/Settings.tsx', size: 2800, lineCount: 88 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Settings/ThemePicker.tsx', size: 1000, lineCount: 32 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
      { path: 'src/pages/Search.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Analytics.tsx', size: 2200, lineCount: 68 },
    ],
  },
  {
    hash: 'm9n0o1p',
    message: 'Add export and reporting',
    author: 'bob',
    files: [
      { path: 'package.json', size: 1400, lineCount: 50 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1800, lineCount: 60 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2400, lineCount: 75 },
      { path: 'src/components/Header.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Input.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/components/SearchBar.tsx', size: 1400, lineCount: 44 },
      { path: 'src/components/SearchResults.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/charts/LineChart.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/charts/BarChart.tsx', size: 1800, lineCount: 56 },
      { path: 'src/components/charts/PieChart.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/charts/ChartTooltip.tsx', size: 800, lineCount: 25 },
      { path: 'src/export/CSVExporter.ts', size: 1400, lineCount: 44 },
      { path: 'src/export/PDFReport.ts', size: 2200, lineCount: 68 },
      { path: 'src/export/ReportBuilder.ts', size: 1800, lineCount: 56 },
      { path: 'src/theme/ThemeProvider.tsx', size: 1200, lineCount: 38 },
      { path: 'src/theme/tokens.ts', size: 800, lineCount: 25 },
      { path: 'src/theme/dark.ts', size: 600, lineCount: 18 },
      { path: 'src/theme/light.ts', size: 600, lineCount: 18 },
      { path: 'src/notifications/NotificationProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/notifications/NotificationBell.tsx', size: 900, lineCount: 28 },
      { path: 'src/notifications/useNotifications.ts', size: 1100, lineCount: 34 },
      { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 3200, lineCount: 100 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1400, lineCount: 44 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 900, lineCount: 28 },
      { path: 'src/hooks/useSearch.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useTheme.ts', size: 700, lineCount: 22 },
      { path: 'src/utils/format.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/validate.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/storage.ts', size: 700, lineCount: 22 },
      { path: 'src/pages/Dashboard.tsx', size: 3800, lineCount: 120 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2600, lineCount: 82 },
      { path: 'src/pages/Settings.tsx', size: 2800, lineCount: 88 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Settings/ThemePicker.tsx', size: 1000, lineCount: 32 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
      { path: 'src/pages/Search.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Analytics.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Reports.tsx', size: 1600, lineCount: 50 },
    ],
  },
  {
    hash: 'q2r3s4t',
    message: 'Performance: add caching layer',
    author: 'alice',
    files: [
      { path: 'package.json', size: 1400, lineCount: 50 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 1800, lineCount: 60 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2400, lineCount: 75 },
      { path: 'src/components/Header.tsx', size: 2000, lineCount: 62 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Input.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/components/SearchBar.tsx', size: 1400, lineCount: 44 },
      { path: 'src/components/SearchResults.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/charts/LineChart.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/charts/BarChart.tsx', size: 1800, lineCount: 56 },
      { path: 'src/components/charts/PieChart.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/charts/ChartTooltip.tsx', size: 800, lineCount: 25 },
      { path: 'src/cache/CacheProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/cache/useCache.ts', size: 1100, lineCount: 34 },
      { path: 'src/cache/invalidate.ts', size: 800, lineCount: 25 },
      { path: 'src/export/CSVExporter.ts', size: 1400, lineCount: 44 },
      { path: 'src/export/PDFReport.ts', size: 2200, lineCount: 68 },
      { path: 'src/export/ReportBuilder.ts', size: 1800, lineCount: 56 },
      { path: 'src/theme/ThemeProvider.tsx', size: 1200, lineCount: 38 },
      { path: 'src/theme/tokens.ts', size: 800, lineCount: 25 },
      { path: 'src/theme/dark.ts', size: 600, lineCount: 18 },
      { path: 'src/theme/light.ts', size: 600, lineCount: 18 },
      { path: 'src/notifications/NotificationProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/notifications/NotificationBell.tsx', size: 900, lineCount: 28 },
      { path: 'src/notifications/useNotifications.ts', size: 1100, lineCount: 34 },
      { path: 'src/api/client.ts', size: 2800, lineCount: 88 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 3200, lineCount: 100 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1800, lineCount: 56 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSearch.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useTheme.ts', size: 700, lineCount: 22 },
      { path: 'src/utils/format.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/validate.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/storage.ts', size: 700, lineCount: 22 },
      { path: 'src/pages/Dashboard.tsx', size: 3800, lineCount: 120 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2600, lineCount: 82 },
      { path: 'src/pages/Settings.tsx', size: 2800, lineCount: 88 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Settings/ThemePicker.tsx', size: 1000, lineCount: 32 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
      { path: 'src/pages/Search.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Analytics.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Reports.tsx', size: 1600, lineCount: 50 },
    ],
  },
  {
    hash: 'u5v6w7x',
    message: 'Add i18n support',
    author: 'bob',
    files: [
      { path: 'package.json', size: 1500, lineCount: 54 },
      { path: 'tsconfig.json', size: 600, lineCount: 22 },
      { path: 'README.md', size: 2000, lineCount: 65 },
      { path: 'src/index.ts', size: 400, lineCount: 12 },
      { path: 'src/App.tsx', size: 2600, lineCount: 82 },
      { path: 'src/components/Header.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
      { path: 'src/components/Sidebar.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/NavItem.tsx', size: 600, lineCount: 18 },
      { path: 'src/components/ui/Button.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Input.tsx', size: 800, lineCount: 25 },
      { path: 'src/components/ui/Select.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/ui/Modal.tsx', size: 1200, lineCount: 38 },
      { path: 'src/components/ui/Toast.tsx', size: 1000, lineCount: 32 },
      { path: 'src/components/SearchBar.tsx', size: 1400, lineCount: 44 },
      { path: 'src/components/SearchResults.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/charts/LineChart.tsx', size: 2200, lineCount: 68 },
      { path: 'src/components/charts/BarChart.tsx', size: 1800, lineCount: 56 },
      { path: 'src/components/charts/PieChart.tsx', size: 1600, lineCount: 50 },
      { path: 'src/components/charts/ChartTooltip.tsx', size: 800, lineCount: 25 },
      { path: 'src/i18n/Provider.tsx', size: 1200, lineCount: 38 },
      { path: 'src/i18n/useTranslation.ts', size: 800, lineCount: 25 },
      { path: 'src/i18n/locales/en.json', size: 2400, lineCount: 80 },
      { path: 'src/i18n/locales/es.json', size: 2600, lineCount: 85 },
      { path: 'src/i18n/locales/fr.json', size: 2600, lineCount: 85 },
      { path: 'src/cache/CacheProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/cache/useCache.ts', size: 1100, lineCount: 34 },
      { path: 'src/cache/invalidate.ts', size: 800, lineCount: 25 },
      { path: 'src/export/CSVExporter.ts', size: 1400, lineCount: 44 },
      { path: 'src/export/PDFReport.ts', size: 2200, lineCount: 68 },
      { path: 'src/export/ReportBuilder.ts', size: 1800, lineCount: 56 },
      { path: 'src/theme/ThemeProvider.tsx', size: 1200, lineCount: 38 },
      { path: 'src/theme/tokens.ts', size: 800, lineCount: 25 },
      { path: 'src/theme/dark.ts', size: 600, lineCount: 18 },
      { path: 'src/theme/light.ts', size: 600, lineCount: 18 },
      { path: 'src/notifications/NotificationProvider.tsx', size: 1400, lineCount: 44 },
      { path: 'src/notifications/NotificationBell.tsx', size: 900, lineCount: 28 },
      { path: 'src/notifications/useNotifications.ts', size: 1100, lineCount: 34 },
      { path: 'src/api/client.ts', size: 2800, lineCount: 88 },
      { path: 'src/api/types.ts', size: 1600, lineCount: 52 },
      { path: 'src/api/endpoints.ts', size: 3200, lineCount: 100 },
      { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSession.ts', size: 800, lineCount: 24 },
      { path: 'src/hooks/useFetch.ts', size: 1800, lineCount: 56 },
      { path: 'src/hooks/useMutation.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useQuery.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useSearch.ts', size: 1200, lineCount: 38 },
      { path: 'src/hooks/useTheme.ts', size: 700, lineCount: 22 },
      { path: 'src/utils/format.ts', size: 1200, lineCount: 38 },
      { path: 'src/utils/validate.ts', size: 900, lineCount: 28 },
      { path: 'src/utils/storage.ts', size: 700, lineCount: 22 },
      { path: 'src/pages/Dashboard.tsx', size: 3800, lineCount: 120 },
      { path: 'src/pages/Dashboard/StatsCard.tsx', size: 1100, lineCount: 34 },
      { path: 'src/pages/Dashboard/Chart.tsx', size: 2600, lineCount: 82 },
      { path: 'src/pages/Settings.tsx', size: 2800, lineCount: 88 },
      { path: 'src/pages/Settings/ProfileForm.tsx', size: 1400, lineCount: 44 },
      { path: 'src/pages/Settings/NotificationPrefs.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Settings/ThemePicker.tsx', size: 1000, lineCount: 32 },
      { path: 'src/pages/Profile.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Profile/AvatarUpload.tsx', size: 1200, lineCount: 38 },
      { path: 'src/pages/Profile/ActivityFeed.tsx', size: 1500, lineCount: 48 },
      { path: 'src/pages/Search.tsx', size: 1800, lineCount: 56 },
      { path: 'src/pages/Analytics.tsx', size: 2200, lineCount: 68 },
      { path: 'src/pages/Reports.tsx', size: 1600, lineCount: 50 },
    ],
  },
];

// --- Story template ---

const TimelapseTemplate: React.FC = () => {
  const [commitIndex, setCommitIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);

  const transitionDuration = 1200; // ms per transition (split across stages)
  const pauseDuration = 600; // ms pause between commits

  const currentCommit = commitHistory[commitIndex];

  // Build city data for current commit
  const currentCityData = useMemo(
    () => buildCity(currentCommit.files),
    [commitIndex],
  );

  // Cache the previous city data so we interpolate from it, not from the new state
  const fromCityDataRef = useRef(currentCityData);
  const fromCityData = fromCityDataRef.current;

  // When commitIndex changes, snapshot the current "from" before it updates
  useEffect(() => {
    // On mount or when commit changes, the ref holds the previous render's city data
    // After this effect, the next commitIndex change will snapshot again
  }, [commitIndex]);

  // Diff for transition (from cached previous → current)
  const diff = useMemo(() => diffCityData(fromCityData, currentCityData), [fromCityData, currentCityData]);

  // Each stage gets full duration, so total = perStageDuration * stageCount
  const stageCount = useMemo(() => {
    const hasRemovals = diff.removedCount > 0;
    const hasMoves = diff.movedCount > 0;
    const hasAdds = diff.addedCount > 0;
    const hasAddedDistricts = diff.districts.some(d => d.changeType === 'added');
    const splitAdd = hasAdds && hasAddedDistricts;
    return (hasRemovals ? 1 : 0) + (hasMoves ? 1 : 0) + (splitAdd ? 2 : (hasAdds ? 1 : 0));
  }, [diff]);
  const effectiveTransitionDuration = transitionDuration * stageCount;

  // Interpolated city data during transition
  const { displayCityData, districtAppearingProgress } = useMemo(() => {
    if (transitionProgress === 0) {
      return { displayCityData: fromCityData, districtAppearingProgress: {} };
    }
    const interpolated = interpolateCityData(diff, transitionProgress, currentCityData);
    const appearing: Record<string, number> = {};
    for (const d of interpolated.districts) {
      if (d.appearingProgress !== undefined && d.appearingProgress > 0) {
        appearing[d.path] = d.appearingProgress;
      }
    }
    return {
      displayCityData: {
        buildings: interpolated.buildings
          .filter(b => b.opacity > 0.01)
          .map(b => ({
            path: b.path,
            position: b.position,
            dimensions: b.dimensions,
            type: 'file' as const,
            color: b.color,
            fileExtension: b.fileExtension,
            size: b.size,
            lineCount: b.lineCount,
          })),
        districts: interpolated.districts
          .filter(d => d.opacity > 0.01)
          .map(d => ({
            path: d.path,
            worldBounds: d.worldBounds,
            type: 'directory' as const,
            fileCount: d.fileCount ?? 0,
            label: d.label,
          })),
        bounds: currentCityData.bounds,
        metadata: currentCityData.metadata,
      },
      districtAppearingProgress: appearing,
    };
  }, [diff, fromCityData, currentCityData, transitionProgress]);

  // Compute modified files from commit diff (includes new files)
  const modifiedFilesMemo = useMemo(() => {
    if (commitIndex === 0) return undefined;
    const prevCommit = commitHistory[commitIndex - 1];
    const currCommit = commitHistory[commitIndex];
    const prevMap = new Map(prevCommit.files.map(f => [f.path, f]));
    const result: Record<string, { lineDelta: number }> = {};
    for (const file of currCommit.files) {
      const prevFile = prevMap.get(file.path);
      if (!prevFile) {
        // New file — include with full line count
        result[file.path] = { lineDelta: file.lineCount };
      } else if (prevFile.lineCount !== file.lineCount) {
        result[file.path] = { lineDelta: file.lineCount - prevFile.lineCount };
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }, [commitIndex]);

  // Always keep modifiedFiles in sync with the current commit.
  // The gray base state in InstancedBuildings means isolation targets can
  // update immediately — buildings start gray and only highlighted files
  // brighten, so there's no flash from showing new targets with old city data.
  const modifiedFiles = modifiedFilesMemo;

  // When transition completes, update the "from" snapshot to the current state
  useEffect(() => {
    if (transitionProgress >= 1) {
      fromCityDataRef.current = currentCityData;
    }
  }, [transitionProgress, currentCityData]);

  // Auto-play animation
  const playNextCommit = useCallback(() => {
    if (!isPlayingRef.current) return;
    if (commitIndex >= commitHistory.length - 1) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    // Start transition
    startTimeRef.current = null;
    const animate = (timestamp: number) => {
      if (!isPlayingRef.current) return;
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;

      if (elapsed < effectiveTransitionDuration) {
        setTransitionProgress(elapsed / effectiveTransitionDuration);
        animFrameRef.current = requestAnimationFrame(animate);
      } else if (elapsed < effectiveTransitionDuration + pauseDuration) {
        setTransitionProgress(1);
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setTransitionProgress(0);
        setCommitIndex(prev => prev + 1);
        startTimeRef.current = null;
        timeoutRef.current = setTimeout(() => {
          if (isPlayingRef.current) {
            animFrameRef.current = requestAnimationFrame(animate);
          }
        }, 50);
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [commitIndex]);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      // Stop
      isPlayingRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
      setTransitionProgress(0);
    } else {
      // If at the end, restart
      if (commitIndex >= commitHistory.length - 1) {
        setCommitIndex(0);
        setTransitionProgress(0);
      }
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, [isPlaying, commitIndex]);

  // Trigger next commit when playing
  useEffect(() => {
    if (isPlaying) {
      playNextCommit();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPlaying, commitIndex, playNextCommit]);

  // Manual step controls
  const goToPrev = useCallback(() => {
    if (commitIndex > 0) {
      setTransitionProgress(0);
      setCommitIndex(prev => prev - 1);
    }
  }, [commitIndex]);

  const goToNext = useCallback(() => {
    if (commitIndex < commitHistory.length - 1) {
      setTransitionProgress(0);
      setCommitIndex(prev => prev + 1);
    }
  }, [commitIndex]);

  const diffSummary = diff
    ? `+${diff.addedCount} -${diff.removedCount} ~${diff.movedCount}`
    : 'initial';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 3D City */}
      <FileCity3D
        cityData={displayCityData}
        height="100%"
        heightScaling="linear"
        linearScale={0.5}
        isGrown={false}
        showControls={false}
        districtAppearingProgress={districtAppearingProgress}
        modifiedFiles={modifiedFiles}
        transitionProgress={transitionProgress}
        isolationMode="collapse"
      />

      {/* Commit info - top */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '12px 16px',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Commit icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {commitIndex + 1}/{commitHistory.length}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{currentCommit.message}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
            <span style={{ color: '#3b82f6' }}>{currentCommit.hash}</span>
            {' '}&middot;{' '}
            {currentCommit.author} &middot;{' '}
            <span style={{ color: '#94a3b8' }}>{currentCommit.files.length} files</span>
            {' '}&middot;{' '}
            <span style={{ color: '#22c55e' }}>{diffSummary}</span>
          </div>
        </div>

        {/* File count badge */}
        <div
          style={{
            padding: '4px 10px',
            background: '#1e293b',
            borderRadius: 12,
            fontSize: 12,
            color: '#94a3b8',
            flexShrink: 0,
          }}
        >
          {currentCommit.files.length} files
        </div>
      </div>

      {/* Timeline controls - bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '16px 20px',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          {commitHistory.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= commitIndex ? '#3b82f6' : '#334155',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={goToPrev}
            disabled={commitIndex === 0 || isPlaying}
            style={{
              padding: '8px 16px',
              background: commitIndex === 0 || isPlaying ? '#1e293b' : '#334155',
              border: '1px solid #475569',
              borderRadius: 6,
              color: commitIndex === 0 || isPlaying ? '#475569' : '#e2e8f0',
              cursor: commitIndex === 0 || isPlaying ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            Prev
          </button>

          <button
            onClick={handlePlay}
            style={{
              padding: '8px 24px',
              background: isPlaying ? '#ef4444' : '#22c55e',
              border: '1px solid transparent',
              borderRadius: 6,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {isPlaying ? 'Stop' : commitIndex >= commitHistory.length - 1 ? 'Replay' : 'Play'}
          </button>

          <button
            onClick={goToNext}
            disabled={commitIndex >= commitHistory.length - 1 || isPlaying}
            style={{
              padding: '8px 16px',
              background: commitIndex >= commitHistory.length - 1 || isPlaying ? '#1e293b' : '#334155',
              border: '1px solid #475569',
              borderRadius: 6,
              color: commitIndex >= commitHistory.length - 1 || isPlaying ? '#475569' : '#e2e8f0',
              cursor: commitIndex >= commitHistory.length - 1 || isPlaying ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            Next
          </button>

          {/* Commit slider */}
          <input
            type="range"
            min={0}
            max={commitHistory.length - 1}
            value={commitIndex}
            onChange={e => {
              if (!isPlaying) {
                setTransitionProgress(0);
                setCommitIndex(Number(e.target.value));
              }
            }}
            disabled={isPlaying}
            style={{
              flex: 1,
              marginLeft: 8,
              height: 6,
              appearance: 'none',
              background: '#334155',
              borderRadius: 3,
              outline: 'none',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Watch a project grow over 20 commits.
 * Files appear, directories form, and the city evolves with each commit.
 * Use Play to auto-advance, or step through manually with Prev/Next.
 */
export const ProjectTimelapse: Story = {
  render: () => <TimelapseTemplate />,
};
