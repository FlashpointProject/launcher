import * as React from 'react';
import { Link } from 'react-router-dom';
import { IDefaultProps } from '../../interfaces';

export interface IThumbnailProps extends IDefaultProps {
  src?: string; // URL of the image to load (null means load no image)
  // Size of the div surrounding the image (in pixels)
  parentWidth?: number;
  parentHeight?: number;
  // Size of the image inside the div (in pixels)
  imageWidth?: number;
  imageHeight?: number;
  //
  outerProps?: object;
  wrapperProps?: object;
  imageProps?: object;
}

export interface IThumbnailState {
  paddingLeft?: string;
  paddingTop?: string;
  isImageLoaded: boolean;
}

export class Thumbnail extends React.Component<IThumbnailProps, IThumbnailState> {
  private isUnmounted: boolean = false;
  private currentlyLoadingSrc: string|null = null; // URL of the image that is currently being loaded (null if not loading)

  constructor(props: IThumbnailProps) {
    super(props);
    this.state = {
      paddingLeft: '',
      paddingTop: '',
      isImageLoaded: false,
    };
  }

  componentWillUnmount() {
    this.isUnmounted = true;
  }

  render() {
    let { outerProps, wrapperProps, imageProps, src = '' } = this.props;
    let { paddingLeft, paddingTop } = this.state;
    this.tryLoadingImage();
    const srcUrl: string = 'url("'+encodeURI(src)+'")';
    return (
      <div {...(outerProps || {})} id={srcUrl}>
        <div {...(wrapperProps || {})} style={{paddingLeft, paddingTop}}>
          <div {...(imageProps || {})} style={this.state.isImageLoaded ? {backgroundImage: srcUrl} : undefined} />
        </div>
      </div>
    );
  }

  tryLoadingImage() {
    const { src } = this.props;
    if (src !== undefined && src !== this.currentlyLoadingSrc) {
      this.currentlyLoadingSrc = src;
      // Load the thumbnail image (in a hidden <img> element - then "moved" to a <div> as a background)
      const img = document.createElement('img');
      img.addEventListener('load', (event) => {
        if (this.isUnmounted) { return; }
        this.onImageLoaded(img, event);
      });
      img.setAttribute('src', src);
    }
  }

  onImageLoaded(img: HTMLImageElement, event: Event) {
    const { parentWidth, parentHeight, imageWidth, imageHeight } = this.props;
    // Contants
    const paw = parentWidth  || 48; // Parent Width (size of the box around the thumb)
    const pah = parentHeight || 43; // Parent Height
    const iw  = imageWidth   || 40; // Image Width (maximum size of the thumb)
    const ih  = imageHeight  || 35; // Image Height

    //
    let w  = img.width;         // Width (full size of image, before it is scaled)
    let h  = img.height;        // Height
    let ws = (iw / img.width);  // Width-scale (how scaled down it is)
    let hs = (ih / img.height); // Height-scale
    let ph = 0;                 // Padding horizontally (to the right)
    let pv = 0;                 // Padding vertically (downwards)

    // Get the scale used when resizing the image
    // (To keep aspect ratio, the image is scaled down with one scale on both sides.
    //  Otherwise it would be stretched.)
    let scale;
    if (ws > hs) { scale = hs; }
    else         { scale = ws; }

    // Calculate how much padding is needed to center the image (vertically and horizontally)
    // (By calculating the images "scaled size" (width|height * scale) and by detracting it
    //  from the "parents size" (width|height), we know how much "empty space" there is left.
    //  And by deviding that by two, we know how much space we need on each side to center it)
    ph = Math.round((paw - img.width  * scale) / 2);
    pv = Math.round((pah - img.height * scale) / 2);

    // Update state
    this.setState({
      paddingLeft: ph+'px',
      paddingTop:  pv+'px',
      isImageLoaded: true,
    });
  }
}
