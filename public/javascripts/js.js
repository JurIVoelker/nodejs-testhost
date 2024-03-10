const host = "https://nodejs-testhost.vercel.app/";

// Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
window.onscroll = function () {
  stickyNavbar();
  if (!_requestSent && _currentPage === "galerie/galerie") {
    let elements = document.querySelectorAll(".col");
    for (let i = 0; i < elements.length; i++) {
      if (isElementVisible(elements[i].lastChild)) {
        _requestSent = true;
        Server.getNextImages(
          document.querySelectorAll("#pageContent img").length
        );
        break;
      }
    }
  }
};

window.onload = function () {
  //loadNextGames(6);
  Server.initialize();
};

function stickyNavbar() {
  const navbar = document.getElementById("nav");
  const sticky = 500;
  if (window.pageYOffset >= sticky) {
    navbar.classList.add("sticky");
  } else {
    navbar.classList.remove("sticky");
  }
}

function getNextGamesHTML(element) {
  let time = '<p class="time">' + element.date + " um " + element.time + "</p>";
  let league = '<p class="class">' + element.league + "</p>";

  let colorHeim =
    element.placementHeim == "1"
      ? "gold"
      : element.placementHeim == "2"
      ? "silver"
      : element.placementHeim == "3"
      ? "bronze"
      : "other";
  let colorGast =
    element.placementGast == "1"
      ? "gold"
      : element.placementGast == "2"
      ? "silver"
      : element.placementGast == "3"
      ? "bronze"
      : "other";

  let heimRank =
    '<div class="ranking heim" data-bg="' +
    colorHeim +
    '"><p>' +
    element.placementHeim +
    "</p></div>";
  let gastRank =
    '<div class="ranking gast" data-bg="' +
    colorGast +
    '"><p>' +
    element.placementGast +
    "</p></div>";

  if (element.placementHeim === undefined) {
    heim = "<div><p>" + element.heim + "</p></div>";
    gast = "<div><p>" + element.gast + "</p></div>";
  } else {
    heim = "<div>" + heimRank + "<p>" + element.heim + "</p></div>";
    gast = "<div>" + gastRank + "<p>" + element.gast + "</p></div>";
  }

  return (
    '<tr class="game">' +
    "<td>" +
    heim +
    "</td>" +
    "<td>" +
    time +
    "</td>" +
    "<td>" +
    gast +
    "</td>" +
    "<td>" +
    league +
    "</td>" +
    "</tr>"
  );

  return (
    '<tr class="game">' +
    "<td>" +
    heim +
    "</td>" +
    "<td>" +
    time +
    "</td>" +
    "<td>" +
    gast +
    "</td>" +
    "<td>" +
    league +
    "</td>" +
    "</tr>"
  );
}

function isElementVisible(el) {
  var rect = el.getBoundingClientRect();
  var windowHeight =
    window.innerHeight || document.documentElement.clientHeight;
  var windowWidth = window.innerWidth || document.documentElement.clientWidth;

  // Überprüfe, ob das Element im sichtbaren Bereich liegt
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= windowHeight &&
    rect.right <= windowWidth
  );
}