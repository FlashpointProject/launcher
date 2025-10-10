/* eslint-disable react-hooks/static-components */
import { Suspense, useContext } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { DynamicComponentContext } from './DynamicComponentProvider';
import { useAppSelector } from '@renderer/hooks/useAppSelector';

type DynamicComponentProps = {
  name: string;
  props: any;
}

export function DynamicComponent({ name, props }: DynamicComponentProps) {
  const { getComponent } = useContext(DynamicComponentContext);
  const themeList = useAppSelector((state) => state.main.themeList);
  const currentTheme = themeList.find(t => t.id ===  window.Shared.preferences.data.currentTheme);
  let renderName = name;

  // Apply theme overrides
  if (currentTheme && currentTheme.meta.componentOverrides !== undefined) {
    console.log(currentTheme.meta.componentOverrides);
    renderName = currentTheme.meta.componentOverrides[renderName] || renderName;
  }

  const Component = getComponent(renderName);
  return (
    <ErrorBoundary fallbackRender={({ error }) => <div>{`Error rendering dynamic component '${name}': ${error}`}</div>}>
      <Suspense>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
