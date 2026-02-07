# @constela/ui

## 0.6.7

### Patch Changes

- Updated dependencies
  - @constela/core@0.22.1

## 0.6.6

### Patch Changes

- Updated dependencies
  - @constela/core@0.22.0

## 0.6.5

### Patch Changes

- fix: add transform to pie chart label group for correct centering

## 0.6.4

### Patch Changes

- 6e8ae3d: Fix pie chart slice/label angle mismatch and remove area fill from LineChart
- Updated dependencies [6e8ae3d]
  - @constela/core@0.21.4

## 0.6.3

### Patch Changes

- Fix chart rendering: getArcPath generates pie wedges, getBarDimensions supports valueKey, add fill="none" to line/area stroke paths
- Updated dependencies
  - @constela/core@0.21.3

## 0.6.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.21.2

## 0.6.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.21.1

## 0.6.0

### Minor Changes

- Apple Health level visual overhaul for all 7 chart types

  - New global functions: getActivityRingArcPath, getActivityRingLayout, getChartDefaultColors
  - Line/Area: area fill gradient, Apple Green, glow filter, round caps
  - Bar: Apple Blue, drop shadow, Y-axis labels
  - Pie: Apple Health 7-color palette, drop shadow
  - Donut: Activity Ring style (stroke-based concentric rings)
  - Radar: solid thin grids, glow filter, white-ringed data points
  - Scatter: Apple Blue, white ring, improved shadow
  - All charts: solid thin grid lines, drop shadows, rounded line caps

### Patch Changes

- Updated dependencies
  - @constela/core@0.21.0

## 0.5.0

### Minor Changes

- feat: Apple Health style chart redesign for all 7 chart types

### Patch Changes

- Updated dependencies
  - @constela/core@0.20.0

## 0.4.11

### Patch Changes

- Updated dependencies
  - @constela/core@0.19.0

## 0.4.10

### Patch Changes

- fix: normalize Y-axis scaling in LineChart, AreaChart, ScatterChart using scaleChartY helper

## 0.4.9

### Patch Changes

- fix(ui): implement DataTable auto-generation from columns/data params

  - Replace slot-only view with full table structure (thead/tbody)
  - Add localActions for state management (handleSort, handleFilter, handlePageChange, handleSelectionChange, toggleRowSelection)
  - Use each nodes to iterate over columns/data params
  - Use IndexExpr for dynamic cell value access (row[col.key])

## 0.4.8

### Patch Changes

- revert: 不完全な LineChart 修正を取り消し

## 0.4.7

### Patch Changes

- revert: 不完全な LineChart 修正を取り消し
- Updated dependencies
  - @constela/core@0.18.5

## 0.4.6

### Patch Changes

- revert: 不完全な LineChart 修正を取り消し
- Updated dependencies
  - @constela/core@0.18.4

## 0.4.5

### Patch Changes

- revert: LineChart/AreaChart の不完全な修正を取り消し
- Updated dependencies
  - @constela/core@0.18.3

## 0.4.4

### Patch Changes

- Updated dependencies
  - @constela/core@0.18.2

## 0.4.3

### Patch Changes

- Updated dependencies
  - @constela/core@0.18.1

## 0.4.2

### Patch Changes

- fix(ui): use concat expression instead of call for string concatenation in chart components

## 0.4.1

### Patch Changes

- fix(ui,core): align UI components with core schema

  - Add support for `local`, `obj` expressions in validator
  - Add `%` (modulo) operator to BINARY_OPERATORS
  - Update CallExpr.target type to allow null for global helper functions
  - Fix UI components to use correct AST structure

- Updated dependencies
  - @constela/core@0.18.0

## 0.4.0

### Minor Changes

- Add components and styles exports for CDN access

## 0.3.4

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.4

## 0.3.3

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.3

## 0.3.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.2

## 0.3.1

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.1

## 0.3.0

### Minor Changes

- feat: Constela 2026.02 Release

  ## Theme System

  - CSS variable-based theming with light/dark/system modes
  - ThemeProvider with SSR support and FOUC prevention
  - Automatic system theme detection via prefers-color-scheme

  ## DatePicker & Calendar

  - Calendar component with locale support and min/max constraints
  - DatePicker with popup calendar and format options
  - Date helper functions: getCalendarDays, getWeekDays, formatDate

  ## Tree & Accordion

  - Accordion with single/multiple expansion modes
  - Tree component with nested nodes and selection
  - Full ARIA accessibility support

  ## DataTable & VirtualScroll

  - DataTable with sorting, filtering, pagination, and row selection
  - VirtualScroll for efficient rendering of large lists
  - Table helper functions: sortBy, getPaginatedItems, getVisibleRange

  ## Chart Components

  - BarChart, LineChart, AreaChart, PieChart, DonutChart
  - Curved line paths with Catmull-Rom splines
  - CSS animations for data visualization

  ## Realtime Features

  - SSE connections with auto-reconnection (exponential/linear backoff)
  - Optimistic updates with confirm/reject/rollback
  - Realtime state bindings with JSON Patch support

  ## SSR/Edge Optimization

  - Streaming SSR with Web Streams API
  - Islands Architecture with 6 hydration strategies
  - Suspense and ErrorBoundary support
  - Island bundling and prefetching

### Patch Changes

- Updated dependencies
  - @constela/core@0.17.0

## 0.2.4

### Patch Changes

- Updated dependencies
  - @constela/core@0.16.2

## 0.2.3

### Patch Changes

- fix(runtime): prevent double rendering in HMR by adding skipInitialRender option
- Updated dependencies
  - @constela/core@0.16.1

## 0.2.2

### Patch Changes

- Updated dependencies
  - @constela/core@0.16.0

## 0.2.1

### Minor Changes

- feat(ui): Add @constela/ui component library

  Copy-paste UI components for Constela. 22 components included:

  **Basic (7)**: Button, Input, Textarea, Select, Checkbox, Radio, Switch
  **Feedback (5)**: Alert, Card, Badge, Skeleton, Avatar
  **Overlay (4)**: Dialog, Tooltip, Popover, Toast
  **Navigation/Layout (6)**: Tabs, Breadcrumb, Pagination, Container, Grid, Stack

  Features:

  - CVA-like style system (base, variants, defaultVariants)
  - StyleExpr integration for dynamic styling
  - Full accessibility support (ARIA attributes, semantic HTML)
  - 563 tests with 100% coverage
