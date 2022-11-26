require('dotenv').config();
const express = require("express");
const https = require("https");
const fetch = require('node-fetch');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { Session, Store } = require('express-session');
const sgMail = require('@sendgrid/mail');
const { url } = require('node:inspector');
const { response } = require('express');

var verficicationcode;
var nm,em,ps,st;

const app = express();

//General News API calling
var generalNews = [];
const generalUrl = "https://newsapi.org/v2/top-headlines?country=in&apiKey="+process.env.NEWS_APIKEY;
fetch(generalUrl)
    .then(res => res.json())
    .then(json => {
      generalNews = json.articles;
})

//Sports News API calling
var sportsNews = [];
const sportsUrl = "https://newsapi.org/v2/top-headlines?country=in&category=sports&apiKey="+process.env.NEWS_APIKEY;
fetch(sportsUrl)
    .then(res => res.json())
    .then(json => {
      sportsNews = json.articles;
})


//Entertainment News API calling
var entertainmentNews = [];
const entertainmentUrl = "https://newsapi.org/v2/top-headlines?country=in&category=entertainment&apiKey="+process.env.NEWS_APIKEY;
fetch(entertainmentUrl)
    .then(res => res.json())
    .then(json => {
      entertainmentNews = json.articles;
})

//International News API calling
var internationalNews = [];
const internationalUrl = "https://newsapi.org/v2/top-headlines?country=us&apiKey="+process.env.NEWS_APIKEY;
fetch(internationalUrl)
    .then(res => res.json())
    .then(json => {
      internationalNews = json.articles;
})

//EJS and Body Parser
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//using passport
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

/*app.use(function (req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next()
});*/

//Mongodb connect
mongoose.connect(process.env.MONGO_URL);
//mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  state: String,
  googleId: String
});

//using passport
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("userdetails", userSchema);

//using passport
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://newsapi-exp.herokuapp.com/auth/google/news",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//mail
sgMail.setApiKey(process.env.SENDGRID_APIKEY);

/*All get request*/
app.get("/",function(req,res){
  if(req.isAuthenticated()){
    res.render("news", {
      newsGeneral: generalNews
    });
  }else{
    res.render("register",{
      loginError: false,
      existError: false,
      registered: false
    });
  }
});

app.get('/auth/google',passport.authenticate('google', { 
  scope: ["profile"],
}));

app.get('/auth/google/news', 
  passport.authenticate('google', { failureRedirect: "/" }),
  function(req, res) {
    // Successful authentication, redirect news.
    res.redirect("/news");
  });

app.get("/news",function(req,res){
  if(req.isAuthenticated()){
    res.render("news", {
      newsGeneral: generalNews
    });
  }else{
    res.redirect("/");
  }
});

app.get("/home",function(req,res){
  if(req.isAuthenticated()){
    res.render("news", {
      newsGeneral: generalNews
    });
  }else{
    res.redirect("/");
  }
});

app.get("/sports",function(req,res){
  if(req.isAuthenticated()){
    res.render("sports", {
      newsSports: sportsNews
    });
  }else{
    res.redirect("/");
  }
});

app.get("/entertainment",function(req,res){
  if(req.isAuthenticated()){
    res.render("entertainment", {
      newsEntertainment: entertainmentNews
    });
  }else{
    res.redirect("/");
  }
});

app.get("/international",function(req,res){
  if(req.isAuthenticated()){
    res.render("international", {
      newsInternational: internationalNews
    });
  }else{
    res.redirect("/");
  }
});

app.get("/weather",function(req,res){
  if(req.isAuthenticated()){
    res.render("weather", {
      weatherLocation: null,
      weatherTemperature: null,
      weatherUrl: null,
      weatherCond: null,
      weatherHumidity: null,
      weatherSpeed: null
    });
  }else{
    res.redirect("/");
  }
});

app.get("/city",function(req,res){
  if(req.isAuthenticated()){
    res.render("weather", {
      weatherLocation: null,
      weatherTemperature: null,
      weatherUrl: null,
      weatherCond: null,
      weatherHumidity: null,
      weatherSpeed: null
    });
  }else{
    res.redirect("/");
  }
});

