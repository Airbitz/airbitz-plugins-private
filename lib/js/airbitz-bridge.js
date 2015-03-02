
_handleResponse = function(s, options) {
  console.log(s);
  var j = jQuery.parseJSON(s);
  options || (options = {});
  if (j.success) {
    var v = (j.result.value) ? j.result.value : j.result;
    if (options.success) {
      options.success(v);
    } else {
      return v;
    }
  } else {
    if (options.error) {
      options.error();
    } else {
      throw 'invalid data';
    }
  }
};

_bridge = function() {
  var id = 0;
  var newId = function() { return (id++).toString(); };
  return {
    wallets: function(options) {
      var cbid = newId(), opts = options;
      Airbitz._callbacks[cbid] = function(data) {
        _handleResponse(data, opts);
        delete Airbitz._callbacks[cbid];
      };
      _native.wallets(cbid);
    },

    createReceiveRequest: function(wallet, options) {
      var cbid = newId(), opts = options;
      Airbitz._callbacks[cbid] = function(data) {
        _handleResponse(data, opts);
        delete Airbitz._callbacks[cbid];
      };
      _native.createReceiveRequest(cbid, wallet.id);
    },

    requestSpend: function(wallet, toAddress, amountSatoshi, options) {
      var cbid = newId(), opts = options;
      Airbitz._callbacks[cbid] = function(data) {
        _handleResponse(data, opts);
        delete Airbitz._callbacks[cbid];
      };
      _native.requestSpend(cbid, wallet.id, toAddress, amountSatoshi);
    },

    satoshiToCurrency: function(satoshi, currencyNum) {
      return _handleResponse(_native.satoshiToCurrency(satoshi, currencyNum));
    },

    currencyToSatoshi: function(currency, currencyNum) {
      return _handleResponse(_native.currencyToSatoshi(currency, currencyNum));
    },

    formatSatoshi: function(satoshi, withSymbol) {
      return _handleResponse(_native.formatSatoshi(satoshi, withSymbol));
    },

    formatCurrency: function(currency, currencyNum, withSymbol) {
      return _handleResponse(_native.formatCurrency(currency, currencyNum, withSymbol));
    },

    exchangeRate: function(currencyNum) {
      return _handleResponse(_native.exchangeRate(currencyNum));
    },

    title: function(s) {
      _native.title(s);
    },

    back: function() {
      console.log('Native Back Pressed');
      _native.exit();
    },

    exit: function() {
      _native.exit();
    }
  }
};
