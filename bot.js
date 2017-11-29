var Discord = require('discord.io');
var logger = require('winston');
var http = require('http');
var AWS = require('aws-sdk');
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.add(logger.transports.File, {
    filename: 'bot.log',
    level: 'debug'
});
logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
   token: process.env.TOKEN,
   autorun: true
});

bot.addServer = function(serverID) {
    bot.races[serverID] = {latest: {}, finished: [], all_by_hash: {}, in_race: {}};
}

var inconsistent = true;

bot.races = {};
var s3 = new AWS.S3();
var bucket = "rando-bot";
var bucket_key = "races.json";


bot.loadRaces = function() {
    var params = {
        Bucket: bucket,
        Key: bucket_key,
    };
    s3.getObject(params, function(err, data) {
        if (err) {
            logger.error('S3 download - error: ' + err + ' stack: ' + err.stack);
            return
        }
        logger.debug('S3 download - data: ' + data);

        bot.races = JSON.parse(data.Body);
        bot.races.all_by_hash = {}
        for (var key in bot.races.latest) {
            bot.races.all_by_hash[bot.races.latest[key].hash] = bot.races.latest[key];
        }
        for (var i = 0; i < bot.races.finished.length; i++) {
            bot.races.all_by_hash[bot.races.finished[i].hash] = bot.races.finished[i];
        }
        inconsistent = false;
    });
}

bot.loadRaces();

bot.saveRaces = function() {
    var data = JSON.stringify(bot.races)
    var params = {
        Bucket: bucket,
        Key: bucket_key,
        Body: data,
    }
    S3.putObject(params, function(err, resp) {
        if (err) {
            logger.error('S3 upload - error: ' + err + ' stack: ' + err.stack);
            return
        }
        logger.debug('S3 upload - data: ' + resp);
    });
}

bot.arr_remove = function(array, element) {
    const index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1);
    }
}

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.sendError = function(channelID, userID, message) {
    bot.sendMessage({
        to: channelID,
        message: '<@' + userID + '> ERROR: ' + message,
    });
}

bot.debugCallback = function(err, response) {
    logger.debug('sendMessage: error: ' + err + ' response: ' + response);
    if (err != undefined) {
        console.log(err);
    }
}

bot.sendTagged = function(channelID, userID, message) {
    bot.sendMessage({
        to: channelID,
        message: '<@' + userID + '> ' + message,
    }, bot.debugCallback);
}


bot.lastRace = function() {
    var max_ts = 0;
    var race = undefined;
    for (var key in bot.races.latest) {
        if (bot.races.latest[key].initiated > max_ts && (bot.races.latest[key].status == 'starting' || bot.races.latest[key].status == 'in-progress')) {
            max_ts = bot.races.latest[key].initiated;
            race = bot.races.latest[key];
        }
    }
    return race;
}

bot.lastStartingRace = function() {
    var max_ts = 0;
    var race = undefined;
    for (var key in bot.races.latest) {
        if (bot.races.latest[key].initiated > max_ts && bot.races.latest[key].status == 'starting') {
            max_ts = bot.races.latest[key].initiated;
            race = bot.races.latest[key];
        }
    }
    return race;
}

bot.lastFinished = function() {
    if (bot.races.finished.length > 0) {
        return bot.races.finished[bot.races.finished.length - 1];
    }
    return undefined;
}

bot.niceTimeDiff = function(start, end) {
    ms = end - start;
    logger.debug('Creating time diff. Diff stamp: ' + ms);
    hours = Math.floor(ms / (60 * 60 * 1000));
    minutes = Math.floor(ms / (60 * 1000)) - hours * 60;
    seconds = Math.floor(ms / 1000) - hours * (60 * 60) - minutes * 60;
    logger.debug('Hours: ' + hours + ' Minutes: ' + minutes + ' Seconds: ' + seconds);
    ms = ms % 1000;
    var hourss, minutess, secondss, mss;
    if (hours < 10) {
        hourss = '0' + hours;
    } else {
        hourss = '' + hours;
    }
    if (minutes < 10) {
        minutess = '0' + minutes;
    } else {
        minutess = '' + minutes;
    }
    if (seconds < 10) {
        secondss = '0' + seconds;
    } else {
        secondss = '' + seconds;
    }
    if (ms < 10) {
        mss = '00' + ms;
    } else if (ms < 100) {
        mss = '0' + ms;
    } else {
        mss = '' + ms;
    }
    if (hours == 0) {
        if (minutes == 0) {
            return secondss + '.' + mss;
        }
        return minutess + ':' + secondss + '.' + mss;
    }
    return hourss + ':' + minutess + ':' + secondss + '.' + mss;
}

