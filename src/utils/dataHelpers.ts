
const filesDb: any = {};
export const upsertFile = ({ id, ...rest }: any) => {
    if (!filesDb[id]) {
        id = Math.random().toString(16).slice(2, 8);
        filesDb[id] = { id };
    };
    filesDb[id] = {
        ...filesDb[id],
        ...rest
    };
    return Promise.resolve(filesDb[id]);
};
export const listFiles = () => Promise.resolve(Object.values(filesDb));
export const getFileById = (id: string) => Promise.resolve(filesDb[id]);
export const deleteFileById = (id: string) => Promise.resolve(delete filesDb[id]);