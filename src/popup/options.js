const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const wbwOptions = {
  init : function() {
    wbwOptions.restoreOptions();

    document.getElementById('wbw_enable_label').addEventListener('click', function(e) {
      document.getElementById('wbw_enable').checked = !document.getElementById('wbw_enable').checked;
      document.getElementById('wbw_enable').dispatchEvent(new Event('change'));
    });

    document.getElementById('wbw_enable').addEventListener('change', function(e) {
      const isWbwEnabled = document.getElementById('wbw_enable').checked;
	  const isDateInvalid = (document.getElementById("wbw_date").value == "");
      document.getElementById('wbw_date').disabled = !isWbwEnabled;
	  document.getElementById("wbw_date_apply").disabled = isWbwEnabled && isDateInvalid;
    });

    document.getElementById("wbw_date").addEventListener("change", function(e) {
      const isDateInvalid = (document.getElementById("wbw_date").value == "");
      document.getElementById("wbw_date_apply").disabled = isDateInvalid;
    });

    document.getElementById("wbw_date_apply").addEventListener("click", function(e) {
      wbwOptions.saveDate();
    });
    document.getElementById("wbw_date").addEventListener("keydown", function(e) {
      if (e.code === "Enter") {
        wbwOptions.saveDate();
      }
    });
  },

  restoreOptions : async function() {
    const wbw_settings = await browserAPI.storage.sync.get(['wbw_enable', 'wbw_date']);
    document.getElementById('wbw_enable').checked = (typeof wbw_settings.wbw_enable === 'undefined') ? true : wbw_settings.wbw_enable;
    document.getElementById('wbw_enable').dispatchEvent(new Event('change'));
    document.getElementById('wbw_date').value = (typeof wbw_settings.wbw_date === 'undefined') ? "2020-01-01" : wbw_settings.wbw_date;
  },

  saveDate : async function() {
    const enabled = document.getElementById('wbw_enable').checked;
    browserAPI.storage.sync.set({ wbw_enable : enabled });
    if (enabled) {
      browserAPI.storage.sync.set({ wbw_date : document.getElementById('wbw_date').value });
    }
    const [tab] = await browserAPI.tabs.query({active: true, currentWindow: true});
    window.close();
    if (wbwOptions.isWikiPage(tab.url)) {
      browserAPI.tabs.sendMessage(tab.id, { wbwAction : 'refresh' });
    }
  },

  isWikiPage : function(url) {
    const urlParsed = new URL(url);
    return urlParsed.hostname.endsWith('wikipedia.org') &&
      (urlParsed.pathname.startsWith('/wiki/') || urlParsed.pathname.startsWith('/w/'));
  }
}

document.addEventListener('DOMContentLoaded', wbwOptions.init);
