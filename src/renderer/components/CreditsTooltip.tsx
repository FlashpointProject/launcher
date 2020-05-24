import * as React from 'react';
import { useEffect, useRef } from 'react';
import { CreditsDataProfile, CreditsDataRole } from '../credits/types';

export type CreditsTooltipProps = {
  /** Roles to grab color info from */
  roles?: CreditsDataRole[];
  /** Credits profile to show in the tooltip. If undefined, the tooltip will be hidden. */
  profile?: CreditsDataProfile;
};

/** Tooltip that follows the cursor and displays information about a credits profile. */
export function CreditsTooltip(props: CreditsTooltipProps) {
  // Hooks
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && props.profile) { // (Check if the tooltip is visible)
      const onMouseMove = createOnMouseMove(ref.current);
      window.addEventListener('mousemove', onMouseMove);
      return () => { window.removeEventListener('mousemove', onMouseMove); };
    }
  }, [ref.current, props.profile]);
  // Render
  return (
    <div
      className='about-page__credits__tooltip'
      ref={ref}
      style={{ display: props.profile ? undefined : 'none' }}>
      { props.profile ? (
        <>
          <p className='about-page__credits__tooltip__title'>{props.profile.title}</p>
          { props.profile.note ? (
            <p className='about-page__credits__tooltip__note'>{props.profile.note}</p>
          ) : undefined }
            <ul className='about-page__credits__tooltip__roles'>
              { props.profile.roles.map((role, index) => (
                <li key={index} style={{ color: getRoleColor(role, props.roles) }}>
                  <p>{role}</p>
                </li>
              )) }
            </ul>
        </>
      ) : undefined }
    </div>
  );
}

/**
 * Create an "on mouse move" event listener for the tooltip.
 * @param current Base tooltip element to move around.
 */
function createOnMouseMove(current: HTMLElement): (event: MouseEvent) => void {
  return (event) => {
    if (current) {
      if (event.clientX <= window.innerWidth * 0.5) {
        current.style.left  = (event.clientX + 16)+'px';
        current.style.right = '';
      } else {
        current.style.left  = '';
        current.style.right = (window.innerWidth - event.clientX + 16)+'px';
      }
      current.style.top  = (event.clientY +  8)+'px';
    }
  };
}

/**
 * Get the color associated with a specific role.
 * @param role Role to get the associated color for.
 */
function getRoleColor(name: string, roles?: CreditsDataRole[]): string | undefined {
  // @TODO Rewrite this function to return css class names, and define the colors the a stylesheet instead.
  //       That way you can change the colors with a theme.
  if (roles) {
    const role = roles.find(role => role.name === name);
    if (role) {
      return role.color;
    }
  }
  return undefined;
}
