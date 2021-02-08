angular.module('pages.settings', [])
    .controller(
        'SettingsPageController',
        [
            '$scope', 'SettingsManager',
            function ($scope, settings) {

                const ipcRenderer = require('electron').ipcRenderer;
                let vm = this;
                vm.nodeMeta = {}


                vm.closePage =  function () {
                    ipcRenderer.send('close-settings-page', {});
                }

                vm.init =  function () {
                    vm.loadSettings();
                }

                vm.loadSettings = function () {
                    settings.get('NODE_META')
                        .then(function (value) {
                            vm.nodeMeta =  value === undefined ? {} : value ;
                        });
                }

                vm.updateSettings = function () {
                    settings.createOrUpdate('NODE_META',  { });
                }
            }
        ]
    );