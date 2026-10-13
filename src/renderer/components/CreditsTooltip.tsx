import { CreditsDataProfile, CreditsDataRole } from 'flashpoint-launcher';
import { useEffect, useRef } from 'react';

export type CreditsTooltipProps = {
  /** Roles to grab color info from */
  roles?: CreditsDataRole[];
  /** Credits profile to show in the tooltip. If undefined, the tooltip will be hidden. */
  profile?: CreditsDataProfile;
  /** Cursor's X position when entering the profile. */
  profileX: number;
  /** Cursor's Y position when entering the profile. */
  profileY: number;
};

// Tooltip that follows the cursor and displays information about a credits profile.
export function CreditsTooltip(props: CreditsTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(event: MouseEvent) {
    if (ref.current) {
      setPosition(ref.current, event.clientX, event.clientY);
    }
  }

  // Follow cursor
  useEffect(() => {
    if (!props.profile) { return; } // (Tooltip is not visible)

    if (ref.current) {
      setPosition(ref.current, props.profileX, props.profileY);
    }

    document.addEventListener('mousemove', onMouseMove);
    return () => { document.removeEventListener('mousemove', onMouseMove); };
  }, [props.profile, props.profileX, props.profileY]);

  // Render profile
  const profileElement = props.profile ? (
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
  ) : undefined;

  // Render
  return (
    <div
      className='about-page__credits__tooltip'
      ref={ref}
      style={{ display: props.profile ? undefined : 'none' }}>
      { profileElement }
    </div>
  );
}

function setPosition(element: HTMLElement, x: number, y: number): void {
  const innerWidth = window.innerWidth;
  const innerHeight = window.innerHeight;

  if (x <= innerWidth * 0.5) {
    element.style.left  = (x + 16) + 'px';
    element.style.right = '';
  } else {
    element.style.left  = '';
    element.style.right = (innerWidth - x + 16) + 'px';
  }

  if (y <= innerHeight * 0.5) {
    element.style.top    = (y + 8) + 'px';
    element.style.bottom = '';
  } else {
    element.style.top    = '';
    element.style.bottom = (innerHeight - y + 8) + 'px';
  }
}

/**
 * Get the color associated with a specific role.
 *
 * @param name Name of the role to find
 * @param roles List of roles with associated color info
 */
function getRoleColor(name: string, roles?: CreditsDataRole[]): string | undefined {
  if (roles) {
    const role = roles.find(role => role.name === name);
    if (role) {
      return role.color;
    }
  }
  return undefined;
}
