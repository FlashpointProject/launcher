import * as fs from 'fs';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);

/** Get the content type associated with a file extension ("stolen" from nginx). */
export function getContentType(ext: string): string {
  switch (ext) {
    default: return '';

    case 'html':
    case 'htm':
    case 'shtml': return 'text/html';
    case 'css': return 'text/css';
    case 'xml': return 'text/xml';
    case 'gif': return 'text/gif';
    case 'jpeg':
    case 'jpg': return 'text/jpeg';
    case 'js': return 'application/x-javascript';
    case 'atom': return 'application/atom+xml';
    case 'rss': return 'application/rss+xml';

    case 'mml': return 'text/mathml';
    case 'txt': return 'text/plain';
    case 'jad': return 'text/vnd.sun.j2me.app-descriptor';
    case 'wml': return 'text/vnd.wap.wml';
    case 'htc': return 'text/x-component';

    case 'png': return 'image/png';
    case 'tif':
    case 'tiff': return 'image/tiff';
    case 'wbmp': return 'image/vnd.wap.wbmp';
    case 'ico': return 'image/x-icon';
    case 'jng': return 'image/x-jng';
    case 'bmp': return 'image/x-ms-bmp';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';

    case 'jar':
    case 'war':
    case 'ear': return 'application/java-archive';
    case 'hqx': return 'application/mac-binhex40';
    case 'doc': return 'application/msword';
    case 'pdf': return 'application/pdf';
    case 'ps':
    case 'eps':
    case 'ai': return 'application/postscript';
    case 'rtf': return 'application/rtf';
    case 'xls': return 'application/vnd.ms-excel';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'wmlc': return 'application/vnd.wap.wmlc';
    case 'kml': return 'application/vnd.google-earth.kml+xml';
    case 'kmz': return 'application/vnd.google-earth.kmz';
    case '7z': return 'application/x-7z-compressed';
    case 'cco': return 'application/x-cocoa';
    case 'jardiff': return 'application/x-java-archive-diff';
    case 'jnlp': return 'application/x-java-jnlp-file';
    case 'run': return 'application/x-makeself';
    case 'pl':
    case 'pm': return 'application/x-perl';
    case 'prc':
    case 'pdb': return 'application/x-pilot';
    case 'rar': return 'application/x-rar-compressed';
    case 'rpm': return 'application/x-redhat-package-manager';
    case 'sea': return 'application/x-sea';
    case 'swf': return 'application/x-shockwave-flash';
    case 'sit': return 'application/x-stuffit';
    case 'tcl':
    case 'tk': return 'application/x-tcl';
    case 'der':
    case 'pem':
    case 'crt': return 'application/x-x509-ca-cert';
    case 'xpi': return 'application/x-xpinstall';
    case 'xhtml': return 'application/xhtml+xml';
    case 'zip': return 'application/zip';

    case 'bin':
    case 'exe':
    case 'dll':
    case 'deb':
    case 'dmg':
    case 'eot':
    case 'iso':
    case 'img':
    case 'msi':
    case 'msp':
    case 'msm': return 'application/octet-stream';

    case 'mid':
    case 'midi':
    case 'kar': return 'audio/midi';
    case 'mp3': return 'audio/mpeg';
    case 'ogg': return 'audio/ogg';
    case 'ra': return 'audio/x-realaudio';

    case '3gpp':
    case '3gp': return 'video/3gpp';
    case 'mpeg':
    case 'mpg': return 'video/mpeg';
    case 'mov': return 'video/quicktime';
    case 'flv': return 'video/x-flv';
    case 'mng': return 'video/x-mng';
    case 'asx':
    case 'asf': return 'video/x-ms-asf';
    case 'wmv': return 'video/x-ms-wmv';
    case 'avi': return 'video/x-msvideo';
    case 'm4v':
    case 'mp4': return 'video/mp4';
  }
}

export function pathExists(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, error => {
      if (error) {
        if (error.code === 'ENOENT') { resolve(false); }
        else { reject(error); }
      } else { resolve(true); }
    });
  });
}