app.get("/loginerror",function(req,res){
  res.render("register",{
    loginError: true,
    existError: false,
    registered: false
  });
});

/*All post request*/
app.post("/signup",function(req,res){

  const otp = Math.floor(Math.random() * 1000000) + 1;
  verficicationcode = otp;
  nm = req.body.signupName;
  em = req.body.username;
  ps = req.body.password;
  st = req.body.signupState;
  
  User.findOne({username: req.body.username}, function(err, found){
    if(err){
      console.log(err);
    }
    else{
      if(found){
        res.render("register",{
          loginError: false,
          existError: true,
          registered: false
        });
      }
      else{
        const mailDetails = {
          from: 'chunmun.jain143@gmail.com',
          to: req.body.username,
          subject: 'News Express Verification',
          html: '<p>Hello '+req.body.signupName+' Welcome to News Express.<h3>Verification Code - '+otp+'</h3></p>'
        };
        sgMail.send(mailDetails).then((response) => console.log("Email Sent using SendGrid"))
        .catch((error) => console.log(error))
        res.render("verify",{
          mail: req.body.username,
          otpwrong: false
        });
      }  
    }
   })
});

app.post("/emailverify",function(req,res){

  const code = parseInt(req.body.otp);
  if(verficicationcode===code){

    User.register({username: em, name: nm, state: st}, ps, function(err, user) {
      if(err){
        console.log(err);
      }
      else{
        passport.authenticate("local")(req, res, function(){
          res.render("register",{
            loginError: false,
            existError: false,
            registered: true
          });
        });
      }
    });
    res.render("register",{
      loginError: false,
      existError: false,
      registered: true
    });
  }
  else{
    res.render("verify",{
      mail: req.body.username,
      otpwrong: true
    });
  }
  
});

app.post("/signin",function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function(err){
      if(err){
        console.log(err);
      }else {
        passport.authenticate("local",{ failureRedirect: "/loginerror", failureMessage: true })(req, res, function(){
          res.redirect("/news");
        });
      }
  });

});

app.post("/signout",function(req,res){
    req.logout();
    res.redirect("/");
});

app.post("/home",function(req,res){
  res.render("news", {
    newsGeneral: generalNews
  });
});

app.post("/sports",function(req,res){
  res.render("sports", {
    newsSports: sportsNews
  });
});

app.post("/entertainment",function(req,res){
  res.render("entertainment", {
    newsEntertainment: entertainmentNews
  });
});

app.post("/international",function(req,res){
  res.render("international", {
    newsInternational: internationalNews
  });
});

app.post("/weather",function(req,res){
  res.render("weather", {
    weatherLocation: null,
    weatherTemperature: null,
    weatherUrl: null,
    weatherCond: null,
    weatherHumidity: null,
    weatherSpeed: null
  });
});

app.post("/city",function(req,res){
  const query = req.body.cityName;
  //console.log(query);
  let location;
  let currtemp;
  let cond;
  let hum;
  let speed;

  const weatherUrl = "https://api.weatherapi.com/v1/current.json?key="+process.env.WEATHER_APIKEY+"&q="+query;

  const weatherreq = https.get(weatherUrl, function(response){
  
    response.on("data", function(data){
      
      const weatherData = JSON.parse(data);
      const temp = Math.round(weatherData.current.temp_c);
      const city = weatherData.location.name;
      const state = weatherData.location.region;
      const conditon = weatherData.current.condition.text;
      const imageURL = weatherData.current.condition.icon;
      const humidity = weatherData.current.humidity;
      const windspeed = weatherData.current.wind_kph;

      location = "Weather in "+city+", "+state;
      currtemp = temp+"\xB0"+" C";
      cond = "("+conditon+")";
      hum = "Humidity: "+humidity+" %";
      speed = "Wind speed: "+windspeed+" km/h"

      res.render("weather", {
        weatherLocation: location,
        weatherTemperature: currtemp,
        weatherUrl: imageURL,
        weatherCond: cond,
        weatherHumidity: hum,
        weatherSpeed: speed
      });
    });
  });
  weatherreq.end();
   
});

/* listen to port*/
app.listen(process.env.PORT || 3000,function(){
   console.log("server is running on port 3000");
});