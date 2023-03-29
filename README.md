# Tino Bulletin Forum 

## Overview & Features
A bulletin/forum page for Cupertino High School, built by Tinovation.
Post are attached to a specific "bulletin" and users will only see posts from subscribed bulletins.
Posts must be approved by an admin or a moderator for the relevant bulletin before it is published to the users.
Posting privileges to bulletins can be restricted by configuring it to be private. 
Post searching is implemented.

## Screenshots
### Feed
![image](https://github.com/downloadablecontent/Bulletin-Backend/blob/main/screenshots/feed.png)
### Profile 
![image](https://github.com/downloadablecontent/Bulletin-Backend/blob/main/screenshots/profile.png)
### Mobile
![image](https://i.imgur.com/uBKv7LZ.png)
---

## Developer Notes

### Tools
- `Node.js` - Language used for implementing backend
- `Express.js` - Node.js web hosting framework
- `Bootstrap` - Frontend styling toolkit
- `EJS` - JS templator 
- `Firebase` - Development platform, used for its authentication service and realtime database

### Environmental Variables
- Firebase Credentials
- Database URL

**Client access to `Firebase` must also be configured to the correct database. The Firebase realtime database will generate a `config.json` file to be served.**

### Installation
```
npm install // Install necessary packages
npm dev // Development hosting, run with nodemon
npm start // Production Serve
```

### DB Schema
```
categories: {
    <category-name> : {
        members: [email] | undefined, // Undefined if public
        moderators: [email] | undefined, // Undefined if public
        private: bool,
		pin: <post-id> | undefined
    }, ...
}

posts: {
    <post-id>: {
        approved: bool,
        author: email,
        authorName: username,
        attachments: [url] | undefined,
        category: string,
        postTime: unix ms timestamp,
        text: string,
        title: string,
    }, ...
}

users: {
    <user-id>: {
        admin: bool
        categories: {
            <category-name>: true 
        }
        email: string
        name: string
    }, ...
}
```
