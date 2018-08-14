export class LaunchboxData {
  private _data: any;
  
  constructor() {
  }

  public fetch() {
    fetch('../Data/Platforms/Flash.xml', {
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
        console.log(xmlDoc);
      })
      .catch(console.log);
    })
    .catch(console.log);
  }
}