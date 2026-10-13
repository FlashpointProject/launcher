import { formatString } from '@shared/utils/StringFormatter';
import * as React from 'react';
import { LangContext } from '../util/lang';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { ImagePreview } from './ImagePreview';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';
import { LangContainer } from 'flashpoint-launcher';

type GameImageSplitProps = {
  /** Localized name of image (for button). */
  text: string;
  /** Source of the image (undefined if there is no image). */
  imgSrc?: string;
  /** Whether to show the text above images */
  showHeaders: boolean;
  /** Called when the image file has been set by the user */
  onSetImage: (data: ArrayBuffer) => void;
  /** Called when the "remove" button is clicked. This button is only shown while there is an image. */
  onRemoveClick: () => void;
  /** Called when something is dropped on this component. */
  onDrop: (event: React.DragEvent) => void;
  /** If the user should not be able to add a new image. */
  disabled?: boolean;
  /** Force reload by changing version */
  version?: number;
};

type GameImageSplitState = {
  /** If the cursor is dragging something over this element. */
  hover: boolean;
  /** If the preview should be shown. */
  showPreview: boolean;
};

/**
 * An "image slot" inside the "game image split" area.
 * This component will either display a text and an "add" button, or an image and a "remove" button (depending on if the image source is undefined).
 * It's meant to be used for displaying the current, or allowing the user to add a new, image for a game.
 */
export class GameImageSplit extends React.Component<GameImageSplitProps, GameImageSplitState> {
  static contextType = LangContext;
  declare context: React.ContextType<typeof LangContext>;

  inputRef: React.RefObject<HTMLInputElement | null>;

  constructor(props: GameImageSplitProps) {
    super(props);
    this.inputRef = React.createRef();
    this.state = {
      hover: false,
      showPreview: false
    };
  }

  render() {
    const strings = this.context;
    let imgSrc = this.props.imgSrc;
    const { disabled, text, showHeaders, version } = this.props;
    const { hover, showPreview } = this.state;
    // Add version to image source
    if (imgSrc && version) {
      imgSrc += '?' + version;
    }
    // Class name
    let className = 'game-image-split';
    if (imgSrc === undefined) { className += ' simple-center'; }
    if (hover)                { className += ' game-image-split--hover'; }
    if (disabled)             { className += ' game-image-split--disabled'; }
    // Render
    return (
      <div
        className={className}
        style={{ backgroundImage: imgSrc ? `url("${imgSrc}")` : undefined }}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onClick={this.onPreview}
        onDrop={this.onDrop}>
        { (imgSrc === undefined) ? (
          <div className='game-image-split__not-found'>
            <h1>{formatString(strings.misc.noBlankFound, text)}</h1>
            <input
              hidden={true}
              ref={this.inputRef}
              accept='image/png'
              onChange={this.onInputFileChange}
              type='file'/>
            <SimpleButton
              value={formatString(strings.misc.addBlank, text)}
              onClick={() => this.inputRef.current && this.inputRef.current.click()}
              disabled={disabled} />
          </div>
        ) : (
          <div className='game-image-split__buttons'>
            {showHeaders ? <p>{text}</p> : undefined}
            <ConfirmElement
              message={strings.dialog.deleteGameImage}
              onConfirm={this.onRemoveClick}
              render={renderDeleteImageButton}
              extra={[strings.misc, text, !!disabled]} />
            { showPreview ? (
              <ImagePreview
                src={this.props.imgSrc}
                onCancel={this.onPreviewCancel} />
            ) : undefined }
          </div>
        ) }
      </div>
    );
  }

  onInputFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const data = await file.arrayBuffer();
      this.props.onSetImage(data);
    }
  };

  onRemoveClick = () => {
    this.props.onRemoveClick();
  };

  onDragOver = (event: React.DragEvent): void => {
    const types = event.dataTransfer.types;
    if (types.length === 1 && types[0] === 'Files') {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (!this.state.hover) { this.setState({ hover: true }); }
    }
  };

  onDrop = (event: React.DragEvent): void => {
    if (this.state.hover) { this.setState({ hover: false }); }
    this.props.onDrop(event);
  };

  onDragLeave = (): void => {
    if (this.state.hover) { this.setState({ hover: false }); }
  };

  /** Refresh all images of all game image splits. */
  static refreshImages() {
    const elements = document.getElementsByClassName('game-image-split');
    for (let i = 0; i < elements.length; i++) {
      const item: HTMLElement | null = elements.item(i) as any;
      if (item) {
        const val = item.style.backgroundImage;
        item.style.backgroundImage = '';
        item.style.backgroundImage = val;
      }
    }
  }

  onPreview = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && this.props.imgSrc) {
      this.setState({ showPreview: true });
    }
  };

  onPreviewCancel = () => {
    this.setState({ showPreview: false });
  };
}

function renderDeleteImageButton({ confirm, extra }: ConfirmElementArgs<[LangContainer['misc'], string, boolean]>): React.JSX.Element {
  const [ strings, text, disabled ] = extra;
  return (
    <div
      className={
        'game-image-split__buttons__remove-image' +
        (disabled ? ' game-image-split__buttons__remove-image--disabled' : '')
      }
      title={formatString(strings.deleteAllBlankImages, text) as string}
      onClick={!disabled ? confirm : undefined} >
      <OpenIcon icon='trash' />
    </div>
  );
}
