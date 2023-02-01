const loading_elem = document.getElementById("loading_post");
const feed = document.getElementById("feed");
let loading = false;
let offset = 0;

function reachedBottom () {
    document.removeEventListener("scroll", onscroll);
    document.getElementById("loadingPost").style.display = 'none';
}

const onscroll = e => {
    if (!shouldLoad()) return;
    if (loading) return;
    loading = true;
    console.log("Loading!");
    
    // Start Load
    const amount = 5;
    let params = {
        amount: amount,
        offset: offset,
    };

    fetchPosts(params)
    .then(res => res.json())
    .then(res => {
        console.log(res);
        // If reached bottom 
        if (res.reachedBottom) {
            reachedBottom();
            return;
        }

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
        }, 1500);
    })
    .catch(err => {
        console.log("error: ", err);
        setTimeout(() => {
            loading = false;
            console.log("throttle done");
            onscroll();
        }, 1500);
    });
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