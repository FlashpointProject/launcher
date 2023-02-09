import * as React from 'react';

type CurateRowProps = {
  children?: React.ReactNode;
  /** Title of the row. */
  title?: string;
  /** CSS class(es) of this component's top level element. */
  className?: string;
};

// A row inside a curate box.
export function CurateBoxRow(props: CurateRowProps) {
  return (
    <tr className={'curate-box-row' + (props.className ? (' ' + props.className) : '')}>
      <td className='curate-box-row__title'>{props.title ? (props.title + ':') : ''}</td>
      <td className='curate-box-row__content'>{props.children}</td>
    </tr>
  );
}
