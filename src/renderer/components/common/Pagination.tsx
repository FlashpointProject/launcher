import * as React from 'react';
import { Link } from 'react-router-dom';
import { IDefaultProps } from '../../interfaces';

export interface IPagination extends IDefaultProps {
  /** Callback for when a page index (or a next / previous button) is clicked */
  onChange?: (index: number) => void;
  /** Number of pages */
  length?: number;
  /** Index of current page */
  current?: number;
}

export class Pagination extends React.Component<IPagination, {}> {
  render() {
    const mp: number = 13; // Max Pages (shown at once)
    const gp: number = 2;  // Gap Pages (how many pages will be shown after the gap)
    const { onChange = noop, length = 0, current = 0 } = this.props;
    let first: number = Math.max(current - Math.floor(mp/2), 0);
    let last: number  = Math.min(first + mp, length);
    const beforeGap: boolean = (first > 0);
    const afterGap: boolean  = (last < length);
    if (beforeGap) { first += gp; }
    if (afterGap)  { last  -= gp; }
    return (
      <div className="pagination">
        {/* Previous */}
        {(current > 0) ? (
          <a className="prev_page link" onClick={() => onChange(current-1)}>« Previous</a>
        ) : (
          <span className="disabled prev_page">« Previous</span>
        )}
        {/* Left Gap */}
        {(beforeGap) && (
          <>
            {repeat(gp, (i: number) => {
              return (<a key={i} className="link" onClick={() => onChange(i)}>{i+1}</a>);
            })}
            <span className="gap">...</span>
          </>
        )}
        {/* Center */}
        {(
          <>
            {repeat(last - first, (i: number) => {
              i = first + i;
              if (i === current) {
                return (<span key={i} className="current">{i+1}</span>);
              } else {
                return (<a key={i} className="link" onClick={() => onChange(i)}>{i+1}</a>);
              }
            })}
          </>
        )}
        {/* Right Gap */}
        {(afterGap) && (
          <>
            <span className="gap">...</span>
            {repeat(gp, (i: number) => {
              i = length - gp + i;
              return (<a key={i} className="link" onClick={() => onChange(i)}>{i+1}</a>);
            })}
          </>
        )}
        {/* Next */}
        {(current+1 < length) ? (
          <a className="next_page link" onClick={() => onChange(current+1)}>Next »</a>
        ) : (
          <span className="disabled next_page">Next »</span>
        )}
      </div>
    );
  }
}

function noop(): void { /* Do nothing! */ }

/** Call a function a number of times, store all the returned values in an array and then return it */
function repeat<T = any>(times: number, callback: (index: number) => T): T[] {
  const vals: T[] = [];
  for (let i = 0; i < times; i++) {
    vals.push(callback(i));
  }
  return vals;
}
