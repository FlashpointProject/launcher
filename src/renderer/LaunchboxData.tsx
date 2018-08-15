import { LaunchBoxPlatform } from "../shared/launchbox/LaunchBoxPlatform";
import { ILaunchBoxPlatform } from "../shared/launchbox/interfaces";

export class LaunchboxData {
  private _data: any;
  
  constructor() {
  }

  public static fetch(url: string): Promise<ILaunchBoxPlatform> {
    return new Promise((resolve, reject) => {
      fetch(url, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
        }
      })
      .then((response?: Response) => {
        if (!response) { return; }
        response.text()
        .then((text: string) => {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          const parsed = LaunchBoxPlatform.parse(xmlDoc);
          resolve(parsed);
        })
        .catch(reject);
      })
      .catch(reject);
    });
  }
}