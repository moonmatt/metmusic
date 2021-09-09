const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const http = require("http");
const server = http.createServer(app);
const axios = require('axios');


app.use(cors());
app.set("view engine", "ejs");
app.use(express.static("public")); // relative path of client-side code
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

// DATABASE
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

// socket

const { Server } = require("socket.io");
const io = new Server(server);

// Set some defaults (required if your JSON file is empty)
db.defaults({
  users: [],
  songs: [],
}).write();

app.get("/stream/:song", function (req, res) {
  var song = req.params.song;
  let songData = db
    .get("songs")
    .find({
      id: song,
    })
    .value();
  if (songData.media) {
    var music = path.join(__dirname, songData.media);

    var stat = fs.statSync(music);
    range = req.headers.range;
    var readStream;

    if (range !== undefined) {
      var parts = range.replace(/bytes=/, "").split("-");

      var partial_start = parts[0];
      var partial_end = parts[1];

      if (
        (isNaN(partial_start) && partial_start.length > 1) ||
        (isNaN(partial_end) && partial_end.length > 1)
      ) {
        return res.sendStatus(500); //ERR_INCOMPLETE_CHUNKED_ENCODING
      }

      var start = parseInt(partial_start, 10);
      var end = partial_end ? parseInt(partial_end, 10) : stat.size - 1;
      var content_length = end - start + 1;

      res.status(206).header({
        "Content-Type": "audio/mpeg",
        "Content-Length": content_length,
        "Content-Range": "bytes " + start + "-" + end + "/" + stat.size,
      });

      readStream = fs.createReadStream(music, {
        start: start,
        end: end,
      });
    } else {
      res.header({
        "Content-Type": "audio/mpeg",
        "Content-Length": stat.size,
      });
      readStream = fs.createReadStream(music);
    }
    readStream.pipe(res);
  } else {
    res.send("Song not found! 404");
  }
});

const socketsConnection = require('./sockets.js');
socketsConnection.socket(io)

app.get("/", (req, res) => {
  res.render("desktop.ejs");
});

app.get('/download', async (req, res) => {
    // // Url of the image
    // const file = 'https://raw.githubusercontent.com/moonmatt/metmusic/main/server.js';
    // // Path at which image will get downloaded
    // const filePath = `./dw/`;
    
    // download(file,filePath)
    // .then(() => {
    //     console.log('Download Completed');
    // })


    axios.get('https://raw.githubusercontent.com/moonmatt/metmusic/main/version.txt').then(function (response) {
        // handle success
        console.log(response.data);
      })
  

})

// SERVER
server.listen(8888, () => {
  console.log("@##################@");
  console.log("@ STARTER METMUSIC @");
  console.log("@##################@");
});
