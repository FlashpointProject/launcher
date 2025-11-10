import { addGameSidebarComponent, removeGameSidebarComponent } from 'flashpoint-launcher-renderer-ext/actions/main';
import { useAppDispatch } from 'flashpoint-launcher-renderer-ext/hooks';
import { useEffect } from 'react';

export default function Initializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(addGameSidebarComponent({
      section: 'bottom',
      name: 'core_controller/ControllerSupport'
    }));

    return () => {
      dispatch(removeGameSidebarComponent({
        section: 'bottom',
        name: 'core_controller/ControllerSupport'
      }));
    };
  }, [dispatch]);

  return <></>;
}
