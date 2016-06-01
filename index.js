var Botkit = require('botkit')

var token = process.env.SLACK_TOKEN

var loc = null;
var time = null;
var limit = null;

var controller = Botkit.slackbot({
  // reconnect to Slack RTM when connection goes bad
  retry: Infinity,
  debug: false
})

// Assume single team mode if we have a SLACK_TOKEN
if (token) {
  console.log('Starting in single-team mode')
  controller.spawn({
    token: token
  }).startRTM(function (err, bot, payload) {
    if (err) {
      throw new Error(err)
    }

    console.log('Connected to Slack RTM')
  })
// Otherwise assume multi-team mode - setup beep boop resourcer connection
} else {
  console.log('Starting in Beep Boop multi-team mode')
  require('beepboop-botkit').start(controller, { debug: true })
}

controller.on('bot_channel_join', function (bot, message) {
  bot.reply(message, "I'm here!")
})

controller.hears(['hello', 'hi'], ['direct_mention'], function (bot, message) {
  bot.reply(message, 'Hello.')
})

controller.hears(['hello', 'hi'], ['direct_message'], function (bot, message) {
  bot.reply(message, 'Hello.')
  bot.reply(message, 'It\'s nice to talk to you directly.')
})

controller.hears('.*', ['mention'], function (bot, message) {
  bot.reply(message, 'You really do care about me. :heart:')
})

controller.hears('help', ['direct_message', 'direct_mention'], function (bot, message) {
  var help = 'I will respond to the following messages: \n' +
      '`bot hi` for a simple message.\n' +
      '`bot attachment` to see a Slack attachment message.\n' +
      '`@<your bot\'s name>` to demonstrate detecting a mention.\n' +
      '`bot help` to see this again.'
  bot.reply(message, help)
})

controller.hears(['attachment'], ['direct_message', 'direct_mention'], function (bot, message) {
  var text = 'Beep Beep Boop is a ridiculously simple hosting platform for your Slackbots.'
  var attachments = [{
    fallback: text,
    pretext: 'We bring bots to life. :sunglasses: :thumbsup:',
    title: 'Host, deploy and share your bot in seconds.',
    image_url: 'https://storage.googleapis.com/beepboophq/_assets/bot-1.22f6fb.png',
    title_link: 'https://beepboophq.com/',
    text: text,
    color: '#7CD197'
  }]

  bot.reply(message, {
    attachments: attachments
  }, function (err, resp) {
    console.log(err, resp)
  })
})


// ToDo
controller.hears(['todo'], 'direct_message', function(bot,message) {
  var todo = '`Hook into OpenTable.`\n' +
    '`switch from Group message to private message.`\n' +
    '`send global message to a specific group to say there is a new lunch spot.`\n' +
    '`get a private message when someone joins your lunch group.`\n' +
    '`set a random meeting spot.`\n' +
    '`allow for the choice to randomly pick a place.`\n' +
    '`don\'t allow for a creator to join another group.`\n' +
    '`allow cancling of a group.`\n' +
    '`create logic checks.`'

  bot.reply(message,todo);
});



// Start Group Lunch
controller.hears(['gl'], 'direct_message', function(bot,message) {
  // start a conversation to handle this response.
  bot.startConversation(message,function(err,convo) {
    askPlace(message, convo);
  })
});

function askPlace(response, convo) {
  convo.ask('Where are you going?', function(response, convo) {
    loc = response.text;
    askTime(response, convo);
    convo.next();
  });
}

function askTime(response, convo) {
  convo.ask('What time do you want to go?', function(response, convo) {
    time = response.text;
    askLimit(response, convo);
    convo.next();
  });
}

 function askLimit(response, convo) {
  convo.ask('What is your person limit?', function(response, convo) {
    limit = response.text;
    writeData(response, convo);
    convo.next();
  });
}

 function writeData(response, convo) {
  var available = limit - 1;
  controller.storage.users.save({id:response.user, loc:loc, time:time, limit:limit, available:available, init:true}, function(err) {
    if (err) {
      convo.say('failed to save Limit: ' + err);
    }
  });

  convo.say('Your lunch group has been started');
  convo.next();
}



// Check Available potentials
controller.hears(['list'], 'direct_message', function(bot, message) {
  bot.startConversation(message, function(err, convo) {
    listGroup(message, convo, false);
  })
});

// Check Available potentials
controller.hears(['join'], 'direct_message', function(bot, message) {
  bot.startConversation(message, function(err, convo) {
    listGroup(message, convo, true);
  })
});

function listGroup(response, convo, chooseGroup) {
  var index = null
  controller.storage.users.all(function(err, all_user) {
    Object.keys(all_user).forEach(function(key, index) {
      INDEX = index;
      controller.storage.users.get(key, function(err, user) {
        convo.say(INDEX + ')  [Location: ' + user.loc + '] [Time: ' + user.time + '] [Slots: ' + user.available + '/' + user.limit + ']');
      });
    });
  });

  if (chooseGroup) {
    askAddGroup(response, convo);
  }
  convo.next
}

function askAddGroup(response, convo) {
  convo.ask('Which group do you want to join?', function(response, convo) {
    var choice = response.text;

    controller.storage.users.all(function(err, all_user) {
      Object.keys(all_user).forEach(function(key, index) {
        convo.say('key: ' + key)
        if (choice == index ) {
          controller.storage.users.get(key, function(err, user) {
            var available = user.available - 1;
            convo.say('You\'ve joined:\n[Location: ' + user.loc + '] [Time: ' + user.time + ']');
            controller.storage.users.save({id:key, loc:loc, time:time, limit:limit, available:available}, function(err) {
              if (err) {
                convo.say('failed to save new group: ' + err);
              }
            });
          });
        }
      });
    });

    convo.next();
  });
}



// Check Available potentials
controller.hears(['cancel'], 'direct_message', function(bot, message) {
  bot.startConversation(message, function(err, convo) {
    cancelGroup(message, convo);
  })
});

function cancelGroup(response, convo) {
  convo.ask('Are you sure you want to cancel?', function(response, convo) {
    if ( response.text == "yes" ) {
      controller.storage.users.save({id:response.user, undefined}, function(err) {
        if (err) {
          convo.say('failed to save cancled Group: ' + err);
        }
        convo.say('Group Canceled');
      });
    }
    convo.next();
  });
}

controller.hears('.*', ['direct_message', 'direct_mention'], function (bot, message) {
  bot.reply(message, 'Sorry <@' + message.user + '>, I don\'t understand. \n')
})
