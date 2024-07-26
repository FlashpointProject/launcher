import { withRouter } from 'react-router';
import { Header } from '../components/Header';
import { withPreferences } from './withPreferences';
import { withTagCategories } from './withTagCategories';

export default withRouter(withTagCategories(withPreferences(Header)));
