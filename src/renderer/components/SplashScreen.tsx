import * as React from 'react';

export type SplashScreenProps = {
    gamesLoaded: boolean;
    playlistsLoaded: boolean;
    creditsLoaded: boolean;
    upgradesLoaded: boolean;
}

export class SplashScreen extends React.Component<SplashScreenProps> {
    render() {
        const { gamesLoaded, playlistsLoaded, creditsLoaded, upgradesLoaded } = this.props;
        const loaded = gamesLoaded && playlistsLoaded && creditsLoaded && upgradesLoaded;
        const extraClass = loaded ? 'fade-out' : '';
        return (
            <div className={'splash-screen ' + extraClass} >
                <div className='splash-screen_loading_logo'/>
                <div className='splash-screen_status_block'>
                    <div className='splash-screen_status_header'>
                        Loading
                    </div>
                    {!gamesLoaded ?
                    <div className='splash-screen_status'>
                        Games
                    </div>
                    : undefined}
                    {!creditsLoaded ?
                    <div className='splash-screen_status'>
                        Credits
                    </div>
                    : undefined}
                    {!playlistsLoaded ?
                    <div className='splash-screen_status'>
                        Playlists
                    </div>
                    : undefined}
                    {!upgradesLoaded ?
                    <div className='splash-screen_status'>
                        Upgrades
                    </div>
                    : undefined}
                </div>
            </div>
        );
    }
}

export function SplashScreenStateless() {
    return (
        <div className='splash-screen' >
            <div className='splash-screen_status'>
                Loading...
            </div>
        </div>
    );
}