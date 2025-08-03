import PdfPrinter from 'pdfmake/src/printer';
import * as path from 'path';

const fonts = {
  THSarabunNew: {
    normal: path.resolve(process.cwd(), 'fonts/THSarabunNew.ttf'),
    bold: path.resolve(process.cwd(), 'fonts/THSarabunNew-Bold.ttf'),
    italics: path.resolve(process.cwd(), 'fonts/THSarabunNew-Italic.ttf'),
    bolditalics: path.resolve(process.cwd(), 'fonts/THSarabunNew-Italic.ttf'),
  },
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
  Roboto: {
    normal: path.resolve(process.cwd(), 'fonts/Roboto-Regular.ttf'),
    bold: path.resolve(process.cwd(), 'fonts/Roboto-Bold.ttf'),
    italics: path.resolve(process.cwd(), 'fonts/Roboto-Italic.ttf'),
    bolditalics: path.resolve(process.cwd(), 'fonts/Roboto-BoldItalic.ttf'),
  },
};

const printerTH = new PdfPrinter({ THSarabunNew: fonts.THSarabunNew });
const printerStandard = new PdfPrinter({ Helvetica: fonts.Helvetica });
const printerRoboto = new PdfPrinter({ Roboto: fonts.Roboto });

export function createPdfBuffer(docDefinition: any): Promise<Buffer> {
  // เลือก printer ตามฟอนต์ที่ใช้ใน docDefinition
  let printer: PdfPrinter;
  if (
    docDefinition.defaultStyle &&
    docDefinition.defaultStyle.font === 'Roboto'
  ) {
    printer = printerRoboto;
  } else if (
    docDefinition.defaultStyle &&
    docDefinition.defaultStyle.font === 'Helvetica'
  ) {
    printer = printerStandard;
  } else {
    printer = printerTH;
  }
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: Buffer[] = [];

  return new Promise((resolve) => {
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.end();
  });
}
