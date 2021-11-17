// desktop
document.getElementById("bar").value = 0;

// socket
var socket = io();
socket.on("connect", () => {
  console.log("connesso");
});
// Cookies

let username = Cookies.get("username");
let availableUsers;

if (username) {
  socket.emit("requestSongs", username);
  document.getElementById("logged-user").innerHTML = username;
  document.getElementById("screenBlock").style.display = "none";
}

if (!username) {
  socket.emit("users");
}

socket.on("users-result", (users) => {
  availableUsers = users;
  users.forEach((user) => {
    var opt = document.createElement("option");
    opt.value = user.username;
    opt.innerHTML = user.username;
    document.getElementById("selectUsernames").appendChild(opt);
  });
  document.getElementById("username-popup").style.display = "flex";
});

function saveUsername() {
  Cookies.set("username", document.getElementById("selectUsernames").value);
  username = document.getElementById("selectUsernames").value;
  socket.emit("requestSongs", document.getElementById("selectUsernames").value);
  document.getElementById("username-popup").style.display = "none";
  document.getElementById("logged-user").innerHTML = username;
  document.getElementById("screenBlock").style.display = "none";
}

// connection status

function notConnected(){
  // do whatever you like here
  document.getElementById('connection').style.background = 'red'
}

socket.on('update', data => console.log(data));

socket.on('connect_error', err => notConnected());
socket.on('connect_failed', err => notConnected());
socket.on('disconnect', err => notConnected());

socket.on('connection', () => {
  document.getElementById('connection').style.background = 'green'
})

let currentSong;
let queue = [];
let currentData = {};
let nextSongsQueue = [];

let loop = false;

let skipButton = document.getElementById("skip");

let audio = document.getElementById("audio");
let song = document.getElementById("song");
let songTitle = document.getElementById("songTitle");

let playButton = document.getElementById("playButton");

socket.on("music-play", (api) => {
  if (currentSong && document.getElementById(currentSong)) {
    document
      .getElementById(currentSong)
      .querySelector("#icon-start").innerHTML =
      '<ion-icon name="musical-notes"></ion-icon>';
    document.getElementById(currentSong).classList.remove("active");
  }
  document.getElementById("bar").value = 0;

  if (!api.shortTitle || api.shortTitle == "-") {
    api.shortTitle = api.title;
  }

  currentSong = api.id;

  songTitle.innerHTML = api.shortTitle;
  currentData.title = api.title;
  currentData.author = api.author;
  currentData.media = api.thumbnail;
  currentData.shortTitle = api.shortTitle;

  audio.src = "/stream/" + api.id;
  document.title = api.shortTitle + " - " + api.author;
  audio.load();
  audio.play();

// add to queue
  queue.push(api.id)
  console.log(queue)

  document.getElementById("side-title").innerHTML = api.shortTitle;
  document.getElementById("side-author").innerHTML = api.author;

  document.getElementById("song-image").style.backgroundImage =
    "url(" + api.thumbnail + ")";
  playButton.innerHTML = '<ion-icon name="pause" class="bigger"></ion-icon>';
  document.getElementById(api.id).querySelector("#icon-start").innerHTML =
    '<ion-icon name="pause"></ion-icon>';
  document.getElementById(api.id).classList.add("active");

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentData.shortTitle,
      artist: currentData.author,
      artwork: [
        { src: currentData.media, sizes: "96x96", type: "image/png" },
        { src: currentData.media, sizes: "128x128", type: "image/png" },
        { src: currentData.media, sizes: "192x192", type: "image/png" },
        { src: currentData.media, sizes: "256x256", type: "image/png" },
        { src: currentData.media, sizes: "384x384", type: "image/png" },
        { src: currentData.media, sizes: "512x512", type: "image/png" },
      ],
    });

    navigator.mediaSession.setActionHandler("play", function () {
      playStop();
    });
    navigator.mediaSession.setActionHandler("pause", function () {
      playStop();
    });
    navigator.mediaSession.setActionHandler("stop", function () {
      stopSong();
    });
    navigator.mediaSession.setActionHandler("previoustrack", function () {
      previous();
    });
    navigator.mediaSession.setActionHandler("nexttrack", function () {
      skip();
    });
  }
});

