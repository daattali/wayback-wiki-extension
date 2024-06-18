document.addEventListener("DOMContentLoaded", function() {
  browser.storage.sync.get(['wbw_enable', 'wbw_date']).then(wbw_init);
});

wbw_init = function(settings) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const title = wbw_get_title(window.location.href);
  const wbw_enable = (typeof settings.wbw_enable === 'undefined') ? true : settings.wbw_enable;
  const wbw_date = (typeof settings.wbw_date === 'undefined') ? '2020-01-01' : settings.wbw_date;

  if (!wbw_is_wiki_page(url)) {
    return;
  } else if (title === null) {
    return;
  } else if (params.get("diff")) {
    return;
  } else if (params.get("action") !== null || params.get("veaction") !== null) {
    return;
  } else if (params.get("wbw_ignore") !== null) {
    wbw_message_ignored();
    return;
  } else if (params.get("wbw_success")) {
    wbw_message_success(params.get("wbw_success"), params.get("wbw_reverse"));
    return;
  } else if (!wbw_enable) {
    wbw_message_disabled();
    return;
  } else if (params.get("oldid") !== null) {
    wbw_message_old();
    return;
  };

  wbw_add_loader(wbw_date);
  wbw_go(wbw_date, title);
};

wbw_is_wiki_page = function(url) {
  return url.hostname.endsWith('wikipedia.org') &&
    (url.pathname.startsWith('/wiki/') || url.pathname.startsWith('/w/'));
};

wbw_get_title = function(url) {
  url = new URL(url);
  const params = url.searchParams;
  const path = url.pathname;
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
wbw_go = function(date, title, reverse = false) {
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
          wbw_go(date, title, true);
        } else {
          throw new Error();
        }
      }
    })
    .catch(error => {
      wbw_remove_loader();
      wbw_message_error(date);
    });
};

wbw_add_loader = function(date) {
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

wbw_remove_loader = function() {
  document.getElementById("wbw_shield_out").remove();
  document.body.style.overflow = "auto";
};

wbw_message_error = function(date) {
  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 Wayback Wiki encountered an error and did not take you to " + date;
  document.getElementById("bodyContent").prepend(message_el);
};

wbw_message_disabled = function() {
  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 <strong>Wayback Wiki</strong> is currently disabled. <a id='wbw_enable_btn' href='javascript:void(0)'>Enable</a>";
  document.getElementById("bodyContent").prepend(message_el);
  document.getElementById("wbw_enable_btn").addEventListener("click", function(e) {
    browser.storage.sync.set({
      wbw_enable: true
    });
    location.reload();
  });
};

wbw_message_success = function(date, reverse = false) {
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
    document.getElementById("wbw_date_go").disabled = (document.getElementById("wbw_date_select").value == "");
  });
  const apply_date = function() {
      browser.storage.sync.set({
        wbw_date: document.getElementById("wbw_date_select").value
      });
      params.delete("wbw_ignore");
      window.location.href = url.toString();
  };
  document.getElementById("wbw_date_select").addEventListener("keydown", function(e) {
    if (e.code === "Enter") {
      apply_date();
    }
  });
  document.getElementById("wbw_date_go").addEventListener("click", function(e) {
    apply_date();
  });
};

wbw_message_ignored = function() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.delete("wbw_ignore");
  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 <strong>Wayback Wiki</strong> is temporarily disabled on this page. ";
  message_el.innerHTML += "<a href='" + url.toString() + "'>Enable</a>";
  document.getElementById("bodyContent").prepend(message_el);
};

wbw_message_old = function() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.delete("oldid");
  const message_el = document.createElement("div");
  message_el.setAttribute("id", "wbw_message_box");
  message_el.innerHTML = "🕒 <strong>Wayback Wiki</strong> is currently disabled on this page because it's an old version of an article. ";
  message_el.innerHTML += "<a href='" + url.toString() + "'>Enable</a>";
  document.getElementById("bodyContent").prepend(message_el);
};

browser.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.wbwAction && request.wbwAction == "refresh") {
      ;
    }
  }
);
