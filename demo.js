import { AudiosocketServer, AudiosocketMessageTypes } from "./index.js";
import fs from "fs";

function getByteArray(filePath){
    let fileData = fs.readFileSync(filePath);
    return fileData;
}

const server = new AudiosocketServer(8080, '0.0.0.0');
const audio1 = getByteArray("./media/demo-congrats.slin");
const audio2 = getByteArray("./media/preamble.slin");

server.on('connection', (sock) => {
    console.log("got connection ", sock)
    sock.on('event', (obj) => {
        const {messageType, header, payload} = obj;
        if ( messageType === AudiosocketMessageTypes.ID ) {
            console.log('got ID');
            setImmediate(async () => {
                console.log("sending audio to channel")
                await sock.sendAudio( audio1 );
                console.log("done");

                await sock.sendAudio( audio1 );
                console.log("done");

                await sock.sendAudio( audio1 );
                console.log("done");
            });
        } else if ( messageType === AudiosocketMessageTypes.HANGUP ) {
            console.log('got HANGUP');
        } else if ( messageType === AudiosocketMessageTypes.SILENCE ) {
            console.log('got SILENCE');
        } else if ( messageType === AudiosocketMessageTypes.SLIN ) {
            //console.log('got SLIN audio data');
        } else if ( messageType === AudiosocketMessageTypes.ERROR ) {
            console.log('got ERROR');
        }
    });

});