function playSong(id) {
  socket.emit("music", id);
  // add song to queue
}

function skip() {
  if(nextSongsQueue.length > 0){
    playSong(nextSongsQueue[0])
    nextSongsQueue.shift()
  }else {
    if (loop) {
      random();
    } else {
      socket.emit("skip", { songId: currentSong, username: username });
    }
  }
}

function previous() {
  if(queue.length <= 1){
    socket.emit("previous", { songId: currentSong, username: username });
  }
  playSong(queue.slice(-2, -1)[0])
  queue.pop()
  queue.pop()
}
function random() {
  socket.emit("random", username);
}

function deleteSong(id) {
  socket.emit("delete", id);
  document.getElementById('menusong-popup').style.display = "none"
  createAlert("The song has been deleted!");

}
socket.on("deleted", (id) => {
  document.getElementById(id).remove();
  if (document.getElementsByClassName("blockID#" + id)[0]) {
    document.getElementsByClassName("blockID#" + id)[0].remove();
  }

  if (audio.duration > 0 && !audio.paused) {
    skip();
  }
});
function playStop() {
  if (audio.paused && audio.currentTime > 0 && !audio.ended) {
    // se l'audio e' stoppato
    audio.play(); // riproduci audio
    playButton.innerHTML = '<ion-icon name="pause" class="bigger"></ion-icon>';
  } else {
    audio.pause();
    playButton.innerHTML = '<ion-icon name="play" class="bigger"></ion-icon>';
  }
}
function loopRandom() {
  if (!loop) {
    loop = true;
    document.getElementById("loop").name = "stop-circle";
  } else {
    loop = false;
    document.getElementById("loop").name = "infinite";
  }
}
function getMinute(time) {
  var seconds = time % 60;
  var foo = time - seconds;
  var minutes = foo / 60;
  if (seconds < 10) {
    seconds = "0" + seconds.toString();
  }
  var fixedCurrentTime = minutes + ":" + seconds;
  return fixedCurrentTime;
}

function addQueue(id){
  nextSongsQueue.push(id)
  createAlert("Added to Queue!");
}

function search(value) {
  if (value) {
    socket.emit("search", { value: value, username: username });

    document.getElementById("songs-list").style.display = "none";
    document.getElementById("searchSongs-list").style.display = "block";

    document.getElementById("random-songs").style.display = "none";
    document.getElementById("random-songs-hr").style.display = "none";
    document.getElementById("random-songs-title").style.display = "none";
  } else {
    // reset
    document.getElementById("songs-list").style.display = "block";
    document.getElementById("searchSongs-list").style.display = "none";
    document.querySelectorAll(".search-item").forEach((e) => e.remove());
    document.getElementById("random-songs").style.display = "grid";
    document.getElementById("random-songs-hr").style.display = "block";
    document.getElementById("random-songs-title").style.display = "block";
  }
}

socket.on("search-result", (songs) => {
  document.querySelectorAll(".search-item").forEach((e) => e.remove());

  songs.forEach((song) => {
    const newDiv = document.createElement("div");
    newDiv.id = song.id;
    newDiv.classList = "song-item search-item";

    const newDivIcon = document.createElement("div");
    newDivIcon.classList = "icon-start";
    newDivIcon.id = "icon-start";
    newDivIcon.innerHTML = '<ion-icon name="musical-notes"></ion-icon>';

    const newDivSong = document.createElement("div");
    newDivSong.setAttribute("onclick", "playSong('" + song.id + "')");
    newDivSong.innerHTML = song.author + ' - ' + song.shortTitle;

    const newDivIconEnd = document.createElement("div");
    newDivIconEnd.classList = "icon-end";
    newDivIconEnd.style.zIndex = "999";
    newDivIconEnd.innerHTML = '<ion-icon name="menu"></ion-icon>';
    newDivIconEnd.setAttribute("onclick", "menuSong('" + song.id + "')");

    newDiv.appendChild(newDivIcon);
    newDiv.appendChild(newDivSong);
    newDiv.appendChild(newDivIconEnd);
    document.getElementById("searchSongs-list").appendChild(newDiv);
  });
});

