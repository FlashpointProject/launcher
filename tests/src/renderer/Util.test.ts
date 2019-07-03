/* Tests for src/main/renderer/Util.ts */
import { shuffle, joinLibraryRoute } from "../../../src/renderer/Util";

// getPlatformIconPath() - to be tested (may need mocks)

// easterEgg() - to be tested (may need mocks)

describe('Util.shuffle()', function () {
  const list: any[] = [9, "12", 29, "Hello", 3.9, "Flashpoint", -90];
  expect(shuffle(list)).not.toBe([ 9, "12", 29, "Hello", 3.9, "Flashpoint", -90 ]);
});

describe('Util.joinLibraryRoute()', function (){
  test("Empty Route", () => {
    const route: string = "";
    expect(joinLibraryRoute(route)).toBe('/browse');
  });
  test("Passing a route", () => {
    const route: string = "arcade";
    expect(joinLibraryRoute(route)).toBe('/browse/arcade');
  });
  test("Lots of slashes", () => {
    const route: string = "arcade/flash/plugin/shockwa///ve"
    expect(joinLibraryRoute(route)).toBe('/browse/arcadeflashpluginshockwave');
  });
  test("Double dots", () => {
    const route: string = "..";
    expect(joinLibraryRoute(route)).toBe('/browse');
  });
});

// findElementAncestor() - to be tested (may need mocks)
