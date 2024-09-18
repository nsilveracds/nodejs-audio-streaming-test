const {parseFile} = require('music-metadata');
const express = require("express")
const Throttle = require('throttle')
const Fs = require('fs')
const { PassThrough } = require('stream')
const app = express();

let filePath = "./public/portwave - shadow lady (slowed).mp3"; // put your favorite audio file
let bitRate = 0;
const streams = new Map()
app.use(express.static('public'));


app.get("/stream", (req, res) => {
    const { id, stream } = generateStream() // We create a new stream for each new client
    res.setHeader("Content-Type", "audio/mpeg")
    stream.pipe(res) // the client stream is pipe to the response
    res.on('close', () => { streams.delete(id) })
})


const init = async () => {
    const fileInfo = await parseFile(filePath)
    bitRate = fileInfo.format.bitrate / 8

}

const playFile = (filePath) => {
    const songReadable = Fs.createReadStream(filePath);
    const throttleTransformable = new Throttle(bitRate);
    songReadable.pipe(throttleTransformable);
    throttleTransformable.on('data', (chunk) => { broadcastToEveryStreams(chunk) });
    throttleTransformable.on('error', (e) => console.log(e))

}
const broadcastToEveryStreams = (chunk) => {
    for (let [id, stream] of streams) {
        stream.write(chunk) // We write to the client stream the new chunck of data
    }
}

const generateStream = () => {
    const id = Math.random().toString(36).slice(2);
    const stream = new PassThrough()
    streams.set(id, stream)
    return { id, stream }
}

init()
    .then(() => {
        app.listen(8080)
        console.log("listening at http://localhost:8080")
        console.log('streaming at http://localhost:8080/stream')
    })
    .then(() => playFile(filePath))