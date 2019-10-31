const axios = require('axios');

const instance = axios.create({
  baseURL: 'http://127.0.0.1:30000',
  timeout: 1000});

async function get_complete() {
    try {
      const response = await instance.get('/code/test');
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
}

instance.post('/complete', {code:'#include <iostream>试试中文行不行'})
.then(function (response) {
  console.log('complete: '+response.data);
})
.catch(function (error) {
  console.log(error);
});

//get_complete();
