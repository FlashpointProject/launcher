import * as React from 'react';

type CurateRowProps = {
  children?: React.ReactNode;
  /** Title of the row. */
  title?: string;
  /** CSS class(es) of this component's top level element. */
  className?: string;
};

/** A row inside a curate box. */
export function CurateBoxRow(props: CurateRowProps) {
  const { children, className, title } = props;
  return (
    <tr className={'curate-box-row' + (className ? (' ' + className) : '')}>
      <td className='curate-box-row__title'>{title}</td>
      <td className='curate-box-row__content'>{children}</td>
    </tr>
  );
}
