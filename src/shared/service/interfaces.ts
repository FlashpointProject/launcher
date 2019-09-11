export interface IBackProcessInfo {
  /** Path of the file (relative to the Flashpoint root) */
  path: string;
  /** Name of the file to execute */
  filename: string;
  /** Arguments to pass to the process */
  arguments: string[];
  /**
   * If the process should be "killed" when shutting down
   * (This does not do anything for "start" and "stop" processes)
   */
  kill: boolean;
}

export enum ProcessState {
  /** The process is stopped or has not been spawned yet. */
  STOPPED,
  /** The process is running. */
  RUNNING,
  /** The process is being killed (it has been requested to terminate, but it hasn't been terminated yet). */
  KILLING
}

export enum ProcessAction {
  /** Start the process if it is stopped */
  START,
  /** Stop the process if it is running */
  STOP,
  /** Stop the process if it is running, then start the process */
  RESTART
}

/** Data describing the state of a background service */
export type IService = {
  name: string;
  state: ProcessState;
  pid: number;
  startTime: number;
  info?: IBackProcessInfo;
}

/** Stored data describing the new state of 1 or more services */
export type IServicesData = IService[];

/** Partial updates sent or fetched describing changed services */
export type IServicesUpdate = Partial<IService>[];

/** Data describing an action to be taken on a service */
export type IServiceAction = {
  name: string,
  action: ProcessAction
}