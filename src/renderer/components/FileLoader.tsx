import React, { useCallback, useRef, useImperativeHandle, forwardRef, useState } from 'react';

type FileLoaderOpts = {
  accept?: string;
}

type FileLoaderProps = {
  onFileSelect?: (file?: File) => void;
  opts?: FileLoaderOpts;
}

export type FileLoaderRef = {
  openFileSelect: () => void;
}

export const FileLoader = forwardRef<FileLoaderRef, FileLoaderProps>(({ onFileSelect, opts }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const openFileSelect = () => {
    fileInputRef.current?.click();
  };

  useImperativeHandle(ref, () => ({
    openFileSelect
  }));

  return (
    <input
      ref={fileInputRef}
      type="file"
      name="file"
      accept={opts?.accept}
      onChange={handleFileChange}
      style={{ display: 'none' }}
    />
  );
});

type FileLoaderState = {
  fileLoader: React.ReactNode;
  openFileSelect: (callback: (file?: File) => void, opts?: FileLoaderOpts) => void;
}

export function useFileLoader(): FileLoaderState {
  const [fileLoaderProps, setFileLoaderProps] = useState<FileLoaderProps>();
  const fileLoaderRef = useRef<FileLoaderRef>(null);

  const fileLoader = <FileLoader ref={fileLoaderRef} {...fileLoaderProps} />;

  const openFileSelect = useCallback((cb: (file?: File) => void, opts?: FileLoaderOpts) => {
    setFileLoaderProps({
      onFileSelect: cb,
      opts,
    });
    // Wait for next render so opts can update before clicking
    setTimeout(() => {
      fileLoaderRef.current?.openFileSelect();
    }, 0);
  }, []);

  return {
    fileLoader,
    openFileSelect
  };
}
