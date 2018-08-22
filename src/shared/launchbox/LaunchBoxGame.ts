export class LaunchBoxGame {
  /**
   * Generate filename of an image of a LaunchBox Game
   * (Ex. ("Abobo's Big Adventure", 1) => "Abobo_s Big Adventure-01")
   * (Ex. ("$wag") => "$wag")
   * @param title Title of the LaunchBox Game
   * @param index Index of the image
   */
  public static generateImageFilename(title: string, index?: number): string {
    // Replace all invalid filename characters (and some additional ones) with underscores
    const cleanTitle = title.replace(/[/\\?%*:|"<>']/g, '_');
    if (index === undefined) {
      return cleanTitle;
    } else {
      index = index|0; // Floor index
      return cleanTitle+'-'+((index<10)?'0':'')+index; // Add index (and pad it if only one digit)
    }
  }
}
