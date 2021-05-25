import express from 'express';
import { ServerResponse } from 'http';
import logger from './utils/logger';

const app = express();
app.get('/', (_, res) => res.send({ status: 'Up' }));


const getFileName = (chunk: Buffer) => {
    const startIdx = chunk.indexOf('Content-Disposition');
    const endIdx = chunk.indexOf('Content-Type');
    const contentDispositionLine = chunk.slice(startIdx, endIdx).toString('latin1');
    console.log(`contentDispositionLine`, contentDispositionLine);
    if (contentDispositionLine) {
        const [_, fileName] = contentDispositionLine.split('; filename="');
        console.log(`fileName`, fileName.replace('"', ''))
        return fileName.replace('"', '');
    }
};

const isValidFileType = (filename: string): boolean => /(\.tgz)$/.test(filename)

app.post('/files', (req, res) => {
    let dataLength = 0;
    const contentLength = parseInt(req.headers['content-length']);
    const contentType = req.headers['content-type'];
    const boundary = contentType?.split(';')[1]?.split('=')[1]?.trim();
    logger.debug('contentType', contentType)
    req.on('data', (chunk) => {
        const fileName = getFileName(chunk);
        if (fileName && !isValidFileType(fileName)) {
            req.emit('error', new Error('Invalid filetype, only accepts .tgz files'))
            return ;
        }
        logger.debug(
            'chunk length',
            // chunk,
            chunk.indexOf('Content-Disposition'),
            // chunk[54],
            chunk.indexOf(boundary),
            // chunk[2],
            chunk?.length);
        dataLength += chunk?.length ?? 0;
    });
    req.on('end', () => {
        logger.debug('contentLength', contentLength)
        logger.debug('dataLength', dataLength);
        res.send({ status: 'done', dataLength, contentLength })
    })

    req.on('error', (err) => logger.error(err))
})

export default app;
