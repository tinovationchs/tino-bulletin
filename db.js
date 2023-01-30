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
        //console.log("Cookie Set Requested");

        const idToken = req.body.idToken.toString();
        // Set session expiration to 5 days.
        const expiresIn = 60 * 60 * 24 * 5 * 1000;

        firebase.auth().verifyIdToken(idToken).then(async () => {

            const sessionCookie = await firebase.auth().createSessionCookie(idToken, { expiresIn });
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
                    "admin": false,
                    "categories": { "announcements": true },
                };
                usersRef.push(newUser);
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

function createCategory(req) {
    const newCategoryName = req.body.newCategoryName;
    const members = req.body.members.split(",").map(str => str.trim()).filter(str => str != "");
    const moderators = req.body.moderators.split(",").map(str => str.trim()).filter(str => str != "");

    for (email in members)
        if (getUserByEmail(email) == undefined)
            return `None such user '${email}'`;
    
    for (email in moderators)
        if (getUserByEmail(email) == undefined)
            return `None such user '${email}'`;
    
    const category = members.length > 0 ? {
        private: true,
        members: members,
        moderators: moderators,
    } : { 
        private: false, 
        moderators: moderators,
    };

    let pair = {};
    pair[newCategoryName] = category;

    categoriesRef.update(pair);
}

async function getCategories() {
    const snapshot = await categoriesRef.once('value')
    let categories = [];
    snapshot.forEach((data) => {
        categories[data.key] = data.val();
    })
    return categories;
}

// Sanity check of post. Current checks:
// -> Bad attachments (injection / inapporpiate)
// -> Unauthorized post on category.
async function validatePost(post) {
    // Filter out bad attachment links. (Security)
    if (post.attachments !== undefined)
        for (const attachment of post.attachments)
            if (!attachment.startsWith("https://"))
                return "Invalid link";

    // Check Category privilege
    let auth = true;
    await categoriesRef.once("value", snapshot => {
        snapshot.forEach((data) => {
            if (data.key != post.category) return;

            let category = data.val();
            // Retro-activity for old categories
            if (category.private == undefined) return;
            auth = category.private ? category.members.includes(post.author) : true;
        });
    });
    if (!auth)
        return `Not a member of category '${post.category}'`;

    return undefined;
}

async function pushPost(post) {
    {
        console.log(post);
        let err = await validatePost(post);
        if (err != undefined) {
            console.log("Invalid post. Error: ", err);
            return err;
        }
    }

    let newPost = {
        title: post.title,
        text: post.text,
        author: post.author,
        authorName: post.authorName,
        postTime: new Date().valueOf(),
        category: post.category,
        attachments: post.attachments,
        approved: false
    };

    //todo: add "approved": false flag by default

    if (!newPost.title || !newPost.text) {
        return;
    }
    //console.log(newPost)
    //console.log("Pushed post: ", post);

    postsRef.push(newPost);
}

async function approvePost(post_content) {
    console.log("approving post", post_content)
    postsRef.once("value", function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            if (JSON.stringify(childSnapshot.val()) === JSON.stringify(post_content)) {
                let new_post_content = childSnapshot.val();
                new_post_content.approved = true;
                childSnapshot.ref.update(new_post_content);
            }
        });
    });
}

async function getUserFromClaims(claims) {
    if (claims == undefined) {
        console.log("Got undefined claims at 'getUserFromClaims'");
        return undefined;
    }
    const email = claims.email;

    // Query user by email
    return getUserByEmail(email);
}

async function getUserByEmail(email) {
    // Query user by email
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
    try {
        return getUserFromClaims(await getSessionClaims(req));
    } catch (error) {
        return undefined;
    }
}

// Fetches the entire database's posts, Sudo function.
function getUnapprovedPosts() {
    return (
        postsRef.orderByChild('postTime')
            .once("value")
            .then((snapshot) => {
                let posts = [];
                snapshot.forEach(data => {
                    const post = data.val();
                    if (!post.approved)
                        posts.push(post);
                });
                return posts.reverse();
            })
            .catch((error) => {
                console.log("Error on 'getAllPosts()' :", error);
                return undefined;
            })
    )
}

