import { Request, Response } from 'express';
import { createReadStream, promises as fsp } from 'fs';
import { join } from 'path';
import logger from '../utils/logger';
import { uploadFile } from '../services/file';
import { uploadDir } from '../config';
import {
    deleteFileById,
    getFileById,
    listFiles,
} from '../utils/dataHelpers';

export const healthCheck = (_: any, res: Response) => res.send({ status: 'Up' });

export const getAllFiles = async (_: any, res: Response) => {
    res.json(await listFiles());
};

export const getFileMeta = async (req: Request, res: Response) => res.json(await getFileById(req.params.id));

export const downloadFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const file = await getFileById(id);
  if (file) {
    const { fileName, size } = file;
    const filePath = join(uploadDir, id + '_' + size + '_' + fileName);
    const readFileStream = createReadStream(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    readFileStream.pipe(res);
  } else {
    logger.error('Cannot download file. isInDb?', !!file, id, file)
    res.status(404).json({
      message: 'File not found',
      error: new Error('File not found')
    });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const file = await getFileById(id);
  if (file) {
    const { fileName, size } = file;
    const filePath = join(uploadDir, id + '_' + size + '_' + fileName);
    deleteFileById(req.params.id)
    .then(() => fsp.unlink(filePath))
    .then(() => res.json({ message: `Successfully deleted: ${fileName}` }))
    .catch(error => {
      logger.error(error?.message);
      res.status(500).json({ message: 'Unable to delete file', error });
    })
  } else {
    res.status(404).json({
      message: 'File not found',
      error: new Error('File not found')
    });
  }
};

export const postFile = (req: Request, res: Response) => {
  const contentLength = parseInt(req.headers['content-length']);
  const contentType = req.headers['content-type'];
  if (!contentType?.includes('multipart/form-data')) {
    return res.status(400).json({
      message: 'Wrong content type.',
      error: new Error('Wrong content type')
    })
  }
  const boundary = contentType.split(';')[1].split('=')[1].trim();
  uploadFile(req, {
    boundary,
    contentLength,
    onStarted: (fileMeta) => res.json(fileMeta),
    onError: (err) => {
      logger.error(err);
      res.status(400).json({
        message: err.message,
        error: err,
      });
    }
  });
};
