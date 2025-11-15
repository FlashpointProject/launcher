/** Channel to send the "initialize renderer" message over. */
export const InitRendererChannel = 'renderer-init';

/** Message contents for the "initialize renderer" message. */
export type InitRendererData = {
  isBackRemote: boolean;
  isDev: boolean;
  host: string;
  url?: string;
}

export const FlashInitChannel = 'renderer-flash-init';

export type FlashInitData = {
  entry: string;
}
