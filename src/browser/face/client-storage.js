import 'museria/dist/client/museria.client.js';
const client = new window.ClientMuseria({ 
  address: [], 
  task: { workerChangeInterval: '1m' }, 
  request: { ignoreVersion: true } 
});
export default client;