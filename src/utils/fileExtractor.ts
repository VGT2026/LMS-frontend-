import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// Set worker source for PDF.js to local bundled worker (no remote CDN)
GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extract text from various file types
 */
export const extractFileContent = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();

  // PDF file
  if (fileName.endsWith('.pdf')) {
    return await extractPdfText(file);
  }

  // Plain text files
  if (fileName.endsWith('.txt') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    return await extractPlainText(file);
  }

  throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
};

/**
 * Extract text from PDF file
 */
export const extractPdfText = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[PDF Extract] Processing PDF: ${file.name}, Size: ${arrayBuffer.byteLength} bytes`);

    const pdf = await getDocument({ data: arrayBuffer }).promise;
    console.log(`[PDF Extract] PDF loaded successfully, Pages: ${pdf.numPages}`);

    let fullText = '';
    let pageCount = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        if (!textContent.items || textContent.items.length === 0) {
          console.warn(`[PDF Extract] Page ${pageNum} has no text content`);
          continue;
        }

        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();

        if (pageText) {
          fullText += pageText + '\n\n';
          pageCount++;
        }
      } catch (pageError) {
        console.warn(`[PDF Extract] Error extracting page ${pageNum}:`, pageError);
        // Continue with next page even if one fails
      }
    }

    if (!fullText.trim()) {
      console.error('[PDF Extract] No text extracted from any pages');
      throw new Error(
        'This PDF appears to be a scanned image without readable text. ' +
        'Please use OCR to convert it to a text-based PDF or extract the text manually.'
      );
    }

    console.log(`[PDF Extract] ✅ Successfully extracted text from ${pageCount} pages, Total: ${fullText.length} characters`);
    return fullText.trim();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[PDF Extract] Error extracting PDF:', errorMsg);
    
    // Provide helpful error messages
    if (errorMsg.includes('scanned') || errorMsg.includes('OCR')) {
      throw error;
    }
    
    if (errorMsg.includes('password') || errorMsg.includes('protected')) {
      throw new Error('This PDF is password-protected. Please remove the password and try again.');
    }

    throw new Error(
      `Failed to extract text from PDF: ${errorMsg}. ` +
      'Try opening the PDF in a text editor or ensuring it contains readable text.'
    );
  }
};

/**
 * Extract text from plain text files (TXT, DOC, DOCX)
 */
export const extractPlainText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          reject(new Error('File is empty'));
          return;
        }
        resolve(text);
      } catch (error) {
        reject(new Error('Failed to read file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Could not read the file. Please try again.'));
    };

    reader.readAsText(file);
  });
};

/**
 * Get file type for logging
 */
export const getFileType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'PDF';
    case 'txt':
      return 'Text';
    case 'doc':
    case 'docx':
      return 'Word Document';
    default:
      return 'Unknown';
  }
};
