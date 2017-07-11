require("./config.js");
const _ = require("lodash");
const fs = require("fs");
const http = require('http');
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const sharp = require("sharp");

var {mongoose} = require("./db/mongoose.js");
var {Image} = require("./models/image.js");
const {ObjectID} = require("mongodb");

var app = express();
const port = 3000;

app.use(bodyParser.json());

var storeImageIntoMongo = function(file) {
  sharp(file)
    .resize(320, 240)
    .embed()
    .toBuffer()
    .then( data_small => {
      var image = new Image;
      image.small.data = data_small;
      image.small.contentType = 'image/png';

      sharp(file)
          .resize(384, 288)
          .embed()
          .toBuffer()
          .then( data_medium => {
            image.medium.data = data_medium;
            image.medium.contentType = 'image/png';

            sharp(file)
              .resize(640, 480)
              .embed()
              .toBuffer()
              .then( data_large => {
                image.large.data = data_large;
                image.large.contentType = 'image/png';

                image.save(function (err, image) {
                  if (err) throw err;
                  console.error('saved img to mongo');
                });
            });
          });
    })
    .catch( err => {
      console.error("ERROR:", err);
    } );
};

var download = function(url, dest, cb, imageList) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(null);  // close() is async, call cb after close completes.
      storeImageIntoMongo(dest);
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

app.get("/", (req, res) => {
  var imageList = [];

	axios.get('http://54.152.221.29/images.json')
        .then(function (response) {
        	if (response.data) {
        		console.log(typeof response.data);
        		console.log(response.data);
        		for (var i = 0; i < response.data.images.length; i++) {
        			console.log(response.data.images[i]);
              imageList.push(`pic${i}.jpg`);
					    download(response.data.images[i].url, `pic${i}.jpg`, storeImageIntoMongo, imageList);
        		}
            res.send("All images have been saved to the database. <a href=\"/images\">Click here</a> to see the images list.");
        	}
        })
        .catch(function (error) {
          console.log(error);
  	});
});

app.get("/images", (req, res, next) => {
  var listImages = [];
  var contentType = "image/png";
  var listItems = "";

  Image.find(function (err, images) {
    if (err) return next(err);

    console.error(":::: images length:", images.length);

    for (var i=0; i < images.length; i++) {
      listItems += `<li><a href="/images/${images[i].id}/">Image ${i+1}</a></li>`;
    }

    var html_content = "<p>Is this real life?</p><ul>" + listItems + "</ul>";

    res.send(html_content);
  });
});

app.get("/images/:id/:size?", (req, res, next) => {
  var image = Image.findById(req.params.id).then((image) => {
    if (!image) {
      return res.status(404).send();
    }

    var size = req.params.size;

    res.contentType("image/png");
    if (size && size == "small") {
      res.send(image.small.data);
    } else if (size && size == "medium") {
      res.send(image.medium.data);
    } else if (size && size == "large") {
      res.send(image.large.data);
    } else {
      res.send(image.medium.data);
    }
  }, (err) => {
    res.status(400).send();
  });
});

app.listen(port, () =>{
	console.log(`Server started on port ${port}.`);
});