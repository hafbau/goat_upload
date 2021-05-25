import { createReadStream } from 'fs';
import { agent } from 'supertest';
import app from '../app';

const server = agent(app);

const invalidFile = createReadStream(__filename);

describe('App', () => {
  describe('POST /files', () => {
    it('should accept only .tgz files', async () => {
      const res = await server
        .post('/files')
        .attach('invalidFile', invalidFile);
      expect(res.statusCode).toEqual(400);
    });

  });
});