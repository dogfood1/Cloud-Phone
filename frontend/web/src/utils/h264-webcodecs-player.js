function findStartCodes(buffer, offset = 0) {
  const indices = [];

  for (let index = offset; index < buffer.length - 3; index += 1) {
    if (buffer[index] === 0 && buffer[index + 1] === 0) {
      if (buffer[index + 2] === 1) {
        indices.push(index);
        index += 2;
      } else if (buffer[index + 2] === 0 && buffer[index + 3] === 1) {
        indices.push(index);
        index += 3;
      }
    }
  }

  return indices;
}

function splitAnnexBNals(buffer) {
  const starts = findStartCodes(buffer);

  if (starts.length === 0) {
    return buffer.length ? [buffer] : [];
  }

  const nals = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    let headerSize = 3;

    if (buffer[start + 2] === 0) {
      headerSize = 4;
    }

    const nalStart = start + headerSize;
    const nalEnd = index + 1 < starts.length ? starts[index + 1] : buffer.length;
    const nal = buffer.subarray(nalStart, nalEnd);

    if (nal.length) {
      nals.push(nal);
    }
  }

  return nals;
}

function getNalType(nal) {
  return nal[0] & 0x1f;
}

function buildAvcC(sps, pps) {
  const record = new Uint8Array(7 + 2 + sps.length + 1 + 2 + pps.length);
  let offset = 0;

  record[offset++] = 1;
  record[offset++] = sps[1];
  record[offset++] = sps[2];
  record[offset++] = sps[3];
  record[offset++] = 0xff;
  record[offset++] = 0xe1;
  record[offset++] = (sps.length >> 8) & 0xff;
  record[offset++] = sps.length & 0xff;
  record.set(sps, offset);
  offset += sps.length;
  record[offset++] = 1;
  record[offset++] = (pps.length >> 8) & 0xff;
  record[offset++] = pps.length & 0xff;
  record.set(pps, offset);

  return record;
}

function nalToAvccSample(nal) {
  const sample = new Uint8Array(4 + nal.length);
  const length = nal.length;

  sample[0] = (length >>> 24) & 0xff;
  sample[1] = (length >>> 16) & 0xff;
  sample[2] = (length >>> 8) & 0xff;
  sample[3] = length & 0xff;
  sample.set(nal, 4);

  return sample;
}

function concatChunks(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

export class H264WebCodecsPlayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.decoder = null;
    this.configured = false;
    this.pending = new Uint8Array(0);
    this.sps = null;
    this.pps = null;
    this.frameCount = 0;
  }

  append(chunk) {
    const incoming =
      chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    const merged = new Uint8Array(this.pending.length + incoming.length);

    merged.set(this.pending);
    merged.set(incoming, this.pending.length);

    const starts = findStartCodes(merged);

    if (!starts.length) {
      this.pending = merged;
      return;
    }

    const nals = splitAnnexBNals(merged);

    for (const nal of nals) {
      this.#handleNal(nal);
    }

    this.pending = merged.subarray(starts[starts.length - 1]);
  }

  #handleNal(nal) {
    const type = getNalType(nal);

    if (type === 7) {
      this.sps = nal;
      this.#tryConfigure();
      return;
    }

    if (type === 8) {
      this.pps = nal;
      this.#tryConfigure();
      return;
    }

    if (!this.configured || !this.decoder) {
      return;
    }

    const keyFrame = type === 5;
    const sample = nalToAvccSample(nal);

    this.decoder.decode(
      new EncodedVideoChunk({
        type: keyFrame ? "key" : "delta",
        timestamp: this.frameCount * 33_333,
        data: sample,
      }),
    );

    this.frameCount += 1;
  }

  #tryConfigure() {
    if (this.configured || !this.sps || !this.pps || !("VideoDecoder" in window)) {
      return;
    }

    const description = buildAvcC(this.sps, this.pps);

    this.decoder = new VideoDecoder({
      output: (frame) => {
        if (this.canvas.width !== frame.displayWidth || this.canvas.height !== frame.displayHeight) {
          this.canvas.width = frame.displayWidth;
          this.canvas.height = frame.displayHeight;
        }

        this.ctx.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
        frame.close();
      },
      error: () => {
        this.configured = false;
      },
    });

    this.decoder.configure({
      codec: "avc1.42E01E",
      description,
      optimizeForLatency: true,
    });

    this.configured = true;
  }

  destroy() {
    if (this.decoder) {
      try {
        this.decoder.close();
      } catch {
        // ignore
      }
    }

    this.decoder = null;
    this.configured = false;
    this.pending = new Uint8Array(0);
    this.sps = null;
    this.pps = null;
    this.frameCount = 0;
  }

  static isSupported() {
    return typeof window !== "undefined" && "VideoDecoder" in window;
  }
}

export function mergeBinaryChunks(chunks) {
  return concatChunks(chunks.map((chunk) => new Uint8Array(chunk)));
}
