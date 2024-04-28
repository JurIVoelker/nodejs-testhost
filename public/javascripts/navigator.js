let _previewImageName;
let _validateNewArticleErrorMessage;
let _deletePage;
let _editArticlePath;
let _hamburgerContent = "";
let _currentPage = "start/start";
let _requestSent = false;

const getRequest = (path) => {
  return new Promise((resolve, reject) => {
    fetch(`${host}/api${path[0] != "/" ? "/" + path : path}`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const postRequest = (path, body) => {
  return new Promise((resolve, reject) => {
    fetch(`${host}/api${path[0] != "/" ? "/" + path : path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: typeof body === "string" ? body : JSON.stringify(body), // Send password to server in fetch request body
    })
      .then((response) => response.json())
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

function navigate(page) {
  // Method fetches data of requested page
  Server.getPageContent(
    page,
    getCookie("isAuthorized") === "true",
    function (data, isAuthorized) {
      document.getElementById("pageContent").innerHTML = data.content;
      history.pushState(null, null, "?page=" + page.replaceAll(" ", "/"));
      document.getElementById("alertPlaceholder").innerHTML = "";
      Ui.setScroll(true);
      _currentPage = Client.getCurrentPage();
      window.scrollTo(0, document.getElementById("banner").offsetHeight);
      Client.closeHamburgerMenu();
      switch (page) {
        case "start start":
          Client.pasteStartData();
          Server.loadStartPageArticlePreviews();
          break;
        case "aktuelles aktuelles":
          Client.pasteAktuellesData();
          if (isAuthorized) {
            Client.showNewArticleButton();
          }
          Client.renderArticleNavigation();
          break;
        case "aktuelles newPage":
          Client.loadNewArticleStorage();
          Client.textStorageInterval();
          $("#articleContent").trumbowyg();
          break;
        case "aktuelles editPage":
          Ui.loadScreen();
          Server.getPageContent(
            "aktuelles " + _editArticlePath + " content",
            true,
            (data) => {
              const domParser = new DOMParser();
              let doc = domParser.parseFromString(data.content, "text/html");
              let content = doc.querySelector(".textWrap").innerHTML.split(">");
              content.shift();
              content = content.join(">");
              document.getElementById("editArticleTitle").value =
                doc.querySelector("h1").innerHTML;
              document.getElementById("editArticleDate").value =
                doc.getElementById("date").innerHTML;
              document.querySelector(".trumbowyg-editor").innerHTML = content;
              document.getElementById("previewText").value = "[unverändert]";
              Ui.hideAuthorizationWindow();
            }
          );
          $("#editArticleContent").trumbowyg();
          break;
        case "termine spiele":
          Server.loadAllGames((data) => {
            let contentHTML =
              "<h1 style='margin-bottom: 30px'>Unsere nächsten Spiele:</h1>" +
              "<table><tr class='bigRow'><td><h3>Heimmannschaft</h3></td><td><h3>Uhrzeit und Datum</h3></td><td><h3>Gastmannschaft</h3></td><td><h3>Liga</h3></td></tr>";
            data.nextGames.forEach((element) => {
              contentHTML += getNextGamesHTML(element);
            });
            contentHTML += "</table>";
            let nextGames = document.getElementById("nextGames");
            if (nextGames != null) {
              nextGames.innerHTML = contentHTML;
            }
          });
          break;
        case "galerie galerie":
          let images = document.querySelectorAll("#pageContent img");
          if (images !== null) {
            Server.getImages();
          }
          break;
      }
    }
  );
}

class Server {
  static initialize() {
    Server.authorize(function (isAuthorized) {
      if (isAuthorized) {
        setCookie("isAuthorized", true);
        setCookie("password", getCookie("password"), 60);
        switch (Client.getCurrentPage()) {
          case "aktuelles/aktuelles":
            Client.showNewArticleButton();
            break;
          case "aktuelles/newPage":
            Client.loadNewArticleStorage();
            Client.textStorageInterval();
            break;
        }
      }
    });
    Client.saveLocalStorage(
      "imagesPc",
      JSON.stringify({ col1: [], col2: [], col3: [] })
    );
    Client.saveLocalStorage("imagesMobile", JSON.stringify({ images: [] }));
    _currentPage = Client.getCurrentPage();

    switch (_currentPage) {
      case "aktuelles/newPage":
        $("#articleContent").trumbowyg();
        break;
      case "start/start":
        Server.loadStartPageArticlePreviews();
        break;
      case "termine/spiele":
        Server.loadAllGames((data) => {
          let contentHTML =
            "<h2 style='margin-bottom: 30px'>Unsere nächsten Spiele:</h2>" +
            "<table><tr class='bigRow'><td><h3>Heimmannschaft</h3></td><td><h3>Uhrzeit und Datum</h3></td><td><h3>Gastmannschaft</h3></td><td><h3>Liga</h3></td></tr>";
          data.nextGames.forEach((element) => {
            contentHTML += getNextGamesHTML(element);
          });
          contentHTML += "</table>";
          let nextGames = document.getElementById("nextGames");
          if (nextGames != null) {
            nextGames.innerHTML = contentHTML;
          }
        });
        break;
      case "galerie/galerie":
        let images = document.querySelectorAll("#pageContent img");
        if (images !== null) {
          Server.getImages();
        }
        break;
    }

    Server.loadNextGames(4);
    Server.loadArticlePreviewData(0, 6, function (data, page, itemCount) {
      Client.insertAktuellesData(data, page, itemCount);
    });
  }

  static authorize(callback, pw = "") {
    let password = getCookie("password");
    if (pw !== "") {
      password = pw;
    }
    if (password === "") {
      return;
    }
    fetch(host + "/api/authorize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: password }), // Send password to server in fetch request body
    })
      .then((response) => response.json())
      .then((data) => {
        callback(data.isLoggedin);
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occured while fetching, return error
  }

  static getPageContent(page, isAuthorized, callback) {
    postRequest("/navigation/" + page, {
      body: { isAuthorized: isAuthorized },
    })
      .then((data) => {
        callback(data, isAuthorized);
      })
      .catch((err) => {
        console.error("Fehler beim laden einer Seite:", err);
      });
  }

  static login(pw) {
    const password = pw ? pw : document.getElementById("loginField").value;

    postRequest("/login", {
      password, // Send password to server in fetch request body
    })
      .then((data) => {
        if (data.isLoggedin) {
          setCookie("password", password, 60); // Save password as cookie for 30 minutes
        }
        document.getElementById("pageContent").innerHTML = data.content; // Change data on page
      })
      .catch((err) => {
        console.error("Fehler beim laden einer Seite:", err);
      });
  }

  static loadNextGames(count) {
    getRequest("/nextGames/" + count).then((data) => {
      if (data) {
        const titel = "Unsere nächsten Spiele:";
        const html = `
          <h2>${titel}</h2> 
          <table>
            <tr class='bigRow'>
              <td><h3>Heimmannschaft<h3></td>
              <td><h3>Uhrzeit und Datum</h3></td>
              <td><h3>Gastmannschaft<h3></td>
              <td><h3>Liga<h3></td>
            </tr>
        ${data.map((game) => {
          return getNextGamesHTML(game);
        })}
        </table>
        `;

        document.getElementById("nextGamesData").value = html;

        if (Client.getCurrentPage() === "start/start") {
          let nextGames = document.getElementById("nextGames");
          if (nextGames != null) {
            nextGames.innerHTML = html;
          }
        }
      }
    });
  }

  static loadArticlePreviewData(page, itemCount, callback) {
    getRequest(`/news/previews/${page}?itemsPerPage=${itemCount}`).then(
      (res) => {
        callback(res, page, itemCount);
      }
    );
  }

  static newPage() {
    if (Client.getCurrentPage() === "aktuelles/newPage") {
      let articleTitle = document.getElementById("article-title");
      let articleContent = document.getElementById("articleContent");
      let articleDate = document.getElementById("article-date");
      let articlePhotos = document.getElementById("add-photos");
      let articlePreviewDescription = document.getElementById(
        "preview-description"
      );
      if (
        Client.validateNewArticle(
          articleTitle,
          articleContent,
          articleDate,
          articlePhotos,
          articlePreviewDescription
        )
      ) {
        if (getCookie("isAuthorized") === "true") {
          Ui.selectPreviewImage();
        } else {
          Ui.showAuthorizationWindow();
        }
      } else {
        alert(_validateNewArticleErrorMessage);
      }
    }
  }

  static readImageData(files, index, data, callback) {
    if (files.length <= index) {
      callback();
    } else {
      const reader = new FileReader();
      let selectedFile = files[0];
      reader.onload = function (event) {
        const fileContent = event.target.result; // Get the file content
        data.push(fileContent);
        Server.readImageData(files, index + 1, data, callback);
      };
      // Read the file as text, binary, etc.
      reader.readAsText(selectedFile);
    }
  }

  static fetchNewPage() {
    let title = document.getElementById("article-title").value;
    let date = document.getElementById("article-date").value;
    let content = document.getElementById("articleContent").value;

    let files = document.getElementById("img-upload-input").files;
    let previewDescription = document.getElementById(
      "preview-description"
    ).value;
    let fileNames = [];

    for (let i = 0; i < files.length; i++) {
      fileNames.push(files[i].name);
    }
    Ui.loadScreen();
    postRequest("/newPage", {
      title: title,
      content: content,
      date: date,
      fileNames: fileNames,
      previewFile: _previewImageName,
      previewDescription,
    })
      .then((data) => {
        let paths = data.paths;

        let filePromises = [];
        for (let i = 0; i < files.length; i++) {
          filePromises.push(
            Client.getImageData(files[i])
              .then((imageData) => Client.compressImage(imageData, 1920, 1080))
              .then((compressedImageData) =>
                Server.uploadImage(paths[i], compressedImageData)
              )
          );
        }
        Promise.all(filePromises)
          .then((messages) => {
            Ui.showConfirmationWindow();
          })
          .catch((messages) => {
            console.log("Error while uploading the images: ", messages);
          });
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occured while fetching, return error
  }

  static uploadImage(path, fileData) {
    if (path.split("/").pop() === _previewImageName) {
      let pathForPreviewImage = path.split("/");
      pathForPreviewImage.pop();
      pathForPreviewImage.push("preview");
      path = pathForPreviewImage.join("/");
    }
    path += ".jpeg";
    postRequest("/uploadImage", { fileData: fileData, path: path })
      .then((res) => {
        console.log("Image(s) was successfully uploaded:", res);
      })
      .catch((err) => {
        console.log("Error while uploading the image(s):", res);
      });
  }

  static onEditPage(path) {
    if (getCookie("isAuthorized") === "true") {
      _editArticlePath = path;
      navigate("aktuelles editPage");
    }
  }

  static editPage(isAuthorized) {
    if (isAuthorized) {
      let articleTitle = document.getElementById("editArticleTitle");
      let articleContent = document.querySelector(".trumbowyg-editor");
      let articleDate = document.getElementById("editArticleDate");
      let articlePreview = document.getElementById("previewText");
      if (
        Client.validateNewArticle(
          articleTitle,
          articleContent,
          articleDate,
          true,
          articlePreview
        )
      ) {
        postRequest("/editPage", {
          articleTitle: articleTitle.value,
          articleContent: articleContent.innerHTML,
          articleDate: articleDate.value,
          editArticlePath: _editArticlePath,
          articlePreview: articlePreview.value,
        })
          .then(() => {
            Client.returnToArticles();
          })
          .catch((err) => {
            console.log("Fehler beim bearbeiten eines Artikels:", err);
          });
      } else {
        alert(_validateNewArticleErrorMessage);
      }
    }
  }

  static onDeletePage(path) {
    _deletePage = path;
    Ui.confirmDeleteWindow();
  }

  static showDeleteList() {
    const container = document.getElementById("alertPlaceholder");
    const cards = document.querySelectorAll(".card");
    if (cards) {
      const html = `
      <div class="modify-file-list-container"> 
        <div class="header">
          <h2>Welchen Artikel möchtest du löschen?</h2>
          <button onclick="Ui.hideAuthorizationWindow()"> X </button>
        </div>
        <div class="modify-file-list">
          ${Array.from(cards)
            .map((card) => {
              return `
              <button onclick="Server.onDeletePage('${card.dataset.location}')">
              ${card.querySelector("h3").innerHTML}
              </button>
            `;
            })
            .join("")}
          </div>
      </div>
      `;
      container.innerHTML = html;
    }
  }

  static showEditList() {
    const container = document.getElementById("alertPlaceholder");
    const cards = document.querySelectorAll(".card");
    if (cards) {
      const html = `
      <div class="modify-file-list-container"> 
        <div class="header">
          <h2>Welchen Artikel möchtest du bearbeiten?</h2>
          <button onclick="Ui.hideAuthorizationWindow()"> X </button>
        </div>
        <div class="modify-file-list">
          ${Array.from(cards)
            .map((card) => {
              return `
              <button onclick="Server.onEditPage('${card.dataset.location}')">
              ${card.querySelector("h3").innerHTML}
              </button>
            `;
            })
            .join("")}
          </div>
      </div>
      `;
      container.innerHTML = html;
    }
  }

  static deletePage(isAuthorized) {
    if (isAuthorized) {
      postRequest("/deletePage", { deletePath: _deletePage })
        .then((res) => {
          Client.returnToArticles();
        })
        .catch((err) => {
          console.log("Error while trying to delete Article", err);
        });
    } else {
      Ui.hideAuthorizationWindow();
    }
  }

  static loadStartPageArticlePreviews() {
    getRequest("/startPageArticlePreviews")
      .then((res) => {
        const news = document.getElementById("articles");
        news.innerHTML = `
        <h2 class="title">Aktuelles:</h2>
          <div class="card-container">
          ${res.data.join("")}
          </div>
        `;
      })
      .catch((err) => {
        console.log("Error while trying to delete Article", err);
      });
  }

  static loadAllGames(callback) {
    getRequest("/allGames")
      .then((data) => {
        callback(data);
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occurred while fetching
  }

  static getImages() {
    getRequest(`/gallery`)
      .then((res) => {
        const galerie = document.getElementById("galerie");
        galerie.innerHTML = res.data;
      })
      .catch((err) => {
        console.log("Error", err);
        _requestSent = false;
      });
  }

  static copyMail(mailto) {
    getRequest(`/getMail?mail=${mailto}`)
      .then((data) => {
        Client.copyTextToClipboard(data);
        const div = document.getElementById("alertPlaceholder");
        div.innerHTML =
          "<div id='copyEmailContainer'><div id='copyEmail'><p>Email \"" +
          data +
          '" in Zwischenablage kopiert</p></div></div>';

        setTimeout(function () {
          document.getElementById("copyEmailContainer").style.opacity = 1;
        }, 0);

        setTimeout(function () {
          document.getElementById("copyEmailContainer").style.opacity = 0;
        }, 5000);
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occured while fetching, return error
  }
}

class Client {
  static getCurrentPage() {
    let params = new URL(document.location).searchParams;
    let page = params.get("page");
    return page === null ? "start/start" : page;
  }

  static showNewArticleButton() {
    document.getElementById("newArticlePlaceholder").innerHTML =
      '<div id=\'newArticle\' onclick=\'navigate("aktuelles newPage")\'><img src="images/icons/plus.svg" alt="+"></div>';
  }

  static getLeagueURL(team, league) {
    switch (team + league) {
      case "TTC KlingenmünsterBezirksoberliga Herren":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksoberliga-Vorderpfalz-Sued-Herren/gruppe/444695/tabelle/gesamt/";
      case "TTC Klingenmünster IIBezirksliga Herren":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Herren/gruppe/444668/tabelle/gesamt/";
      case "TTC Klingenmünster IIIKreisliga Herren":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Kreisliga-Sued-Ost/gruppe/444705/tabelle/gesamt/";
      case "TTC Klingenmünster IVKreisklasse A Herren":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Kreisklasse-A-Sued-West/gruppe/444706/tabelle/gesamt/";
      case "TTC Klingenmünster VKreisklasse A Herren":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Kreisklasse-A-Sued-West/gruppe/444706/tabelle/gesamt/";
      case "TTC Klingenmünster VIKreisklasse B Herren":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Kreisklasse-B-Sued-West/gruppe/444661/tabelle/gesamt/";
      case "TTC Klingenmünster VIIKreisklasse B Herren":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Kreisklasse-B-Sued-Ost/gruppe/455354/tabelle/gesamt/";
      case "TTC KlingenmünsterZweite Pfalzliga Damen":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/2-Pfalzliga-Ost/gruppe/444753/tabelle/gesamt/";
      case "TTC Klingenmünster IBezirksliga Jungen U12":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Jungen-12/gruppe/444751/tabelle/gesamt/";
      case "TTC Klingenmünster IBezirksliga Jungen U15":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Jungen-15/gruppe/444703/tabelle/gesamt/";
      case "TTC Klingenmünster IIBezirksliga Jungen U15":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Jungen-15/gruppe/444703/tabelle/gesamt/";
      case "TTC Klingenmünster IIIBezirksklasse Jungen U15":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksklasse-Jungen-15-Sued/gruppe/444744/tabelle/gesamt/";
      case "TTC Klingenmünster IBezirksliga Mädchen U15":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Maedchen-15/gruppe/444696/tabelle/gesamt/";
      default:
        return undefined;
    }
  }

  static pasteAktuellesData() {
    let articlesDataDom = document.getElementById("newsArticlesData");
    if (articlesDataDom !== null) {
      let newsContent = document.querySelector(".card-container");
      if (newsContent !== null) {
        newsContent.innerHTML = articlesDataDom.value;
      }
      if (getCookie("isAuthorized") === "true") {
        Client.showEditButtons();
      }
    }
  }

  static pasteStartData() {
    let nextGamesDataDom = document.getElementById("nextGamesData");
    if (nextGamesDataDom !== null) {
      let nextGamesContent = document.getElementById("nextGames");
      if (nextGamesContent !== null) {
        nextGamesContent.innerHTML = nextGamesDataDom.value;
      }
    }
  }

  static insertAktuellesData(data, page, itemCount) {
    let contentHTML = "";
    for (let i = 0; i < data.data.length; i++) {
      contentHTML += data.data[i];
    }
    document.getElementById("newsArticlesData").value = contentHTML;
    document.getElementById("articlesInfo").value = JSON.stringify({
      itemCount: data.dirCount,
      currentPage: page,
      maxPage: Math.trunc((data.dirCount - 1) / itemCount),
    });

    if (Client.getCurrentPage() === "aktuelles/aktuelles") {
      const canLeft = page <= 0;
      const canRight = page >= Math.trunc((data.dirCount - 1) / itemCount);
      document.querySelector(".card-container").innerHTML = contentHTML;
      document.getElementById("newsNavigation").innerHTML =
        "<button id='leftArticleButton'" +
        (canLeft ? "disabled" : "") +
        " onclick='Client.nextPage(\"left\")'" +
        "><img src='images/icons/" +
        (canLeft ? "chevron-left-gray.svg" : "chevron-left.svg") +
        "'></button>" +
        "<button id='rightArticleButton'" +
        (canRight ? "disabled" : "") +
        " onclick='Client.nextPage(\"right\")'" +
        "><img src='images/icons/" +
        (canRight ? "chevron-right-gray.svg" : "chevron-right.svg") +
        "'></button>";
      if (getCookie("isAuthorized") === "true") {
        Client.showEditButtons();
      }
    }
  }

  static renderArticleNavigation() {
    let articlesDom = document.getElementById("articlesInfo");
    let pageInfo = JSON.parse(articlesDom.value);
    const canLeft = pageInfo.currentPage === 0;
    const canRight = pageInfo.maxPage === pageInfo.currentPage;
    document.getElementById("newsNavigation").innerHTML =
      "<button id='leftArticleButton'" +
      (canLeft ? "disabled" : "") +
      " onclick='Client.nextPage(\"left\")'" +
      "><img src='images/icons/" +
      (canLeft ? "chevron-left-gray.svg" : "chevron-left.svg") +
      "'></button>" +
      "<button id='rightArticleButton'" +
      (canRight ? "disabled" : "") +
      " onclick='Client.nextPage(\"right\")'" +
      "><img src='images/icons/" +
      (canRight ? "chevron-right-gray.svg" : "chevron-right.svg") +
      "'></button>";
  }

  static nextPage(direction) {
    let articlesDom = document.getElementById("articlesInfo");
    let pageInfo = JSON.parse(articlesDom.value);
    if (direction === "left" && pageInfo.currentPage >= 0) {
      Server.loadArticlePreviewData(
        pageInfo.currentPage - 1,
        6,
        function (data, page, itemCount) {
          if (pageInfo.currentPage - 1 === 0) {
            document.getElementById("leftArticleButton").disabled = true;
          }
          if (pageInfo.maxPage !== 0) {
            document.getElementById("rightArticleButton").disabled = false;
          }
          pageInfo.currentPage = pageInfo.currentPage - 1;
          articlesDom.value = pageInfo;

          Client.insertAktuellesData(data, page, itemCount);
        }
      );
    } else if (
      direction === "right" &&
      pageInfo.currentPage < pageInfo.maxPage
    ) {
      Server.loadArticlePreviewData(
        pageInfo.currentPage + 1,
        6,
        function (data, page, itemCount) {
          if (pageInfo.currentPage + 1 > 0) {
            document.getElementById("leftArticleButton").disabled = false;
          }
          if (pageInfo.currentPage + 1 <= pageInfo.maxPage) {
            document.getElementById("rightArticleButton").disabled = true;
          }
          pageInfo.currentPage = pageInfo.currentPage + 1;
          articlesDom.value = pageInfo;
          window.scrollTo(0, 700);

          Client.insertAktuellesData(data, page, itemCount);
        }
      );
    }
  }

  static saveLocalStorage(name, text) {
    localStorage.setItem(name, text);
  }

  static loadLocalStorage(name) {
    return localStorage.getItem(name);
  }

  static textStorageInterval() {
    if (Client.getCurrentPage() === "aktuelles/newPage") {
      let articleTitle = document.getElementById("article-title").value;
      let articleContent = document.getElementById("articleContent").value;
      let articleDate = document.getElementById("article-date").value;
      let json = JSON.stringify({ articleTitle, articleContent, articleDate });
      Client.saveLocalStorage("newArticleData", json);
      setTimeout(Client.textStorageInterval, 5000);
    }
  }

  static loadNewArticleStorage() {
    let data = Client.loadLocalStorage("newArticleData");
    if (data !== "") {
      try {
        data = JSON.parse(data);
        let articleTitle = data.articleTitle;
        let articleContent = data.articleContent;
        let articleDate = data.articleDate;
        document.getElementById("article-title").value = articleTitle;
        document.getElementById("articleContent").value = articleContent;
        document.getElementById("article-date").value = articleDate;
      } catch (e) {
        console.log("Error while loading the written Text: ", e);
      }
    }
  }

  static validateNewArticle(
    articleTitle,
    articleContent,
    articleDate,
    articlePhotos,
    articlePreviewDescription
  ) {
    if (articleTitle.value === "") {
      _validateNewArticleErrorMessage = "Bitte füge einen Titel hinzu!";
      return false;
    } else if (articleContent.value === "") {
      _validateNewArticleErrorMessage = "Bitte schreibe Inhalt in den Artikel!";
      return false;
    } else if (articleDate.value === "") {
      _validateNewArticleErrorMessage = "Bitte wähle ein Datum!";
      return false;
    } else if (articlePhotos === true) {
      return true;
    } else if (articlePhotos.querySelector("#file-list") === null) {
      _validateNewArticleErrorMessage = "Bitte lade mindestens ein Bild hoch!";
      return false;
    } else if (articlePreviewDescription.value === "") {
      _validateNewArticleErrorMessage = "Bitte füge einen Vorschautext hinzu!";
      return false;
    } else {
      return true;
    }
  }

  static checkAuthorizationWindow() {
    let pw = document.getElementById("authorizationWindowPasswordInput").value;
    Server.authorize(function (isAuthorized) {
      if (isAuthorized) {
        Ui.hideAuthorizationWindow();
        setCookie("isAuthorized", true);
        setCookie("password", pw, 60);
        Server.newPage();
      } else {
        document.getElementById("authorizationWindowInfo").innerHTML =
          "Falsches Passwort!";
      }
    }, pw);
  }

  static returnToArticles() {
    location.href = host + "/?page=aktuelles/aktuelles";
  }

  static triggerFileInput() {
    let imgUpload = document.getElementById("img-upload-input");
    if (imgUpload != null) {
      imgUpload.click();
    }
  }

  static displaySelectedFiles() {
    document.getElementById("add-photos").innerHTML =
      "<img id='loadAnimation' src='images/icons/load.gif'>";

    let imgUpload = document.getElementById("img-upload-input").files;

    let html = "<div id='file-list'>";

    let promises = [];

    for (let i = 0; i < imgUpload.length; i++) {
      promises.push(
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = function () {
            resolve(img);
          };

          img.onerror = () => {
            reject("Fehler beim Laden des Bildes.");
          };

          img.src = URL.createObjectURL(imgUpload[i]);
        }).then((imgData) => this.compressImage(imgData, 1280, 720))
      );
    }

    Promise.all(promises)
      .then((imageDataArray) => {
        for (let i = 0; i < imgUpload.length; i++) {
          html += "<div class='image-preview'>";
          html += "<img src='" + imageDataArray[i] + "'>";
          html += "<p>" + imgUpload[i].name + "</p>";
          html += "</div>";
        }
        html += "</div>";

        document.getElementById("add-photos").innerHTML = html;
      })
      .catch((err) => {
        console.log("Fehler beim anzeigen des Bildes:", err);
      });
  }

  static compressImage(imgData, w, h) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const scaleFactor = Math.min(w / imgData.width, h / imgData.height);
        canvas.width = imgData.width * scaleFactor;
        canvas.height = imgData.height * scaleFactor;
        ctx.drawImage(imgData, 0, 0, canvas.width, canvas.height);
        const compressedImageData = canvas.toDataURL("image/jpeg", 0.8);
        resolve(compressedImageData);
      } catch (e) {
        reject("Fehler beim komprimieren des Bildes: ", e);
      }
    });
  }

  static getImageData(file, cb) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = function () {
        resolve(img);
      };

      img.onerror = () => {
        reject("Fehler beim Laden des Bildes.");
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static showEditButtons() {
    let modifyButtons = document.getElementById("modify-buttons");
    modifyButtons.innerHTML = `
      <button onclick="Server.showDeleteList()">Löschen</button>
      <button onclick="Server.showEditList()">Bearbeiten</button>
    `;
  }

  static fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      var successful = document.execCommand("copy");
      var msg = successful ? "successful" : "unsuccessful";
      console.log("Fallback: Copying text command was " + msg);
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }

    document.body.removeChild(textArea);
  }
  static copyTextToClipboard(text) {
    if (!navigator.clipboard) {
      this.fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(
      function () {
        console.log("Async: Copying to clipboard was successful!");
      },
      function (err) {
        console.error("Async: Could not copy text: ", err);
      }
    );
  }
  static openHamburgerMenu() {
    document.querySelector("nav").classList = "navMobile";
  }
  static closeHamburgerMenu() {
    document.querySelector("nav").classList = "nav";
  }
}

class Ui {
  static showAuthorizationWindow() {
    document.getElementById("alertPlaceholder").innerHTML =
      "<div id='authorizationWindowContainer'>" +
      "<div id='authorizationWindow'>" +
      "<p id='authorizationWindowInfo'>Bestätige deine Identität</p>" +
      "<input id='authorizationWindowPasswordInput' type='password' placeholder='Passwort eingeben...'/>" +
      "<input id='authorizationWindowSubmit' type='button' value='Bestätigen' onclick='Client.checkAuthorizationWindow()'/>" +
      "<input id='authorizationWindowCancel' type='button' value='Abbrechen' onclick='Ui.hideAuthorizationWindow()'/>" +
      "</div></div>";
  }

  static showConfirmationWindow() {
    document.getElementById("alertPlaceholder").innerHTML =
      "<div id='authorizationWindowContainer'>" +
      "<div id='authorizationWindow'>" +
      "<p id='authorizationWindowInfo'>Artikel erfolgreich erstellt!</p>" +
      "<input id='authorizationWindowSubmit' type='button' value='Zurück zu Aktuelles' onclick='Client.returnToArticles()'/>" +
      "</div></div>";
  }

  static hideAuthorizationWindow() {
    document.getElementById("alertPlaceholder").innerHTML = "";
  }

  static selectPreviewImage() {
    let pasteImages = document.getElementById("file-list").innerHTML;

    document.getElementById(
      "alertPlaceholder"
    ).innerHTML = `<div id='authorizationWindowContainer'> 
        <div id='selectPreviewImageContainer'>
          <h2>Welches Bild soll als Artikelvorschau genutzt werden?</h2>
          <div class='file-list'> 
            ${pasteImages}
          </div>
        </div>
      </div>`;

    let imagePreviews = document.querySelectorAll(
      "#authorizationWindowContainer .image-preview"
    );

    for (let i = 0; i < imagePreviews.length; i++) {
      imagePreviews[i].addEventListener("click", () => {
        Ui.loadScreen();
        Ui.confirmSelectedPreviewImage(
          imagePreviews[i].querySelector("p").innerHTML
        );
      });
    }
  }

  static confirmSelectedPreviewImage(previewImageName) {
    _previewImageName = previewImageName;
    Server.authorize(Server.fetchNewPage);
  }

  static loadScreen() {
    document.getElementById("alertPlaceholder").innerHTML =
      "<div id='authorizationWindowContainer'> <img id='uploadAnimation' src='images/icons/load.gif'> </div>";
  }

  static confirmDeleteWindow() {
    document.getElementById("alertPlaceholder").innerHTML =
      "<div id='authorizationWindowContainer'>" +
      "<div id='authorizationWindow'>" +
      "<p id='authorizationWindowInfo'>Möchtest du wirklich den gewählten Artikel löschen?</p>" +
      `<input id='authorizationWindowSubmit' type='button' value='Löschen' onclick='Ui.confirmDelete()'/>` +
      "<input id='authorizationWindowCancel' type='button' value='Abbrechen' onclick='Ui.hideAuthorizationWindow()'/>" +
      "</div></div>";
  }

  static confirmDelete() {
    this.loadScreen();
    Server.authorize(Server.deletePage);
  }

  static confirmEdit() {
    this.loadScreen();
    Server.authorize(Server.editPage);
  }

  static setScroll(bool) {
    let body = document.body;
    if (!bool) {
      body.classList.add("noscroll");
    } else {
      body.classList.remove("noscroll");
    }
  }
}

window.addEventListener("popstate", function (event) {
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get("page");
  navigate(page.replace("/", " "));
});
