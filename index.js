const Twitter = require('twitter-lite');
const cron = require('node-cron');
const color = require('./utils/color');
const db = require('./db');

const client = new Twitter({
    subdomain: "api", // "api" is the default (change for other subdomains)
    version: "1.1", // version "1.1" is the default (change for other subdomains)
    consumer_key: "XXX", // from Twitter.
    consumer_secret: "XXX", // from Twitter.
    access_token_key: "XXX", // from your User (oauth_token)
    access_token_secret: "XXX" // from your User (oauth_token_secret)
});

client.get("account/verify_credentials")
    .catch((e) => {
        if (e.errors[0].code) console.log(color('[ERROR]', 'red'), e.errors[0].message) 
        process.exit(1)
    })
    .catch(error => error);

const isMutual = (tweet) => {
    return tweet.match(new RegExp(/(mutual(an)?)/g));
}

const isIgnored = (tweet) => {
    return tweet.match(new RegExp(/kpop|korea|stan|ig|drop|link|ig|army/g));
}

async function getTweets(userlist) {
    for (const user of userlist) {
        try {
            const tweets = await client.get("statuses/user_timeline", { screen_name: user, count: 1 }).catch(error => error);
            const tweetID = tweets[0].id_str
            const tweetText = tweets[0].text
            const isSaved = await db.findTweet(tweetID)

            if (isSaved) console.log(color('[ALREADY_RETWEETED]', 'red'), '=>', color(tweetID))
            if (isMutual(tweetText)) {
                await db.addTweet(tweetID)
                console.log(color('[MUTUAL_FOUND]', 'green'), 'on', color(user, 'yellow'))

                if (isIgnored(tweetText)) console.log(color('[IGNORED]', 'red'), 'Mengandung kata cringe')

                const doRetweet = await client.post("statuses/retweet/" + tweetID).catch(error => error);
                if (doRetweet.retweeted) console.log(color('[RETWEETED]', 'green'), '=>', color(tweetID))
            } else {
                console.log(color('[MUTUAL_NOTFOUND]', 'red'), 'on', color(user, 'yellow'))
            }

        } catch (e) {
            if ('errors' in e) {
                // Twitter API error
                if (e.errors[0].code === 88) return console.log(color('[ERROR]', 'red'), "Rate limit will reset on", new Date(e._headers.get("x-rate-limit-reset") * 1000))
                if (e.errors[0].code) return console.log(color('[ERROR]', 'red'), e.errors[0].message)
            } else {
                // non-API error, e.g. network problem or invalid JSON in response
                console.log(color('[ERROR]', 'red'), e)
            }
        }
    }
}

async function retweeters() {
    try {
        const tweet = await db.getAllTweet()
        tweet.forEach(async (tweets) => {
            const tweetID = tweets.id
            const get_retweeters = await client.get("statuses/retweets/" + tweetID).catch(error => error);
            get_retweeters.forEach(async function (retweetersID) {
                const retweeterID = retweetersID.user.id_str
                const isSaved = await db.findUser(retweeterID)
                if (!isSaved) await db.addUser(retweeterID, 'belum')
            })
        });
    } catch (e) {
        console.log(color('[ERROR]', 'red'), e)
    }

}

async function follow() {
    try {
        const usersToFollow = await db.filterUser('belum')
        usersToFollow.forEach(async (user) => {
            const userCheck = await client.post("users/lookup", { user_id: user.id }).catch(error => error);
            if (userCheck.errors) {
                await db.updateUserStatus(user.id, 'error')
            } else {
                const doFollow = await client.post("friendships/create", { user_id: user.id }).catch(error => error);
                if (!doFollow.errors) {
                    await db.updateUserStatus(user.id, 'success')
                    console.log(color('[FOLLOWED]', 'green'), '=>', color(doFollow.screen_name))
                }
            }
        });
    } catch (e) {
        console.log(color('[ERROR]', 'red'), e)
    }

}

const listUser = [
    "subtanyarl", 
    "MUTUALANDFESS",
    "MUTUALANDFESS1",
    'menfesssyg', 
    'subtanyarl2', 
    'sygfess',
    'spongebobmnfess',
    'bacotfess',
    'sqwfess'
];
getTweets(listUser)
retweeters()
follow()

cron.schedule('*/5 * * * *', () => {
    console.log(color('=== FIND MUTUAL BASE ===', 'green'))
    getTweets(listUser)
});

cron.schedule('*/3 * * * *', () => {
    console.log(color('=== AUTO FOLLOW RETWEET ===', 'green'))
    follow()
});

cron.schedule('*/10 * * * *', async () => {
    console.log(color('=== RESET DATABASE ===', 'green'))
    //Unretweet
    const retweetList = await db.getAllTweet()
    retweetList.forEach(async (retweets) => await client.post("statuses/unretweet/" + retweets.id).catch(error => error));
    
    await db.clearAllTweet()
    await db.removeUserByStatus("error")
    retweeters()
});
