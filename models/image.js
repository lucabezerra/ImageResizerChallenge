var mongoose = require("mongoose");

var Image = mongoose.model("Image", {
	original: {
		type: String,
		//required: true,
		minlength: 1,
		trim: true
	},
	small: {
		data: Buffer,
		contentType: String
	},
	medium: {
		data: Buffer,
		contentType: String
	},
	large: {
		data: Buffer,
		contentType: String
	}
});

module.exports.Image = Image;