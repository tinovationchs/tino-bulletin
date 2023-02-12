const post_template = `
<div class="postBox">
    <h2 id="post-title"><%= post.title %></h2>
    <h5><a href="/bulletins/<%= post.category %>/" style="text-decoration:none"><%= post.category %></a> </h4>
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
                <img class="attachment" src="<%= attachment %>"/>
            <% } else { %>
                <p><%= attachment %></p>
            <% } %>
        <% }); %>
    <% } %>
</div>
`;