socket.on("upload-update", (song) => {
  const newDiv = document.createElement("div");
  newDiv.id = song.id;
  newDiv.classList = "song-item";

  const newDivIcon = document.createElement("div");
  newDivIcon.classList = "icon-start";
  newDivIcon.id = "icon-start";
  newDivIcon.innerHTML = '<ion-icon name="musical-notes"></ion-icon>';

  const newDivSong = document.createElement("div");
  newDivSong.setAttribute("onclick", "playSong('" + song.id + "')");
  newDivSong.innerHTML = song.author + " - " + song.shortTitle;

  const newDivIconEnd = document.createElement("div");
  newDivIconEnd.classList = "icon-end";
  newDivIconEnd.style.zIndex = "999";
  newDivIconEnd.innerHTML = '<ion-icon name="menu"></ion-icon>';
  newDivIconEnd.setAttribute("onclick", "menuSong('" + song.id + "')");

  newDiv.appendChild(newDivIcon);
  newDiv.appendChild(newDivSong);
  newDiv.appendChild(newDivIconEnd);
  document.getElementById("songs-list").appendChild(newDiv);
});

socket.on("newSongs", (songs) => {
  songs.forEach((song) => {
    if (!song.shortTitle || song.shortTitle == "-") {
      song.shortTitle = song.title;
    }
    const newDiv = document.createElement("div");
    newDiv.id = song.id;
    newDiv.classList = "song-item";

    const newDivIcon = document.createElement("div");
    newDivIcon.classList = "icon-start";
    newDivIcon.id = "icon-start";
    newDivIcon.innerHTML = '<ion-icon name="musical-notes"></ion-icon>';

    const newDivSong = document.createElement("div");
    newDivSong.setAttribute("onclick", "playSong('" + song.id + "')");
    newDivSong.innerHTML = song.author + " - " + song.shortTitle;

    const newDivIconEnd = document.createElement("div");
    newDivIconEnd.classList = "icon-end";
    newDivIconEnd.style.zIndex = "999";
    newDivIconEnd.innerHTML = '<ion-icon name="menu"></ion-icon>';
    newDivIconEnd.setAttribute("onclick", "menuSong('" + song.id + "')");

    newDiv.appendChild(newDivIcon);
    newDiv.appendChild(newDivSong);
    newDiv.appendChild(newDivIconEnd);
    document.getElementById("songs-list").appendChild(newDiv);
  });
  if (songs.length > 10) {
    var arr = [];
    while (arr.length < 5) {
      var r = Math.floor(Math.random() * songs.length);
      if (arr.indexOf(r) === -1) arr.push(r);
    }

    arr.forEach((songIndex) => {
      let blockSong = songs[songIndex];
      const newDiv = document.createElement("div");
      newDiv.classList = `song blockID#${blockSong.id}`;
      newDiv.setAttribute("onclick", "playSong('" + blockSong.id + "')");

      const newDivImage = document.createElement("img");
      newDivImage.src = blockSong.thumbnail;

      const newDivTitle = document.createElement("div");
      newDivTitle.classList = "title";
      newDivTitle.innerHTML = blockSong.shortTitle;

      const newDivAuthor = document.createElement("div");
      newDivAuthor.classList = "author";
      newDivAuthor.innerHTML = blockSong.author;

      newDiv.appendChild(newDivImage);
      newDiv.appendChild(newDivTitle);
      newDiv.appendChild(newDivAuthor);
      document.getElementById("random-songs").appendChild(newDiv);
    });
  } else {
    document.getElementById("random-songs-title").style.display = "none";
    document.getElementById("random-songs-hr").style.display = "none";
  }
});

