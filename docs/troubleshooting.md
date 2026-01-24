# Troubleshooting Guide

This guide covers common errors, debugging techniques, and solutions for Constela development.

## Common Errors

### UNDEFINED_STATE

**Error**: Reference to a state field that doesn't exist.

```
Error [UNDEFINED_STATE] at /view/children/0/value/name
  Undefined state reference: 'count' is not defined in state
  Did you mean 'counter'?
```

**Cause**: Using `{ "expr": "state", "name": "count" }` when `count` is not declared in `state`.

**Solution**:
1. Check if the state field name is spelled correctly
2. Ensure the state field is declared in the `state` object

```json
{
  "state": {
    "count": { "type": "number", "initial": 0 }
  }
}
```

### UNDEFINED_ACTION

**Error**: Reference to an action that doesn't exist.

```
Error [UNDEFINED_ACTION] at /view/children/0/props/onClick
  Undefined action reference: 'incremen' is not defined in actions
  Did you mean 'increment'?
```

**Cause**: Using an action name in an event handler that isn't defined.

**Solution**:
1. Check action name spelling
2. Ensure the action is defined in the `actions` array

```json
{
  "actions": [
    {
      "name": "increment",
      "steps": [{ "do": "update", "target": "count", "operation": "increment" }]
    }
  ]
}
```

### COMPONENT_NOT_FOUND

**Error**: Reference to a component that doesn't exist.

```
Error [COMPONENT_NOT_FOUND] at /view/children/0
  Component 'Buttn' is not defined in components
  Did you mean 'Button'?
```

**Cause**: Using `{ "kind": "component", "name": "Buttn" }` when no such component exists.

**Solution**:
1. Check component name spelling
2. Ensure the component is defined in `components`

```json
{
  "components": {
    "Button": {
      "params": { "label": { "type": "string" } },
      "view": { "kind": "element", "tag": "button", "children": [...] }
    }
  }
}
```

### SCHEMA_INVALID

**Error**: JSON structure doesn't conform to the Constela schema.

```
Error [SCHEMA_INVALID] at /view/kind
  Invalid value "div". Expected one of: element, text, if, each, component, slot, markdown, code
```

**Common Causes**:
- Missing required fields (`version`, `state`, `actions`, `view`)
- Invalid node `kind` value
- Wrong type for a field

**Solution**:
1. Ensure `version` is `"1.0"`
2. Check that `view.kind` is one of: `element`, `text`, `if`, `each`, `component`, `slot`, `markdown`, `code`
3. Verify all required fields are present

```json
{
  "version": "1.0",
  "state": {},
  "actions": [],
  "view": {
    "kind": "element",
    "tag": "div",
    "children": []
  }
}
```

### VAR_UNDEFINED

**Error**: Reference to a variable that doesn't exist in scope.

```
Error [VAR_UNDEFINED] at /view/children/0/body/children/0/value
  Undefined variable reference: 'itm' is not defined in scope
```

**Cause**: Using `{ "expr": "var", "name": "itm" }` outside of an `each` loop, or misspelling the variable name.

**Solution**:
1. Ensure you're inside an `each` loop
2. Use the correct variable name from the `as` field

```json
{
  "kind": "each",
  "items": { "expr": "state", "name": "todos" },
  "as": "item",
  "body": {
    "kind": "text",
    "value": { "expr": "var", "name": "item" }
  }
}
```

### COMPONENT_PROP_MISSING

**Error**: Required component prop is not provided.

```
Error [COMPONENT_PROP_MISSING] at /view/children/0
  Component 'Button' requires prop 'label'
```

**Cause**: Component has a required param but props don't include it.

**Solution**: Provide all required props when using the component.

```json
{
  "kind": "component",
  "name": "Button",
  "props": {
    "label": { "expr": "lit", "value": "Click me" }
  }
}
```

### OPERATION_INVALID_FOR_TYPE

**Error**: Update operation doesn't match the state type.

```
Error [OPERATION_INVALID_FOR_TYPE] at /actions/0/steps/0
  Operation 'push' is not valid for state type 'number'
```

**Cause**: Using `push` on a number state, or `increment` on a list state.

**Solution**: Match the operation to the state type.

| Operation | Valid Types |
|-----------|-------------|
| `increment`, `decrement` | number |
| `push`, `pop`, `remove`, `replaceAt`, `insertAt`, `splice` | list |
| `toggle` | boolean |
| `merge` | object |

### LAYOUT_NOT_FOUND

**Error**: Referenced layout doesn't exist.

```
Error [LAYOUT_NOT_FOUND] at /route/layout
  Layout 'MainLayot' is not found
```

**Cause**: The `route.layout` references a layout that doesn't exist.

**Solution**:
1. Check the layout name spelling
2. Ensure the layout file exists in the layouts directory
3. Verify the layout file is a valid Constela layout

### UNDEFINED_IMPORT

**Error**: Import reference doesn't exist.

```
Error [UNDEFINED_IMPORT] at /view/children/0/value
  Undefined import reference: 'config' is not defined in imports
```

**Cause**: Using `{ "expr": "import", "name": "config" }` without defining the import.

**Solution**: Define the import in the `imports` field.

