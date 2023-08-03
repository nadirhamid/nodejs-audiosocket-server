import { AudiosocketServer, AudiosocketMessageTypes } from "./index.js";
import fs from "fs";

function getByteArray(filePath){
    let fileData = fs.readFileSync(filePath);
    return fileData;
}

const server = new AudiosocketServer(9092, '0.0.0.0');
const audio1 = getByteArray("./media/demo-congrats.slin");
const audio2 = getByteArray("./media/preamble.slin");

server.on('connection', (sock) => {
    console.log("got connection ", sock)
    sock.on('id', (obj) => {
        console.log('got ID');
        setImmediate(async () => {
            console.log("sending audio to channel")
            await sock.sendAudio( audio1 );
            console.log("done");

            await sock.sendAudio( audio2 );
            console.log("done");
        });
    });
    sock.on('hangup', (obj) => {
            console.log('got HANGUP');
    });
    sock.on('slin', (obj) => {
            console.log('got slin');
    });
    sock.on('error', (obj) => {
            console.log('got error');
    });
});
