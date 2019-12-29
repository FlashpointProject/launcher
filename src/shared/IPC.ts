/** Channel to send the "intialize renderer" message over. */
export const InitRendererChannel = 'renderer-init';

/** Message contents for the "initialze renderer" message. */
export type InitRendererData = {
  host: string;
  secret: string;
}
