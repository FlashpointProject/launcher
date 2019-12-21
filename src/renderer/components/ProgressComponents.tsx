import * as React from 'react';
import { ProgressData } from '../context/ProgressContext';
import { LangContext } from '../util/lang';

export type ProgressComponentProps = {
  /** Data to read from. */
  progressData: ProgressData;
  /** Class name to append to the wrapper. */
  wrapperClass?: string;
}

/** Choose a StatusBar or ProgressBar, letting the Progress handler decide. */
export function AutoProgressComponent(props: ProgressComponentProps) {
  if (!props.progressData.isDone) {
    if (props.progressData.usePercentDone) {
      return (
        <ProgressBar
          progressData={props.progressData}
          wrapperClass={props.wrapperClass} />
      );
    } else {
      return (
        <StatusBar
          progressData={props.progressData}
          wrapperClass={props.wrapperClass} />
      );
    }
  } else {
    return (<></>);
  }
}

/** Large centered primar text, smaller underneath secondary text. */
export function StatusBar(props: ProgressComponentProps) {
  return (
    <div className={(props.wrapperClass ? ' ' + props.wrapperClass : '') + 'progress-component__wrapper'}>
      <div className='status-bar__top-text'>{props.progressData.text}</div>
      { props.progressData.secondaryText ?
        <div className='status-bar__bottom-text'>
          {props.progressData.secondaryText}
        </div>
      : undefined }
    </div>
  );
}

/** Large top text `Percent% Complete`, medium progress bar, small underneath primary text. */
export function ProgressBar(props: ProgressComponentProps) {
  const strings = React.useContext(LangContext);
  const barCssProps: React.CSSProperties = React.useMemo(() => ({
    width: `${props.progressData.percentDone}%`
  }), [props.progressData.percentDone]);

  return (
    <div className={'progress-component__wrapper' + (props.wrapperClass ? ' ' + props.wrapperClass : '')}>
      <div className='progress-bar__top-text'>{`${Math.round(props.progressData.percentDone)}% ${strings.misc.complete}`}</div>
      <div className='progress-bar__bar'>
        <div className='progress-bar__bar__inner' style={barCssProps} />
      </div>
      { props.progressData.text ?
        <div className='progress-bar__bottom-text'>
          {props.progressData.text}
        </div>
      : undefined }
    </div>
  );
}
