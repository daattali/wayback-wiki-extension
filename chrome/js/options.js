var wbwOptions = {
  init : function() {
	document.getElementById('wbw_enable_label').addEventListener('click', function(e) {
      document.getElementById('wbw_enable').checked = !document.getElementById('wbw_enable').checked;
	  document.getElementById('wbw_enable').dispatchEvent(new Event('change'));
	});
	document.getElementById('wbw_enable').addEventListener('change', function(e) {
	  if (document.getElementById('wbw_enable').checked) {
        document.getElementById('wbw_date').style.visibility = 'visible';
	  } else {
		document.getElementById('wbw_date').style.visibility = 'hidden';
	  }
	  chrome.storage.sync.set({ wbw_enable : document.getElementById('wbw_enable').checked });
	});
    document.getElementById('wbw_date').addEventListener('change', function(e) {
      chrome.storage.sync.set({ wbw_date : document.getElementById('wbw_date').value });
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
  }
}

document.addEventListener('DOMContentLoaded', wbwOptions.init);