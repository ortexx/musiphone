import ClientMuseria from 'museria/dist/museria.client.js';
const client = new ClientMuseria({ address: [], task: { workerChangeInterval: '10m' } });
export default client;