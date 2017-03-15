'use strict';

angular.module('copayApp.controllers').controller('tabReceiveController', function($rootScope, $scope, $timeout, $log, $ionicModal, $state, $ionicHistory, $ionicPopover, storageService, platformInfo, walletService, profileService, configService, lodash, gettextCatalog, popupService, bwcError) {

  var listeners = [];
  $scope.isCordova = platformInfo.isCordova;
  $scope.isNW = platformInfo.isNW;
  $scope.walletAddrs = {};

  $scope.shareAddress = function(addr) {
    if ($scope.generatingAddress) return;
    if ($scope.isCordova) {
      window.plugins.socialsharing.share('bitcoin:' + addr, null, null, null);
    }
  };

  $scope.setAddress = function(forceNew) {
    if (!$scope.wallet || $scope.generatingAddress || !$scope.wallet.isComplete()) return;
    $scope.addr = null;
    $scope.generatingAddress = true;
    walletService.getAddress($scope.wallet, forceNew, function(err, addr) {
      $scope.generatingAddress = false;

      if (err) {
        //Error is already formated
        return popupService.showAlert(err);
      }

      $scope.addr = addr;
      if ($scope.walletAddrs[$scope.wallet.id]) $scope.walletAddrs[$scope.wallet.id] = addr;
      $timeout(function() {
        $scope.$apply();
      });
    });
  };

  $scope.goCopayers = function() {
    $ionicHistory.removeBackView();
    $ionicHistory.nextViewOptions({
      disableAnimate: true
    });
    $state.go('tabs.home').then(function() {
      $state.transitionTo('tabs.copayers', {
        walletId: $scope.wallet.credentials.walletId
      });
    });
  };

  $scope.showAddresses = function() {
    $state.go('tabs.receive.addresses', {
      walletId: $scope.wallet.credentials.walletId,
      toAddress: $scope.addr
    });
  };

  $scope.openBackupNeededModal = function() {
    $ionicModal.fromTemplateUrl('views/includes/backupNeededPopup.html', {
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false
    }).then(function(modal) {
      $scope.BackupNeededModal = modal;
      $scope.BackupNeededModal.show();
    });
  };

  $scope.close = function() {
    $scope.BackupNeededModal.hide();
    $scope.BackupNeededModal.remove();
  };

  $scope.doBackup = function() {
    $scope.close();
    $scope.goToBackupFlow();
  };

  $scope.goToBackupFlow = function() {
    $state.go('tabs.receive.backupWarning', {
      from: 'tabs.receive',
      walletId: $scope.wallet.credentials.walletId
    });
  };

  $scope.walletPosition = function(index) {
    if (index == $scope.walletIndex) return 'current';
    if (index < $scope.walletIndex) return 'prev';
    if (index > $scope.walletIndex) return 'next';
  };

  $scope.$on('Wallet/Changed', function(event, wallet) {
    if (!wallet) {
      $log.debug('No wallet provided');
      return;
    }
    if (wallet == $scope.wallet) {
      $log.debug('No change in wallet');
      return;
    }
    $scope.wallet = wallet;
    $log.debug('Wallet changed: ' + wallet.name);

    $scope.walletIndex = lodash.findIndex($scope.wallets, function(wallet) {
      return wallet.id == $scope.wallet.id;
    });

    if (!$scope.walletAddrs[wallet.id]) $scope.setAddress(false);
    else $scope.addr = $scope.walletAddrs[wallet.id];

    $timeout(function() {
      $scope.$apply();
    });
  });

  function findWallet(wallet) {
    return lodash.find($scope.wallets, function(w) {
      return w.id == wallet.id;
    });
  };

  $scope.loadAddresses = function(wallet, index) {
    walletService.getAddress(wallet, false, function(err, addr) {
      $scope.walletAddrs[wallet.id] = addr;
    });
  };

  function setWallet(index) {
    $scope.wallet = $scope.wallets[index];
    $scope.walletIndex = index;
    if ($scope.walletAddrs[$scope.wallet.id].addr) $scope.addr = $scope.walletAddrs[$scope.walletIndex].addr;
    else $scope.setAddress(false);
    $timeout(function() {
      $scope.$apply();
    });
  };

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    $scope.wallets = profileService.getWallets();
    if (!$scope.wallets[0]) return;
    if ($scope.wallet && findWallet($scope.wallet)) return;

    lodash.each($scope.wallets, function(wallet, index) {
      $scope.loadAddresses(wallet);
    });

    listeners = [
      $rootScope.$on('bwsEvent', function(e, walletId, type, n) {
        // Update current address
        if ($scope.wallet && walletId == $scope.wallet.id) $scope.setWallet($scope.wallets.indexOf($scope.wallet));
      })
    ];
  });

  $scope.$on("$ionicView.leave", function(event, data) {
    lodash.each(listeners, function(x) {
      x();
    });
  });
});
