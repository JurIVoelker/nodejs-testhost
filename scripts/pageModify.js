const fs = require("fs");
const path = require("path");

function log(message) {
  const filePath = path.join(__dirname, "..", "logs", "logs.txt");
  const logStream = fs.createWriteStream(filePath, { flags: 'a' });
  logStream.write(`${message}\n`);
  logStream.end();
}

class PageModify {
  static loadPage(filePath, callback) {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading the HTML file:", err);
        callback(err, null);
      } else {
        callback(null, data);
      }
    });
  }
 
  static getNthNewsPage(index, isPreview, callback) {
    let filePath =
      path.join(__dirname, "..", "public", "pages", "aktuelles") + "/";

    // Liest zuerst alle Ordner im Verzeichnis "/server/pages/aktuelles/" aus und liest dann abhängig von [isPreview]
    // aus und öffnet dann den Ordner mit dem neuesten Inhalt (Datum mit höchstem Wert)
    fs.readdir(filePath, { withFileTypes: true }, (err, files) => {
      if (err) {
        console.error("Fehler beim Lesen des Verzeichnisses:", err);
        return;
      }

      const directories = files
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      fs.readFile(
        filePath +
          directories[directories.length - 1 - index] +
          "/" +
          (isPreview ? "preview.html" : "content.html"),
        "utf8",
        (err, data) => {
          if (err) {
            console.error("Error reading the HTML file:", err);
            callback(err, null, directories.length);
          } else {
            callback(null, data, directories.length);
          }
        }
      );
    });
  }

  static getPreviews(page, itemsPerPage, callback) {
    log("test");
    let filePath =
      path.join(__dirname, "..", "public", "pages", "aktuelles") + "/";

    fs.readdir(filePath, { withFileTypes: true }, (err, files) => {
      if (err) {
        console.error("Fehler beim Lesen des Verzeichnisses:", err);
        return;
      }

      let directories = files
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      let dirCount = directories.length;

      directories.reverse();
      try {
        let fileStartIndex = page * itemsPerPage;
        let fileEndIndex = itemsPerPage * (page + 1);
        directories = directories.slice(fileStartIndex, fileEndIndex);
      } catch (e) {
        callback(e, null, null);
      }
      this.nextFile(filePath, directories, [], callback, dirCount);
    });
  }

  static startPageArticlePreviews() {
    return new Promise((resolve, reject) => {
      let filePath =
        path.join(__dirname, "..", "public", "pages", "aktuelles") + "/";

      fs.readdir(filePath, { withFileTypes: true }, (err, files) => {
        if (err) {
          console.error("Fehler beim Lesen des Verzeichnisses:", err);
          return;
        }

        let directories = files
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        directories.reverse();
        directories = directories.slice(
          0,
          directories.length >= 3 ? 3 : directories.length
        );

        let promises = [];

        for (let i = 0; i < directories.length; i++) {
          promises.push(
            new Promise((resolve, reject) => {
              fs.readFile(
                filePath + "/" + directories[i] + "/preview.html",
                "utf8",
                (err, data) => {
                  if (err) {
                    reject("Error reading the HTML file:", err);
                  } else {
                    resolve(data);
                  }
                }
              );
            })
          );
        }
        Promise.all(promises)
          .then((data) => {
            for (let i = 0; i + directories.length < 3; i++) {
              data.push("", "Artikel nicht gefunden", "");
            }
            resolve(data);
          })
          .catch((err) => {
            reject(err);
          });
      });
    });
  }

  static nextFile(filePath, fileName, dataCollection, callback, dirLength) {
    if (fileName.length <= 0) {
      callback(null, dataCollection, dirLength);
    } else {
      fs.readFile(filePath + fileName[0] + "/preview.html", "utf8", (err, data) => {
        if (err) {
          this.nextFile(
            filePath,
            fileName.slice(1),
            dataCollection,
            callback,
            dirLength
          );
        } else {
          dataCollection.push(data);
          this.nextFile(
            filePath,
            fileName.slice(1),
            dataCollection,
            callback,
            dirLength
          );
        }
      });
    }
  }

  static createPreview(filePath, title, date, previewDescription) {
    return new Promise((resolve, reject) => {
      try {
        let previewImagePath = filePath.split("/");
        let navigationPath = previewImagePath[1];
        previewImagePath = `pages/aktuelles/${navigationPath}/preview.jpeg`;
        log("[createPreview - previewImagePath]: ", previewImagePath);
        log("[createPreview - navigationPath]: ", navigationPath);

        
        let html = `
          <div class="card" data-location="${navigationPath}" onClick="navigate('aktuelles ${navigationPath} content')">
            <div class="image">
              <img src="${previewImagePath}" alt="Vorschau Bild">
            </div> 
            <div class="content">
              <div class="text-content">
                <h3 class="title">${title}</h3>
                <p class="text">${previewDescription}</p>
              </div>
              <p class="date">${date}</p>
            </div>
          </div>
        `;
        this.writeFile(filePath, html, "/preview.html");
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  static newArticle(
    title,
    content,
    date,
    fileNames,
    previewFile,
    previewDescription
  ) {
    if (
      !title ||
      !content ||
      !date ||
      !fileNames ||
      !previewFile ||
      !previewDescription
    ) {
      throw new Error(`Not all props defined: 
      title: ${title}
      content: ${content}
      date: ${date}
      fileNames: ${fileNames}
      previewFile: ${previewFile}
      previewDescription: ${previewDescription}
      `);
    }
    return new Promise((resolve, reject) => {
      let filePath =
        path.join(__dirname, "..", "public", "pages", "aktuelles") + "/";
      let newDirectorySuffix = "_0";

      fs.readdir(filePath, { withFileTypes: true }, (err, files) => {
        if (err) {
          reject("Fehler beim Lesen des Verzeichnisses:", err);
        }
        console.log(filePath);

        let directories = files
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        let count = 0;
        while (directories.includes(date + newDirectorySuffix)) {
          count++;
          newDirectorySuffix = "_" + count;
        }
        let newDirectoryName = date + newDirectorySuffix;

        fs.mkdir(filePath + newDirectoryName, function (err) {
          if (err) {
            if (err.code == "EEXIST")
              reject('Error while creating directory: "Dir already Exists"');
            // Ignore the error if the folder already exists
            else reject(err); // Something else went wrong
          } else {
            let promises = [
              PageModify.createPreview(
                filePath + newDirectoryName,
                title,
                date,
                previewDescription
              ),
              PageModify.createPage(
                filePath + newDirectoryName,
                title,
                date,
                content,
                fileNames,
                previewFile
              ),
            ];

            let paths = [];
            for (let i = 0; i < fileNames.length; i++) {
              paths.push(filePath + newDirectoryName + "/" + fileNames[i]);
            }

            Promise.all(promises)
              .then(() => {
                resolve(paths, newDirectoryName + "/preview.jpg");
              })
              .catch((err) => {
                reject(err);
              });
          }
        });
      });
    });
  }

  static writeFile(filePath, htmlContent, fileName) {
    let fs = require("fs");
    fs.writeFile(filePath + fileName, htmlContent, (error) => {
      console.log(error);
    });
  }

  static saveImage(filePath, fileData) {
    //path = "./public/pages/aktuelles/test.jpeg"
    return new Promise((resolve, reject) => {
      const imageData = Buffer.from(fileData.split(";base64,").pop(), "base64");
      fs.writeFile(filePath, imageData, (err) => {
        reject(err);
      });
      resolve("Image successfully saved as " + filePath + "!");
    });
  }

  static createPage(filePath, title, date, content, fileNames, previewFile) {
    return new Promise((resolve, reject) => {
      try {
        let previewImagePath = filePath.split("/");
        let navigationPath = previewImagePath[1];
        previewImagePath = `pages/aktuelles/${navigationPath}/preview.jpeg`;

        let imgPath = `pages/aktuelles/${navigationPath}`;

        let images = [[""], [""], [""]];

        let filteredImages = [];
        for (let i = 0; i < fileNames.length; i++) {
          if (fileNames[i] !== previewFile) {
            filteredImages.push(fileNames[i]);
          }
        }

        fileNames = filteredImages;

        for (let i = 0; i < fileNames.length; i++) {
          images[i % 3] +=
            "<img src='" + imgPath + "/" + fileNames[i] + ".jpeg'>";
        }

        let htmlContent =
          '<div id="articlePageContent">' +
          "    <h1>" +
          title +
          "</h1>" +
          "    <p id='date'>" +
          date +
          "</p>" +
          "    <div class='textWrap'> <img src='" +
          previewImagePath +
          "'> " +
          content +
          "</div>" +
          "    <div id='imgBox'>" +
          "    <div class='col'>" +
          images[0] +
          "</div>" +
          "    <div class='col'>" +
          images[1] +
          "</div>" +
          "    <div class='col'>" +
          images[2] +
          "</div>" +
          "</div></div>";
        this.writeFile(filePath, htmlContent, "/content.html");
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  static deleteArticle(filePath) {
    return new Promise((resolve, reject) => {
      filePath = filePath.replace(" ", "/");
      let folderPath =
        path.join(__dirname, "..", "public", "pages", "aktuelles") +
        "/" +
        filePath;
      console.log(folderPath);
      try {
        fs.rmSync(folderPath, { recursive: true, force: true });
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  static editArticle(
    articleTitle,
    articleContent,
    articleDate,
    editArticlePath,
    articlePreview
  ) {
    const filePath = path.join(
      __dirname,
      "..",
      "public",
      "pages",
      "aktuelles",
      editArticlePath
    );
    return new Promise((resolve, reject) => {
      this.loadPage(filePath + "/content.html", (err, data) => {
        if (err) {
          reject(err);
        } else {
          const jsdom = require("jsdom");
          const doc = new jsdom.JSDOM(data);
          doc.window.document.querySelector("h1").innerHTML = articleTitle;
          doc.window.document.getElementById("date").value = articleDate;
          let imgSrc = doc.window.document.querySelector("img").src;
          doc.window.document.querySelector(".textWrap").innerHTML =
            "<img src='" + imgSrc + "'>" + articleContent;
          this.writeFile(
            filePath + "/",
            doc.window.document.documentElement.innerHTML,
            "content.html"
          );

          this.loadPage(filePath + "/preview.html", (err, data) => {
            if (err) {
              reject(err);
            } else {
              let doc2 = new jsdom.JSDOM(data);
              doc2.window.document.querySelector("h3").innerHTML = articleTitle;
              doc2.window.document.querySelector(".date").innerHTML =
                articleDate;
              if (articlePreview !== "[unverändert]") {
                doc2.window.document.querySelector(".text").innerHTML =
                  articlePreview;
              }
              this.writeFile(
                filePath + "/",
                doc2.window.document.documentElement.innerHTML,
                "preview.html"
              );
              resolve();
            }
          });
        }
      });
    });
  }

  static getNextImages(imgCount) {
    let displayCount = 15;
    return new Promise((resolve, reject) => {
      let filePath = path.join(
        __dirname,
        "..",
        "public",
        "pages",
        "galerie",
        "images"
      );
      let imageNames = [];
      fs.readdir(filePath, { withFileTypes: true }, (err, files) => {
        if (!err) {
          let start = files.length - imgCount - 1;
          let end =
            files.length - imgCount - displayCount <= 0
              ? 0
              : files.length - imgCount - displayCount;

          if (start <= 0) {
            resolve([]);
          }

          for (let i = start; i > end; i--) {
            imageNames.push("pages/galerie/images/" + files[i].name);
          }

          resolve(imageNames);
        } else {
          reject(err);
        }
      });
    });
  }
}

module.exports = PageModify;
