/*
 * Generates high-quality MP3 audio for every guide script using Tencent Cloud
 * basic TTS (TextToVoice API). Run with:
 *   set TENCENT_SECRET_ID=xxx
 *   set TENCENT_SECRET_KEY=xxx
 *   node scripts/generate-tencent-audio.js
 * Options:
 *   --voice=WeWinny          English female, 24 kHz (default)
 *   --voice=WeJames          English male, 24 kHz
 *   --voice=WeJack           English male, 16 kHz (800万-char free tier)
 *   --speed=0                speech speed, -2 (slower) .. 6 (faster)
 *   --volume=0               volume -10 .. 10
 * First run: cd scripts && npm install
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const tencentcloud = require("tencentcloud-sdk-nodejs-tts");
const { SCRIPTS } = require("../data/scripts");

const TtsClient = tencentcloud.tts.v20190823.Client;

const BUILD_DIR = path.join(__dirname, "..", "audio-build");
const AUDIO_DIR = path.join(BUILD_DIR, "audio");
const MANIFEST_PATH = path.join(BUILD_DIR, "audio-manifest.js");
const CONCURRENCY = 3;
const RETRIES = 4;
const PART_LIMIT = 1500 * 1024;
// TextToVoice accepts up to 500 half-width characters per request.
const TEXT_LIMIT = 450;

// Official voice IDs (cloud.tencent.com/document/product/1073/92668).
const VOICES = {
  WeWinny: { id: 501009, sampleRate: 24000, label: "English female 24kHz" },
  WeJames: { id: 501008, sampleRate: 24000, label: "English male 24kHz" },
  WeJack: { id: 101050, sampleRate: 16000, label: "English male 16kHz" }
};

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const found = args.find((item) => item.indexOf(name) === 0);
  return found ? found.slice(name.length) : fallback;
}
const VOICE = argValue("--voice=", "WeWinny");
const voiceConfig = VOICES[VOICE] || VOICES.WeWinny;
const SPEED = Number(argValue("--speed=", "0"));
const VOLUME = Number(argValue("--volume=", "0"));

const SECRET_ID = argValue("--secret-id=", process.env.TENCENT_SECRET_ID || "");
const SECRET_KEY = argValue("--secret-key=", process.env.TENCENT_SECRET_KEY || "");
if (!SECRET_ID || !SECRET_KEY) {
  console.error("Missing credentials. Set TENCENT_SECRET_ID / TENCENT_SECRET_KEY env vars or pass --secret-id= --secret-key=");
  process.exit(1);
}

const client = new TtsClient({
  credential: { secretId: SECRET_ID, secretKey: SECRET_KEY },
  region: "ap-guangzhou",
  profile: { httpProfile: { endpoint: "tts.tencentcloudapi.com", reqMethod: "POST" } }
});

function splitText(text) {
  if (text.length <= TEXT_LIMIT) return [text];
  // Long sentence: split on clause boundaries and greedily re-pack chunks.
  const clauses = text.split(/(?<=[,;:]) +/);
  const chunks = [];
  let current = "";
  for (const clause of clauses) {
    if (current && (current + " " + clause).length > TEXT_LIMIT) {
      chunks.push(current);
      current = clause;
    } else {
      current = current ? current + " " + clause : clause;
    }
  }
  if (current) chunks.push(current);
  // A single clause may still exceed the limit - hard-split it by words.
  const safe = [];
  for (const chunk of chunks) {
    if (chunk.length <= TEXT_LIMIT) {
      safe.push(chunk);
      continue;
    }
    const words = chunk.split(" ");
    let piece = "";
    for (const word of words) {
      if (piece && (piece + " " + word).length > TEXT_LIMIT) {
        safe.push(piece);
        piece = word;
      } else {
        piece = piece ? piece + " " + word : word;
      }
    }
    if (piece) safe.push(piece);
  }
  return safe;
}

async function synthesizeChunkOnce(text, index) {
  const response = await client.TextToVoice({
    Text: text,
    SessionId: crypto.randomUUID(),
    Volume: VOLUME,
    Speed: SPEED,
    VoiceType: voiceConfig.id,
    ModelType: 1,
    PrimaryLanguage: 2,
    Codec: "mp3",
    SampleRate: voiceConfig.sampleRate
  });
  if (!response || !response.Audio) {
    throw new Error("Tencent TTS returned no audio (chunk " + index + ")");
  }
  return Buffer.from(response.Audio, "base64");
}

async function synthesizeChunk(text, index) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      return await synthesizeChunkOnce(text, index);
    } catch (error) {
      lastError = error;
      const retryable =
        error.code === "InternalError" ||
        error.code === "ServerTimeout" ||
        error.code === "RequestLimitExceeded" ||
        /timeout/i.test(error.message || "");
      if (!retryable) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  throw lastError;
}

async function synthesize(text) {
  // One sentence may need several API calls; concatenate the audio.
  const chunks = splitText(text);
  const buffers = [];
  for (let i = 0; i < chunks.length; i += 1) {
    buffers.push(await synthesizeChunk(chunks[i], i));
  }
  return Buffer.concat(buffers);
}

// General MP3 frame parser: handles MPEG-1 / MPEG-2 / MPEG-2.5 Layer III.
function mp3Duration(buffer) {
  const bitratesV1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const bitratesV2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const ratesV1 = [44100, 48000, 32000];
  const ratesV2 = [22050, 24000, 16000];
  const ratesV25 = [11025, 12000, 8000];
  let offset = 0;
  let seconds = 0;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1;
      continue;
    }
    const versionBits = (buffer[offset + 1] >> 3) & 3; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
    const layerBits = (buffer[offset + 1] >> 1) & 3; // 1=Layer III
    const bitrateIndex = (buffer[offset + 2] >> 4) & 15;
    const sampleRateIndex = (buffer[offset + 2] >> 2) & 3;
    const padding = (buffer[offset + 2] >> 1) & 1;
    if (layerBits !== 1 || !bitrateIndex || sampleRateIndex === 3 || versionBits === 1) {
      offset += 1;
      continue;
    }
    let bitrate;
    let sampleRate;
    let samplesPerFrame;
    if (versionBits === 3) {
      bitrate = bitratesV1L3[bitrateIndex] * 1000;
      sampleRate = ratesV1[sampleRateIndex];
      samplesPerFrame = 1152;
    } else if (versionBits === 2) {
      bitrate = bitratesV2L3[bitrateIndex] * 1000;
      sampleRate = ratesV2[sampleRateIndex];
      samplesPerFrame = 576;
    } else {
      bitrate = bitratesV2L3[bitrateIndex] * 1000;
      sampleRate = ratesV25[sampleRateIndex];
      samplesPerFrame = 576;
    }
    const frameLength = Math.floor((samplesPerFrame / 8) * (bitrate / sampleRate)) + padding;
    if (frameLength < 4 || offset + frameLength > buffer.length) break;
    seconds += samplesPerFrame / sampleRate;
    offset += frameLength;
  }
  return seconds;
}

async function mapLimit(items, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function generateScript(script) {
  const buffers = new Array(script.sentences.length);
  let completed = 0;
  console.log("Generating " + script.id + " (" + script.sentences.length + " sentences)…");
  await mapLimit(script.sentences, async (sentence, index) => {
    buffers[index] = await synthesize(sentence);
    completed += 1;
    if (completed === script.sentences.length || completed % 25 === 0) {
      console.log("  " + completed + "/" + script.sentences.length);
    }
  });

  // Greedily pack sentences into parts under PART_LIMIT bytes each.
  const parts = [{ buffers: [], size: 0 }];
  for (const buffer of buffers) {
    const current = parts[parts.length - 1];
    if (current.size + buffer.length > PART_LIMIT && current.buffers.length > 0) {
      parts.push({ buffers: [], size: 0 });
    }
    const target = parts[parts.length - 1];
    target.buffers.push(buffer);
    target.size += buffer.length;
  }

  const files = [];
  const timings = new Array(script.sentences.length);
  let runningIndex = 0;
  parts.forEach((part, partIndex) => {
    let position = 0;
    part.buffers.forEach((buffer) => {
      const duration = mp3Duration(buffer);
      timings[runningIndex] = [
        Number(position.toFixed(3)),
        Number((position + duration).toFixed(3)),
        partIndex
      ];
      position += duration;
      runningIndex += 1;
    });
    const filename = script.id + "-" + (partIndex + 1) + ".mp3";
    fs.writeFileSync(path.join(AUDIO_DIR, filename), Buffer.concat(part.buffers));
    files.push("/audio/" + filename);
    console.log(
      "  part " + (partIndex + 1) + ": " + part.buffers.length + " sentences, " +
      (part.size / 1024 / 1024).toFixed(2) + " MB"
    );
  });

  return { files, timings };
}

async function main() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  console.log("Voice: " + VOICE + " (" + voiceConfig.label + ", speed " + SPEED + ", volume " + VOLUME + ", mp3 " + voiceConfig.sampleRate + "Hz)");
  const manifest = {};
  for (const script of SCRIPTS) {
    manifest[script.id] = await generateScript(script);
  }
  fs.writeFileSync(
    MANIFEST_PATH,
    "// Generated by scripts/generate-tencent-audio.js.\nmodule.exports = " + JSON.stringify(manifest) + ";\n"
  );
  console.log("Created audio files in audio-build/. Run split-audio-packages.js next.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Audio generation failed:", error.code || "", error.message);
    process.exitCode = 1;
  });
}

module.exports = { synthesize, splitText, mp3Duration };
