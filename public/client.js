const mainContainer = document.getElementById("mainContainer");
const generate = document.getElementById("generate"); // button to generate a unique meeting ID
const generatedContainer = document.getElementById("generated"); // container
const displayid = document.getElementById("idDisplay"); //to display generated meeeting ID
const join = document.getElementById("join"); // button to join meeting
const copyBtn = document.getElementById("copy"); // button to copy ID to clipboard

const meetingContainer = document.getElementById("meetingContainer");
const user = document.getElementById("local");
const guest = document.getElementById("remote");


const mic = document.getElementById("mic");
const webcam = document.getElementById("webcam");
const leave = document.getElementById("leave");

//chat
const messagebox = document.getElementById("messagebox");
const allmessages = document.getElementById("allmessages");
const message = document.getElementById("message");
const sendmsg = document.getElementById("sendmsg");

const socket = io();

//IceServers
const configuration = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

const pc = new RTCPeerConnection(configuration);

let meetingId; // current meeting ID
let localStream; 
let inboundStream = null; // for remote stream

//when user clicks on generate meeting ID
generate.onclick = function () {
  socket.emit("generate");
};

// copying the generated meeting ID
copyBtn.onclick = function () {
  let text = document.getElementById("idDisplay");
  text.select();
  document.execCommand("copy");
}

// when user clicks the join meeting button
join.onclick = function () {
  const enteredId = document.getElementById("enteredId"); // get the entered ID
  const username = document.getElementById("username");
  meetingId = enteredId.value;
  if (meetingId == "") {
    alert("Meeting ID cannot be empty!"); // alert incase meeting ID is empty
  }
  else if (username.value == "") {
    alert("Name cannot be empty!"); // alert incase name is empty
  }
  else
    joinMeeting(meetingId);
};

//toggle mic
mic.onclick = function () {
  localStream.getAudioTracks()[0].enabled = (!localStream.getAudioTracks()[0].enabled);
  if (localStream.getAudioTracks()[0])
    mic.innerHTML = `<i class="material-icons">mic_off </i>`;
  else
    mic.innerHTML = `<i class="material-icons">mic </i>`;
};

//toggle webcam
webcam.onclick = function () {
  localStream.getVideoTracks()[0].enabled = (!localStream.getVideoTracks()[0].enabled);
  if (localStream.getVideoTracks()[0])
    webcam.innerHTML = `<i class="material-icons">videocam_off </i>`;
  else
    webcam.innerHTML = `<i class="material-icons">videocam </i>`;
};

leave.onclick = function () {
  localStream.getVideoTracks()[0].enabled = false;
  setTimeout(() => {
  }, 100);
  socket.emit('leave', meetingId);
  textchannel.close();
  pc.close();
  location.reload();
};

// function to join meeting
function joinMeeting(id) { 
  // get user media
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then(async stream => {
      user.srcObject = stream;
      try {
        await user.play();
        socket.emit("join", id);
        localStream = stream;
      } catch (err) {
        console.error(err);
      }
    });
  mainContainer.classList.add("hidden");
  meetingContainer.classList.remove("hidden");
};

// for receiving the generated meeting ID from server
socket.on('generate', meeting => {
  displayid.value = `${meeting}`; //display generated meeting ID
  generatedContainer.classList.remove("hidden");
});

// for joining the meeting and creating the offer
socket.on('join', (meeting) => { 
  meetingId = meeting;
  if (meetingId == null) {
    alert("Entered Meeting ID does not exist!");
  }
  else {
    pc.onicecandidate = generateIceCandidate; //generate ICE candidates
    pc.ontrack = addRemoteMediaStream; // add Media stream
    pc.addTrack(localStream.getTracks()[0], localStream);
    pc.addTrack(localStream.getTracks()[1], localStream);
    // create offer
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit("offer", offer);
    });
  }
});

// when offer is received
socket.on("offer", offer => {
  pc.ontrack = addRemoteMediaStream; // add media stram
  pc.onicecandidate = generateIceCandidate; // generate ICE candidates
  pc.setRemoteDescription(new RTCSessionDescription(offer)); // set Remote Description
  pc.addTrack(localStream.getTracks()[0], localStream);
  pc.addTrack(localStream.getTracks()[1], localStream);
  // create answer
  pc.createAnswer().then(answer => {
    pc.setLocalDescription(answer);
    socket.emit("answer", answer);
  });
});

// when answer is received
socket.on("answer", answer => {
  pc.setRemoteDescription(new RTCSessionDescription(answer));
});

// when candidate is received
socket.on("candidate", event => {
  var iceCandidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate
  });
  pc.addIceCandidate(iceCandidate);
});

// function to add media stream
function addRemoteMediaStream(event) {
  if (event.streams && event.streams[0]) {
    guest.srcObject = event.streams[0];
  } else {
    if (!inboundStream) {
      inboundStream = new MediaStream();
      guest.srcObject = inboundStream;
    }
    inboundStream.addTrack(event.track);
  }
}

// function to generate ICE candidate
function generateIceCandidate(event) {
  if (event.candidate) {
    var candidate = {
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    };
    socket.emit("candidate", candidate);
  }
}

pc.onconnectionstatechange = function(event) {
  if (pc.connectionState == "closed") {
    alert("User Left");
    guest.srcObject = null;
  }
}

//chatting

let  textchannel = pc.createDataChannel("text-channel");

textchannel.addEventListener("open", () => {
  console.log(textchannel.readyState);
});

sendmsg.onclick = function() {
  let m =  {
    "msg": message.value,
    "name": username.value,
  };
  allmessages.value += "You : " + m.msg + "\n";
  textchannel.send(JSON.stringify(m));
  message.value = " ";
}

pc.ondatachannel = function(event) {
  textchannel = event.channel;
}

textchannel.onerror = function(err) {
  console.log(err);
}

textchannel.onmessage = function(event) {
  console.log(event);
  m = JSON.parse(event.data);
  allmessages.value += m.name + " : " + m.msg + "\n";
}