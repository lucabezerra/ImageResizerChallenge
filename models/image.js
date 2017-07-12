var mongoose = require("mongoose");

var Image = mongoose.model("Image", {
	original: {
		type: String,
		required: true,
		minlength: 1,
		trim: true
	},
	small: {
		type: String,
		required: true,
		minlength: 1,
		trim: true
	},
	medium: {
		type: String,
		required: true,
		minlength: 1,
		trim: true
	},
	large: {
		type: String,
		required: true,
		minlength: 1,
		trim: true
	}
});

module.exports.Image = Image;