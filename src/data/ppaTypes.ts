export type PpaFlow = "librelane" | "openlane" | "openroad";

export interface PpaAstSummary {
  format: "json" | "csv";
  bytesUtf8: number;
  rootKind: string;
  nodeCount: number;
  leafCount: number;
  maxDepth: number;
  standardJson: boolean | null;
  nonFiniteNumberNodes: number;
  duplicateKeyGroups: number;
  nodeKinds: Record<string, number>;
}

export interface PpaRunSummary {
  hasPpa: boolean;
  areaUm2: number | null;
  coreAreaUm2: number | null;
  instanceAreaUm2: number | null;
  utilization: number | null;
  instances: number | null;
  physicalInstances: number | null;
  macros: number | null;
  ioCount: number | null;
  totalPowerMw: number | null;
  powerComparisonValid: boolean;
  powerComparisonReason: string | null;
  internalPowerMw: number | null;
  switchingPowerMw: number | null;
  leakagePowerMw: number | null;
  referenceCorner: string | null;
  setupSlackNs: number | null;
  holdSlackNs: number | null;
  worstSetupSlackNs: number | null;
  worstHoldSlackNs: number | null;
  setupTnsNs: number | null;
  holdTnsNs: number | null;
  clockPeriodNs: number | null;
  criticalPathNs: number | null;
  fmaxHz: number | null;
  fmaxMethod: string | null;
  setupViolations: number | null;
  holdViolations: number | null;
  maxSlewViolations: number | null;
  maxCapViolations: number | null;
  maxFanoutViolations: number | null;
  wirelengthUm: number | null;
  vias: number | null;
  nets: number | null;
  routeDrcErrors: number | null;
  antennaViolations: number | null;
  flowErrors: number | null;
  flowWarnings: number | null;
  magicDrcErrors: number | null;
  averageIrDropV: number | null;
  worstIrDropV: number | null;
  cellUsageAvailable: boolean;
  finalDefComponents: number | null;
  uniqueCellMasters: number | null;
  metricCount: number | null;
  cornerSetupSlackNs: Record<string, number | null>;
  timingEndpointSlacks: PpaTimingEndpointSlackSummary;
  powerBreakdownMw: Record<"internal" | "switching" | "leakage", number | null>;
  metricsByCategory: Record<string, number>;
  completionStatus: string | null;
}

export interface PpaTimingEndpointSlackSummary {
  availability: "available" | "unavailable";
  referenceCorner: string | null;
  reason: string | null;
  setupEndpointCount: number;
  holdEndpointCount: number;
  setupViolationCount: number;
  holdViolationCount: number;
  setupSlackNs: number[];
  holdSlackNs: number[];
}

export interface PpaSourceBundle {
  flow: PpaFlow;
  run_directory: string;
  primary_source: string;
  supporting_sources: Array<{
    source: string;
    format: string;
    bytes: number;
    sha256: string;
  }>;
}

/**
 * One data-backed value in the Report scope faceted filter.
 *
 * Both dimensions and values live in the generated report manifest so the UI
 * never needs a hard-coded list of tools, RC variants, PVT corners, or future
 * experiment axes.
 */
export interface PpaReportFacet {
  category: string;
  categoryLabel: string;
  categoryOrder: number;
  dimension: string;
  dimensionLabel: string;
  value: string;
  valueLabel: string;
  dimensionOrder: number;
  valueOrder: number;
}

export interface PpaRunManifest {
  schemaVersion: string;
  uid: string;
  flow: PpaFlow;
  pdk: string;
  scl: string | null;
  design: string;
  runName: string;
  variant: string | null;
  techfileRcScale: number | null;
  filterFacets: PpaReportFacet[];
  sourceKind: "final-metrics-json" | "final-metrics-csv" | "terminal-state-json" | "normalized-metrics-json";
  relativePath: string;
  sourceSha256: string;
  bundleSha256: string;
  reportSchema: string;
  tool: string;
  scope: string;
  authoritativeOverallStatus: false;
  ast: PpaAstSummary;
  summary: PpaRunSummary;
  sourceBundle: PpaSourceBundle;
  reportPath: string;
}

