import ClientMuseria from 'museria/dist/client/museria.client.js';
const client = new ClientMuseria({ address: [], task: { workerChangeInterval: '1m' } });
export default client;