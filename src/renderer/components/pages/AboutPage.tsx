import { CHANGELOG } from '@renderer/changelog';
import { Pointer } from '@renderer/context/MenuContext';
import { CreditsFile } from '@renderer/credits/CreditsFile';
import { createNewDialog } from '@renderer/dialog';
import { useAppDispatch } from '@renderer/hooks/useAppSelector';
import { openUrlInWindow } from '@renderer/Util';
import { getFileServerURL } from '@shared/Util';
import { Fragment, useContext, useState } from 'react';
import { CreditsBlock, CreditsData, CreditsDataProfile, CreditsDataRole } from '../../credits/types';
import { LangContext } from '../../util/lang';
import { CreditsIcon } from '../CreditsProfile';
import { CreditsTooltip } from '../CreditsTooltip';

export function AboutPage() {
  const dispatch = useAppDispatch();
  const allStrings = useContext(LangContext);
  const strings = allStrings.about;
  const [creditsData, setCreditsData] = useState<CreditsData>();
  const [hasFetched, setHasFetched] = useState(false);
  const [profile, setProfile] = useState<CreditsDataProfile>();
  const [pointer, setPointer] = useState<Pointer>();

  if (!hasFetched) {
    setHasFetched(true);
    fetch(`${getFileServerURL()}/credits.json`)
    .then(async (data) => {
      const dataJson = await data.json();
      setCreditsData(CreditsFile.parseCreditsData(dataJson, console.log));
    })
    .catch((error) => {
      log.warn('Launcher', `Failed to load credits.\n${error}`);
    });
  }

  const onMouseEnterCreditsIcon = (event: React.MouseEvent, newProfile: CreditsDataProfile) => {
    setProfile(newProfile);
    setPointer({ x: event.clientX, y: event.clientY });
  };

  const onMouseLeaveCreditsIcon = () => {
    setProfile(undefined);
  };


  const roles: CreditsDataRole[] = creditsData ?
    creditsData.roles.filter(role => role.noCategory != true)
    : [{ name: strings.specialThanks }];

  const creditBlocks: CreditsBlock[] = [];

  creditBlocks.push({ role: { name: strings.specialThanks }, profiles: [] });

  // Populate credit blocks
  if (creditsData) {
    profileLoop:
    for (const profile of creditsData.profiles) {
      if (profile.topRole) {
        const role = roles.find(role => role.name === profile.topRole);
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
    creditBlocks.push(creditBlocks.splice(0, 1)[0]);
  }

  const profileElements = creditBlocks.map((block, index) => (
    <Fragment key={index}>
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
          onMouseEnter={onMouseEnterCreditsIcon}
          onMouseLeave={onMouseLeaveCreditsIcon} />
      ))}
    </Fragment>
  ));

  const changelog = Object.entries(CHANGELOG);
  changelog.sort((a, b) => a[0].localeCompare(b[0]));
  changelog.reverse();

  const changelogPreviews: React.JSX.Element[] = changelog.map(([date, data], idx) => {
    return (
      <div
        key={idx}
        onClick={() => {
          createNewDialog(dispatch, {
            mdx: true,
            textAlign: 'left',
            message: data.message,
            buttons: ['Close']
          });
        }}
        className='about-page__section__changelog-preview simple-button'>
        <div><b>Date:</b> {(new Date(date)).toLocaleDateString()}</div>
        <div><b>{data.title}</b></div>
      </div>
    );
  });

  return (
    <div className='about-page simple-scroll'>
      <div className='about-page__inner'>
        <div className='about-page__top'>
          <h1 className='about-page__title'>{strings.aboutHeader}</h1>
          { pointer !== undefined && (
            <CreditsTooltip
              roles={creditsData && creditsData.roles}
              profile={profile}
              profileX={pointer.x}
              profileY={pointer.y} />
          )}
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
                    {link(strings.website, 'http://flashpointarchive.org/')}
                    {link('Discord', 'https://discordapp.com/invite/qhvAkhWXU5')}
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
                  <p><b>{strings.license}:</b> {strings.licenseInfo}</p>
                  <div className='about-page__section__links'>
                    {link('GitHub', 'https://github.com/FlashpointProject/launcher')}
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
              {/* Changelog */}
              <div className='about-page__section'>
                <p className='about-page__section__title'>{'Changelog'}</p>
                {changelogPreviews}
              </div>
            </div>
            {/* Right Column */}
            <div className='about-page__columns__right simple-columns__column'>
              {/* Credits */}
              <div className='about-page__credits'>
                <div className='about-page__credits__title'>{strings.creditsHeader}</div>
                <div className='about-page__credits__profiles'>
                  {profileElements}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function link(title: string, url: string): React.JSX.Element {
  return (
    <a
      style={{ cursor: 'pointer', textDecorationLine: 'underline' }}
      onClick={() => openUrlInWindow(url)}
      title={url}>
      {title}
    </a>
  );
}

