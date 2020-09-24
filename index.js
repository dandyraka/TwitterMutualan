const Twitter = require('twitter-lite');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const cron = require('node-cron');
const color = require('./color')

const adapter = new FileSync('db.json')
const db = low(adapter)

const dbfoll = new FileSync('db_follow.json')
const dbf = low(dbfoll)

db.defaults({ tweet: []}).write()
dbf.defaults({ user: []}).write()

const client = new Twitter({
    subdomain: "api", // "api" is the default (change for other subdomains)
    version: "1.1", // version "1.1" is the default (change for other subdomains)
    consumer_key: "XXX", // from Twitter.
    consumer_secret: "XXX", // from Twitter.
    access_token_key: "XXX", // from your User (oauth_token)
    access_token_secret: "XXX" // from your User (oauth_token_secret)
});

const prefix = /(mutual(an)?)/g;
const prefix_ignore = /kpop|korea|stan|ig|drop|link|ig|army/g;

async function getTweets(usernya) {
    for (const user of usernya) {
        try {
            const gtwt = await client.get("statuses/user_timeline", {
                screen_name: user,
                count: 1
            }).catch(error => error);

            const tweetIDnya = gtwt[0].id_str
            const tweetnya = gtwt[0].text

            const isSaved = db.get('tweet').find({ id: tweetIDnya }).value()
            if(isSaved){
                console.log(color('[ALREADY_RETWEETED]', 'red'), '=>', color(tweetIDnya))
            } else {
                if(prefix.test(tweetnya)){
                    db.get('tweet').push({ id: tweetIDnya}).write()
                    console.log(color('[MUTUAL_FOUND]', 'green'), 'on', color(user, 'yellow'))
    
                    if(prefix_ignore.test(tweetnya)){
                        console.log(color('[IGNORE]', 'red'), 'Mengandung kata cringe')
                    } else {
                        const ngretweet = await client.post("statuses/retweet/" + tweetIDnya).catch(error => error);
                        if(ngretweet.retweeted){
                            console.log(color('[RETWEETED]', 'green'), '=>', color(tweetIDnya))
                        }
                    }
                } else {
                    console.log(color('[MUTUAL_NOTFOUND]', 'red'), 'on', color(user, 'yellow'))
                }
            }

        } catch (e) {
            if ('errors' in e) {
                // Twitter API error
                if (e.errors[0].code === 88)
                  // rate limit exceeded
                  console.log(color('[ERROR]', 'red'), "Rate limit will reset on", new Date(e._headers.get("x-rate-limit-reset") * 1000))
                  //console.log("Rate limit will reset on", new Date(e._headers.get("x-rate-limit-reset") * 1000));
                  // some other kind of error, e.g. read-only API trying to POST
            } else {
                // non-API error, e.g. network problem or invalid JSON in response
            }
        }
    }
}

async function retweeters() {
    const Twitt = db.get('tweet').value()
    Twitt.forEach(async (Twtts) => {
        const twitID = Twtts.id

        try {
            const get_retweeters = await client.get("statuses/retweeters/ids", {
                id: twitID
            }).catch(error => error);
            const retweeters = get_retweeters.ids
            retweeters.forEach(async function(item) {
                const isSaved = dbf.get('user').find({ id: item }).value()
                if(!isSaved){
                    dbf.get('user').push({ id: item, status: 'belum'}).write()
                }
            })
        } catch (e) {
            console.log(color('[ERROR]', 'red'), e)
        }
        
    });
}

async function ngfollow() {
    const UserTF = dbf.get('user').filter({status: 'belum'}).take(10).value()
    UserTF.forEach(async (UsersTF) => {
        const ngcekUser = await client.post("users/lookup", {
            user_id: UsersTF.id
        }).catch(error => error);
        if(ngcekUser.errors){
            dbf.get('user').find({ id: UsersTF.id }).assign({ status: 'user error'}).write()
        } else {
            const ngefolow = await client.post("friendships/create", {
                user_id: UsersTF.id
            }).catch(error => error);
            if(!ngefolow.errors){
                dbf.get('user').find({ id: UsersTF.id }).assign({ status: 'sudah'}).write()
                console.log(color('[FOLLOWED]', 'green'), '=>', color(ngefolow.screen_name))
            }
        }
    });
}

const listUser = [
    "subtanyarl", 
    "MUTUALANDFESS", 
    'menfesssyg', 
    'subtanyarl2', 
    'sygfess',
    'spongebobmnfess',
    'menfesssyg',
    'bacotfess',
    'sqwfess'
];
getTweets(listUser)
ngfollow()

cron.schedule('*/5 * * * *', () => {
    console.log(color('=== FIND MUTUAL BASE ===', 'green'))
    getTweets(listUser)
});

cron.schedule('*/3 * * * *', () => {
    console.log(color('=== AUTO FOLLOW RETWEET ===', 'green'))
    ngfollow()
});

cron.schedule('*/10 * * * *', () => {
    console.log(color('=== RESET DATABASE ===', 'green'))
    //Unretweet
    const listRT = db.get('tweet').value()
    listRT.forEach(async (ListsRT) => {
        const idRT = ListsRT.id
        await client.post("statuses/unretweet/" + idRT).catch(error => error);
    });
    
    db.set('tweet', []).write()
    dbf.get('user').remove({ status: "user error" }).write()
    retweeters()
});
