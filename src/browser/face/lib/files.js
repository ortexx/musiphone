import pathLib from 'path';

/**
 * Get the system folder for downloading files
 * 
 * @returns {string} 
 */
export function getDownloadFolder() {
  if(device.platform === 'iOS') {
    return cordova.file.documentsDirectory;
  }
  
  return cordova.file.externalRootDirectory? `${ cordova.file.externalRootDirectory }Download/`: cordova.file.dataDirectory;
}

/**
 * Read blob to something (array, data uri, etc)
 * 
 * @async
 * @param {Blob} blob
 * @param {string} command
 * @return {*}
 */
export async function blobTo (...args) {
  return window.cordova? await blobToMobile(...args): await blobToBrowser(...args);
}

/**
 * For browser
 * 
 * @see blobTo
 */
export async function blobToBrowser (blob, command) {
  return new Promise((resolve, reject) => {
    const fn = e => {
      reader.removeEventListener('loadend', fn);
      e.error? reject(e.error): resolve(e.target.result);  
    }

    const reader = new FileReader();
    reader.addEventListener('loadend', fn);
    reader[command](blob);
  }); 
}

/**
 * For mobile
 * 
 * @see blobTo
 */
export async function blobToMobile (blob, command) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();    
    reader.onloadend = function () {
      resolve(this.result);   
    }
    reader.onerror = (ev) => reject(ev.error);
    reader[command](blob);
  });
}

/**
 * Resolve any file in the system
 * 
 * @async
 * @param {string} path 
 * @returns {FileEntry}
 */
export async function resolveFileSystem (path) {
  return await new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(path, resolve, reject);
  });
}

/**
 * Convert FileEntry to File
 * 
 * @async
 * @param {FileEntry} entry
 * @returns {File}
 */
export async function fileEntryToFile (entry) {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

/**
 * Check the file/folder exists
 * 
 * @async
 * @returns {boolean}
 */
export async function exists (path) {
  try {
    await resolveFileSystem(path);
    return true;
  }
  catch(err) {
    return false;
  }
}

/**
 * Save the text to the file system
 * 
 * @async
 * @param {string} text 
 * @param {string} path  
 */
export async function saveTextToFile(text, path) {
  const file = await createFile(pathLib.dirname(path), pathLib.basename(path));
  const url = file.toURL();
  
  try {
    const writer = await createFileWriter(file);
    await writeToFile(writer, text);
    return file;
  }
  catch(err) {
    await remove(url);
    throw err;
  } 
}

/**
 * Create a FileWriter object
 * 
 * @async
 * @param {FileEntry} entry 
 * @returns {FileWriter} 
 */
export async function createFileWriter(entry) {
  return new Promise((resolve, reject) => {
    entry.createWriter(resolve, reject);
  });
}

/**
 * Write to the file
 * 
 * @async
 * @param {FileWriter} writer
 * @param {Blob|string|array} data
 */
export async function writeToFile(writer, data) { 
  return new Promise((resolve, reject) => {
    writer.onwriteend = resolve;
    writer.onerror = reject;
    writer.write(data);
  });
}

/**
 * Create a file
 * 
 * @async
 * @param {string} path 
 * @param {string} filename 
 * @returns {FileEntry}
 */
export async function createFile (path, filename) {
  const dir = await resolveFileSystem(path);  
  return new Promise((resolve, reject) => {
    dir.getFile(filename, { create: true, exclusive: false }, resolve, reject);
  });
}

/**
 * Download a file from the web to the file system
 * 
 * @async
 * @param {string} url 
 * @param {string} path 
 * @returns {FileEntry}
 */
export async function download (url, path) {
  return new Promise((resolve, reject) => {
    const fileTransfer = new FileTransfer();
    fileTransfer.download(url, path, resolve, reject, true);
  });
} 

/**
 * Read the directory and get all files
 * 
 * @async
 * @param {string} path 
 * @returns {FileEntry[]}
 */
export async function readdir (path) {
  const dir = await resolveFileSystem(path);
  return new Promise((resolve, reject) => {
    const reader = dir.createReader();
    reader.readEntries(resolve, reject);
  });
}

/**
 * Remove the file
 * 
 * @async
 * @param {string} path 
 */
export async function remove (path) {
  return new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(pathLib.dirname(path), dir => {
      dir.getFile(pathLib.basename(path), { create: false }, fileEntry =>  {
        fileEntry.remove(resolve, reject, resolve);
      });
    });
  });
}