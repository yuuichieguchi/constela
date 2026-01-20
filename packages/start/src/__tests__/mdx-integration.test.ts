/**
 * Test module for MDX DSL Integration.
 *
 * Coverage:
 * - transformMdx with MdxGlobResult return type
 * - loadComponentDefinitions function
 * - mdxContentToNode function
 * - DataLoader with components option
 * - loadGlob with MDX transform and components
 *
 * TDD Red Phase: These tests verify the MDX DSL integration
 * that enables custom component usage in MDX content.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CompiledNode } from '@constela/compiler';
import type { ComponentDef, DataSource } from '@constela/core';

// Mock fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock('fast-glob', () => ({
  default: vi.fn(),
}));

// ==================== Types for New Features ====================

/**
 * ComponentsRef - Import expression for components
 * This type will be added to @constela/core
 */
interface ComponentsRef {
  expr: 'import';
  name: string;
}

/**
 * MdxGlobResult - New return type for transformMdx
 * content is now CompiledNode instead of string
 */
interface MdxGlobResult {
  file: string;
  raw: string;
  frontmatter: Record<string, unknown>;
  content: CompiledNode;  // NOT string - this is the breaking change
  slug: string;
}

/**
 * Extended DataSource with components field
 */
interface DataSourceWithComponents extends DataSource {
  components?: string | ComponentsRef;
}

/**
 * TransformMdx options
 */
interface TransformMdxOptions {
  components?: Record<string, ComponentDef>;
}

// ==================== transformMdx Tests ====================

describe('transformMdx (new signature)', () => {
  // ==================== MdxGlobResult Return Type ====================

  describe('MdxGlobResult return type', () => {
    it('should return MdxGlobResult with CompiledNode content', async () => {
      // Arrange
      const content = '---\ntitle: Test Post\n---\n\n# Hello World\n\nThis is content.';
      const file = 'content/blog/test-post.mdx';

      // Act - New signature: transformMdx(content, file, options?) => Promise<MdxGlobResult>
      // This import will fail until implementation is done
      const { transformMdx } = await import('../data/loader.js');

      // The new transformMdx should return a Promise<MdxGlobResult>
      const result = await transformMdx(content, file);

      // Assert
      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('raw');
      expect(result).toHaveProperty('frontmatter');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('slug');

      // content should be CompiledNode, not string
      expect(typeof result.content).not.toBe('string');
      expect(result.content).toHaveProperty('kind');
    });

    it('should use frontmatter.slug when present', async () => {
      // Arrange
      const content = '---\ntitle: Test\nslug: custom-slug\n---\n\n# Content';
      const file = 'content/blog/original-name.mdx';

      // Act
      const { transformMdx } = await import('../data/loader.js');
      const result = await transformMdx(content, file);

      // Assert
      expect(result.slug).toBe('custom-slug');
    });

    it('should use filename as slug when frontmatter.slug is missing', async () => {
      // Arrange
      const content = '---\ntitle: Test Post\n---\n\n# Content';
      const file = 'content/blog/my-post.mdx';

      // Act
      const { transformMdx } = await import('../data/loader.js');
      const result = await transformMdx(content, file);

      // Assert - New behavior: non-index files include directory path in slug
      expect(result.slug).toBe('content/blog/my-post');
    });

    it('should handle deeply nested file paths for slug generation', async () => {
      // Arrange
      const content = '---\ntitle: Deep Post\n---\n\n# Content';
      const file = 'content/blog/2024/01/deep-post.mdx';

      // Act
      const { transformMdx } = await import('../data/loader.js');
      const result = await transformMdx(content, file);

      // Assert - New behavior: non-index files include directory path in slug
      expect(result.slug).toBe('content/blog/2024/01/deep-post');
    });
  });

  // ==================== Custom Components ====================

  describe('custom components application', () => {
    it('should apply custom components to MDX elements', async () => {
      // Arrange
      const content = `---
title: With Components
---

<Callout type="warning">
  This is a warning message.
</Callout>
`;
      const file = 'content/test.mdx';

      const components: Record<string, ComponentDef> = {
        Callout: {
          params: {
            type: { type: 'string', required: true },
          },
          view: {
            kind: 'element',
            tag: 'div',
            props: {
              className: { expr: 'param', name: 'type' },
            },
            children: [{ kind: 'slot' }],
          } as unknown as CompiledNode,
        } as unknown as ComponentDef,
      };

      // Act
      const { transformMdx } = await import('../data/loader.js');
      const result = await transformMdx(content, file, { components });

      // Assert
      expect(result.content).toBeDefined();
      // The Callout component should be resolved
      expect(result.content.kind).toBe('element');
    });

    it('should handle MDX without frontmatter', async () => {
      // Arrange
      const content = '# Just Content\n\nNo frontmatter here.';
      const file = 'content/no-frontmatter.mdx';

      // Act
      const { transformMdx } = await import('../data/loader.js');
      const result = await transformMdx(content, file);

      // Assert - New behavior: non-index files include directory path in slug
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBeDefined();
      expect(result.slug).toBe('content/no-frontmatter');
    });

    it('should preserve raw content in result', async () => {
      // Arrange
      const content = '---\ntitle: Test\n---\n\n# Hello';
      const file = 'content/test.mdx';

      // Act
      const { transformMdx } = await import('../data/loader.js');
      const result = await transformMdx(content, file);

      // Assert
      expect(result.raw).toBe(content);
    });

    it('should include file path in result', async () => {
      // Arrange
      const content = '---\ntitle: Test\n---\n\n# Hello';
      const file = 'content/blog/post.mdx';

      // Act
      const { transformMdx } = await import('../data/loader.js');
      const result = await transformMdx(content, file);

      // Assert
      expect(result.file).toBe(file);
    });
  });
});

