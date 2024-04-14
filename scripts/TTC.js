const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

class TTC {
  static parseNextGames(data, count) {
    const dom = new JSDOM(data);
    const parser = new dom.window.DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/html");

    let elements = xmlDoc.querySelectorAll("tbody tr");

    let prevDate = "";
    let arr = [];

    if (count == -1) {
      count = elements.length;
    }

    for (let i = 0; i < elements.length; i++) {
      let element = elements[i];
      let score = element.querySelector(":nth-child(9)").querySelector("a");
      let date = element.querySelector(":nth-child(1)").querySelector("span");
      if (date != null) {
        prevDate = date.innerHTML.split("\n")[1];
      }
      if (score == null) {
        let time = element
          .querySelector(":nth-child(2)")
          .innerHTML.substring(0, 6)
          .split("\n")[1];
        let league = element.querySelector(".leagueNickname").innerHTML;
        let heim = element.querySelector(":nth-child(5)").querySelector("a");
        let gast = element.querySelector(":nth-child(6)").querySelector("a");

        if (gast != null && heim != null) {
          heim = heim.innerHTML;
          gast = gast.innerHTML;

          if (league.length > 30) {
            league = element.querySelector(":nth-child(5)").innerHTML;
          }
          league = this.getLeagueName(league);
          const url = this.getLeagueURL(
            heim.includes("Klingenmünster") ? heim : gast,
            league
          );
          if (!url) {
            console.log("Error: " + league, heim, gast, prevDate, time);
          } else {
            arr.push(new Game(league, heim, gast, prevDate, time, url));
            if (count <= 1) {
              break; // Stop the loop here
            }
            count--;
          }
        }
      }
    }
    return { nextGames: arr };
  }

  static getLeagueName(abbreviation) {
    let renameLeagues = {
      // Ligen:
      BOL: "Bezirksoberliga Herren",
      HBL: "Bezirksliga Herren",
      HKL: "Kreisliga Herren",
      HKKA: "Kreisklasse A Herren",
      HKKB: "Kreisklasse B Herren",
      "2. PL D": "Zweite Pfalzliga Damen",
      mJU12BL: "Bezirksliga Jungen U12",
      mJU15BL: "Bezirksliga Jungen U15",
      mJU15BK: "Bezirksklasse Jungen U15",
      mJU19BL: "Bezirksliga Jungen U19",
      wJU15BL: "Bezirksliga Mädchen U15",

      //Pokal:
      "KP H": "Kreispokal Herren",
      "KKP H": "Kreisklassenpokal Herren",
      "BP MJU15": "Bezirkspokal Jungen U15",
    };

    if (renameLeagues.hasOwnProperty(abbreviation)) {
      return renameLeagues[abbreviation];
    }
    return abbreviation;
  }

  static parseTeamRankings(game) {
    return this.fetchHTML(game.url)
      .then((data) => {
        const dom = new JSDOM(data);
        const xmlDoc = dom.window.document;

        let elements = xmlDoc.querySelectorAll(".table tbody")[0];
        elements = elements.querySelectorAll("tr");

        let heimRank = "";
        let gastRank = "";

        for (let i = 0; i < elements.length; i++) {
          let element = elements[i];
          let team = element.querySelector(":nth-child(3) a").innerHTML;
          if (team === game.heim) {
            heimRank = element
              .querySelector(":nth-child(2)")
              .innerHTML.split("\n")[1];
          } else if (team === game.gast) {
            gastRank = element
              .querySelector(":nth-child(2)")
              .innerHTML.split("\n")[1];
          }
          if (gastRank !== "" && heimRank !== "") {
            break;
          }
        }
        game.placementHeim = heimRank;
        game.placementGast = gastRank;
        return game;
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen der HTML-Daten:", error);
        throw error; // Weiterwerfen, um den Fehler an den Aufrufer weiterzugeben
      });
  }

  static nextGamesInfo(body, count) {
    return new Promise((resolve, reject) => {
      let nextGames = this.parseNextGames(body, count);
      const fetchPromises = nextGames.nextGames.map((game) =>
        this.parseTeamRankings(game)
      );
      Promise.all(fetchPromises)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  static isValid(time) {
    const timestamp = new Date(time).getTime();
    const currentTime = new Date().getTime();

    const difference = currentTime - timestamp;
    const validTime = 3 * 60 * 60 * 1000; //Eintrag 3 Stunden Gültig

    return difference < validTime;
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
      case "TTC KlingenmünsterBezirksliga Jungen U12":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Jungen-12/gruppe/444751/tabelle/gesamt/";
      case "TTC KlingenmünsterBezirksliga Jungen U15":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Jungen-15/gruppe/444703/tabelle/gesamt/";
      case "TTC Klingenmünster IIBezirksliga Jungen U15":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Jungen-15/gruppe/444703/tabelle/gesamt/";
      case "TTC Klingenmünster IIIBezirksklasse Jungen U15":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksklasse-Jungen-15-Sued/gruppe/444744/tabelle/gesamt/";
      case "TTC KlingenmünsterBezirksliga Mädchen U15":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Maedchen-15/gruppe/444696/tabelle/gesamt/";
      case "TTC KlingenmünsterBezirksliga Jungen U19":
        return "https://www.mytischtennis.de/clicktt/PTTV/23-24/ligen/Bezirksliga-Jungen-19/gruppe/444640/tabelle/gesamt/";
      default:
        return undefined;
    }
  }

  static fetchHTML(url) {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
          }
          return response.text();
        })
        .then((html) => resolve(html))
        .catch((error) => reject(error));
    });
  }

  static saveJSON(res, fileName) {
    const time = new Date().getTime();
    const json = { validUntil: time, games: res };
    fs.writeFileSync(
      path.join(__dirname, "..", "scripts") + "/" + fileName,
      JSON.stringify(json)
    );
  }
}

class Game {
  league;
  heim;
  gast;
  date;
  time;
  placementHeim;
  placementGast;
  url;

  constructor(league, heim, gast, date, time, url) {
    this.league = league;
    this.heim = heim;
    this.gast = gast;
    this.date = date;
    this.time = time;
    this.url = url;
  }
}

module.exports = TTC;
