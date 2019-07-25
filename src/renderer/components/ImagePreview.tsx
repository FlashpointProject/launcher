import * as React from 'react';
import * as ReactDOM from 'react-dom';

export type ImagePreviewProps = {
  /** Source of the image to display. */
  src?: string;
  /** Called when the user attempts to cancel/close image preview. */
  onCancel?: () => void;
};

export type ImagePreviewState = {
  /** If the image should be scaled up to fill the entire preview space (if it is smaller than that space). */
  scaleUp: boolean;
  /** Original width of image (in pixels). */
  imageWidth: number;
  /** Original height of image (in pixels). */
  imageHeight: number;
  /** Width of border (in pixels). The border is the area between the preview space and the edge of the window. */
  borderWidth: number;
  /** Height of border (in pixels). The border is the area between the preview space and the edge of the window. */
  borderHeight: number;
};

/** An overlay that covers the entire window and displays an image in the center. */
export class ImagePreview extends React.Component<ImagePreviewProps, ImagePreviewState> {
  borderRef: React.RefObject<HTMLDivElement> = React.createRef();
  /** Parent element of the overlay root element. */
  parent: HTMLElement;
  /** Root element of the overlay. */
  element: HTMLElement;

  constructor(props: ImagePreviewProps) {
    super(props);
    this.state = {
      scaleUp: false,
      imageWidth: 0,
      imageHeight: 0,
      borderWidth: 0,
      borderHeight: 0,
    };
    this.parent = document.body;
    this.element = document.createElement('div');
  }

  componentDidUpdate(prevProps: ImagePreviewProps, prevState: ImagePreviewState) {
    if (this.props.src !== prevProps.src) {
      this.updateBorderSize();
    }
  }

  componentDidMount() {
    this.parent.appendChild(this.element);
    window.addEventListener('resize', this.updateBorderSize);
    this.updateBorderSize();
  }

  componentWillUnmount() {
    this.parent.removeChild(this.element);
    window.removeEventListener('resize', this.updateBorderSize);
  }

  render() {
    return ReactDOM.createPortal((
      <div
        className='image-preview'
        onClick={this.onClickBackground}>
        <div
          className='image-preview__border simple-center'
          onClick={this.onClickBackground}
          ref={this.borderRef}>
          <div
            className='simple-center__inner simple-center__vertical-inner'
            onClick={this.onClickBackground}>
            <img
              className={'image-preview__image' + (this.state.scaleUp ? ' image-preview__image--fill' : ' image-preview__image--fit')}
              src={this.props.src}
              onClick={this.onClickImage}
              onLoad={this.onLoad}
              style={{ ...this.calculateSize() }} />
          </div>
        </div>
      </div>
    ), this.element);
  }

  /** Calculate the size the image should have, depending on the current state. */
  calculateSize(): { width: number, height: number } {
    const { scaleUp, imageWidth, imageHeight, borderWidth, borderHeight } = this.state;
    let width = imageWidth;
    let height = imageHeight;
    const scale = Math.min(borderWidth / imageWidth, borderHeight / imageHeight);
    if (scaleUp || scale < 1) {
      width *= scale;
      height *= scale;
    }
    return { width, height };
  }

  onClickImage = (): void => {
    this.setState({ scaleUp: !this.state.scaleUp });
  }

  onClickBackground = (event: React.MouseEvent): void => {
    if (event.target === event.currentTarget) {
      if (this.props.onCancel) { this.props.onCancel(); }
    }
  }

  updateBorderSize = (): void => {
    const border = this.borderRef.current;
    if (!border) { throw new Error('Border is missing.'); }
    this.setState({
      borderWidth: border.offsetWidth,
      borderHeight: border.offsetHeight,
    });
  }

  onLoad = (event: React.SyntheticEvent<HTMLImageElement>): void => {
    this.setState({
      imageWidth: event.currentTarget.naturalWidth,
      imageHeight: event.currentTarget.naturalHeight,
    });
  }
}
