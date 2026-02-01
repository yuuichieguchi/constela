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

### Data Display (8)
- **Card** - Card container
- **Badge** - Inline badge
- **Avatar** - User avatar
- **Skeleton** - Loading placeholder
- **DataTable** - Advanced data table with sorting, filtering, and pagination
- **VirtualScroll** - Virtualized list for large datasets
- **Chart** - 12 chart types (line, bar, pie, area, scatter, radar, doughnut, polar, bubble, histogram, candlestick, treemap)

### Date & Time (2)
- **DatePicker** - Date selection with calendar popup
- **Calendar** - Calendar view for date display and selection

### Navigation (5)
- **Tabs** - Tab navigation
- **Breadcrumb** - Breadcrumb navigation
- **Pagination** - Page pagination
- **Tree** - Hierarchical tree view with expand/collapse
- **Accordion** - Collapsible content sections

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

## New Components (2026.02)

### DatePicker

Date selection with calendar popup:

```json
{
  "kind": "component",
  "name": "DatePicker",
  "props": {
    "value": { "expr": "state", "name": "selectedDate" },
    "onChange": { "event": "change", "action": "updateDate" },
    "format": { "expr": "lit", "value": "yyyy-MM-dd" },
    "minDate": { "expr": "lit", "value": "2024-01-01" },
    "maxDate": { "expr": "lit", "value": "2025-12-31" },
    "locale": { "expr": "lit", "value": "ja-JP" }
  }
}
```

### Calendar

Calendar view for date display:

```json
{
  "kind": "component",
  "name": "Calendar",
  "props": {
    "value": { "expr": "state", "name": "selectedDate" },
    "onSelect": { "event": "select", "action": "handleDateSelect" },
    "highlightedDates": { "expr": "state", "name": "events" },
    "weekStartsOn": { "expr": "lit", "value": 1 }
  }
}
```

### Tree

Hierarchical tree view:

```json
{
  "kind": "component",
  "name": "Tree",
  "props": {
    "items": { "expr": "state", "name": "treeData" },
    "onSelect": { "event": "select", "action": "handleNodeSelect" },
    "expandedKeys": { "expr": "state", "name": "expanded" },
    "selectedKey": { "expr": "state", "name": "selected" },
    "showIcons": { "expr": "lit", "value": true }
  }
}
```

### Accordion

Collapsible content sections:

```json
{
  "kind": "component",
  "name": "Accordion",
  "props": {
    "items": { "expr": "state", "name": "accordionItems" },
    "type": { "expr": "lit", "value": "single" },
    "collapsible": { "expr": "lit", "value": true },
    "defaultValue": { "expr": "lit", "value": "item-1" }
  }
}
```

### DataTable

Advanced data table with sorting, filtering, and pagination:

```json
{
  "kind": "component",
  "name": "DataTable",
  "props": {
    "data": { "expr": "state", "name": "tableData" },
    "columns": { "expr": "lit", "value": [
      { "key": "name", "title": "Name", "sortable": true },
      { "key": "email", "title": "Email", "sortable": true, "filterable": true },
      { "key": "status", "title": "Status", "sortable": true }
    ]},
    "pageSize": { "expr": "lit", "value": 10 },
    "sortable": { "expr": "lit", "value": true },
    "filterable": { "expr": "lit", "value": true },
    "selectable": { "expr": "lit", "value": true },
    "onSort": { "event": "sort", "action": "handleSort" },
    "onFilter": { "event": "filter", "action": "handleFilter" },
    "onPageChange": { "event": "pageChange", "action": "handlePageChange" }
  }
}
```

### VirtualScroll

Virtualized list for large datasets:

```json
{
  "kind": "component",
  "name": "VirtualScroll",
  "props": {
    "items": { "expr": "state", "name": "largeList" },
    "itemHeight": { "expr": "lit", "value": 50 },
    "containerHeight": { "expr": "lit", "value": 400 },
    "overscan": { "expr": "lit", "value": 5 },
    "renderItem": { "expr": "param", "name": "itemTemplate" }
  }
}
```

### Chart

12 chart types with animations:

```json
{
  "kind": "component",
  "name": "Chart",
  "props": {
    "type": { "expr": "lit", "value": "line" },
    "data": { "expr": "state", "name": "chartData" },
    "options": { "expr": "lit", "value": {
      "responsive": true,
      "animation": { "duration": 750, "easing": "easeOutQuart" },
      "scales": {
        "y": { "beginAtZero": true }
      },
      "plugins": {
        "legend": { "position": "top" },
        "tooltip": { "enabled": true }
      }
    }},
    "width": { "expr": "lit", "value": 600 },
    "height": { "expr": "lit", "value": 400 }
  }
}
```

**Supported Chart Types:**

| Type | Description |
|------|-------------|
| `line` | Line chart with optional curved paths |
| `bar` | Vertical bar chart |
| `horizontalBar` | Horizontal bar chart |
| `pie` | Pie chart |
| `doughnut` | Doughnut chart |
| `area` | Area chart with fill |
| `scatter` | Scatter plot |
| `radar` | Radar/spider chart |
| `polar` | Polar area chart |
| `bubble` | Bubble chart |
| `histogram` | Histogram |
| `candlestick` | Candlestick chart for financial data |
| `treemap` | Treemap visualization |

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
