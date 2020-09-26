# [Musiphone](https://github.com/ortexx/musiphone/) [alpha] 

Musiphone is a decentralized music player based on [the museria project](https://github.com/ortexx/museria/).

```javascript
const Node = require('musiphone').Node;

(async () => {  
  try {
    const node = new Node({
      port: 4000,
      hostname: 'localhost',
      musicStorageAddress: 'storage.museria.com:80'
    });
    await node.init();
  }
  catch(err) {
    console.error(err.stack);
    process.exit(1);
  }
})();
```

```javascript
const Client = require('musiphone').Client;

(async () => {  
  try {
    const client = new Client({
      address: 'localhost:4000'
    });
    await client.init();    
    const title = 'Playlist title';
    const songs = [
      'Direct - Opal',
      `Parachute Youth - Can't Get Better Than This`,
      'Mattafix - Big City Life'
    ];

    // Add the playlist
    const response = await client.addPlaylist(title, songs);

    // Get the playlist
    const playlist = await client.getPlaylist(response.hash);
  }
  catch(err) {
    console.error(err.stack);
    process.exit(1);
  }
})();
```

## Browser client
You can also use the client in a browser. Look at the description of [the spreadable library](https://github.com/ortexx/spreadable/#how-to-use-the-client-in-a-browser). In window you have __window.ClientMusiphone__ instead of __window.ClientSpreadable__. The prepared file name is __musiphone.client.js__.

## How to use it via the command line
Look at the description of [the spreadable library](https://github.com/ortexx/spreadable/#how-to-use-it-via-the-command-line). You only need to change everywhere **spreadable** word to **musiphone**.

## How it works

There are two sides to work with. On the server side the library allows you to create a decentralized network for storing music playlists based on [the metastocle data storage](https://github.com/ortexx/metastocle/). When you run the node, it is required to specify what kind of music storage clients will connect to, using __musicStorageAddress__ option. It can be a node address of any network that uses [the museria library](https://github.com/ortexx/museria/). When you add a playlist to the database, it gets a unique hash that you can use to get it later. On the client side it is a player where we manage all that stuff: creating playlists, sharing them with your friends, listening to music and so on. Currently, the player can be used in the browser and android smartphones.

## Browser player
To use browser version of the player you only need to find and open any available musiphone node address. It will look like a regular website. You can use [the player version](https://github.com/ortexx/museria-player/) based on [the global music storage](https://github.com/ortexx/museria-global/).

## Android player
To get an android application, you have to install all the necessary dependencies and build the application via [cordova](https://cordova.apache.org/).
All the necessary scripts you can find in the project [package.json](https://github.com/ortexx/musiphone/blob/master/package.json).
The only required option is an API address. It is necessary for the application to know where to connect for working. You can pass  __MUSIPHONE_API_ADDRESS__ environment variable. The value can be  any musiphone node address in your network:

`MUSIPHONE_API_ADDRESS=192.168.0.100:2790 npm run build-mobile`.

or several addresses separated by comma:

`MUSIPHONE_API_ADDRESS=192.168.0.100:2790,192.168.0.101:2790 npm run run-mobile-device`.

or the path to a js/json file:

`MUSIPHONE_API_ADDRESS=./faces.json npm run build-mobile-prod`.

You can build it directly to your phone with __run-mobile-device__. 
To get an apk file for installation use __build-mobile__ for the debug version or __build-mobile-prod__ for production ready one. The debug version you can install on the phone, but can't distribute to the markets. The production version is unsigned. To use it somewhere you have to sign it at first.

## What are the limitations
The maximum size of a single playlist is 100 kb, by default. You can change it using the __playlist.maxSize__ option.

## What are the requirements
Look at [the metastocle requirements](https://github.com/ortexx/metastocle/#what-are-the-requirements).

## Node configuration

When you create an instance of the node you can pass options below. Only specific options of this library are described here, without considering the options of the parent classes.

* {object} __[server]__ - section that responds for [server settings](https://github.com/ortexx/spreadable#node-configuration).

* {string|number} __[server.staticMaxAge]__ - maximum age for static files.

* {object} __[playlist]__ - section that responds for playlist settings.

* {number|string} __[playlist.maxSize="100kb"]__ - maximum playlist size.

* {number|string} __[playlist.collection]__ - playlist [collection settings](https://github.com/ortexx/metastocle#collection-configuration).

## Client interface

async __Client.prototype.getStorageAddress()__ - get the music storage address.
  * {object} __[options]__ - addition options
  * {number} __[options.timeout]__ - addition timeout

async __Client.prototype.addPlaylist()__ - add the playlist to the network.
  * {string} __[title]__ - playlist title
  * {string[]} __[content]__ - array with song titles to save
  * {object} __[options]__ - addition options
  * {number} __[options.timeout]__ - addition timeout

async __Client.prototype.getPlaylist()__ - get the playlist.
  * {string} __hash__ - playlist hash
  * {object} __[options]__ - getting options
  * {number} __[options.timeout]__ - getting timeout

## Exporting playlists
If necessary, you have the opportunity to export playlists from one server to another. There are two options:

* Copy all project files to the second server. It is convenient and works at the current moment, because the node is able to reconfigure all information to a new address. But there is no guarantee that this will work in the future.

* Use the song export feature: run ``` node.exportPlaylists() ``` method or via the command line as ``` museria -a exportPlaylists -n 2.2.2.2:2790 ```.

## Contribution
If you face a bug or have an idea how to improve the library, create an issue on github. In order to fix something or add new code yourself, fork the library, make changes and create a pull request to the master branch. Don't forget about tests in this case. Also you can join [the project on github](https://github.com/ortexx/musiphone/projects/1).