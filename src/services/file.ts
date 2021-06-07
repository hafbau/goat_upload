import { IncomingMessage } from 'http';
import {
  deleteFileById,
  getFileById,
  upsertFile,
} from '../utils/dataHelpers';
import { WriteStream, createWriteStream } from 'fs';
import { join } from 'path';
import { uploadDir } from '../config';

interface FileMeta {
  id?: string;
  fileName?: string;
  progress?: string;
  uploadStatus?: string;
}
export const updateFileMeta = async (id: string, meta: FileMeta) => {
  if (await getFileById(id)) {
    upsertFile({ id, ...meta })
  }
}

const getFileName = (chunk: Buffer) => {
  const startIdx = chunk.indexOf('Content-Disposition');
  const endIdx = chunk.indexOf('Content-Type');
  const contentDispositionLine = chunk.slice(startIdx, endIdx).toString('latin1');
  if (contentDispositionLine) {
    const [_, fileName] = contentDispositionLine.split('; filename="');
    return fileName.replace('"', '').trim();
  }
};


const removeBoundaryData = (chunk: Buffer, boundary: string): Buffer => {
  let cleanedChunk = chunk;
  const stringRep = chunk.toString('latin1');
  const boundaryRegx = new RegExp(`(\r\n)?-*${boundary}-*(\r\n)?`);
  const boundaryMatch = stringRep.match(boundaryRegx);
  if (boundaryMatch) {
    const boundaryStartIdx = boundaryMatch.index;
    const boundaryEndIdx = boundaryStartIdx + boundaryMatch[0]?.length;
    const endOfHeaderMeta = stringRep.indexOf('\r\n\r\n') + 4; //4 being length
    if (boundaryStartIdx === 0 && endOfHeaderMeta > 3) {
      cleanedChunk = cleanedChunk.slice(endOfHeaderMeta);
    } else if (boundaryStartIdx > -1) {
      const startChunk = cleanedChunk.slice(0, boundaryStartIdx);
      const endChunk = cleanedChunk.slice(boundaryEndIdx);
      cleanedChunk = Buffer.concat([startChunk, endChunk]);
    };
    if (cleanedChunk.toString('latin1').match(boundaryRegx)) {
      return removeBoundaryData(cleanedChunk, boundary);
    };
  };
  return cleanedChunk;
};

const isValidFileType = (fileName: string): boolean => /(\.tgz)$/.test(fileName);

const processFirstChunk = async (contentLength: number, fileName: string, existing: any = {}) => {
  const fileMeta = await upsertFile({
   ...existing,
   fileName,
   uploadStatus: 'In progress',
   size: contentLength,
   progress: existing.progress || '0%'
 });
 const fileId = fileMeta.id;
 const fileWriteStream = createWriteStream(join(uploadDir, fileId + '_' + contentLength + '_' + fileMeta.fileName));
 return { fileMeta, fileWriteStream };
}

interface NonFirstChunkInput {
  boundary: string;
  chunk: Buffer;
  source: IncomingMessage;
  dataLength: number; 
  contentLength: number;
}
const processNonFirstChunk = async ({
    boundary,
    chunk,
    source,
    dataLength, 
    contentLength,
  }: NonFirstChunkInput,
  { fileWriteStream, fileMeta }: FileContext
) => {
  if (fileWriteStream && fileMeta) {
    fileWriteStream.write(
      removeBoundaryData(chunk, boundary),
      (err: Error) => {
        if (!err) return
        source.emit('error', new Error('Failed to save file: ' + fileMeta.fileName))
        // clean up
        deleteFileById(fileMeta.id);
      }
    );
  };

  updateFileMeta(
    fileMeta.id,
    { progress: `${100 * dataLength / contentLength}%` }
  );
}

interface UploadFileConfig {
  boundary: string;
  contentLength: number;
  onStarted: (file: FileMeta) => any;
  onError: (err: Error) => any;
  onProgress?: (file: FileMeta) => any;
  onSuccess?: (file: FileMeta) => any;
}

interface FileContext {
  fileWriteStream?: WriteStream;
  fileMeta?: FileMeta;
}
export const uploadFile = (
  source: IncomingMessage,
  {
    onStarted,
    onError,
    contentLength,
    boundary,
  }: UploadFileConfig
) => {
  let dataLength: number = 0;
  let fileCtx = {} as FileContext;
    source.on('data', async (chunk) => {
      const fileName = getFileName(chunk);
      if (fileName && !isValidFileType(fileName)) {
        source.emit('error', new Error('Invalid filetype, only accepts .tgz files'));
        return;
      } 
      if (fileName) {
        fileCtx = await processFirstChunk(contentLength, fileName, fileCtx?.fileMeta);
        onStarted(fileCtx.fileMeta);
      }
      dataLength += chunk?.length ?? 0;
      processNonFirstChunk({
        boundary,
        chunk,
        source,
        dataLength,
        contentLength
      }, fileCtx);
      // onProgress?
    });

    source.on('end', async () => {
      updateFileMeta(
        fileCtx?.fileMeta?.id,
        { progress: '100%', uploadStatus: 'Complete' }
      );
      // onSuccess
    })

    source.on('error', (err) => {
      source.emit('close')
      onError(err)
    })
}