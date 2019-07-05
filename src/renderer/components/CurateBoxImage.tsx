import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { CurationIndexImage } from '../curate/indexCuration';
import { ImagePreview } from './ImagePreview';

type CurateBoxImageProps = {
  image?: CurationIndexImage;
};

/** An image inside a curate box (screenshot or thumbnail). */
export function CurateBoxImage(props: CurateBoxImageProps) {
  // If the preview should be displayed
  const [showPreview, setShowPreview] = useState(false);
  // Callback for when the image is clicked
  const onImageClick = useCallback(() => {
    setShowPreview(true);
  }, [setShowPreview]);
  // Callback for when the preview is cancelled
  const onPreviewCancel = useCallback(() => {
    setShowPreview(false);
  }, [setShowPreview]);
  // Get image source
  const [image, previewImage] = useImageSource(props.image);
  // Render
  return (
    <>
      {/* Image */}
      <div
        className='curate-box-images__image'
        onClick={onImageClick}
        style={{ backgroundImage: image }}
        />
      {/* Preview */}
      { showPreview ? (
        <ImagePreview
          src={previewImage}
          onCancel={onPreviewCancel} />
      ) : undefined }
    </>
  );
}

/**
 * Get the source(s) of the image. They are memoized.
 * @param image Image to get the source(s) of.
 * @returns The sources of the image.
 *          The first source is formatted to be used as the value of "background-image".
 *          The second source is formatted to be used as the "src" of an <img> element.
 */
function useImageSource(image?: CurationIndexImage) {
  return useMemo((): [string?, string?] => {
    if (image) {
      if (image.data) {
        const base64 = 'data:image/png;base64,' + image.data;
        return [`url("${base64}")`, base64];
      } else if (image.source) {
        return [image.source, image.source];
      } else {
        // Image file not found
        return [];
      }
    } else {
      // No image (yet)
      return [];
    }
  }, [image]);
}
