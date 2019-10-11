export type IBackProcessInfo = {
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
};

/** State of a managed process. */
export enum ProcessState {
  /** The process is not running. */
  STOPPED,
  /** The process is running. */
  RUNNING,
  /** The process is being killed (it has been requested to terminate, but it hasn't been terminated yet). */
  KILLING
}

/** Actions that can be performed on a service. */
export enum ProcessAction {
  /** Start the process if it is stopped */
  START,
  /** Stop the process if it is running */
  STOP,
  /** Stop the process if it is running, then start the process */
  RESTART
}

/** Object describing the state of a service. */
export type IService = {
  identifier: string;
  name: string;
  state: ProcessState;
  pid: number;
  startTime: number;
  info?: IBackProcessInfo;
};

/** A service action directed at a specific service (by identifier). */
export type IServiceAction = {
  /** Identifier of the service the action is for. */
  identifier: string;
  /** Action to perform on service. */
  action: ProcessAction;
};
