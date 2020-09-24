const low = require('lowdb')
const path = require('path')
const FileSync = require('lowdb/adapters/FileSync')

const db_tweet = low(new FileSync(path.join(__dirname, '/db_tweet.json')))
const db_user = low(new FileSync(path.join(__dirname, '/db_user.json')))

db_tweet.defaults({ tweet: []}).write()
db_user.defaults({ user: []}).write()


// Tweet
const findTweet = (tweetID) => new Promise((resolve, reject) => {
    const findRecords = db_tweet
        .get('tweet')
        .some({ id: tweetID })
        .value()
    if (!findRecords) {
        resolve(findRecords)
    } else {
        resolve(findRecords)
    }
})

const addTweet = (tweetID) => new Promise((resolve, reject) => {
    const insertRecords = db_tweet
        .get('tweet')
        .push({ id: tweetID })
        .write()
    if (!insertRecords) {
        reject('[DB] Error!', insertRecords)
    } else {
        console.log('[DB] Insert Admin: ', number)
        resolve(insertRecords)
    }
})

const getAllTweet = () => new Promise((resolve, reject) => {
    const allRecords = db_tweet
        .get('tweet')
        .toArray()
        .value()
    if (!allRecords) {
        reject('[DB] Error!', allRecords)
    } else {
        // console.log('[DB] Get All Admin')
        resolve(allRecords)
    }
})

const clearAllTweet = () => new Promise((resolve, reject) => {
    const allRecords = db_tweet
        .set('tweet', [])
        .write()
    if (!allRecords) {
        reject('[DB] Error!', allRecords)
    } else {
        // console.log('[DB] Get All Admin')
        resolve(allRecords)
    }
})

// User
const findUser = (userID) => new Promise((resolve, reject) => {
    const findRecords = db_user
        .get('user')
        .some({ id: userID })
        .value()
    if (!findRecords) {
        resolve(findRecords)
    } else {
        resolve(findRecords)
    }
})

const addUser = (userID, status) => new Promise((resolve, reject) => {
    const insertRecords = db_user
        .get('user')
        .push({ id: userID, status: status})
        .write()
    if (!insertRecords) {
        reject('[DB] Error!', insertRecords)
    } else {
        console.log('[DB] Insert Admin: ', number)
        resolve(insertRecords)
    }
})

const updateUserStatus = (userID, status) => new Promise((resolve, reject) => {
    const insertRecords = db_user
        .get('user')
        .find({ id: userID })
        .assign({ status: status})
        .write()
    if (!insertRecords) {
        reject('[DB] Error!', insertRecords)
    } else {
        console.log('[DB] Insert Admin: ', number)
        resolve(insertRecords)
    }
})

const filterUser= (status) => new Promise((resolve, reject) => {
    const allRecords = db_user
        .get('user')
        .filter({status: status})
        .take(10)
        .value()
    if (!allRecords) {
        reject('[DB] Error!', allRecords)
    } else {
        // console.log('[DB] Get All Admin')
        resolve(allRecords)
    }
})

const removeUserByStatus= (status) => new Promise((resolve, reject) => {
    const allRecords = db_user
        .get('user')
        .remove({ status: status })
        .write()
    if (!allRecords) {
        reject('[DB] Error!', allRecords)
    } else {
        // console.log('[DB] Get All Admin')
        resolve(allRecords)
    }
})

const getAllUser= () => new Promise((resolve, reject) => {
    const allRecords = db_user
        .get('user')
        .toArray()
        .value()
    if (!allRecords) {
        reject('[DB] Error!', allRecords)
    } else {
        // console.log('[DB] Get All Admin')
        resolve(allRecords)
    }
})

module.exports = {
    findTweet,
    addTweet,
    getAllTweet,
    clearAllTweet,
    findUser,
    addUser,
    updateUserStatus,
    removeUserByStatus,
    filterUser,
    getAllUser
}