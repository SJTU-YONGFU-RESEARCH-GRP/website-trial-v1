export const API_SCHEMA_VERSION = "eda.api.v1" as const;
export const CAPABILITY_SCHEMA_VERSION = "eda.capability.v1" as const;
export const RESULT_SCHEMA_VERSION = "eda.result.v1" as const;

export type Id = string;
export type IsoDateTime = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ModuleId = "benchmark" | "digital" | "ppa";
export type UserRole = "admin" | "user";
export type JobStatus =
  | "draft"
  | "validating"
  | "ready"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "interrupted";
export type StepStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled" | "skipped" | "interrupted";
export type ResultLifecycle = "private" | "published" | "unpublished" | "deleted";
export type ArtifactVisibility = "private" | "published";
export type ToolHealthStatus = "healthy" | "degraded" | "unavailable" | "not_configured";
export type JobEventLevel = "debug" | "info" | "warning" | "error" | "success";
export type JobEventStream = "system" | "stdout" | "stderr" | "progress" | "artifact";

export interface UserRecordV1 {
  id: Id;
  username: string;
  role: UserRole;
  enabled: boolean;
  allowedModules: ModuleId[];
  maxConcurrentJobs: number;
  storageQuotaBytes: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  deletedAt: IsoDateTime | null;
}

export interface SessionRecordV1 {
  id: Id;
  userId: Id;
  csrfTokenHash: string;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
  lastSeenAt: IsoDateTime;
  revokedAt: IsoDateTime | null;
}

export interface InputFileV1 {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
  mediaType: string;
  recognizedType: string;
  role: string | null;
  required: boolean;
  usedByStepIds: string[];
  unresolvedIncludes: string[];
  validationErrors: string[];
}

export interface InputManifestV1 {
  schemaVersion: "eda.input-manifest.v1";
  files: InputFileV1[];
  totalBytes: number;
  fileCount: number;
  rootHint: string | null;
  createdAt: IsoDateTime;
}

export type ParameterType = "string" | "integer" | "number" | "boolean" | "enum" | "string-list" | "number-list";

export interface ParameterDefinitionV1 {
  id: string;
  label: string;
  description: string;
  type: ParameterType;
  unit: string | null;
  required: boolean;
  defaultValue: JsonValue;
  minimum: number | null;
  maximum: number | null;
  enumValues: JsonPrimitive[];
  sweepable: boolean;
  toolVersionRange: string | null;
  mapping: {
    kind: "argv" | "generated-config" | "environment";
    key: string;
  };
}

export interface InputRoleDefinitionV1 {
  id: string;
  label: string;
  description: string;
  required: boolean;
  multiple: boolean;
  extensions: string[];
  recognizedTypes: string[];
}

export interface ToolCapabilityV1 {
  schemaVersion: typeof CAPABILITY_SCHEMA_VERSION;
  capabilityVersion: string;
  toolId: string;
  moduleId: ModuleId;
  label: string;
  description: string;
  health: ToolHealthStatus;
  healthReason: string | null;
  toolVersion: string | null;
  operations: string[];
  inputRoles: InputRoleDefinitionV1[];
  parameters: ParameterDefinitionV1[];
  plannedStepTemplates: PlannedStepV1[];
  limits: JsonObject;
}

export interface ToolConfigurationSnapshotV1 {
  id: Id;
  toolId: string;
  moduleId: ModuleId;
  revision: number;
  enabled: boolean;
  rootPath: string | null;
  executablePath: string | null;
  interpreterPath: string | null;
  entryPoint: string | null;
  workingDirectory: string | null;
  timeoutSeconds: number;
  maxConcurrency: number;
  environmentNames: string[];
  versionProbeArgv: string[];
  adapterId: string;
  adapterVersion: string;
  capturedAt: IsoDateTime;
}