// ==================== loadComponentDefinitions Tests ====================

describe('loadComponentDefinitions', () => {
  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
  });

  it('should load and parse component definitions from JSON file', async () => {
    // Arrange
    const componentDefs = {
      Callout: {
        params: { type: { type: 'string' } },
        view: { kind: 'element', tag: 'div' },
      },
      Button: {
        params: { variant: { type: 'string' } },
        view: { kind: 'element', tag: 'button' },
      },
    };

    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(componentDefs));

    // Act
    // This import will fail until implementation is done
    const { loadComponentDefinitions } = await import('../data/loader.js');
    const result = await loadComponentDefinitions('/project', 'components/mdx.json');

    // Assert
    expect(result).toHaveProperty('Callout');
    expect(result).toHaveProperty('Button');
    expect(result.Callout).toHaveProperty('view');
  });

  it('should throw error if component file not found', async () => {
    // Arrange
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Act & Assert
    // loadComponentDefinitions is synchronous, not async
    const { loadComponentDefinitions } = await import('../data/loader.js');
    expect(() =>
      loadComponentDefinitions('/project', 'nonexistent.json')
    ).toThrow(/not found|does not exist/i);
  });

  it('should return valid ComponentDef objects', async () => {
    // Arrange
    const componentDefs = {
      Card: {
        params: {
          title: { type: 'string', required: true },
          description: { type: 'string' },
        },
        view: {
          kind: 'element',
          tag: 'article',
          children: [
            { kind: 'element', tag: 'h3', children: [{ kind: 'slot', name: 'title' }] },
            { kind: 'slot' },
          ],
        },
      },
    };

    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(componentDefs));

    // Act
    const { loadComponentDefinitions } = await import('../data/loader.js');
    const result = await loadComponentDefinitions('/project', 'components.json');

    // Assert
    expect(result.Card.params).toBeDefined();
    expect(result.Card.params?.title.type).toBe('string');
    expect(result.Card.params?.title.required).toBe(true);
    expect(result.Card.view).toHaveProperty('kind', 'element');
  });

  it('should handle empty component definitions file', async () => {
    // Arrange
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    // Act
    const { loadComponentDefinitions } = await import('../data/loader.js');
    const result = await loadComponentDefinitions('/project', 'empty.json');

    // Assert
    expect(result).toEqual({});
  });
});

// ==================== mdxContentToNode Tests ====================

describe('mdxContentToNode', () => {
  it('should transform MDX content to CompiledNode', async () => {
    // Arrange
    const mdxContent = '# Hello World\n\nThis is a paragraph.';

    // Act
    // This import will fail until implementation is done
    const { mdxContentToNode } = await import('../data/loader.js');
    const result = await mdxContentToNode(mdxContent);

    // Assert
    expect(result).toHaveProperty('kind');
    expect(result.kind).toBe('element');
  });

  it('should apply custom components', async () => {
    // Arrange
    const mdxContent = '<Highlight color="blue">Important text</Highlight>';
    const components: Record<string, ComponentDef> = {
      Highlight: {
        params: { color: { type: 'string' } },
        view: {
          kind: 'element',
          tag: 'span',
          props: { className: { expr: 'param', name: 'color' } },
          children: [{ kind: 'slot' }],
        } as unknown as CompiledNode,
      } as unknown as ComponentDef,
    };

    // Act
    const { mdxContentToNode } = await import('../data/loader.js');
    const result = await mdxContentToNode(mdxContent, { components });

    // Assert
    expect(result).toBeDefined();
    expect(result.kind).toBe('element');
  });

  it('should handle basic markdown elements', async () => {
    // Arrange
    const mdxContent = `
# Heading 1
## Heading 2

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
const x = 1;
\`\`\`
`;

    // Act
    const { mdxContentToNode } = await import('../data/loader.js');
    const result = await mdxContentToNode(mdxContent);

    // Assert
    expect(result).toBeDefined();
    expect(result.kind).toBe('element');
    // Result should be a div wrapping all content
    expect(result).toHaveProperty('children');
  });

  it('should handle empty content', async () => {
    // Arrange
    const mdxContent = '';

    // Act
    const { mdxContentToNode } = await import('../data/loader.js');
    const result = await mdxContentToNode(mdxContent);

    // Assert
    expect(result).toBeDefined();
    expect(result.kind).toBe('element');
  });
});

