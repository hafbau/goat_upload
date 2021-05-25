import express from 'express';
import logger from './utils/logger';

const app = express();

const filesDb: any = {};
const upsertFile = ({ fileId, ...rest }: any) => {
    if (!filesDb[fileId]) {
        fileId = Math.random().toString(16).slice(2, 8);
        filesDb[fileId] = { id: fileId };
    };
    filesDb[fileId] = {
        ...filesDb[fileId],
        ...rest
    };
    return Promise.resolve(filesDb[fileId]);
};

app.get('/', (_, res) => res.send({ status: 'Up' }));
app.get('/files/:id', (req, res) => res.json(filesDb[req.params.id]));

const getFileName = (chunk: Buffer) => {
    const startIdx = chunk.indexOf('Content-Disposition');
    const endIdx = chunk.indexOf('Content-Type');
    const contentDispositionLine = chunk.slice(startIdx, endIdx).toString('latin1');
    console.log(`contentDispositionLine`, contentDispositionLine);
    if (contentDispositionLine) {
        const [_, fileName] = contentDispositionLine.split('; filename="');
        console.log(`fileName`, fileName.replace('"', ''))
        return fileName.replace('"', '').trim();
    }
};

const isValidFileType = (fileName: string): boolean => /(\.tgz)$/.test(fileName)

app.post('/files', (req, res) => {
    let dataLength = 0;
    const contentLength = parseInt(req.headers['content-length']);
    const contentType = req.headers['content-type'];
    logger.debug('contentType', contentType)
    
    let fileId: string;
    req.on('data', (chunk) => {
        const fileName = getFileName(chunk);
        if (fileName && !isValidFileType(fileName)) {
            req.emit('error', new Error('Invalid filetype, only accepts .tgz files'))
            return ;
        } else if (fileName) {
            upsertFile({
                fileName,
                uploadStatus: 'In progress',
                size: contentLength,
                progress: '0%'
            })
            .then(savedFile => {
                fileId = savedFile.id;
                res.send(savedFile);
            });
        }
        dataLength += chunk?.length ?? 0;
        if (fileId in filesDb) {
            upsertFile({
                fileId,
                progress: `${100 * dataLength / contentLength}%`,
            })
        }
    });

    req.on('end', () => {
        logger.debug('contentLength', contentLength)
        logger.debug('dataLength', dataLength);
        if (fileId in filesDb) {
            upsertFile({
                fileId,
                progress: '100%',
                uploadStatus: 'Complete',
            })
        }
    })

    req.on('error', (err) => {
        logger.error(err);
        req.emit('close')
        res.status(400).send(err.message);
    })
})

export default app;
