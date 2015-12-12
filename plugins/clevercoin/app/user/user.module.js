(function () {
  'use strict';

  angular
    .module('app.user', ['app.dataFactory', 'app.constants'])
    .controller('homeController', ['$scope', '$state', '$location', 'UserFactory', homeController])
    .controller('pendingActivationController', ['$scope', '$state', 'Error', 'UserFactory', pendingActivationController])
    .controller('activateController', ['$scope', '$state', '$stateParams', 'Error', 'UserFactory', activateController])
    .controller('dashboardController', ['$scope', '$sce', '$state', 'Error', 'DataFactory', 'UserFactory', dashboardController])
    .controller('signupController', ['$scope', '$state', 'Error', 'UserFactory', signupController])
    .controller('linkController', ['$scope', '$state', 'Error', 'UserFactory', linkController])
    .controller('userInformationController', ['$scope', '$state', 'Error', 'UserFactory', userInformationController])
    .controller('identityVerificationController', ['$scope', '$state', 'Error', 'UserFactory', identityVerificationController])
    .controller('addressVerificationController', ['$scope', '$state', 'Error', 'UserFactory', addressVerificationController])
    .controller('editBankController', ['$scope', '$state', 'Error', 'UserFactory', editBankController])
    .controller('sepaDepositBankController', ['$scope', '$state', 'Error', 'UserFactory', sepaDepositBankController])
    .controller('fundsController', ['$scope', '$state', 'DataFactory', fundsController])
    .directive('accountSummary', accountSummary)
    .directive('fileModel', fileModel);

  function homeController($scope, $state, $location, UserFactory) {
    var d = parseParameters($location);
    if (d.token) {
      $state.go('activate', {'token': d.token, 'email': d.email});
    } else {
      if (UserFactory.isSignedIn()) {
        if (UserFactory.isActivated()) {
          $state.go("dashboard");
        } else {
          $state.go("pendingActivation");
        }
      } else {
        $state.go("signup");
      }
    }
  }

  function parseParameters($location) {
    var d = $location.search();
    if (!d.state) {
      var url = window.location.href;
      url = url.replace(/\#.*/, ''); // strip hash
      url = url.replace(/.*\?/, ''); // strip up to ?
      var params = url.split("&");
      params.forEach(function(e) {
        var pair = e.split("=");
        d[pair[0]] = pair[1];
      });
    }
    return d;
  }

  function signupController($scope, $state, Error, UserFactory) {
    Airbitz.ui.title('CleverCoin');
    $scope.account = UserFactory.getUserAccount();
    if (!$scope.account.password) {
      $scope.account.password = '';
    }

    $scope.cancelSignup = function() {
      Airbitz.ui.exit();
    };

    $scope.submitSignUp = function(form) {
      Airbitz.ui.showAlert('', 'Creating account...', {
        'showSpinner': true
      });
      UserFactory.registerUser($scope.account.firstName, $scope.account.email, $scope.account.password).then(function() {
        Airbitz.ui.showAlert('', 'Account created...');
        $state.go('pendingActivation');
      }, function(e) {
        Airbitz.ui.showAlert('Error', 'Error signing up');
      });
    };
  }

  function linkController($scope, $state, Error, UserFactory) {
    Airbitz.ui.title('Link account');
    $scope.link = function() {
      UserFactory.requestLink($scope.email).then(function() {
      });
    }
  }

  function pendingActivationController($scope, $state, Error, UserFactory) {
    Airbitz.ui.title('Activate account');
    $scope.account = UserFactory.getUserAccount();
    // If we can fetch the account, we know the user has been activated
    UserFactory.fetchAccount().then(function(account) {
      $scope.account.isActivated = true;
      Airbitz.core.write('account', $scope.account);
      $state.go("dashboard");
    });
    $scope.changeEmail = function() {
      Airbitz.core.clearData();
      $state.go("signup");
    };
  }

  function activateController($scope, $state, $stateParams, Error, UserFactory) {
    Airbitz.ui.title('Activating your account');
    Airbitz.ui.showAlert('', 'Activating account.', {
      'showSpinner': true
    });
    UserFactory.activate($stateParams.email, $stateParams.token).then(function(b) {
      Airbitz.ui.showAlert('', 'Account activated');
      $state.go("dashboard");
    }, function(b) {
      Airbitz.ui.showAlert('', 'Unable to activate account.');
      $state.go("pendingActivation");
    });
  }

  function dashboardController($scope, $sce, $state, Error, DataFactory, UserFactory) {
    Airbitz.ui.title('CleverCoin');
    // set variables that might be cached locally to make sure they load faster if available
    $scope.account = UserFactory.getUserAccount();
    $scope.userStatus = UserFactory.getUserAccountStatus();
    $scope.banks = UserFactory.getBanks();
    $scope.wallets = UserFactory.getWallets();

    var showOpts = function(s) {
      $scope.showOptions = !s.userCanTransact || $scope.banks.length == 0;
    };
    showOpts($scope.userStatus);

    UserFactory.fetchAccount().then(function(account) {
      $scope.account = account;
    }, function() {
      // Error, error
    }).then(function() {
      return UserFactory.fetchUserAccountStatus().then(function(b) {
        $scope.userStatus = b;
        showOpts($scope.userStatus);
      });
    }).then(function() {
      return UserFactory.fetchBanks(function(b) {
        $scope.banks = b;
      });
    }).then(function() {
      return UserFactory.fetchWallets(function(b) {
        $scope.wallets = b;
      });
    });

    $scope.regMessage = function() {
      var msg = '';
      var counter = 0;

      function rejectMap(s) {
        if (s == "SuspicionOfFraud") {
          return "Suspicion of Fraud";
        } else if (s == "BadQuality") {
          return "Bad Quality";
        } else if (s == "Expired") {
          return "Expired";
        } else if (s == "WrongType") {
          return "Wrong Type";
        } else if (s == "WrongPerson") {
          return "WrongPerson";
        }
        return s;
      }
      if ($scope.userStatus.identityRejectedReason) {
        counter++;
        msg += '<h5><strong>' + counter + "</strong>." + 
          " Identity documents rejected because "
            + rejectMap($scope.userStatus.identityRejectedReason)
            + ".</h5>";
      } else if ($scope.userStatus.userIdentityState == 'Exported') {
        counter++;
        msg += '<h5><strong>' + counter + "</strong>. Identity verification pending review.</h5>";
      } else if (!$scope.userStatus.userIdentitySetup) {
        counter++;
        msg += '<h5><strong>' + counter + "</strong>. Please verify your identity</h5>";
      }
      if ($scope.userStatus.addressRejectedReason) {
        counter++;
        msg += '<h5><strong>' + counter + "</strong>." + 
          " Address documents rejected because "
            + rejectMap($scope.userStatus.addressRejectedReason)
            + ".</h5>";
      } else if ($scope.userStatus.userAddressState == 'Exported') {
        counter++;
        msg += '<h5><strong>' + counter + "</strong>. Address verification pending review.</h5>";
      } else if (!$scope.userStatus.userAddressSetup) {
        counter++;
        msg += '<h5><strong>' + counter + "</strong>. Please verify your address</h5>";
      }
      if (msg !== '') {
        msg = '<h4 style="margin-top: 0;">To Buy or Sell Bitcoin:</h4>' + msg;
      }
      return $sce.trustAsHtml(msg);
    };

    $scope.userInformation = function() {
      if ($scope.account.termsAgreedVersion == 1 || $scope.userStatus.userCanTransact) {
        Airbitz.ui.showAlert('', 'User information has been submitted. Cannot be resubmitted.');
      } else {
        $state.go("userInformation");
      }
    }

    $scope.identity = function() {
      if (["Rejected"].indexOf($scope.userStatus.userIdentityState) > -1) {
        Airbitz.ui.showAlert('', 'Identity documents have been rejected. Unable to resubmit at this time.');
      } else if (["Verified"].indexOf($scope.userStatus.userIdentityState) > -1) {
        Airbitz.ui.showAlert('', 'Verification documents have already been verified, and cannot be resubmitted.');
      } else if (["Exported"].indexOf($scope.userStatus.userIdentityState) > -1) {
        Airbitz.ui.showAlert('', 'Verification documents have already been submitted. Please wait for them to be reviewed.');
      } else {
        $state.go("identityVerification");
      }
    };
    $scope.address = function() {
      if (["Rejected"].indexOf($scope.userStatus.userAddressState) > -1) {
        Airbitz.ui.showAlert('', 'Address documents have been rejected. Unable to resubmit at this time.');
      } else if (["Verified"].indexOf($scope.userStatus.userAddressState) > -1) {
        Airbitz.ui.showAlert('', 'Address documents have already been verified, and cannot be resubmitted.');
      } else if (["Exported"].indexOf($scope.userStatus.userAddressState) > -1) {
        Airbitz.ui.showAlert('', 'Address documents have already been submitted. Please wait for them to be reviewed.');
      } else {
        $state.go("addressVerification");
      }
    };

    $scope.editBank = function() {
      $state.go('editBank');
    };
    $scope.sepaDeposit = function() {
      $state.go('sepaDeposit');
    };
    $scope.buy = function() {
      DataFactory.getOrder(true);
      $state.go('exchangeOrder', {'orderAction': 'buy'});
    };
    $scope.sell = function() {
      Airbitz.ui.showAlert('', 'Sell is coming soon!');
    };
    $scope.showAccountOptions = function() {
      $scope.showOptions = !$scope.showOptions;
    };
  }

  function userInformationController($scope, $state, Error, UserFactory) {
    Airbitz.ui.title('User Information');
    $scope.account = UserFactory.getUserAccount();
    $scope.countries = UserFactory.getCountries();
    UserFactory.fetchCountries().then(function(b) {
      $scope.countries = b;
      $scope.account.birthcountryObject = UserFactory.findCountry($scope.account.birthcountry);
      $scope.account.addresscountryObject = UserFactory.findCountry($scope.account.addresscountry);
    });

    $scope.cancel = function() {
      $state.go('dashboard');
    };

    $scope.save = function() {
      $scope.account.birthcountry = $scope.account.birthcountryObject.codeAlpha3;
      $scope.account.addresscountry = $scope.account.addresscountryObject.codeAlpha3;
      Airbitz.ui.showAlert('Saved', 'Submitting user information...', {
        'showSpinner': true
      });
      UserFactory.updateUserAccount($scope.account).then(function() {
        Airbitz.ui.showAlert('Saved', 'User information has been updated.');
        $state.go('dashboard');
      }, function(e) {
        Airbitz.ui.showAlert('', 'Unable to save user data');
      });
    };
  }

  function identityVerificationController($scope, $state, Error, UserFactory) {
    Airbitz.ui.title('Identity Verification');
    $scope.account = UserFactory.getUserAccount();
    $scope.primaryFile = '';
    $scope.secondaryFile = '';
    UserFactory.fetchCountries().then(function(b) {
      $scope.countries = b;
      $scope.account.nationalityObject = UserFactory.findCountry($scope.account.birthcountry);
    });

    $scope.loadIdentityFront = function() {
      Airbitz.core.requestFile({
        success: function(data) {
          $scope.$apply(function() {
            $scope.primaryFile = 'data:image/jpeg;name:primaryFile.jpg;base64,' + data;
          });
        },
        error: function() { }
      });
    };

    $scope.loadIdentityBack = function() {
      Airbitz.core.requestFile({
        success: function(data) {
          $scope.$apply(function() {
            $scope.secondaryFile = 'data:image/jpeg;name:secondaryFile.jpg;base64,' + data;
          });
        },
        error: function() { }
      });
    };

    $scope.cancel = function(){
      $state.go('dashboard');
    };

    $scope.save = function() {
      Airbitz.ui.showAlert('Saved', 'Submitting identity information...', {
        'showSpinner': true
      });
      // Update the address value
      $scope.account.birthcountry = $scope.account.nationalityObject.codeAlpha3;
      UserFactory.verifyIdentity($scope.identityType, $scope.account.birthcountry, $scope.primaryFile, $scope.secondaryFile).then(function() {
        Airbitz.ui.showAlert('Saved', 'Identity information has been submitted.');
        $state.go('dashboard');
      }, function(e) {
        console.log(e);
        var msg = 'Unable to submit identity information at this time. ';
        if (e.error) {
          msg += e.error;
        }
        Airbitz.ui.showAlert('', msg);
      });
    };
  }

  function addressVerificationController($scope, $state, Error, UserFactory) {
    Airbitz.ui.title('Address Verification');
    $scope.account = UserFactory.getUserAccount();
    $scope.proofFile = '';
    UserFactory.fetchCountries().then(function(b) {
      $scope.countries = b;
      $scope.account.addresscountryObject = UserFactory.findCountry($scope.account.addresscountry);
    });
    $scope.loadProofFile = function() {
      Airbitz.core.requestFile({
        success: function(data) {
          $scope.$apply(function() {
            $scope.proofFile = 'data:image/jpeg;name:primaryFile.jpg;base64,' + data;
          });
        },
        error: function() { }
      });
    };

    $scope.cancel = function() {
      $state.go('dashboard');
    };

    $scope.save = function() {
      $scope.account.addresscountry = $scope.account.addresscountryObject.codeAlpha3;
      Airbitz.ui.showAlert('Saved', 'Submitting address information...', {
        'showSpinner': true
      });
      UserFactory.verifyAddress("proofofresidence", $scope.account.address, $scope.account.city,
                                $scope.account.zipcode, $scope.account.addresscountry, $scope.proofFile).then(function() {
        Airbitz.ui.showAlert('Saved', 'Address information has been submitted.');
        $state.go('dashboard');
      }, function(e) {
        console.log(e);
        var msg = 'Unable to submit address information at this time. ';
        if (e.error) {
          msg += e.error;
        }
        Airbitz.ui.showAlert('', msg);
      });
    };
  }

  function editBankController($scope, $state, Error, UserFactory) {
    Airbitz.ui.title('Bank Account');
    UserFactory.fetchCountries().then(function(b) {
      $scope.countries = b;
    });

    $scope.bankstatement = '';
    $scope.loadBankStatement = function() {
      Airbitz.core.requestFile({
        success: function(data) {
          $scope.$apply(function() {
            $scope.bankstatement = 'data:image/jpeg;name:primaryFile.jpg;base64,' + data;
          });
        },
        error: function() { }
      });
    };

    $scope.cancel = function() {
      $state.go('dashboard');
    };

    $scope.save = function() {
      $scope.bankcountry = $scope.bankcountryObject.codeAlpha3;
      Airbitz.ui.showAlert('Saved', 'Submitting bank information...', {
        'showSpinner': true
      });
      UserFactory.addBank($scope.accountholder, $scope.iban, $scope.bic,
                          $scope.bankstatement, $scope.bankname, $scope.bankcountry,
                          $scope.bankaddress).then(function() {
        Airbitz.ui.showAlert('Saved', 'Bank information has been submitted.');
        $state.go('dashboard');
      }, function(e) {
        Airbitz.ui.showAlert('', e.error);
      });
    };
  }

  function sepaDepositBankController($scope, $state, Error, UserFactory) {
    Airbitz.ui.title('Bank Deposit');
    Airbitz.ui.showAlert('', 'Fetching deposit information...', {
      'showSpinner': true
    });
    UserFactory.depositSepa().then(function(b) {
      Airbitz.ui.hideAlert();
      $scope.iban = b.IBAN
      $scope.bic = b.BIC;
      $scope.description = b.description;
      $scope.recipientName = b.recipientName;
      $scope.recipientAddress = b.recipientAddress;
      $scope.recipientZipcode = b.recipientZipcode;
      $scope.recipientCity = b.recipientCity;
      $scope.recipientCountry = b.recipientCountry;
    }, function() {
      Airbitz.ui.showAlert('', 'Unable to fetch SEPA information');
      $state.go('dashboard');
    });
  }
  function fundsController($scope, $state, DataFactory) {
    Airbitz.ui.title('Funds');
    Airbitz.ui.showAlert('', 'Loading funds...', {
      'showSpinner': true
    });
    DataFactory.getFundsLedger().then(function(funds) {
      Airbitz.ui.hideAlert();
      $scope.funds = funds;
    }, function() {
      Airbitz.ui.showAlert('', 'Error fetching funds.');
      $state.go('dashboard');
    });
    $scope.clearAccount = function(){
      Airbitz.core.clearData();
      Airbitz.ui.exit();
    };
  }
  function accountSummary() {
    return {
      templateUrl: 'app/user/partials/accountSummary.html'
    };
  }

  function fileModel($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
            
            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
  };
})();
