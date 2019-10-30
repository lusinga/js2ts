const axios = require('axios');

const instance = axios.create({
  baseURL: 'http://127.0.0.1:30000',
  timeout: 1000});

async function get_complete() {
    try {
      const response = await instance.get('/code/test2');
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
}

get_complete();
