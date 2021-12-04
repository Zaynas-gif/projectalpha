// Fast tip insted of saving and closing server everytime u can isntall pacage nodemon wich can 
//help you save automaticly
//to install it run code npm isntall nodemon
// go to package.json in script line
// add new custom script
// like "watch": "nodemon <server>"
//tip 2. how to share code from one file to another?
//we adding const router = require('./router') to app.js 
//in router.js console.log("I am executed immediately.")
//module.exports = "I am the export for the router file"
//when server starts we able to see message in console.
//so what we wrote in router.js file
//module.exports = ... gonna store it in variable and
// we gonna be able to use it that wheen ever we want.
//npm install connect-mongo will help u store cookies in to database(mongodb)
//flash will help us to add or remove data from session
//Lets use express
const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const markdown = require('marked')
const csrf = require('csurf')
const app = express()
const sanitizeHTML = require('sanitize-html')

let sessionOptions = session({
    secret: "Javascript is so cool",
    store: new MongoStore({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true}
})



app.use(sessionOptions)
app.use(flash())
//When we say app.use we telling express to run the function
//for every request and we added that before router request so it means 
//this will run before router and since we have next() it will move on to run
//acctual relevent functions for particular route
//and now we have users accsess property from every single on ejs template.
app.use(function (req, res, next){


    //make our markdown function available form within ejs templates
    res.locals.filterUserHTML = function (content) {
        return sanitizeHTML(markdown(content), {allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'bold', 'i', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'], allowedAttributes: {}})
    }

    //make all error abd syccess flash messages avilable form all templates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    //make cuurent user id avilalable on the req object
    if (req.session.user) {req.visitorId = req.session.user._id} else {req.visitorId = 0}



    // make user sesssion data avilabale from within view templates
 res.locals.user = req.session.user
 next()
})
//Calling express
//require function in node.js do 2 thinks one of them
//executes file but it also
//returns what ever thet file exports
const router = require('./router')
const { sanitize } = require('dompurify')
//Its just tells express to add users typed in data in our request object
//so that we can accses later
app.use(express.urlencoded({extended: false}))
app.use(express.json())
//Tell express that css file are accessible.
app.use(express.static('public'))
//Use express to find home page and use install ejs before doing this
app.set('views' , 'views')
app.set('view engine', 'ejs')

//Lets tell our app what to do when it gets get request to the base url.

app.use(csrf())

app.use(function (req, res, next) {
res.locals.csrfToken = req.csrfToken()
next()
})
app.use('/', router)


app.use(function (err, req, res, next) {
    if (err) {
        if (err.code == "EBADSRFTOKEN") {
            req.flash('errors', "Cross site request forgery detected")
            req.session.save(() => res.redirect('/'))
        }else {
           res.render("404")
        }
    }

})

const server = require('http').createServer(app)
const io = require('socket.io')(server)
io.use(function (socket, next){
    sessionOptions(socket.request, socket.request.res, next )
})

io.on('connection', function (socket) {
    if (socket.request.session.user) {
        let user = socket.request.session.user
        socket.emit('welcome', {username: user.username, avatar: user.avatar})



        socket.on('chatMessageFromBrowser', function (data) {
            socket.broadcast.emit('chatMessageFromServer', {message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: {}}), username: user.username, avatar: user.avatar})
        })
    }
})


module.exports = server
