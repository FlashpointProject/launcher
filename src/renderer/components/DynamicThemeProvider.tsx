import { ReactNode, useState } from 'react';

type DynamicThemeProviderProps = {
  fileList: string[];
  children: ReactNode;
}

export function DynamicThemeProvider({ fileList, children }: DynamicThemeProviderProps) {
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);

  const newFiles = fileList.filter(f => !loadedFiles.includes(f));
  if (newFiles.length > 0) {
    const loadFiles = async (files: string[]) => {
      for (const file of files) {
        try {
          const elem = document.createElement('link');
          elem.setAttribute('href', file);
          elem.setAttribute('type', 'text/css');
          elem.setAttribute('rel', 'stylesheet');
          document.head.prepend(elem);
          log.debug('Extensions', `Loaded dynamic theme file '${file}'`);
        } catch (err) {
          log.error('Extensions', `Failed to load dynamic theme file '${file}': ${err}`);
        }
      }
    };

    setLoadedFiles(prev => [...prev, ...newFiles]);
    loadFiles(newFiles);
  }

  return <>
    {children}
  </>;
}