// ==================== DataLoader with Components Tests ====================

describe('DataLoader with components', () => {
  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReset();
  });

  describe('component resolution', () => {
    it('should resolve string path components', async () => {
      // Arrange
      const componentDefs = {
        Alert: {
          params: { type: { type: 'string' } },
          view: { kind: 'element', tag: 'div' },
        },
      };

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/test.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify(componentDefs)) // Component file
        .mockReturnValueOnce('---\ntitle: Test\n---\n\n<Alert type="info">Message</Alert>'); // MDX file

      const { DataLoader } = await import('../data/loader.js');
      const loader = new DataLoader('/project');

      const dataSource: DataSourceWithComponents = {
        type: 'glob',
        pattern: 'content/*.mdx',
        transform: 'mdx',
        components: 'components/mdx.json',
      } as unknown as DataSourceWithComponents;

      // Act
      const result = await loader.loadDataSource('posts', dataSource as DataSource);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      const posts = result as MdxGlobResult[];
      expect(posts[0]?.content).toHaveProperty('kind');
    });

    it('should resolve import expression components', async () => {
      // Arrange
      const componentDefs = {
        CodeBlock: {
          view: { kind: 'element', tag: 'pre' },
        },
      };

      // Create imports context
      const importsContext = {
        mdxComponents: componentDefs,
      };

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/test.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue(
        '---\ntitle: Test\n---\n\n<CodeBlock>code here</CodeBlock>'
      );

      const { DataLoader } = await import('../data/loader.js');
      const loader = new DataLoader('/project');

      const componentsRef: ComponentsRef = {
        expr: 'import',
        name: 'mdxComponents',
      };

      const dataSource: DataSourceWithComponents = {
        type: 'glob',
        pattern: 'content/*.mdx',
        transform: 'mdx',
        components: componentsRef,
      } as unknown as DataSourceWithComponents;

      // Act
      const result = await loader.loadDataSource('posts', dataSource as DataSource, { imports: importsContext });

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error when import context missing for expression ref', async () => {
      // Arrange
      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/test.mdx']);

      const fs = await import('node:fs');
      vi.mocked(fs.readFileSync).mockReturnValue('---\ntitle: Test\n---\n\nContent');

      const { DataLoader } = await import('../data/loader.js');
      const loader = new DataLoader('/project');

      const componentsRef: ComponentsRef = {
        expr: 'import',
        name: 'missingComponents',
      };

      const dataSource: DataSourceWithComponents = {
        type: 'glob',
        pattern: 'content/*.mdx',
        transform: 'mdx',
        components: componentsRef,
      } as unknown as DataSourceWithComponents;

      // Act & Assert - no imports context provided
      await expect(
        loader.loadDataSource('posts', dataSource as DataSource)
      ).rejects.toThrow(/import context required|import.*not found|missing import/i);
    });

    it('should cache component definitions', async () => {
      // Arrange
      const componentDefs = {
        Badge: { view: { kind: 'element', tag: 'span' } },
      };

      const fg = await import('fast-glob');
      vi.mocked(fg.default).mockResolvedValue(['content/post1.mdx', 'content/post2.mdx']);

      const fs = await import('node:fs');
      const readFileSyncMock = vi.mocked(fs.readFileSync);
      readFileSyncMock
        .mockReturnValueOnce(JSON.stringify(componentDefs)) // Component file (should be called once)
        .mockReturnValueOnce('---\ntitle: Post 1\n---\n\n<Badge>1</Badge>')
        .mockReturnValueOnce('---\ntitle: Post 2\n---\n\n<Badge>2</Badge>');

      const { DataLoader } = await import('../data/loader.js');
      const loader = new DataLoader('/project');

      const dataSource: DataSourceWithComponents = {
        type: 'glob',
        pattern: 'content/*.mdx',
        transform: 'mdx',
        components: 'components/mdx.json',
      } as unknown as DataSourceWithComponents;

      // Act
      await loader.loadDataSource('posts', dataSource as DataSource);

      // Assert - Component file should only be read once
      const componentFileReads = readFileSyncMock.mock.calls.filter(
        (call) => String(call[0]).includes('mdx.json')
      );
      expect(componentFileReads.length).toBeLessThanOrEqual(1);
    });
  });
});

