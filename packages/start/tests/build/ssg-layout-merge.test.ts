/**
 * Test module for SSG layout state/actions/lifecycle merge functionality.
 *
 * Coverage:
 * - Layout state merging into page state
 * - Layout actions merging into page actions
 * - Layout lifecycle merging into page lifecycle
 * - Page values take precedence over layout values
 * - Nested layout merge order (Page > Inner > Outer)
 *
 * Bug context:
 * - build/index.ts processLayouts() only merges the view from layouts
 * - state, actions, and lifecycle from layouts are ignored
 * - Result: onClick handlers don't work because actions are empty
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ==================== Test Fixtures ====================

const TEST_DIR_PREFIX = 'constela-ssg-layout-merge-test-';

async function createTempDir(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const dir = join(tmpdir(), TEST_DIR_PREFIX + timestamp + '-' + random);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Layout with state, actions, and lifecycle
 */
const layoutWithStateActionsLifecycle = {
  version: '1.0',
  type: 'layout',
  state: {
    theme: { initial: 'dark' },
    sidebarOpen: { initial: false },
  },
  actions: [
    {
      name: 'toggleTheme',
      steps: [
        {
          op: 'set',
          name: 'theme',
          value: {
            expr: 'cond',
            test: { expr: 'bin', op: '===', left: { expr: 'state', name: 'theme' }, right: { expr: 'lit', value: 'dark' } },
            then: { expr: 'lit', value: 'light' },
            else: { expr: 'lit', value: 'dark' },
          },
        },
      ],
    },
    {
      name: 'toggleSidebar',
      steps: [
        {
          op: 'set',
          name: 'sidebarOpen',
          value: { expr: 'un', op: '!', arg: { expr: 'state', name: 'sidebarOpen' } },
        },
      ],
    },
  ],
  lifecycle: {
    onMount: 'loadTheme',
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: {
      class: { expr: 'lit', value: 'layout-wrapper' },
    },
    children: [
      {
        kind: 'element',
        tag: 'header',
        props: {},
        children: [
          {
            kind: 'element',
            tag: 'button',
            props: {
              onClick: { event: 'click', action: 'toggleTheme' },
              class: { expr: 'lit', value: 'theme-toggle' },
            },
            children: [
              {
                kind: 'text',
                value: { expr: 'lit', value: 'Toggle Theme' },
              },
            ],
          },
        ],
      },
      { kind: 'slot' },
    ],
  },
};

/**
 * Page with no state, actions, or lifecycle (should inherit from layout)
 */
const pageWithNoStateActionsLifecycle = {
  version: '1.0',
  route: {
    path: '/test-inherit',
    layout: 'main-layout',
  },
  view: {
    kind: 'element',
    tag: 'main',
    props: {},
    children: [
      {
        kind: 'text',
        value: { expr: 'lit', value: 'Page content' },
      },
    ],
  },
};

/**
 * Page with its own state, actions, and lifecycle (should override layout)
 */
const pageWithOwnStateActionsLifecycle = {
  version: '1.0',
  route: {
    path: '/test-override',
    layout: 'main-layout',
  },
  state: {
    theme: { initial: 'light' }, // Override layout's 'dark'
    count: { initial: 0 }, // Page-specific state
  },
  actions: [
    {
      name: 'increment',
      steps: [
        {
          op: 'set',
          name: 'count',
          value: { expr: 'bin', op: '+', left: { expr: 'state', name: 'count' }, right: { expr: 'lit', value: 1 } },
        },
      ],
    },
    {
      name: 'toggleTheme', // Override layout's toggleTheme
      steps: [
        {
          op: 'set',
          name: 'theme',
          value: { expr: 'lit', value: 'custom' },
        },
      ],
    },
  ],
  lifecycle: {
    onMount: 'initCounter', // Override layout's onMount
    onUnmount: 'cleanup', // Page-specific lifecycle
  },
  view: {
    kind: 'element',
    tag: 'main',
    props: {},
    children: [
      {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: { event: 'click', action: 'increment' },
        },
        children: [
          {
            kind: 'text',
            value: { expr: 'lit', value: 'Increment' },
          },
        ],
      },
    ],
  },
};

/**
 * Outer layout with its own state and actions
 */
const outerLayout = {
  version: '1.0',
  type: 'layout',
  state: {
    outerState: { initial: 'outer-value' },
    sharedState: { initial: 'from-outer' },
  },
  actions: [
    {
      name: 'outerAction',
      steps: [],
    },
    {
      name: 'sharedAction',
      steps: [{ op: 'set', name: 'sharedState', value: { expr: 'lit', value: 'outer-called' } }],
    },
  ],
  lifecycle: {
    onMount: 'outerMount',
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'outer-layout' } },
    children: [{ kind: 'slot' }],
  },
};

