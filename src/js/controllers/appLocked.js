'use strict';

angular.module('copayApp.controllers').controller('appLockedController', function($scope, $timeout, applicationService) {

  $scope.restart = function() {
    var hashIndex = window.location.href.indexOf('#/');
    window.location = window.location.href.substr(0, hashIndex);
    $timeout(function() {
      $rootScope.$digest();
    }, 1);
  };
});
