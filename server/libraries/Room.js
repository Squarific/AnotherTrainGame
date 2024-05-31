const WebSocket = require('ws');

class Room {
    constructor(name) {
        this.name = name;
        this.lastId = 0;
        this.sockets = [];
        console.log("[" + new Date().toUTCString() + "] [" + this.name + "] created");
    }

    /**
     * Join the socket to this room
     */
    join (socket) {
        this.sockets.push(socket);
        this.lastId++;
        socket.socketIdInRoom = this.lastId;
        this.ensureActiveClients();
        console.log("[" + new Date().toUTCString() + "] [" + this.name + "] " + socket.ip + " joined as " + this.lastId + ", currently " + this.sockets.length + " active clients.");
    }

    /**
     * Leave the socket from this room
     */
    leave (socket) {
        let index;
        while (index = this.sockets.indexOf(socket) > -1) {
            this.sockets.splice(index, 1);
        }
    }
    
    /**
     * Removes all clients that do not have an open socket
     */
    ensureActiveClients () {
      this.sockets = this.sockets.filter((socket) => socket.readyState === WebSocket.OPEN);
    }

    /**
     * Sends a message to all sockets in this room except the one given
     * @param {Socket} from Socket object containing a socketIdInRoom property, you can use -1 to signify the server
     * @param {String} message
     */
    broadcastFrom (from, message) {
        let messageToSend = from.socketIdInRoom + ";" + message;
        console.log("[" + new Date().toUTCString() + "] [" + this.name + "] " + messageToSend);
        
        this.ensureActiveClients();
        for (let index = 0; index < this.sockets.length; index++) {
            if (this.sockets[index] == from) continue;
            this.sockets[index].send(messageToSend);
        }
    }
    
    /**
     * Sends a message to a specific socket in this room
     * @param {Socket} from from Socket object containing a socketIdInRoom property, you can use -1 to signify the server
     * @param {Socket} target Socket object to send to
     * @param {String} message
     */
    sendFromToTarget (from, target, message) {
        let messageToSend = from.socketIdInRoom + ";" + message;
        console.log("[" + new Date().toUTCString() + "] [" + this.name + "] From " + from.socketIdInRoom + " to " + target.socketIdInRoom + ": " + messageToSend);
        
        if (target.readyState === WebSocket.OPEN) {
          target.send(messageToSend);
        }
    }
}

module.exports = Room;