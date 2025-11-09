import { CustomRoute } from 'flashpoint-launcher-renderer';
import { addCustomRoute, removeCustomRoute } from 'flashpoint-launcher-renderer-ext/actions/main';
import { useAppDispatch } from 'flashpoint-launcher-renderer-ext/hooks';
import { useEffect } from 'react';

export default function Initializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const customRoute: CustomRoute = {
      headerItem: {
        id: 'manager',
        title: 'Manager'
      },
      keepLoaded: true,
      path: '/manager',
      component: 'core_manager/ManagerPage'
    };

    dispatch(addCustomRoute(customRoute));

    return () => {
      dispatch(removeCustomRoute(customRoute));
    };
  });

  return <></>;
}

