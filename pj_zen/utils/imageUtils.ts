
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../constants';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
