import * as fs from 'fs';
import * as path from 'path';

export function getImageBase64(imagePath: string): string {
  // รองรับ path ที่เป็น relative จาก root project
  const absPath = path.isAbsolute(imagePath)
    ? imagePath
    : path.join(process.cwd(), imagePath);
  const ext = path.extname(absPath).toLowerCase();
  const file = fs.readFileSync(absPath);
  let mimeType = 'image/png';
  if (ext === '.svg') mimeType = 'image/svg+xml';
  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.gif') mimeType = 'image/gif';
  return `data:${mimeType};base64,${file.toString('base64')}`;
}
