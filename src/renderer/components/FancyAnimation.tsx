import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { ReactElement } from 'react';

type FancyAnimationProps = {
  fancyRender: (() => ReactElement) | ReactElement;
  normalRender: (() => ReactElement) | ReactElement;
};

export function FancyAnimation(props: FancyAnimationProps) {
  const fancyAnimationsEnabled = useAppSelector(state => state.preferences.fancyAnimations);
  if (fancyAnimationsEnabled) {
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
