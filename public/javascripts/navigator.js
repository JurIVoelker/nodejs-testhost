let _previewImageName;
let _validateNewArticleErrorMessage;
let _deletePage;
let _editArticlePath;
let _hamburgerContent = "";
let _currentPage = "start/start";
let _requestSent = false;

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
      window.scrollTo(0, 500);

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
          Server.getPageContent(_editArticlePath + " content", true, (data) => {
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
            Ui.hideAuthorizationWindow();
          });
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
            Server.getNextImages(images.length);
          }
          break;
        case "anderes kontakt":
          Server.insertEmails();
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
      case "galerie/galerie":
        let images = document.querySelectorAll("#pageContent img");
        if (images !== null) {
          Server.getNextImages(images.length);
        }
        break;
      case "anderes/kontakt":
        Server.insertEmails();
        break;
    }

    Server.loadNextGames(4, function (data) {
      let contentHTML =
        "<h1 style='margin-bottom: 30px'>Unsere nächsten Spiele:</h1>" +
        "<table><tr class='bigRow'><td><h3>Heimmannschaft</h3></td><td><h3>Uhrzeit und Datum</h3></td><td><h3>Gastmannschaft</h3></td><td><h3>Liga</h3></td></tr>";
      data.forEach((element) => {
        contentHTML += getNextGamesHTML(element);
      });
      contentHTML += "</table>";

      document.getElementById("nextGamesData").value = contentHTML;

      if (Client.getCurrentPage() === "start/start") {
        let nextGames = document.getElementById("nextGames");
        if (nextGames != null) {
          nextGames.innerHTML = contentHTML;
        }
      }
    });
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
    fetch(host + "/api/navigation/" + page, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isAuthorized: isAuthorized }), // Send password to server in fetch request body
    })
      .then((response) => response.json())
      .then((data) => {
        callback(data, isAuthorized);
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occured while fetching
  }

  static login(pw = "") {
    // Method sends POST request to API with login data
    let password = {
      // If password is passed as parameter, us that one as the password
      password:
        "" + (pw === "" ? document.getElementById("loginField").value : pw),
    };

    fetch(host + "/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(password), // Send password to server in fetch request body
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.isLoggedin) {
          setCookie("password", password.password, 60); // Save password as cookie for 30 minutes
        }
        document.getElementById("pageContent").innerHTML = data.content; // Change data on page
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occured while fetching, return error
  }

  static loadNextGames(count, callback) {
    fetch(host + "/api/nextGames/" + count, {
      method: "GET", // Send password to server in fetch request body
    })
      .then((response) => response.json())
      .then((data) => {
        callback(data);
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occurred while fetching
  }

  static loadArticlePreviewData(page, itemCount, callback) {
    fetch(host + "/api/news/previews/" + page + "?itemsPerPage=" + itemCount, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        callback(data, page, itemCount);
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occured while fetching
  }

  static loadTeamPlacements(data) {
    let urls = [];
    data.nextGames.forEach((element) => {
      urls.push(
        encodeURIComponent(
          Client.getLeagueURL(
            element.heim.includes("Klingenmünster")
              ? element.heim
              : element.gast,
            element.league
          )
        ) +
          "&heim=" +
          element.heim +
          "&gast=" +
          element.gast
      );
    });

    const fetchPromises = urls.map((url) => Server.fetchGameRank(url));

    Promise.all(fetchPromises)
      .then((results) => {
        const domParser = new DOMParser();
        let xmlDoc = domParser.parseFromString(
          document.getElementById("nextGamesData").value,
          "text/html"
        );
        let entry = xmlDoc.querySelectorAll(".game");
        for (let i = 0; i < entry.length; i++) {
          if (!isNaN(results[i][0]) && !isNaN(results[i][1])) {
            entry[i].querySelector(".heim p").innerHTML = results[i][0];
            entry[i].querySelector(".gast p").innerHTML = results[i][1];
            entry[i]
              .querySelector(".heim")
              .setAttribute(
                "data-bg",
                results[i][0] == "1"
                  ? "gold"
                  : results[i][0] == "2"
                  ? "silver"
                  : results[i][0] == "3"
                  ? "bronze"
                  : "other"
              );
            entry[i]
              .querySelector(".gast")
              .setAttribute(
                "data-bg",
                results[i][1] == "1"
                  ? "gold"
                  : results[i][1] == "2"
                  ? "silver"
                  : results[i][1] == "3"
                  ? "bronze"
                  : "other"
              );
          }
        }
        if (Client.getCurrentPage() === "start/start") {
          document.getElementById("nextGames").innerHTML =
            xmlDoc.body.innerHTML;
        }
        document.getElementById("nextGamesData").value = xmlDoc.body.innerHTML;
      })
      .catch((error) => {
        console.error("Ein Fehler ist aufgetreten:", error);
      });
  }

  static fetchGameRank(url) {
    return new Promise((resolve, reject) => {
      if (url !== undefined) {
        fetch(host + "/api/gameRank?url=" + url, {
          method: "GET", // Send password to server in fetch request body
        })
          .then((response) => response.json())
          .then((data) => {
            resolve(data);
          })
          .catch((error) => reject(error));
      } else {
        reject("Error");
      }
    });
  }

  static newPage() {
    if (Client.getCurrentPage() === "aktuelles/newPage") {
      let articleTitle = document.getElementById("articleTitle");
      let articleContent = document.getElementById("articleContent");
      let articleDate = document.getElementById("articleDate");
      let articlePhotos = document.getElementById("addPhotos");
      if (
        Client.validateNewArticle(
          articleTitle,
          articleContent,
          articleDate,
          articlePhotos
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
    let title = document.getElementById("articleTitle").value;
    let content = document.getElementById("articleContent").value;
    let date = document.getElementById("articleDate").value;

    let files = document.getElementById("imgUploadInput").files;
    let fileNames = [];

    for (let i = 0; i < files.length; i++) {
      fileNames.push(files[i].name);
    }
    Ui.loadScreen();
    fetch(host + "/api/newPage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
        content: content,
        date: date,
        fileNames: fileNames,
        previewFile: _previewImageName,
      }),
    })
      .then((response) => response.json())
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
    return fetch(host + "/api/uploadImage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileData: fileData,
        path: path,
      }),
    }).then((response) => response.json());
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
      if (
        Client.validateNewArticle(
          articleTitle,
          articleContent,
          articleDate,
          true
        )
      ) {
        fetch(host + "/api/editPage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            articleTitle: articleTitle.value,
            articleContent: articleContent.innerHTML,
            articleDate: articleDate.value,
            editArticlePath: _editArticlePath,
          }),
        })
          .then((response) => response.json())
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

  static deletePage(isAuthorized) {
    if (isAuthorized) {
      fetch(host + "/api/deletePage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deletePath: _deletePage,
        }),
      })
        .then((response) => response.json())
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
    fetch(host + "/api/startPageArticlePreviews", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((res) => {
        let articleContainer = document.querySelectorAll(".newsItem");
        if (articleContainer !== null) {
          for (let i = 0; i < articleContainer.length; i++) {
            articleContainer[i].querySelector(".image").innerHTML =
              "<img src='" + res.data[i][0] + "'>";
            articleContainer[i].querySelector(".title").innerHTML =
              res.data[i][1];
            articleContainer[i].onclick = function () {
              navigate(res.data[i][2] + " content");
            };
          }
        }
      })
      .catch((err) => {
        console.log("Error while trying to delete Article", err);
      });
  }

  static loadAllGames(callback) {
    fetch(host + "/api/allGames/", {
      method: "GET", // Send password to server in fetch request body
    })
      .then((response) => response.json())
      .then((data) => {
        callback(data);
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occurred while fetching
  }

  static getNextImages(imgCount) {
    fetch(host + "/api/nextImages?c=" + imgCount + "", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((res) => {
        let imagesPc = JSON.parse(Client.loadLocalStorage("imagesPc"));
        let imagesMobile = JSON.parse(Client.loadLocalStorage("imagesMobile"));

        for (let i = 0; i < res.imageNames.length; i++) {
          if (i % 3 === 0) {
            imagesPc["col1"].push('<img src="' + res.imageNames[i] + '">');
          } else if (i % 3 === 1) {
            imagesPc["col2"].push('<img src="' + res.imageNames[i] + '">');
          } else {
            imagesPc["col3"].push('<img src="' + res.imageNames[i] + '">');
          }
          imagesMobile["images"].push('<img src="' + res.imageNames[i] + '">');
        }

        Client.saveLocalStorage("imagesPc", JSON.stringify(imagesPc));
        Client.saveLocalStorage("imagesMobile", JSON.stringify(imagesMobile));

        if (
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          ) ||
          true
        ) {
          let images = "";

          for (let i = 0; i < imagesMobile["images"].length; i++) {
            images += imagesMobile["images"][i];
          }

          document.getElementById("imgBox").innerHTML =
            "<div id='mobileImageBox'><div class='col'>" +
            images +
            "</div></div>";
        } else {
          let col1 = "";
          let col2 = "";
          let col3 = "";

          for (let i = 0; i < imagesPc["col1"].length; i++) {
            col1 += imagesPc["col1"][i];
          }
          for (let i = 0; i < imagesPc["col2"].length; i++) {
            col2 += imagesPc["col2"][i];
          }
          for (let i = 0; i < imagesPc["col3"].length; i++) {
            col3 += imagesPc["col3"][i];
          }

          document.getElementById("imgBox").innerHTML =
            "<div class='col'>" +
            col1 +
            "</div>" +
            "<div class='col'>" +
            col2 +
            "</div>" +
            "<div class='col'>" +
            col3 +
            "</div>";
        }
        _requestSent = false;
      })
      .catch((err) => {
        console.log("Error", err);
        _requestSent = false;
      });
  }

  static copyMail(mailto) {
    fetch(host + "/api/getMail?mail=" + mailto, {
      method: "GET", // Send password to server in fetch request body
    })
      .then((response) => response.json())
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

  static setMail(mailto) {
    fetch(host + "/api/getMail?mail=" + mailto, {
      method: "GET", // Send password to server in fetch request body
    })
      .then((response) => response.json())
      .then((data) => {
        document.getElementById(mailto).innerHTML = mailto + ": " + data;
      })
      .catch((error) => console.error("Fehler:", error)); // If an error occured while fetching, return error
  }

  static insertEmails() {
    let mailList = ["Vorstand", "Sportwart", "Jugendwart"];
    for (let i = 0; i < mailList.length; i++) {
      this.setMail(mailList[i]);
    }
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
      let newsContent = document.getElementById("newsContent");
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
      document.getElementById("newsContent").innerHTML = contentHTML;
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
          window.scrollTo(0, 500);

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
      let articleTitle = document.getElementById("articleTitle").value;
      let articleContent = document.getElementById("articleContent").value;
      let articleDate = document.getElementById("articleDate").value;
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
        document.getElementById("articleTitle").value = articleTitle;
        document.getElementById("articleContent").value = articleContent;
        document.getElementById("articleDate").value = articleDate;
      } catch (e) {
        console.log("Error while loading the written Text: ", e);
      }
    }
  }

  static validateNewArticle(
    articleTitle,
    articleContent,
    articleDate,
    articlePhotos
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
    } else if (articlePhotos.querySelector("#uploadIcon") !== null) {
      _validateNewArticleErrorMessage = "Bitte lade mindestens ein Bild hoch!";
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
    let imgUpload = document.getElementById("imgUploadInput");
    if (imgUpload != null) {
      imgUpload.click();
    }
  }

  static displaySelectedFiles() {
    document.getElementById("uploadIcon").innerHTML =
      "<img id='loadAnimation' src='images/icons/load.gif'>";

    let imgUpload = document.getElementById("imgUploadInput").files;

    let html = "<div id='fileList'>";

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
          html += "<div class='imagePreview'>";
          html += "<img src='" + imageDataArray[i] + "'>";
          html += "<p>" + imgUpload[i].name + "</p>";
          html += "</div>";
        }
        html += "</div>";

        document.getElementById("addPhotos").innerHTML = html;
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
    let previews = document.querySelectorAll(".newsPreview");

    for (let i = 0; i < previews.length; i++) {
      let navigationPath =
        "aktuelles " + previews[i].getAttribute("data-location");
      let editButtons = document.createElement("div");
      editButtons.setAttribute("class", "editButtonsContainer");
      editButtons.innerHTML =
        "<button class='newsPreviewEditButton' type='button' onclick='Server.onEditPage(\"" +
        navigationPath +
        "\")'> <img src='/images/icons/pencil.svg'> </button>" +
        "<button class='newsPreviewDeleteButton' type='button' onclick='Server.onDeletePage(\"" +
        navigationPath +
        "\")'> <img src='/images/icons/trash.svg'> </button>";
      previews[i].parentNode.insertBefore(editButtons, previews[i]);
    }
  }

  static openHamburgerMenu() {
    Ui.setScroll(false);
    if (_hamburgerContent === "") {
      let navItems = document.querySelectorAll(".navContainer li");

      let hamburgerWrapper = document.createElement("div");
      hamburgerWrapper.id = "hamburgerMenuWrapper";

      let hamburger = document.createElement("ul");
      hamburger.id = "hamburgerMenu";

      for (let i = 0; i < navItems.length; i++) {
        hamburger.appendChild(navItems[i]);
      }

      hamburgerWrapper.appendChild(hamburger);

      let input = document.getElementById("alertPlaceholder");
      input.appendChild(hamburgerWrapper);
      _hamburgerContent = input.innerHTML;
    } else {
      document.getElementById("alertPlaceholder").innerHTML = _hamburgerContent;
    }
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
    let pasteImages = document.getElementById("fileList").innerHTML;

    document.getElementById("alertPlaceholder").innerHTML =
      "<div id='authorizationWindowContainer'> <div id='selectPreviewImageContainer'> <h4>Welches Bild soll als Artikelvorschau genutzt werden?</h4>" +
      pasteImages +
      "</div></div>";
    let imagePreviews = document.querySelectorAll(
      "#authorizationWindowContainer .imagePreview"
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
      "<input id='authorizationWindowSubmit' type='button' value='Löschen' onclick='Ui.confirmDelete()'/>" +
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
