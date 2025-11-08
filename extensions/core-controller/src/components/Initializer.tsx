import { AddGameSidebarComponent } from 'flashpoint-launcher-renderer-ext/actions/main';
import { useAppDispatch } from 'flashpoint-launcher-renderer-ext/hooks';
import { useState } from 'react';

export default function Initializer() {
  const [initialized, setInitialized] = useState(false);
  const dispatch = useAppDispatch();

  // Perform frontend init functions
  if (!initialized) {
    setInitialized(true);

    dispatch(AddGameSidebarComponent({
      section: 'bottom',
      name: 'core_controller/ControllerSupport'
    }));
  }

  return <></>;
}
