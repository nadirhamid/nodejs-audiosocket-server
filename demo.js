import { AudiosocketServer, AudiosocketMessageTypes } from "./index.js";
import fs from "fs";

function getByteArray(filePath){
    let fileData = fs.readFileSync(filePath);
    return fileData;
}

const server = new AudiosocketServer(8080, '0.0.0.0');
const audio = getByteArray("./media/demo-congrats.slin");

server.on('connection', (sock) => {
    console.log("got connection ", sock)
    sock.on('event', (obj) => {
        console.log("got event ");
        const {messageType, header, payload} = obj;
        if ( messageType === AudiosocketMessageTypes.ID ) {
            console.log('got ID');
            setImmediate(async () => {
                console.log("sending audio to channel")
                await sock.sendAudio( audio );
                console.log("done");
            });
        } else if ( messageType === AudiosocketMessageTypes.HANGUP ) {
            console.log('got HANGUP');
        } else if ( messageType === AudiosocketMessageTypes.SILENCE ) {
            console.log('got SILENCE');
        } else if ( messageType === AudiosocketMessageTypes.SLIN ) {
            console.log('got SLIN audio data');
        } else if ( messageType === AudiosocketMessageTypes.ERROR ) {
            console.log('got ERROR');
        }
    });

});