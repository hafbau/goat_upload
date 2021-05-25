import logger from './utils/logger';
import app from './app';

const PORT = process.env.PORT || 4337

app.listen(PORT, () => {
    logger.info('listening on ', PORT);
});
