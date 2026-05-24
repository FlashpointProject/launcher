import { Subtract } from '@shared/interfaces';
import { Location, NavigateFunction, useLocation, useNavigate } from 'react-router-dom';

export type WithNavigationProps = {
  navigate: NavigateFunction;
  location: Location<any>;
};

export function withNavigation<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithNavigationProps>) => {
    const navigate = useNavigate();
    const location = useLocation();
    return <Component {...props as P} navigate={navigate} location={location} />;
  };
}
