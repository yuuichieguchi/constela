# @constela/ai

AI-powered DSL generation for Constela. Generate UI components and views from natural language prompts.

## Installation

```bash
npm install @constela/ai
```

## Quick Start

Generate a component from a natural language description:

```typescript
import { createDslGenerator } from '@constela/ai';

const generator = createDslGenerator({
  provider: 'anthropic', // or 'openai'
});

const result = await generator.generate({
  prompt: 'Create a card component with title, description, and action button',
  output: 'component',
});

console.log(result.dsl);
// {
//   "kind": "element",
//   "tag": "div",
//   "props": { "class": "card" },
//   "children": [...]
// }
```

## Environment Variables

Set your API key:

```bash
# For Anthropic (Claude)
export ANTHROPIC_API_KEY=sk-ant-...

# For OpenAI
export OPENAI_API_KEY=sk-...
```

## Features

### AI Providers

Two providers are supported:

| Provider | Model | Environment Variable |
|----------|-------|---------------------|
| Anthropic | Claude Sonnet | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4o | `OPENAI_API_KEY` |

```typescript
// Use Anthropic
const generator = createDslGenerator({ provider: 'anthropic' });

// Use OpenAI
const generator = createDslGenerator({ provider: 'openai' });
```

### Output Types

Generate different types of DSL:

```typescript
// Generate a reusable component
const component = await generator.generate({
  prompt: 'A notification badge with count',
  output: 'component',
});

// Generate a full page/view
const view = await generator.generate({
  prompt: 'A user profile page with avatar, bio, and recent posts',
  output: 'view',
});
```

### Security Validation

All generated DSL is automatically validated:

**Forbidden Tags** (blocked by default):
- `script`, `iframe`, `object`, `embed`, `form`

**Forbidden Actions** (cannot be used even with whitelist):
- `import`, `call`, `dom`

**Restricted Actions** (require explicit whitelist):
- `fetch`

**URL Validation**:
- Blocks `javascript:`, `data:`, `vbscript:` schemes
- Supports domain whitelisting

```typescript
const generator = createDslGenerator({
  provider: 'anthropic',
  security: {
    allowedTags: ['a', 'button', 'input'],
    allowedActions: ['set', 'update', 'navigate'],
    allowedUrlPatterns: ['https://api.example.com/*'],
    maxNestingDepth: 32,
  },
});
```

### Generation Context

Provide context for more accurate generation:

```typescript
const generator = createDslGenerator({
  provider: 'anthropic',
  context: {
    existingComponents: ['Button', 'Card', 'Input'],
    theme: { primaryColor: '#3b82f6' },
    schema: { user: { name: 'string', email: 'string' } },
  },
});
```

## CLI: Suggest Command

Analyze DSL files for improvements:

```bash
# Analyze for accessibility issues
constela suggest app.json --aspect accessibility

# Analyze for performance
constela suggest app.json --aspect performance

# Analyze for security
constela suggest app.json --aspect security

# Analyze for UX
constela suggest app.json --aspect ux

# Use OpenAI instead of Anthropic
constela suggest app.json --aspect accessibility --provider openai

# Output as JSON
constela suggest app.json --aspect ux --json
```

Example output:

```
=== Suggestions for app.json (accessibility) ===

[HIGH] Missing aria-label on button
   Recommendation: Add aria-label="Submit form" to the button element
   Location: view.children[0].props

[MED] Low color contrast in text
   Recommendation: Increase contrast ratio to meet WCAG AA standards
   Location: view.children[2].props.style

Total: 2 suggestion(s)
```

## DSL Data Source

Use AI to generate content at build time:

```json
{
  "version": "1.0",
  "data": {
    "hero": {
      "type": "ai",
      "provider": "anthropic",
      "prompt": "Create a hero section with gradient background and CTA",
      "output": "component"
    }
  },
  "view": {
    "kind": "component",
    "name": "hero",
    "props": {}
  }
}
```

## Generate Action

Generate DSL at runtime in response to user actions:

```json
{
  "actions": [
    {
      "name": "generateCard",
      "steps": [
        {
          "do": "generate",
          "provider": "anthropic",
          "prompt": { "expr": "state", "name": "userPrompt" },
          "output": "component",
          "result": "generatedCard",
          "onSuccess": [
            { "do": "set", "target": "card", "value": { "expr": "var", "name": "generatedCard" } }
          ],
          "onError": [
            { "do": "set", "target": "error", "value": { "expr": "lit", "value": "Generation failed" } }
          ]
        }
      ]
    }
  ]
}
```

## API Reference

### createDslGenerator(options)

Creates a new DSL generator instance.

```typescript
interface DslGeneratorOptions {
  provider: 'anthropic' | 'openai';
  providerInstance?: AiProvider;  // Custom provider instance
  security?: SecurityOptions;
  context?: GenerationContext;
}
```

### generator.generate(options)

Generates DSL from a prompt.

```typescript
interface GenerateOptions {
  prompt: string;
  output: 'component' | 'view' | 'suggestion';
  context?: GenerationContext;
  security?: SecurityOptions;
}

interface GenerateResult {
  dsl: Record<string, unknown>;
  raw: string;
  validated: boolean;
  errors?: string[];
}
```

### generator.validate(dsl, security?)

Validates DSL against security rules.

```typescript
const result = generator.validate(dsl, {
  allowedTags: ['div', 'span', 'button'],
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Direct Provider Access

```typescript
import { getProvider, AnthropicProvider, OpenAIProvider } from '@constela/ai';

// Get provider by type
const provider = getProvider('anthropic');

// Or create directly
const anthropic = new AnthropicProvider({ model: 'claude-sonnet-4-20250514' });
const openai = new OpenAIProvider({ model: 'gpt-4o' });

const response = await provider.generate('Generate a button component', {
  systemPrompt: 'You are a UI component generator...',
  maxTokens: 4096,
  temperature: 0.7,
});
```

### Security Utilities

```typescript
import {
  isForbiddenTag,
  isForbiddenAction,
  isRestrictedAction,
  validateUrl,
  FORBIDDEN_TAGS,
  FORBIDDEN_ACTIONS,
} from '@constela/ai';

// Check if tag is forbidden
isForbiddenTag('script'); // true
isForbiddenTag('div');    // false

// Validate URL
const result = validateUrl('https://example.com/api', {
  allowedDomains: ['example.com'],
  allowRelative: true,
});
```

## Error Handling

```typescript
import { AiError, ValidationError, SecurityError } from '@constela/ai';

try {
  const result = await generator.generate({ prompt, output: 'component' });
} catch (err) {
  if (err instanceof SecurityError) {
    console.error('Security violation:', err.violation);
  } else if (err instanceof ValidationError) {
    console.error('Validation failed:', err.violations);
  } else if (err instanceof AiError) {
    console.error('AI error:', err.code, err.message);
  }
}
```

Error codes:
- `PROVIDER_NOT_CONFIGURED` - API key not set
- `PROVIDER_NOT_FOUND` - Unknown provider type
- `API_ERROR` - Provider API call failed
- `VALIDATION_ERROR` - Generated DSL validation failed
- `SECURITY_VIOLATION` - Security rule violated
- `RATE_LIMIT_EXCEEDED` - API rate limit hit

## License

MIT
