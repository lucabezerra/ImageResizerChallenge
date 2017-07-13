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

// store downloaded files as Image objects into mongodb
var storeImageIntoMongo = function(url, file, res) {
  let splitFileName = file.split("/");
  var fileName = splitFileName[splitFileName.length - 1];
  sharp(file)
    .resize(320, 240)
    .embed()
    .toFile(`images/small/${fileName}`)
    .then( data_small => {
      var image = new Image;
      image.original = url;
      image.small = `images/small/${fileName}`;

      sharp(file)
          .resize(384, 288)
          .embed()
          .toFile(`images/medium/${fileName}`)
          .then( data_medium => {
            image.medium = `images/medium/${fileName}`;

            sharp(file)
              .resize(640, 480)
              .embed()
              .toFile(`images/large/${fileName}`)
              .then( data_large => {
                image.large = `images/large/${fileName}`;

                image.save(function (err, image) {
                  if (err) throw err;
                  console.error('saved img to mongo');

                  if (res) {
                    res.send("All images have been saved to the database. <a href=\"/images\">Click here</a> to see the images list.");
                  }
                });
            });
          });
    })
    .catch( err => {
      console.error("ERROR:", err);
      if (res) {
        res.status(400).send(err);
      }
    } );
};

// download file from URL to destination
var download = function(url, dest, cb, imageList, res) {
  Image.find({original: url}, function (err, images) {
    if (err) return next(err);

    if (images.length > 0) {
      console.log(`Image from URL ${url} has already been download. Skipping it...`);
      if (res) {
        res.send("All images have been saved to the database. <a href=\"/images\">Click here</a> to see the images list.");
      }
    } else {
      var file = fs.createWriteStream(dest);
      var request = http.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
          file.close(null);  // close() is async, call cb after close completes.
          if (res) {
            storeImageIntoMongo(url, dest, res);
          } else {
            storeImageIntoMongo(url, dest, null);
          }
        });
      }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
      });
    }
  });
};

// root - downloads files from the webservice
app.get("/", (req, res) => {
  downloadRemoteImages(res);
});

var downloadRemoteImages = function(res) {
  var imageList = [];
  axios.get('http://54.152.221.29/images.json')
        .then(function (response) {
          if (response.data) {
            for (var i = 0; i < response.data.images.length; i++) {
              imageList.push(`pic${i}.jpg`);

              if (i < response.data.images.length - 1) {
                download(response.data.images[i].url, `images/original/pic${i}.jpg`, storeImageIntoMongo, imageList, null);
              } else {
                // if it's the last image, we pass the res object to render the response
                download(response.data.images[i].url, `images/original/pic${i}.jpg`, storeImageIntoMongo, imageList, res);
              }
            }
          }
        })
        .catch(function (error) {
          console.log(error);
          res.status(400).send(error);
    });
}

// route that lists links to the images in their different formats
app.get("/images", (req, res, next) => {
  var listImages = [];
  var contentType = "image/png";
  var listItems = "";

  Image.find(function (err, images) {
    if (err) return next(err);

    console.error(":::: images length:", images.length);

    for (var i=0; i < images.length; i++) {
      listItems += `<li>
                      Original Image: <a href="${images[i].original}">${images[i].original}</a>
                      <ul>
                        <li><a href="/images/${images[i].id}/small">Small</a></li>
                        <li><a href="/images/${images[i].id}/medium">Medium</a></li>
                        <li><a href="/images/${images[i].id}/large">Large</a></li>
                      </ul>
                    </li>`;
    }

    var html_content = "<p>Is this real life?</p><ul>" + listItems + "</ul>";

    res.send(html_content);
  });
});

// route that allows the download of the images
app.get("/images/:id/:size?", (req, res, next) => {
  var image = Image.findById(req.params.id).then((image) => {
    if (!image) {
      return res.status(404).send();
    }

    var size = req.params.size;

    if (size && size == "small") {
      res.download(image.small);
    } else if (size && size == "medium") {
      res.download(image.medium);
    } else if (size && size == "large") {
      res.download(image.large);
    } else {
      res.download(image.medium);
    }
  }, (err) => {
    res.status(400).send();
  });
});

// starts the server and creates the folders if they don't exist
app.listen(port, () =>{
  fs.stat("images/", function (err, stats){
    if (err) {
      console.log('Folder doesn\'t exist, creating it...');
      return fs.mkdir("images/", (err) => {
        if (err) return err;

        return fs.mkdir("images/small/", (err) => {
          if (err) return err;

          return fs.mkdir("images/medium/", (err) => {
            if (err) return err;

            return fs.mkdir("images/large/", (err) => {
              if (err) return err;

              return fs.mkdir("images/original/", (err) => {
                if (err) return err;
              });
            });
          });
        });
      });
    }
    if (!stats.isDirectory()) {
      callback(new Error('images/ is not a directory!'));
    } else {

    }
  });
	console.log(`Server started on port ${port}.`);
});

module.exports = {app, downloadRemoteImages};