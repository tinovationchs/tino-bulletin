Language: Node.js
Template Renderer: EJS

Packages to install:
- express
- cookie-parser
- firebase-admin
- EJS
- dotenv

Environmental variables:
- credentials
- databaseURL

Don't forget to change `config.json` to your own info. Please note that is for the frontend, not backend, so don't put any sensitive information there.

To run,

Install packages
```
npm install
```

Then run backend
```
node index.js
```

## DB Schema

```
categories : {
    category_name : {
        members: [string (email)] 
        moderators: [string (email)]
        private: bool
    }
    ...
}

posts : {
    id : {
        approved: bool
        author: string (email)
        authorName: string (username) 
        attachments: [string (url)] | undefined
        category: string 
        postTime: int (unix milliseconds timestamp)
        text: string
        title: string
    }
    ...
}

users : {
    id : {
        admin: bool
        categories: {
            string (category): true 
        }
        email: string
        name: string
    }
    ...
}
```
