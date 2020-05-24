import { LangContainer } from '@shared/lang';
import { versionNumberToText } from '@shared/Util';
import * as React from 'react';
import { CreditsBlock, CreditsData, CreditsDataProfile, CreditsDataRole } from '../../credits/types';
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

    const roles: CreditsDataRole[] = creditsData ? creditsData.roles.filter(role => role.noCategory != true) : [{ name: strings.specialThanks }];
    let creditBlocks: CreditsBlock[] = [];
    creditBlocks.push({ role: { name: strings.specialThanks }, profiles: [] });

    // Populate credit blocks
    if (creditsData) {
      profileLoop:
      for (const profile of creditsData.profiles) {
        // Assign profile to block
        for (const roleName of profile.roles) {
          const role = roles.find(role => role.name === roleName);
          if (role) {
            // Role exists, find/create block for it
            const block = creditBlocks.find(block => block.role === role);
            if (block && !block.role.noCategory) {
              // Block found, add profile
              block.profiles.push(profile);
            } else {
              // No block for role yet, create a new one
              const newBlock: CreditsBlock = { role: role, profiles: [] };
              newBlock.profiles.push(profile);
              creditBlocks.push(newBlock);
            }
            // Added to a block, go to next profile
            continue profileLoop;
          }
        }
        // No matching roles found, add to default
        creditBlocks[0].profiles.push(profile);
      }
    }

    // If default block empty, remove
    if (creditBlocks[0].profiles.length === 0) {
      creditBlocks.slice(0, 1);
    }

    // Sort Array
    if (creditsData) {
      creditBlocks.sort((a, b) => {
        return roles.indexOf(a.role) - roles.indexOf(b.role);
      });
      creditBlocks.push(creditBlocks.splice(0,1)[0]);
    }

    return (
      <div className='about-page simple-scroll'>
        <div className='about-page__inner'>
          <div className='about-page__top'>
            <h1 className='about-page__title'>{strings.aboutHeader}</h1>
            <CreditsTooltip profile={profile} roles={creditsData && creditsData.roles} />
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
                    <p><b>{strings.version}:</b> {versionNumberToText(window.Shared.version)} ({window.Shared.version})</p>
                    <p><b>{strings.license}:</b> {strings.licenseInfo}</p>
                    <div className='about-page__section__links'>
                      {link('Github', 'https://github.com/FlashpointProject/launcher')}
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
              {/* Right Column */}
              <div className='about-page__columns__right simple-columns__column'>
                {/* Credits */}
                <div className='about-page__credits'>
                  <div className='about-page__credits__title'>{strings.creditsHeader}</div>
                  <div className='about-page__credits__profiles'>
                    { (creditsDoneLoading) ? (
                      creditBlocks.map((block, index) => (
                        <React.Fragment key={index}>
                          <div className='about-page__credits__role' >
                            <div className='about-page__credits__role-name'>
                              {block.role.name}
                            </div>
                            <div className='about-page__credits__role-description'>
                              {block.role.description}
                            </div>
                          </div>
                          {block.profiles.map((profile, i) => (
                            <CreditsIcon
                              key={i}
                              profile={profile}
                              onMouseEnter={this.onMouseEnterCreditsIcon}
                              onMouseLeave={this.onMouseLeaveCreditsIcon} />
                          ))}
                        </React.Fragment>
                      ))
                    ) : ('...') }
                  </div>
                </div>
              </div>
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
