import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { CreditsDataProfile } from '../credits/types';

export type CreditsIconProps = {
  /** Credits profile of the person to display. */
  profile: CreditsDataProfile;
  /** Called when the mouse enters the element. */
  onMouseEnter: (profile: CreditsDataProfile) => void;
  /** Called when the mouse leaves the element. */
  onMouseLeave: () => void;
};

/** Displays an icon from a credits profile. */
export function CreditsIcon(props: CreditsIconProps) {
  // Hooks
  const ref = useRef<HTMLDivElement>(null);
  const onMouseEnter = useCallback(() => {
    if (props.onMouseEnter) { props.onMouseEnter(props.profile); }
  }, [props.onMouseEnter, props.profile]);
  const onMouseLeave = useCallback(() => {
    if (props.onMouseLeave) { props.onMouseLeave(); }
  }, [props.onMouseLeave]);
  useEffect(() => { // (Delay decoding the icon, this allows the browser to spread the work across multiple frames)
    let timeout = window.setTimeout(() => {
      timeout = -1;
      if (!ref.current) { throw new Error('CreditsIcon could not set profile image. Image element is missing.'); }
      if (props.profile.icon) {
        ref.current.style.backgroundImage = `url("${props.profile.icon}")`;
      }
    }, 0);
    return () => {
      if (timeout >= 0) { window.clearTimeout(timeout); }
    };
  }, [props.profile]);
  // Render
  return (
    <div
      className='about-page__credits__profile'
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave} />
  );
}