/**
 * Inner layout that extends outer layout
 */
const innerLayout = {
  version: '1.0',
  type: 'layout',
  layout: 'outer-layout', // Nested layout
  state: {
    innerState: { initial: 'inner-value' },
    sharedState: { initial: 'from-inner' }, // Override outer's sharedState
  },
  actions: [
    {
      name: 'innerAction',
      steps: [],
    },
    {
      name: 'sharedAction', // Override outer's sharedAction
      steps: [{ op: 'set', name: 'sharedState', value: { expr: 'lit', value: 'inner-called' } }],
    },
  ],
  lifecycle: {
    onMount: 'innerMount', // Override outer's onMount
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'inner-layout' } },
    children: [{ kind: 'slot' }],
  },
};

/**
 * Page using nested layout
 */
const pageWithNestedLayout = {
  version: '1.0',
  route: {
    path: '/test-nested',
    layout: 'inner-layout',
  },
  state: {
    pageState: { initial: 'page-value' },
    sharedState: { initial: 'from-page' }, // Override inner's sharedState
  },
  actions: [
    {
      name: 'pageAction',
      steps: [],
    },
    {
      name: 'sharedAction', // Override inner's sharedAction
      steps: [{ op: 'set', name: 'sharedState', value: { expr: 'lit', value: 'page-called' } }],
    },
  ],
  lifecycle: {
    onMount: 'pageMount', // Override inner's onMount
  },
  view: {
    kind: 'element',
    tag: 'main',
    props: {},
    children: [
      {
        kind: 'text',
        value: { expr: 'lit', value: 'Nested page content' },
      },
    ],
  },
};

/**
 * Layout with only state (no actions/lifecycle)
 */
const layoutWithOnlyState = {
  version: '1.0',
  type: 'layout',
  state: {
    layoutOnlyState: { initial: 'layout-state' },
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'state-only-layout' } },
    children: [{ kind: 'slot' }],
  },
};

/**
 * Layout with only actions (no state/lifecycle)
 */
const layoutWithOnlyActions = {
  version: '1.0',
  type: 'layout',
  actions: [
    {
      name: 'layoutOnlyAction',
      steps: [],
    },
  ],
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'actions-only-layout' } },
    children: [{ kind: 'slot' }],
  },
};

/**
 * Layout with only lifecycle (no state/actions)
 */
const layoutWithOnlyLifecycle = {
  version: '1.0',
  type: 'layout',
  lifecycle: {
    onMount: 'layoutOnlyMount',
    onUnmount: 'layoutOnlyUnmount',
  },
  view: {
    kind: 'element',
    tag: 'div',
    props: { class: { expr: 'lit', value: 'lifecycle-only-layout' } },
    children: [{ kind: 'slot' }],
  },
};

/**
 * Page with no state/actions/lifecycle for testing individual merges
 */
const emptyPage = {
  version: '1.0',
  route: {
    path: '/empty-page',
    layout: 'test-layout',
  },
  view: {
    kind: 'element',
    tag: 'main',
    props: {},
    children: [
      {
        kind: 'text',
        value: { expr: 'lit', value: 'Empty page' },
      },
    ],
  },
};

// ==================== SSG Layout Merge Tests ====================

