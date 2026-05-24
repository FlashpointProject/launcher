import { ComponentType } from 'react';
import { IShortcutProviderRenderProps, useShortcut } from 'react-keybind';

export type WithShortcutProps = {
  shortcut: IShortcutProviderRenderProps;
}

export function withShortcut<Props extends WithShortcutProps>(Component: ComponentType<Props>) {
  return function WrappedComponent(props: Omit<Props, keyof WithShortcutProps>) {
    const shortcut = useShortcut();
    return <Component {...(props as Props)} shortcut={shortcut} />;
  };
}
