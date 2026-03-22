import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { es } from 'date-fns/locale';
import { parse } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Elimina todas las propiedades 'undefined' de un objeto de forma recursiva.
 * Útil para limpiar datos antes de enviarlos a Firestore.
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = removeUndefined(value);
      } else {
        result[key] = value;
      }
    }
  });
  return result;
}

export const parseDate = (dateString: string | undefined | number): Date | undefined => {
    if (!dateString) return undefined;
    
    // Handle Excel's numeric date format
    if (typeof dateString === 'number') {
        if (dateString > 0) {
            // Excel's epoch starts on 1900-01-01, but it has a leap year bug for 1900.
            // JavaScript's epoch is 1970-01-01. The difference is 25569 days for dates after 1900-02-28.
            // The formula is (excelDate - 25569) * 86400 * 1000
            const jsDate = new Date((dateString - 25569) * 86400 * 1000);
            return jsDate;
        }
        return undefined;
    }

    try {
        // Try parsing different common string formats
        const formats = ['dd/MM/yyyy', 'd/M/yy', 'yyyy-MM-dd', 'M/d/yy', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"];
        for (const fmt of formats) {
            const parsedDate = parse(dateString, fmt, new Date(), { locale: es });
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        // Try direct parsing for ISO strings
        const directParsed = new Date(dateString);
        if (!isNaN(directParsed.getTime())) {
            return directParsed;
        }
        
        return undefined;
    } catch (e) {
        return undefined;
    }
};

export const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(128, 128, 128, ${opacity})`;
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${opacity})`;
    }
    // Fallback for invalid hex
    return `rgba(128, 128, 128, ${opacity})`;
};