import { useLocalization } from '@renderer/hooks/useLocalization';
import { CurationWarnings, LangContainer } from 'flashpoint-launcher';

export type CurateBoxWarningsProps = {
  /** Warnings to display. */
  warnings: CurationWarnings;
};

// The part of a Curation Box that displays all the warnings (if any).
export function CurateBoxWarnings(props: CurateBoxWarningsProps) {
  const strings = useLocalization().curate;
  const { warnings } = props;
  // Count the number of warnings
  const warningCount = props.warnings.writtenWarnings.length;
  // Converts warnings into a single string
  const warningsStrings = warnings.writtenWarnings.map(s => `- ${strings[s as keyof LangContainer['curate']] || s}\n`);
  // Render warnings
  const warningElements = warningsStrings.length > 0 ? (
    <span
      className='curate-box-warnings__entry'>
      {`${warningsStrings.join('')}`}
    </span>
  ) : undefined ;
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
