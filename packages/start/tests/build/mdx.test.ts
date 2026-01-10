/**
 * Test module for MDX to Constela AST pipeline.
 *
 * Coverage:
 * - Basic transformations (headings, paragraphs, emphasis, links)
 * - Code blocks with Shiki syntax highlighting
 * - Lists (ordered, unordered, nested)
 * - MDX-specific features (frontmatter, custom components)
 * - Error handling (invalid MDX syntax)
 *
 * TDD Red Phase: All tests are written before implementation.
 * Tests are expected to FAIL until mdxToConstela is implemented.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  CompiledProgram,
  CompiledNode,
  CompiledElementNode,
  CompiledTextNode,
  CompiledCodeNode,
} from '@constela/compiler';

// ==================== Type Definitions ====================

/**
 * Options for MDX to Constela transformation
 */
interface MDXToConstelaOptions {
  components?: Record<string, ComponentDef>;
}

/**
 * Component definition for custom MDX components
 */
interface ComponentDef {
  params?: Record<string, { type: string; required?: boolean }>;
  view: CompiledNode;
}

// ==================== Test Helpers ====================

/**
 * Helper to extract text value from CompiledTextNode
 */
function getTextValue(node: CompiledNode): string | undefined {
  if (node.kind === 'text') {
    const textNode = node as CompiledTextNode;
    if (textNode.value.expr === 'lit') {
      return textNode.value.value as string;
    }
  }
  return undefined;
}

/**
 * Helper to find element by tag in children
 */
function findElementByTag(
  children: CompiledNode[] | undefined,
  tag: string
): CompiledElementNode | undefined {
  return children?.find(
    (child) => child.kind === 'element' && (child as CompiledElementNode).tag === tag
  ) as CompiledElementNode | undefined;
}

/**
 * Helper to get all elements by tag
 */
function findAllElementsByTag(
  children: CompiledNode[] | undefined,
  tag: string
): CompiledElementNode[] {
  return (
    children?.filter(
      (child) => child.kind === 'element' && (child as CompiledElementNode).tag === tag
    ) as CompiledElementNode[]
  ) ?? [];
}

// ==================== Mock Setup ====================

// Mock Shiki highlighter
vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn().mockImplementation((code: string, options: { lang: string }) => {
      return `<pre class="shiki"><code class="language-${options.lang}">${code}</code></pre>`;
    }),
  }),
}));

// ==================== Basic Transformations ====================

