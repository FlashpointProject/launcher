import { CurationWarnings } from '@shared/curate/types';
import * as React from 'react';
import { useMemo } from 'react';
import { LangContext } from '../util/lang';

export type CurateBoxWarningsProps = {
  /** Warnings to display. */
  warnings: CurationWarnings;
};

/** The part of a Curation Box that displays all the warnings (if any). */
export function CurateBoxWarnings(props: CurateBoxWarningsProps) {
  const strings = React.useContext(LangContext).curate;
  const { warnings } = props;
  // Count the number of warnings
  const warningCount = useMemo(() => getWarningCount(props.warnings), [props.warnings]);
  // Converts warnings into a single string
  const warningsStrings = useMemo(() => {
    return Object.keys(warnings).map((key) => {
      const obj = warnings[key as keyof CurationWarnings];
      // Reason obj to a string[] or boolean, format differently for each
      const listObj = obj && obj !== true ? obj : undefined;
      if (listObj && listObj.length > 0) {
        const suffix = '\t' + listObj.join('\n\t') + '\n';
        return `- ${strings[key as keyof CurationWarnings]}\n${suffix}`;
      } else if (!listObj && obj) {
        return `- ${strings[key as keyof CurationWarnings]}\n`;
      }
    });
  }, [warnings]);
  // Render warnings
  const warningElements = useMemo(() => (
    warningsStrings.length > 0 ? (
      <span
        className='curate-box-warnings__entry'>
        {`${warningsStrings.join('')}`}
      </span>
    ) : ( undefined )
  ), [warningsStrings]);
  // Misc.
  const isEmpty = warningCount === 0;
  // Render
  return (
    <>
      {/* Warnings */}
      <div className={'curate-box-warnings' + (isEmpty ? ' curate-box-warnings--empty' : '')}>
        <div className='curate-box-warnings__head'>
          {strings.warnings}: {warningCount}
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
function createCountTrueReducer<T>(obj: T) {
  return (previousValue: number, currentValue: string): number => (
    previousValue + (obj[currentValue as keyof T] ? 1 : 0)
  );
}

export function getWarningCount(warnings: CurationWarnings): number {
  let warningCount = Object.keys(warnings).reduce<number>(createCountTrueReducer(warnings), 0);
  // Remove 1 from counter if lists are empty
  if (warnings.unusedTags && warnings.unusedTags.length === 0) { warningCount--; }
  if (warnings.nonContentFolders && warnings.nonContentFolders.length === 0) { warningCount--; }
  if (warnings.invalidLaunchCommand && warnings.invalidLaunchCommand.length === 0) { warningCount--; }
  return warningCount;
}
