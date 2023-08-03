import net from "net";
import fs from "fs";
import { EventEmitter } from 'node:events';
import uuidBuffer from 'uuid-buffer';

export const AudiosocketMessageTypes = {
	HANGUP: 0x00,
	ID: 0x01,
	SILENCE: 0x02,
	SLIN: 0x10,
	ERROR: 0xff
};

const validMessages = Object.values( AudiosocketMessageTypes );
const tcpMaxEventListeners = 10;
// many audio packets could be sent and the library may need to listen to many events; thus
// it is best to set the event listener limit to a large number. This way no warnings will show
const audioMaxEventListeners = 999999;

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

const mapEventType = (messageType) => {
  const keys = Object.keys( AudiosocketMessageTypes );
  for ( var index in keys ) {
    const key = keys[index];
    if ( messageType == AudiosocketMessageTypes[key] ) {
      return key.toLowerCase();
    }
  }
  throw new Error("no event type found");
}


export class AudiosocketSocket extends EventEmitter {
    constructor(sock) {
        super();
        this.sock = sock;
    }
    async sendAudio(data) {
        return sendAudio( this.sock, data );
    }
}

export class AudiosocketServer extends EventEmitter {

    constructor(port, host, debug) {
        super();
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

            originalSock.setMaxListeners(audioMaxEventListeners);
            const sock = new AudiosocketSocket( originalSock );

            this.emit('connection', sock);

            originalSock.on('close', () => {
              sock.emit('close');
            });

            originalSock.on('data', (data) => {
                const header = data.slice(0, 3);
                const payload = data.slice(3, data.length);
                const messageType = header[0];

                if (!validMessages.includes(messageType)) {
                    // got unknown type of message
                    console.error("Audiosocket server received unknown message type ", {header:header, payload:payload});
                    return;
                }
                const eventData = {
                    data: payload 
                };
                const eventType = mapEventType(messageType)
                if (messageType===AudiosocketMessageTypes.ID) {
                  eventData['uuid'] = uuidBuffer.toString(payload);
                }
                sock.emit(eventType, eventData);
            });
        });
    }
}