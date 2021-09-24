export interface Event {
  InstanceId: string,
  secondRun?: boolean,
  checkPassed?: boolean,
  failedInFirstRun?: string,
  failedInSecondRun?: string,
}
