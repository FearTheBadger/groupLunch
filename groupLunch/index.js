var loc = null;
var time = null;
var limit = null;
var cont = null;

// ToDo
exports.todo = function(bot,message) {
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
}

exports.askPlace = function(response, convo, controller) {
  cont = controller
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
  cont.storage.users.save({id:response.user, loc:loc, time:time, limit:limit, available:available, init:true}, function(err) {
    if (err) {
      convo.say('failed to save Limit: ' + err);
    }
  });

  convo.say('Your lunch group has been started');
  convo.next();
}


exports.listGroup = function(response, convo, chooseGroup, controller) {
  var index = null
  var tmp_avail = 0
  var tmp_limit = 0
  cont = controller
  cont.storage.users.all(function(err, all_user) {
    Object.keys(all_user).forEach(function(key, index) {
      INDEX = index;
      cont.storage.users.get(key, function(err, user) {
        tmp_avail = user.available;
        tmp_limit = user.limit;
        if (user.available > 0 && user.limit > 0) {
          convo.say(INDEX + ')  [Location: ' + user.loc + '] [Time: ' + user.time + '] [Slots: ' + user.available + '/' + user.limit + ']');
          convo.next
        }
      });
    });
  });

  if (tmp_avail <= 0 || tmp_limit <= 0) {
    convo.say('Sorry, nothing is available.\n\nYou should `glstart` to create a group.');
    convo.next
  }

  if (chooseGroup && tmp_avail > 0 && tmp_limit > 0) {
    askAddGroup(response, convo);
  }
}

function askAddGroup(response, convo) {
  convo.ask('Which group do you want to join?', function(response, convo) {
    var choice = response.text;

    cont.storage.users.all(function(err, all_user) {
      Object.keys(all_user).forEach(function(key, index) {
        if (choice == index ) {
          cont.storage.users.get(key, function(err, user) {
            var available = user.available - 1;
            convo.say('You\'ve joined:\n[Location: ' + user.loc + '] [Time: ' + user.time + ']');
            cont.storage.users.save({id:key, loc:loc, time:time, limit:limit, available:available}, function(err) {
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

exports.cancelGroup = function(response, convo) {
  convo.ask('Are you sure you want to cancel?', function(response, convo) {
    if ( response.text == "yes" ) {
      cont.storage.users.save({id:response.user, loc:undefined, time:undefined, limit:0, available:0}, function(err) {
        if (err) {
          convo.say('failed to save cancled Group: ' + err);
        }
        convo.say('Group Canceled');
      });
    }
    convo.next();
  });
}
