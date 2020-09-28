import ClientMusiphone from '../../../dist/musiphone.client.js';
const client = new ClientMusiphone({ https: ClientMusiphone.getPageProtocol() == 'https', address: true });
export default client;