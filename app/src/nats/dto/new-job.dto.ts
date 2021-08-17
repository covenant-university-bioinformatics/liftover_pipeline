export enum AnaylsisTypes {
  TESTJOB = 'testjob',
  IMPUTATION = 'imputation',
  BAYES_FINEMAP = 'bayes-finemap',
  LDSTRUCTURE = 'ld-structure',
  FINEMAP = 'finemap',
  ANNOTATION = 'annotation',
  REPRIORITIZATION = 're-prioritization',
}

export class NewJobDto {
  jobId: string;
  jobName: string;
  jobUID: string;
  analysisTypes: AnaylsisTypes[];
  filename: string;
  username: string;
  email: string;
}
