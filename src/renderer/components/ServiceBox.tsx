import { remote } from 'electron';
import * as React from 'react';
import { IBackgroundService, IBackgroundServicesAction, IBackProcessInfo } from '../../shared/background/interfaces';
import { ArgumentTypesOf } from '../../shared/interfaces';
import { stringifyLogEntries } from '../../shared/Log/LogCommon';
import { memoizeOne } from '../../shared/memoize';
import { shallowStrictEquals } from '../../shared/Util';
import { LogData } from './LogData';

export type ServiceBoxProps = {
  /** Service to use */
  service: IBackgroundService;
};

/** Title bar of the window (the top-most part of the window). */
export class ServiceBox extends React.Component<ServiceBoxProps> {

  stringifyLogEntriesMemo = memoizeOne(stringifyLogEntries, stringifyLogEntriesEquals);

  getLogString(source: string) {
    const logEntries = Object.assign([], window.External.log.entries);
    let filter : any = {};
    filter[source] = true;
    return this.stringifyLogEntriesMemo(logEntries, filter);
  }

  sendAction = (data: IBackgroundServicesAction): void => {
    window.External.backgroundServices.sendAction(data);
  };

  onDetailsClick = (info: IBackProcessInfo): void => {
    remote.dialog.showMessageBox({
      type: 'info',
      title: 'Service Details',
      message:  'Path: ' + info.path +
                '\nFilename: ' + info.filename +
                '\nArguments: ' + info.arguments +
                '\nKill on Exit: ' + info.kill,
      buttons: ['Ok']
    } );
  };

  render() {
    const { service } = this.props;
    const logData = this.getLogString(service.name);

    return (
      <div>
        <div className='developer__service'>
          <div className='developer__service__top'>
            <div className='developer__service__title'>
              <p>{service.name}</p>
            </div>
            <div className='developer__service__filename'>
              {service.info.filename}
            </div>
            <div className='developer__service__status'>
              {service.active ? 'Running (' + service.pid + ')' : 'Stopped'}
            </div>
          </div>
          <div className='developer__service__buttons'>
          { service.active ? (
          <input
            type='button'
            value='Stop'
            className='simple-button'
            title='Stop the running service'
            onClick={() => { this.sendAction({name: service.name, action: 'stop'}); }}/>
          ) :
          <input
              type='button'
              value='Start'
              className='simple-button'
              title='Start the stopped service'
              onClick={() => { this.sendAction({name: service.name, action: 'start'}); }}/>
          }
          <input
              type='button'
              value='Details'
              className='simple-button'
              title='Show details of service'
              onClick={() => { if (service) { this.onDetailsClick(service.info); } }}/>
          </div>
          <div className="log-page">
            <LogData
              className='developer__service__log'
              logData={logData}
              isLogDataHTML={true} />
          </div>
        </div>
      </div>
    );
  }
}

type ArgsType = ArgumentTypesOf<typeof stringifyLogEntries>;
function stringifyLogEntriesEquals(newArgs: ArgsType, prevArgs: ArgsType): boolean {
  return (newArgs[0].length === prevArgs[0].length) && // (Only compare lengths of log entry arrays)
        shallowStrictEquals(newArgs[1], prevArgs[1]); // (Do a proper compare of the filters)
}