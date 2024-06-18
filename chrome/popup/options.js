let wbwOptions = {
  init : function() {
    document.getElementById('wbw_enable_label').addEventListener('click', function(e) {
      document.getElementById('wbw_enable').checked = !document.getElementById('wbw_enable').checked;
      document.getElementById('wbw_enable').dispatchEvent(new Event('change'));
    });
    document.getElementById('wbw_enable').addEventListener('change', function(e) {
      if (document.getElementById('wbw_enable').checked) {
        document.getElementById('wbw_date_section').style.visibility = 'visible';
      } else {
        document.getElementById('wbw_date_section').style.visibility = 'hidden';
      }
      chrome.storage.sync.set({ wbw_enable : document.getElementById('wbw_enable').checked });
    });
    document.getElementById('wbw_date').addEventListener('change', function(e) {
      chrome.storage.sync.set({ wbw_date : document.getElementById('wbw_date').value });
    });
    document.getElementById("wbw_date_apply").addEventListener("click", function(e) {
      wbwOptions.saveDate();
    });

    wbwOptions.restoreOptions();
  },

  restoreOptions : function() {
    chrome.storage.sync.get(
      ['wbw_enable', 'wbw_date']
    ).then(function(items) {
      document.getElementById('wbw_enable').checked = (typeof items.wbw_enable === 'undefined') ? true : items.wbw_enable;
      document.getElementById('wbw_enable').dispatchEvent(new Event('change'));
      document.getElementById('wbw_date').value = (typeof items.wbw_date === 'undefined') ? "2020-01-01" : items.wbw_date;
    });
  },

  saveDate : async function() {
    chrome.storage.sync.set({ wbw_date : document.getElementById('wbw_date').value });
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    window.close();
    if (wbwOptions.isWikiPage(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { wbwAction : 'refresh' });
    }
  },

  isWikiPage : function(url) {
    const urlParsed = new URL(url);
    return urlParsed.hostname.endsWith('wikipedia.org') &&
      (urlParsed.pathname.startsWith('/wiki/') || urlParsed.pathname.startsWith('/w/'));
  }
}

document.addEventListener('DOMContentLoaded', wbwOptions.init);
