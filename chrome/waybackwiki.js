document.addEventListener("DOMContentLoaded", async function() {
  const settings = await chrome.storage.sync.get(['wbw_enable', 'wbw_date']);
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

  const shield_el = document.createElement("div");
  shield_el.setAttribute("id", "wbw_shield_out");
  const shield_msg = document.createElement("div");
  shield_msg.innerHTML = "Wayback Wiki is going back in time to " + date;
  shield_msg.setAttribute("id", "wbw_shield_msg");
  const shield_loader = document.createElement("div");
  shield_loader.setAttribute("id", "wbw_shield_loader");
  const shield_cancel = document.createElement("a");
  shield_cancel.innerHTML = "Cancel";
  shield_cancel.setAttribute("id", "wbw_shield_cancel");
  shield_cancel.setAttribute("href", url.toString());

  shield_el.appendChild(shield_msg);
  shield_el.appendChild(shield_loader);
  shield_el.appendChild(shield_cancel);
  document.body.appendChild(shield_el);
  document.body.style.overflow = "hidden";
};

wbwRemoveLoader = function() {
  document.getElementById("wbw_shield_out").remove();
  document.body.style.overflow = "auto";
};

wbwMessageError = function(date) {
  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 Wayback Wiki encountered an error and did not take you to " + date;
  document.getElementById("bodyContent").prepend(message_el);
};

wbwMessageDisabled = function() {
  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 <strong>Wayback Wiki</strong> is currently disabled. <a id='wbw_enable_btn' href='javascript:void(0)'>Enable</a>";
  document.getElementById("bodyContent").prepend(message_el);
  document.getElementById("wbw_enable_btn").addEventListener("click", function(e) {
    chrome.storage.sync.set({
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

  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 ";
  if (reverse == false || reverse == 'false') {
    message_el.innerHTML += "Wayback Wiki took you to <strong>" + date + "</strong>. ";
  } else {
    message_el.innerHTML += "This page didn't exist on <strong>" + date + "</strong>, so Wayback Wiki took you to the first version.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
  }
  message_el.innerHTML += "Go to <a href=\"" + url.toString() + "\">today</a> or <a href='javascript:void(0)' onclick=\"javascript:document.getElementById('wbw_date_form').style.display='inline'\">different date</a>. "
  message_el.innerHTML += "<span id=\"wbw_date_form\"><input type=\"date\" value=\"" + date + "\" id=\"wbw_date_select\"> <button id=\"wbw_date_go\">Go</button></span>";

  document.getElementById("bodyContent").prepend(message_el);
  document.getElementById("wbw_date_select").addEventListener("change", function(e) {
    const isDateInvalid = (document.getElementById("wbw_date_select").value == "");
    document.getElementById("wbw_date_go").disabled = isDateInvalid;
  });
  const saveDate = function() {
    chrome.storage.sync.set({
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
  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 <strong>Wayback Wiki</strong> is temporarily disabled on this page. ";
  message_el.innerHTML += "<a href='" + url.toString() + "'>Enable</a>";
  document.getElementById("bodyContent").prepend(message_el);
};

wbwMessageOld = function() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.delete("oldid");
  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 <strong>Wayback Wiki</strong> is currently disabled on this page because it's an old version of an article. ";
  message_el.innerHTML += "<a href='" + url.toString() + "'>Enable</a>";
  document.getElementById("bodyContent").prepend(message_el);
};

wbwRedirectOrigin = function() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.delete("oldid");
  params.delete("wbw_reverse");
  params.delete("wbw_success");
  params.delete("wbw_ignore");
  window.location.href = url.toString();
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.wbwAction && request.wbwAction == "refresh") {
      ;
    }
  }
);