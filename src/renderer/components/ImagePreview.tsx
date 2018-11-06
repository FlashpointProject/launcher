import * as React from 'react';
import * as ReactDOM from 'react-dom';

export interface IImagePreviewProps {
  /** Source of the image to show */
  src?: string;
  /** Called when the image preview should be cancelled */
  onCancel?: () => void;
}

export interface IImagePreviewState {
  /** If the image should be scaled up if its smaller than the size it can take up */
  scaleUp: boolean;
  /** Original width of image */
  imageWidth: number;
  /** Original height of image */
  imageHeight: number;
  /** Width of border */
  borderWidth: number;
  /** Height of border */
  borderHeight: number;
}

export class ImagePreview extends React.Component<IImagePreviewProps, IImagePreviewState> {
  private borderRef: React.RefObject<HTMLDivElement> = React.createRef();
  private parent: HTMLElement;
  private element: HTMLElement;

  constructor(props: IImagePreviewProps) {
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
    this.onClickImage = this.onClickImage.bind(this);
    this.onClickBackground = this.onClickBackground.bind(this);
    this.updateBorderSize = this.updateBorderSize.bind(this);
    this.onLoad = this.onLoad.bind(this);
  }

  componentDidUpdate(prevProps: IImagePreviewProps, prevState: IImagePreviewState) {
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
    const { scaleUp } = this.state;
    return ReactDOM.createPortal(
      (<div className='image-preview' onClick={this.onClickBackground}>
        <div className='image-preview__border simple-center' onClick={this.onClickBackground} ref={this.borderRef}>
          <div className='simple-center__inner simple-center__vertical-inner' onClick={this.onClickBackground}>
            <img className={'image-preview__image' + (scaleUp ? ' image-preview__image--fill' : ' image-preview__image--fit')}
                 src={this.props.src} onClick={this.onClickImage} onLoad={this.onLoad} style={{...this.calculateSize()}} />
          </div>
        </div>
      </div>),
      this.element,
    );
  }

  /** Calculate the size the image should have, depending on the current state */
  private calculateSize(): { width: number, height: number } {
    const { scaleUp, imageWidth, imageHeight, borderWidth, borderHeight } = this.state;
    let width = imageWidth;
    let height = imageHeight;
    const scale = Math.min(borderWidth / imageWidth, borderHeight / imageHeight);
    if (scaleUp || scale < 1) {
      width *= scale;
      height *= scale;
    }
    console.log(imageWidth, imageHeight, borderWidth, borderHeight, scale);
    return { width, height };
  }

  private onClickImage(): void {
    this.setState({ scaleUp: !this.state.scaleUp });
  }

  private onClickBackground(event: React.MouseEvent): void {
    if (event.target === event.currentTarget) {
      if (this.props.onCancel) { this.props.onCancel(); }
    }
  }

  private updateBorderSize(): void {
    const border = this.borderRef.current;
    if (!border) { throw new Error('Border is missing.'); }
    this.setState({
      borderWidth: border.offsetWidth,
      borderHeight: border.offsetHeight,
    });
  }
  
  private onLoad(event: React.SyntheticEvent<HTMLImageElement>): void {
    this.setState({
      imageWidth: event.currentTarget.naturalWidth,
      imageHeight: event.currentTarget.naturalHeight,
    });
  }
}
