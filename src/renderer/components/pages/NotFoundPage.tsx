import * as React from 'react';

/** Page shown when the current URL does not point to an existing page. */
export const NotFoundPage: React.StatelessComponent<{}> = () => {
  return (
    <div className='page-not-found'>
      <h1 className='page-not-found__error-number'>404</h1>
      <h1 className='page-not-found__title'>Page Not Found</h1>
      The page you were looking for is not here.
    </div>
  );
};
