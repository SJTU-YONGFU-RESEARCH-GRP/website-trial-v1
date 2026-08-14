import type {
  ArtifactRecordV1,
  JobEventRecordV1,
  JobRecordV1,
  JobStepRecordV1,
  ResultRecordV1,
} from "../../../shared/contracts/v1";

export interface JobDetailV1 {
  job: JobRecordV1;
  steps: JobStepRecordV1[];
  artifacts: ArtifactRecordV1[];
  latestEvents: JobEventRecordV1[];
  sweepJobs: JobRecordV1[];
}

export type JobResultV1 = ResultRecordV1;
