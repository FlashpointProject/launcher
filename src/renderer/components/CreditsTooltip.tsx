import * as React from 'react';
import { ICreditsDataProfile } from '../credits/interfaces';

export interface ICreditsTooltipProps {
  profile?: ICreditsDataProfile;
}

export class CreditsTooltip extends React.PureComponent<ICreditsTooltipProps> {
  private ref: React.RefObject<HTMLDivElement> = React.createRef();


  componentDidMount() {
    window.addEventListener('mousemove', this.onMouseMove);
  }

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  render() {
    const { profile } = this.props;
    return (
      <div className='about-page__credits__tooltip'
           ref={this.ref}
           style={{ display: profile ? undefined : 'none' }}>
        { profile ? (
          <>
            <p className='about-page__credits__tooltip__title'>{profile.title}</p>
            { profile.note ? (
              <p className='about-page__credits__tooltip__note'>{profile.note}</p>
            ) : undefined }
              <ul>
                { profile.roles.map((role, index) => (
                  <li key={index} style={{ color: CreditsTooltip.getRoleColor(role) }}>{role}</li>
                )) }
              </ul>
          </>
        ) : undefined }
      </div>
    );
  }

  private onMouseMove = (event: MouseEvent) => {
    const current = this.ref.current;
    if (current && this.props.profile) {
      if (event.clientX <= window.innerWidth * 0.5) {
        current.style.left  = (event.clientX + 16)+'px';
        current.style.right = null;
      } else {
        current.style.left  = null;
        current.style.right = (window.innerWidth - event.clientX + 16)+'px';
      }
      current.style.top  = (event.clientY +  8)+'px';
    }
  }

  private static getRoleColor(role: string): string | undefined {
    switch (role) {
      default:              return undefined;
      case 'Mechanic':      return 'rgb(84, 110, 122)';
      case 'Moderator':     return 'rgb(46, 204, 113)';
      case 'Curator':       return 'rgb(241, 196, 15)';
      case 'The Blue':      return 'rgb(32, 102, 148)';
      case 'The Moe':       return 'rgb(224, 164, 241)';
      case 'Administrator': return 'rgb(52, 152, 219)';
      case 'Hacker':        return 'rgb(177, 21, 21)';
      case 'Archivist':     return 'rgb(170, 135, 135)';
      case 'Tester':        return 'rgb(230, 126, 34)';
      case 'VIP':           return 'rgb(214, 4, 127)';
    }
  }
}
