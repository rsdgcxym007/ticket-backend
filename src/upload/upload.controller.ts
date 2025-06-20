// upload.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import path from 'path';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          const filename = file.fieldname + '-' + uniqueSuffix + ext;
          cb(null, filename);
        },
      }),
    }),
  )
  @Post()
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.processFile(file.path);

    return {
      message: `✅ พบเบอร์ไม่ซ้ำ ${result.count} หมายเลข`,
      totalPhoneNumbers: result.total,
      uniquePhoneNumbers: result.count,
      duplicatePhoneNumbers: result.duplicate,
      file: result.outputFile, // 📄 ส่งชื่อไฟล์เดียว
    };
  }

  @Post('check-new')
  @UseInterceptors(FileInterceptor('file'))
  async checkNewFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.processFileAndCompareWithHistory(
      file.path,
    );

    return {
      total: result.total,
      newUniqueCount: result.newUnique.length,
      duplicateWithHistoryCount: result.duplicateWithHistory.length,
      duplicateInFileCount: result.duplicateInFile.length,
    };
  }

  @Post('filter-and-merge')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const filename = `${file.fieldname}-${Date.now()}${ext}`;
          cb(null, filename);
        },
      }),
    }),
  )
  async filterAndMerge(@UploadedFile() file: Express.Multer.File) {
    if (!file?.path) {
      throw new Error('❌ ไม่พบไฟล์ที่อัปโหลด กรุณาแนบไฟล์ key: "file"');
    }

    const result = await this.uploadService.filterAndMergeUniquePhones(
      file.path,
    );

    return {
      totalPhoneNumbers: result.total,
      newUniqueCount: result.newUniqueCount,
      savedToFile: result.savedTo,
      updatedMainFile: 'unique_numbers.txt',
    };
  }
}
