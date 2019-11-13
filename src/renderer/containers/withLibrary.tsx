import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { GameLibraryFile } from '../../shared/library/types';
import { ApplicationState } from '../store';
import * as action from '../store/library/actions';

type StateToProps = {
  /** Data of the current library. */
  readonly libraryData: Readonly<GameLibraryFile>;
};

type DispatchToProps = {
  /** Update the data of the current library (in the state, not the file). */
  readonly updateLibrary: (data: Partial<GameLibraryFile>) => void;
};

export type WithLibraryProps = StateToProps & DispatchToProps;

const mapStateToProps = ({ library }: ApplicationState): StateToProps => ({
  libraryData: library.data,
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  updateLibrary: (data: Partial<GameLibraryFile>) => action.updateLibrary(data)
}, dispatch);

export const withLibrary = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withLibrary('+name+')' }
);