describe('mdxToConstela - Basic Transformations', () => {
  // ==================== Headings ====================

  describe('headings', () => {
    it('should transform h1 heading to element node', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '# Hello World';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result).toBeDefined();
      expect(result.view.kind).toBe('element');
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('h1');
      expect(view.children).toHaveLength(1);
      expect(getTextValue(view.children![0])).toBe('Hello World');
    });

    it('should transform h2 heading to element node', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '## Section Title';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('h2');
      expect(getTextValue(view.children![0])).toBe('Section Title');
    });

    it('should transform h3 to h6 headings correctly', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const levels = [
        { source: '### H3', tag: 'h3', text: 'H3' },
        { source: '#### H4', tag: 'h4', text: 'H4' },
        { source: '##### H5', tag: 'h5', text: 'H5' },
        { source: '###### H6', tag: 'h6', text: 'H6' },
      ];

      for (const { source, tag, text } of levels) {
        // Act
        const result = await mdxToConstela(source);

        // Assert
        const view = result.view as CompiledElementNode;
        expect(view.tag).toBe(tag);
        expect(getTextValue(view.children![0])).toBe(text);
      }
    });

    it('should handle multiple headings in document', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `# Title

## Section 1

## Section 2`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      // Should wrap multiple elements in a fragment or div
      const view = result.view as CompiledElementNode;
      expect(view.children).toBeDefined();
      const headings = view.children!.filter((c) => c.kind === 'element');
      expect(headings.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==================== Paragraphs ====================

  describe('paragraphs', () => {
    it('should transform paragraph to p element', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = 'This is a paragraph.';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('p');
      expect(getTextValue(view.children![0])).toBe('This is a paragraph.');
    });

    it('should handle multiple paragraphs', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `First paragraph.

Second paragraph.`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const paragraphs = findAllElementsByTag(view.children, 'p');
      expect(paragraphs).toHaveLength(2);
    });
  });

  // ==================== Emphasis ====================

  describe('emphasis', () => {
    it('should transform *emphasis* to em element', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = 'This is *emphasized* text.';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('p');
      const em = findElementByTag(view.children, 'em');
      expect(em).toBeDefined();
      expect(getTextValue(em!.children![0])).toBe('emphasized');
    });

    it('should transform **strong** to strong element', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = 'This is **strong** text.';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const strong = findElementByTag(view.children, 'strong');
      expect(strong).toBeDefined();
      expect(getTextValue(strong!.children![0])).toBe('strong');
    });

    it('should handle nested emphasis', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = 'This is ***bold and italic*** text.';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      // Should have both strong and em
      const children = view.children ?? [];
      const hasEmphasis = children.some((c) => {
        if (c.kind !== 'element') return false;
        const el = c as CompiledElementNode;
        return el.tag === 'strong' || el.tag === 'em';
      });
      expect(hasEmphasis).toBe(true);
    });
  });

  // ==================== Links ====================

  describe('links', () => {
    it('should transform [text](url) to a element', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '[Click here](https://example.com)';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const link = findElementByTag(view.children, 'a');
      expect(link).toBeDefined();
      expect(link!.props?.href).toBeDefined();
      expect((link!.props!.href as any).value).toBe('https://example.com');
      expect(getTextValue(link!.children![0])).toBe('Click here');
    });

    it('should handle links with title', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '[Link](https://example.com "Title text")';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const link = findElementByTag(view.children, 'a');
      expect(link).toBeDefined();
      expect(link!.props?.title).toBeDefined();
      expect((link!.props!.title as any).value).toBe('Title text');
    });
  });

  // ==================== Inline Code ====================

  describe('inline code', () => {
    it('should transform `code` to code element', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = 'Use the `console.log()` function.';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const code = findElementByTag(view.children, 'code');
      expect(code).toBeDefined();
      expect(getTextValue(code!.children![0])).toBe('console.log()');
    });
  });

  // ==================== Blockquote ====================

  describe('blockquote', () => {
    it('should transform > quote to blockquote element', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '> This is a quote.';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('blockquote');
      const p = findElementByTag(view.children, 'p');
      expect(p).toBeDefined();
    });

    it('should handle nested blockquotes', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `> Level 1
>> Level 2`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('blockquote');
      const nestedQuote = findElementByTag(view.children, 'blockquote');
      expect(nestedQuote).toBeDefined();
    });
  });
});

// ==================== Code Blocks ====================

describe('mdxToConstela - Code Blocks', () => {
  describe('fenced code blocks', () => {
    it('should transform fenced code block to code node', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `\`\`\`typescript
const x: number = 42;
\`\`\``;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result.view.kind).toBe('code');
      const codeNode = result.view as CompiledCodeNode;
      expect(codeNode.language.expr).toBe('lit');
      expect((codeNode.language as any).value).toBe('typescript');
      expect(codeNode.content.expr).toBe('lit');
      expect((codeNode.content as any).value).toContain('const x: number = 42;');
    });

    it('should handle code block without language specification', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `\`\`\`
plain text
\`\`\``;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result.view.kind).toBe('code');
      const codeNode = result.view as CompiledCodeNode;
      // Should default to 'text' or empty string
      expect((codeNode.language as any).value).toBeDefined();
    });

    it('should handle various programming languages', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const languages = ['javascript', 'python', 'rust', 'go', 'json'];

      for (const lang of languages) {
        const source = `\`\`\`${lang}
code content
\`\`\``;

        // Act
        const result = await mdxToConstela(source);

        // Assert
        const codeNode = result.view as CompiledCodeNode;
        expect((codeNode.language as any).value).toBe(lang);
      }
    });

    it('should preserve code content with special characters', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `\`\`\`html
<div class="container">
  <p>Hello &amp; World</p>
</div>
\`\`\``;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const codeNode = result.view as CompiledCodeNode;
      expect((codeNode.content as any).value).toContain('<div class="container">');
      expect((codeNode.content as any).value).toContain('&amp;');
    });

    it('should handle code block with highlighted lines (meta)', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `\`\`\`typescript {1,3-5}
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
\`\`\``;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      // Implementation should preserve or process meta information
      expect(result.view.kind).toBe('code');
    });
  });

  describe('Shiki integration', () => {
    it('should use Shiki for syntax highlighting', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `\`\`\`typescript
const greeting: string = "Hello";
\`\`\``;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      // Shiki should be called for highlighting
      expect(result.view.kind).toBe('code');
    });
  });
});

// ==================== Lists ====================

