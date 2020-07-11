import { withRouter } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { withMainState } from './withMainState';
import { withPreferences } from './withPreferences';

export const ConnectedFooter = withRouter(withMainState(withPreferences(Footer)));
