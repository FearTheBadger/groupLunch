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
