# Button

A customizable button component with multiple variants and sizes.

## Usage

Copy `button.constela.json` and `button.styles.json` to your project's components directory.

### Basic Usage

```json
{
  "kind": "component",
  "name": "Button",
  "children": [
    { "kind": "text", "value": { "expr": "lit", "value": "Click me" } }
  ]
}
```

### With Variants

```json
{
  "kind": "component",
  "name": "Button",
  "props": {
    "variant": { "expr": "lit", "value": "destructive" }
  },
  "children": [
    { "kind": "text", "value": { "expr": "lit", "value": "Delete" } }
  ]
}
```

### With Size

```json
{
  "kind": "component",
  "name": "Button",
  "props": {
    "size": { "expr": "lit", "value": "lg" }
  },
  "children": [
    { "kind": "text", "value": { "expr": "lit", "value": "Large Button" } }
  ]
}
```

### Disabled State

```json
{
  "kind": "component",
  "name": "Button",
  "props": {
    "disabled": { "expr": "lit", "value": true }
  },
  "children": [
    { "kind": "text", "value": { "expr": "lit", "value": "Disabled" } }
  ]
}
```

### With ARIA Label

```json
{
  "kind": "component",
  "name": "Button",
  "props": {
    "ariaLabel": { "expr": "lit", "value": "Close dialog" },
    "variant": { "expr": "lit", "value": "ghost" },
    "size": { "expr": "lit", "value": "icon" }
  },
  "children": [
    { "kind": "text", "value": { "expr": "lit", "value": "X" } }
  ]
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | string | No | `"default"` | Button style variant |
| `size` | string | No | `"default"` | Button size |
| `disabled` | boolean | No | `false` | Whether the button is disabled |
| `type` | string | No | - | HTML button type attribute (browser default: `"submit"`) |
| `ariaLabel` | string | No | - | ARIA label for accessibility |

## Variants

| Variant | Description |
|---------|-------------|
| `default` | Primary button style with solid background |
| `destructive` | Red/danger button for destructive actions |
| `outline` | Button with border and transparent background |
| `secondary` | Secondary button with muted background |
| `ghost` | Minimal button with no background until hover |
| `link` | Text-only button styled as a link |

## Sizes

| Size | Description |
|------|-------------|
| `default` | Standard button size (h-10) |
| `sm` | Small button (h-9) |
| `lg` | Large button (h-11) |
| `icon` | Square icon button (h-10 w-10) |

## Accessibility

- Uses semantic `<button>` element
- Supports `aria-label` for screen readers
- Disabled state is properly communicated via `disabled` attribute
- Focus ring visible on keyboard navigation
- Disabled buttons have reduced opacity

## Customization

### Modifying Styles

Edit `button.styles.json` to customize the appearance:

```json
{
  "buttonStyles": {
    "base": "your-base-classes",
    "variants": {
      "variant": {
        "custom": "your-custom-variant-classes"
      }
    }
  }
}
```

### Adding New Variants

1. Add the variant to `button.styles.json`:

```json
{
  "variants": {
    "variant": {
      "success": "bg-green-500 text-white hover:bg-green-600"
    }
  }
}
```

2. Use it in your component:

```json
{
  "kind": "component",
  "name": "Button",
  "props": {
    "variant": { "expr": "lit", "value": "success" }
  }
}
```
