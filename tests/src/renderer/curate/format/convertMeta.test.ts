import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { convertMeta, ParsedCurationMeta } from '../../../../../src/renderer/curate/parse';
import { stripBOM } from '../../../../../src/shared/Util';

describe('convertMeta()',function () {
  test('Empty meta', () => {
    const meta = fs.readFileSync(path.resolve(emptyMetaPath));
    const parsedMeta = YAML.parse(stripBOM(meta.toString()));
    expect(convertMeta(parsedMeta))
    .toEqual(emptyMeta);
  });

  test('Library case insensitive', () => {
    const meta = fs.readFileSync(path.resolve(libraryCasePath));
    const parsedMeta = YAML.parse(stripBOM(meta.toString()));
    expect(convertMeta(parsedMeta))
    .toEqual(libraryCase);
  });

  test('Example file', () => {
    const meta = fs.readFileSync(path.resolve(exampleMetaPath));
    const parsedMeta = YAML.parse(stripBOM(meta.toString()));
    expect(convertMeta(parsedMeta))
    .toEqual(exampleMeta);
  });
});

const emptyMetaPath = './tests/static/curate/format/meta_empty.yaml';
const emptyMeta: ParsedCurationMeta = {
  game: {},
  addApps: []
}

const libraryCasePath = './tests/static/curate/format/meta_libraryCase.yaml';
const libraryCase: ParsedCurationMeta = {
  game: {
    library: 'arcade'
  },
  addApps: []
}

const exampleMetaPath = './tests/static/curate/format/meta_example.yaml'
const exampleMeta: ParsedCurationMeta = {
  game: {
    title: 'Test Curation',
    library: 'theatre',
    series: 'Series',
    developer: 'Developer',
    publisher: 'Publisher',
    playMode: 'Single Player',
    releaseDate: '2019-01-01',
    version: '1.0.0',
    language: 'en',
    extreme: 'Yes',
    genre: 'List; Of; Genres',
    source: 'http://example.com/',
    platform: 'HTML5',
    status: 'Playable',
    applicationPath: 'FPSoftware\\Basilisk-Portable\\Basilisk-Portable.exe',
    launchCommand: 'http://example.com/index.html',
    notes: 'Notes',
    originalDescription: 'Original\nMultiline\nDesc'
  },
  addApps: [
    {
      heading: 'Example Add App',
      applicationPath: 'FPSoftware\\Basilisk-Portable\\Basilisk-Portable.exe',
      launchCommand: 'http://example.com/index.html?lang=en'
    }
  ]
}