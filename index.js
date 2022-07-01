require('dotenv').config();
const Twitter = require('twitter-lite');
const cron = require('node-cron');
const color = require('./utils/color');
const db = require('./db');
const delay = require('delay');
const cliSpinners = require('cli-spinners');
const ora = require('ora');
const figlet = require('figlet');

console.log(color(figlet.textSync("TwitterMutualan"), 'pink'));

if (!process.env.consumer_key || !process.env.consumer_secret || !process.env.access_token_key || !process.env.access_token_secret) {
    console.log(color('[!] fill all authentication requires on .env', 'red'));
    process.exit();
}
console.log(color('[!] Make sure the permission is Read and Write', 'red'));

const autoFollow = process.env.auto_follow.toUpperCase();
const autoLike = process.env.auto_like.toUpperCase();
const cron_findMutual = process.env.cron_findMutual;
const cron_autoFollow = process.env.cron_autoFollow;
const cron_autoLike = process.env.cron_autoLike;
const cron_reset = process.env.cron_reset;
const base_list = process.env.base_target;
const array_base = base_list.split('|');

const spinner = ora({
	text: 'Delay...',
	spinner: cliSpinners.moon,
});

const client = new Twitter({
    subdomain: "api",
    version: "1.1",
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token_key: process.env.access_token_key,
    access_token_secret: process.env.access_token_secret
});

console.log(color('\nStarting...', 'cyan'));
console.log(`${color(`Total base: ${array_base.length}`, 'cyan')}\n`);

client.get("account/verify_credentials")
    .then(results => {
        console.log(`Logged in as ${color(`@${results.screen_name}`, 'yellow')}`);
    })
    .catch((e) => {
        if (e.errors[0].code) console.log(color('[ERROR]', 'red'), e.errors[0].message)
        process.exit(1)
    })

const isMutual = (tweet) => {
    return tweet.match(new RegExp(/mutu((a|4)*)l((a|4)*n)?/gi));
}

const isIgnored = (tweet) => {
    return tweet.match(new RegExp(/fandom|kpop|korea|stan|ig|drop|link|ig|instagram|wa|whatsapp|watsap|army|(\-)?m\-?(\d+)|pic\.twitter\.com/gi));
}

function spiner(){
    setTimeout(() => {
        spinner.start();
    }, 1000);
}

async function getTweets(userlist) {
    for (const user of userlist) {
        try {
            const tweets = await client.get("statuses/user_timeline", { screen_name: user, count: 1, include_rts: false }).catch(() => {
                return `${color('[ERROR]', 'red')} ${color(user, 'yellow')} not found!!`;
            });
            const tweetID = tweets[0].id_str;
            const tweetText = tweets[0].text;
            const isSaved = await db.findTweet(tweetID);

            (isSaved) ? console.log(color('[ALREADY_RETWEETED]', 'red'), '=>', color(tweetID)) : "";
            if (isMutual(tweetText)) {
                await db.addTweet(tweetID);
                console.log(color('[MUTUAL_FOUND]', 'green'), 'on', color(user, 'yellow'));

                if (isIgnored(tweetText)) {
                    console.log(color('[IGNORED]', 'red'), 'Mengandung kata cringe');
                } else {
                    const doRetweet = await client.post(`statuses/retweet/${tweetID}`).catch(() => {
                        return `${color('[ERROR]', 'red')} failed to retweet ${color(tweetID, 'yellow')}`;
                    });
                    (doRetweet.retweeted) ? console.log(color('[RETWEETED]', 'green'), '=>', color(tweetID)) : "";
                }
            } else {
                console.log(color('[MUTUAL_NOTFOUND]', 'red'), 'on', color(user, 'yellow'));
            }
            await delay(2000);
        } catch (e) {
            if ('errors' in e) {
                // Twitter API error
                if (e.errors[0].code === 88) return console.log(color('[ERROR]', 'red'), "Rate limit will reset on", new Date(e._headers.get("x-rate-limit-reset") * 1000));
                if (e.errors[0].code) return console.log(color('[ERROR]', 'red'), e.errors[0].message);
            } else {
                // non-API error, e.g. network problem or invalid JSON in response
                console.log(color('[ERROR]', 'red'), e);
            }
        }
    }
    spiner();
}

