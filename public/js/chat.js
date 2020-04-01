const socket = io()

// elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = document.querySelector('input')
const $messageFormButton= document.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    /*
        scrollHeight: total container size.
        scrollTop: amount of scroll user has done.
        clientHeight: amount of container a user sees.
    */

    // new message element
    const $newMessage = $messages.lastElementChild

    // height of $newMessage margins
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)

    // height of $newMessage without margins
    let newMessageHeight = $newMessage.offsetHeight

    // total height of $newMessage
    newMessageHeight += newMessageMargin

    // visible height
    const visibleHeight = $messages.offsetHeight

    // total height of messages container 
    // scrollHeight => hauteur totale du scroll possible donc du container
    const containerHeight = $messages.scrollHeight

    // how far have we scrolled
    const scrollOfset = $messages.scrollTop + visibleHeight 

    // containerHeight - newMessageHeight <= scrollOfset => permet de vérifier qu'avant le nouveau message on est bien en bas de la page. Pour éviter qu'on applique l'auto scroll alors qu'on a scroller manuellement pour lire les messages précédents
    
    if(containerHeight - newMessageHeight <= scrollOfset){
        $messages.scrollTop = $messages.scrollHeight
    }
}

// messages
socket.on('message', (message) => {
    const html = Mustache.render(messageTemplate, {
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a'),
        username: message.username
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

// location message
socket.on('locationMessage', (message) => {
    const html = Mustache.render(locationTemplate, {
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a'),
        username: message.username
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

// users' list in sidebar
socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const message = e.target.elements.message.value

    // disable the form
    $messageFormButton.setAttribute('disabled', 'disabled')

    socket.emit("sendMessage", message, (error) => {
        // enable the form
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()
        
        if(error){
            return console.log(error)
        }
        console.log('Message delivered')
    })
})

// geoLocation
$sendLocationButton.addEventListener('click', (e) => {
    // Si browser trop vieux, geolocation n'est pas dispo
    if(!navigator.geolocation){
        return alert('Geolocation not supported by your browser.')
    }
    // disable the button
    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition( position => {
        coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }
        
        socket.emit('sendLocation', coords, () => {
            $sendLocationButton.removeAttribute('disabled')
            console.log('Location shared!')
        })
    })
})

// while joinin the chat
socket.emit('join', { username, room }, (error) => {
    if(error){
        alert(error)
        location.href = '/'
    }
})
