import * as flashpoint from 'flashpoint-launcher';
import * as path from 'path';
import * as fs from 'fs';
import mustache from 'mustache';

export function buildBasicTemplate(game: flashpoint.Game, sourceUrl: string) {
  const templatesRoot = path.join(flashpoint.extensionPath, 'static', 'templates');
  const data = fs.readFileSync(path.join(templatesRoot, 'basic.mustache'), 'utf8');
  const styleData = fs.readFileSync(path.join(templatesRoot, 'basic.css'), 'utf8');
  return mustache.render(data, { title: game.title, sourceUrl, styleData });
}
