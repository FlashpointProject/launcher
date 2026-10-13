import { DynamicPageProps } from 'flashpoint-launcher-renderer';
import { DynamicComponent } from '../DynamicComponent';

export function DynamicPage(props: DynamicPageProps) {
  if (props.name) {
    return <DynamicComponent name={props.name} props={props.props}/>;
  } else {
    return <div>No Dynamic Component Loaded</div>;
  }
}
