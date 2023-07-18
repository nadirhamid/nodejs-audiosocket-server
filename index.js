import net from "net";
import fs from "fs";
import { EventEmitter } from 'node:events';

const server = net.createServer();
var port = 8080;
var host = "0.0.0.0";

const messageTypeMap = {
	hangup: 0x00,
	id: 0x01,
	silence: 0x02,
	slin: 0x10,
	error: 0xff
};


function getByteArray(filePath){
    let fileData = fs.readFileSync(filePath);
    return fileData;
}

const sendAudio = (sock, data) => {
    const slinChunkSize = 320 // 8000Hz * 20ms * 2 bytes
    let i = 0;
    let chunks = 0;
  
    const interval = setInterval(() => {
      if (i >= data.length) {
        clearInterval(interval);
        return;
      }
  
      let chunkLen = slinChunkSize;
      if (i + slinChunkSize > data.length) {
        chunkLen = data.length - i;
      }
 
      const chunk = SlinMessage(data.slice(i, i + chunkLen));
      console.log("sending chunk ", chunk);
      if (!sock.write(chunk)) {
        sock.once('drain', () => {
          if (i < data.length) {
            sendChunk();
          }
        });
        return;
      }
  
      chunks++;
      i += chunkLen;
    }, 20);
  
    const sendChunk = () => {
      if (i >= data.length) {
        clearInterval(interval);
        return;
      }
  
      let chunkLen = slinChunkSize;
      if (i + slinChunkSize > data.length) {
        chunkLen = data.length - i;
      }
  
      const chunk = audiosocket.SlinMessage(data.slice(i, i + chunkLen));
      if (!sock.write(chunk)) {
        sock.once('drain', sendChunk);
        return;
      }
  
      chunks++;
      i += chunkLen;
    };
  
    return new Promise((resolve, reject) => {
      sock.on('error', reject);
      sock.on('finish', () => {
        clearInterval(interval);
        resolve();
      });
    });
};

const SlinMessage = (inData) => {
    if (inData.length > 65535) {
      throw new Error("audiosocket: message too large");
    }
  
    const out = Buffer.alloc(3 + inData.length);
    out[0] = messageTypeMap.slin; 
    out.writeUInt16BE(inData.length, 1);
    inData.copy(out, 3);
    return out;
};

function Audiosocket(port, host) {
    server.listen(port, host, () => {
        console.log('TCP Server is running on port ' + port +'.');
    });

    let sockets = [];

    var audio = getByteArray("./test.slin");
    server.on('connection', function(sock) {
        console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
        sockets.push(sock);

        sock.on('data', function(data) {
            console.log('DATA ' + sock.remoteAddress + ': ' + data);
            //emitter.emit('data', data);
            const header = data.slice(0, 3);
            const payload = data.slice(3, data.length-1);
            const messageType = header[0];

            console.log('header ', header);
            if ( messageType === messageTypeMap.id ) {
                console.log('got id ', payload);
                setTimeout(async () => {
                    console.log("sending audio");
                    await sendAudio( sock, audio );
                }, 1000*2 );
            } else if ( messageType === messageTypeMap.hangup ) {
                console.log('got hangup ', payload);
            } else if ( messageType === messageTypeMap.silence ) {
                console.log('got silence ', payload);
            } else if ( messageType === messageTypeMap.slin ) {
                console.log('got audio data ', payload);
            } else if ( messageType === messageTypeMap.error ) {
                console.log('got error ', payload);
            }
        });
    });
}

Audiosocket(8080, '0.0.0.0');