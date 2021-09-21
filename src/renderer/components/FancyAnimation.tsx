import { withPreferences, WithPreferencesProps } from '@renderer/containers/withPreferences';
import { ReactElement } from 'react';

type OwnProps = {
  fancyRender: (() => ReactElement) | ReactElement;
  normalRender: (() => ReactElement) | ReactElement;
};

type FancyAnimationProps = OwnProps & WithPreferencesProps;

function _FancyAnimation(props: FancyAnimationProps) {
  if (props.preferencesData.fancyAnimations) {
    if (typeof props.fancyRender == 'function') {
      return props.fancyRender();
    } else {
      return props.fancyRender;
    }
  } else {
    if (typeof props.normalRender == 'function') {
      return props.normalRender();
    } else {
      return props.normalRender;
    }
  }
}

export const FancyAnimation = withPreferences(_FancyAnimation);