bot.getParticipants = function(race) {
    if (race.participants.length == 0) {
        return 'no-one';
    } else {
        return race.participants.join(', ');
    }
}

bot.findWinner = function(race) {
    var min_ts = undefined;
    var min_name = 'unknown';
    if (race.finished.length == 0) {
        return 'unknown'
    }
    for (var key in race.finished) {
        if (min_ts === undefined || min_ts < race.finished[key]) {
            min_ts = race.finished[key];
            min_name = key;
        }
    }
    return min_name;
}

bot.niceTimeSince = function(start) {
    return bot.niceTimeDiff(start, new Date().getTime());
}

bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 1) == '.') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        var serverID = bot.channels[channelID].guild_id;
        if (!(serverID in bot.races)) {
            bot.addServer(serverID);
        }

        args = args.splice(1);
        if (inconsistent) {
            logger.info('Got command ' + message + ' but download is not done yet.');
            return
        }
        switch(cmd) {
            case 'create':
                var mode = 'open';
                var difficulty = 'normal';

                if (target in bot.races[serverID].latest) {
                    if (race.status == 'starting' || race.status == 'in-progress') {
                        bot.sendError(channelID, userID, "You already have an ongoing race! Use .cancel to clear it.");
                        return;
                    }
                }

                if (args.length > 0) {
                    mode = args[0];
                    if (args.length > 1) {
                        difficulty = args[1];
                    }
                }

                if (['standard', 'open', 'swordless'].indexOf(mode) < 0) {
                    bot.sendError(channelID, userID, "Mode must be standard, open or swordless.");
                    return;
                }

                if (['easy', 'normal', 'hard', 'expert', 'insane'].indexOf(difficulty) < 0) {
                    bot.sendError(channelID, userID, "Difficulty must be easy, normal, hard, expert or insane.");
                    return;
                }

                bot.sendMessage({
                    to: channelID,
                    message: 'Creating a seed for you.'
                });

                var post_options = {
                    host: 'vt.alttp.run',
                    path: '/seed',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                };

                var post_req = http.request(post_options, function(res) {
                    res.setEncoding('utf8');
                    buffer = ""
                    res.on('data', function (chunk) {
                        buffer += chunk;
                    });
                    res.on('end', function() {
                        resp = JSON.parse(buffer);
                        bot.sendTagged(channelID, userID, 'whipped up a(n) ' + difficulty + ' ' + mode + ' randomizer seed at http://vt.alttp.run/h/' + resp["hash"] + ' - Type ".join ' + user + '" to join the race, or simply type .join to join the last initiated race.');

                        bot.races[serverID].latest[user.toLowerCase()] = {
                            initiator: user.toLowerCase(),
                            hash: resp["hash"],
                            difficulty: difficulty,
                            mode: mode,
                            initiated: new Date().getTime(),
                            status: 'starting',
                            started: 0,
                            participants: [],
                            finished: {},
                            forfeits: {},
                            userids: {},
                        }
                        bot.races[serverID].all_by_hash[resp["hash"]] = bot.races[serverID].latest[user.toLowerCase()];
                        bot.saveRaces();
                    });
                });

                seed_description = {
                    mode: mode,
                    difficulty: difficulty,
                    tournament: true,
                }

                post_req.write(JSON.stringify(seed_description));
                post_req.end();
            break;

            case 'get':
                var target;
                var race;
                if (args.length > 0) {
                    target = args[0].toLowerCase();
                    if (!(target in bot.races[serverID].latest)) {
                        bot.sendError(channelID, userID, 'User ' + target + ' has no active randomizer race.');
                        return;
                    } else {
                        race = bot.races[serverID].latest[target];
                        logger.debug('From directed: ' + race);
                    }
                } else {
                    race = bot.lastRace();
                    logger.debug('From search: ' + race)
                    if (race === undefined) {
                        bot.sendError(channelID, userID, 'No active randomizer race.');
                        return;
                    }
                    target = race.initiator;
                }

                var status = 'starting'
                if (race.status === 'in-progress') {
                    status = 'started ' + bot.niceTimeSince(race.started) + ' ago';
                } else if (race.status === 'finished') {
                    var winner = bot.findWinner(race);
                    if (winner == 'unknown') {
                        status = 'finished with no winners'
                    } else {
                        status = 'finished - winner: ' + winner + ' with a time of ' + bot.niceTimeDiff(race.started, race.finished[winner]);
                    }
                } else if (race.status === 'cancelled') {
                    status = 'cancelled';
                }

                var participants = bot.getParticipants(race);

                bot.sendTagged(channelID, userID, 'The race is a(n) ' + race.difficulty + ' ' + race.mode + ' seed available at http://vt.alttp.run/h/' + race.hash + '\n Race status: ' + status + '; Participants: ' + participants);
            break;

            case 'getbyhash':
                if (args.length == 0) {
                    bot.sendError(channelID, userID, 'Hash must be provided.');
                    return;
                }
                var race = bot.races[serverID].all_by_hash[args[0]]
                if (race === undefined) {
                    bot.sendError(channelID, userID, 'Unknown hash: ' + args[0]);
                    return;
                }
                var status = 'starting'
                if (race.status === 'in-progress') {
                    status = 'started ' + bot.niceTimeSince(race.started) + ' ago';
                } else if (race.status === 'finished') {
                    var winner = bot.findWinner(race);
                    if (winner == 'unknown') {
                        status = 'finished with no winners'
                    } else {
                        status = 'finished - winner: ' + winner + ' with a time of ' + bot.niceTimeDiff(race.started, race.finished[winner]);
                    }
                } else if (race.status === 'cancelled') {
                    status = 'cancelled';
                }

                var participants = bot.getParticipants(race);

                bot.sendTagged(channelID, userID, 'The race is a(n) ' + race.difficulty + ' ' + race.mode + ' seed available at http://vt.alttp.run/h/' + race.hash + '\n Race status: ' + status + '; Participants: ' + participants);
            break;

            case 'show':
                if (args.length == 0) {
                    bot.sendError(channelID, userID, 'Hash must be provided.');
                    return;
                }
                var race = bot.races[serverID].all_by_hash[args[0]]
                if (race === undefined) {
                    bot.sendError(channelID, userID, 'Unknown hash: ' + args[0]);
                    return;
                }
                if (race.status != 'finished') {
                    bot.sendError(channelID, userID, 'That race is not finished yet. Use .getbyhash <hash>');
                    return;
                }
                race_data = ['Race summary: ' + race.difficulty + ' ' + race.mode, 'Participants:'];
                var winner = bot.findWinner(race);
                if (winner == 'unknown') {
                    race_data.push('All racers have forfeited.')
                } else {
                    race_data.push(winner + ' won with a time of ' + bot.niceTimeDiff(race.started, race.finished[winner]));
                }
                for (var i = 0; i < race.participants.length; i++) {
                    var name = race.participants[i];
                    if (name == winner) {
                        continue;
                    }
                    if (name in race.finished) {
                        race_data.push(name + ' finished with a time of ' + bot.niceTimeDiff(race.started, race.finished[name]));
                    } else if (name in race.forfeits) {
                        race_data.push(name + ' forfeited the race at a time of ' + bot.niceTimeDiff(race.started, race.forfeits[name]));
                    } else {
                        race_data.push(name + ' is still going or silently quit');
                    }

                }
                bot.sendTagged(channelID, userID, race_data.join('\n'));
            break;

            case 'cancel':
                var target = user.toLowerCase();
                if (!(target in bot.races[serverID].latest)) {
                    bot.sendError(channelID, userID, 'You have no race in progress!');
                    return;
                }

                race = bot.races[serverID].latest[target];
                if (race.status == 'starting' || race.status == 'in-progress') {
                    bot.sendTagged(channelID, userID, 'Your race has been cancelled :(');
                    race.status = 'cancelled';
                    bot.saveRaces();

                    for (var name in race.participants) {
                        if (name in bot.races[serverID].in_race) {
                            delete bot.races[serverID].in_race[name];
                        }
                    }
                    return;
                }

                bot.sendError(channelID, userID, 'You have no race in progress!');
            break;

            case 'start':
                var target = user.toLowerCase();
                if (!(target in bot.races[serverID].latest)) {
                    bot.sendError(channelID, userID, 'You have no race awaiting a start!');
                    return;
                }

                race = bot.races[serverID].latest[target];
                if (race.status == 'starting') {
                    race.status = 'in-progress';
                    tags = []
                    for (var racer in race.userids) {
                        tags.push('<@' + race.userids[racer] + '>');
                    }
                    bot.sendMessage({
                        to: channelID,
                        message: tags.join(' ') + ' Your race will be starting in 15 seconds. Get ready!',
                    });
                    race.started = new Date().getTime() + 15000;
                    bot.saveRaces();
                    setTimeout(function() {
                        bot.sendMessage({
                            to: channelID,
                            message: 'Race starting in 10 seconds.',
                        });
                        setTimeout(function() {
                            bot.sendMessage({
                                to: channelID,
                                message: 'Race starting in 5 seconds.',
                            });
                            setTimeout(function() {
                                bot.sendMessage({
                                    to: channelID,
                                    message: tags.join(' ') + ' GO!',
                                });
                            }, 5000);
                        }, 5000);
                    }, 5000);
                    return;
                }

                bot.sendError(channelID, userID, 'You have no race awaiting a start!');
            break;

            case 'join':
                if (user in bot.races[serverID].in_race) {
                    bot.sendError(channelID, userID, 'You cannot join a race because you are already participating in race hash ' + bot.races[serverID].in_race[user] + ' - if this is an error, type .clean')
                    return;
                }
                var target;
                var race;
                if (args.length > 0) {
                    target = args[0].toLowerCase();
                    if (!(target in bot.races[serverID].latest) || bot.races[serverID].latest[target].status != 'starting') {
                        bot.sendError(channelID, userID, 'User ' + target + ' has no starting randomizer race.');
                        return;
                    } else {
                        race = bot.races[serverID].latest[target];
                        logger.debug('From directed: ' + race);
                    }
                } else {
                    race = bot.lastStartingRace();
                    logger.debug('From search: ' + race)
                    if (race === undefined) {
                        bot.sendError(channelID, userID, 'No starting randomizer race.');
                        return;
                    }
                    target = race.initiator;
                }

                logger.debug('Pushing user')
                if (race.participants.indexOf(user) < 0) {
                    race.participants.push(user);
                }
                race.userids[user] = userID;
                bot.races[serverID].in_race[user] = race.hash;
                bot.saveRaces();

                logger.debug('Sending message')
                var participants = bot.getParticipants(race);
                logger.debug('Message to send: You joined the race with the hash ' + race.hash + ' started by ' + race.initiator + '. Current participants: ' + participants);
                bot.sendTagged(channelID, userID, 'You joined the race with the hash ' + race.hash + ' started by ' + race.initiator + '. Current participants: ' + participants)
                logger.debug('Done')
            break;

            case 'clean':
                if (user in bot.races[serverID].in_race) {
                    race = bot.races[serverID].all_by_hash[bot.races[serverID].in_race[user]];
                    if (race !== undefined) {
                        bot.arr_remove(race.participants, user);
                    }
                    delete bot.races[serverID].in_race[user];

                    bot.sendTagged(channelID, userID, "You're good to go.");
                } else {
                    bot.sendTagged(channelID, userID, "Nothing to clean.");
                }
                bot.saveRaces();
            break;

            case 'withdraw':
                if (!(user in bot.races[serverID].in_race)) {
                    bot.sendError(channelID, userID, "You're not in a race.");
                    return;
                }
                race = bot.races[serverID].all_by_hash[bot.races[serverID].in_race[user]];
                if (race.status != 'starting') {
                    bot.sendError(channelID, userID, "You cannot withdraw from a race after it has started. Use .forfeit");
                    return;
                }
                bot.arr_remove(race.participants, user);
                delete bot.races[serverID].in_race[user];
                var participants = bot.getParticipants(race);
                bot.sendTagged(channelID, userID, 'You withdrew from the race with the hash ' + race.hash + ' started by ' + race.initiator + '. Current participants: ' + participants)
                bot.saveRaces();
            break;

            case 'forfeit':
                if (!(user in bot.races[serverID].in_race)) {
                    bot.sendError(channelID, userID, "You're not in a race.");
                    return;
                }
                race = bot.races[serverID].all_by_hash[bot.races[serverID].in_race[user]];
                if (race.status == 'starting') {
                    bot.sendError(channelID, userID, "You cannot forfeit from a race before it has started. Use .withdraw");
                    return;
                } else if (race.status == 'cancelled') {
                    bot.sendError(channelID, userID, "Your race was cancelled.");
                    return;
                }
                race.forfeits[user] = new Date().getTime();
                bot.sendMessage({
                    to: channelID,
                    message: user + ' has forfeited from race hash ' + race.hash + ' at the time of ' + bot.niceTimeSince(race.started),
                });
                delete bot.races[serverID].in_race[user];
                if (Object.keys(race.forfeits).length == race.participants.length) {
                    bot.sendMessage({
                        to: channelID,
                        message: 'All racers have forfeited from race hash ' + race.hash + ', race is finished.',
                    });
                    race.status = 'finished';
                    delete bot.races[serverID].latest[race.initiator];
                    bot.races[serverID].finished.push(race);
                }
                bot.saveRaces();
            break;

            case 'done':
                if (!(user in bot.races[serverID].in_race)) {
                    bot.sendError(channelID, userID, "You're not in a race.");
                    return;
                }
                logger.debug('Looking for race hash ' + bot.races[serverID].in_race[user])
                race = bot.races[serverID].all_by_hash[bot.races[serverID].in_race[user]];
                if (race === undefined) {
                    logger.error('Cannot find this race.')
                    logger.error('Races: ' + bot.races[serverID].all_by_hash)
                    for (var key in bot.races[serverID].all_by_hash) {
                        logger.error('  Race hash ' + key + ' by ' + bot.races[serverID].all_by_hash[key].initiator);
                    }
                    logger.error('Latest: ' + bot.races[serverID].latest)
                    for (var key in bot.races[serverID].latest) {
                        logger.error('  Race by ' + key + ': ' + bot.races[serverID].latest[key].hash);
                    }
                    return;
                }
                if (race.status == 'started') {
                    bot.sendError(channelID, userID, "You cannot forfeit from a race before it has started. Use .withdraw");
                    return;
                } else if (race.status == 'cancelled') {
                    bot.sendError(channelID, userID, "Your race was cancelled.");
                    return;
                }
                race.finished[user] = new Date().getTime();
                delete bot.races[serverID].in_race[user];
                bot.sendMessage({
                    to: channelID,
                    message: user + ' has finished the race hash ' + race.hash + ' at the time of ' + bot.niceTimeSince(race.started),
                });
                if (race.status == 'in-progress') {
                    race.status = 'finished';
                    bot.sendTagged(channelID, userID, 'Congratulations, you are the first to finish!');
                    delete bot.races[serverID].latest[race.initiator];
                    bot.races[serverID].finished.push(race);
                }
                bot.saveRaces();
            break;

            case 'status':
                if (!(user in bot.races[serverID].in_race)) {
                    bot.sendTagged(channelID, userID, "You're not in a race.");
                    return;
                } else {
                    bot.sendTagged(channelID, userID, "You're in race hash " + bot.races[serverID].in_race[user] + ".");
                    return
                }
            break;

            case 'help':
                usage = 'Here is a list of all commands I listen to: \n' +
                '.help - Show this message \n' +
                '.create <mode> <difficulty> - Create a new seed. Mode defaults to open, difficulty defaults to normal. \n' +
                '.get <user> - Get the last non-finished race from the user. When user is not provided, gets the last non-finished race. \n' +
                '.getbyhash <hash> - Show details of a race by race hash. \n' +
                '.show <hash> - Shows the data about a finished race. If no raceid is provided, shows the last finished race data. \n' +
                '.join <user> - Join the race created by the provided user. If hash user is provided, join the last created non-running race. You can only join one running race. \n' +
                '.withdraw - Withdraw your join from a race before it starts. \n' +
                '.start - Start your race after a 15 second countdown by the bot. \n' +
                '.cancel - Cancel a race created by you. You cannot cancel finished races. \n' +
                '.done - Mark your race finished and record your completion time. \n' +
                '.forfeit - Forfeit your current race. \n' +
                '.status - Show your current status. \n' +
                '.clean - Use this if the bot does not let you race.';
                bot.sendTagged(channelID, userID, usage);
            break;
         }
     }
});