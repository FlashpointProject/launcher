import { UserAgent } from '@shared/Util';
import * as axiosImport from 'axios';
const axios = axiosImport.default;

const axiosInstance = axios.create({
    headers: {
        'User-Agent': UserAgent
    }
});

export default axiosInstance;