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


var server = app.listen(process.env.PORT, function() {
    console.log('Listening on port %d', server.address().port);
                                                                
});








/*



// use the express middleware
var express = require('express');

// make express handle JSON and other requests
var bodyParser = require('body-parser');

// use cross origin resource sharing
var cors = require('cors');

var passwordHash = require('password-hash-and-salt'); 
// instantiate app
var app = express()
  , pg = require('pg').native
  , connectionString = process.env.DATABASE_URL
  , client
  , query;

client = new pg.Client(connectionString);
client.connect();

// make sure we can parse JSON
//app.use(bodyParser.urlencoded());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(express.static(__dirname));

// make sure we use CORS to avoid cross domain problems
app.use(cors());

app.get('/' , function(req, res){
     res.sendfile('index.html');

});
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/rank', function (req,res){
query = client.query('SELECT username , totalpoints, points_lvl FROM rank ORDER BY totalpoints DESC') ;
var alluser =[];
query.on('row', function (result){
var user ={
username : "",
totalpoints: 0 

} ; 
user.username = result.username;
user.totalpoints = result.totalpoints;
user.points_lvl = result.points_lvl ; 
alluser.push(user) ; 
});

query.on('err', function(err){
res.statusCode =  503 ; 
console.log("503 : ERROR "+ err.message );
return res.send( "503 : ERROR"); 
})

query.on('end', function(){
if(alluser.length < 1 ){
res.statusCode =404 ; 
console.log ("404 : NOT FOUND");
res.return ("404 : NOT FOUND");
res.end() ; 
}else {
res.statusCode = 200 ; 
console.log("SUCCESS RETRIEVING FROM DATABASE");
return res.send(alluser) ; 

}

});

});

////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/user/:username', function (req,res){
if(!req.params.username ){
console.log("NEED USERNAME");
res.statusCode = 400 ;
return res.send('Error 400 : USERNAME not specified'); 
}
var count =-1 ;
var user ={
username : req.params.username,
totalpoint : 0 ,
points_lvl : [10],
best : [10]
}
query = client.query('SELECT COUNT(*) AS COUNT ,TOTALPOINTS, USERNAME , POINTS_LVL , LVL_BEST FROM RANK WHERE USERNAME=$1 GROUP BY USERNAME', [user.username]);
query.on('row', function(result){
if(result){
count = result.count;
user.totalpoint = result.totalpoints;
user.points_lvl =result.points_lvl;
user.best = result.lvl_best;
res.statusCode =200 ;
console.log("RETRIEVE SUCCESS AT GET USER") ;
return res.send(user) ; 
}
});
query.on('err', function(err){
if(err){
res.statusCode =503;
console.log("ERROR" + err.message);
return res.send("503 : ERROR");
}

});
query.on('end', function(){
if(count == -1 ){
console.log("USER NOT FOUND");
res.statusCode =404 ;
return res.send("404: USERNOT FOUND");
}
res.end() ;
});

});


///////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/pointsAtlevel/:lvl', function (req, res){

if(!req.body.hasOwnProperty('username') || req.params.lvl < 0 || req.params.lvl>10 ){
console.log( "please specify what lvl need") ;
res.statusCode = 400;
return res.send('Error 400: BAD REQUEST , Post syntax incorrect.');
}

var obj  = {
username : req.body.username,
};
 
query = client.query('SELECT POINTS_LVL [$1] AS points, COUNT(username)  FROM RANK WHERE username = $2 GROUP BY POINTS_LVL[$1]',[req.params.lvl, obj.username]);
var returnPoint = -1  ; var  p = -1 ; 
query.on('row', function (result){
if (result) {
returnPoint = result.count ;
p  = result.points ;
if(result.count != 0 ) {
console.log("suceess"+ result.points) ;
return res.send(result.count) ;
}else {
console.log("404 : NOT FOUND"); return res.send("404: CAN NOT FIND USER WITH GIVEN USER NAME");
}
 
} 
});

query.on('error', function(err){
res.statusCode = 503 ; 
console.log(err.message) ; 
return res.send("503 : ERROR") ; 
});

query.on('end', function(){
if(returnPoint == -1 ) {
console.log("404 : NOT FOUND");
res.statusCode = 404 ;
return res.send("404: NOT CANT FIND USERNAME");}
res.end() ; 
});

});
////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/update/:lvl' , function (req, res){
if(!req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('point') || !req.params.lvl > 0){
console.log( "please specify what lvl need to update") ;
res.statusCode = 400;
return res.send('Error 400: Post syntax incorrect.');

}  
var obj  = {
username : req.body.username,
point : req.body.point, 
level : req.params.lvl
};
// assuming the username is correct that why it can do the updating

query = client.query('SELECT count(username) , lvl_best[$1] AS best FROM rank WHERE username = $2 GROUP BY lvl_best[$1]',[obj.level, obj.username]);
var count = -1  ; var best =  0 ; 
query.on('row', function(result){
count = result.count ; 
best = result.best ;
});

query.on('err' , function(err){
res.statusCode = 503  ;
console.log( "ERROR :  "+ err.message) ;
return res.send("503 : ERROR");
});

query.on('end', function(){
if(count == -1 ) {
//res.statusCode = 404 ;
console.log ( "404 : USERNAME NOT FOUND") ; 
return res.send("404 : USERNAME NOT FOUND"); 
}else {
   if(best >= obj.point){res.statusCode=200; console.log("DO NOT NEED TO UPDATE"); res.send("200 : DO NOT NEED TO UPDATE") ; }	
   else {
	client.query('UPDATE rank SET points_lvl[$1] = $2, lvl_best[$1]=$2 , totalpoints = totalpoints + $3 WHERE username=$4',[obj.level,obj.point,(obj.point-best),obj.username],function (err){
                if(err) {console.log( "err :"+err.message) ; res.statusCode = 503 ; return res.send ("503 : Error at UPDATE" ) ; }  
		console.log("UPDATED");
		res.statusCode = 200 ; 
		return res.send("200 : UPDATE") ; 	
	
	      }); 
        

	}
}
//res.end() ;
});

/*query = client.query('SELECT lvl_best[$1] AS best FROM rank WHERE username = $2', [req.params.lvl, obj.username]);  
query.on("err", function(err) {
console.log("select error");
return res.send("error: ", err.message);
})

query.on("row", function(result){
 if(!result){console.log("!result") ;  res.send("NO"); }
 else {
    if(result.best < obj.point) { console.log("result.best < point") ; 
       client.query ('UPDATE rank SET points_lvl[$1] = $2, lvl_best[$1]= $2, totalpoints = totalpoints + $3 WHERE username =$4',[req.params.lvl, obj.point,(obj.point-result.best),obj.username ], 
function(err){
       if(err){console.log(err.message) ; res.send(err.message) ;}	
       console.log("updated"); 
       res.send( 'UPDATED' ) ;	

       });
    }//if--
    else { console.log ("do not need to update ") ; res.send ('Do not need to update') ;}


 }//else--


 });//query--
*/

});
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
app.post ('/createAdmin' , function(req,res){
/*var usr = [
        {username : 'seng', password : 'invalid'},
        {username : 'seng1', password : 'invalid1'},
        {username : 'seng2', password : 'invalid2'},
        {username : 'seng3', password : 'invalid3'}

];*/



passwordHash('invalid').hash(function(error, hash) {
    if(error)
        throw new Error('Something went wrong!');
    // Store hash (incl. algorithm, iterations, and salt) 
    var userhash = hash;
    for (var id = 0 ; id < 4 ; id++ ){
    query = client.query('INSERT INTO userloginHash (username ,hash) VALUES($1, $2)', ['seng'+id, userhash]);//, function (err){
    } //if(err) { console.log("error in inserting"+ err.message); res.send(err.message) ; }
    
});	
console.log ("hash in DB");
res.redirect ('/');
});


