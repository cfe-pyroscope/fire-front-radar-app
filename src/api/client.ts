import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8090';

export async function fetchFOPITEST(base: string, lead: number) {
    const response = await axios.get(`${API_BASE_URL}/fopi-test`, {
        params: { base, lead },
    });
    return response.data;
}


export async function fetchFOPI(base: string, lead: number) {
    const response = await axios.get(`${API_BASE_URL}/fopi`, {
        params: { base, lead },
    });
    return response.data;
}