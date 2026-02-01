# @constela/ui

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
