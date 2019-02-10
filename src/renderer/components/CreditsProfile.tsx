import * as React from 'react';
import { ICreditsDataProfile } from '../credits/interfaces';

export interface ICreditsIconProps {
  profile: ICreditsDataProfile;
  onMouseEnter: (profile: ICreditsDataProfile) => void;
  onMouseLeave: () => void;
}

export class CreditsIcon extends React.PureComponent<ICreditsIconProps> {
  private timeout: number = -1;
  private ref: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount() {
    this.timeout = window.setTimeout(() => {
      this.timeout = -1;
      if (!this.ref.current) { throw new Error('CreditsIcon could not set profile image. Image element is missing.'); }
      if (this.props.profile.icon) {
        this.ref.current.style.backgroundImage = `url("${this.props.profile.icon}")`;
      }
    }, 0);
  }

  componentWillUnmount() {
    if (this.timeout >= 0) {
      window.clearTimeout(this.timeout);
    }
  }

  render() {
    const { profile } = this.props;
    return (
      <div className='about-page__credits__profile'
           ref={this.ref}
           onMouseEnter={this.onMouseEnter}
           onMouseLeave={this.onMouseLeave}>
      </div>
    );
  }

  private onMouseEnter = (event: React.MouseEvent) => {
    if (this.props.onMouseEnter) { this.props.onMouseEnter(this.props.profile); }
  }

  private onMouseLeave = (event: React.MouseEvent) => {
    if (this.props.onMouseLeave) { this.props.onMouseLeave(); }
  }
}
