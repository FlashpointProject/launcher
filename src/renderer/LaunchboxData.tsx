import { IRawLaunchBoxPlatformRoot } from "../shared/launchbox/interfaces";
import { IGameCollection } from "../shared/game/interfaces";
import * as fastXmlParser from 'fast-xml-parser';
import { GameParser } from "../shared/game/GameParser";

export class LaunchboxData {
  public static fetch(url: string): Promise<IGameCollection> {
    return new Promise((resolve, reject) => {
      fetch(url, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
        }
      })
      .then((response?: Response) => {
        if (!response) {
          reject(new Error('No response'));
          return;
        }
        response.text()
        .then((text: string) => {
          // Parse XML text to objects
          let a = performance.now();
          const data: IRawLaunchBoxPlatformRoot|undefined = fastXmlParser.parse(text, {
            ignoreAttributes: true,
            ignoreNameSpace: true,
            parseNodeValue: true,
            parseAttributeValue: false,
            parseTrueNumberOnly: true,
            // @TODO Look into which settings are most appropriate
          });
          if (!data) {
            reject(new Error('Failed to parse XML'));
            return;
          }
          // Format objects to desired format (IGameCollection)
          const parsed = GameParser.parse(data);
          // Done
          resolve(parsed);
        })
        .catch(reject);
      })
      .catch(reject);
    });
  }
}
