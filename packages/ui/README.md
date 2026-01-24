# @constela/ui

Copy-paste UI components for Constela.

## Overview

This package provides a collection of pre-built, accessible UI components written in Constela JSON DSL. Each component is designed to be copied directly into your project and customized as needed.

## Installation

```bash
npm install @constela/ui
```

## Usage

### Copy Component Files

Components are located in the `components/` directory. Copy the component files you need into your project:

```
components/
├── button/
│   ├── button.constela.json      # Component definition
│   ├── button.styles.json        # Style presets
│   └── README.md                 # Usage documentation
├── input/
├── select/
└── ...
```

### Example: Using Button Component

1. Copy `components/button/button.constela.json` to your project
2. Import styles from `components/button/button.styles.json`
3. Use the component in your Constela program:

```json
{
  "kind": "component",
  "name": "Button",
  "props": {
    "variant": { "expr": "lit", "value": "default" },
    "size": { "expr": "lit", "value": "default" }
  },
  "children": [
    { "kind": "text", "value": { "expr": "lit", "value": "Click me" } }
  ]
}
```

## Available Components

### Basic (7)
- **Button** - Clickable button with variants and sizes
- **Input** - Text input field
- **Select** - Dropdown select
- **Checkbox** - Checkbox input
- **Radio** - Radio button
- **Switch** - Toggle switch
- **Textarea** - Multi-line text input

### Feedback (6)
- **Alert** - Alert messages
- **Toast** - Toast notifications
- **Dialog** - Modal dialog
- **Modal** - Modal overlay
- **Tooltip** - Hover tooltip
- **Popover** - Click-triggered popover

### Data Display (5)
- **Table** - Data table
- **Card** - Card container
- **Badge** - Inline badge
- **Avatar** - User avatar
- **Skeleton** - Loading placeholder

### Navigation (3)
- **Tabs** - Tab navigation
- **Breadcrumb** - Breadcrumb navigation
- **Pagination** - Page pagination

### Layout (3)
- **Container** - Max-width container
- **Grid** - CSS Grid layout
- **Stack** - Flexbox stack

## Style System

Each component uses the CVA-like style system with:

- **base** - Common styles applied to all variants
- **variants** - Named variant options (e.g., "variant", "size")
- **defaultVariants** - Default values when not specified

### Example Style Preset

```json
{
  "button": {
    "base": "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
    "variants": {
      "variant": {
        "default": "bg-primary text-primary-foreground hover:bg-primary/90",
        "destructive": "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "outline": "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        "ghost": "hover:bg-accent hover:text-accent-foreground",
        "link": "text-primary underline-offset-4 hover:underline"
      },
      "size": {
        "default": "h-10 px-4 py-2",
        "sm": "h-9 rounded-md px-3",
        "lg": "h-11 rounded-md px-8",
        "icon": "h-10 w-10"
      }
    },
    "defaultVariants": {
      "variant": "default",
      "size": "default"
    }
  }
}
```

## Accessibility

All components include proper ARIA attributes:

- `aria-label` - Descriptive labels
- `aria-disabled` - Disabled state indication
- `role` - Semantic roles for interactive elements
- `aria-live` - Live region announcements

## API Reference

### validateComponent

Validate a Constela component definition:

```typescript
import { validateComponent } from '@constela/ui';

const result = validateComponent(componentJson);
if (result.valid) {
  console.log('Component is valid');
} else {
  console.error('Validation errors:', result.errors);
}
```

### Component Types

```typescript
import type { ButtonComponent, InputComponent } from '@constela/ui';
```

## License

MIT
