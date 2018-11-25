import * as React from 'react';

export interface ISizeProviderProps {
  width: string|number;
  height: string|number;
}

export class SizeProvider extends React.Component<ISizeProviderProps> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: ISizeProviderProps) {
    super(props);
  }

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(prevProps: ISizeProviderProps): void {
    if (prevProps.width  !== this.props.width ||
        prevProps.height !== this.props.height) {
      this.updateCssVars();
    }
  }

  render() {
    return (
      <div ref={this._wrapper}>
        {this.props.children}
      </div>
    );
  }
  
  updateCssVars() {
    const wrapper = this._wrapper.current;
    if (!wrapper) { throw new Error('Wrapper element missing'); }
    wrapper.style.setProperty('--width', this.props.width+'');
    wrapper.style.setProperty('--height', this.props.height+'');
  }
}
