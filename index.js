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

    res.render("index.ejs", { 
        user: user,
        admin_view: false,
        inf_scroll: true
    });
});

app.get("/bulletins/:category", db.auth, async (req, res) => {
    const user = await db.getUser(req);
    const category_conf = await db.getCategory(req.params.category);
    const perms = user.admin || ((typeof category_conf.moderators === 'undefined') ? false : category_conf.moderators.includes(user.email));
    const pin = category_conf.pin ? await db.getPostByKey(category_conf.pin) : undefined;

    res.render("bulletin.ejs", { 
        user: user,
        moderator: perms,
        mod_view: false,
        bulletin: req.params.category,
        pin: pin,
    });
});
app.get("/bulletins/mod/:category", db.auth, async (req, res) => {
    const user = await db.getUser(req);
    const category_conf = await db.getCategory(req.params.category);
    const perms = user.admin || category_conf.moderators.includes(user.email);
    const pin = category_conf.pin ? await db.getPostByKey(category_conf.pin) : undefined;

    if (!perms) 
        res.status(403).send(`unauthorized for category '${req.params.category}'`);
    console.log(req.params.category);
    res.render("bulletin.ejs", { 
        user: user,
        moderator: true,
        mod_view: true,
        bulletin: req.params.category,
        pin: pin,
    });
});

app.get("/search", db.auth, async (req, res) => {
    const user = await db.getUser(req);

    let q = req.query.q;
    let bulletin = req.query.bulletin;

    let posts = await db.searchPosts(q, bulletin);

    res.render("search.ejs", { 
        user: user,
        posts: posts,
        admin_view: false,
        q: q,
        bulletin: bulletin
    });
});

app.get("/admin", db.auth, async (req, res) => {
    
    //Check admin perms
    const user = await db.getUser(req);
    if (!user.admin) return res.status(403).send('UNAUTHORIZED REQUEST!');

    const posts = await db.getPosts(undefined, 20, 0, false, true);

    res.render("admin.ejs", {
        user: user,
        posts: posts,
    });
});


app.get("/profile/:userEmail", db.auth, async (req, res) => {
    const user = await db.getUser(req);
    
    // Get profile being viewed
    //console.log('queried user profile, userEmail: ', req.params.userEmail);
    const profile = await db.getUserByEmail(req.params.userEmail);
    if (profile === undefined) return res.status(404).send('None such user.');
    
    // Get posts by user
    const posts = await db.getPostsByUser(profile, true);

    // Get categories available to add. 
    const categories = Object.keys(await db.getCategories());
    const newCategories = 
        profile.categories != undefined ? categories.filter( category => !(category in profile.categories) ) : categories; 
    
    // Check if it is self (profile edit will only be allowed if so)
    res.render("profile.ejs", {
        user: user,
        profile: profile,
        posts: posts,
        categories: categories, 
    });
});

app.post("/api/profile/addCategory", db.auth, async (req, res) => {
    const newCategory = req.body.newCategory;
    if (newCategory === undefined) return;

    await db.addCategory(req, newCategory);
    res.status(200);
});

app.post("/api/profile/removeCategory", db.auth, async (req, res) => {
    const category = req.body.category;
    if (category === undefined) return;

    await db.removeCategory(req, category);
    res.status(200).json({});
});

app.post("/sessionLogin", async (req, res) => {
    //console.log("Login Request received");
    await db.setSessionCookie(req, res);
});

app.get("/sessionLogout", (req, res) => {
    res.clearCookie('session');
    res.redirect('/login');
});

app.get("/createPost", db.auth, async (req, res) => {
    const user = await db.getUser(req);
    const categories = 
        Object.entries(await db.getCategories())
            .filter(i => !i[1].private|| user.admin || (i[1].members == undefined ? false : i[1].members.includes(user.email)))
            .map(i => i[0]);

    res.render("createPost.ejs", { 
        user: user,
        categories: categories,
    });
});

app.post('/api/createCategory', db.auth, async (req, res) => {
    //console.log("Publish Post requested, body: ", req.body);
    const post = req.body;

    //Check admin perms
    const user = await db.getUser(req);
    if (!user.admin) return res.status(403).send('UNAUTHORIZED REQUEST!');

    //Instruct db to create new category 
    let err = db.createCategory(req);
    if (err != undefined) {
        res.send({err: err});
    }
    res.redirect('/');
});

app.post("/api/posts/publish", db.auth, async (req, res) => {
    //console.log("Publish Post requested, body: ", req.body);
    const post = req.body;

    let author = await db.getUser(req);

    post.authorName = author.name;
    post.author = author.email;

    // If no post in body
    if (post === undefined)
        return;

    // Push post
    let error = await db.pushPost(post);
    res.send({error: error});
});

app.get("/api/posts/get", db.auth, async (req, res) => {
    console.log(req.query);
    const offset = Number(req.query.offset);
    const amount = Number(req.query.amount);
    let posts;

    // If category is not specified, get from all cats of user
    if (req.query.category === undefined) {
        const user = await db.getUser(req);
        posts = await db.getPostsForUser(user, offset, amount);
    } else {
        posts = await db.getPostsByCategory(req.query.category, offset, amount);
    } 
    return posts.length == 0 ? res.json({reachedBottom: true}) : res.json(posts);
});

app.get("/api/posts/get-unapproved", db.auth, async (req, res) => {
    const offset = Number(req.query.offset);
    const amount = Number(req.query.amount);
    const posts = await db.getPosts(req.query.category, amount, offset, false, true);
    
    return posts.length == 0 ? res.json({reachedBottom: true}) : res.json(posts);
});
app.post("/api/posts/approve", db.auth, async (req, res) => {
    //vulernable to attacks probably. fix later. probably check origin of requests
    const user = await db.getUser(req);
    const category_conf = await db.getCategory(req.body.category);
    const perms = user.admin || category_conf.moderators.includes(user.email);

    if (!perms) 
        return res.status(403).send("unauthorized");
    
    await db.approvePost(req.body.key);
    return res.status(200).send("ack");
});

app.post("/api/posts/pin", db.auth, async (req, res) => {
    const user = await db.getUser(req);
    const category_conf = await db.getCategory(req.body.category);
    const perms = user.admin || category_conf.moderators.includes(user.email);

    if (!perms) 
        return res.status(403).send("unauthorized");

    db.pinPost(req.body.category, req.body.key);
    return res.status(200).send("ack");
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});
