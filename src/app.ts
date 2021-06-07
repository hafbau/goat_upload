import express from 'express';
import { setup } from './config';
import * as handlers from './handlers';

setup();
const app = express();
app.get('/', handlers.healthCheck);
app.get('/files', handlers.getAllFiles);
app.get('/files/:id', handlers.getFileMeta);
app.get('/files/:id/download', handlers.downloadFile);
app.delete('/files/:id', handlers.deleteFile);
app.post('/files', handlers.postFile);

export default app;
