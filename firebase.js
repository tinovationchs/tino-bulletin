const firebase = require("firebase-admin");
//const auth = require("firebase-admin/auth");
//process.env is how we access environmental variables (a way to keep certain things secret). we do not want to hardcode it obviously

firebase.initializeApp({
  credential: firebase.credential.cert(JSON.parse(process.env.credentials)),
  databaseURL: process.env.databaseURL
});

//firebase.auth_module = auth;

//export the firebase obj so we can use it in other files
module.exports = firebase;
