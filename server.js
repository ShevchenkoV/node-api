// BASE SETUP
// ======================================
// CALL THE PACKAGES --------------------
var express= require('express'), 
	app = express(); 
var bodyParser = require('body-parser'); 
var morgan = require('morgan'); 
var mongoose = require('mongoose'); 
var port = process.env.PORT || 8080; 

mongoose.connect('mongodb://localhost/test');
var User = require('./app/models/user.js');

var jwt = require('jsonwebtoken');
var secret = '123asd';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
	next();
});
// log all requests to the console
app.use(morgan('dev'));

app.get('/', function(req, res) {
	res.send('Welcome to the home page!');
});

var apiRouter = express.Router();

	apiRouter.use(function(req, res, next) {
		console.log('Somebody just came to our app!');
		next(); 	
	});

	apiRouter.get('/', function(req, res) {
		res.json({ message: 'hooray! welcome to our api!' });
	});

	apiRouter.route('/users')	
		.post(function(req, res) {
			var user = new User();

			user.name = req.body.name;
			user.username = req.body.username;
			user.password = req.body.password;

			user.save(function(err) {
				if (err) {
					if (err.code == 11000)
						return res.json({ success: false, message: 'A user with that username already exists. '});
					else
						return res.send(err);
				}
				res.json({ message: "message" });
			})

		})
		.get(function(req, res){
			User.find(function(err, users) {
				if (err) res.send(err);
				res.json(users);
			});
		});

	apiRouter.route('/users/:user_id')
		.get(function(req, res) {
			User.findById(req.params.user_id, function(err, user) {
				if (err) res.send(err);
				res.json(user);
			});
		})
		.put(function(req, res){
			User.findById(req.params.user_id, function(err, user){
				if(err) res.send(err);

				if(req.body.name) user.name = req.body.name;
				if(req.body.username) user.username = req.body.username;
				if(req.body.password) user.password = req.body.password;

				user.save(function(err){
					if(err) res.send(err);
					res.json({message : 'User updated!'});
				});
			});
		})
		.delete(function(req, res){
			User.remove({
				_id:req.params.user_id
			},function(err, user){
				if(err) return res.send(err);
				res.json({message:'deleted'});
			});
		});
	apiRouter.post('/authenticate', function(req,res){
		User.findOne({
			username: req.body.username
		}).select('name username password').exec(function(err, user){
			if(err) throw err;

			if(!user){
				res.json({
					success: false,
					message: 'User not found'
				});

			} else if(user){

				var validPassword = user.comparePassword(req.body.password);
				if(!validPassword){
					res.json({
						success: false,
						message: 'Wrong pass'
					});
				} else {
					var token = jwt.sign({
						name: user.name,
						username: user.username
					}, secret, {
						expiresInMinutes: 1440
					});

					res.json({
						success: true,
						message: 'token created',
						token: token
					});
				}
			}
		});
	});

	apiRouter.use(function(req, res, next){
		var token = req.body.token || req.param('token') || req.headers['x-access-token'];

		if(token) {
			jwt.verify(token, secret, function(err, decoded){
				if(err) {
					return res.status(403).send({
						success: false,
						message: 'Filed to authenticate token'
					});
				} else {
					req.decoded = decoded;

					next();
				}
			});
		} else {
			return res.status(403).send({
				success: false,
				message: 'No token provided'
			});
		}
	});

app.use('/api', apiRouter);

app.listen(port);
console.log('port: ' + port);