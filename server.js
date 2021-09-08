let version = '1.0.0'


const express = require('express')
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')
const ejs = require('ejs')
const http = require('http');
const server = http.createServer(app);
const youtubedl = require('youtube-dl-exec')
const getYoutubeTitle = require('get-youtube-title')
const getYouTubeID = require('get-youtube-id');
var sanitize = require("sanitize-filename");
const { nanoid } = require('nanoid')
const youtube = require('youtube-metadata-from-url');
const getArtistTitle = require('get-artist-title')
const ytsr = require('ytsr');
 
app.use(cors());
app.set('view engine', 'ejs');
app.use(express.static('public')) // relative path of client-side code
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); 

// DATABASE
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json')
const db = low(adapter)

// socket

const { Server } = require("socket.io");
const { slice } = require('lodash');
const io = new Server(server);

// Set some defaults (required if your JSON file is empty)
db.defaults({
    users: [],
    songs: []
  }).write()


app.get('/stream/:song', function(req, res) {

    var song = req.params.song;
    let songData = db.get('songs').find({id: song}).value()
    if(songData.media){
        var music = path.join(__dirname, songData.media)

        var stat = fs.statSync(music);
        range = req.headers.range;
        var readStream;
    
        if (range !== undefined) {
            var parts = range.replace(/bytes=/, "").split("-");
    
            var partial_start = parts[0];
            var partial_end = parts[1];
    
            if ((isNaN(partial_start) && partial_start.length > 1) || (isNaN(partial_end) && partial_end.length > 1)) {
                return res.sendStatus(500); //ERR_INCOMPLETE_CHUNKED_ENCODING
            }
    
            var start = parseInt(partial_start, 10);
            var end = partial_end ? parseInt(partial_end, 10) : stat.size - 1;
            var content_length = (end - start) + 1;
    
            res.status(206).header({
                'Content-Type': 'audio/mpeg',
                'Content-Length': content_length,
                'Content-Range': "bytes " + start + "-" + end + "/" + stat.size
            });
    
            readStream = fs.createReadStream(music, {start: start, end: end});
        } else {
            res.header({
                'Content-Type': 'audio/mpeg',
                'Content-Length': stat.size
            });
            readStream = fs.createReadStream(music);
        }
        readStream.pipe(res);
    } else {
        res.send('Song not found! 404')
    }
});

function demo(titolo) {
    try{
    let [ artist, shortTitle ] = getArtistTitle(titolo)
    console.log('##### SHORT TITLE')
    console.log(shortTitle)
        return Promise.resolve(shortTitle);

    }catch(error){
        console.log('errore con getartisttitle')
        return Promise.resolve('-') 
    }
    // or
    // return Promise.reject("Failure");
  }

