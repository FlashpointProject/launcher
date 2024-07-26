import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '@renderer/store/store';
import { fpfssActions } from '@renderer/store/fpfss/slice';

const mapStateToProps = (state: RootState) => ({
  fpfss: state.fpfss,
});

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    fpfssActions: bindActionCreators(fpfssActions, dispatch),
  };
}

export type WithFpfssProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

export const withFpfss = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withFpfss('+name+')' }
);
