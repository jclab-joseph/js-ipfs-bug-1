import * as fs from 'fs';
import * as ipfs from 'ipfs-http-client';
import * as crypto from 'crypto';

const client = ipfs.create({
  url: 'http://127.0.0.1:5001/'
});

async function* readFileChunks(filePath: string): AsyncIterable<Uint8Array> {
  const fileDescriptor = await fs.promises.open(filePath, 'r');
  const fileSize = (await fileDescriptor.stat()).size;

  let position = 0;

  const chunk = Buffer.alloc(256 * 1024); // 256KB
  while (position < fileSize) {
    const { bytesRead, buffer } = await fileDescriptor.read(
      chunk,
      0,
      chunk.byteLength,
    );

    yield buffer.slice(0, bytesRead);

    if (bytesRead <= 0) {
      break;
    }
    position += bytesRead;
  }

  await fileDescriptor.close();
}


(async () => {
  if (1) {
    const hash2 = crypto.createHash('sha256');
    for await (const chunk of readFileChunks('LICENSES.chromium.html')) {
      hash2.update(chunk);
    }
    console.log('expected hash: ', hash2.digest().toString('hex'));
  }

  const fileIterator = {
    async *[Symbol.asyncIterator]() {
      for (const entry of [1, 2]) {
        const item = {
          path: `${entry}.txt`,
          content: readFileChunks('LICENSES.chromium.html'),
        };
        yield item;
      }
    },
  };
  const resp = await client.addAll(fileIterator, {
     wrapWithDirectory: true
  });

  let rootCid: string = '';
  for await (const item of resp) {
    console.log(item);
    if (item.path === '') {
      rootCid = item.cid.toString();
    }
  }

  console.log('rootCid: ', rootCid);

  if (1) {
    const downloaded = await client.get(`${rootCid}/1.txt`);
    const hash2 = crypto.createHash('sha256');
    for await (const chunk of downloaded) {
      hash2.update(chunk);
    }
    console.log('downloaded hash: ', hash2.digest().toString('hex'));
  }
})();
