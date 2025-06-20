import axios from 'axios';
import { API_BASE_URL } from './config';

export async function fetchIndexData(indexName: string, base: string, lead: number) {
    const response = await axios.get(`${API_BASE_URL}/api/${indexName}`, {
        params: { base, lead },
    });
    return response.data;
}
