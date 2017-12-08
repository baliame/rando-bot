var Discord = require('discord.io');
var logger = require('winston');
var http = require('http');
var AWS = require('aws-sdk');
var subprocess = require('child_process')
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

bot.on('disconnect', function(errMsg, code) {
    logger.error('Bot disconnected with code ' + code + ': ' + errMsg);
    bot.connect();
});

bot.addServer = function(serverID) {
    bot.races[serverID] = {latest: {}, finished: [], all_by_hash: {}, in_race: {}, user_data: {}, pingrole: null};
}

var inconsistent = true;

bot.races = {};
var s3 = new AWS.S3();
var bucket = "rando-bot";
var bucket_key = "races.json";


bot.sleep = function(ms) {
    var start = new Date().getTime();
    while (new Date().getTime() - ms < start);
}

bot.makeCacheForUser = function(user) {
    var cacheEntry = {
        username: user.username,
        total_time: 0,
        average_time: 0,
        forfeit_times: 0,
        winscore: 0,
        total_games: 0,
        won_games: 0,
        winrate: 0,
        forfeits: 0,
        score: 0,
    }
    for (var i = 0; i < user.races.length; i++) {
        var race = bot.races.all_by_hash[user.races[i]];

        if (race.status != 'finished') {
            continue;
        }

        if (race.participants.length <= 1) {
            continue;
        }
        var good = false;
        for (var j = 0; j < race.participants.length; j++) {
            if (user.username == race.participants[j]) {
                good = true;
                break;
            }
        }
        if (!good) {
            user.races.splice(user.races[i], 1);
            i--;
        }
        cacheEntry.total_games += 1;

        if (user.username in race.finished) {
            cacheEntry.winscore += bot.winScoreForRace(race, user.username);
            cacheEntry.total_time += (race.finished[user.username] - race.started);
            var winner = bot.findWinner(race);
            if (winner == user.username) {
                cacheEntry.won_games += 1;
            }
        } else if (user.username in race.forfeits) {
            var last_finisher = bot.findLastFinisher(race)
            if (last_finisher != 'unknown') {
                cacheEntry.winscore -= 4;
                var lft = race.finished[last_finisher];
                cacheEntry.forfeits += 1;
                cacheEntry.forfeit_times += (lft - race.started + 3600000);
            } else {
               cacheEntry.total_games -= 1;
            }
        } else {
            if (race.started < new Date().getTime() - 86400000) {
                var last_finisher = bot.findLastFinisher(race)
                if (last_finisher != 'unknown') {
                    cacheEntry.winscore -= 4;
                    var lft = race.finished[last_finisher];
                    cacheEntry.forfeits += 1;
                    cacheEntry.forfeit_times += (lft - race.started + 3600000);
                } else {
                   cacheEntry.total_games -= 1;
                }
            } else {
                cacheEntry.total_games -= 1;
            }
        }
    }
    if (cacheEntry.total_games > 0) {
        cacheEntry.average_time = Math.round(cacheEntry.total_time / cacheEntry.total_games);
        cacheEntry.winrate = cacheEntry.won_games / cacheEntry.total_games;
    }
    var mult = cacheEntry.winrate + 0.7;
    if (mult > 1) {
        mult = (mult - 1) * 0.3 / 0.7;
    }
    cacheEntry.score = cacheEntry.winscore * mult;
    user.cache = cacheEntry;
    cache.dirty = false;
    return cacheEntry;
}

bot.winScoreForRace = function(race, username) {
    var total = race.participants.length;
    var placement = total;
    if (username in race.finished) {
        for (var uname in race.forfeits) {
            placement += 1;
        }
        for (var uname in race.finished) {
            if (uname == username) {
                continue;
            } else {
                if (race.finished[uname] < race.finished[username]) {
                    placement += 1;
                }
            }
        }
    }
    var bonus = 0;
    if (placement < total / 2) {
        bonus += Math.round(total / 3);
    }
    if (placement == 1) {
        bonus += Math.round(total / 2);
    }
    return total - placement + bonus;
}

