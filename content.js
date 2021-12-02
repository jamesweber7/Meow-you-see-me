
loadGitCatData(loadChromeCatData);

chrome.runtime.onMessage.addListener(receivedMessage);

function loadGitCatData(callback) {
  var xhr = new XMLHttpRequest();
  var url = "https://raw.githubusercontent.com/jamesweber7/Meow-you-see-me/main/catdata.json";
  xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var gitdata = JSON.parse(this.responseText);
          callback(gitdata);
      }
  };
  xhr.open("GET", url, true);
  xhr.send();
}

function loadChromeCatData(gitdata) {
  chrome.storage.sync.get(['catdata'], (data) => {
    if (!Object.keys(data).length) {
      createCatdata();
      return loadChromeCatData(gitdata);
    }
    else if (isAllowedToHide(data)) {
      processCat(gitdata, data.catdata.stats);
      if (data.catdata.settings.volume) {
        addMeow(gitdata);
      }
    }
  });
}

function processCat(gitdata, stats) {
  
  let cat = getCat(gitdata, stats);
  addCatButton(cat.data);

  if (cat.special_function) {
    new Function(["gitdata", "stats"], cat.special_function.body)(gitdata, stats);
  }

  if (newSpecialCat(cat.name, stats.cats)) {
    addNewSpecialCatchEvent(cat);
  }
  
}

function getCat(gitdata, stats) {
  // hundred cat, thousand cat
  if (isSpecialTotal(gitdata.special.totals, stats)) {
    return specialTotalCat(gitdata, stats);
  }
  // charity cat
  if (isSpecialSite(gitdata.special.sites)) {
    return specialSiteCat(gitdata);
  } 
  if (isSpecialRandomCat()) {
    return specialRandomCat(gitdata.cats);
  }
  return gitdata.default_cat;
}

function receivedMessage(message) {
  switch (message.title) {
    case "MUTE" : 
      muteMeow();
      break;
    case "OFF" : 
      removeCatButton();
      break;
    case "BLOCKED" : 
      checkIfBlocked(message.url);
      break;
    case "SEND_URL" : 
      sendUrlToPopup();
      break;
  }
}

function sendMessageToPopup(message) {
  chrome.runtime.sendMessage(message);
}

function sendUrlToPopup() {
  sendMessageToPopup({
    title: 'URL',
    url: simpleUrl()
  });
}

function isSpecialTotal(totals, stats) {
  let totalCats = stats.total;
  for (let i = 0; i < totals.length; i++) {
    if (totals[i].total === (totalCats + 1) ) {
      return true;
    } else if (totals[i].total <= totalCats) {
      if (!stats.cats.includes(totals[i].cat)) {
        return true;
      }
    }
  }
  return false;
}

function specialTotalCat(gitdata, stats) {
  let totals = gitdata.special.totals;
  let totalCats = stats.total;
  for (let i = 0; i < totals.length; i++) {
    if (totals[i].total === (totalCats + 1)) {
      let catName = totals[i].cat;
      return findCat(gitdata.cats, catName);
    } 
    else if (totals[i].total <= totalCats) {
      if (!stats.cats.includes(totals[i].cat)) {
        let catName = totals[i].cat;
        return findCat(gitdata.cats, catName);
      }
    }
  }
}

function isSpecialSite(sites) {
  let currentSite = simpleUrl();
  for (let i = 0; i < sites.length; i++) {
    for (let j = 0; j < sites[i].urls.length; j++) {
      if (currentSite.includes(sites[i].urls[j])) {
        return Math.random() < sites[i].chance;
      }
    }
  }
  return false;
}

function specialSiteCat(gitdata) {
  let currentSite = simpleUrl();
  let sites = gitdata.special.sites;
  for (let i = 0; i < sites.length; i++) {
    for (let j = 0; j < sites[i].urls.length; j++) {
      if (currentSite.includes(sites[i].urls[j])) {
        let catName = sites[i].cat;
        return findCat(gitdata.cats, catName);
      }
    }
  }
  return false;
}

function findCat(cats, catName) {
  for (let i = 0; i < cats.length; i++) {
    if (cats[i].name === catName) {
      return cats[i];
    }
  }
}

