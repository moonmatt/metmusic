const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const http = require("http");
const server = http.createServer(app);
const download = require('download')

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

// socket

const { Server } = require("socket.io");
const io = new Server(server);

let db = require('./database.js')

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

app.get('/update', async (req, res) => {
        const file = 'https://github.com/moonmatt/metmusic/archive/refs/heads/main.zip';
        const filePath = `./temp/`;
        let options = {
            extract: true
        }
        download(file,filePath, options)
        .then((data) => {
            console.log('Download Completed');
            let path = data[0].path
            let fullpath = './temp/' + path

            let filesToUpdate = [
                'server.js', 
                'sockets.js', 
                'version.txt', 
                'database.js', 
                'views/desktop.ejs', 
                'public/css/desktop.css', 
                'public/scripts/desktop.js', 
                'public/metmusic.png',
                'README.md'
            ]

            // update server.js
            filesToUpdate.forEach(file => {
                fs.rename(fullpath + file, file, function (err) {
                    if (err) throw err
                    console.log('Successfully moved!')
                })
            })
            fs.rmdirSync(fullpath, { recursive: true });
            res.send('You have succesfully updated metmusic! Please read the console')
            console.log("@###################@");
            console.log("@  UPDATE FINISHED  @");
            console.log("@###################@");
            console.log('Please stop the current server')
            console.log('and type `npm i`')
            console.log('Then start the server again!')

        })
})

// SERVER
server.listen(8888, () => {
  console.log("@##################@");
  console.log("@ STARTED METMUSIC @");
  console.log("@##################@");
});