bot.getUserStats = function(serverID, username) {
    if (username in bot.races[serverID].user_data) {
        if (bot.races[serverID].user_data[username].dirty) {
            return bot.makeCacheForUser(bot.races[serverID].user_data[username]);
        } else {
            return bot.races[serverID].user_data[username].cache;
        }
    }
    bot.races[serverID].user_data[username] = {
        username: username,
        races: [],
        cache: {
            username: user.username,
            total_time: 0,
            average_time: 0,
            forfeit_times: 0,
            winscore: 0,
            total_games: 0,
            won_games: 0,
            winrate: 0,
            forfeits: 0,
            score: 0,
        },
        dirty: false
    };
    return bot.races[serverID].user_data[username].cache;
}

bot.getUserStatsNoCreate = function(serverID, username) {
    if (username in bot.races[serverID].user_data) {
        if (bot.races[serverID].user_data[username].dirty) {
            return bot.makeCacheForUser(bot.races[serverID].user_data[username]);
        } else {
            return bot.races[serverID].user_data[username].cache;
        }
    }
    return null;
}

bot.findSimilar = function(serverID, username) {
    var tlc = username.toLowerCase();
    for (uname in bot.races[serverID].user_data) {
        if (uname.toLowerCase() == tlc) {
            return uname;
        }
    }
    return null;
}

bot.getUserData = function(serverID, username) {
    if (username in bot.races[serverID].user_data) {
        return bot.races[serverID].user_data[username];
    }
    bot.races[serverID].user_data[username] = {
        username: username,
        races: [],
        cache: {},
        dirty: true
    };
    return bot.races[serverID].user_data[username];
}

bot.insertUserData = function(serverID, username, hash) {
    if (username in bot.races[serverID].user_data) {
        bot.races[serverID].user_data[username].races.push(hash);
        bot.races[serverID].user_data[username].dirty = true;
        return;
    }
    bot.races[serverID].user_data[username] = {
        username: username,
        races: [hash],
        cache: {},
        dirty: true
    };
}

bot.removeUserData = function(serverID, username, hash) {
    if (username in bot.races[serverID].user_data) {
        bot.arr_remove(bot.races[serverID].user_data[username].races, hash);
        bot.races[serverID].user_data[username].dirty = true;
        return;
    }
    bot.races[serverID].user_data[username] = {
        username: username,
        races: [],
        cache: {
            username: user.username,
            total_time: 0,
            average_time: 0,
            winscore: 0,
            total_games: 0,
            won_games: 0,
            winrate: 0,
            forfeits: 0,
            score: 0,
        },
        dirty: false
    };
}

bot.rebuildUserData = function(serverID) {
    for (var hash in all_by_hash) {
        var data = all_by_hash[hash];
        if (data.status != 'cancelled') {
            for (var i = 0; i < data.participants.length; i++) {
                name = data.participants[i]
                bot.insertUserData(serverID, data.participants[i], hash)
            }
        }
    }
}

bot.findRole = function(serverID, rolename) {
    roles = bot.servers[serverID].roles;
    logger.debug('Finding role name "' + rolename + '"');
    for (var rid in roles) {
        logger.debug('Checking role ' + roles[rid].name);
        if (roles[rid].name == rolename) {
            return rid;
        }
    }
    return null;
}

bot.findUser = function(serverID, username) {
    users = bot.users;
    for (var uid in users) {
        if (users[uid].username.toLowerCase() == username.toLowerCase()) {
            return uid;
        }
    }
    return null;
}

bot.findMemberData = function(serverID, userID) {
    return bot.servers[serverID].members[userID];
}

bot.isServerOrBotAdmin = function(serverID, member) {
    if (member.id == "185071875506962433") {
        return true;
    }
    if (bot.servers[serverID].owner_id == member.id) {
        return true;
    }
    for (var i = 0; i < member.roles.length; i++) {
        var roleid = member.roles[i];
        var role = bot.servers[serverID].roles;
        if (role.permissions & 0x8) {
            return true;
        }
    }
    return false;
}

