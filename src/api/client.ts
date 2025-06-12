import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Cambia se il backend è altrove

export async function fetchFOPI(base: string, lead: number) {
    const response = await axios.get(`${API_BASE_URL}/fopi`, {
        params: { base, lead },
    });
    return response.data;
}
