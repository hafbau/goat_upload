import express from 'express';
import { ServerResponse } from 'http';

const app = express();
app.get('/', (_, res: ServerResponse) => res.send({ status: 'Up' }));

export default app;