function simpleUrl() {
  return simplifyUrl(window.location.href)
}

function checkIfBlocked(url) {
  if (simpleUrl() === url) {
    removeCatButton();
  }
}

function isAllowedToHide(data) {
  return data.catdata.settings.on && isWhitelistedWebsite(data);
}

function isWhitelistedWebsite(data) {
  let url = simpleUrl();
  sendMessageToPopup('URL', url);
  return !data.catdata.settings.blocked_sites.includes(url);
}

function simplifyUrl(url) {
  
  let ignoreStarts = ['https://', 'http://', 'www.'];
  for (let i = 0; i < ignoreStarts.length; i++) {
    let ignoreStart = ignoreStarts[i];
    if (url.includes(ignoreStart)) {
      url = url.substr(url.indexOf(ignoreStart) + ignoreStart.length);
    }
  }

  let ignoreEnds = ['/', '?', '#', '&'];
  for (let i = 0; i < ignoreEnds.length; i++) {
    let ignoreEnd = ignoreEnds[i];
    if (url.includes(ignoreEnd)) {
      url = url.substr(0, url.indexOf(ignoreEnd));
    }
  }
  url = url.toLowerCase();
  
  return url;
}

function addMeow(gitdata) {
  let catSoundIndex = Math.floor(Math.random()*gitdata.cat_sounds.length);
  let meow = gitdata.cat_sounds[catSoundIndex];

  let audio = document.createElement('audio');
  audio.setAttribute('autobuffer', 'autobuffer');
  let source = document.createElement('source');
  source.setAttribute('src', 'data:audio/mp3;base64,' + meow);
  source.setAttribute('type', 'audio/mp3');
  source.id = 'cat-source';
  audio.id = 'cat-audio';
  audio.append(source);
  document.body.append(audio);

  let btn = document.getElementById('cat-btn');
  btn.addEventListener('click', playMeow);

  function playMeow() {
    if (!isMuted(btn)) {
      audio.play();
    }
  }
}

function isMuted(btn) {
  return [...btn.classList].includes('muted');
}

function muteMeow() {
  let btn = document.getElementById('cat-btn');
  btn.classList.add('muted');
}

function unmuteMeow() {
  let btn = document.getElementById('cat-btn');
  if (isMuted(btn)) {
    btn.classList.remove('muted');
    loadGitCatData(addMeow);
  }
}

function addCatButton(image) {
  
  let body = document.body;
  let html = document.documentElement;
  let head = document.head;

  let height = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
  let width = Math.max( body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth );
  let cushion = 50;
  let catSize = 32;
  let rangeWidth = width - 2*cushion;
  let rangeHeight = height - 2*cushion;
  let left = Math.floor(Math.random()*rangeWidth + cushion - catSize*0.5) + 'px';
  let top = Math.floor(Math.random()*rangeHeight + cushion - catSize*0.5) + 'px';

  let style = document.createElement('style');

  let horizontalLaunchDistance = width - (left.replace('px','')) - 100;
  let verticalLaunchDistance = -0.5 * height;

  style.innerText = '#cat-btn:hover { animation: rotation 0.5s infinite; }  @keyframes rotation { 0% { transform: rotate(20deg); } 50% { transform: rotate(-20deg); } 100% { transform: rotate(20deg); } } @keyframes launch { 0% {transform: translate(0px,0px) rotate(0deg); } 100% { transform: translate(' + horizontalLaunchDistance + 'px,' + verticalLaunchDistance + 'px) rotate(720deg); } }';
  style.id = 'cat-style';
  head.append(style);

  let btn = document.createElement('button');
  btn.addEventListener('click', catclick);
  btn.setAttribute('id', 'cat-btn');
  btn.setAttribute('style', 
    'border: none; ' + 
    'box-shadow: none; ' + 
    'background-color: transparent;' + 
    'cursor: pointer;' + 
    'z-index: 10000;' + 
    'position: absolute;' + 
    'width: auto;' + 
    'margin: 0;' +
    'padding: 0;' +
    'left: ' + left + ';' + 
    'top: ' + top + ';'
  );
    
  let img = document.createElement('img');
  img.setAttribute('src', "data:image/png;base64," + image);
  img.style='width: auto; margin: 0; padding: 0;';
  btn.append(img);
  body.append(btn);

  function catclick() {
    if (!isClicked(btn)) {
      markButtonClicked();
      launchCat();
      incrementCatTotal();
    }
  }

}

