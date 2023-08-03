import { AudiosocketServer, AudiosocketMessageTypes } from "./index.js";
import fs from "fs";

function getByteArray(filePath){
    let fileData = fs.readFileSync(filePath);
    return fileData;
}

const server = new AudiosocketServer(9092, '127.0.0.1');
const audio1 = getByteArray("./media/demo-congrats.slin");
const audio2 = getByteArray("./media/preamble.slin");

server.on('connection', (sock) => {
    sock.on('id', (event) => {
        console.log('got id message');
        console.log('uuid is ' + event.uuid);
        setImmediate(async () => {
            console.log("sending audio to channel")
            let audio = sock.sendAudio( audio1 );
            audio.on("done",() => {
                console.log("done");
            });
        });
    });
    sock.on('hangup', (event) => {
            console.log('got HANGUP');
    });
    sock.on('slin', (event) => {
            console.log('got slin');
    });
    sock.on('error', (event) => {
            console.log('got error');
    });
});