export interface TechnologyLibraryV1 {
  id: Id;
  technologyId: string;
  processNode: string;
  pdk: string;
  standardCellLibrary: string;
  libertyPaths: string[];
  techLefPath: string | null;
  cellLefPaths: string[];
  corner: string;
  voltage: number | null;
  rcCorner: string | null;
  allowedAdapterIds: string[];
  enabled: boolean;
  revision: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PlannedProcessV1 {
  toolConfigurationId: Id;
  executableDisplay: string;
  argv: string[];
  cwdRelative: string;
  environmentNames: string[];
  timeoutSeconds: number;
}

export interface PlannedStepV1 {
  id: string;
  name: string;
  description: string;
  required: boolean;
  weight: number;
  process: PlannedProcessV1 | null;
  inputRoles: string[];
  outputRoles: string[];
}

export interface JobPlanV1 {
  schemaVersion: "eda.job-plan.v1";
  capabilityVersion: string;
  steps: PlannedStepV1[];
  sweep: {
    dimensions: Record<string, JsonPrimitive[]>;
    runCount: number;
    maxRunCount: number;
  } | null;
  warnings: string[];
}

export interface StructuredJobErrorV1 {
  type: "validation" | "configuration" | "tool_exit" | "timeout" | "cancelled" | "parser" | "storage" | "internal";
  code: string;
  message: string;
  stepId: Id | null;
  retryable: boolean;
  details: JsonObject | null;
}

export interface JobRecordV1 {
  id: Id;
  ownerId: Id;
  moduleId: ModuleId;
  operation: string;
  workflow: string;
  status: JobStatus;
  inputManifest: InputManifestV1;
  parameters: JsonObject;
  capabilityVersion: string;
  toolConfigurations: ToolConfigurationSnapshotV1[];
  toolVersions: Record<string, string | null>;
  plan: JobPlanV1;
  workspaceRelativePath: string;
  currentStepId: Id | null;
  sweepParentJobId: Id | null;
  retryOfJobId: Id | null;
  resultId: Id | null;
  progress: number;
  exitCode: number | null;
  error: StructuredJobErrorV1 | null;
  createdAt: IsoDateTime;
  queuedAt: IsoDateTime | null;
  startedAt: IsoDateTime | null;
  finishedAt: IsoDateTime | null;
  updatedAt: IsoDateTime;
}

export interface JobStepRecordV1 {
  id: Id;
  jobId: Id;
  ordinal: number;
  stepKey: string;
  name: string;
  status: StepStatus;
  progress: number;
  processId: number | null;
  processGroupId: number | null;
  exitCode: number | null;
  startedAt: IsoDateTime | null;
  finishedAt: IsoDateTime | null;
  error: StructuredJobErrorV1 | null;
}

export interface JobEventRecordV1 {
  id: number;
  jobId: Id;
  stepId: Id | null;
  sequence: number;
  at: IsoDateTime;
  level: JobEventLevel;
  stream: JobEventStream;
  message: string;
  payload: JsonObject | null;
}

export interface ArtifactRecordV1 {
  id: Id;
  jobId: Id;
  resultId: Id | null;
  ownerId: Id;
  moduleId: ModuleId;
  stepId: Id | null;
  role: string;
  relativePath: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
  visibility: ArtifactVisibility;
  createdAt: IsoDateTime;
}

export interface ResultProvenanceV1 {
  origin: "computed" | "imported" | "legacy-bundled";
  jobId: Id | null;
  ownerId: Id | null;
  inputManifestSha256: string;
  parameters: JsonObject;
  capabilityVersion: string;
  toolConfigurations: ToolConfigurationSnapshotV1[];
  toolVersions: Record<string, string | null>;
  parserId: string;
  parserVersion: string;
  createdAt: IsoDateTime;
}

export interface ResultRecordV1<TData extends JsonObject = JsonObject> {
  schemaVersion: typeof RESULT_SCHEMA_VERSION;
  id: Id;
  moduleId: ModuleId;
  ownerId: Id | null;
  lifecycle: ResultLifecycle;
  title: string;
  summary: JsonObject;
  data: TData;
  provenance: ResultProvenanceV1;
  artifactIds: Id[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  publishedAt: IsoDateTime | null;
}

export interface ToolConfigurationV1 extends ToolConfigurationSnapshotV1 {
  environment: Record<string, string>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ToolHealthCheckV1 {
  id: Id;
  toolConfigurationId: Id;
  status: ToolHealthStatus;
  version: string | null;
  checkedAt: IsoDateTime;
  durationMs: number;
  message: string;
  missingDependencies: string[];
  selfTestPassed: boolean | null;
}

export interface AuditLogV1 {
  id: number;
  actorUserId: Id | null;
  action: string;
  targetType: string;
  targetId: Id | null;
  ipAddress: string | null;
  userAgent: string | null;
  at: IsoDateTime;
  details: JsonObject;
}

export interface ApiSuccessV1<T> {
  schemaVersion: typeof API_SCHEMA_VERSION;
  data: T;
  meta?: {
    nextCursor?: string | null;
    updatedAt?: IsoDateTime;
    etag?: string;
  };
}

export interface ApiErrorV1 {
  schemaVersion: typeof API_SCHEMA_VERSION;
  error: {
    code: string;
    message: string;
    details: JsonObject | null;
    requestId: string;
  };
}

export interface DraftCreateRequestV1 {
  operation: string;
  workflow: string;
}

export interface DraftPatchRequestV1 {
  fileRoles?: Record<string, string>;
  parameters?: JsonObject;
  technologyLibraryId?: Id | null;
}

export interface JobQueryV1 {
  cursor?: string;
  limit?: number;
  moduleId?: ModuleId;
  status?: JobStatus;
  ownerId?: Id;
  from?: IsoDateTime;
  to?: IsoDateTime;
}

export interface ResultQueryV1 {
  cursor?: string;
  limit?: number;
  search?: string;
  lifecycle?: ResultLifecycle;
  ownerId?: Id;
  filters?: Record<string, JsonPrimitive[]>;
}

export interface AuthMeV1 {
  user: UserRecordV1;
  csrfToken: string;
}

export interface ModuleCapabilityResponseV1 {
  moduleId: ModuleId;
  capabilities: ToolCapabilityV1[];
  technologies: TechnologyLibraryV1[];
  maxSweepJobs: number;
}

export interface ModuleContextV1 {
  moduleId: ModuleId;
  storageRoot: string;
  now(): IsoDateTime;
}

export interface DraftValidationContextV1 extends ModuleContextV1 {
  job: JobRecordV1;
  files: InputFileV1[];
  technology: TechnologyLibraryV1 | null;
}

export interface StepExecutionContextV1 extends ModuleContextV1 {
  job: JobRecordV1;
  step: JobStepRecordV1;
  workspacePath: string;
  abortSignal: AbortSignal;
  emit(event: Omit<JobEventRecordV1, "id" | "sequence">): Promise<void>;
}

export interface ParsedModuleResultV1 {
  title: string;
  summary: JsonObject;
  data: JsonObject;
  artifactRoles: string[];
  parserId: string;
  parserVersion: string;
}

export interface CollectedArtifactV1 {
  role: string;
  relativePath: string;
  mediaType: string;
  required: boolean;
  publish: boolean;
}

export interface ModuleAdapterV1 {
  readonly moduleId: ModuleId;
  capabilities(context: ModuleContextV1): Promise<ToolCapabilityV1[]>;
  validateDraft(context: DraftValidationContextV1): Promise<{ valid: boolean; errors: StructuredJobErrorV1[]; warnings: string[] }>;
  buildPlan(context: DraftValidationContextV1): Promise<JobPlanV1>;
  executeStep(context: StepExecutionContextV1): Promise<{ exitCode: number; outputs: JsonObject }>;
  parseResult(context: StepExecutionContextV1): Promise<ParsedModuleResultV1>;
  publishResult(context: StepExecutionContextV1, result: ParsedModuleResultV1): Promise<void>;
  collectArtifacts(context: StepExecutionContextV1): Promise<CollectedArtifactV1[]>;
}
