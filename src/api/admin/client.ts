import type { JobRecordV1, ModuleCapabilityResponseV1, ModuleId, ResultLifecycle } from "../../../shared/contracts/v1";
import { apiJsonBody, apiRequest } from "../client";
import type {
  AdminJobFilters,
  AdminOverviewV1,
  AdminResultFilters,
  AuditLogV1,
  CreateUserInput,
  PathCheckV1,
  ResultRecordV1,
  SelfTestV1,
  TechnologyLibraryInput,
  TechnologyLibraryV1,
  ToolConfigurationInput,
  ToolConfigurationV1,
  ToolHealthCheckV1,
  UpdateUserInput,
  UserRecordV1,
} from "./types";

function query<T extends object>(values: T): string {
  const params = new URLSearchParams();
  Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function listAdminUsers(): Promise<UserRecordV1[]> {
  return (await apiRequest<UserRecordV1[]>("/admin/users")).data;
}

export async function getAdminOverview(): Promise<AdminOverviewV1> {
  return (await apiRequest<AdminOverviewV1>("/admin/overview")).data;
}

export async function createAdminUser(input: CreateUserInput): Promise<UserRecordV1> {
  return (await apiRequest<UserRecordV1>("/admin/users", {
    method: "POST",
    body: apiJsonBody(input),
  })).data;
}

export async function updateAdminUser(id: string, input: UpdateUserInput): Promise<UserRecordV1> {
  return (await apiRequest<UserRecordV1>(`/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: apiJsonBody(input),
  })).data;
}

export async function listAdminJobs(filters: AdminJobFilters = {}): Promise<JobRecordV1[]> {
  return (await apiRequest<JobRecordV1[]>(`/admin/jobs${query(filters)}`)).data;
}

export async function interruptAdminJob(id: string): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/admin/jobs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: apiJsonBody({ status: "interrupted" }),
  })).data;
}

export async function listAdminResults(filters: AdminResultFilters = {}): Promise<ResultRecordV1[]> {
  return (await apiRequest<ResultRecordV1[]>(`/admin/results${query(filters)}`)).data;
}

export async function updateResultLifecycle(
  moduleId: ModuleId,
  id: string,
  lifecycle: ResultLifecycle,
): Promise<ResultRecordV1> {
  return (await apiRequest<ResultRecordV1>(
    `/admin/results/${moduleId}/${encodeURIComponent(id)}`,
    { method: "PATCH", body: apiJsonBody({ lifecycle }) },
  )).data;
}

export async function listToolConfigurations(): Promise<ToolConfigurationV1[]> {
  return (await apiRequest<ToolConfigurationV1[]>("/admin/tools")).data;
}

export async function createToolConfiguration(input: ToolConfigurationInput): Promise<ToolConfigurationV1> {
  return (await apiRequest<ToolConfigurationV1>("/admin/tools", {
    method: "POST",
    body: apiJsonBody(input),
  })).data;
}

export async function updateToolConfiguration(id: string, input: ToolConfigurationInput): Promise<ToolConfigurationV1> {
  return (await apiRequest<ToolConfigurationV1>(`/admin/tools/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: apiJsonBody(input),
  })).data;
}

export async function probeToolConfiguration(id: string): Promise<ToolHealthCheckV1> {
  return (await apiRequest<ToolHealthCheckV1>(`/admin/tools/${encodeURIComponent(id)}/probe`, {
    method: "POST",
  })).data;
}

export async function checkToolPaths(id: string): Promise<PathCheckV1> {
  return (await apiRequest<PathCheckV1>(`/admin/tools/${encodeURIComponent(id)}/check`, {
    method: "POST",
  })).data;
}

export async function runToolSelfTest(id: string): Promise<SelfTestV1> {
  return (await apiRequest<SelfTestV1>(`/admin/tools/${encodeURIComponent(id)}/self-test`, {
    method: "POST",
  })).data;
}

export async function getModuleCapabilities(moduleId: ModuleId): Promise<ModuleCapabilityResponseV1> {
  return (await apiRequest<ModuleCapabilityResponseV1>(`/modules/${moduleId}/capabilities`)).data;
}

export async function listTechnologyLibraries(): Promise<TechnologyLibraryV1[]> {
  return (await apiRequest<TechnologyLibraryV1[]>("/admin/technologies")).data;
}

export async function createTechnologyLibrary(input: TechnologyLibraryInput): Promise<TechnologyLibraryV1> {
  return (await apiRequest<TechnologyLibraryV1>("/admin/technologies", {
    method: "POST",
    body: apiJsonBody(input),
  })).data;
}

export async function updateTechnologyLibrary(
  id: string,
  input: TechnologyLibraryInput,
): Promise<TechnologyLibraryV1> {
  return (await apiRequest<TechnologyLibraryV1>(`/admin/technologies/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: apiJsonBody(input),
  })).data;
}

export async function listAuditLogs(limit = 200): Promise<AuditLogV1[]> {
  return (await apiRequest<AuditLogV1[]>(`/admin/audit?limit=${limit}`)).data;
}
