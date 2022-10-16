const express = require("express");
const db = require("./db.js");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(cookieParser());

const port = 8000;

/*
    Hello World from 'shine' branch!.
    Testing 123.
    Testing 123.
*/
app.set('view engine', 'ejs');

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/config.json", (req, res) => {
    return res.sendFile("config.json", { root: __dirname+"/serve" });
});

app.get("/", db.auth, async (req, res) => {
    const user = await db.getUser(req);
    console.log("from .get('/'), user: ", user);

    let posts = await db.getPosts();

    //exclude unapproved posts
    posts = posts.filter(function(item) {
        return item.approved;
    });
    console.log("from .get('/'), posts: ", posts);

    res.render("index.ejs", { 
        user: user,
        posts: posts,
        admin_view: false
    });
})

app.post("/sessionLogin", async (req, res) => {
    console.log("Login Request received");
    await db.setSessionCookie(req, res);
});

app.get("/sessionLogout", (req, res) => {
    res.clearCookie('session');
    res.redirect('/login');
});

app.get("/createPost", db.auth, async (req, res) => {
    const user = await db.getUser(req);
    console.log("from .get('/'), user: ", user);

    res.render("createPost.ejs", { 
        user: user,
    });
});

app.post("/api/posts/publish", db.auth, async (req, res) => {
    console.log("Publish Post requested, body: ", req.body);
    const post = req.body;

    let made_user = await db.getUser(req);

    post.authorName = made_user.name;
    post.author = made_user.email;

    // If no post in body
    if (post === undefined)
        return;

    // Push post
    db.pushPost(post);

    res.redirect('/');
});

app.get("/api/posts/view", db.auth, async (req, res) => {
    const posts = await db.getPosts();
    return res.json(posts);
});

app.get("/admin", db.auth, async (req, res) => {
    const user = await db.getUser(req);

    if (!user.admin) {
        return res.redirect('/');
    }
    
    const posts = await db.getPosts();

    res.render("index.ejs", { 
        user: user,
        posts: posts,
        admin_view: true
    });
});

app.post("/api/posts/approve", db.auth, async (req, res) => {
    //vulernable to attacks probably. fix later. probably check origin of requests
    const user = await db.getUser(req);

    console.log(user.admin)

    if (!user.admin) {
        return res.redirect('/');
    }

    let post_content = req.body;

    await db.approvePost(post_content);

    return res.send("SUCCESS");
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});