function markButtonClicked() {
  document.getElementById('cat-btn').classList.add('clicked');
}

function isClicked(btn) {
  return [...btn.classList].includes('clicked');
}

function launchCat() {
  let btn = document.getElementById('cat-btn');
  let catLaunchTime = 0.8;
  btn.setAttribute('style', btn.getAttribute('style') + 'animation: launch ' + catLaunchTime + 's linear; animation-fill-mode: forwards;');
  setCatRemovalTimer(catLaunchTime);
}

function setCatRemovalTimer(catRemovalTime) {
  window.setTimeout(removeCatButton,catRemovalTime*1000);
}

function newSpecialCat(catName, cats) {
  return !cats.includes(catName) && catName !== 'default';
}

function addNewSpecialCatchEvent(cat) {
  document.getElementById('cat-btn').addEventListener('click', processSpecialCatch);

  function processSpecialCatch() {
    addToCatlist(cat.name);
    notifySpecialCatch(cat);
  }
}

function addToCatlist(catName) {
  chrome.storage.sync.get(['catdata'], (data) => {
    data.catdata.stats.cats.push(catName);
    chrome.storage.sync.set(data);
  });
}

function notifySpecialCatch(cat) {

  let style = document.getElementById('cat-style');
  style.innerText = style.innerText + 
  ' #cat-popup { animation: popupfade linear 4s; animation-fill-mode: forwards; } ' + 
  '@keyframes popupfade { 0% { transform: translateY(-100px); opacity: 0; } 5% { transform: translateY(0); opacity: 1;} 95% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(100px); opacity: 0; } } ' + 
  '#cat-pop-img { animation: float 1s infinite }' +
  '@keyframes float { 0% { transform: translateY(5px); } 50% { transform: translateY(-5px); } 100% { transform: translateY(5px); } }';

  let popup = document.createElement('catpopup');
  popup.id='cat-popup';
  popup.style='position: fixed; right: 30px; top: 80px; width: 90px; height: auto; border: 4px solid black; background-color: rgba(255,255,255,0.5); font-size: 16px; text-align: center; font-family: Comic Sans ms; padding: 0; z-index: 10000;';

  let headMessage = document.createElement('div');
  headMessage.innerText = 'New Cat!';
  popup.append(headMessage);

  let img = document.createElement('img');
  img.setAttribute('src', "data:image/png;base64," + cat.data);
  img.style='object-fit: none; width: auto; margin-left: auto; margin-right: auto;';
  img.id = 'cat-pop-img';
  popup.append(img);

  let nameMessage = document.createElement('div');
  nameMessage.innerText = cat.name;
  popup.append(nameMessage);
  
  document.body.append(popup);

  setCatRemovalTimer(4);

}

function isSpecialRandomCat() {
  let percentChanceOfSpecial = 25;
  return Math.random() < (percentChanceOfSpecial / 100);
}

function specialRandomCat(cats) {
  let totalRarity = 0;
  for (let i = 0; i < cats.length; i++) {
    totalRarity += cats[i].rarity;
  }
  let greatCatDecider = Math.random() * totalRarity;
  let pointer = 0;
  for (let i = 0; i < cats.length; i++) {
    pointer += cats[i].rarity;
    if (pointer >= greatCatDecider) {
      return cats[i];
    }
  }
}

function removeCatButton() {
  let catBtn = document.getElementById('cat-btn');
  if (catBtn) {
    catBtn.remove();
  }
}

function incrementCatTotal() {
    chrome.storage.sync.get(['catdata'], (data) => {
      data.catdata.stats.total = data.catdata.stats.total + 1;
      chrome.storage.sync.set(data);
  });
}

function createCatdata() {
  let settings = { 
      'volume': false, 
      'on': true, 
      'blocked_sites': []
  };
  let stats = {
      'total': 0, 
      'cats': [] 
  };
  let catdata = { 
      'settings': settings, 
      'stats': stats
  }
  chrome.storage.sync.set({'catdata': catdata});
}