describe('mdxToConstela - Lists', () => {
  describe('unordered lists', () => {
    it('should transform - items to ul with li children', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `- Item 1
- Item 2
- Item 3`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('ul');
      expect(view.children).toHaveLength(3);
      view.children!.forEach((child) => {
        expect(child.kind).toBe('element');
        expect((child as CompiledElementNode).tag).toBe('li');
      });
    });

    it('should handle * marker for unordered list', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `* Item A
* Item B`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('ul');
      expect(view.children).toHaveLength(2);
    });
  });

  describe('ordered lists', () => {
    it('should transform numbered items to ol with li children', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `1. First
2. Second
3. Third`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('ol');
      expect(view.children).toHaveLength(3);
    });

    it('should handle non-sequential numbering', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `1. First
5. Second
10. Third`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('ol');
      // Should still produce valid list
      expect(view.children).toHaveLength(3);
    });
  });

  describe('nested lists', () => {
    it('should handle nested unordered lists', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `- Level 1
  - Level 2
    - Level 3
- Back to Level 1`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('ul');
      // First li should contain nested ul
      const firstLi = view.children![0] as CompiledElementNode;
      const nestedUl = findElementByTag(firstLi.children, 'ul');
      expect(nestedUl).toBeDefined();
    });

    it('should handle nested ordered lists', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `1. Level 1
   1. Level 2
   2. Level 2 continued
2. Back to Level 1`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('ol');
      const firstLi = view.children![0] as CompiledElementNode;
      const nestedOl = findElementByTag(firstLi.children, 'ol');
      expect(nestedOl).toBeDefined();
    });

    it('should handle mixed nested lists (ul inside ol)', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `1. Ordered item
   - Unordered nested
   - Another unordered
2. Another ordered`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('ol');
      const firstLi = view.children![0] as CompiledElementNode;
      const nestedUl = findElementByTag(firstLi.children, 'ul');
      expect(nestedUl).toBeDefined();
    });
  });

  describe('list items with complex content', () => {
    it('should handle list items with inline formatting', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `- **Bold** item
- *Italic* item
- Item with \`code\``;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('ul');
      const firstLi = view.children![0] as CompiledElementNode;
      const strong = findElementByTag(firstLi.children, 'strong');
      expect(strong).toBeDefined();
    });

    it('should handle list items with links', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `- [Link 1](https://example.com)
- [Link 2](https://example.org)`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const firstLi = view.children![0] as CompiledElementNode;
      const link = findElementByTag(firstLi.children, 'a');
      expect(link).toBeDefined();
    });
  });
});

// ==================== MDX-Specific Features ====================

