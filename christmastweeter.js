/* Import required modules */
var config = require('config');		// Module to standardize config information
var Twit = require('twit');			// Twitter API module for REST and Streaming calls
var caption = require('caption');	// Module to put captions on images
var fs = require('fs');				// File System functionality 
var oauth = require('oauth');		// OAuth module to interact with the Twitter file upload API

/* Pull in the configuration data */
var twitcreds = config.get('Twitter');
var meme = config.get('Meme');

/* Create the handlers */
var T = new Twit(twitcreds);	// Create a new Twitter Handler with the API credentials
var oa = new oauth.OAuth(		// Create a new OAuth Handler to handle the media uploads
	'https://twitter.com/oauth/request_token', 
	'https://twitter.com/oauth/access_token',
	twitcreds.consumer_key,
	twitcreds.consumer_secret,
	'1.0',
	'https://github.com/bladow/christweet/wiki',
	'HMAC-SHA1'
);
var stream = T.stream('user');	// Get a stream for the Twitter "user" stream API

/* Stream Event on new direct messages */
stream.on('direct_message', function(directMsg){
	if(/#moo/.test(directMsg.direct_message.text)){		// RegEx test to see of the sender included a #moo tag in the DM
		//console.log("It's a Moo! Thanks " +  directMsg.direct_message.sender.screen_name + "!");
		fs.readdir('./roo/', function(err,files){	// Iterate through the base image files
			var index = Math.floor(Math.random() * files.length);	// Get a random index to one of the pictures in the directory
			var input = meme.input + files[index];	// Set the input file for captioning from the base files
			var stamp = new Date();	// Pull a date object
			var output = meme.output + files[index] + stamp.toISOString(); // Set the output file and append the date object as a ISO string
			//console.log("Input: " + input); // Print out the input file

			/* Apply a caption to the file */
			caption.path(input,{	// Put a caption on the chosen image and output it
				caption : 'Moo to you @' + directMsg.direct_message.sender.screen_name + '.', // Address the picture to the twtter handle of the sender
				bottomCaption : meme.message, // Set a pretty christmas message
				outputFile : output // Set the output - Could probably do this as a stream buffer, but want to hold the file for postarity
			}, function(err,filename){ // Callback function for the captioning
				//console.log("Meme file: " + filename); // Print out the name of the made meme file
				var base = fs.readFileSync(filename,'base64'); // Read in the meme as a base64 String
				var returnStatus = '@' + directMsg.direct_message.sender.screen_name + ' Moo! '; // Construct the Status message to address the user
				/* Post a the new media file to the Twitter Upload service */
				oa.post('https://upload.twitter.com/1.1/media/upload.json', twitcreds.access_token, twitcreds.access_token_secret, {media:base} ,'' , function (err, data, res){
					if (err) {
						console.error('Upload failure to the Twitter Upload service, service says : ');
						console.error(err);
					}else {
						try{
							data = JSON.parse(data);
						}catch (err){
							console.error('Error Json : ' + err);
						}
						//console.log(data.media_id_string);
						T.post('statuses/update',{status:returnStatus, media_ids:[data.media_id_string]},function(err,data,response){	// Post the new message, include the pointer to the new media file
							if(err){
								console.error('Error Update : ' + err);
							}else{
								//console.log("Data : " + data);
								//console.log("Response : " + response);
							}//if(err){}else
						});//T.post('statuses/update')
					}// oa.post( if(err){}else
				});//oa.post()
			});//caption.path
		});//fs.readdir()
	}//if(/#moo/
});//stream.on(directmessage)
