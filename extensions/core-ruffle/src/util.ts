import * as fs from 'fs';
import axios from 'axios';
import arch from 'arch';
import { AssetFile } from './types';

export async function downloadFile(url: string, filePath: string): Promise<void> {
  const file = fs.createWriteStream(filePath);
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Flashpoint Launcher/Ruffle Extension' },
    responseType: 'stream'
  });
  if (res.status != 200) {
    throw new Error(`Status: ${res.status}`);
  }
  res.data.pipe(file);
  return new Promise<void>((resolve, reject) => {
    file.on('finish', resolve);
    file.on('error', reject);
  });
}

export async function downloadJson(url: string): Promise<any> {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Flashpoint Launcher/Ruffle Extension' },
    responseType: 'json'});
  if (res.status != 200) {
    throw new Error(`Status: ${res.status}`);
  }
  return res.data;
}

export async function getGithubReleaseAsset(nameRegex: RegExp, tag: string): Promise<AssetFile | null> {
  const releaseUrl = `https://api.github.com/repos/ruffle-rs/ruffle/releases/tags/${tag}`;

  return axios.get(releaseUrl)
  .then((response) => {
    const releaseAssets = response.data.assets;

    // Find the asset that matches your regex pattern
    const asset = releaseAssets.find((asset: any) =>
      nameRegex.test(asset.name)
    );

    if (asset) {
      console.log(`Found matching asset: ${asset.name}`);
      console.log(`Download URL: ${asset.browser_download_url}`);
      const assetFile: AssetFile = {
        name: asset['name'],
        url: asset['browser_download_url'],
        publishedAt: '',
      };
      return assetFile;
    } else {
      return null;
    }
  })
  .catch((error) => {
    throw `Error fetching release information: ${error}`;
  });
}

export async function getGithubAsset(nameRegex: RegExp, logDev: (text: string) => void): Promise<AssetFile | null> {
  const releasesUrl = 'https://api.github.com/repos/ruffle-rs/ruffle/releases';
  logDev(`Fetching Release from ${releasesUrl}`);
  const releasesJson = await downloadJson(releasesUrl);
  if (!Array.isArray(releasesJson)) {
    throw new Error(`Failed to fetch releases - ${releasesJson['message'] || 'No Message Given'}`);
  }
  if (releasesJson.length === 0) {
    throw new Error('Repo has no releases.');
  }
  const latestRelease = releasesJson[0];
  logDev(`Found Release\n  ID: ${latestRelease['id']}\n  Name: ${latestRelease['name']}\n  Published: ${latestRelease['published_at']}`);
  const assetsUrl = latestRelease['assets_url'];
  logDev(`Fetching Assets from ${assetsUrl}`);
  const assetsJson = await downloadJson(assetsUrl);
  const assets: AssetFile[] = assetsJson.map((asset: any) => {
    return {
      name: asset['name'],
      url: asset['browser_download_url'],
      publishedAt: latestRelease['published_at']
    };
  });
  for (const asset of assets) {
    if (nameRegex.test(asset.name)) {
      return asset;
    }
  }
  return null;
}

export function getPlatformRegex(): RegExp {
  switch (process.platform) {
    case 'win32':
      switch (arch()) {
        case 'x64': return /.*windows-x86_64\.zip/;
        case 'x86': return /.*windows-x86_32\.zip/;
        default: throw new Error(`Unsupported architecture: ${arch()}`);
      }
    case 'linux':
      return /.*linux-x86_64\.tar\.gz/;
    case 'darwin':
      return /.*macos-universal\.tar\.gz/;
    default:
      throw new Error('Operating System not supported by Ruffle.');
  }
}