describe('mdxToConstela - MDX Features', () => {
  describe('frontmatter', () => {
    it('should parse YAML frontmatter', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `---
title: My Document
author: John Doe
date: 2024-01-01
---

# Content`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      // Frontmatter should be accessible in program state or metadata
      expect(result).toBeDefined();
      // The actual content should still be transformed
      expect(result.view).toBeDefined();
    });

    it('should handle frontmatter with arrays', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `---
tags:
  - javascript
  - typescript
  - react
---

Content here.`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle frontmatter with nested objects', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `---
meta:
  og:title: Page Title
  og:description: Description
---

Content.`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle document without frontmatter', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '# Just a heading';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result).toBeDefined();
      expect(result.view.kind).toBe('element');
    });
  });

  describe('custom components', () => {
    it('should transform <Callout> to custom component', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `<Callout type="warning">
  This is a warning message.
</Callout>`;
      const options: MDXToConstelaOptions = {
        components: {
          Callout: {
            params: { type: { type: 'string' } },
            view: {
              kind: 'element',
              tag: 'div',
              props: { class: { expr: 'lit', value: 'callout' } },
              children: [{ kind: 'slot' } as any],
            },
          },
        },
      };

      // Act
      const result = await mdxToConstela(source, options);

      // Assert
      expect(result.view.kind).toBe('element');
      const view = result.view as CompiledElementNode;
      expect(view.props?.class).toBeDefined();
    });

    it('should transform <Alert> with props', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `<Alert severity="error" title="Error">
  Something went wrong!
</Alert>`;
      const options: MDXToConstelaOptions = {
        components: {
          Alert: {
            params: {
              severity: { type: 'string' },
              title: { type: 'string' },
            },
            view: {
              kind: 'element',
              tag: 'div',
              props: { role: { expr: 'lit', value: 'alert' } },
            },
          },
        },
      };

      // Act
      const result = await mdxToConstela(source, options);

      // Assert
      expect(result.view).toBeDefined();
    });

    it('should handle self-closing custom components', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '<Divider />';
      const options: MDXToConstelaOptions = {
        components: {
          Divider: {
            view: { kind: 'element', tag: 'hr' },
          },
        },
      };

      // Act
      const result = await mdxToConstela(source, options);

      // Assert
      expect(result.view.kind).toBe('element');
      expect((result.view as CompiledElementNode).tag).toBe('hr');
    });

    it('should handle nested custom components', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>`;
      const options: MDXToConstelaOptions = {
        components: {
          Card: {
            view: {
              kind: 'element',
              tag: 'div',
              props: { class: { expr: 'lit', value: 'card' } },
              children: [{ kind: 'slot' } as any],
            },
          },
          CardHeader: {
            view: {
              kind: 'element',
              tag: 'div',
              props: { class: { expr: 'lit', value: 'card-header' } },
              children: [{ kind: 'slot' } as any],
            },
          },
          CardBody: {
            view: {
              kind: 'element',
              tag: 'div',
              props: { class: { expr: 'lit', value: 'card-body' } },
              children: [{ kind: 'slot' } as any],
            },
          },
        },
      };

      // Act
      const result = await mdxToConstela(source, options);

      // Assert
      expect(result.view.kind).toBe('element');
    });

    it('should handle custom component with expression props', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '<Counter initial={10} />';
      const options: MDXToConstelaOptions = {
        components: {
          Counter: {
            params: { initial: { type: 'number' } },
            view: { kind: 'element', tag: 'div' },
          },
        },
      };

      // Act
      const result = await mdxToConstela(source, options);

      // Assert
      expect(result.view).toBeDefined();
    });

    it('should warn or error for undefined custom components', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '<UndefinedComponent>Content</UndefinedComponent>';

      // Act & Assert
      // Should either throw an error or return a fallback element
      await expect(mdxToConstela(source)).rejects.toThrow();
      // Or alternatively, handle gracefully:
      // const result = await mdxToConstela(source);
      // expect(result.view.kind).toBe('element');
    });
  });

  describe('MDX expressions', () => {
    it('should handle inline expressions {variable}', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = 'The answer is {42}.';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result.view).toBeDefined();
    });

    it('should handle expressions in component props', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '<Button disabled={true}>Click</Button>';
      const options: MDXToConstelaOptions = {
        components: {
          Button: {
            params: { disabled: { type: 'boolean' } },
            view: { kind: 'element', tag: 'button' },
          },
        },
      };

      // Act
      const result = await mdxToConstela(source, options);

      // Assert
      expect(result.view).toBeDefined();
    });
  });
});

// ==================== Error Handling ====================

describe('mdxToConstela - Error Handling', () => {
  describe('invalid MDX syntax', () => {
    it('should throw error for unclosed JSX tags', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '<div>Unclosed tag';

      // Act & Assert
      await expect(mdxToConstela(source)).rejects.toThrow();
    });

    it('should throw error for mismatched JSX tags', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '<div>Content</span>';

      // Act & Assert
      await expect(mdxToConstela(source)).rejects.toThrow();
    });

    it('should throw error for invalid JSX expressions', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '<Button onClick={}>Click</Button>';

      // Act & Assert
      await expect(mdxToConstela(source)).rejects.toThrow();
    });

    it('should throw error for invalid frontmatter YAML', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `---
title: Missing quote
  invalid: yaml: syntax
---

Content`;

      // Act & Assert
      await expect(mdxToConstela(source)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty document', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      // Should return empty or minimal valid program
      expect(result).toBeDefined();
      expect(result.view).toBeDefined();
    });

    it('should handle document with only whitespace', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = '   \n\n   \n   ';

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle document with only frontmatter', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `---
title: Only Frontmatter
---`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle very long documents', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const paragraphs = Array(100).fill('This is a paragraph.\n').join('\n');
      const source = `# Long Document\n\n${paragraphs}`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result).toBeDefined();
      expect(result.view.kind).toBe('element');
    });

    it('should handle special characters in content', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      // Note: In MDX, < must be escaped as &lt; or \< to avoid JSX interpretation
      const source = `# Special Characters

Content with &lt;, &gt;, &amp;, " and ' characters.

Unicode: 日本語 🚀 émoji`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      expect(result).toBeDefined();
    });
  });
});

// ==================== CompiledProgram Structure ====================

