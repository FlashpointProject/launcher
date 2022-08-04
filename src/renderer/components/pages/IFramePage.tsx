export type IFramePageProps = {
  url: string;
}

export function IFramePage(props: IFramePageProps) {
  return (
    <div className='iframe-page'>
      <iframe className='iframe-page-inner' src={props.url}></iframe>
    </div>
  );
}