// ==================== loadGlob with MDX Transform Tests ====================

describe('loadGlob with MDX transform', () => {
  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReset();
  });

  it('should return MdxGlobResult[] for MDX transform', async () => {
    // Arrange
    const fg = await import('fast-glob');
    vi.mocked(fg.default).mockResolvedValue([
      'content/post-1.mdx',
      'content/post-2.mdx',
    ]);

    const fs = await import('node:fs');
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce('---\ntitle: Post 1\nslug: post-1\n---\n\n# First Post')
      .mockReturnValueOnce('---\ntitle: Post 2\nslug: post-2\n---\n\n# Second Post');

    // Act
    const { loadGlob } = await import('../data/loader.js');
    const results = await loadGlob('/project', 'content/*.mdx', 'mdx');

    // Assert
    expect(results).toHaveLength(2);

    // Each result should be MdxGlobResult
    for (const result of results) {
      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('raw');
      expect(result).toHaveProperty('frontmatter');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('slug');

      // content should be CompiledNode
      expect(typeof result.content).not.toBe('string');
      expect(result.content).toHaveProperty('kind');
    }
  });

  it('should pass components to transformMdx', async () => {
    // Arrange
    const componentDefs = {
      Note: {
        view: { kind: 'element', tag: 'aside' },
      },
    };

    const fg = await import('fast-glob');
    vi.mocked(fg.default).mockResolvedValue(['content/test.mdx']);

    const fs = await import('node:fs');
    vi.mocked(fs.readFileSync).mockReturnValue(
      '---\ntitle: Test\n---\n\n<Note>Important note</Note>'
    );

    // Act
    const { loadGlob } = await import('../data/loader.js');
    const results = await loadGlob('/project', 'content/*.mdx', 'mdx', {
      components: componentDefs as unknown as Record<string, ComponentDef>,
    });

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0]?.content).toBeDefined();
    expect(results[0]?.content).toHaveProperty('kind');
  });

  it('should handle mixed file extensions in glob', async () => {
    // Arrange
    const fg = await import('fast-glob');
    vi.mocked(fg.default).mockResolvedValue([
      'content/post.mdx',
      'content/another-post.mdx',
    ]);

    const fs = await import('node:fs');
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce('---\ntitle: Post\n---\n\n# Content')
      .mockReturnValueOnce('---\ntitle: Another Post\n---\n\n# Another Content');

    // Act - mdx transform applies to all matched files
    const { loadGlob } = await import('../data/loader.js');
    const results = await loadGlob('/project', 'content/*.mdx', 'mdx');

    // Assert
    expect(results).toHaveLength(2);
    // All MDX files should have CompiledNode content
    for (const result of results) {
      expect(result.file.endsWith('.mdx')).toBe(true);
      expect(result.content).toHaveProperty('kind');
    }
  });
});

// ==================== Integration Tests ====================

describe('Integration: MDX DSL full workflow', () => {
  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReset();
  });

  it('should complete full MDX DSL workflow with components', async () => {
    // Arrange - Component definitions
    const componentDefs = {
      Callout: {
        params: { type: { type: 'string' } },
        view: {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'callout' } },
          children: [{ kind: 'slot' }],
        },
      },
    };

    // Arrange - MDX content
    const mdxContent = `---
title: Using Components
slug: using-components
category: tutorial
---

# Introduction

<Callout type="info">
  This is an important note about the topic.
</Callout>

## Details

More content here...
`;

    const fg = await import('fast-glob');
    vi.mocked(fg.default).mockResolvedValue(['content/using-components.mdx']);

    const fs = await import('node:fs');
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(JSON.stringify(componentDefs))
      .mockReturnValueOnce(mdxContent);

    const { DataLoader, generateStaticPaths } = await import('../data/loader.js');
    const loader = new DataLoader('/project');

    const dataSource: DataSourceWithComponents = {
      type: 'glob',
      pattern: 'content/*.mdx',
      transform: 'mdx',
      components: 'components/mdx.json',
    } as unknown as DataSourceWithComponents;

    // Act - Load data source
    const posts = (await loader.loadDataSource('posts', dataSource as DataSource)) as MdxGlobResult[];

    // Assert
    expect(posts).toHaveLength(1);
    expect(posts[0]?.frontmatter.title).toBe('Using Components');
    expect(posts[0]?.slug).toBe('using-components');
    expect(posts[0]?.content).toHaveProperty('kind');

    // Generate static paths
    const staticPathsDef = {
      source: 'posts',
      params: {
        slug: { expr: 'get', base: { expr: 'var', name: 'item' }, path: 'slug' },
      },
    };

    const paths = await generateStaticPaths(posts, staticPathsDef as never);
    expect(paths).toHaveLength(1);
    expect(paths[0]?.params.slug).toBe('using-components');
  });
});
