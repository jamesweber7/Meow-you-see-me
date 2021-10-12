
chrome.storage.sync.get(['catdata'], (data) => {
    if (!Object.keys(data).length) {
        return createCatdata();
    }
    else {
        updateSettings(data.catdata.settings);
        updateTotal(data.catdata.stats.total);
        updateCats(data.catdata.stats.cats);
        primeBlockedSites(data.catdata.settings.blocked_sites);
    }
});

loadGitCatData(processGitCatData);

document.addEventListener('DOMContentLoaded', function() {

    primeCheckboxes();
    primeBlockedSitesButton();
    primeBlockNewSiteButton();
    askActiveTabForUrl();

    function primeCheckboxes() {
        primeOnOff();
        primeVolume();
        primeAllCheckboxes();
    }

    function primeAllCheckboxes() {
        let checkboxes = [...document.getElementsByTagName('checkbox')];
        for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].addEventListener('click', toggleChecked);
            function toggleChecked() {
                checkboxes[i].className = checkboxes[i].className === 'checked' ? 'unchecked' : 'checked';
            }
        }
    }

    function primeOnOff() {
        document.getElementById('on').addEventListener('click', toggleOnOff);
        function toggleOnOff() {
            let onText = document.getElementById('on-off');
            onText.innerText = onText.innerText === 'On' ? 'Off' : 'On';
            onText.innerText === 'Off' && sendMessageToTab({title: 'OFF'});
        }
    }

    function primeVolume() {
        let volumeBtn = document.getElementById('volume');
        volumeBtn.addEventListener('click', muteMeow);

        function muteMeow() {
            if (volumeBtn.className === 'checked') {
                sendMessageToTab({title: 'MUTE'});
            }
        }
    }

    function primeBlockedSitesButton() {
        let btn = document.getElementById('blocked-btn');
        btn.addEventListener('click', showBlockedSites);
        function showBlockedSites() {
            let blockedBox = document.getElementById('site-blocker');
            blockedBox.className ? blockedBox.className = '' : blockedBox.className = 'invisible';
        }
    }

    function primeBlockNewSiteButton() {
        let btn = document.getElementById('block-site-btn');
        btn.addEventListener('click', blockSite);
        function blockSite() {
            let siteRaw = document.getElementById('block-site-input').value;
            let site = simplifyUrl(siteRaw);
            chrome.storage.sync.get(['catdata'], (data) => {

                let index = data.catdata.settings.blocked_sites.push(site) - 1;
                chrome.storage.sync.set(data);

                addBlockedSiteDiv(site, index);
            });
            document.getElementById('block-site-input').value = '';
        }
    }

    function askActiveTabForUrl() {
        sendMessageToTab({
            'title': 'SEND_URL'
        });
    }

}, {once : true});

function processGitCatData(gitdata) {
    processVersion(gitdata.version);
}

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

function sendMessageToTab(message) {
    let tabParameters = {
        active: true,
        currentWindow: true
    };
    chrome.tabs.query(tabParameters, onGotTabs);

    function onGotTabs(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message);
    }
}

chrome.runtime.onMessage.addListener(receivedMessage);

function receivedMessage(message, sender, sendResponse) {
  switch (message.title) {
    case "URL" : 
        processActiveTabUrl(message.url);
        break;
  }
}

function primeBlockedSites(blockedSites) {
    for (let i = 0; i < blockedSites.length; i++) {
        addBlockedSiteDiv(blockedSites[i], i);
    }
}
  
function addBlockedSiteDiv(blockedSite, index) {

    let box = document.createElement('div');
    box.id = 'blocked-' + index;
    let sitetext = document.createElement('sitetext');
    sitetext.innerText = blockedSite;
    let unblockBtn = createUnblockBtn(index);
    box.append(sitetext);
    box.append(unblockBtn);
    document.getElementById('site-blocker').append(box);

    unblockBtn.addEventListener('click', unblock);
    function unblock() {
        chrome.storage.sync.get(['catdata'], (data) => {
            data.catdata.settings.blocked_sites.splice(index, 1);
            chrome.storage.sync.set(data);
        });
        box.remove();
    }
}

