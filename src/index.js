/*

Extra tasks

On ajoute la possibilité un utilisateur de créer une room ou de sélectionner une room éxistante


*/


const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('../src/utils/users')
const { addRoom, removeRoom, getAllRooms }  = require('../src/utils/rooms')


const port = process.env.PORT
const app = express()
const server = http.createServer(app)

// création instance de socket.io
const io = socketio(server)

app.use(express.static(path.join(__dirname, '../public')))

io.on('connection', (socket) => {
    console.log("New WebSocket Connection");

    // while joining the chat
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options})

        if(error){
            return callback(error)
        }
        
        addRoom(user.room)
        
        socket.join(user.room)
        
        socket.emit('message', generateMessage('Admin', 'Welcome!')) 
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))

        // users' list in sidebar
        io.emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    // list of available rooms
    socket.on('roomsListQuery', () => {
        socket.emit('roomsList', getAllRooms())
    })

    // message event listener
    socket.on("sendMessage", (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        // in case of inappropriate language
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    // location event listener
    socket.on("sendLocation" , (coords, callback) => {
        const user = getUser(socket.id)
        
        const url = `https://google.com/maps?q=${coords.latitude},${coords.longitude}`

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, url))
        callback()
    })

    //disconnect
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))

            removeRoom(user.room)

            // users' list in sidebar
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up on  port ${process.env.PORT}!`)
})
