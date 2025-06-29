import PdfPrinter from 'pdfmake/src/printer';
import * as path from 'path';

const fonts = {
  THSarabunNew: {
    normal: path.resolve(__dirname, '../../fonts/THSarabunNew.ttf'),
    bold: path.resolve(__dirname, '../../fonts/THSarabunNew-Bold.ttf'),
    italics: path.resolve(__dirname, '../../fonts/THSarabunNew-Italic.ttf'),
    bolditalics: path.resolve(
      __dirname,
      '../../fonts/THSarabunNew-BoldItalic.ttf',
    ),
  },
};

const printer = new PdfPrinter(fonts);

export function createPdfBuffer(docDefinition: any): Promise<Buffer> {
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: Buffer[] = [];

  return new Promise((resolve) => {
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.end();
  });
}
