import ClientMusiphone from '../../../dist/musiphone.client.js';
const address = window.cordova? API_ADDRESS: undefined;
const client = new ClientMusiphone({ https: ClientMusiphone.getPageProtocol() == 'https', address });
export default client;