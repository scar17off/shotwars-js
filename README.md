# shotwars-js
Node.js library for [ShotWars.IO](https://shotwars.io/ "ShotWars.IO").

Installing: `npm i shotwars-js`.\
**REQUIRES NODE.JS 12.0+!**

![Nodejs](https://img.shields.io/badge/-Node.js%2012.0%2B-brightgreen?style=for-the-badge&logo=node.js&labelColor=1a1a1a)

# Example
```javascript
const ShotWars = require("shotwars");

const options = {
    name: "Anonymous",
    class: ShotWars.vClass.Pistol
};

const client = new ShotWars.Client(options);

client.on("id", () => {
    console.log("Connected to the server");
    client.chat("Hello, world!");
});
```

# Events
`open` - Opened WebSocket connection.\
`close` - Closed WebSocket connection.\
`join` - Joined to the server.\
`id` - Got id.\
`message` - Any message from WebSocket server.\
`leaderboard` - Returns an object with leaders.\
`voteUpdate` - Returns list of votes.\
`medkitUpdate` - Medkit respawned.

# Options
`name (optional)` - Player name (default: `true`).\
`class (optional)` - Player class (default: `ak-47`).\
`skin (optional)` - Player skin (should be set to vclass name) (default: `ak-47`).\
`autospawn (optional)` - Autospawn on connect (default: `true`).\
`server (optional)` - Server (default: `eu1`).\
`ws (optional)` - WebSocket URL (default: `server`).