app.post('/login', function(req,res){
var user =  {
username: req.body.username ,
password : req.body.password
};

query = client.query ( 'SELECT count(*) as count ,  hash FROM userloginHash WHERE username = $1 group by hash ',[user.username ], function(err,results) {

	if(err) { console.log( "sth went wrong and select" + err.message ) ; res.redirect ('/'); }
	if(!results) { console.log(" null "); res.redirect('/'); }
});
query.on('row', function( result){ 
	if(result == null) res.redirect('/');
	if(!result ){ res.statusCode = 404; console.log("invalid username or password"); res.redirect('/'); }
        else {console.log("result ------------------" + result.count) ; 
	  // if(results.length < 1 ) {console.log ("result is 0 ") ; res.statusCode = 404 ; res.redirect('/');}
		passwordHash(user.password).verifyAgainst(result.hash, function(error, verified) {
		if(error){ console.log("Error comparing hash : "+  error.message); res.statusCode = 400 ; res.redirect('/') ;}
		if(!verified){ console.log("Invalid password");  res.write('unauthorized login!'); res.end();} //res.redirect('/') ; } 
		else { console.log("Got verified but still need to update" );
	            query= client.query( 'UPDATE userloginHash SET login = true WHERE username = $1 ' , [user.username], function (err) {
          		 if(err) {
               			 console.log('err at update' + err.message);
               			 res.statusCode =404 ;
				 res.redirect('/');
          		 }else {
               			 console.log('login');
             		         res.statusCode =200 ; 
				 //res.setHeader('accessToken', 'welcome to the nothing site');  
             		         res.send("OK");
          		 } 

        	     });//




		}

	   });		
	}


});


});
// hasnt work yet 
app.get('/tokenTest', function (req, res){
if(req.headers.accessToken != 'welcome to the nothing site'){res.statusCode =401 ; res.send('Unauthorize'); }
else { res.statusCode =200 ; res.send('What the secret') ; }
});



// use PORT set as an environment variable
var server = app.listen(process.env.PORT, function() {
    console.log('Listening on port %d', server.address().port);
                                                                
});



*/
