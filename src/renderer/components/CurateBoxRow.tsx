import * as React from 'react';

type CurateRowProps = {
  children?: React.ReactNode;
  /** Title of the row. */
  title?: string;
};

/** A row inside a curate box. */
export function CurateBoxRow(props: CurateRowProps) {
  return (
    <div className='curate-box-row'>
      <p className='curate-box-row__title'>{props.title}</p>
      <div className='curate-box-row__content'>{props.children}</div>
    </div>
  );
}
