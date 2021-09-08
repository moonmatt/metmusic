# :musical_note: Welcome to metmusic! :musical_note:

Hello, metmusic is an **open-source** and **self-hosted** music client like Spotify that allows you to download songs on your server and play music whenever you want, even offline.

You can also have multiple account with **multiple people** using the **same server** but with different songs.

The only things you need are:

 - An internet connection
 - A working server with Node.js and Npm installed
 - Some free space on your disk to store your songs

This project is actually developed only by me, but **feel free to make your changes** and work on it.
If you like metmusic please consider making a donation!
# How to install

StackEdit stores your files in your browser, which means all your files are automatically saved locally and are accessible **offline!**

# Development
This is a helpful guide on how metmusic works and how to make changes to it.
## How it works
metmusic runs on an Express server with Node.js, the communication from client to server and from server to client are made with socket.io, except for the song source, which is made through a GET request.

**Here are all the socket calls and callbacks**
### Play music
To play music the client emits a socket called music, which needs the id of the song as a string

    socket.emit('music', ('song id'))
The server receives the request 

    socket.on('music',  (songId)  =>  {...
Then checks the database and if everything is correct, sends back to the client a socket with all the info about the song.

    socket.emit('music-play',  {
    id: // the id
    title: // the title and the author
    shortTitle: // only the title
    author: // the author
    media: // the link to the media src
    thumbnail: // the youtube thumbnail 
    })

 And then the client
 

    socket.on('music-play',  (api)  =>  {...
plays the music, by setting the source of the audio player

    audio.src  =  '/stream/'  +  api.id
    audio.load()
    audio.play()

### Skip song
The client emits a socket with the id of the current song and the username of the logged person.

    socket.emit('skip',  ({songId:  currentSong,  username:  username}))
If the loop variable is true, it just emits a random socket.

On the server-side, everything works like the previous call, but this time returns the song after the current one. 
If it happens to be the last one, it is going to play the first one.

    socket.on('skip',  ({songId,  username})  =>  {..
Then it emits the normal 

    socket.emit('music-play',  {...
### Previous song
The exact same thing as 'Skip song', but with the previous one, so:
client emits 

    socket.emit('previous',  ({songId:  currentSong,  username:  username}))
and the server 

    socket.on('previous',  ({songId,  username})  =>  {
and then emits the song

    socket.emit('music-play',  {...
### Random song
This allows the user to play a random song, in order to do so, the client emits a socket with only the username variable

    socket.emit('random',  (username))
and the server receives it with 

    socket.on('random',  (username)  =>  {...
and sends it to the client as always with 

    socket.emit('music-play',  {...
### Delete a song
This time it's going to be a little bit different than the previous ones.
To delete a song the client emits a socket with the id of the song that has to be deleted

    socket.emit('delete',  (id))
the server receives it

    socket.on('delete',  (songId)  =>  {...
and once it is completely removed from the database and from the songs folder, emits a new socket to the client

    socket.emit('deleted',  (songId))
The client at this point receives it 

    socket.on('deleted',  (id)  =>  {...
and removes the song item from the dom, and skips to the next song if the one that is currently playing is the one that has been deleted.
