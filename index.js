const Twitter = require('twitter-lite');
const cron = require('node-cron');
const color = require('./utils/color');
const db = require('./db');
require('dotenv').config()

//Banner
console.log(color(`%c _______       _ _   _            __  __       _               _             
|__   __|     (_) | | |          |  \\/  |     | |             | |            
   | |_      ___| |_| |_ ___ _ __| \\  / |_   _| |_ _   _  __ _| | __ _ _ __  
   | \\ \\ /\\ / / | __| __/ _ \\ '__| |\\/| | | | | __| | | |/ _\` | |/ _\` | '_ \\ 
   | |\\ V  V /| | |_| ||  __/ |  | |  | | |_| | |_| |_| | (_| | | (_| | | | |
   |_| \\_/\\_/ |_|\\__|\\__\\___|_|  |_|  |_|\\__,_|\\__|\\__,_|\\__,_|_|\\__,_|_| |_|\n\n`, 'cyan'), "font-family:monospace");

if (!process.env.consumer_key || !process.env.consumer_secret || !process.env.access_token_key || !process.env.access_token_secret) {
    console.log(color('[!] fill all authentication requires on .env', 'red'));
    process.exit();
}
console.log(color('[!] Make sure the permission is Read and Write', 'red'));

const autoFollow = process.env.auto_follow.toUpperCase();
const cron_findMutual = process.env.cron_findMutual;
const cron_autoFollow = process.env.cron_autoFollow;
const cron_reset = process.env.cron_reset;

const client = new Twitter({
    subdomain: "api",
    version: "1.1",
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token_key: process.env.access_token_key,
    access_token_secret: process.env.access_token_secret
});

console.log(color('\n\nStarting...', 'green'));

client.get("account/verify_credentials")
    .catch((e) => {
        if (e.errors[0].code) console.log(color('[ERROR]', 'red'), e.errors[0].message) 
        process.exit(1)
    })

const isMutual = (tweet) => {
    return tweet.match(new RegExp(/mutu((a|4)*)l((a|4)*n)?/g));
}

const isIgnored = (tweet) => {
    return tweet.match(new RegExp(/kpop|korea|stan|ig|drop|link|ig|instagram|wa|whatsapp|watsap|army|(\-)?m\-?(\d+)|pic\.twitter\.com/g));
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

                if (isIgnored(tweetText)) return console.log(color('[IGNORED]', 'red'), 'Mengandung kata cringe')

                const doRetweet = await client.post(`statuses/retweet/${tweetID}`).catch(error => error);
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
            const get_retweeters = await client.get(`statuses/retweets/${tweetID}`).catch(error => error);
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
    "MUTUALANDFESS",
    "MUTUALANDFESS1",
    'menfesssyg', 
    'subtanyarl2', 
    'sygfess',
    'spongebobmnfess',
    'bacotfess',
    'sqwfess',
    'mutualan_base'
];
getTweets(listUser)
autoFollow === "ON" ? retweeters() : ''
autoFollow === "ON" ? follow() : ''

cron.schedule(`*/${cron_findMutual} * * * *`, () => {
    console.log(color('=== FIND MUTUAL IN BASE ===', 'green'))
    getTweets(listUser)
});

if (autoFollow === "ON") {
    cron.schedule(`*/${cron_autoFollow} * * * *`, () => {
        console.log(color('=== AUTO FOLLOW RETWEETERS ===', 'green'))
        follow()
    });
}

cron.schedule(`*/${cron_reset} * * * *`, async () => {
    console.log(color('=== RESET DATABASE ===', 'green'))
    //Unretweet
    const retweetList = await db.getAllTweet()
    retweetList.forEach(async (retweets) => await client.post(`statuses/unretweet/${retweets.id}`).catch(error => error));
    
    await db.clearAllTweet()
    if (autoFollow === "ON") {
        await db.removeUserByStatus("error")
        retweeters()
    }
});