bot.loadRaces = function() {
    logger.debug('Starting race load.');
    var params = {
        Bucket: bucket,
        Key: bucket_key,
    };
    logger.debug('Initiating S3 connection.');
    req = s3.getObject(params, function(err, data) {
        logger.debug('S3 GetObject callback.');
        if (err) {
            logger.error('S3 download - error: ' + err + ' stack: ' + err.stack);
            inconsistent = false;
            return
        }
        logger.debug('S3 download - data: ' + data);

        bot.races = JSON.parse(data.Body);
        for (var server in bot.races) {
            bot.races[server].all_by_hash = {}
            for (var key in bot.races[server].latest) {
                bot.races[server].all_by_hash[bot.races[server].latest[key].hash] = bot.races[server].latest[key];
            }
            for (var i = 0; i < bot.races[server].finished.length; i++) {
                bot.races[server].all_by_hash[bot.races[server].finished[i].hash] = bot.races[server].finished[i];
            }
        }
        inconsistent = false;
        bot.saveRacesBackup('latest_loaded.json');
        bot.saveRaces();
    });
    logger.debug('Request: ' + req);
}

bot.loadRacesBackup = function(bkey) {
    inconsistent = true;
    logger.debug('Starting race load.');
    var params = {
        Bucket: bucket,
        Key: bkey,
    };
    logger.debug('Initiating S3 connection.');
    req = s3.getObject(params, function(err, data) {
        logger.debug('S3 GetObject callback.');
        if (err) {
            logger.error('S3 download - error: ' + err + ' stack: ' + err.stack);
            inconsistent = false;
            return
        }
        logger.debug('S3 download - data: ' + data);

        bot.races = JSON.parse(data.Body);
        for (var server in bot.races) {
            bot.races[server].all_by_hash = {}
            for (var key in bot.races[server].latest) {
                bot.races[server].all_by_hash[bot.races[server].latest[key].hash] = bot.races[server].latest[key];
            }
            for (var i = 0; i < bot.races[server].finished.length; i++) {
                bot.races[server].all_by_hash[bot.races[server].finished[i].hash] = bot.races[server].finished[i];
            }
        }
        inconsistent = false;
        bot.saveRaces();
    });
    logger.debug('Request: ' + req);
}

bot.loadRaces();

bot.saveRaces = function() {
    var data = JSON.stringify(bot.races)
    var params = {
        Bucket: bucket,
        Key: bucket_key,
        Body: data,
    }
    s3.putObject(params, function(err, resp) {
        if (err) {
            logger.error('S3 upload - error: ' + err + ' stack: ' + err.stack);
            return
        }
        logger.debug('S3 upload - data: ' + resp);
    });
}

