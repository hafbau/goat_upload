import { join } from 'path';
import { createReadStream } from 'fs';
import { agent } from 'supertest';
import app from '../app';

jest.setTimeout(30000);

const server = agent(app);
const invalidFile = createReadStream(__filename);
const sampleFile1 = createReadStream(join(__dirname, './sampleFile1MB.tgz'));

describe('App', () => {
  describe('GET / - Healthcheck', () => {
    it('should be up', async () => {
      const response = await server.get('/');
      expect(response.statusCode).toEqual(200);
      expect(response.body?.status?.toUpperCase()).toEqual('UP');
    })
  })

  describe('POST /files', () => {
    it('should accept only .tgz files', async () => {
      const invalideResponse = await server
        .post('/files')
        .attach('invalidFile', invalidFile);
      
      const response = await server
        .post('/files')
        .attach('sampleFile1', sampleFile1);
    
      expect(invalideResponse.statusCode).toEqual(400);
      expect(response.statusCode).toEqual(200);
    });

  });
});