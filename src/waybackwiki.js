// deal with bfcache - Back button would cause the loader to show indefinitely
window.onpageshow = function(event) {
  if (event.persisted) {
    wbwRemoveLoader();
  }
}

// make the code cross-browser for both Firefox and Chrome API
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener("DOMContentLoaded", async function() {
  const settings = await browserAPI.storage.sync.get(['wbw_enable', 'wbw_date']);
  wbwInit(settings);
});

// settings is a dictionary with 'wbw_enable' and 'wbw_date'
wbwInit = function(settings) {
  const url = window.location.href;
  const urlParsed = new URL(url);
  const params = urlParsed.searchParams;
  const title = wbwGetTitle(urlParsed);
  const wbwEnabled = (typeof settings.wbw_enable === 'undefined') ? true : settings.wbw_enable;
  const wbwDate = (typeof settings.wbw_date === 'undefined') ? '2020-01-01' : settings.wbw_date;

  if (!wbwIsWikiPage(urlParsed)) {
    return;
  } else if (title === null) {
    return;
  } else if (params.get("diff")) {
    return;
  } else if (params.get("action") !== null || params.get("veaction") !== null) {
    return;
  } else if (params.get("wbw_ignore") !== null) {
    wbwMessageIgnored();
    return;
  } else if (params.get("wbw_success")) {
    wbwMessageSuccess(params.get("wbw_success"), params.get("wbw_reverse"));
    return;
  } else if (!wbwEnabled) {
    wbwMessageDisabled();
    return;
  } else if (params.get("oldid") !== null) {
    wbwMessageOld();
    return;
  };

  wbwAddLoader(wbwDate);
  wbwTravel(wbwDate, title);
};

wbwIsWikiPage = function(urlParsed) {
  return urlParsed.hostname.endsWith('wikipedia.org') &&
    (urlParsed.pathname.startsWith('/wiki/') || urlParsed.pathname.startsWith('/w/'));
};

wbwGetTitle = function(urlParsed) {
  const params = urlParsed.searchParams;
  const path = urlParsed.pathname;
  let title = null;

  if (path.startsWith('/wiki/')) {
    title = path.substring(6);
  } else if (path.startsWith('/w/')) {
    title = params.get("title");
  }
  if (title !== null && title.startsWith("Special:")) {
    title = null;
  }
  return title;
};

// date format YYYY-MM-DD
wbwTravel = function(date, title, reverse = false) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const path = url.pathname;

  let api = url.origin + "/w/api.php?action=query&format=json&formatversion=2&prop=revisions&rvprop=timestamp%7Cids&rvlimit=1&titles=" + title + "&rvstart=" + date + "T00%3A00%3A00Z";
  if (reverse) {
    api += "&rvdir=newer";
  }

  fetch(api)
    .then(res => res.json())
    .then(res => {
      if ('revisions' in res.query.pages[0]) {
        const revid = res.query.pages[0].revisions[0].revid;
        params.append("oldid", revid);
        params.append("wbw_success", date);
        params.append("wbw_reverse", reverse);
        window.location.href = url.toString();
      } else {
        if (reverse === false) {
          wbwTravel(date, title, true);
        } else {
          throw new Error();
        }
      }
    })
    .catch(error => {
      wbwRemoveLoader();
      wbwMessageError(date);
    });
};

wbwAddLoader = function(date) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.append("wbw_ignore", "1");

  const shieldEl = document.createElement("div");
  shieldEl.setAttribute("id", "wbw_shield_out");
  const shieldMsg = document.createElement("div");
  shieldMsg.innerHTML = "Wayback Wiki is going back in time to " + date;
  shieldMsg.setAttribute("id", "wbw_shield_msg");
  const shieldLoader = document.createElement("div");
  shieldLoader.setAttribute("id", "wbw_shield_loader");
  const shieldCancel = document.createElement("a");
  shieldCancel.innerHTML = "Cancel";
  shieldCancel.setAttribute("id", "wbw_shield_cancel");
  shieldCancel.setAttribute("href", url.toString());

  shieldEl.appendChild(shieldMsg);
  shieldEl.appendChild(shieldLoader);
  shieldEl.appendChild(shieldCancel);
  document.body.appendChild(shieldEl);
  document.body.style.overflow = "hidden";
};

