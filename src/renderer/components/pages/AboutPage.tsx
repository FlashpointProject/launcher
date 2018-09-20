import * as React from 'react';

export const AboutPage: React.StatelessComponent<{}> = () => {
  return (
    <div className='about'>
      <h1 className='about__title'>About</h1>
      This application lets you browse and launch games from FlashPoint's LaunchBox library.
      <br/><br/>
      If you have any suggestion, find any bugs or just wanna have a chat - then hit me up on Discord <b>@obelisk#2852</b>
    </div>
  );
};