describe('mdxToConstela - CompiledProgram Structure', () => {
  it('should return valid CompiledProgram structure', async () => {
    // Arrange
    const { mdxToConstela } = await import('../../src/build/mdx.js');
    const source = '# Hello World';

    // Act
    const result = await mdxToConstela(source);

    // Assert
    expect(result.version).toBe('1.0');
    expect(result.state).toBeDefined();
    expect(result.actions).toBeDefined();
    expect(result.view).toBeDefined();
  });

  it('should have empty state by default', async () => {
    // Arrange
    const { mdxToConstela } = await import('../../src/build/mdx.js');
    const source = '# Simple Document';

    // Act
    const result = await mdxToConstela(source);

    // Assert
    expect(result.state).toEqual({});
  });

  it('should have empty actions by default', async () => {
    // Arrange
    const { mdxToConstela } = await import('../../src/build/mdx.js');
    const source = '# Simple Document';

    // Act
    const result = await mdxToConstela(source);

    // Assert
    expect(result.actions).toEqual({});
  });
});

// ==================== GFM Tables ====================

describe('mdxToConstela - GFM Tables', () => {
  describe('table structure with header and body', () => {
    it('should wrap first row in thead with th cells', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('table');

      // Find thead element
      const thead = findElementByTag(view.children, 'thead');
      expect(thead).toBeDefined();

      // thead should contain tr with th cells
      const headerRow = findElementByTag(thead!.children, 'tr');
      expect(headerRow).toBeDefined();

      const thCells = findAllElementsByTag(headerRow!.children, 'th');
      expect(thCells).toHaveLength(2);
      expect(getTextValue(thCells[0].children![0])).toBe('Header 1');
      expect(getTextValue(thCells[1].children![0])).toBe('Header 2');
    });

    it('should wrap remaining rows in tbody with td cells', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| Name  | Age |
| ----- | --- |
| Alice | 30  |
| Bob   | 25  |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('table');

      // Find tbody element
      const tbody = findElementByTag(view.children, 'tbody');
      expect(tbody).toBeDefined();

      // tbody should contain tr elements with td cells
      const bodyRows = findAllElementsByTag(tbody!.children, 'tr');
      expect(bodyRows).toHaveLength(2);

      // First body row
      const firstRowCells = findAllElementsByTag(bodyRows[0].children, 'td');
      expect(firstRowCells).toHaveLength(2);
      expect(getTextValue(firstRowCells[0].children![0])).toBe('Alice');
      expect(getTextValue(firstRowCells[1].children![0])).toBe('30');

      // Second body row
      const secondRowCells = findAllElementsByTag(bodyRows[1].children, 'td');
      expect(secondRowCells).toHaveLength(2);
      expect(getTextValue(secondRowCells[0].children![0])).toBe('Bob');
      expect(getTextValue(secondRowCells[1].children![0])).toBe('25');
    });

    it('should have correct table structure: table > thead + tbody', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| Col A | Col B | Col C |
| ----- | ----- | ----- |
| 1     | 2     | 3     |
| 4     | 5     | 6     |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('table');

      // Table should have exactly thead and tbody as direct children
      const thead = findElementByTag(view.children, 'thead');
      const tbody = findElementByTag(view.children, 'tbody');
      expect(thead).toBeDefined();
      expect(tbody).toBeDefined();

      // Verify no tr elements are direct children of table
      const directTr = findAllElementsByTag(view.children, 'tr');
      expect(directTr).toHaveLength(0);
    });
  });

  describe('table with only header row (no body)', () => {
    it('should output only thead when table has no body rows', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| Header Only |
| ----------- |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('table');

      // Should have thead
      const thead = findElementByTag(view.children, 'thead');
      expect(thead).toBeDefined();

      // Should NOT have tbody (or empty tbody)
      const tbody = findElementByTag(view.children, 'tbody');
      // Either no tbody exists, or tbody exists but has no rows
      if (tbody) {
        const bodyRows = findAllElementsByTag(tbody.children, 'tr');
        expect(bodyRows).toHaveLength(0);
      }

      // Verify thead has the header row
      const headerRow = findElementByTag(thead!.children, 'tr');
      expect(headerRow).toBeDefined();
      const thCells = findAllElementsByTag(headerRow!.children, 'th');
      expect(thCells).toHaveLength(1);
      expect(getTextValue(thCells[0].children![0])).toBe('Header Only');
    });
  });

  describe('table cells with inline content', () => {
    it('should handle emphasis in table cells', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| Format   | Example       |
| -------- | ------------- |
| Bold     | **important** |
| Italic   | *emphasis*    |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const tbody = findElementByTag(view.children, 'tbody');
      expect(tbody).toBeDefined();

      const bodyRows = findAllElementsByTag(tbody!.children, 'tr');
      expect(bodyRows.length).toBeGreaterThanOrEqual(2);

      // First row should have strong element in second cell
      const firstRowCells = findAllElementsByTag(bodyRows[0].children, 'td');
      const strongInCell = findElementByTag(firstRowCells[1].children, 'strong');
      expect(strongInCell).toBeDefined();
      expect(getTextValue(strongInCell!.children![0])).toBe('important');

      // Second row should have em element in second cell
      const secondRowCells = findAllElementsByTag(bodyRows[1].children, 'td');
      const emInCell = findElementByTag(secondRowCells[1].children, 'em');
      expect(emInCell).toBeDefined();
      expect(getTextValue(emInCell!.children![0])).toBe('emphasis');
    });

    it('should handle links in table cells', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| Site   | Link                          |
| ------ | ----------------------------- |
| Google | [Visit](https://google.com)   |
| GitHub | [Code](https://github.com)    |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const tbody = findElementByTag(view.children, 'tbody');
      expect(tbody).toBeDefined();

      const bodyRows = findAllElementsByTag(tbody!.children, 'tr');
      expect(bodyRows.length).toBeGreaterThanOrEqual(1);

      // First row should have anchor element in second cell
      const firstRowCells = findAllElementsByTag(bodyRows[0].children, 'td');
      const linkInCell = findElementByTag(firstRowCells[1].children, 'a');
      expect(linkInCell).toBeDefined();
      expect(linkInCell!.props?.href).toBeDefined();
      expect((linkInCell!.props!.href as any).value).toBe('https://google.com');
      expect(getTextValue(linkInCell!.children![0])).toBe('Visit');
    });

    it('should handle inline code in table cells', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| Function      | Usage           |
| ------------- | --------------- |
| \`console.log\` | Debug output    |
| \`Array.map\`   | Transform items |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const tbody = findElementByTag(view.children, 'tbody');
      expect(tbody).toBeDefined();

      const bodyRows = findAllElementsByTag(tbody!.children, 'tr');
      expect(bodyRows.length).toBeGreaterThanOrEqual(1);

      // First row should have code element in first cell
      const firstRowCells = findAllElementsByTag(bodyRows[0].children, 'td');
      const codeInCell = findElementByTag(firstRowCells[0].children, 'code');
      expect(codeInCell).toBeDefined();
      expect(getTextValue(codeInCell!.children![0])).toBe('console.log');
    });

    it('should handle mixed inline content in header cells', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| **Bold Header** | *Italic Header* |
| --------------- | --------------- |
| cell            | cell            |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      const thead = findElementByTag(view.children, 'thead');
      expect(thead).toBeDefined();

      const headerRow = findElementByTag(thead!.children, 'tr');
      const thCells = findAllElementsByTag(headerRow!.children, 'th');
      expect(thCells).toHaveLength(2);

      // First header should have strong element
      const strongInHeader = findElementByTag(thCells[0].children, 'strong');
      expect(strongInHeader).toBeDefined();
      expect(getTextValue(strongInHeader!.children![0])).toBe('Bold Header');

      // Second header should have em element
      const emInHeader = findElementByTag(thCells[1].children, 'em');
      expect(emInHeader).toBeDefined();
      expect(getTextValue(emInHeader!.children![0])).toBe('Italic Header');
    });
  });

  describe('table with multiple columns', () => {
    it('should handle tables with many columns', async () => {
      // Arrange
      const { mdxToConstela } = await import('../../src/build/mdx.js');
      const source = `| A | B | C | D | E |
| - | - | - | - | - |
| 1 | 2 | 3 | 4 | 5 |`;

      // Act
      const result = await mdxToConstela(source);

      // Assert
      const view = result.view as CompiledElementNode;
      expect(view.tag).toBe('table');

      const thead = findElementByTag(view.children, 'thead');
      const headerRow = findElementByTag(thead!.children, 'tr');
      const thCells = findAllElementsByTag(headerRow!.children, 'th');
      expect(thCells).toHaveLength(5);

      const tbody = findElementByTag(view.children, 'tbody');
      const bodyRow = findElementByTag(tbody!.children, 'tr');
      const tdCells = findAllElementsByTag(bodyRow!.children, 'td');
      expect(tdCells).toHaveLength(5);
    });
  });
});