async function retweeters() {
    try {
        const tweet = await db.getAllTweet();
        if (Array.isArray(tweet)) {
            tweet.forEach(async (tweets) => {
                const tweetID = tweets.id;
                const get_retweeters = await client.get(`statuses/retweets/${tweetID}`).catch(() => {
                    return `${color('[ERROR]', 'red')} failed to get retweeters`;
                });
                get_retweeters.forEach(async function (retweetersID) {
                    const retweeterID = retweetersID.user.id_str;
                    const isSaved = await db.findUser(retweeterID);
                    if (!isSaved) await db.addUser(retweeterID, 'belum');
                })
                await delay(2000);
            });
        } else {
            console.log(color('[ERROR]', 'red'), 'Belum ada yang ngeretweet');
        }
    } catch (e) {
        console.log(color('[ERROR]', 'red'), e);
    }
}

async function follow() {
    try {
        const usersToFollow = await db.filterUser('belum');
        await usersToFollow.forEach(async (user) => {
            const userCheck = await client.post("users/lookup", { user_id: user.id }).catch(() => {
                return `${color('[ERROR]', 'red')} failed to lookup ${color(userCheck.screen_name, 'yellow')}`;
            });
            if (userCheck.errors) {
                await db.updateUserStatus(user.id, 'error');
            } else {
                const doFollow = await client.post("friendships/create", { user_id: user.id }).catch(error => error);
                if (!doFollow.errors) {
                    await db.updateUserStatus(user.id, 'success');
                    console.log(color('[FOLLOWED]', 'green'), '=>', color(doFollow.screen_name));
                }
            }
            await delay(2000);
        });
        spiner();
    } catch (e) {
        console.log(color('[ERROR]', 'red'), e);
    }
}

async function like() {
    try {
        const homeTimeline = await client.get('statuses/home_timeline').catch(() => {
            return `${color('[ERROR]', 'red')} ${color('Timeline tweet', 'yellow')} not found!!`;
        });
        homeTimeline.forEach(async (tweets) => {
            if(!tweets.favorited) {
                const doLike = await client.post('favorites/create', { id: tweets.id_str }).catch(error => error);
                (doLike.favorited) ? console.log(color('[LIKED]', 'green'), '=>', color(tweets.id_str)) : "";
            } else {
                console.log(color('[ERROR]', 'red'), 'ALREADY_LIKED', '=>', color(tweets.id_str, 'yellow'));
            }
            await delay(10000);
        })
    } catch (e) {
        console.log(color('[ERROR]', 'red'), e);
    }
}

getTweets(array_base);
autoFollow === "ON" ? retweeters() : '';
autoFollow === "ON" ? follow() : '';

cron.schedule(`*/${cron_findMutual} * * * *`, () => {
    spinner.succeed();
    console.log(color('=== FIND MUTUAL IN BASE ===', 'pink'));
    getTweets(array_base);
});

if (autoFollow === "ON") {
    cron.schedule(`*/${cron_autoFollow} * * * *`, () => {
        spinner.succeed();
        console.log(color('=== AUTO FOLLOW RETWEETERS ===', 'pink'));
        follow();
    });
}

if (autoLike === "ON") {
    cron.schedule(`0 */${cron_autoLike} * * * *`, () => {
        spinner.succeed();
        console.log(color('=== AUTO LIKE TWEETS ===', 'pink'));
        like();
    });
}

cron.schedule(`*/${cron_reset} * * * *`, async () => {
    spinner.succeed();
    console.log(color('=== RESET DATABASE ===', 'pink'));
    //Unretweet
    const retweetList = await db.getAllTweet();
    retweetList.forEach(async (retweets) => await client.post(`statuses/unretweet/${retweets.id}`).catch(error => error));
    
    await db.clearAllTweet()
    if (autoFollow === "ON") {
        await db.removeUserByStatus("error");
        retweeters();
    }
    console.log(color('Berhasil reset database & unretweet!', 'pink'));
});