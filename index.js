import net from "net";
import fs from "fs";
import { EventEmitter } from 'node:events';

export const AudiosocketMessageTypes = {
	HANGUP: 0x00,
	ID: 0x01,
	SILENCE: 0x02,
	SLIN: 0x10,
	ERROR: 0xff
};

const validMessages = Object.values( AudiosocketMessageTypes );
const maxEventListeners = 10;

const sendAudio = (sock, data) => {
    const SLINChunkSize = 320 // 8000Hz * 20ms * 2 bytes
    let i = 0;
    let chunks = 0;
 
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (i >= data.length) {
          clearInterval(interval);
          return resolve();
        }
    
        let chunkLen = SLINChunkSize;
        if (i + SLINChunkSize > data.length) {
          chunkLen = data.length - i;
        }
  
        const chunk = SlinMessage(data.slice(i, i + chunkLen));
        if (!sock.write(chunk)) {
          sock.once('drain', () => {
            if (i < data.length) {
              sendChunk();
              return;
            }
            resolve();
          });
          return;
        }
    
        chunks++;
        i += chunkLen;
      }, 20);
    
      const sendChunk = () => {
        if (i >= data.length) {
          clearInterval(interval);
          console.log("done sending chunks");
          resolve();
          return;
        }
    
        let chunkLen = SLINChunkSize;
        if (i + SLINChunkSize > data.length) {
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
    out[0] = AudiosocketMessageTypes.SLIN; 
    out.writeUInt16BE(inData.length, 1);
    inData.copy(out, 3);
    return out;
};


export class AudiosocketSocket extends EventEmitter {
    constructor(sock) {
        super();
        this.sock = sock;
        this.setMaxListeners(maxEventListeners);
    }
    async sendAudio(data) {
        return sendAudio( this.sock, data );
    }
}

export class AudiosocketServer extends EventEmitter {

    constructor(port, host, debug) {
        super();
        this.setMaxListeners(maxEventListeners);
        const server = net.createServer();
        port = port||8080;
        host = host||"127.0.0.1";
        debug = debug || false;

        server.listen(port, host, () => {
          if ( debug ) {
            console.log('Audiosocket Server is running on port ' + port +'.');
          }
        });

        server.on('connection', (originalSock) => {

            originalSock.setMaxListeners(10);
            const sock = new AudiosocketSocket( originalSock );

            this.emit('connection', sock);

            originalSock.on('close', () => {
              sock.emit('close');
            });

            originalSock.on('data', (data) => {
                const header = data.slice(0, 3);
                const payload = data.slice(3, data.length-1);
                const messageType = header[0];

                if (!validMessages.includes(messageType)) {
                    // got unknown type of message
                    console.error("Audiosocket server received unknown message type ", {header:header, payload:payload});
                    return;
                }
                const eventData = {
                    messageType: messageType,
                    data: payload 
                };
                sock.emit('event', eventData);
            });
        });
    }
}