export interface PpaRunIndex {
  schemaVersion: string;
  generatedAt: string;
  sourceRoot: string;
  parser: string;
  runCount: number;
  flows: PpaFlow[];
  pdks: string[];
  designs: string[];
  runs: PpaRunManifest[];
}

export interface PpaSourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface PpaSourceSpan {
  start: PpaSourcePosition;
  end: PpaSourcePosition;
}

export interface PpaMetricRecord {
  index: number;
  name: string;
  category: string | null;
  components: string[];
  qualifiers: Array<{ name: string; value: string }>;
  unit: string | null;
  kind: string;
  value: unknown;
  raw_value: string;
  span: PpaSourceSpan;
}

export interface PpaNormalizedMetricRecord {
  metric_id: string;
  value: unknown;
  unit: string | null;
  source?: string;
  source_field?: string;
  raw_value?: string;
  transformation?: string;
  note?: string;
  comparison_valid?: boolean;
  exclusion_reason?: string | null;
  span?: PpaSourceSpan;
}

export interface PpaStandardCellUsageRecord {
  master: string;
  count: number;
  first_source_line: number;
}

export interface PpaStandardCellUsage {
  schema: "def.components.v1";
  availability: "available" | "unavailable";
  source: string | null;
  sha256?: string;
  scope: string;
  reason?: string;
  declared_component_count: number | null;
  parsed_component_count: number | null;
  unique_master_count: number | null;
  cells: PpaStandardCellUsageRecord[];
}

export interface PpaTimingEndpointRecord {
  endpoint: string;
  corner?: string;
  slack_ns: number;
  status: "met" | "violated";
  source_line?: number;
}

export interface PpaTimingEndpointAnalysis {
  analysis?: "setup" | "hold";
  source?: string;
  sha256?: string;
  endpoint_count: number;
  violation_count: number;
  endpoints: PpaTimingEndpointRecord[];
}

export interface PpaTimingEndpointSlacks {
  schema: "opensta.endpoint-slacks.v1";
  availability: "available" | "unavailable";
  reference_corner: string | null;
  units: "ns";
  scope: string;
  reason?: string;
  source?: string;
  sha256?: string;
  setup: PpaTimingEndpointAnalysis;
  hold: PpaTimingEndpointAnalysis;
}

export interface PpaInterpretation {
  schema: string;
  tool: string;
  scope: string;
  authoritative_overall_status: false;
  boundaries: string[];
  metric_count?: number;
  metrics_by_category?: Record<string, number>;
  design?: Record<string, unknown>;
  timing_aggregate?: Record<string, unknown>;
  routing?: Record<string, unknown>;
  signoff_indicators?: Record<string, unknown>;
  power_mw?: Record<string, unknown>;
  ir_drop?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  experiment?: Record<string, unknown>;
  completion?: Record<string, unknown>;
  standard_cell_usage?: PpaStandardCellUsage;
  timing_endpoint_slacks?: PpaTimingEndpointSlacks;
  normalized_metric_provenance?: PpaNormalizedMetricRecord[];
  non_finite_metrics?: string[];
  all_metrics?: PpaMetricRecord[];
}

export interface PpaAstReport {
  schemaVersion: string;
  manifest: PpaRunManifest;
  ast: {
    source: string;
    format: "json" | "csv";
    bytes_utf8: number;
    sha256: string;
    root_kind: string;
    node_count_including_keys: number;
    leaf_count_including_keys: number;
    max_depth: number;
    node_kinds: Record<string, number>;
    duplicate_key_groups: number;
    duplicate_keys: unknown[];
    non_finite_number_nodes: number;
    standard_json: boolean | null;
  };
  source_bundle: PpaSourceBundle;
  interpretation: PpaInterpretation;
}
