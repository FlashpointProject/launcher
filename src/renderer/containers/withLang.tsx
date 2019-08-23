import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ApplicationState } from '../store';
import * as action from '../store/lang/actions';
import { ILangData } from 'src/shared/lang/interfaces';

type StateToProps = {
  /** Current preference data. */
  readonly lang: Readonly<ILangData>;
};

type DispatchToProps = {
  /** Update the entire, or parts of the, preference data object. */
  readonly updateLang: (data: ILangData) => void;
};

export type WithLangProps = StateToProps & DispatchToProps;

const mapStateToProps = ({ lang }: ApplicationState): StateToProps => ({
  lang: lang.data,
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  updateLang: (data: ILangData) => action.updateLang(data)
}, dispatch);

export const withLang = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withLang('+name+')' }
);