wbwRemoveLoader = function() {
  if (document.getElementById("wbw_shield_out")) {
    document.getElementById("wbw_shield_out").remove();
  }
  document.body.style.overflow = "auto";
};

wbwCreateMessageBox = function(html, disableBtn = true) {
  const messageBox = document.createElement("div");
  messageBox.setAttribute("id", "wbw_message_box");
  messageBox.innerHTML = html;
  document.getElementById("bodyContent").prepend(messageBox);

  if (disableBtn) {
    messageBox.innerHTML += "<a id='wbw_disable_btn' href='javascript:void(0);'>Disable Wayback Wiki</a>";
    document.getElementById("wbw_disable_btn").addEventListener("click", function(e) {
      browserAPI.storage.sync.set({
        wbw_enable: false
      });
      wbwRedirectOrigin();
    });
  }
}

wbwMessageError = function(date) {
  let html = "🕒 Wayback Wiki encountered an <strong>error</strong> ";
  html += "and did not take you to " + date + ".";
  wbwCreateMessageBox(html, true);
};

wbwMessageDisabled = function() {
  let html = "🕒 <strong>Wayback Wiki</strong> is currently disabled. ";
  html += "<a id='wbw_enable_btn' href='javascript:void(0)'>Enable</a>";
  wbwCreateMessageBox(html, false);
  document.getElementById("wbw_enable_btn").addEventListener("click", function(e) {
    browserAPI.storage.sync.set({
      wbw_enable: true
    });
    location.reload();
  });
};

wbwMessageSuccess = function(date, reverse = false) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.append("wbw_ignore", "1");
  params.delete("oldid");
  params.delete("wbw_reverse");
  params.delete("wbw_success");

  let html = "🕒 ";
  if (reverse == false || reverse == 'false') {
    html += "Wayback Wiki took you to <strong>" + date + "</strong>. ";
  } else {
    html += "This page didn't exist on <strong>" + date + "</strong>, so Wayback Wiki took you to the first version.";
	html += "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
  }
  html += "Go to <a href=\"" + url.toString() + "\">today</a> or a ";
  html += "<a href='javascript:void(0)' onclick=\"javascript:document.getElementById('wbw_date_form').style.display='inline'\">different date</a>. ";
  html += "<span id=\"wbw_date_form\"><input type=\"date\" value=\"" + date + "\" id=\"wbw_date_select\"> ";
  html += "<button id=\"wbw_date_go\">Go</button></span>";
  wbwCreateMessageBox(html, true);
  document.getElementById("wbw_date_select").addEventListener("change", function(e) {
    const isDateInvalid = (document.getElementById("wbw_date_select").value == "");
    document.getElementById("wbw_date_go").disabled = isDateInvalid;
  });
  const saveDate = function() {
    browserAPI.storage.sync.set({
	  wbw_date: document.getElementById("wbw_date_select").value
    });
    wbwRedirectOrigin();
  };
  document.getElementById("wbw_date_select").addEventListener("keydown", function(e) {
    if (e.code === "Enter") {
      saveDate();
    }
  });
  document.getElementById("wbw_date_go").addEventListener("click", function(e) {
    saveDate();
  });
};

wbwMessageIgnored = function() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.delete("wbw_ignore");
  let html = "🕒 <strong>Wayback Wiki</strong> is temporarily disabled on this page. ";
  html += "<a href='" + url.toString() + "'>Enable</a>";
  wbwCreateMessageBox(html, false);
};

wbwMessageOld = function() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.delete("oldid");
  let html = "🕒 <strong>Wayback Wiki</strong> is currently disabled on this page because it's an old version of an article. ";
  html += "<a href='" + url.toString() + "'>Enable</a>";
  wbwCreateMessageBox(html, false);
};

// Redirect to the original Wiki page without any WBW parameters
wbwRedirectOrigin = function() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const nParams = params.size;
  params.delete("oldid");
  params.delete("wbw_reverse");
  params.delete("wbw_success");
  params.delete("wbw_ignore");

  if (params.size == nParams) {
    location.reload();
  } else {
    window.location.href = url.toString();
  }
}

browserAPI.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.wbwAction && request.wbwAction == "refresh") {
      wbwRedirectOrigin();
    }
  }
);