describe('SSG layout state/actions/lifecycle merge', () => {
  let tempDir: string;
  let outDir: string;
  let routesDir: string;
  let layoutsDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    outDir = join(tempDir, 'dist');
    routesDir = join(tempDir, 'src', 'routes');
    layoutsDir = join(tempDir, 'src', 'layouts');

    // Create directories
    await mkdir(outDir, { recursive: true });
    await mkdir(routesDir, { recursive: true });
    await mkdir(layoutsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ==================== State Merge Tests ====================

  describe('layout state merge', () => {
    it('should merge layout state into page when page has no state', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'test-layout.json'),
        JSON.stringify(layoutWithOnlyState, null, 2)
      );
      await writeFile(
        join(routesDir, 'empty-page.json'),
        JSON.stringify(emptyPage, null, 2)
      );

      // Act
      const result = await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      // The generated page should include layout's state
      // Check the generated HTML contains the hydration data with state
      const htmlPath = join(outDir, 'empty-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The hydration program should contain the merged state
      // Look for the state in the hydration script
      expect(htmlContent).toContain('layoutOnlyState');
    });

    it('should preserve page state when layout has no state', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      const layoutWithNoState = {
        version: '1.0',
        type: 'layout',
        view: {
          kind: 'element',
          tag: 'div',
          props: {},
          children: [{ kind: 'slot' }],
        },
      };
      const pageWithState = {
        ...emptyPage,
        state: {
          pageState: { initial: 'page-value' },
        },
      };
      await writeFile(
        join(layoutsDir, 'test-layout.json'),
        JSON.stringify(layoutWithNoState, null, 2)
      );
      await writeFile(
        join(routesDir, 'empty-page.json'),
        JSON.stringify(pageWithState, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'empty-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      expect(htmlContent).toContain('pageState');
    });

    it('should give page state precedence over layout state for same keys', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'main-layout.json'),
        JSON.stringify(layoutWithStateActionsLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-override.json'),
        JSON.stringify(pageWithOwnStateActionsLifecycle, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-override', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The page's theme should be 'light', not layout's 'dark'
      // This checks that page state takes precedence
      // The hydration data should contain 'light' for theme initial value
      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      expect(programData.state.theme.initial).toBe('light');
    });

    it('should merge layout and page state with page taking precedence', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'main-layout.json'),
        JSON.stringify(layoutWithStateActionsLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-override.json'),
        JSON.stringify(pageWithOwnStateActionsLifecycle, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-override', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      
      // Should have layout's sidebarOpen (not overridden by page)
      expect(programData.state.sidebarOpen).toBeDefined();
      
      // Should have page's count (page-specific)
      expect(programData.state.count).toBeDefined();
      
      // Should have page's theme (overrides layout's theme)
      expect(programData.state.theme.initial).toBe('light');
    });
  });

  // ==================== Actions Merge Tests ====================

  describe('layout actions merge', () => {
    it('should merge layout actions into page when page has no actions', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'test-layout.json'),
        JSON.stringify(layoutWithOnlyActions, null, 2)
      );
      await writeFile(
        join(routesDir, 'empty-page.json'),
        JSON.stringify(emptyPage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'empty-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The hydration program should contain the layout's actions
      expect(htmlContent).toContain('layoutOnlyAction');
    });

    it('should give page actions precedence over layout actions for same names', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'main-layout.json'),
        JSON.stringify(layoutWithStateActionsLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-override.json'),
        JSON.stringify(pageWithOwnStateActionsLifecycle, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-override', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      
      // Find toggleTheme action - should be page's version (sets to 'custom')
      // Actions are stored as Record<string, CompiledAction> with 'steps' instead of 'body'
      const toggleThemeAction = programData.actions.toggleTheme;
      expect(toggleThemeAction).toBeDefined();
      // Page's toggleTheme sets to 'custom', layout's does conditional toggle
      expect(toggleThemeAction.steps[0].value.expr).toBe('lit');
      expect(toggleThemeAction.steps[0].value.value).toBe('custom');
    });

    it('should include both layout and page actions in merged result', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'main-layout.json'),
        JSON.stringify(layoutWithStateActionsLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-override.json'),
        JSON.stringify(pageWithOwnStateActionsLifecycle, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-override', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      // Actions are stored as Record<string, CompiledAction>
      const actionNames = Object.keys(programData.actions);

      // Should have layout's toggleSidebar (not overridden)
      expect(actionNames).toContain('toggleSidebar');

      // Should have page's increment (page-specific)
      expect(actionNames).toContain('increment');

      // Should have toggleTheme (page's version overrides layout's)
      expect(actionNames).toContain('toggleTheme');
    });
  });

  // ==================== Lifecycle Merge Tests ====================

  describe('layout lifecycle merge', () => {
    it('should merge layout lifecycle into page when page has no lifecycle', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'test-layout.json'),
        JSON.stringify(layoutWithOnlyLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'empty-page.json'),
        JSON.stringify(emptyPage, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'empty-page', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The hydration program should contain the layout's lifecycle
      expect(htmlContent).toContain('layoutOnlyMount');
      expect(htmlContent).toContain('layoutOnlyUnmount');
    });

    it('should give page lifecycle precedence over layout lifecycle for same hooks', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'main-layout.json'),
        JSON.stringify(layoutWithStateActionsLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-override.json'),
        JSON.stringify(pageWithOwnStateActionsLifecycle, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-override', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      
      // Page's onMount should override layout's
      expect(programData.lifecycle.onMount).toBe('initCounter');
      
      // Page's onUnmount should be present (page-specific)
      expect(programData.lifecycle.onUnmount).toBe('cleanup');
    });

    it('should merge layout and page lifecycle hooks', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      // Layout has onMount: 'loadTheme' and onUnmount is undefined
      // Page has onMount: 'initCounter' (overrides) and onUnmount: 'cleanup' (new)
      await writeFile(
        join(layoutsDir, 'main-layout.json'),
        JSON.stringify(layoutWithStateActionsLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-override.json'),
        JSON.stringify(pageWithOwnStateActionsLifecycle, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-override', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      
      // onMount should be page's (overrides layout's 'loadTheme')
      expect(programData.lifecycle.onMount).toBe('initCounter');
      
      // onUnmount should be page's (layout doesn't have it)
      expect(programData.lifecycle.onUnmount).toBe('cleanup');
    });
  });

  // ==================== Nested Layout Merge Tests ====================

  describe('nested layout merge precedence', () => {
    it('should merge all states from nested layouts with correct precedence (Page > Inner > Outer)', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'outer-layout.json'),
        JSON.stringify(outerLayout, null, 2)
      );
      await writeFile(
        join(layoutsDir, 'inner-layout.json'),
        JSON.stringify(innerLayout, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-nested.json'),
        JSON.stringify(pageWithNestedLayout, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-nested', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      
      // outerState should come from outer layout
      expect(programData.state.outerState).toBeDefined();
      expect(programData.state.outerState.initial).toBe('outer-value');
      
      // innerState should come from inner layout
      expect(programData.state.innerState).toBeDefined();
      expect(programData.state.innerState.initial).toBe('inner-value');
      
      // pageState should come from page
      expect(programData.state.pageState).toBeDefined();
      expect(programData.state.pageState.initial).toBe('page-value');
      
      // sharedState should be page's value (Page > Inner > Outer)
      expect(programData.state.sharedState).toBeDefined();
      expect(programData.state.sharedState.initial).toBe('from-page');
    });

    it('should merge all actions from nested layouts with correct precedence', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'outer-layout.json'),
        JSON.stringify(outerLayout, null, 2)
      );
      await writeFile(
        join(layoutsDir, 'inner-layout.json'),
        JSON.stringify(innerLayout, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-nested.json'),
        JSON.stringify(pageWithNestedLayout, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-nested', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      // Actions are stored as Record<string, CompiledAction>
      const actionNames = Object.keys(programData.actions);

      // outerAction should come from outer layout
      expect(actionNames).toContain('outerAction');

      // innerAction should come from inner layout
      expect(actionNames).toContain('innerAction');

      // pageAction should come from page
      expect(actionNames).toContain('pageAction');

      // sharedAction should be page's version (Page > Inner > Outer)
      const sharedAction = programData.actions.sharedAction;
      expect(sharedAction).toBeDefined();
      expect(sharedAction.steps[0].value.value).toBe('page-called');
    });

    it('should merge all lifecycle hooks from nested layouts with correct precedence', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'outer-layout.json'),
        JSON.stringify(outerLayout, null, 2)
      );
      await writeFile(
        join(layoutsDir, 'inner-layout.json'),
        JSON.stringify(innerLayout, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-nested.json'),
        JSON.stringify(pageWithNestedLayout, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-nested', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      
      // onMount should be page's version (Page > Inner > Outer)
      expect(programData.lifecycle.onMount).toBe('pageMount');
    });
  });

  // ==================== Page Inherits All From Layout Tests ====================

  describe('page inherits all from layout', () => {
    it('should inherit state, actions, and lifecycle from layout when page has none', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'main-layout.json'),
        JSON.stringify(layoutWithStateActionsLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-inherit.json'),
        JSON.stringify(pageWithNoStateActionsLifecycle, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-inherit', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      
      // State from layout
      expect(programData.state.theme).toBeDefined();
      expect(programData.state.theme.initial).toBe('dark');
      expect(programData.state.sidebarOpen).toBeDefined();
      
      // Actions from layout (stored as Record<string, CompiledAction>)
      const actionNames = Object.keys(programData.actions);
      expect(actionNames).toContain('toggleTheme');
      expect(actionNames).toContain('toggleSidebar');
      
      // Lifecycle from layout
      expect(programData.lifecycle.onMount).toBe('loadTheme');
    });
  });

  // ==================== Event Handler Works With Merged Actions ====================

  describe('event handlers work with merged actions', () => {
    it('should allow onClick to call layout action after merge', async () => {
      // Arrange
      const { build } = await import('../../src/build/index.js');
      await writeFile(
        join(layoutsDir, 'main-layout.json'),
        JSON.stringify(layoutWithStateActionsLifecycle, null, 2)
      );
      await writeFile(
        join(routesDir, 'test-inherit.json'),
        JSON.stringify(pageWithNoStateActionsLifecycle, null, 2)
      );

      // Act
      await build({
        outDir,
        routesDir,
        layoutsDir,
      });

      // Assert
      const htmlPath = join(outDir, 'test-inherit', 'index.html');
      const htmlContent = await readFile(htmlPath, 'utf-8');

      // The page should have the toggleTheme action available
      // The button in layout calls toggleTheme
      const programMatch = htmlContent.match(/const program = ({[\s\S]*?});/);
      expect(programMatch).toBeTruthy();
      
      const programData = JSON.parse(programMatch![1]);
      // Actions are stored as Record<string, CompiledAction>
      const actionNames = Object.keys(programData.actions);

      // toggleTheme action must be available for the onClick handler in layout
      expect(actionNames).toContain('toggleTheme');
    });
  });
});
