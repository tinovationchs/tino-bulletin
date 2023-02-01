const post_template = `
<div class="postBox">
    <h2 id="post-title"><%= post.title %></h2>
    <h5><a href = "bulletins/<%= post.category %>/" style="text-decoration:none"><%= post.category %></a> </h4>
    <span>By  <a href="/profile/<%= post.author %>" style="text-decoration: none"><%= post.authorName %></a> | <%= (new Date(post.postTime)).toLocaleDateString(undefined, { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }) %></span>
    <p id="post-text"><%= post.text %></p>
    
    <% if (admin_view && !post.approved) { %>
        <% if (post.attachments != false && post.attachments != undefined) { %>
            <% post.attachments.forEach(function(attachment) { %>
                <p><%= attachment %></p>
            <% }); %>
        <% } %>
        
        <button onclick="approvePost(<%= JSON.stringify(post) %>)">Approve Post</button>
    <% } if (post.approved && post.attachments != false && post.attachments != undefined) { %>
        <% post.attachments.forEach(function(attachment) { %>
            <% if (attachment.endsWith('.png') || attachment.endsWith('.jpg')) { %>
                <img src="<%= attachment %>"/>
            <% } else { %>
                <p><%= attachment %></p>
            <% } %>
        <% }); %>
    <% } %>
</div>
`;
const loading_elem = document.getElementById("loading_post");
const feed = document.getElementById("feed");
let loading = false;
let offset = 0;

const onscroll = e => {
    if (!shouldLoad()) return;
    if (loading) return;
    loading = true;
    console.log("Loading!");
    
    // Start Load
    const amount = 5;
    let params = {
        category: "Officer's-Exclusives",
        amount: amount,
        offset: offset,
    };

    fetch("/api/posts/get?" + new URLSearchParams(params), {
        method: "GET",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        query: JSON.stringify(params),
    })
    .then(res => res.json())
    .then(res => {
        console.log(res);
        for (const post of res) {
            console.log(post);
            const elem = document.createElement("div");
            elem.innerHTML = ejs.render(post_template, {
                post: post,
                admin_view: false
            });
            feed.appendChild(elem);
        };
        offset += res.length;
        setTimeout(() => {
            loading = false;
            console.log("throttle done");
            onscroll();
        }, 3000);
    })
    .catch(err => {
        console.log("error: ", err);
        setTimeout(() => {
            loading = false;
            console.log("throttle done");
            onscroll();
        }, 3000);
    });


    // Spawn Loading animation
};

function shouldLoad () {
    const BUF = 200;
    const lim = feed.clientHeight - window.innerHeight - BUF;
    const pos = window.scrollY;
    return pos > lim;
}

async function approvePost(post) {
    const res = await fetch('/api/posts/approve', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(post)
    });
    if (res.status != 200) {
        alert("error on approval");
    } else {
        location.reload();
    }
}

document.addEventListener("scroll", onscroll);
setTimeout(onscroll, 1000);