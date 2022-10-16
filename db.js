const { CategoryChannel } = require("discord.js");
const firebase = require("./firebase.js");

const db = firebase.database();
const usersRef = db.ref('users');
const postsRef = db.ref('posts');
const categoriesRef = db.ref('categories');

// Middleware. Checks if a session cookie corresponding to a user exists.
// Redirects to '/login' if none is found.
async function auth(req, res, next) {
    const user = await getUser(req); 

    if (user === undefined) 
        return res.redirect('/login');
    
    console.log("Authorized.");
    next();
}

// Called on login. Creates session cookie for client.
// If new user (not in db), push to db.
async function setSessionCookie(req, res) {
    try {
        console.log("Cookie Set Requested");

        const idToken = req.body.idToken.toString();
        // Set session expiration to 5 days.
        const expiresIn = 60 * 60 * 24 * 5 * 1000;

        firebase.auth().verifyIdToken(idToken).then(async () => {

            const sessionCookie = await firebase.auth().createSessionCookie(idToken, {expiresIn});
            res.cookie("session", sessionCookie);

            const claims = await firebase.auth().verifySessionCookie(sessionCookie, true);
            const email = claims.email;

            /*
            // Check Email Suffix, if not fuhsd, logout
            if (!email.endsWith("@student.fuhsd.org")) {
                console.log("Rejected Email: ", email);
                return res.redirect('/sessionLogout');
            }
            */
            // If none such user exists
            const user = await getUserFromClaims(claims);
            if (user === undefined) {
                console.log("User not found, creating new user");
                const newUser = {
                    "email": email,
                    "name": claims.name,
                };
                usersRef.push( newUser );
            }
            res.redirect('/');
        })
    } catch (e) {
        console.log("ERROR ON COOKIE SET, ", e)
        //if it throws an error, that means the token is invalid
        res.status(403).send('UNAUTHORIZED REQUEST!');
    }
}

async function getSessionClaims(req) {
    // If no cookies exist 
    if (!req.cookies) 
        return undefined;
    
    let session_cookie = req.cookies.session;
    // If no session cookie exists
    if (session_cookie === undefined) 
        undefined;
    
    // Fetch Session claims 
    try { 
        return firebase.auth().verifySessionCookie(session_cookie, true);
    } catch (error) {
        console.log(error);
        return undefined;
    }
}

function createCategory (req) {
    const newCat = req.body.newCategoryName;
    let pair = {};
    pair[newCat] = true;

    categoriesRef.update(pair);
}

async function getCategories () {
    const snapshot = await categoriesRef.once('value')
    let categories = [];
    snapshot.forEach((data) => {
        categories.push( data.key );        
    })
    return categories;
}

function pushPost (post) {
    let newPost = {
        title: post.title, 
        text: post.text, 
        author: post.author, 
        authorName: post.authorName, 
        postTime: new Date().valueOf(),
        category: post.category,
    };

    //todo: add "approved": false flag by default

    if (!newPost.title || !newPost.text) {
        return;
    }
    console.log(newPost)
    console.log("Pushed post: ", post);

    postsRef.push(newPost);
}

async function getUserFromClaims(claims) {
    if (claims == undefined) {
        console.log("Got undefined claims at 'getUserFromClaims'");
        return undefined;
    }
    const email = claims.email;

    // Query user, if none such user exists, push entry to db
    return ( 
        usersRef.orderByChild('email').equalTo(email).limitToLast(1).once("value")
        .then((snapshot) => {
            const val = snapshot.val();
            const userID = Object.keys(val)[0];

            return val[userID];
        }).catch((error) => {
            return undefined;
        })
    );
}

async function getUser(req) {
    if (req === undefined) return undefined;
    
    return getUserFromClaims(await getSessionClaims(req));
}

// Fetches a list of posts.
// NOTE: Draft function, later revisions may use an actual algorithm to tailor the posts
//  to the user.
function getPosts() {
    return(
        postsRef.orderByChild('postTime').limitToLast(2).once("value")
        .then((snapshot) => {
            let posts = [];
            snapshot.forEach((data) => {
                posts.push( data.val());        
            })
            return posts.reverse();
        }).catch((error) => {
            return undefined;
        })
    )
}

module.exports = {
    auth: auth,
    setSessionCookie: setSessionCookie,
    pushPost: pushPost,
    getUser: getUser,
    getPosts: getPosts,
    createCategory: createCategory,
    getCategories: getCategories,
}