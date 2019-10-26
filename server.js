var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

var axios = require("axios");
var cheerio = require("cheerio");

var db = require("./models");

var PORT = process.env.PORT || 3000;


var app = express();


app.use(logger("dev"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/NewsApp", { useNewUrlParser: true });

// Routes

app.get("/scrape", function (req, res) {
  axios.get("https://www.npr.org/").then(function (response) {
    var $ = cheerio.load(response.data);
    console.log($)
    $(".story-text h3").each(function (i, element) {
      var result = {};

      result.title = $(this)
        .text();
      result.link = $(this)
        .parent("a")
        .attr("href");
      result.description = $(this)
        .parent("a")
        .siblings("a")
        .children(".teaser")
        .text();
      result.image = ($(this)
        .parent("a")
        .parent(".story-text")
        .parent(".story-wrap")
        .siblings("figure")
        .children(".bucketwrap")
        .children(".imagewrap")
        .children("a")
        .children("img")
        .attr("src")) || ($(this)
          .parent("a")
          .parent(".story-text")
          .siblings("figure")
          .children(".bucketwrap")
          .children(".imagewrap")
          .children("a")
          .children("img")
          .attr("src")) || ($(this)
            .parent("a")
            .parent(".story-text")
            .parent(".story-text-wrap")
            .siblings("figure")
            .children(".bucketwrap")
            .children(".imagewrap")
            .children("a")
            .children("img")
            .attr("src"))

      console.log("SCRAPED IMG", result.image, result.title)
      db.Article.create(result)
        .then(function (dbArticle) {

          console.log(dbArticle);
        })
        .catch(function (err) {

          console.log(err);
        });
    });


    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {

  db.Article.find({})
    .then(function (dbArticle) {

      res.json(dbArticle);
    })
    .catch(function (err) {

      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {

      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {

  db.Note.create(req.body)
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function (dbArticle) {

      res.json(dbArticle);
    })
    .catch(function (err) {

      res.json(err);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
