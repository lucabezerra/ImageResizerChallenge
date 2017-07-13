const expect = require("expect");
const request = require("supertest");

const index = require("../index.js");
const {app} = require("../index.js");
const {Image} = require("../models/image.js");
const {ObjectID} = require("mongodb");

beforeEach((done) => {
	Image.remove({})
		// .then(() => {
		// 	return index.downloadRemoteImages(null);
		// })
		.then(() => done());
});

describe("Fetch images", () => {
	it("should download and store images into db", (done) => {
		setTimeout(done, 15000);

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
					expect(images.length).toBe(10);
					done();
				}).catch((err) => done(err));
			});
	});
});