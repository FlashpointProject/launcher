import * as React from 'react';
import { useMemo } from 'react';

export type CurateBoxWarningsProps = {
  /** Warnings to display. */
  warnings: CurationWarnings;
};

/** A set of warnings for things that should be fixed in a curation. */
export type CurationWarnings = {
  /** If the launch command is not a url with the "http" protocol. */
  isNotHttp?: boolean;
};

/** The part of a Curation Box that displays all the warnings (if any). */
export function CurateBoxWarnings(props: CurateBoxWarningsProps) {
  const { warnings } = props;
  // Count the number of warnings
  const warningCount = useMemo(() =>
    Object.keys(warnings).reduce<number>(createCountTrueReducer(warnings), 0),
  [warnings]);
  // Render warnings
  const warningElements = useMemo(() => (
    Object.keys(warnings).map((key) => 
      warnings[key as keyof CurationWarnings] ? (
        <span
          key={key}
          className='curate-box-warnings__entry'>
          {`${key} - ${warningDescriptions[key as keyof CurationWarnings]}\n`}
        </span>
      ) : undefined)
  ), [warnings]);
  // Misc.
  const isEmpty = warningCount === 0;
  // Render
  return (
    <>
      {/* Warnings */}
      <div className={'curate-box-warnings' + (isEmpty ? ' curate-box-warnings--empty' : '')}>
        <div className='curate-box-warnings__head'>
          Warnings: {warningCount}
        </div>
        <pre className='curate-box-warnings__body'>
          {warningElements}
        </pre>
      </div>
      {/* Divider */}
      { !isEmpty ? <hr className='curate-box-divider' /> : undefined }
    </>
  );
}

/**
 * Return a reducer that counts the number of "true-y" values of an object.
 * @param obj Object to iterate over.
 */
function createCountTrueReducer<T extends object>(obj: T) {
  return (previousValue: number, currentValue: string): number => (
    previousValue + (obj[currentValue as keyof T] ? 1 : 0)
  );
}

type WarningDescriptionContainer = {
  [key in keyof CurationWarnings]: string;
};

const warningDescriptions: WarningDescriptionContainer = {
  isNotHttp: 'The "Launch Command" is not a URL using the HTTP protocol.',
}
