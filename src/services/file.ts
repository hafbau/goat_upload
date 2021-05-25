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

const isValidFileType = (fileName: string): boolean => /(\.tgz)$/.test(fileName);

const processFirstChunk = async (contentLength: number, fileName: string) => {
  const fileMeta = await upsertFile({
    fileName,
    uploadStatus: 'In progress',
    size: contentLength,
    progress: '0%'
  });
  const fileId = fileMeta.id;
  const fileStream = createWriteStream(join(uploadDir, fileId + '_' + fileMeta.fileName));
  return { fileMeta, fileStream };
}

interface NonFirstChunkInput {
  chunk: Buffer;
  source: IncomingMessage;
  dataLength: number; 
  contentLength: number;
}
const processNonFirstChunk = async ({
    chunk,
    source,
    dataLength, 
    contentLength,
  }: NonFirstChunkInput,
  { fileWriteStream, fileMeta }: FileContext
) => {
  if (fileWriteStream && fileMeta) {
    fileWriteStream.write(chunk, (err: Error) => {
      if (!err) return
      source.emit('error', new Error('Failed to save file: ' + fileMeta.fileName))
      // clean up
      deleteFileById(fileMeta.id);
    });
  };

  updateFileMeta(
    fileMeta.id,
    { progress: `${100 * dataLength / contentLength}%` }
  );
}

interface UploadFileConfig {
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
        fileCtx = await processFirstChunk(contentLength, fileName);
        onStarted(fileCtx.fileMeta);
      }
      dataLength += chunk?.length ?? 0;
      processNonFirstChunk({ chunk, source, dataLength, contentLength }, fileCtx);
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