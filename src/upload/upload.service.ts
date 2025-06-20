import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class UploadService {
  async processFile(filePath: string): Promise<{
    count: number;
    total: number;
    duplicate: number;
    outputFile: string;
  }> {
    const seen = new Map<string, number>();
    let total = 0;

    const fileStream = fs.createReadStream(filePath, 'utf8');
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const phone = line.trim();

      // ✅ กรองเฉพาะเบอร์ไทย 10 หลัก (ขึ้นต้น 06, 08, 09)
      if (!/^(06|08|09)\d{8}$/.test(phone)) continue;

      total++;
      seen.set(phone, (seen.get(phone) || 0) + 1);
    }

    const uniquePhones = Array.from(seen.entries())
      .filter(([, count]) => count === 1)
      .map(([phone]) => phone);

    const duplicateCount = total - uniquePhones.length;

    const outputDir = path.join(__dirname, '../../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputFile = path.join(outputDir, 'unique_numbers.txt');
    fs.writeFileSync(outputFile, uniquePhones.join(os.EOL), 'utf8');

    return {
      count: uniquePhones.length,
      total,
      duplicate: duplicateCount,
      outputFile: 'unique_numbers.txt',
    };
  }

  async processFileAndCompareWithHistory(filePath: string): Promise<{
    total: number;
    newUnique: string[];
    duplicateWithHistory: string[];
    duplicateInFile: string[];
  }> {
    const currentSeen = new Map<string, number>();
    const historySet = new Set<string>();
    const duplicateWithHistory = new Set<string>();

    const newFileStream = fs.createReadStream(filePath, 'utf8');
    const rlNew = readline.createInterface({
      input: newFileStream,
      crlfDelay: Infinity,
    });

    // 🔁 1. โหลดเบอร์จาก unique_numbers.txt ที่มีอยู่แล้ว (ถ้ามี)
    const historyPath = path.join(__dirname, '../../output/unique_numbers.txt');
    if (fs.existsSync(historyPath)) {
      const historyLines = fs.readFileSync(historyPath, 'utf8').split(/\r?\n/);
      for (const line of historyLines) {
        const phone = line.trim();
        if (/^(06|08|09)\d{8}$/.test(phone)) {
          historySet.add(phone);
        }
      }
    }

    // 🔁 2. อ่านไฟล์ที่อัปโหลดใหม่
    let total = 0;

    for await (const line of rlNew) {
      const phone = line.trim();
      if (!/^(06|08|09)\d{8}$/.test(phone)) continue;

      total++;

      if (historySet.has(phone)) {
        duplicateWithHistory.add(phone);
      }

      currentSeen.set(phone, (currentSeen.get(phone) || 0) + 1);
    }

    // 🔍 3. แยกกลุ่ม
    const duplicateInFile = Array.from(currentSeen.entries())
      .filter(([, count]) => count > 1)
      .map(([phone]) => phone);

    const newUnique = Array.from(currentSeen.entries())
      .filter(([phone, count]) => count === 1 && !historySet.has(phone))
      .map(([phone]) => phone);

    // ✅ 4. return ผลลัพธ์
    return {
      total,
      newUnique,
      duplicateWithHistory: [...duplicateWithHistory],
      duplicateInFile,
    };
  }
  async filterAndMergeUniquePhones(filePath: string): Promise<{
    total: number;
    newUniqueCount: number;
    savedTo: string;
  }> {
    const currentSeen = new Map<string, number>();
    const historySet = new Set<string>();

    const historyPath = path.join(__dirname, '../../output/unique_numbers.txt');
    const filteredPath = path.join(
      __dirname,
      '../../output/filtered_unique.txt',
    );

    // 🔁 โหลดเบอร์จาก history
    if (fs.existsSync(historyPath)) {
      const lines = fs.readFileSync(historyPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const phone = line.trim();
        if (/^(06|08|09)\d{8}$/.test(phone)) {
          historySet.add(phone);
        }
      }
    }

    // 🔁 อ่านไฟล์ใหม่
    const fileStream = fs.createReadStream(filePath, 'utf8');
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let total = 0;

    for await (const line of rl) {
      const phone = line.trim();
      if (!/^(06|08|09)\d{8}$/.test(phone)) continue;

      total++;
      currentSeen.set(phone, (currentSeen.get(phone) || 0) + 1);
    }

    // ✅ คัดเบอร์ใหม่ที่:
    // - ไม่ซ้ำกับ history
    // - ไม่ซ้ำภายในไฟล์ใหม่
    const newUnique = Array.from(currentSeen.entries())
      .filter(([phone, count]) => count === 1 && !historySet.has(phone))
      .map(([phone]) => phone);

    // ✅ บันทึกไว้ใน filtered_unique.txt
    fs.writeFileSync(filteredPath, newUnique.join(os.EOL), 'utf8');

    // ✅ ต่อท้ายลงใน unique_numbers.txt (แบบไม่ซ้ำ)
    if (newUnique.length > 0) {
      fs.appendFileSync(historyPath, os.EOL + newUnique.join(os.EOL), 'utf8');
    }

    return {
      total,
      newUniqueCount: newUnique.length,
      savedTo: 'filtered_unique.txt',
    };
  }
}
