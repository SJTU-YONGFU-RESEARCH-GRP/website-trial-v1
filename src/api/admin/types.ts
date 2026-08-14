import type {
  AuditLogV1,
  JobRecordV1,
  JobStatus,
  ModuleId,
  ResultLifecycle,
  ResultRecordV1,
  TechnologyLibraryV1,
  ToolConfigurationV1,
  ToolHealthCheckV1,
  UserRecordV1,
  UserRole,
} from "../../../shared/contracts/v1";

export interface AdminJobFilters {
  ownerId?: string;
  moduleId?: ModuleId;
  status?: JobStatus;
  limit?: number;
}

export interface AdminResultFilters {
  moduleId?: ModuleId;
  lifecycle?: ResultLifecycle;
  limit?: number;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
  allowedModules: ModuleId[];
  maxConcurrentJobs: number;
  storageQuotaBytes: number;
}

export type UpdateUserInput = Partial<Pick<
  UserRecordV1,
  "role" | "enabled" | "allowedModules" | "maxConcurrentJobs" | "storageQuotaBytes"
>> & { password?: string; delete?: boolean };

export type ToolConfigurationInput = Omit<
  ToolConfigurationV1,
  "id" | "revision" | "capturedAt" | "createdAt" | "updatedAt"
>;

export type TechnologyLibraryInput = Omit<
  TechnologyLibraryV1,
  "id" | "revision" | "createdAt" | "updatedAt"
>;

export interface PathCheckV1 {
  ok: boolean;
  executable: string | null;
  root: string | null;
  entryPoint: string | null;
  errors: string[];
}

export interface AdminOverviewV1 {
  userCount: number;
  jobStatus: Record<string, number>;
  moduleQueues: Record<string, { queued: number; running: number }>;
  resultCounts: Record<string, number>;
  tools: Array<{ id: string; toolId: string; moduleId: ModuleId; enabled: boolean; health: ToolHealthCheckV1 | null }>;
  storage: { totalBytes: number; fileCount: number; byArea: Record<string, number> };
  recentFailures: JobRecordV1[];
}

export type SelfTestV1 = ToolHealthCheckV1;

export type {
  AuditLogV1,
  JobRecordV1,
  ResultRecordV1,
  TechnologyLibraryV1,
  ToolConfigurationV1,
  ToolHealthCheckV1,
  UserRecordV1,
};
