const firebase = require("./firebase.js");

let db = firebase.database();

const ref = db.ref('users');

//we will be putting all our database related function in here

//you can see explanations of the auth and setCookie function in https://firebase.google.com/docs/auth/admin/manage-cookies

//this is going to be "middleware" function. middleware is a function that we tell expressjs to run once someone requests a page, but before the page is sent
function auth(req, res, next) {
  //a cookie is a bit of data we put on the user's browser, in this case for verifying the user logged in with their google account
  if (!req.cookies) {
    return res.redirect('/');
  }
  let session_cookie = req.cookies.session;

  if (session_cookie === undefined) {
    res.redirect('/');
  }
  
  firebase.auth().verifySessionCookie(session_cookie, true).then((decodedClaims) => {
    req.decodedClaims = decodedClaims;
    const email = req.decodedClaims.email;

  console.log("Decoded Claims: ", decodedClaims)
    // Reject emails that does not end with @student.fuhsd.org 
  if (!email.endsWith("@student.fuhsd.org")) {
    console.log("Rejected Email: ", email); 
      return res.redirect('/sessionLogout');
    }
  console.log("On Login, Logging ", email);

  // Query for user by Email from DB 
  ref.orderByChild('email').equalTo(email).limitToLast(1).once("value")
  .then(function(snapshot) {
    console.log("Query Result Received");
    let user = snapshot.val();

    // If new user, Push new entry to DB
    if (user == undefined) {
      console.log("User not found, creating new user");
      user = {
        "email": email,
        "name": decodedClaims.name,
      };
      ref.push( user );
    }
    console.log("User: ", user );
  })
    
    next();
  }).catch(error => {
    console.log(error)
    //this means user is not logged in (or has cookie disabled)
    //so, we will redirect them to the main page to be logged in
    res.redirect('/');
  });
}

//we will worry about csrf attacks later

async function setCookie(req, res) {
  const idToken = req.body.idToken;
  //const csrfToken = req.body.csrfToken.toString();
  /*if (csrfToken !== req.cookies.csrfToken) {
    return res.status(401).send('UNAUTHORIZED REQUEST!');
  }*/
  //actual verification
  try {
    //this is an asyncronous function, so need to `await` it to end
    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    //{expiresIn} is shorthand for {expiresIn: expiresIn}
    //console.log(await firebase.auth())
    let sessionCookie = await firebase.auth().createSessionCookie(idToken, {expiresIn});
    res.cookie("session", sessionCookie);
    //let sessionCookie = await firebase.auth_module.auth().createSessionCookie(idToken, {expiresIn});
    res.redirect('/test');
  } catch (e) {
    console.log(e)
    //if it throws an error, that means the token is invalid
    res.status(401).send('UNAUTHORIZED REQUEST!');
  }
}

//we will also need functions for getting, modifying, and deleting posts, users, and bulletins

module.exports = {
  auth: auth,
  setCookie: setCookie
}