function searchPopup() {
  document.getElementById("search-popup").style.display = "flex";
}
function closeSearchPopup() {
  document.getElementById("search-popup").style.display = "none";
  document.getElementById("search-input").value = "";
  // reset
  document.getElementById("songs-list").style.display = "block";
  document.getElementById("searchSongs-list").style.display = "none";
  document.querySelectorAll(".search-item").forEach((e) => e.remove());
  document.getElementById("random-songs").style.display = "grid";
  document.getElementById("random-songs-hr").style.display = "none";
  document.getElementById("random-songs-title").style.display = "block";
}
function MobileUploadButtons() {
  document.getElementById("mobile-upload-buttons").style.display = "flex";
}
function closeMobileUploadButtons() {
  document.getElementById("mobile-upload-buttons").style.display = "none";
}
function uploadPopup() {
  document.getElementById("mobile-upload-buttons").style.display = "none";
  document.getElementById("upload-popup").style.display = "flex";
}
function closeUploadPopup() {
  document.getElementById("upload-popup").style.display = "none";
  let songUrl = (document.getElementById("upload-input").value = "");
}
function uploadSong() {
  let songUrl = document.getElementById("upload-input");
  if (songUrl) {
    socket.emit("upload", { songLink: songUrl.value, username: username });
    createAlert("Please wait...");
    closeUploadPopup();
    songUrl.value = "";
  }
}
function youtubePopup() {
  document.getElementById("mobile-upload-buttons").style.display = "none";
  document.getElementById("youtube-popup").style.display = "flex";
}
function closeYoutubePopup() {
  let query = (document.getElementById("youtube-title").value = "");
  document.getElementById("youtube-popup").style.display = "none";
}
function youtubeSearch() {
  let query = document.getElementById("youtube-title").value;
  if (query) {
    document.querySelectorAll(".searched").forEach((e) => e.remove());
    socket.emit("youtube-search", query);
    createAlert("Please wait...");
    closeYoutubePopup();
  }
}

socket.on("youtube-results", (songs) => {
  document.getElementById("youtube-results").style.display = "flex";

  songs.forEach((song) => {
    const newDiv = document.createElement("div");
    newDiv.classList = "song-item searched";

    const newDivSong = document.createElement("div");
    newDivSong.setAttribute("onclick", "easyUpload('" + song.url + "')");
    newDivSong.innerHTML = song.title;

    newDiv.appendChild(newDivSong);
    document.getElementById("youtube-result-songs").appendChild(newDiv);
  });
});

function closeYoutubeResultsPopup() {
  document.getElementById("youtube-results").style.display = "none";
}

function easyUpload(url) {
  socket.emit("upload", { songLink: url, username: username });
  createAlert("Downloading song...");
}

function logout() {
  Cookies.remove("username");
  location.reload();
}

function menuSong(id){
  document.getElementById('menusong-popup').style.display = "flex";
  document.querySelector('#menusong-popup > div:nth-child(1) > div:nth-child(2)').id = id
  document.querySelector('#menusong-popup > div:nth-child(1) > div:nth-child(3)').id = id
}
function menuSongClose(){
  document.querySelector('#menusong-popup > div:nth-child(1) > div:nth-child(2)').id = ''
  document.querySelector('#menusong-popup > div:nth-child(1) > div:nth-child(3)').id = ''
  document.getElementById('menusong-popup').style.display = "none"
}

// MESSAGE HANDLER
function createAlert(message) {

  let alertsList = document.getElementById("alerts");
  let node = document.createElement("div");
  node.id = Math.floor(Math.random() * 100000000);
  node.innerHTML = message;
  node.className += "alert";
  alertsList.appendChild(node);
  setTimeout(function () {
    node.style.display = "none";
  }, 4000);
}

socket.on("message", (message) => {
  createAlert(message);
});

audio.addEventListener("timeupdate", function () {
  document.getElementById("actual").innerText = getMinute(this.currentTime | 0);
  document.getElementById("duration").innerText = getMinute(this.duration | 0);

  document.getElementById("bar").value =
    (this.currentTime / this.duration) * 100;
});

document.getElementById("bar").onchange = function () {
  audio.currentTime = (this.value * audio.duration) / 100;
};

document.getElementById("volume").onchange = function () {
  audio.volume = this.value / 100;
};

audio.addEventListener("ended", function () {
  skip();
});

function stopSong() {
  playStop();
}
