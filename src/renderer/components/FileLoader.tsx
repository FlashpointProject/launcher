import React, { useCallback, useRef, useImperativeHandle, forwardRef, useState, DetailedHTMLProps, InputHTMLAttributes } from 'react';

type FileLoaderOpts = {
  directory?: boolean;
  accept?: string;
}

type FileLoaderProps = {
  onFileSelect?: (fileList: FileList | null) => void;
  opts?: FileLoaderOpts;
}

export type FileLoaderRef = {
  openFileSelect: () => void;
}

export const FileLoader = forwardRef<FileLoaderRef, FileLoaderProps>(({ onFileSelect, opts }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onFileSelect) {
      onFileSelect(event.target.files);
    }
  };

  const openFileSelect = () => {
    fileInputRef.current?.click();
  };

  useImperativeHandle(ref, () => ({
    openFileSelect
  }));

  const inputProps: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> = {
    ref: fileInputRef,
    type: 'file',
    accept: opts?.accept,
    onChange: handleFileChange,
    style: { display: 'none' },
    webkitdirectory: opts?.directory ? '' : undefined,
    directory: opts?.directory ? '' : undefined,
  };

  return (
    <input {...inputProps} />
  );
});

type FileLoaderState = {
  fileLoader: React.ReactNode;
  openFileSelect: (callback: (fileList: FileList | null) => void, opts?: FileLoaderOpts) => void;
}

export function useFileLoader(): FileLoaderState {
  const [fileLoaderProps, setFileLoaderProps] = useState<FileLoaderProps>();
  const fileLoaderRef = useRef<FileLoaderRef>(null);

  const fileLoader = <FileLoader ref={fileLoaderRef} {...fileLoaderProps} />;

  const openFileSelect = useCallback((cb: (fileList: FileList | null) => void, opts?: FileLoaderOpts) => {
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
