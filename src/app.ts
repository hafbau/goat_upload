import express from 'express';
import logger from './utils/logger';
import { createReadStream, promises as fsp } from 'fs';
import { join } from 'path';
import { uploadFile } from './services/file';
import { uploadDir } from './config';
import {
    deleteFileById,
    getFileById,
    listFiles,
} from './utils/dataHelpers';

// TODO: Should clean this up
fsp.stat(uploadDir)
.catch(err => {
    if (err.code === 'ENOENT') {
        fsp.mkdir(uploadDir)
    }
});

const app = express();
app.get('/', (_, res) => res.send({ status: 'Up' }));
app.get('/files', async (_, res) => {
    res.json(await listFiles());
});

app.get('/files/:id', async (req, res) => res.json(await getFileById(req.params.id)));

app.get('/files/:id/download', async (req, res) => {
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
});

app.delete('/files/:id', async (req, res) => {
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
});

app.post('/files', (req, res) => {
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
});

export default app;
