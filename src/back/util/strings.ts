import { CharCode } from './charCode';

export function isLowerAsciiLetter(code: number): boolean {
  return code >= CharCode.a && code <= CharCode.z;
}

export function isUpperAsciiLetter(code: number): boolean {
  return code >= CharCode.A && code <= CharCode.Z;
}

export function compare(a: string, b: string): number {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}

export function compareSubstring(a: string, b: string, aStart = 0, aEnd: number = a.length, bStart = 0, bEnd: number = b.length): number {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    const codeA = a.charCodeAt(aStart);
    const codeB = b.charCodeAt(bStart);
    if (codeA < codeB) {
      return -1;
    } else if (codeA > codeB) {
      return 1;
    }
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}

export function compareSubstringIgnoreCase(a: string, b: string, aStart = 0, aEnd: number = a.length, bStart = 0, bEnd: number = b.length): number {

  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {

    const codeA = a.charCodeAt(aStart);
    const codeB = b.charCodeAt(bStart);

    if (codeA === codeB) {
      // equal
      continue;
    }

    const diff = codeA - codeB;
    if (diff === 32 && isUpperAsciiLetter(codeB)) { // codeB =[65-90] && codeA =[97-122]
      continue;

    } else if (diff === -32 && isUpperAsciiLetter(codeA)) {  // codeB =[97-122] && codeA =[65-90]
      continue;
    }

    if (isLowerAsciiLetter(codeA) && isLowerAsciiLetter(codeB)) {
      //
      return diff;

    } else {
      return compareSubstring(a.toLowerCase(), b.toLowerCase(), aStart, aEnd, bStart, bEnd);
    }
  }

  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;

  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }

  return 0;
}
