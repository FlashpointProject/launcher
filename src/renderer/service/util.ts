import { IService, ProcessState, ServiceableProcess } from '../../shared/service/interfaces';
import { deepCopy } from '../../shared/Util';

// Helper functions for interacting with the Service Api from the renderer

/**
 * Finds and sends changes of a process to the Service Api
 * @param process Serviceable Process
 */
export function onProcessUpdate(process: ServiceableProcess) {
  const newState = process.getState();
  let data : Partial<IService> = {
    identifier: process.identifier,
    state: newState
  };

  // New process, update pid and start time
  if (newState === ProcessState.RUNNING) {
    data = {
      pid: process.getPid(),
      startTime: process.getStartTime(),
      ...data
    };
  }
  return sendUpdate([data]);
}

/**
 * Registers a process as a service with Service Api
 * @param process Serviceable Process
 */
export function registerService(process: ServiceableProcess) {
  return sendUpdate([deepCopy(process)]);
}

function sendUpdate(data: Partial<IService>[]) {
  if (data) { window.External.services.updateServices(data); }
}