io.on("connection", socket => {
    // ricevere
    // socket.on("esempio", (data) => {})
  
    // inviare
    // socket.emit('come-va', ('ciaone'))

    console.log('connesso')



    socket.on('upload', async ({songLink, username}) => {

        console.log(songLink)
        if(!songLink){ socket.emit('error', ('Please provide a valid Url')); return}

        let urls = []
        youtubedl(songLink, {
            dumpSingleJson: true,
            flatPlaylist: true
        }).then(output => {
        // if it is an array

        if(Array.isArray(output.entries)){

            output.entries.forEach(song => {
                urls.push('https://www.youtube.com/watch?v=' + song.id)
            })

            console.log('ARRAY')
            let i = 0
            function downloadArray(){

                if(urls[i]){
                    console.log('### ' + urls[i])
                    download(urls[i]).then(result => {
                        if(result.success){
                            /* process */
                            console.log('ha finito, alleluia')
                            console.log(result)
                            downloadArray()
                        } else {
                            console.log('errore!!!!!!!!!!')
                            console.log(result.message)
                            socket.emit('message', result.message)
                            downloadArray()
                        }
                    });
                    i++
                }
            }

            downloadArray()

        } else { // if it is a singular url
            console.log('ORA!!!')
            download(songLink).then(result => {
                /* process */
                if(result.success){
                    console.log('ha finito, alleluia')
                    console.log(result)
                } else {
                    console.log(result.message)
                    socket.emit('message', result.message)
                }
            })

        }

        })

        var download = (songLink) => 
            new Promise((resolve, reject) => {
                let id = getYouTubeID(songLink);
        
                let generatedId = nanoid()
                let path = 'public/songs/'
                let pathname = path + 'metmusic-' + generatedId + '.%(ext)s'
            
                try{
                getYoutubeTitle(id, function (err, title) {
                    console.log(title)
                    // check if song is already in db
                    if(db.get('songs').find({title: title}).value()){
                        resolve({
                            success: false,
                            message: 'song is already in db'
                        })
                        return
                    }

                    try{
                    demo(title).then(shortTitle => {

                    try {
                    youtubedl('https://www.youtube.com/watch?v=' + id, {
                        f: 251,
                        o: pathname,
                        q: true
                    }).then(output => {
            
                            // console.log('###################')
                            // console.log('####  FINITO  #####')
                            // console.log('###################')
                
                            
                            youtube.metadata('https://www.youtube.com/watch?v=' + id).then(function(json) {


                                db.get('songs').push({
                                    id: generatedId,
                                    title: title, 
                                    shortTitle: shortTitle,
                                    author: json.author_name,
                                    media: path + 'metmusic-' + generatedId + '.webm',
                                    thumbnail: json.thumbnail_url,
                                    username: username
                                }).write()
            
                                resolve({
                                    id: generatedId,
                                    title: title,
                                    success: true
                                })

                                socket.emit('upload-update', ({
                                    id: generatedId,
                                    title: title, 
                                    shortTitle: shortTitle,
                                    author: json.author_name,
                                    media: path + 'metmusic-' + generatedId + '.webm',
                                    thumbnail: json.thumbnail_url 
                                }))

                                socket.emit('message', title + ' has been successfully downloaded')

                            })


                            
                    })  

                }catch (error) {
                    resolve({
                        success: false,
                        message: 'error'
                    })
                } 
            }) 
            }catch (error){
                console.log(error)
            }
            
            })
            

            }catch(error){
                resolve({
                    success: false,
                    message: 'error'
                })
            }

            });

    })

    socket.on('music', (songId) => {
        if(!songId){ socket.emit('error', ('Please provide a valid Id')); return }
        console.log('SUBITO: ' + songId)
        let songData = db.get('songs').find({id: songId}).value()
        
        if(songData)(

            socket.emit('music-play', {
                id: songData.id,
                title: songData.title,
                shortTitle: songData.shortTitle,
                author: songData.author,
                media: songData.media,
                thumbnail: songData.thumbnail
            })
        )   
    })

    socket.on('skip', ({songId, username}) => {
        console.log('skippato')
        if(!songId){ socket.emit('error', ('Please provide a valid Id')); return }

        let songData = db.get('songs').find({id: songId}).value()

        let allSongs = db.get('songs').filter({username: username}).value()

        let nextPosition = allSongs.indexOf(songData) + 1

        let nextSong = allSongs[nextPosition]
        if(!nextSong){
            nextSong = allSongs[0]
        }
        socket.emit('music-play', {
            id: nextSong.id,
            title: nextSong.title,
            shortTitle: nextSong.shortTitle,
            author: nextSong.author,
            media: nextSong.media,
            thumbnail: nextSong.thumbnail
        })
    })

    socket.on('previous', ({songId, username}) => {
        if(!songId){ socket.emit('error', ('Please provide a valid Id')); return }

        let songData = db.get('songs').find({id: songId}).value()

        let allSongs = db.get('songs').filter({username: username}).value()

        let previousPosition = allSongs.indexOf(songData) - 1
        
        let previousSong = allSongs[previousPosition]
        if(!previousSong){
            previousSong = allSongs[allSongs.length - 1]
        }

        socket.emit('music-play', {
            id: previousSong.id,
            title: previousSong.title,
            shortTitle: previousSong.shortTitle,
            author: previousSong.author,
            media: previousSong.media,
            thumbnail: previousSong.thumbnail
        })
    })

    socket.on('random', (username) => {
        let allSongs = db.get('songs').filter({username: username}).value()
        let songsNumber = allSongs.length
        let randomSong = allSongs[Math.floor(Math.random() * songsNumber)]
        socket.emit('music-play', {
            id: randomSong.id,
            title: randomSong.title,
            shortTitle: randomSong.shortTitle,
            author: randomSong.author,
            media: randomSong.media,
            thumbnail: randomSong.thumbnail
        })
    })

    socket.on('delete', (songId) => {
        if(!songId){ socket.emit('error', ('Please provide a valid Id')); return }

        if(db.get('songs').find({id: songId}).value()){
            try {
                fs.unlinkSync(db.get('songs').find({id: songId}).value().media)
                db.get('songs').remove({ id: songId }).write()
                socket.emit('deleted', (songId))
                //file removed
            } catch(err) {
                console.error(err)
            } 
        }
    })

    socket.on('search', (data) => {
        if(data.value){

            console.log(data.username)

            let allSongs = db.get('songs').filter({username: data.username}).value()
            let results = allSongs.filter(song => song.title.toLowerCase().includes(data.value.toLowerCase()));

            socket.emit('search-result', (results))
        }
    })

    socket.on('users', () => {
        let usernames = db.get('users').value()
        socket.emit('users-result', (usernames))
    })

    socket.on('requestSongs', (username) => {
        let allSongs = db.get('songs').filter({username: username}).value()

        socket.emit('newSongs', (allSongs))
    })

    socket.on('youtube-search', async (search) => {

        console.log(search)

        const searchResults = await ytsr(search);

        const searchedResults5 = searchResults.items.slice(0, 5);

        socket.emit('youtube-results', (searchedResults5))
    })

});

app.get('/', (req, res) => {
    res.render('desktop.ejs')
})


app.post('/test', async (req, res) => {
    console.log('arrivato')
    let songLink = req.body.songLink
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('mandato')
    res.json({title: songLink})
})

// SERVER
server.listen(8888, () => {
    console.log('started lol xd')
}) 
