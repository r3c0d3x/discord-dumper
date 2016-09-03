var config = require('./config.json');
var discord = require('discord.js');
var async = require('async');
var client = new discord.Client();
var util = require('util');
var fs = require('fs');

client.on('ready', function() {
    var channels = client.channels.getAll('type', 'text');
    var contentReplacements = [];
    channels.forEach(function(channel) {
        contentReplacements.push({ pattern: new RegExp('<#' + channel.id + '>'), channel: '#' + channel.name })
    });
    async.eachSeries(channels, function(channel, cb) {
        if (channel.name != config.channel) {
            cb();
            return;
        }
        
        var previous = 0;
        var logs = [];
        var previousMsg = undefined;
        async.doUntil(function(cb2) {
            setTimeout(function() {
                client.getChannelLogs(channel, 100, previousMsg, function(err, msgs) {
                    if (err)
                        cb2(err);
                    previous = msgs.length;
                    if (previous == 100)
                        previousMsg = { before: msgs[99] };
                    
                    msgs.forEach(function(msg) {
                        var content = msg.cleanContent;
                        var output = config.format;
                        contentReplacements.forEach(function(replace) {
                            content = content.replace(replace.pattern, replace.channel);
                        });
                        output = output.replace(/%m/g, msg.content);
                        output = output.replace(/%M/g, msg.cleanContent);
                        output = output.replace(/%u/g, msg.author.username);
                        output = output.replace(/%d/g, msg.author.discriminator);
                        output = output.replace(/%t/g, new Date(msg.timestamp).toISOString());
                        output = output.replace(/%i/g, msg.author.id);
                        output = output.replace(/%I/g, parseInt(msg.author.id).toString(36));
                        output = output.replace(/%T/g, msg.timestamp);
                        output = output.replace(/%c/g, channel);
                        logs.push(output);
                    });
                    cb2();
                });
            }, 1000);
        }, function() {
            return 100 > previous;
        }, function(err) {
            if (err)
                cb(err);
            logs.reverse();
            fs.writeFileSync(config.filename, logs.join('\n'));
            cb();
        });
    }, function(err) {
        if (err)
            throw err;
        
        console.log('Finished.');
        process.exit(0);
    });
});

client.login(config.username, config.password, function(err, token) {
    console.log(err);
    process.exit(0);
});