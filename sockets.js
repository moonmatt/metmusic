// Sockets module

const fs = require("fs");
const youtubedl = require("youtube-dl-exec");
const getYoutubeTitle = require("get-youtube-title");
const getYouTubeID = require("get-youtube-id");
const { nanoid } = require("nanoid");
const youtube = require("youtube-metadata-from-url");
const ytsr = require("ytsr");
const getArtistTitle = require("get-artist-title");

// DATABASE
let db = require('./database.js')

function getShortTitle(titolo) {
    try {
      let [artist, shortTitle] = getArtistTitle(titolo);
      console.log(shortTitle);
      return Promise.resolve(shortTitle);
    } catch (error) {
      return Promise.resolve("-");
    }
  }

exports.socket = function(io) {
io.on("connection", (socket) => {
    socket.on("upload", async ({ songLink, username }) => {
      console.log(songLink);
      if (!songLink) {
        socket.emit("error", "Please provide a valid Url");
        return;
      }
  
      let urls = [];
      youtubedl(songLink, {
        dumpSingleJson: true,
        flatPlaylist: true,
      }).then((output) => {
        // if it is an array
  
        if (Array.isArray(output.entries)) {
          output.entries.forEach((song) => {
            urls.push("https://www.youtube.com/watch?v=" + song.id);
          });
  
          console.log("ARRAY");
          let i = 0;
  
          function downloadArray() {
            if (urls[i]) {
              console.log("### " + urls[i]);
              download(urls[i]).then((result) => {
                if (result.success) {
                  /* process */
                  console.log("ha finito, alleluia");
                  console.log(result);
                  downloadArray();
                } else {
                  console.log("errore!!!!!!!!!!");
                  console.log(result.message);
                  socket.emit("message", result.message);
                  downloadArray();
                }
              });
              i++;
            }
          }
  
          downloadArray();
        } else {
          // if it is a singular url
          console.log("ORA!!!");
          download(songLink).then((result) => {
            /* process */
            if (result.success) {
              console.log("ha finito, alleluia");
              console.log(result);
            } else {
              console.log(result.message);
              socket.emit("message", result.message);
            }
          });
        }
      });
  
      var download = (songLink) =>
        new Promise((resolve, reject) => {
          let id = getYouTubeID(songLink);
  
          let generatedId = nanoid();
          let path = "public/songs/";
          let pathname = path + "metmusic-" + generatedId + ".%(ext)s";
  
          try {
            getYoutubeTitle(id, function (err, title) {
              console.log(title);
              // check if song is already in db
              if (
                db
                  .get("songs")
                  .find({
                    fulltitle: title,
                    username: username,
                  })
                  .value()
              ) {
                resolve({
                  success: false,
                  message: "song is already in db",
                });
                return;
              }
  
              try {
  
                let fulltitle = title
                // CLEAN TITLE
  
                const reg = /[([](?![pP]rod|[fF](ea)?t).+?[)\]]/gm;
                title = title.replace(reg, "");
                title = title.replace("| GRM Daily", "");
  
                getShortTitle(title).then((shortTitle) => {
                  try {
                    youtubedl("https://www.youtube.com/watch?v=" + id, {
                      f: 249, // audio with minimal size
                      o: pathname,
                      q: true,
                    }).then((output) => {
                      youtube
                        .metadata("https://www.youtube.com/watch?v=" + id)
                        .then(function (json) {
                          json.author_name = json.author_name.replace(
                            "- Topic",
                            ""
                          );
                          json.author_name = json.author_name.replace("VEVO", "");
  
                          if (!shortTitle || shortTitle == "-") {
                            shortTitle = title;
                          }
  
                          console.log("TITOLO COMPLETO: " + title);
                          console.log("SHORT TITLE: " + shortTitle);
  
                          db.get("songs")
                            .push({
                              id: generatedId,
                              title: title,
                              shortTitle: shortTitle,
                              author: json.author_name,
                              media: path + "metmusic-" + generatedId + ".webm",
                              thumbnail: json.thumbnail_url,
                              username: username,
                              fulltitle: fulltitle
                            })
                            .write();
  
                          resolve({
                            id: generatedId,
                            title: title,
                            success: true,
                          });
  
                          socket.emit("upload-update", {
                            id: generatedId,
                            title: title,
                            shortTitle: shortTitle,
                            author: json.author_name,
                            media: path + "metmusic-" + generatedId + ".webm",
                            thumbnail: json.thumbnail_url,
                          });
  
                          socket.emit(
                            "message",
                            title + " has been successfully downloaded"
                          );
                        });
                    });
                  } catch (error) {
                    resolve({
                      success: false,
                      message: "error",
                    });
                  }
                });
              } catch (error) {
                console.log(error);
              }
            });
          } catch (error) {
            resolve({
              success: false,
              message: "error",
            });
          }
        });
    });
  
    socket.on("music", (songId) => {
      if (!songId) {
        socket.emit("error", "Please provide a valid Id");
        return;
      }
      console.log("SUBITO: " + songId);
      let songData = db
        .get("songs")
        .find({
          id: songId,
        })
        .value();
  
      if (songData)
        socket.emit("music-play", {
          id: songData.id,
          title: songData.title,
          shortTitle: songData.shortTitle,
          author: songData.author,
          media: songData.media,
          thumbnail: songData.thumbnail,
        });
    });
  
    socket.on("skip", ({ songId, username }) => {
      console.log("skippato");
      if (!songId) {
        socket.emit("error", "Please provide a valid Id");
        return;
      }
  
      let songData = db
        .get("songs")
        .find({
          id: songId,
        })
        .value();
  
      let allSongs = db
        .get("songs")
        .filter({
          username: username,
        })
        .value();
  
      let nextPosition = allSongs.indexOf(songData) + 1;
  
      let nextSong = allSongs[nextPosition];
      if (!nextSong) {
        nextSong = allSongs[0];
      }
      socket.emit("music-play", {
        id: nextSong.id,
        title: nextSong.title,
        shortTitle: nextSong.shortTitle,
        author: nextSong.author,
        media: nextSong.media,
        thumbnail: nextSong.thumbnail,
      });
    });
  
    socket.on("previous", ({ songId, username }) => {
      if (!songId) {
        socket.emit("error", "Please provide a valid Id");
        return;
      }
  
      let songData = db
        .get("songs")
        .find({
          id: songId,
        })
        .value();
  
      let allSongs = db
        .get("songs")
        .filter({
          username: username,
        })
        .value();
  
      let previousPosition = allSongs.indexOf(songData) - 1;
  
      let previousSong = allSongs[previousPosition];
      if (!previousSong) {
        previousSong = allSongs[allSongs.length - 1];
      }
  
      socket.emit("music-play", {
        id: previousSong.id,
        title: previousSong.title,
        shortTitle: previousSong.shortTitle,
        author: previousSong.author,
        media: previousSong.media,
        thumbnail: previousSong.thumbnail,
      });
    });
  
    socket.on("random", (username) => {
      let allSongs = db
        .get("songs")
        .filter({
          username: username,
        })
        .value();
      let songsNumber = allSongs.length;
      if(songsNumber){
          let randomSong = allSongs[Math.floor(Math.random() * songsNumber)];
          socket.emit("music-play", {
            id: randomSong.id,
            title: randomSong.title,
            shortTitle: randomSong.shortTitle,
            author: randomSong.author,
            media: randomSong.media,
            thumbnail: randomSong.thumbnail,
          });
      }
    });
  
    socket.on("delete", (songId) => {
      console.log("arrivato cancella");
      if (!songId) {
        socket.emit("error", "Please provide a valid Id");
        return;
      }
  
      if (
        db
          .get("songs")
          .find({
            id: songId,
          })
          .value()
      ) {
        console.log("cancellato 1");
        try {
          fs.unlinkSync(
            db
              .get("songs")
              .find({
                id: songId,
              })
              .value().media
          );
          db.get("songs")
            .remove({
              id: songId,
            })
            .write();
          socket.emit("deleted", songId);
          console.log("cancellato 2");
          //file removed
        } catch (err) {
          console.error(err);
        }
      }
    });
  
    socket.on("search", (data) => {
      if (data.value) {
        console.log(data.username);
  
        let allSongs = db
          .get("songs")
          .filter({
            username: data.username,
          })
          .value();
        let results = allSongs.filter((song) =>
          song.title.toLowerCase().includes(data.value.toLowerCase())
        );
  
        socket.emit("search-result", results);
      }
    });
  
    socket.on("users", () => {
      let usernames = db.get("users").value();
      socket.emit("users-result", usernames);
    });
  
    socket.on("requestSongs", (username) => {
      let allSongs = db
        .get("songs")
        .filter({
          username: username,
        })
        .value();
  
      socket.emit("newSongs", allSongs);
    });
  
    socket.on("youtube-search", async (search) => {
      console.log(search);
  
      const searchResults = await ytsr(search);
  
      const searchedResults5 = searchResults.items.slice(0, 5);
  
      socket.emit("youtube-results", searchedResults5);
    });

    // socket.on("connection-check", () => {
    //     socket.emit("connection-check-client");
    // })

  });
}
