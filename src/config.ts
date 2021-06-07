import { promises as fsp } from 'fs';
import { upsertFile } from './utils/dataHelpers';
import logger from './utils/logger';

export const uploadDir = process.env.UPLOAD_DIR || 'uploads';
export const setup = () => fsp.readdir(uploadDir)
  .then(fileNames => {
    return Promise.all(fileNames.map(name => {
      const [id, size, ...fileName] = name.split('_');
      logger.debug('id, size, fileName', id, size, fileName)
      return upsertFile({
        id,
        size: parseInt(size),
        fileName: fileName?.join(),
        uploadStatus: 'Complete',
        progress: '100%'
      })
    }));
  })
  .catch(err => {
    if (err.code === 'ENOENT') {
      fsp.mkdir(uploadDir)
    }
  });