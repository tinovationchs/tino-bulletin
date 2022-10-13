const express = require("express");
const db = require('./db.js');
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  return res.sendFile("index.html", { root: __dirname+"/serve" });
});

app.post('/sessionLogin', async (req, res) => {
  await db.setCookie(req, res);
});

app.get('/sessionLogout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/');
});

app.get("/test", db.auth, (req, res) => {
  return res.sendFile("test.html", { root: __dirname+"/serve" });
});

app.get("/config.json", (req, res) => {
  return res.sendFile("config.json", { root: __dirname+"/serve" });
});

app.listen(8080, function() {
  console.log("Running");
});