function createUnblockBtn(id) {
    let unblockBtn = document.createElement('button');
    unblockBtn.className = 'unblock btn-sm';
    unblockBtn.innerText = 'unblock';
    unblockBtn.id = 'unblock-' + id;
    return unblockBtn;
}

function processActiveTabUrl(url) {
    chrome.storage.sync.get(['catdata'], (data) => {
        if (!data.catdata.settings.blocked_sites.includes(url)) {
            setCurrentTabUrl(url);
        } else {
            setFirstBlockedSite(url, data.catdata.settings.blocked_sites);
            createBlockedOnSiteNotification(url);
        }
    });
}

function setCurrentTabUrl(url) {
    document.getElementById('block-site-input').value = url;
}

function setFirstBlockedSite(url, blockedSites) {
    let index = blockedSites.indexOf(url);
    document.getElementById('block-site-btn').after(document.getElementById('blocked-' + index));
}

function createBlockedOnSiteNotification(url) {
    let notif = document.createElement('button');
    notif.className = 'btn-sm';
    notif.style = 'display: block; float: right; margin-right: 10px; margin-bottom: 6px;';
    notif.innerText = 'Blocked on this site ' + url;
    notif.addEventListener('click', openBlockedBox);
    [...document.getElementsByTagName('header')][0].append(notif);

    function openBlockedBox() {
        document.getElementById('blocked-btn').click();
    }
}

function processVersion(version) {
    if (version !== chrome.runtime.getManifest().version) {
        createNewVersionNotification();
    }
}

function createNewVersionNotification() {
    let notif = document.createElement('button');
    notif.className = 'btn-sm';
    notif.style = 'display: block; float: right; margin-right: 10px; margin-bottom: 6px;';
    notif.innerText = 'New Version Available!';
    notif.addEventListener('click', openVersionUpdateLink);
    [...document.getElementsByTagName('header')][0].append(notif);

    function openVersionUpdateLink() {
        openMysmPage();
    }
}

function openMysmPage() {
    const url='https://github.com/jamesweber7/Meow-you-see-me/';
    window.open(url, '_blank');
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

function updateSettings(settings) {
    updateVolume(settings.volume);
    updateOn(settings.on);
}

function updateVolume(volume) {
    let btn = document.getElementById('volume');
    if (volume) {
        btn.className = 'checked';
    }
    btn.addEventListener('click', toggleVolume);
    function toggleVolume() {
        chrome.storage.sync.get(['catdata'], (data) => {
            data.catdata.settings.volume = !data.catdata.settings.volume;
            chrome.storage.sync.set(data);
        });
    }
}

function updateOn(on) {
    let btn = document.getElementById('on');
    if (on) {
        btn.className = 'checked';
    }
    btn.addEventListener('click', toggleOn);
    function toggleOn() {
        chrome.storage.sync.get(['catdata'], (data) => {
            data.catdata.settings.on = !data.catdata.settings.on;
            chrome.storage.sync.set(data);
        });
    }
}

function updateTotal(total) {
    document.getElementById('total').innerText = total;
}

function updateCats(cats) {
    if (cats.length) {
        loadGitCatData(getCats);
    }
    function getCats(gitdata) {
        let ratio = cats.length === gitdata.cats.length ? 'All' : cats.length + '/' + gitdata.cats.length;
        addCollectedCatsHeader(ratio);
        for (let i = 0; i < gitdata.cats.length; i++) {
            if (cats.includes(gitdata.cats[i].name)) {
                addCatProfile(gitdata.cats[i]);
            }
        }
    }
}

function addCollectedCatsHeader(ratio) {
    let collectedCatsHeader = document.createElement('collectionheader');
    collectedCatsHeader.innerText = ratio + ' Special Cats Collected';
    document.getElementById('litter-box').append(collectedCatsHeader);
}

function addCatProfile(cat) {
    let catProfile = document.createElement('catprofile');
    catProfile.innerText = cat.name;
    let img = document.createElement('img');
    img.setAttribute('src', "data:image/png;base64," + cat.data);
    img.className='special-cat-img';
    catProfile.prepend(img);
    document.getElementById('litter-box').append(catProfile);
    if (cat.special_card) {
        new Function(["catProfile"], cat.special_card)(catProfile);
    }
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
