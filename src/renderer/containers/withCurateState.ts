import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '@renderer/store/store';
import { curateActions } from '@renderer/store/curate/slice';

const mapStateToProps = (state: RootState) => ({
  curate: state.curate,
});

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    curateActions: bindActionCreators(curateActions, dispatch)
  };
}

export type WithCurateProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

export const withCurate = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withCurate('+name+')' }
);
