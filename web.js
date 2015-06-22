var express = require('express');
var pg = require('pg').native;
var connectionString = process.env.DATABASE_URL;
var start = new Date();
var port = process.env.PORT;
var client;
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var password = require('password-hash-and-salt');         
var path = require('path');                                                           
var randtoken = require('rand-token');



client = new pg.Client(connectionString);
client.connect();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname +'/www'));
app.use(cors());


app.post('/logout',function(req,res){
    tokenAllowed(req.body.token,function(ok){
    if(ok){
      doLogOut(req,res);
    }
    else{
      noToken(req,res);
    }
  });                              
});

app.get('/seqtok',function(req,res){
  tokenAllowed(req.query.token,function(ok){
    if(ok){
      doseqTok(req,res);
    }
    else{
      noToken(req,res);
    }
  });                              
});

app.post('/newUser',function(req,res){

  var un = req.body.username;
  var pw = req.body.password;


  var query = client.query('SELECT COUNT(username) FROM users u WHERE u.username = $1', [un]);

  var count;
  query.on('row',function(result){
    count = result.count;
  });

  query.on('end',function(){
      if(count == 0){
        encrypt(pw,function(epw){
          var query2 = client.query('INSERT INTO users(username,password) VALUES($1,$2)',[un,epw]);
          query2.on('end',function(){
           res.writeHead(200);
           res.write('signup succesful');
           res.end();
          });
        });
      }
    else{
      res.write('User with this Username already exists!');
      res.end();
    }
  });



});


app.post('/login',function(req,res){
  var un = req.body.username;
  var pw = req.body.password;

  verifyCredentials(un,pw,function(verified){
    if(!verified){
      res.write('unauthorized login!');
      res.end();
    }
    else{
      var token = giveMeAToken();
      var queryTokenInsert = client.query('INSERT INTO validTokens(token) VALUES($1)',[token]);
      queryTokenInsert.on('end',function(){
        var setUserToken = client.query('UPDATE users SET token = $1 WHERE username = $2',[token,un]);
        setUserToken.on('end',function(){
          res.writeHead(200);
          res.write(token);
          res.end();
        });
      });
    }



  });


});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function doseqTok(req,res){
  var token = giveMeAToken();

  var query = client.query('INSERT INTO validTokens(token) VALUES($1)', [token],function(){
        res.writeHead(200);
        res.write(token);
        res.end();
  });
  query.on('end',function(){
    removeActiveToken(req.query.token,function(){
      return token;
    });
  });
  
}

function encrypt(given,callback){
  password(given).hash(function(error, hash) {
      if(error){
        throw new Error('Something went wrong!');
      }
      callback(hash);
  });
}


function verifyCredentials(givenUsername,givenPassword,callback){

  var query = client.query('SELECT password FROM users u WHERE u.username = $1',[givenUsername]);

  var storedHash;

  query.on('row',function(result){
    storedHash = result.password;
    //IF !result ?? 
  });

  query.on('end',function(){
      if(storedHash == null){
        callback(false);
      }
      password(givenPassword).verifyAgainst(storedHash, function(error, verified) {
        if(error)
            throw new Error('Something went wrong!');
        if(!verified) {
            callback(false);
        } else {
            callback(true);
        }
      });
  });
}



function giveMeAToken(given){
  var token = randtoken.generate(16);

  return token;
}

function tokenAllowed(given,callback){
  query = client.query('SELECT COUNT(token) FROM validTokens v WHERE v.token = $1',[given]);

  var count = 0;
  query.on('row',function(result){
    count = result.count;
  });

  query.on('end',function(){
    if(count != 0){                 
      callback(true);
    }
    else{
      callback(false);
    }
  });

}

function removeActiveToken(given,callback){
  query = client.query('DELETE FROM validTokens WHERE token = $1',[given]);
  query.on('end',function(){
    var removeUserToken = client.query('UPDATE users SET token = $1 WHERE username = $2',["absent",given]);
    removeUserToken.on('end',function(){
        callback();
    });
  });
}

function noToken(req,res){ 
  res.send('Invalid Access token!');
}

function doLogOut(req,res){
  removeActiveToken(req.query.token,loggedOut(req,res));
}

function loggedOut(req,res){
  res.write('logout succesful');
  res.end();
}





// use PORT set as an environment variable
var server = app.listen(process.env.PORT, function() {
    console.log('Listening on port %d', server.address().port);
});