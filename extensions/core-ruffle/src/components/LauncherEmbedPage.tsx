import { GameLaunchInfo } from 'flashpoint-launcher';
import React, { useState } from 'react';

export default function LauncherEmbedPage(props: GameLaunchInfo) {
  const [rufflePlayer, setRufflePlayer] = useState<any | undefined>(); 
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const navigate = window.ext.hooks.useNavigate();
  const ruffleJsUrl = React.useMemo(() => `${window.ext.utils.getFileServerURL()}/ruffle/webhosted/latest/ruffle.js`, []);

  let width: string | undefined, height: string | undefined;
  if (props.game.extData?.nga) {
    // It's an NGA game, so it must have width and height in info
    width = props.game.extData?.nga['width'];
    if (width) {
      width += 'px';
    }
    height = props.game.extData?.nga['height'];
    if (height) {
      height += 'px';
    }
  }

  React.useEffect(() => {
    // useEffect calls on a ref change as well, even with no deps
    if (!(window as any).RufflePatched) {
      // Add ruffle to header
      const elem = document.createElement('script');
      elem.setAttribute('src', ruffleJsUrl);
      elem.onload = () => {
        console.log('js script loaded');
        if (containerRef.current && (window as any).RufflePlayer) {
          const lc = props.activeData?.launchCommand;
          try {
            const ruffle = (window as any).RufflePlayer.newest();
            const player = ruffle.createPlayer();
            player.id = 'ruffle-player';
            containerRef.current.appendChild(player);
            player.load(lc);
            setRufflePlayer(player);
            console.log('Ruffle player created and loaded with:', lc);
          } catch (err) {
            console.error('Failed to create Ruffle player:', err);
          }
        }
      };

      document.head.append(elem);
      console.log('Patched in Ruffle');
    } else if (containerRef.current && (window as any).RufflePlayer) {
      const lc = props.activeData?.launchCommand;
      try {
        // Clear any existing content
        containerRef.current.innerHTML = '';

        const ruffle = (window as any).RufflePlayer.newest();
        const player = ruffle.createPlayer();
        player.id = 'ruffle-player';
        containerRef.current.appendChild(player);
        player.load(lc);
        setRufflePlayer(player);
        console.log('Ruffle player created and loaded with:', lc);
      } catch (err) {
        console.error('Failed to create Ruffle player:', err);
      }
    }
  }, []);

  const onBack = () => {
    navigate(-1);
  };

  return <div className='ruffle-page'>
    <div className='ruffle-wrapper'>
      <div className='ruffle-title'>{props.game.title}</div>
      <div className='ruffle-container' style={{ width, height }} ref={containerRef}></div>
    </div>
    <button className='simple-button ruffle-back-button' onClick={onBack}>Back</button>
  </div>;
}
