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
categories

child category
string (category): {
  authorized: array[string] (array of emails)
  moderator: array[string] (array of emails)
  private: bool
}

posts

child post obj
{
  approved: bool
  author: string (email)
  authorName: string
  attachments: array[string] | undefined
  category: string
  postTime: int (timestamp, unix milliseconds)
  text: string
  title: string
}

users

child user obj
{
  admin: bool
  categories: {
    string (category name): bool
  }
  email: string
  name: string
}
```
