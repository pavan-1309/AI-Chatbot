import axios from 'axios';
import { AuthService } from './auth';

const API_URL = process.env.REACT_APP_API_URL;

const getHeaders = async () => ({
  'Content-Type': 'application/json',
  'Authorization': await AuthService.getToken()
});

export const ChatService = {
  sendMessage: async (message) => {
    const response = await axios.post(
      `${API_URL}/chat`,
      { message },
      { headers: await getHeaders() }
    );
    return response.data.response;
  },

  getHistory: async (limit = 50) => {
    const response = await axios.get(
      `${API_URL}/history?limit=${limit}`,
      { headers: await getHeaders() }
    );
    return response.data.history;
  }
};
