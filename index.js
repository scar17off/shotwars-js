const WebSocket = require("ws");
const EventEmitter = require("events");
const msgpack = require("./msgpack.min.js");

const Servers = {
    eu1: "newyork1.shotwars.io",
    eu2: "newyork2.shotwars.io"
};

const Modes = ["ffa", "tdm", "ctf", "gungame", "zombies"];

const vClass = {
    Pistol: "pistol",
	SMG: "smg",
	Shotgun: "shotgun",
	Boxer: "boxer",
	AK47: "ak-47",
	Sniper: "sniper",
	LMG: "lmg",
	RPG: "rocket",
	Bow: "bow",
	Flamethrower: "flamethrower"
};

const ReloadingTime = {
    pistol: 2.4,
	smg: 2.6,
	shotgun: 2,
	boxer: 2,
	zombie: 2,
	"ak-47": 2,
	sniper: 2.1,
	lmg: 6,
	rocket: 3,
	bow: 1.5,
	flamethrower: 3
};

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
};
  
function calculateMouseAngle(angleInDegrees) {
    const angleInRadians = toRadians(angleInDegrees);
  
    const normalizedAngle = (angleInRadians % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  
    const adjustedX = Math.cos(normalizedAngle) * 1000;
    const adjustedY = Math.sin(normalizedAngle) * 1000;
  
    const resultAngle = Math.atan2(adjustedX, adjustedY) + Math.PI / 2;
  
    return resultAngle;
};

class Client extends EventEmitter.EventEmitter {
    constructor(options = {}) {
        super();

        if(!options.server && !options.ws) {
            options.server = Servers["eu1"];
            options.ws = "wss://" + options.server + "/ws/";
        };
        if(!options.class) options.class = "ak-47";
        if(!options.skin) options.skin = "ak-47";
        if(!options.autospawn) options.autospawn = true;

        const nameCache = {};
        const playerCache = {};
        this.player = {
            name: options.name || '',
            class: options.class,
            skin: "img/" + options.skin + "/head.png",
            id: null
        };
        this.serverMode = null;
        this.leaderboard = {};
        this.players = {};
        this.objects = {};
        this.dropcrate = null;
        this.medkits = null;
        this.projectiles = {};

        this.net = {};
        this.net.ws = new WebSocket(options.ws);

        this.net.ws.addEventListener("open", () => {
            this.emit("open");

            if(options.autospawn) this.spawn();
        });

        this.net.ws.addEventListener("message", rawMessage => {
            rawMessage = rawMessage.data;
            const queue = msgpack.decode(rawMessage);
            const playerUpdates = queue.filter(obj => typeof obj.chat == "string");
            const other = queue.filter(obj => typeof obj.chat == "undefined");
            
            this.players = {};
            playerUpdates.forEach((item) => {
                const key = item.a[0].toString();
                item.id = item.a[0];
                item.name = nameCache[item.id];
                if(this.player.id == key) {
                    this.player = item;
                    if(options.autospawn && this.player.health < 10) {
                        setTimeout(() => {
                            this.spawn();
                        }, 1000);
                        this.emit("respawn");
                    };
                    return;
                };
                for(let property in playerCache[key]) 
                {
                    if(["a", "i", "b"].indexOf(property) !== -1) continue;
                    item[property] = playerCache[key][property];
                };
                this.players[key] = item;
            });

            other.forEach(message => {
                if(message.t == "gas") return;
                if(["x", "y", "z", "e", "gsl"].indexOf(message.t) !== -1) return;
                if(message.b == "object") {
                    const id = message.i.toString();

                    delete message.i;

                    this.objects[id] = message;
                    return;
                };
                if(message.b == "bullet") {
                    const id = message.i.toString();

                    delete message.i;

                    this.projectiles[id] = message;
                    return;
                };
                if(message.b == "player") {
                    playerCache[message.i.toString()] = message;
                    return;
                };
                if(message.t == "leaderboard" || message.t == "endleaderboard") {
                    this.leaderboard = message.obj;
                    for(const index in message.obj) {
                        const player = message.obj[index];

                        nameCache[player.id] = player.name.substr(3);
                    };
                    this.serverMode = message.mode;
                    this.emit("leaderboard", this.leaderboard);
                    return;
                };
                if(message.t == "updatevote") {
                    this.emit("voteUpdate", message.modes);
                };
                if(message.t == "medkit") {
                    this.medkits = message.data;
                    this.emit("medkitUpdate", this.medkits);
                    return;
                };
                if(message.t == "dropcrate") {
                    this.dropcrate = message.position;
                    this.emit("dropcrateUpdate", this.dropcrate);
                    return;
                };
                if(message.t == "setID") {
                    this.player.id = message.id.toString();
                    this.emit("id", this.player.id);
                    return;
                };
            });

            this.emit("rawMessage", rawMessage);
        });

        this.net.ws.addEventListener("close", () => {
            this.emit("close");
        });

        this.spawn = function() {
            this.net.ws.send(msgpack.encode([
                {
                    "type": "start",
                    "name": options.name,
                    "vclass": options.class,
                    "skin": "img/" + options.skin + "/head.png"
                }
            ]));
        };

        this.rotate = function(angle) {
            angle = calculateMouseAngle(angle);
            this.net.ws.send(msgpack.encode([
                {
                    "type": "setRotation",
                    "object": {
                        "angle": angle
                    }
                }
            ]));
        };

        this.keyState = function(key, state) {
            this.net.ws.send(msgpack.encode([
                {
                    "type": "updateControls",
                    "object": { key, state }
                }
            ]));
        };

        this.fire = function() {
            this.net.ws.send(msgpack.encode([
                {
                    "type": "mouse",
                    "clicking": true
                }
            ]));
        };

        this.chat = function(message) {
            this.net.ws.send(msgpack.encode([
                {
                    "type": "chat",
                    "name": message
                }
            ]));
        };

        this.isTeammate = function(playerID) {
            if(this.serverMode == "ctf" ||
                this.serverMode == "zombies" ||
                this.serverMode == "tdm"
            ) return this.players[playerID].team == this.player.team;
            else return this.players[playerID].team !== this.player.team;
        };

        this.vote = function(mode) {
            if(Modes.indexOf(mode) === -1) {
                console.error("Invalid mode");
                return;
            };
            this.net.ws.send(msgpack.encode([
                {
                    "type": "vote",
                    "mode": mode
                }
            ]));
        };
    };
};

module.exports = {
    Client,
    Servers,
    vClass,
    ReloadingTime
};