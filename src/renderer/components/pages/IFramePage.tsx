export type IFramePageProps = {
  url: string;
}

export function IFramePage(props: IFramePageProps) {
  return (
    <div className='iframe-page'>
      <iframe className={`iframe-page-inner ${props.inheritCss ? '' : 'iframe-clear-css'}`} src={props.url}></iframe>
    </div>
  );
}
