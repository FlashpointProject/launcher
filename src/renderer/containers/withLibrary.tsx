import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { ApplicationState } from '../store';
import { IGameLibraryFile } from '../../shared/library/interfaces';
import * as action from '../store/library/actions';

interface IStateToProps {
  readonly libraryData: Readonly<IGameLibraryFile>;
}

interface IDispatchToProps {
  readonly updateLibrary: (data: Partial<IGameLibraryFile>) => void;
}

export type WithLibraryProps = IStateToProps & IDispatchToProps;

const mapStateToProps = ({ library }: ApplicationState): IStateToProps => ({
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
