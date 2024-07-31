import { Paths } from '@renderer/Paths';
import { Link } from 'react-router-dom';

/** Page shown when the current URL does not point to an existing page. */
export function NotFoundPage() {
  return (
    <div className='page-not-found'>
      <h1>You appear to have gotten lost :(</h1>
      <Link className='link' to={Paths.HOME}> Back to home</Link>
    </div>
  );
}
