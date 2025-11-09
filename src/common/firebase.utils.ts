import * as fs from 'fs';
import * as path from 'path';

export function loadFirebaseCredentials(): object {
  const credentialsPath = path.join(process.cwd(), 'firebase-credentials.json');
  const fileContent = fs.readFileSync(credentialsPath, 'utf-8').trim();
  return JSON.parse(fileContent);
}

