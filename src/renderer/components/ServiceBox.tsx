import { BackIn, ServiceActionData } from '@shared/back/types';
import { IBackProcessInfo, IService, ProcessAction, ProcessState } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { ILogEntry } from '@shared/Log/interface';
import { escapeHTML, formatTime, padLines, timeChars } from '@shared/Log/LogCommon';
import { remote } from 'electron';
import * as React from 'react';
import { setInterval } from 'timers';
import { LangContext } from '../util/lang';
import { LogData } from './LogData';
import { SimpleButton } from './SimpleButton';

export type ServiceBoxProps = {
  /** Service to display. */
  service: IService;
};

/** A box that displays information about, and lets you interact with, a single service. */
export function ServiceBox(props: ServiceBoxProps) {
  const { service } = props;
  // Get language strings
  const lang = React.useContext(LangContext);
  const strings = lang.developer;
  // Log
  const entries = window.Shared.log.entries;
  const logData = React.useMemo(() => {
    return stringifyServiceLogEntries(entries, service.name);
  }, [entries, entries.length, service.name]);
  // Uptime
  const uptimeRef = React.useRef<HTMLDivElement>(null);
  useInterval(() => { // (Update the value of the timer at an interval)
    // @PERF This interval still runs and updates the uptime even when the process is not running.
    if (uptimeRef.current) {
      const text = (service.state === ProcessState.RUNNING)
        ? formatMsTime(Date.now() - service.startTime)
        : '';
      if (uptimeRef.current.innerText !== text) {
        uptimeRef.current.innerText = text;
      }
    }
  }, 50, [service, service.startTime]);
  // Button callbacks
  const onStopClick    = useProcessActionCallback(ProcessAction.STOP,    service.id);
  const onStartClick   = useProcessActionCallback(ProcessAction.START,   service.id);
  const onRestartClick = useProcessActionCallback(ProcessAction.RESTART, service.id);
  const onDetailsClick = React.useCallback(() => {
    displayDetails(service.info);
  }, [service.info]);
  // Misc
  const statusText = generateStatusText(service, strings);
  // Render
  return (
    <div className='service-box'>
      {/* Title */}
      <div className='service-box__head-top'>
        <div className='service-box__title'>
          {service.name}
        </div>
        <div className='service-box__status'>
          {statusText}
        </div>
      </div>
      {/* Uhm */}
      <div className='service-box__head-bottom'>
        <div className='service-box__buttons'>
          {/* Start / Stop Button */}
          { service.state === ProcessState.RUNNING ? (
            <SimpleButton
              className='service-box__button'
              value={strings.stop}
              title={strings.stopDesc}
              onClick={onStopClick} />
          ) : (
            <SimpleButton
              className='service-box__button'
              value={strings.start}
              title={strings.startDesc}
              onClick={onStartClick} />
          )}
          {/* Restart Button */}
          <SimpleButton
            className='service-box__button'
            value={strings.restart}
            title={strings.restartDesc}
            onClick={onRestartClick} />
          {/* Details Button */}
          { service.info ? (
            <SimpleButton
              className='service-box__button'
              value={strings.details}
              title={strings.detailsDesc}
              onClick={onDetailsClick} />
          ) : undefined }
        </div>
        <div
          className='service-box__uptime'
          ref={uptimeRef}>
          { '' }
        </div>
      </div>
      {/* Log */}
      <LogData
        className='service-box__log'
        logData={logData}
        isLogDataHTML={true} />
    </div>
  );
}

/**
 * Generate a human readable status text from a service.
 * @param service Service to generate the text about.
 * @param lang Language object.
 */
function generateStatusText(service: IService, lang: LangContainer['developer']): string {
  switch (service.state) {
    default: throw new Error('Failed to generate status text. Unexpected process state value.');
    case ProcessState.RUNNING:
      return `${lang.running} (PID: ${service.pid})`;
    case ProcessState.KILLING:
      return `${lang.killing} (PID: ${service.pid})`;
    case ProcessState.STOPPED:
      return lang.stopped;
  }
}

/**
 * Display the info of a service in a dialog window.
 * @param info Info to display.
 */
function displayDetails(info: IBackProcessInfo): void {
  remote.dialog.showMessageBox({
    type: 'info',
    title: 'Service Details',
    message: `Path: ${info.path}\n`+
              `Filename: ${info.filename}\n`+
              `Arguments: ${info.arguments}\n`+
              `Kill on Exit: ${info.kill}`,
    buttons: ['Ok']
  });
}

/**
 * Return a memoized callback that sends a request to perform an action on a service.
 * @param action Action to perform (this value is only read the first time).
 * @param id Identifier of the service.
 */
function useProcessActionCallback(action: ProcessAction, id: string): () => void {
  return React.useCallback(() => {
    window.Shared.back.send<any, ServiceActionData>(BackIn.SERVICE_ACTION, { id, action });
  }, [id]);
}

/**
 * Set an interval (wrapper around the "setInterval" function).
 * @param callback Function to call every interval.
 * @param ms Minimum time between each call.
 * @param deps If present, the interval will reset if any value in the array change.
 */
function useInterval(callback: () => void, ms: number, deps?: any[]): void {
  React.useEffect(() => {
    const interval = setInterval(callback, ms);
    return () => { clearInterval(interval); };
  }, deps);
}

/**
 * Stringify all entires that are from a specific source.
 * @param entries Entries to stringify.
 * @param source The source to filter by.
 */
function stringifyServiceLogEntries(entries: ILogEntry[], source: string): string {
  let str = '';
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    // Temp fix for array gap
    if (entry && (entry.source === source)) {
      str += `<span class="log__time-stamp">[${formatTime(new Date(entry.timestamp))}]</span> `;
      str += padLines(escapeHTML(entry.content), timeChars + 2);
      str += '\n';
    }
  }
  return str;
}

/**
 * Format time as a string of hours, minutes and seconds ("hh:mm:ss").
 * @param ms Time (in milliseconds).
 */
function formatMsTime(ms: number): string {
  let hours = String(Math.floor((ms / (1000 * 60 * 60)) % 24));
  let mins  = String(Math.floor((ms / (1000 * 60))      % 60));
  let secs  = String(Math.floor((ms /  1000)            % 60));

  hours = (hours.length < 2) ? '0' + hours : hours;
  mins  = (mins.length  < 2) ? '0' + mins  : mins;
  secs  = (secs.length  < 2) ? '0' + secs  : secs;

  return hours + ':' + mins + ':' + secs;
}