```json
{
  "imports": {
    "config": "./data/config.json"
  }
}
```

## Debugging Techniques

### Using `constela validate`

Validate JSON files before running:

```bash
# Validate a single file
constela validate app.constela.json

# Validate all files in a directory
constela validate --all src/routes/

# Output as JSON (for tools)
constela validate app.constela.json --json
```

### Using `constela inspect`

Inspect the structure of a compiled program:

```bash
# Show full program structure
constela inspect app.constela.json

# Show only state
constela inspect app.constela.json --state

# Show only actions
constela inspect app.constela.json --actions

# JSON output
constela inspect app.constela.json --json
```

### Using `--verbose` Flag

Get detailed output during compilation:

```bash
constela compile app.constela.json --verbose
```

This shows:
- Timing information for each pass
- Number of warnings/errors
- File resolution details

### Using `--debug` Flag

Enable debug output for troubleshooting build issues:

```bash
constela dev --debug
constela build --debug
```

## Dev Server Troubleshooting

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Use a different port
constela dev --port 3001

# Or kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Hot Reload Not Working

**Symptoms**: Changes to JSON files don't reflect in the browser.

**Solutions**:
1. Check if the file is being watched (look for console output)
2. Try hard refresh (Ctrl/Cmd + Shift + R)
3. Restart the dev server
4. Check for syntax errors in the JSON file

### Module Resolution Errors

**Error**: `Cannot find module '@constela/runtime'`

**Solutions**:
1. Run `pnpm install` to install dependencies
2. Check that packages are built: `pnpm build`
3. Verify `node_modules` contains the package

## SSG Build Troubleshooting

### Build Fails with Compilation Error

**Symptoms**: `constela build` exits with error.

**Solutions**:
1. Run `constela validate --all src/routes/` to find the problematic file
2. Check the error message for the specific file and path
3. Fix the JSON error and rebuild

### Missing Pages in Output

**Symptoms**: Some pages not generated in `dist/`.

**Solutions**:
1. Ensure page has a `route.path` defined
2. For dynamic routes, check `getStaticPaths` returns all needed paths
3. Verify the page file is in the routes directory

### Hydration Mismatch

**Symptoms**: Console shows hydration warnings, UI flickers on load.

**Causes**:
- Server-rendered content differs from client-rendered content
- Dynamic content that varies between server and client

**Solutions**:
1. Ensure expressions produce the same value on server and client
2. For time-dependent content, use lifecycle hooks instead
3. Check for browser-only APIs used during SSR

### Widgets Not Rendering

**Symptoms**: Widget container is empty after page load.

**Solutions**:
1. Verify the widget ID matches the container element ID
2. Check that the widget JSON file exists and is valid
3. Ensure the widget path in `src` is correct (relative to page file)
4. Look for JavaScript errors in the browser console

## Common JSON Mistakes

### Missing Commas

```json
// Wrong
{
  "state": {}
  "actions": []
}

// Correct
{
  "state": {},
  "actions": []
}
```

### Trailing Commas

```json
// Wrong
{
  "state": {
    "count": { "type": "number", "initial": 0 },
  }
}

// Correct
{
  "state": {
    "count": { "type": "number", "initial": 0 }
  }
}
```

### Wrong Quote Characters

```json
// Wrong (curly quotes)
{ "name": "value" }

// Correct (straight quotes)
{ "name": "value" }
```

### Unquoted Keys

```json
// Wrong
{
  state: {}
}

// Correct
{
  "state": {}
}
```

## Error Code Reference

| Code | Description |
|------|-------------|
| `SCHEMA_INVALID` | JSON structure doesn't match schema |
| `UNDEFINED_STATE` | State field not defined |
| `UNDEFINED_ACTION` | Action not defined |
| `VAR_UNDEFINED` | Loop variable not in scope |
| `DUPLICATE_ACTION` | Action name used twice |
| `UNSUPPORTED_VERSION` | Invalid version string |
| `COMPONENT_NOT_FOUND` | Component not defined |
| `COMPONENT_PROP_MISSING` | Required prop not provided |
| `COMPONENT_CYCLE` | Circular component reference |
| `COMPONENT_PROP_TYPE` | Prop type mismatch |
| `PARAM_UNDEFINED` | Component param not defined |
| `OPERATION_INVALID_FOR_TYPE` | Operation doesn't match state type |
| `OPERATION_MISSING_FIELD` | Required field for operation missing |
| `UNDEFINED_ROUTE_PARAM` | Route param not in path |
| `ROUTE_NOT_DEFINED` | Route expression without route field |
| `UNDEFINED_IMPORT` | Import not defined |
| `UNDEFINED_DATA` | Data source not defined |
| `LAYOUT_MISSING_SLOT` | Layout has no slot node |
| `LAYOUT_NOT_FOUND` | Layout file not found |
| `UNDEFINED_STYLE` | Style not defined |
| `UNDEFINED_VARIANT` | Style variant not defined |

## Getting Help

If you're still stuck:

1. Check the error path in the message (e.g., `/view/children/0/value`)
2. Use `constela inspect` to see the full program structure
3. Search existing issues on GitHub
4. File a new issue with:
   - Error message
   - Minimal JSON that reproduces the issue
   - Constela version (`constela --version`)
