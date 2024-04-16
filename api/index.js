const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mime = require("mime-types");

const publicFilePrefix = "/public"

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
  })
);

// Create application/x-www-form-urlencoded parser
const logger = require("morgan");
app.use(logger("dev"));

app.use(express.json());

const path = require("path");
//Scripts
const PageModify = require("../scripts/pageModify.js");
const TTC = require("../scripts/TTC.js");
const fs = require("fs");

app.get("/", (req, res) => {
  // Path when startpage is called
  const queryParam = req.query.page;
  const filePath =
    queryParam == undefined
      ? path.join(__dirname, "..", "public", "pages", "start", "start.html")
      : path.join(__dirname, "..", "public", "pages") +
        "/" +
        queryParam +
        ".html";

  PageModify.loadPage(filePath, (err, data) => {
    // Call PageModify module (/server/scripts/pageModify.js)
    if (err) {
      res.send("<h1>Ein Fehler ist aufgetreten: </h1><p>" + err + "</p>");
    } // If reading HTML file was not successful, throw error
    else {
      res.send(`<!DOCTYPE html>
      <html lang="de">
      <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="/stylesheets/css/main.css"/>
          <link rel="stylesheet" href="/stylesheets/css/start.css"/>
          <link rel="stylesheet" href="/stylesheets/css/notAvailable.css"/>
          <link rel="stylesheet" href="/stylesheets/css/training.css"/>
          <link rel="stylesheet" href="/stylesheets/css/aktuelles.css"/>
          <link rel="stylesheet" href="/stylesheets/css/trainer.css"/>
          <link rel="stylesheet" href="/stylesheets/css/mannschaften.css"/>
          <link rel="stylesheet" href="/stylesheets/css/halle.css"/>
          <link rel="stylesheet" href="/stylesheets/css/naechste-spiele.css"/>
          <script src="/javascripts/js.js"></script>
          <script src="/javascripts/navigator.js"></script>
          <script src="/javascripts/cookieManager.js"></script>
        
          <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet">

      
          <link rel="stylesheet" href="trumbowyg/dist/ui/trumbowyg.min.css">
      
      </head>
      <body>
      <div id="banner"><img src="/images/images/title.jpg"></div>
      
      
      <nav class="nav">
          <button id="hamburger" onclick="Client.openHamburgerMenu()"><img src="images/icons/hamburger_menu.svg"></button>
          <ul class="navContainer">
              <li class="noDropdown" onclick="navigate('start start');"><input type="button" value="Start"/></li>
              <li class="dropdown">Verein
                  <ul class="list">
                      <li class="item" onclick="navigate('verein events');"><input type="button" value="Events"/></li>
                      <li class="item" onclick="navigate('verein organisation');"><input type="button" value="Organisation"/>
                      </li>
                      <li class="item" onclick="navigate('verein sponsoren');"><input type="button" value="Sponsoren"/></li>
                      <li class="item" onclick="navigate('verein halle');"><input type="button" value="Unsere Halle"/></li>
                  </ul>
              </li>
              <li class="dropdown">Erwachsene
                  <ul class="list">
                      <li class="item" onclick="navigate('erwachsene training');"><input type="button" value="Training"/>
                      </li>
                      <li class="item" onclick="navigate('erwachsene mannschaften');"><input type="button"
                                                                                               value="Mannschaften"
                          /></li>
                  </ul>
              </li>
              <li class="dropdown">Jugend
                  <ul class="list">
                      <li class="item" onclick="navigate('jugend training');"><input type="button" value="Training" /></li>
                      <li class="item" onclick="navigate('jugend trainer');"><input type="button" value="Trainer" /></li>
                      <li class="item" onclick="navigate('jugend mannschaften');"><input type="button" value="Mannschaften" />
                      </li>
                  </ul>
              </li>
              <li class="dropdown">Termine
                  <ul class="list">
                      <li class="item" onclick="navigate('termine spiele');"><input type="button" value="Spiele" /></li>
                      <li class="item" onclick="navigate('termine feste');"><input type="button" value="Feste und andere Termine"
                                              /></li>
                  </ul>
              </li>
              <li class="noDropdown" onclick="navigate('galerie galerie');"><input type="button" value="Galerie" /></li>
              <li class="noDropdown" onclick="navigate('aktuelles aktuelles');"><input type="button" value="Aktuelles" /></li>
              <li class="dropdown">Anderes
                  <ul class="list">
                      <li class="item" onclick="navigate('anderes links');"><input type="button" value="Links" /></li>
                      <li class="item" onclick="navigate('anderes downloads');"><input type="button" value="Downloads" /></li>
                      <li class="item" onclick="navigate('anderes impressum');"><input type="button" value="Impressum" /></li>
                      <li class="item" onclick="navigate('anderes datenschutz');"><input type="button" value="Datenschutz" />
                      </li>
                      <li class="item" onclick="navigate('anderes kontakt');"><input type="button" value="Kontakt" /></li>
                  </ul>
              </li>
          </ul>
      </nav>
      
      
      <div id="pageContent">
          ${data}
          <!-- The page content of one of the HTML files in './server/pages/' is being loaded here. ('start.html' by default) -->
      </div>
      <input type="hidden" id="nextGamesData" value="">
      <input type="hidden" id="newsArticlesData" value="">
      <input type="hidden" id="articlesInfo" value="">
      
      <footer>
          <br>
          <div id="logosContainer">
              <div id="logos"><img src="images/logos/logo_ttc_farbig.png" alt="Logo TTC Klingenmünster"><img
                          src="images/logos/logo_joola.png" alt="Logo Joola"></div>
          </div>
          <p id="copyright" onclick="navigate('login')">© 2023 TTC Klingenmünster </p>
      </footer>
      
      <div id="alertPlaceholder"></div>
      
      <script src="//ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
      <script>window.jQuery || document.write('<script src="js/vendor/jquery-3.3.1.min.js"><\/script></script>
      <script src="trumbowyg/dist/trumbowyg.min.js"></script>
      
      </body>
      
      </html>
      `);
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
  page = path.join(__dirname, "..", "public", "pages") + "/" + page;
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
  let password = "pass123"; // TODO Change

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
    data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "scripts") + "/games.json")
    );
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
    console.log(err);
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
    data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "scripts") + "/allGames.json")
    );
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
      res.json({
        data: data,
      });
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
  let previewDescription = req.body.previewDescription;

  PageModify.newArticle(
    title,
    content,
    date,
    fileNames,
    previewFile,
    previewDescription
  )
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
  console.log(path, "uploaded!");

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
  let articlePreview = req.body.articlePreview;

  PageModify.editArticle(
    articleTitle,
    articleContent,
    articleDate,
    editArticlePath,
    articlePreview
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

app.use((req, res) => {
  const filePath = (path.join(__dirname, "..", "public")+req.path);
  const error404 = (path.join(__dirname, "..", "public", "pages")+"\\error404.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).sendFile(error404);
  }
});


app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
