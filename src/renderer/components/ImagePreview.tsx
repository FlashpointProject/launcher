import * as React from 'react';
import * as ReactDOM from 'react-dom';

export interface IImagePreviewProps {
  /** Source of the image to show */
  src?: string;
  /** Calld when the preview is clicked */
  onClick?: () => void;
}

export class ImagePreview extends React.Component<IImagePreviewProps, {}> {
  private parent: HTMLElement;
  private element: HTMLElement;

  constructor(props: IImagePreviewProps) {
    super(props);
    this.parent = document.body;
    this.element = document.createElement('div');
  }

  componentDidMount() {
    this.parent.appendChild(this.element);
  }

  componentWillUnmount() {
    this.parent.removeChild(this.element);
  }

  render() {
    return ReactDOM.createPortal(
      (<div className='image-preview' onClick={this.props.onClick} >
        <div className='image-preview__inner' style={{ backgroundImage: `url("${this.props.src}")` }} />
      </div>),
      this.element,
    );
  }
}