// Fetches a list of posts.
// NOTE: Draft function, later revisions may use an actual algorithm to tailor the posts
//  to the user.
function getPosts(category, amount, offset) {
    if (!amount) {
        amount = 2;
    }

    if (amount > 25) {
        amount = 25;
    }

    if (!offset) {
        offset = 0;
    }

    //console.log("requested query for category: %s, request quantity: %d", category, offset+amount);
    if (category) {
        return (
            postsRef.orderByChild('category').equalTo(category).limitToLast(offset + amount).once("value")
                .then((snapshot) => {
                    let posts = [];
                    snapshot.forEach((data) => {
                        posts.push(data.val());
                    });
                    posts.sort(function(a, b) {
                        return b.postTime - a.postTime
                    });
                    return posts.slice(offset);
                }).catch((error) => {
                    return undefined;
                })
        );
    }
    return (
        postsRef.orderByChild('postTime').limitToLast(offset + amount).once("value")
            .then((snapshot) => {
                let posts = [];
                snapshot.forEach((data) => {
                    posts.push(data.val());
                })
                return posts.reverse().slice(offset);
            }).catch((error) => {
                return undefined;
            })
    )
}

async function getPostsByCategory (category) {
    return getPosts(category, 20, 0);
}

// Gets posts of categories configured by the user.
// Draft function.
async function getPostsForUser(user) {
    let categories = Object.keys(user.categories).map(category => category);

    const posts = [];
    for (const category of categories) {
        let amount = 6;
        const categoryPosts = await getPosts(category, amount);
        posts.push(...categoryPosts);
    };
    posts.sort((a, b) => b.postTime - a.postTime);
    return posts;
}
// Gets posts where the author is the specified user
function getPostsByUser(user) {
    return (
        postsRef.orderByChild('author').equalTo(user.email).once("value")
            .then((snapshot) => {
                let posts = [];
                snapshot.forEach((data) => {
                    posts.push(data.val());
                })
                return posts.reverse();
            }).catch((error) => {
                return undefined;
            })
    )
}

async function searchPosts(query, bulletin) {
    query = query.toLowerCase();
    let posts = [];
    if (bulletin) {
        let snapshot = await (postsRef.orderByChild('category').equalTo(bulletin)).once("value");
        snapshot.forEach((data) => {
            posts.push(data.val());
        });
        posts = posts.filter(function(post) {
            return (post.text.toLowerCase().includes(query) || post.title.toLowerCase().includes(query)) && post.approved;
        });
    } else {
        let snapshot = await postsRef.once("value");
        snapshot.forEach((data) => {
            posts.push(data.val());
        });
        posts = posts.filter(function(post) {
            return (post.text.toLowerCase().includes(query) || post.title.toLowerCase().includes(query)) && post.approved;
        });
    }
    return posts.reverse();
}

async function getCategory(category) {
    return (
    categoriesRef.once("value")
        .then((snapshot) => {
            let out;
            snapshot.forEach( data => {
                if (data.key == category)
                    out = data.val();
            });
            return out;
        }).catch((error) => {
            return undefined;
        })
    );
}

// Adds a category to the user's category list. 
async function addCategory(req, newCategory) {
    const user = await getUser(req);

    // Get snapshot referencing user, edit values, then update.
    await usersRef.orderByChild('email').equalTo(user.email).limitToLast(1).once("value", function(snapshot) {
        const val = snapshot.val();
        const userID = Object.keys(val)[0];
        if (val[userID].categories == undefined) val[userID].categories = {};
        val[userID].categories[newCategory] = true;
        snapshot.ref.update(val);
    });
}

module.exports = {
    // Session & Authentications
    auth: auth,
    setSessionCookie: setSessionCookie,

    // Queries
    getUnapprovedPosts: getUnapprovedPosts,
    getUser: getUser,
    getUserByEmail: getUserByEmail,

    getPostsByUser: getPostsByUser,
    getPostsByCategory: getPostsByCategory,
    getCategory: getCategory,
    addCategory: addCategory,
    getPostsForUser: getPostsForUser,

    searchPosts: searchPosts,

    // DB setting & modifying 
    pushPost: pushPost,
    createCategory: createCategory,
    getCategories: getCategories,
    approvePost: approvePost,
}