import { withRouter } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { withMainState } from './withMainState';
import { withPreferences } from './withPreferences';
import { withView } from '@renderer/containers/withView';

export const ConnectedFooter = withView(withRouter(withMainState(withPreferences(Footer))));
