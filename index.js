const express = require("express");
const db = require("./db.js");
const cookieParser = require("cookie-parser");

const app = express();
const port = 4242;

app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
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

    let posts = await db.getPostsForUser(user);

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
});

app.get("/admin", db.auth, async (req, res) => {
    
    //Check admin perms
    const user = await db.getUser(req);
    if (!user.admin) return res.status(403).send('UNAUTHORIZED REQUEST!');

    res.render("admin.ejs", {user: user});
});

app.get("/mod", db.auth, async (req, res) => {
    let posts = await db.getPosts();
    //Check admin perms
    const user = await db.getUser(req);
    if (!user.admin) return res.status(403).send('UNAUTHORIZED REQUEST!');

    posts = posts.filter(function(item) {
        return !item.approved;
    });

    res.render("index.ejs", { 
        user: user,
        posts: posts,
        admin_view: true
    });
});

app.get("/profile/:userEmail", async (req, res) => {
    const user = await db.getUser(req);
    
    // Get profile being viewed
    console.log('queried user profile, userEmail: ', req.params.userEmail);
    const profile = await db.getUserByEmail(req.params.userEmail);
    if (profile === undefined) return res.status(404).send('None such user.');
    
    // Get posts by user
    const posts = await db.getPostsByUser(user);

    // Get categories available to add. 
    const categories = await db.getCategories();
    const newCategories = 
        profile.categories != undefined ? categories.filter( category => !(category in profile.categories) ) : categories; 
    
    // Check if it is self (profile edit will only be allowed if so)
    res.render("profile.ejs", {
        user: user,
        profile: profile,
        posts: posts,
        categories: newCategories, 
    });
});

app.post("/api/profile/addCategory", db.auth, async (req, res) => {
    const newCategory = req.body.newCategory;
    if (newCategory === undefined) return;

    // Check if category exists
    if ((await db.getCategories()).indexOf(newCategory) == -1) {
        // Alert user
        res.send({error: 'none such category'});
        return;
    }

    console.log('user requested to add new category', newCategory);
    await db.addCategory(req, newCategory);
    
    res.status(200);
    res.json({});
});

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
    const categories = await db.getCategories();

    res.render("createPost.ejs", { 
        user: user,
        categories: categories,
    });
});

app.post('/api/createCategory', db.auth, async (req, res) => {
    console.log("Publish Post requested, body: ", req.body);
    const post = req.body;

    //Check admin perms
    const user = await db.getUser(req);
    if (!user.admin) return res.status(403).send('UNAUTHORIZED REQUEST!');

    //Instruct db to create new category 
    db.createCategory(req);

    res.redirect('/');
});

app.post("/api/posts/publish", db.auth, async (req, res) => {
    console.log("Publish Post requested, body: ", req.body);
    const post = req.body;

    let author = await db.getUser(req);

    post.authorName = author.name;
    post.author = author.email;

    // If no post in body
    if (post === undefined)
        return;

    // Push post
    db.pushPost(post);

    res.redirect('/');
});

app.get("/api/posts/view", db.auth, async (req, res) => {
    let category = req.query.category
    let amount = Number(req.query.amount);
    let offset = Number(req.query.offset);
    const posts = await db.getPosts(category, amount, offset);
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
