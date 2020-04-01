/*

automatic Scrolling



Quand un new message arrive on veut qu'il s'affiche en bas de la page.
Actuellement les nouveaux messages apparaissent à la suite des autres, ce qui est bien, mais on ne peut pas les voir si la longueur totale des msg est supérieure à celle de la fenêtre.
On doit scroller manuellement!

On va automatiser cela en prenant soin que l'automatic scroll ne s'exécute uniquement si on est bien au dernier msg affiché.
Admettons qu'on souhaite relire des messages précédents et que manuellement on scroll vers le haut, ce serait énervant qu'à chaque nouveau message on soit ramené en bas de l'écran!

Dons le scrolle automatique ne se fera pas si on déjà a scroller manuellement et qu'on n'est plus au dernier message reçu!


On implémente la logique dans chat.js 

On va implémenter la logique du code dans les events 'message' et 'locationMessage'
On va alors créer une fonction que l'on va implémenter dans ces 2 events

cf. chat.js fonction autoscroll()






*/

const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('../src/utils/users')


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
