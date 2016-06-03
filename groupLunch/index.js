var loc = null;
var time = null;
var limit = null;
var cont = null;

// ToDo
exports.todo = function(bot, message) {
  var todo = '* Hook into OpenTable.\n' +
    '* setup public message for notifications and list of available choices.\n' +
    '* switch to private message for joining.\n' +
    '* send global message to a specific group to say there is a new lunch spot.\n' +
    '* get a private message when someone joins your lunch group.\n' +
    '* create and set a random meeting spot.\n' +
    '* get a private message on where to meet.\n' +
    '* allow for the choice to randomly pick a place.\n' +
    '* don\'t allow for a creator to join any group.\n' +
    '* fix cancel so that you either leave a group, cancel the group, or it does nothing.\n' +
    '* create a reminder timer if there are available slots with N minutes before departure time\n' +
    '* create logic/error checks.'

  bot.reply(message,todo);
}

exports.cmds = function(bot, message) {
  var cmds = '`gladd` Add a new Group Lunch.\n' +
    '`gllist` List out the current available Groups.\n' +
    '`gljoin` Join one of the current Groups.\n' +
    '`glcancel` Cancel the current group you are in.\n' +
    '`gltodo` List all of the things still to be done.\n' +
    '`help` Print this statement.\n'
  bot.reply(message,cmds);
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
  convo.ask('What is the max desired group size?', function(response, convo) {
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
    convo.say('Sorry, nothing is available.\n\nYou should `gladd` to create a group.');
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
          convo.say('failed to save canceled Group: ' + err);
        }
        convo.say('Group Canceled\n\n There are several people who you have now made cry.');
      });
    } else {
      convo.say('Good you would have made the rest of the group sad.')
    }
    convo.next();
  });
}
