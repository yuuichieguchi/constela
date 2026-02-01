/**
 * All UI component definitions
 *
 * Each component conforms to the ComponentDef interface from @constela/core.
 * Type validation is performed at runtime via validateComponent().
 */

// Accordion components
import Accordion from '../components/accordion/accordion.constela.json' with { type: 'json' };
import AccordionItem from '../components/accordion/accordion-item.constela.json' with { type: 'json' };
import AccordionTrigger from '../components/accordion/accordion-trigger.constela.json' with { type: 'json' };
import AccordionContent from '../components/accordion/accordion-content.constela.json' with { type: 'json' };

// Feedback components
import Alert from '../components/alert/alert.constela.json' with { type: 'json' };
import Avatar from '../components/avatar/avatar.constela.json' with { type: 'json' };
import Badge from '../components/badge/badge.constela.json' with { type: 'json' };
import Skeleton from '../components/skeleton/skeleton.constela.json' with { type: 'json' };
import Toast from '../components/toast/toast.constela.json' with { type: 'json' };

// Form components
import Button from '../components/button/button.constela.json' with { type: 'json' };
import Checkbox from '../components/checkbox/checkbox.constela.json' with { type: 'json' };
import Input from '../components/input/input.constela.json' with { type: 'json' };
import Radio from '../components/radio/radio.constela.json' with { type: 'json' };
import Select from '../components/select/select.constela.json' with { type: 'json' };
import Switch from '../components/switch/switch.constela.json' with { type: 'json' };
import Textarea from '../components/textarea/textarea.constela.json' with { type: 'json' };

// Layout components
import Card from '../components/card/card.constela.json' with { type: 'json' };
import Container from '../components/container/container.constela.json' with { type: 'json' };
import Grid from '../components/grid/grid.constela.json' with { type: 'json' };
import Stack from '../components/stack/stack.constela.json' with { type: 'json' };

// Interactive components
import Dialog from '../components/dialog/dialog.constela.json' with { type: 'json' };
import Popover from '../components/popover/popover.constela.json' with { type: 'json' };
import Tabs from '../components/tabs/tabs.constela.json' with { type: 'json' };
import Tooltip from '../components/tooltip/tooltip.constela.json' with { type: 'json' };

// Navigation components
import Breadcrumb from '../components/breadcrumb/breadcrumb.constela.json' with { type: 'json' };
import Pagination from '../components/pagination/pagination.constela.json' with { type: 'json' };

// Tree components
import Tree from '../components/tree/tree.constela.json' with { type: 'json' };
import TreeNode from '../components/tree/tree-node.constela.json' with { type: 'json' };

// Date components
import Calendar from '../components/calendar/calendar.constela.json' with { type: 'json' };
import Datepicker from '../components/datepicker/datepicker.constela.json' with { type: 'json' };

// Virtual components
import VirtualScroll from '../components/virtual-scroll/virtual-scroll.constela.json' with { type: 'json' };

// DataTable components
import DataTable from '../components/data-table/data-table.constela.json' with { type: 'json' };
import DataTableCell from '../components/data-table/data-table-cell.constela.json' with { type: 'json' };
import DataTableHeader from '../components/data-table/data-table-header.constela.json' with { type: 'json' };
import DataTablePagination from '../components/data-table/data-table-pagination.constela.json' with { type: 'json' };
import DataTableRow from '../components/data-table/data-table-row.constela.json' with { type: 'json' };

// Chart components
import AreaChart from '../components/chart/area-chart.constela.json' with { type: 'json' };
import BarChart from '../components/chart/bar-chart.constela.json' with { type: 'json' };
import ChartAxis from '../components/chart/chart-axis.constela.json' with { type: 'json' };
import ChartLegend from '../components/chart/chart-legend.constela.json' with { type: 'json' };
import ChartTooltip from '../components/chart/chart-tooltip.constela.json' with { type: 'json' };
import DonutChart from '../components/chart/donut-chart.constela.json' with { type: 'json' };
import LineChart from '../components/chart/line-chart.constela.json' with { type: 'json' };
import PieChart from '../components/chart/pie-chart.constela.json' with { type: 'json' };
import RadarChart from '../components/chart/radar-chart.constela.json' with { type: 'json' };
import ScatterChart from '../components/chart/scatter-chart.constela.json' with { type: 'json' };

/**
 * All available UI components
 */
export const components = {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Alert,
  AreaChart,
  Avatar,
  Badge,
  BarChart,
  Breadcrumb,
  Button,
  Calendar,
  Card,
  ChartAxis,
  ChartLegend,
  ChartTooltip,
  Checkbox,
  Container,
  DataTable,
  DataTableCell,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
  Datepicker,
  Dialog,
  DonutChart,
  Grid,
  Input,
  LineChart,
  Pagination,
  PieChart,
  Popover,
  RadarChart,
  Radio,
  ScatterChart,
  Select,
  Skeleton,
  Stack,
  Switch,
  Tabs,
  Textarea,
  Toast,
  Tooltip,
  Tree,
  TreeNode,
  VirtualScroll,
} as const;

/**
 * Available component names
 */
export type ComponentName = keyof typeof components;
