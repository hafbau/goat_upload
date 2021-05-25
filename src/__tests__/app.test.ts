import { join } from 'path';
import { createReadStream, readFileSync } from 'fs';
import { agent } from 'supertest';
import app from '../app';

jest.setTimeout(30000);

const server = agent(app);
const invalidFile = createReadStream(__filename);
const sampleFile1 = createReadStream(join(__dirname, './sampleFile1KB.tgz'));

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

  describe('GET /files', () => {
    it('should list all files', async () => {
      const response = await server.get('/files');
      expect(response.statusCode).toEqual(200);
      expect(response.body.length > 0).toEqual(true);
    });
  })

  describe('GET /files/:id/download', () => {
    it('should download specified file', async () => {
      const allFilesResponse = await server.get('/files');
      const fileId = allFilesResponse.body[0].id;
      const response = await server.get(`/files/${fileId}/download`)
      expect(response.statusCode).toEqual(200);
      // const responseFile = Buffer.from(response.body);
      // const sampleFile = readFileSync(join(__dirname, './sampleFile1KB.tgz'))
      // expect(responseFile.equals(sampleFile)).toEqual(true);
    });
  });
  
  describe('DELETE /files/:id', () => {
    it('should delete specified file', async () => {
      const allFilesResponse = await server.get('/files');
      const fileId = allFilesResponse.body[0].id;
      const response = await server.delete(`/files/${fileId}`)
      expect(response.statusCode).toEqual(200);
      
      const allFilesResponseAfter = await server.get('/files');
      expect(
        allFilesResponse.body?.length - 
        allFilesResponseAfter.body?.length
      ).toEqual(1);
      expect(
        allFilesResponseAfter.body?.find((file: any) => file.id === fileId)
      ).toEqual(undefined);
    });
  });
});