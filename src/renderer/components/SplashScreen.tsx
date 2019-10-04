import * as React from 'react';

export type SplashScreenProps = {
    fade: boolean;
}

export class SplashScreen extends React.Component<SplashScreenProps> {
    constructor (props: SplashScreenProps) {
        super(props);
        this.state = {
            opacity: 1,
            lastCheck: 0
        }
    }

    render() {
        const extraClass = this.props.fade ? 'fade-out' : '';
        return (
            <div className={'splash-screen ' + extraClass} >
                <div className='splash-screen_status'>
                    Loading...
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