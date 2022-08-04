import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { stdin as input, stdout as output } from 'node:process';
import { exit } from 'process';

const rl = readline.createInterface({ input, output });

const { CROWDIN_API_KEY } = JSON.parse(fs.readFileSync('./secrets.json'));
const headers = {
  'Authorization': `Bearer ${CROWDIN_API_KEY}`,
  'Content-Type': 'application/json'
};

const baseUrl = 'https://api.crowdin.com/api/v2';
const projectId = 380336;

async function getProjectInfo() {
  const res = await axios.get(`${baseUrl}/projects/${projectId}`, { headers });
  return res.data.data;
}

async function getLanguageInfo(lang) {
  const res = await axios.get(`${baseUrl}/languages/${lang}`, { headers });
  return res.data.data;
}

async function getLanguageProgress(lang) {
  const res = await axios.get(`${baseUrl}/projects/${projectId}/languages/${lang}/progress`, { headers });
  return res.data.data;
}

async function getProjectBranches() {
  const res = await axios.get(`${baseUrl}/projects/${projectId}/branches`, { headers });
  return res.data.data;
}

async function chooseBranch() {
  const branches = await getProjectBranches();
  const question = 'Choose Branch:\n' + branches.map((b, i) => `${i+1}) ${b.data.name}\n`).join('') + 'Branch: ';
  return new Promise((resolve, reject) => {
    rl.question(question, (ans) => {
      try {
        const ansNum = parseInt(ans, 10);
        if (ansNum <= branches.length && ansNum >= 1) {
          console.log('');
          resolve(branches[ansNum-1].data);
        } else {
          throw '';
        }
      } catch {
        reject('Invalid answer');
      }
    });
  });
}

async function getFilesFromBranch(branchId) {
  const res = await axios.get(`${baseUrl}/projects/${projectId}/files?branchId=${branchId}&recursion=true`, { headers });
  return res.data.data;
}

async function buildFileTranslation(fileId, langId) {
  const buildRes = await axios.post(`${baseUrl}/projects/${projectId}/translations/builds/files/${fileId}`, {
    targetLanguageId: langId
  }, { headers });
  const res = await axios.get(buildRes.data.data.url);
  return res.data;
}

function fillExportPattern(pattern, langInfo) {
  return pattern
  .replace('%locale%', langInfo.locale);
}

const opts = {
  minTranslation: 80,
  approvedOnly: false
};

try {
  const info = await getProjectInfo();
  const branch = await chooseBranch();
  const files = (await getFilesFromBranch(branch.id)).map(f => {
    return {
      id: f.data.id,
      path: f.data.path,
      name: f.data.name,
      exportPattern: f.data.exportOptions.exportPattern
    };
  });

  const langs = info.targetLanguageIds;
  for (const lang of langs) {
    const langInfo = await getLanguageInfo(lang);
    const progress = await getLanguageProgress(lang);
    for (const data of progress.filter(d => files.find(f => f.id === d.data.fileId)).map(d => d.data)) {
      const file = files.find(f => f.id === data.fileId);
      console.log(`Language: (${langInfo.locale}) ${langInfo.name} (${file.name}):\n\tTranslated:\t${data.translationProgress}%\tApproved:\t${data.approvalProgress}%`);
      const dest = fillExportPattern(file.exportPattern.substring(1), langInfo);
      if (opts.approvedOnly ? data.approvalProgress >= opts.minTranslation : data.translationProgress >= opts.minTranslation) {
        console.log('Criteria met, building translation file...');
        const translation = await buildFileTranslation(file.id, lang);
        await fs.promises.writeFile(dest, JSON.stringify(translation, undefined, 2), 'utf-8');
        console.log('Saved to: ' + path.resolve(dest) + '\n');
      } else {
        console.log('Criteria not met, checking for outdated translations to remove...');
        try {
          await fs.promises.access(dest, fs.constants.R_OK);
          console.log(`File found at ${path.resolve(dest)}, removing...\n`);
          await fs.promises.unlink(dest);
        } catch {
          console.log('');
          /** Do Nothing */
        }
      }
    }
  }
  console.log('Done!');
  exit();
} catch (err) {
  console.error(err);
}
