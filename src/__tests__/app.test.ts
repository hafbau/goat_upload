import { createReadStream } from 'fs';
import { agent } from 'supertest';
import app from '../app';

jest.setTimeout(30000);

const server = agent(app);
const invalidFile = createReadStream(__filename);
const sampleFile1 = createReadStream('./sampleFile1MB.tgz');

describe('App', () => {
  describe('POST /files', () => {
    it('should accept only .tgz files', async () => {
      const invalideRes = await server
        .post('/files')
        .attach('invalidFile', invalidFile);
      
      const res = await server
        .post('/files')
        .attach('sampleFile1', sampleFile1);
    
      expect(invalideRes.statusCode).toEqual(400);
      expect(res.statusCode).toEqual(200);
    });

  });
});