bot.saveRacesBackup = function(bkey) {
    var data = JSON.stringify(bot.races)
    var params = {
        Bucket: bucket,
        Key: bkey,
        Body: data,
    }
    s3.putObject(params, function(err, resp) {
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


bot.lastRace = function(serverID) {
    var max_ts = 0;
    var race = undefined;
    for (var key in bot.races[serverID].latest) {
        if (bot.races[serverID].latest[key].initiated > max_ts && (bot.races[serverID].latest[key].status == 'starting' || bot.races[serverID].latest[key].status == 'in-progress')) {
            max_ts = bot.races[serverID].latest[key].initiated;
            race = bot.races[serverID].latest[key];
        }
    }
    return race;
}

bot.lastStartingRace = function(serverID) {
    var max_ts = 0;
    var race = undefined;
    for (var key in bot.races[serverID].latest) {
        if (bot.races[serverID].latest[key].initiated > max_ts && bot.races[serverID].latest[key].status == 'starting') {
            max_ts = bot.races[serverID].latest[key].initiated;
            race = bot.races[serverID].latest[key];
        }
    }
    return race;
}

bot.lastFinished = function(serverID) {
    if (bot.races[serverID].finished.length > 0) {
        return bot.races[serverID].finished[bot.races[serverID].finished.length - 1];
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
        if (min_ts === undefined || min_ts > race.finished[key]) {
            min_ts = race.finished[key];
            min_name = key;
        }
    }
    return min_name;
}

bot.findLastFinisher = function(race) {
    var max_ts = undefined;
    var max_name = 'unknown';
    if (race.finished.length == 0) {
        return 'unknown'
    }
    for (var key in race.finished) {
        if (max_ts === undefined || max_ts > race.finished[key]) {
            max_ts = race.finished[key];
            max_name = key;
        }
    }
    return min_name;
}

bot.niceTimeSince = function(start) {
    return bot.niceTimeDiff(start, new Date().getTime());
}

bot.backupProc = function() {
    logger.debug('Starting 10 minute timer for auto-backup');
    setTimeout(function() {
        logger.debug('Executing auto-backup.');
        bot.saveRacesBackup('auto_backup-' + new Date().toISOString() + '.json');
        bot.backupProc();
    }, 10 * 60 * 1000);
}

bot.backupProc();

bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 1) == '.') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        var serverID = bot.channels[channelID].guild_id;
        if (!(serverID in bot.races)) {
            bot.addServer(serverID);
        }
        if (bot.races[serverID].user_data === undefined) {
            bot.races[serverID].user_data = {};
        }
        if (bot.races[serverID].pingrole === undefined) {
            bot.races[serverID].pingrole = null;
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
                        if (bot.races[serverID].pingrole !== null && bot.races[serverID].pingrole !== undefined) {
                            bot.sendMessage({
                                to: channelID,
                                message: '<@&' + bot.races[serverID].pingrole + '> A randomizer race is starting!',
                            });
                        }

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
                    target = args.join(' ').toLowerCase();
                    if (!(target in bot.races[serverID].latest)) {
                        bot.sendError(channelID, userID, 'User ' + target + ' has no active randomizer race.');
                        return;
                    } else {
                        race = bot.races[serverID].latest[target];
                        logger.debug('From directed: ' + race);
                    }
                } else {
                    race = bot.lastRace(serverID);
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
                for (var name in race.finished) {
                    if (name == winner) {
                        continue;
                    }
                    race_data.push(name + ' finished with a time of ' + bot.niceTimeDiff(race.started, race.finished[name]));
                }
                for (var name in race.forfeits) {
                    race_data.push(name + ' forfeited the race at a time of ' + bot.niceTimeDiff(race.started, race.forfeits[name]));
                }
                for (var i = 0; i < race.participants.length; i++) {
                    var name = race.participants[i];
                    if (name == winner || (name in race.finished) || (name in race.forfeits)) {
                        continue;
                    }
                    race_data.push(name + ' is still going or silently quit');
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
                    if (race.participants.length == 0) {
                        bot.sendError(channelID, userID, "You can't start an empty race!");
                        return;
                    }
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
                                    message: '4...',
                                });

                                setTimeout(function() {
                                    bot.sendMessage({
                                        to: channelID,
                                        message: '3...',
                                    });

                                    setTimeout(function() {
                                        bot.sendMessage({
                                            to: channelID,
                                            message: '2...',
                                        });

                                        setTimeout(function() {
                                            bot.sendMessage({
                                                to: channelID,
                                                message: '1...',
                                            });

                                            setTimeout(function() {
                                                bot.sendMessage({
                                                    to: channelID,
                                                    message: tags.join(' ') + ' GO!',
                                                });
                                            }, 1000);
                                        }, 1000);
                                    }, 1000);
                                }, 1000);
                            }, 1000);
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
                    target = args.join(' ').toLowerCase();
                    if (!(target in bot.races[serverID].latest) || bot.races[serverID].latest[target].status != 'starting') {
                        bot.sendError(channelID, userID, 'User ' + target + ' has no starting randomizer race.');
                        return;
                    } else {
                        race = bot.races[serverID].latest[target];
                        logger.debug('From directed: ' + race);
                    }
                } else {
                    race = bot.lastStartingRace(serverID);
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
                bot.insertUserData(serverID, user, race.hash);
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
                bot.removeUserData(serverID, user, race.hash);
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
                logger.debug('Looking for race hash ' + bot.races[serverID].in_race[user]);
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
                bot.makeCacheForUser(bot.getUserData(serverID, user));
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

            case 'setpingrole':
                var member = bot.findMemberData(serverID, userID);
                if (!bot.isServerOrBotAdmin(serverID, member)) {
                    bot.sendError(channelID, userID, "You must be a server admin or bot maintainer to do this.");
                    return;
                }
                if (args.length == 0) {
                    bot.sendError(channelID, userID, 'Role name must be provided.');
                    return;
                }
                var rolename = args.join(' ');
                var role = bot.findRole(serverID, rolename);
                if (role === null) {
                    bot.sendError(channelID, userID, "I can't find that role! (Role must exist before setting)");
                    return;
                } else {
                    bot.races[serverID].pingrole = role;
                    bot.sendTagged(channelID, userID, "Ping role has been set to role " + rolename + " (ID: " + role + ")");
                }
            break;

            case 'clearpingrole':
                var member = findMemberData(serverID, userID);
                if (!isServerOrBotAdmin(serverID, member)) {
                    bot.sendError(channelID, userID, "You must be a server admin or bot maintainer to do this.");
                    return;
                }
                bot.races[serverID].pingrole = null;
                bot.sendTagged(channelID, userID, "Ping role has been removed. Pinging will not occur until it is set again.");
            break;

            case 'grant':
                if (bot.races[serverID].pingrole === null || bot.races[serverID].pingrole === undefined) {
                    bot.sendError(channelID, userID, "I'm not configured with a role to hand out on this server.");
                    return;
                }
                bot.addToRole({
                    serverID: serverID,
                    userID: userID,
                    roleID: bot.races[serverID].pingrole
                }, function(err, response) {
                    logger.debug('addToRole: ' + response + ' / err: ' + err);
                    if (err) {
                        logger.error('addToRole failed: ' + err.statusCode + ' '  + err.statusMessage + ' ' + err.response.code + ' ' + err.response.message);
                        bot.sendTagged(channelID, userID, "I don't appear to be able to grant/remove the pingrole.");
                    } else {
                        rolename = bot.servers[serverID].roles[bot.races[serverID].pingrole].name;
                        bot.sendTagged(channelID, userID, "You have been granted the " + rolename + " role.");
                    }
                });
            break;

            case 'ungrant':
                if (bot.races[serverID].pingrole === null || bot.races[serverID].pingrole === undefined) {
                    bot.sendError(channelID, userID, "I'm not configured with a role to hand out on this server.");
                    return;
                }
                bot.removeFromRole({
                    serverID: serverID,
                    userID: userID,
                    roleID: bot.races[serverID].pingrole
                }, function(err, response) {
                    logger.debug('removeFromRole: ' + response + ' / err: ' + err);
                    if (err) {
                        logger.error('removeFromRole failed: ' + err.statusCode + ' '  + err.statusMessage + ' ' + err.response.code + ' ' + err.response.message);
                        bot.sendTagged(channelID, userID, "I don't appear to be able to grant/remove the pingrole.");
                    } else {
                        rolename = bot.servers[serverID].roles[bot.races[serverID].pingrole].name;
                        bot.sendTagged(channelID, userID, "The " + rolename + " role has been removed from you.");
                    }
                });
            break;

            case 'ping':
                bot.sendTagged(channelID, userID, 'Pong.');
            break;

            case 'debug':
                if (String(userID) == "185071875506962433") {
                    if (args.length == 0) {
                        bot.sendTagged(channelID, userID, "You silly.");
                    }
                    if (args[0] == "resetserver") {
                        if (serverID in bot.servers) {
                            pingrole = bot.servers[serverID].pingrole;
                        }
                        bot.addServer(serverID);
                        bot.servers[serverID].pingrole = pingrole;
                    } else if (args[0] == "pushrace") {
                        ts = new Date(String(args[5])).getTime()
                        bot.races[serverID].latest[args[1]] = {
                            initiator: args[1],
                            hash: args[2],
                            difficulty: args[3],
                            mode: args[4],
                            initiated: args[5],
                            status: args[6],
                            started: args[6] != 'starting' ? args[5] : 0,
                            participants: args[7].split(','),
                            finished: {},
                            forfeits: {},
                            userids: {},
                        }
                    } else if (args[0] == 'reload') {
                        inconsistent = true;
                        bot.loadRaces();
                    } else if (args[0] == 'backup') {
                        bot.saveRacesBackup('manual_backup.json');
                    } else if (args[0] == 'loadbackup') {
                        bot.loadRacesBackup('manual_backup.json');
                    } else if (args[0] == 'say') {
                        bot.sendMessage({
                            to: channelID,
                            message: args.join(' '),
                        });
                    } else if (args[0] == 'testpingrole') {
                        bot.sendMessage({
                            to: channelID,
                            message: '<@&' + bot.races[serverID].pingrole + '> ' + args.join(' '),
                        });
                    } else if (args[0] == 'version') {
                        // revision = subprocess.execSync('git show HEAD --oneline --quiet').toString().trim();
                        // bot.sendTagged(channelID, userID, "I'm running version " + revision);
                        bot.sendTagged(channelID, userID, "todo");
                    } else if (args[0] == 'score') {
                        args.splice(0, 1);
                        var name = args.join(' ');
                        bot.sendTagged(channelID, userID, bot.getUserStats(serverID, user).score);
                    }
                    bot.saveRaces();
                    bot.sendTagged(channelID, userID, "Done.");
                } else {
                    bot.sendTagged(channelID, userID, "Excuse me, what are you doing?");
                }
            break;

            case 'user':
                var target = user;
                if (args.length > 0) {
                    target = args.join(' ');
                }
                var stats = bot.getUserStatsNoCreate(serverID, target);
                if (stats === null) {
                    var sim_name = bot.findSimilar(serverID, target);
                    if (sim_name === null) {
                        bot.sendError(channelID, userID, 'I do not have stats for ' + target + ".");
                    } else {
                        bot.sendError(channelID, userID, 'I do not have stats for ' + target + " - did you mean " + sim_name + "?");
                    }
                } else {
                    var total_played = bot.niceTimeDiff(0, stats.total_time);
                    var average_completion = bot.niceTimeDiff(0, stats.average_time);
                    var data = "Here's the statistics for " + target + ": \n" +
                    'Total games: ' + stats.total_games + '      Games won: ' + stats.won_games + '     Forfeits' + stats.forfeits + '\n'
                    'Total time played: ' + total_played + '\n' +
                    'Average seed completion time: ' + average_completion;
                    bot.sendTagged(channelID, userID, data);
                }
            break;

            case 'leaderboard':
                bot.sendTagged(channelID, userID, 'Todo.');
            break;

            case 'help':
                var mode = 'general'
                var helpcmd = '_'
                var usage = ''
                if (args.length > 0) {
                    mode = args[0];
                    if (mode == 'command') {
                        if (args.length > 1) {
                            helpcmd = args[1];
                        } else {
                            bot.sendError(channelID, userID, "Usage: help command <command name>");
                        }
                    }
                }
                switch (mode) {
                    case 'general':
                        usage = 'List of user commands: \n' +
                        '.help, .create, .get, .getbyhash, .show, .join, .withdraw, .start, .cancel, .done, \n' +
                        '.forfeit, .status, .grant, .ungrant, .clean \n' +
                        'Server admin commands: \n' +
                        '.setpingrole, .clearpingrole \n' +
                        'Help topics: \n' +
                        'general (this), racing, stats, admin \n' +
                        'For more information, use one of the following syntaxes: \n' +
                        '.help <topic>\n' +
                        '.help command <command>.';
                        break;

                    case 'racing':
                        usage = '.create <mode> <difficulty> - Create a new seed. Mode defaults to open, difficulty defaults to normal. \n' +
                        '.join <user> - Join the race created by the provided user. If hash user is provided, join the last created non-running race. You can only join one running race. \n' +
                        '.withdraw - Withdraw your join from a race before it starts. \n' +
                        '.start - Start your race after a 15 second countdown by the bot. \n' +
                        '.cancel - Cancel a race created by you. You cannot cancel finished races. \n' +
                        '.done - Mark your race finished and record your completion time. \n' +
                        '.forfeit - Forfeit your current race. \n' +
                        '.grant - Add yourself to the ping role. Server admin must set a ping role and grant the bot role permissions for this to work. \n' +
                        '.ungrant - Remove yourself from the ping role. Server admin must set a ping role and grant the bot role permissions for this to work.';
                        break;

                    case 'stats':
                        usage = '.get <user> - Get the last non-finished race from the user. When user is not provided, gets the last non-finished race. \n' +
                        '.getbyhash <hash> - Show details of a race by race hash. \n' +
                        '.show <hash> - Shows the data about a finished race. If no raceid is provided, shows the last finished race data. \n' +
                        '.status - Show your current status. \n' +
                        '.user <user> - Get information about user statistics. Omit the name for own statistics. Name is case-sensitive. \n' +
                        '.leaderboard <type> - Display local leaderboard top 10. Defaults to combined type. .help command leaderboard for more info. \n' +
                        '.clean - Use this if the bot does not let you race.';
                        break;

                    case 'admin':
                        usage = 'The following commands can only be used by server or bot administrators.\n' +
                        '.setpingrole - Set the rolename to ping when a new seed is created. \n' +
                        '.clearpingrole - Clear this rolename (do not ping).';
                        break;

                    case 'command':
                        switch(helpcmd) {
                            case '.help':
                            case 'help':
                                'You already appear to know how to use it.';
                                break;
                            case '.debug':
                            case 'debug':
                                'Well, *someone* is asking too many questions.';
                                break;
                            case '.create':
                            case 'create':
                                'Syntax: .create <mode> <difficulty>\n' +
                                'Creates a new seed and notifies the pingrole if configured. This begins preparations for a new race.\n' +
                                'You must join your own seed with .join - by default, you are not a participant in the race!\n' +
                                'Mode and difficulty parameters are not required, if not provided, they will default to open and normal respectively.';
                                break;
                            case '.join':
                            case 'join':
                                'Syntax: .join <name>\n' +
                                'Use this to enter as a participant in a race. You need to do this in order to have your race timed\n' +
                                'and your statistics saved! If you provide a name explicitly, you will attempt to join the race initiated\n' +
                                'by that user. Otherwise, you will join the last created race that has not been started yet, if available.';
                                break;
                            case '.withdraw':
                            case 'withdraw':
                                'Syntax: .withdraw\n' +
                                'Withdraws your participation in a race. You do not gain a statistics penalty for withdrawing.\n' +
                                'This command only has an effect if you are a participant in a race that has not started yet.';
                                break;
                            case '.start':
                            case 'start':
                                'Syntax: .start\n' +
                                'Starts the race that you created. At least one participant must be in the race to do this.\n' +
                                'Starting a race creates a 15 seconds countdown. The timer starts when the GO! message appears.\n' +
                                'All racers will be pinged several times. Once the countdown has started, it cannot be stopped (yet).';
                                break;
                            case '.cancel':
                            case 'cancel':
                                'Syntax: .cancel\n' +
                                'Cancels the race under your name. Races can only be cancelled before they are finished.';
                                break;
                            case '.forfeit':
                            case 'forfeit':
                                'Syntax: .forfeit\n' +
                                'Removes you from the running race and notes your forfeit time. This will apply a penalty to your statistics.\n' +
                                'In races running for longer than 24 hours, all runners who have not completed it will be considered forfeit.\n' +
                                'Races are marked completed if all participants forfeited or if someone finished the race.';
                                break;
                            case '.done':
                            case 'done':
                                'Syntax: .done\n' +
                                'Marks that you have completed the running race and notes your completion time and rank.\n' +
                                'Races are marked completed if all participants forfeited or if someone finished the race.';
                                break;
                            case '.grant':
                            case 'grant':
                                'Syntax: .grant\n' +
                                'Makes the bot grant you the configured role so that you can see pings for races started through the bot.\n' +
                                'Requires that the bot is configured with a role name and an role with permissions for handouts.';
                                break;
                            case '.ungrant':
                            case 'ungrant':
                                'Syntax: .ungrant\n' +
                                'Removes the configured role from you, so you will no longer see pings for races started through the bot.\n' +
                                'Requires that the bot is configured with a role name and an role with permissions for handouts.';
                                break;
                            case '.get':
                            case 'get':
                                'Syntax: .get <user>\n' +
                                'Shows details about an uncompleted race that is tied to the user name. If the name is not provided,\n' +
                                'the last created uncompleted race data will be shown. To show data about completed races, use .show.';
                                break;
                            case '.getbyhash':
                            case 'getbyhash':
                                'Syntax: .getbyhash <hash>\n' +
                                'Retrieves race data by seed hash. Unlike .get, this will show completed races as well.\n' +
                                'The race hash can be seen in most messages related to the race as well as the seed filename.';
                                break;
                            case '.show':
                            case 'show':
                                'Syntax: .show <hash>\n' +
                                'Show the results of a completed race. Cannot be used for starting, in progress or cancelled races.\n' +
                                'Races are marked completed if all participants forfeited or if someone finished the race.';
                                break;
                            case '.status':
                            case 'status':
                                'Syntax: .status\n' +
                                'Shows your current status - race participation - according to the bot.\n' +
                                'If you think this is incorrect, you can use .clean to reset your status.';
                                break;
                            case '.clean':
                            case 'clean':
                                'Syntax: .clean\n' +
                                'Fixes your broken status, if it is indeed broken. May be necessary if the bot does not let you race.\n' +
                                'Note that if you clean yourself while the bot considers you in a race, you will not be able to interact\n' +
                                'with that race anymore and will receive a forfeit status after the time limit (24h).';
                                break;
                            case '.user':
                            case 'user':
                                'Syntax: .user <user>\n' +
                                'Shows combined user statistics about the named user on this server. If no name is provided, your own stats are shown.\n' +
                                'Case-sensitive.';
                                break;
                            case '.leaderboard':
                            case 'leaderboard':
                                'Syntax: .leaderboard <type>\n' +
                                'Shows top 10 leaderboards for this server in the named category. Leaderboards only take races with at least 2 participants into account.\n' +
                                'In the future, races will have a weight in the leaderboard that accounts for participant count and relative score.\n' +
                                'Types/categories:\n' +
                                'combined (default): Leaderboard score is based on winrate and average completion time, ties are broken by race count.\n' +
                                'winrate: Leaderboard is primarily sorted by winrate, ties are broken by average completion time then race count.\n' +
                                'wins: Leaderboard is sorted by total wins, ties are broken by average completion time then race count.\n ' +
                                'fastest: Leaderboard is sorted by average completion time, ties are broken by winrate.';
                                break;
                            case '.setpingrole':
                            case 'setpingrole':
                                'Syntax: .setpingrole <rolename>\n' +
                                'Configures the bot to ping a specifically named role whenever new races are starting.\n' +
                                'The role must exist before configuring the bot.\n' +
                                'If this configuration is set and the bot has a role that can hand out the pingrole, it can automatically\n' +
                                'grant and remove that role from users using the .grant and .ungrant commands. \n' +
                                '*Admin command*: This command can only be executed by server or bot administrators.';
                                break;
                            case '.clearpingrole':
                            case 'clearpingrole':
                                'Syntax: .clearpingrole\n' +
                                'Unconfigures the ping role of the bot. The bot will not ping a role when a new race is started.\n' +
                                'It will also no longer respond to .grant and .ungrant unless reconfigured with a role.\n' +
                                '*Admin command*: This command can only be executed by server or bot administrators.';
                                break;
                        }

                    break;


                }

                bot.sendTagged(channelID, userID, usage);
            break;
         }
     }
});