import * as React from 'react';
import {withPreferences, WithPreferencesProps} from '@renderer/containers/withPreferences';
import { ReactElement } from 'react';

type OwnProps = {
  fancyRender: () => ReactElement;
  normalRender: () => ReactElement;
};

type FancyAnimationProps = OwnProps & WithPreferencesProps;

function _FancyAnimation(props: FancyAnimationProps) {
  return React.useMemo(() => {
    if (props.preferencesData.fancyAnimations) {
      return props.fancyRender();
    } else {
      return props.normalRender();
    }
  }, [props.preferencesData.fancyAnimations]);
}

export const FancyAnimation = withPreferences(_FancyAnimation);
