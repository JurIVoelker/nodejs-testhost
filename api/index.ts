require("dotenv").config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");

//Scripts
const PageModify = require("../scripts/pageModify.js");
const TTC = require("../scripts/TTC.js");
const fs = require("fs");

// Create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  // Path when startpage is called
  const queryParam = req.query.page;
  const filePath =
    queryParam == undefined ? "start/start.html" : queryParam + ".html"; // File path to start page

  PageModify.loadPage(filePath, (err, data) => {
    console.log(__dirname);
    // Call PageModify module (/server/scripts/pageModify.js)
    if (err) {
      res.render("index", {
        content: "<h1>Ein Fehler ist aufgetreten: </h1><p>" + err + "</p>",
      });
    } // If reading HTML file was not successful, throw error
    else {
      //res.render("index", { content: data });
      res.send("<h1>test</h1>");
    } // Else: return HTML content to index.ejs
  });
});

/**
 * Route for navigating with AJAX
 */
app.post("/api/navigation/:id", (req, res) => {
  // API request for loading other pages
  let str = req.params.id.split(" ");
  let page = "";
  for (let i = 0; i < str.length - 1; i++) {
    page += str[i] + "/";
  }
  page += str[str.length - 1] + ".html"; // Read the requested page from the 'id' parameter in URL request

  PageModify.loadPage(page, (err, data) => {
    // Load the requested page
    if (err) {
      res.json({
        content: "<h1>Error 404: Seite nicht gefunden: </h1>",
      });
    } // If reading HTML file was not successful, throw error
    else {
      res.json({ content: data });
    } // Else: return HTML content to index.ejs
  });
});

/**
 * Route for login
 **/
app.post("/api/login", (req, res) => {
  // API request for loading other pages
  let password = req.body.password;

  if (password == "pass123") {
    res.json({ content: "Login erfolgreich", isLoggedin: "true" }); // Else: return HTML content to index.ejs
  } else {
    res.json({ content: "Login fehlgeschlagen", isLoggedin: "false" });
  }
});

/**
 * Route zum Authorisieren
 */
app.post("/api/authorize", (req, res) => {
  // API request for checking if is logged in
  let password = req.body.password;

  if (password === "pass123") {
    res.json({ isLoggedin: true });
  } else {
    res.json({ isLoggedin: false });
  }
});

/**
 * Route zum Laden der nächsten Spiele
 */

app.get("/api/nextGames/:count", (req, res) => {
  const externeURL =
    "https://www.mytischtennis.de/clicktt/PTTV/23-24/verein/118/TTC-Klingenmuenster/spielplan/";
  let count = parseInt(req.params.count);

  let data;
  try {
    data = JSON.parse(fs.readFileSync("../server/scripts/games.json"));
  } catch (e) {
    data = null;
  }
  try {
    if (data != null && TTC.isValid(data.validUntil)) {
      res.json(data.games);
    } else {
      TTC.fetchHTML(externeURL).then((data) => {
        TTC.nextGamesInfo(data, count)
          .then((r) => {
            TTC.saveJSON(r, "games.json");
            res.json(r);
          })
          .catch((err) => {
            res.json(err);
          });
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

/**
 * Route zum Laden aller nächsten Spiele
 */

app.get("/api/allGames/", (req, res) => {
  const externeURL =
    "https://www.mytischtennis.de/clicktt/PTTV/23-24/verein/118/TTC-Klingenmuenster/spielplan/";

  let data;
  try {
    data = JSON.parse(fs.readFileSync("../server/scripts/allGames.json"));
  } catch (e) {
    data = null;
  }
  try {
    if (data != null && TTC.isValid(data.validUntil)) {
      res.json(data.games);
    } else {
      TTC.fetchHTML(externeURL).then((data) => {
        const r = TTC.parseNextGames(data, -1);
        TTC.saveJSON(r, "allGames.json");
        res.json(r);
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

/**
 * Route zum Laden für die einzelnen Seiten (abhängig von isPreview entweder Preview oder Seite)
 */

app.get("/api/news/previews/:page", (req, res) => {
  let page = parseInt(req.params.page);
  let itemsPerPage = req.query.itemsPerPage;
  PageModify.getPreviews(page, itemsPerPage, (err, data, dirCount) => {
    if (!err) {
      res.json({ data: data, dirCount: dirCount });
    } else {
      res.status(500).send(err);
    }
  });
});

/*
    Route zum Laden von der Vorschau der Artikel der Startseite
 */
app.get("/api/startPageArticlePreviews", (req, res) => {
  PageModify.startPageArticlePreviews()
    .then((data) => {
      res.json({ data });
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.post("/api/newPage", (req, res) => {
  // API request for checking if is logged in
  let title = req.body.title;
  let content = req.body.content;
  let date = req.body.date;
  let fileNames = req.body.fileNames;
  let previewFile = req.body.previewFile;

  PageModify.newArticle(title, content, date, fileNames, previewFile)
    .then((paths, previewPath) => {
      res.json({ paths, previewPath });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.post("/api/uploadImage", (req, res) => {
  // API request for checking if is logged in
  let fileData = req.body.fileData;
  let path = req.body.path;

  PageModify.saveImage(path, fileData)
    .then(() => {
      res.json({});
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.post("/api/deletePage" /*, upload.single('image')*/, (req, res) => {
  // API request for checking if is logged in
  let path = req.body.deletePath;

  PageModify.deleteArticle(path)
    .then(() => {
      res.json({});
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.post("/api/editPage" /*, upload.single('image')*/, (req, res) => {
  // API request for checking if is logged in
  let articleTitle = req.body.articleTitle;
  let articleContent = req.body.articleContent;
  let articleDate = req.body.articleDate;
  let editArticlePath = req.body.editArticlePath;

  PageModify.editArticle(
    articleTitle,
    articleContent,
    articleDate,
    editArticlePath
  )
    .then(() => {
      res.json({});
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

/**
 * Get Images for gallery
 */

app.get("/api/nextImages", (req, res) => {
  let imgCount = req.query.c;

  PageModify.getNextImages(imgCount)
    .then((data) => {
      res.json({ imageNames: data });
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

/**
 * Get Emails
 */

app.get("/api/getMail", (req, res) => {
  let mailto = req.query.mail;
  switch (mailto) {
    case "Vorstand":
      res.json("mailtodo@mail.de");
      break;
    case "Sportwart":
      res.json("mailtodo@mail.de");
      break;
    case "Jugendwart":
      res.json("mailtodo@mail.de");
      break;
    default:
      res.json("ERROR");
  }
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
