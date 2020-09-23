const Twitter = require('twitter-lite');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const cron = require('node-cron');
const color = require('./color')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ tweet: []}).write()

const client = new Twitter({
    subdomain: "api", // "api" is the default (change for other subdomains)
    version: "1.1", // version "1.1" is the default (change for other subdomains)
    consumer_key: "XXX", // from Twitter.
    consumer_secret: "XXX", // from Twitter.
    access_token_key: "XXX", // from your User (oauth_token)
    access_token_secret: "XXX" // from your User (oauth_token_secret)
});

const prefix = /(mutual(an)?)/g;
const prefix_ignore = /kpop|korea/g;

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

                /*const get_retweeters = await client.get("statuses/retweeters/ids", {
                    id: tweetIDnya,
                    count: 5
                }).catch(error => error);
                const retweeters = get_retweeters.ids
                retweeters.forEach(async function(item) {
                    const ngefolow = await client.post("friendships/create", {
                        user_id: item
                    }).catch(error => error);

                    if(ngefolow.following || ngefolow.follow_request_sent){
                        console.log(color('[FOLLOWERD]', 'green'), '=>', color(item))
                    }
                })*/
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

const listUser = ["subtanyarl", "MUTUALANDFESS", 'menfesssyg', 'subtanyarl2', 'sygfess'];
getTweets(listUser)
cron.schedule('*/5 * * * *', () => {
    //const listUser = ["subtanyarl", "MUTUALANDFESS", 'menfesssyg', 'subtanyarl2'];
    getTweets(listUser)
});


/*const cekStatus = async function(idne) {
    let result = await client.post("statuses/retweet/" + idne).catch(error => error);
    console.log(result);
}

cekStatus('1308810179786412032')*/
