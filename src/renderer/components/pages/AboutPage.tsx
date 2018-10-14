import * as React from 'react';
import { appVersionString } from '../../../shared/AppConstants';

export const AboutPage: React.StatelessComponent<{}> = () => {
  return (
    <div className='about-page simple-scroll'>
      <div className='about-page__inner'>
        <div className="about-page__top">
          <h1 className='about-page__title'>About</h1>
          <div className='about-page__section'>
            <p className='about-page__section__title'>Flashpoint Launcher</p>
            <div className='about-page__section__content'>
              <p className="about-page__section__content__description">
                An open-source desktop application used to browse, manage and play games from the Flashpoint project.
              </p>
              <p><b>Version:</b> {appVersionString}</p>
              <p><b>License:</b> MIT (Read the file named "LICENSE" for more information)</p>
              <div className='about-page__section__links'>
                {link('Github', 'https://github.com/FlashpointProject/launcher')}
              </div>
            </div>
          </div>
          <div className='about-page__section'>
            <p className='about-page__section__title'>BlueMaxima's Flashpoint</p>
            <div className='about-page__section__content'>
              <p className="about-page__section__content__description">
                The preservation project this launcher was built for, that aims to be an archive, museum and playable collection of web-based Internet games.
              </p>
              <div className='about-page__section__links'>
                {link('Website', 'http://bluemaxima.org/flashpoint/')}
                {link('Discord', 'https://discord.gg/Nc3DScn')}
              </div>
            </div>
          </div>
        </div>
        <div className="about-page__bottom">
          <div className="about-page__bottom__inner">
            <p className="about-page__bottom__quote">"It's not up to us to decide what the future finds interesting"</p>
            <p className="about-page__bottom__author">-Jason Scott</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function link(title: string, url: string): JSX.Element {
  return (
    <a href={url} title={url}>{title}</a>
  );
}
