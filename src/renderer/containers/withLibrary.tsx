import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { IGameLibraryFile } from '../../shared/library/interfaces';
import { ApplicationState } from '../store';
import * as action from '../store/library/actions';

type StateToProps = {
  /** Data of the current library. */
  readonly libraryData: Readonly<IGameLibraryFile>;
};

type DispatchToProps = {
  /** Update the data of the current library (in the state, not the file). */
  readonly updateLibrary: (data: Partial<IGameLibraryFile>) => void;
};

export type WithLibraryProps = StateToProps & DispatchToProps;

const mapStateToProps = ({ library }: ApplicationState): StateToProps => ({
  libraryData: library.data,
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  updateLibrary: (data: Partial<IGameLibraryFile>) => action.updateLibrary(data)
}, dispatch);

export const withLibrary = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withLibrary('+name+')' }
);
