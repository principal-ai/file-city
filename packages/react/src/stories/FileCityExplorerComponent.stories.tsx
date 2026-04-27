import type { Meta, StoryObj } from '@storybook/react';

import { FileCityExplorer, type ProjectArea } from '../components/FileCityExplorer';
import type { CityData } from '../components/FileCity3D';

import electronAppCityData from '../../../../assets/electron-app-city-data.json';

/**
 * Side-by-side test of the extracted `<FileCityExplorer>` component against
 * the original story-template implementation in
 * `FileCityExplorer.stories.tsx`. The two should look and behave identically;
 * differences indicate regressions in the extraction.
 *
 * Persistence is intentionally namespaced to a separate `localStorage` key
 * (`file-city.scope-overlay-component`) so the two stories don't fight over
 * the same scopes/areas state.
 */

const meta: Meta<typeof FileCityExplorer> = {
  title: 'Experiments/FileCityExplorer (Component)',
  component: FileCityExplorer,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FileCityExplorer>;

const DEFAULT_AREAS: ProjectArea[] = [
  {
    name: 'Documentation',
    description: 'Project docs, READMEs, and design notes — not OTEL-instrumented.',
    paths: ['docs'],
  },
  {
    name: 'Build & tooling',
    description: 'Build scripts, bundler config, and developer tooling.',
    paths: ['scripts', 'build'],
  },
];

export const Default: Story = {
  render: () => (
    <FileCityExplorer
      cityData={electronAppCityData as CityData}
      packageRoot="electron-app/"
      initialAreas={DEFAULT_AREAS}
      persistKey="file-city.scope-overlay-component"
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Extracted `<FileCityExplorer>` component over the electron-app city. ' +
          'Should behave identically to the original story (FileCityExplorer / Default).',
      },
    },
  },
};
