# TwitterMutualan :revolving_hearts:
Mutualan tanpa ribet
```
- Auto retweet base tertentu jika tweet mengandung kata "mutual" / "mutualan"
- Auto follow semua pengguna yang meretweet tweet base
- Auto unretweet agar profile tidak spam terlalu banyak retweet
```

### Install
Clone this project
```bash
> git clone https://github.com/dandyraka/TwitterMutualan.git
> cd TwitterMutualan
```

Install the dependencies:
```bash
> npm install
```

Change env file name from copy.env to .env

User authentication requires:
- `consumer_key`
- `consumer_secret`
- `access_token_key`
- `access_token_secret`

Get it on [https://apps.twitter.com/](https://apps.twitter.com), put in .env
```
consumer_key= YOUR_KEY
consumer_secret= YOUR_SECRET
access_token_key= YOUR_TOKEN_KEY
access_token_secret= YOUR_TOKEN_SECRET
```

Usage
```bash
> npm start
```

## Support Me
Support me on [Saweria](https://saweria.co/xtrvts)
