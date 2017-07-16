const expect = require("expect");
const request = require("supertest");

const index = require("../index.js");
const {app} = require("../index.js");
const {Image} = require("../models/image.js");
const {ObjectID} = require("mongodb");


describe("Fetch and Download Images", function() {
	it("should download and store images into db", function(done) {
		this.timeout(15000);
		Image.remove({});

		var text = "All images have been saved to the database. <a href=\"/images\">Click here</a> to see the images list.";

		request(app)
			.get("/")
			.expect(200)
			.expect((res) => {
				expect(res.res.text).toBe(text);
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				Image.find((err, images) => {
					expect(images.length).toBeGreaterThanOrEqualTo(9);
					done();
				}).catch((err) => done(err));
			});
	});

	it("should display a list of stored images", function(done) {
		var text = "Original Image:";

		index.downloadRemoteImages(null)

		request(app)
			.get("/images")
			.expect(200)
			.expect((res) => {
				count = (res.res.text.match(/Original Image/g) || []).length
				expect(count).toBe(10);
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				done();
			});
	});

	it("should download an image from the server", function(done) {
		Image.find((err, images) => {
			if (images.length < 1)
				return done("No image found!");

			request(app)
				.get(`/images/${images[0]._id}/small`)
				.expect(200)
				.expect((res) => {
					var text = res.res.headers["content-disposition"];
					var occurrences = (text.match(/filename="pic.\.jpg"/g) || []).length;
					expect(occurrences).toBe(1);
				})
				.end((err, res) => {
					if (err) {
						return done(err);
					}

					done();
				});
		})
	});
});

