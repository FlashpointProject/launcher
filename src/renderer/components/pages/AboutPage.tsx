import * as React from 'react';
import { LangContainer } from '@shared/lang';
import { versionNumberToText } from '@shared/Util';
import { CreditsData, CreditsDataProfile } from '../../credits/types';
import { LangContext } from '../../util/lang';
import { CreditsIcon } from '../CreditsProfile';
import { CreditsTooltip } from '../CreditsTooltip';

export type AboutPageProps = {
  /** Credits data (if any). */
  creditsData?: CreditsData;
  /** If the credits data is done loading (even if it was unsuccessful). */
  creditsDoneLoading: boolean;
};

export type AboutPageState = {
  /** Currently "targeted" profile (the profile that the cursor is hovering over, if any). */
  profile?: CreditsDataProfile;
};

export interface AboutPage {
  context: LangContainer;
}

/** Page displaying information about this launcher, the "BlueMaxima's Flashpoint" project and its contributors. */
export class AboutPage extends React.Component<AboutPageProps, AboutPageState> {
  constructor(props: AboutPageProps) {
    super(props);
    this.state = {};
  }

  render() {
    const strings = this.context.about;
    const { profile } = this.state;
    const { creditsData, creditsDoneLoading } = this.props;
    return (
      <div className='about-page simple-scroll'>
        <div className='about-page__inner'>
          <div className='about-page__top'>
            <h1 className='about-page__title'>{strings.aboutHeader}</h1>
            <CreditsTooltip profile={profile} />
            <div className='about-page__columns simple-columns'>
              {/* Left Column */}
              <div className='about-page__columns__left simple-columns__column'>
                {/* About Flashpoint */}
                <div className='about-page__section'>
                  <p className='about-page__section__title'>{strings.flashpoint}</p>
                  <div className='about-page__section__content'>
                    <p className='about-page__section__content__description'>
                      {strings.flashpointDesc}
                    </p>
                    <div className='about-page__section__links'>
                      {link(strings.website, 'http://bluemaxima.org/flashpoint/')}
                      {link('Discord', 'https://discord.gg/Nc3DScn')}
                    </div>
                  </div>
                </div>
                {/* About Flashpoint Launcher */}
                <div className='about-page__section'>
                  <p className='about-page__section__title'>{strings.flashpointLauncher}</p>
                  <div className='about-page__section__content'>
                    <p className='about-page__section__content__description'>
                      {strings.flashpointLauncherDesc}
                    </p>
                    <p><b>{strings.version}:</b> {versionNumberToText(window.External.version)} ({window.External.version})</p>
                    <p><b>{strings.license}:</b> {strings.licenseInfo}</p>
                    <div className='about-page__section__links'>
                      {link('Github', 'https://github.com/FlashpointProject/launcher')}
                    </div>
                  </div>
                </div>
              </div>
              {/* Right Column */}
              <div className='about-page__columns__right simple-columns__column'>
                {/* Credits */}
                <div className='about-page__credits'>
                  <div className='about-page__credits__title'>{strings.creditsHeader}</div>
                  <div className='about-page__credits__profiles'>
                    { (creditsDoneLoading && creditsData) ? (
                      creditsData.profiles.map((profile, index) => (
                        <CreditsIcon
                          key={index}
                          profile={profile}
                          onMouseEnter={this.onMouseEnterCreditsIcon}
                          onMouseLeave={this.onMouseLeaveCreditsIcon}/>
                      ))
                    ) : ('...') }
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Bottom */}
          <div className='about-page__bottom'>
            <div className='about-page__bottom__inner'>
              <p className='about-page__bottom__quote'>"It's not up to us to decide what the future finds interesting"</p>
              <p className='about-page__bottom__author'>-Jason Scott</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onMouseEnterCreditsIcon = (profile: CreditsDataProfile) => {
    if (this.state.profile !== profile) {
      this.setState({ profile });
    }
  }

  onMouseLeaveCreditsIcon = () => {
    if (this.state.profile !== undefined) {
      this.setState({ profile: undefined });
    }
  }

  static contextType = LangContext;
}

function link(title: string, url: string): JSX.Element {
  return (
    <a
      href={url}
      title={url}>
      {title}
    </a>
  );
}
