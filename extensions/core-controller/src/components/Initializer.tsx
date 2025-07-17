import React from 'react';

export default function Initializer() {

  React.useEffect(() => {
    window.setDisplaySettings((displaySettings) => {
      displaySettings.gameSidebar.bottom.push('core_controller/ControllerSupport');

      return displaySettings;
    });
  });

  return <></>;
}
