const express = require('express');
const myapp = express();
const server = require('http').Server(myapp);
const io = require('socket.io')(server);
const { v4: uuidv4 } = require('uuid')
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server listening: ", PORT);
});

let meetingId;

myapp.use(express.static('public'));

// when someone connects
io.on('connection', socket => {
    console.log("New User Connected");

    // to generate the meeting ID
    socket.on('generate', () => {
        meetingId = uuidv4();
        io.emit('generate', meetingId);
    });

    // to join the meeting
    socket.on('join', (meeting)=> { 
        meetingId = meeting;
        socket.join(meetingId);
        socket.to(meetingId).emit('join', meeting); 
    });

    //creating an offer
    socket.on('offer', offer => {
        socket.to(meetingId).emit('offer', offer);
    });

    // replying to offer by creating an answer
    socket.on('answer', answer => {
        socket.to(meetingId).emit('answer', answer);
    });

    // when the ICE candidates are sent 
    socket.on('candidate', candidate => {
        socket.to(meetingId).emit('candidate', candidate);
    });

    // when a user leaves a meeting
    socket.on('leave', (meeting) => {
        socket.leave(meeting);
    })
});