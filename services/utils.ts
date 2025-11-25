import Tesseract from 'tesseract.js';
import { ContactData } from '../types';

export const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024, mimeType = 'image/jpeg', quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL(mimeType, quality));
    };
  });
};

export const runOCR = async (imagePath: string): Promise<string> => {
  try {
    const result = await Tesseract.recognize(imagePath, 'eng', {
      // logger: m => console.log(m) // standard console logging
    });
    return result.data.text;
  } catch (error) {
    console.error("OCR Error", error);
    return "";
  }
};

export const generateVCard = (contact: ContactData): string => {
  const n = contact.fullName.split(' ');
  const lastName = n.length > 1 ? n.pop() : '';
  const firstName = n.join(' ');

  let vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contact.fullName}
N:${lastName};${firstName};;;
ORG:${contact.company}
TITLE:${contact.title}
TEL;TYPE=CELL:${contact.phone}
EMAIL:${contact.email}
URL:${contact.website}
ADR;TYPE=WORK:;;${contact.address};;;;
NOTE:${contact.notes || ''}
`;

  if (contact.socials.linkedin) vcard += `X-SOCIALPROFILE;type=linkedin:${contact.socials.linkedin}\n`;
  if (contact.socials.twitter) vcard += `X-SOCIALPROFILE;type=twitter:${contact.socials.twitter}\n`;

  // Add photo if available (stripped of data header for vcard usually, but some clients need it inline)
  // For simplicity in this demo we skip embedding large base64 in vcard to keep it light, 
  // but professional apps would break lines at 75 chars.
  
  vcard += `END:VCARD`;
  return vcard;
};

export const downloadVCard = (contact: ContactData) => {
  const vcardContent = generateVCard(contact);
  const blob = new Blob([vcardContent], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${contact.fullName || 'contact'}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};